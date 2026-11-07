/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { TaskDetailRecord } from '../../types/types';

/**
 * Action of the SQL plugin's PPL query task. Live Queries reports a running PPL query as one row
 * whose coordinator task has this action; the searches the query issues are its child tasks.
 */
export const PPL_ACTION = 'cluster:admin/opensearch/ppl';

/** Action of a search's coordinator task. */
export const SEARCH_ACTION = 'indices:data/read/search';

export type LiveQuerySource = 'PPL' | 'DSL';

/** Badge colors by query source; a source not listed here gets a hollow badge. */
export const QUERY_SOURCE_BADGE_COLORS: Record<string, string> = {
  PPL: '#7B61FF',
  DSL: 'hollow',
};

// The SQL plugin describes a PPL task as "PPL: <query>", or "PPL [queryId=<id>]: <query>".
const PPL_DESCRIPTION_PREFIX = /^PPL(?: \[queryId=[^\]]*\])?: /;

const SEARCH_INDICES = /indices\[(.*?)\]/;

/** Whether a live query is a PPL query or a DSL search, from its coordinator task's action. */
export const liveQuerySource = (coordinatorAction?: string): LiveQuerySource =>
  coordinatorAction === PPL_ACTION ? 'PPL' : 'DSL';

/** The query text of a PPL task, from its description. */
export const pplQueryText = (description: string = ''): string =>
  description.replace(PPL_DESCRIPTION_PREFIX, '');

type PplToken =
  | { kind: 'word' | 'name'; text: string }
  | { kind: 'string' | '|' | '[' | ']' | '(' | ')' | ',' | '=' };

const PPL_DELIMITERS = '|[](),=';
const PPL_QUOTES = `'"\``;
const isSpace = (c: string) => /\s/.test(c);

/**
 * Splits PPL text into the tokens that can name a source: words, backtick-quoted names, quoted
 * strings (whose text is dropped) and delimiters. Whitespace and comments, both `/* ... *\/` and
 * `//` to the end of the line, are dropped as the PPL lexer does.
 */
const tokenizePpl = (text: string): PplToken[] => {
  const tokens: PplToken[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (isSpace(c)) {
      i++;
    } else if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
    } else if (text.startsWith('//', i)) {
      // A backslash before the line break continues the comment on the next line.
      i += 2;
      while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i += text[i] === '\\' ? 2 : 1;
    } else if (PPL_QUOTES.includes(c)) {
      let value = '';
      let j = i + 1;
      for (; j < text.length; j++) {
        if (text[j] === '\\') {
          value += text.slice(j, j + 2);
          j++;
        } else if (text[j] === c && text[j + 1] === c) {
          value += c;
          j++;
        } else if (text[j] === c) {
          break;
        } else {
          value += text[j];
        }
      }
      tokens.push(c === '`' ? { kind: 'name', text: value } : { kind: 'string' });
      i = j + 1;
    } else if (PPL_DELIMITERS.includes(c)) {
      tokens.push({ kind: c as '|' | '[' | ']' | '(' | ')' | ',' | '=' });
      i++;
    } else {
      let j = i + 1;
      while (
        j < text.length &&
        !isSpace(text[j]) &&
        !PPL_DELIMITERS.includes(text[j]) &&
        !PPL_QUOTES.includes(text[j]) &&
        !text.startsWith('/*', j) &&
        !text.startsWith('//', j)
      ) {
        j++;
      }
      tokens.push({ kind: 'word', text: text.slice(i, j) });
      i = j;
    }
  }
  return tokens;
};

/** The comma-separated table names from `start`; none for a subsearch or a table function. */
const pplTableNames = (tokens: PplToken[], start: number): string[] => {
  const names: string[] = [];
  for (let i = start; ; i += 2) {
    const token = tokens[i];
    if (token?.kind !== 'word' && token?.kind !== 'name') break;
    if (tokens[i + 1]?.kind === '(') return [];
    names.push(token.text);
    if (tokens[i + 1]?.kind !== ',') break;
  }
  return names;
};

/**
 * The tables the command starting at `start` reads, if it is a search command: the names after its
 * `source=` or `index=`, which may come after search expressions such as `status=500`. Bracketed
 * and parenthesized parts are skipped; a subsearch is read as a pipeline of its own.
 */
const pplFirstCommandTables = (tokens: PplToken[], start: number): string[] => {
  let depth = 0;
  for (let i = tokens[start]?.kind === '|' ? start + 1 : start; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === '[' || token.kind === '(') {
      depth++;
    } else if (token.kind === ']' || token.kind === ')') {
      if (depth === 0) return [];
      depth--;
    } else if (depth === 0) {
      if (token.kind === '|') return [];
      if (
        token.kind === 'word' &&
        /^(source|index)$/i.test(token.text) &&
        tokens[i + 1]?.kind === '='
      ) {
        return pplTableNames(tokens, i + 2);
      }
    }
  }
  return [];
};

/**
 * The indices a PPL query's text names. PPL names what a query reads only in the `source=` or
 * `index=` of the search command that starts it or one of its subsearches (`[ ... ]`), so a field
 * called `source` in a later command does not count.
 */
export const pplSourceIndices = (queryText: string): string[] => {
  const tokens = tokenizePpl(queryText);
  const starts = [0];
  tokens.forEach((token, i) => {
    if (token.kind === '[') starts.push(i + 1);
  });
  return starts.flatMap((start) => pplFirstCommandTables(tokens, start));
};

const splitIndices = (list: string): string[] =>
  list
    .split(',')
    .map((name) => name.trim().replace(/^`|`$/g, ''))
    .filter((name) => name.length > 0);

/**
 * The indices a running PPL query reads. The ones its text names come first, so the list stays
 * stable while the query is between searches; the indices of its running searches add any the
 * text doesn't name with `source=`, such as a join's right side.
 */
export const pplIndices = (
  queryText: string,
  childTasks: Array<Pick<TaskDetailRecord, 'action' | 'description'>> = []
): string[] => {
  const indices = new Set<string>();
  pplSourceIndices(queryText).forEach((name) => indices.add(name));
  for (const task of childTasks) {
    if (task.action !== SEARCH_ACTION) continue;
    const match = task.description?.match(SEARCH_INDICES);
    if (match) splitIndices(match[1]).forEach((name) => indices.add(name));
  }
  return Array.from(indices);
};
