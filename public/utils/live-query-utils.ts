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

// A PPL query names its indices in `source=`, which can only start the query or a subsearch
// (`[ source=... ]`). Anchoring there keeps a field called `source` in a `where` from matching.
const PPL_SOURCE = /(?:^|\[)\s*(?:search\s+)?source\s*=\s*([^\s|\],]+(?:\s*,\s*[^\s|\],]+)*)/gi;

const SEARCH_INDICES = /indices\[(.*?)\]/;

/** Whether a live query is a PPL query or a DSL search, from its coordinator task's action. */
export const liveQuerySource = (coordinatorAction?: string): LiveQuerySource =>
  coordinatorAction === PPL_ACTION ? 'PPL' : 'DSL';

/** The query text of a PPL task, from its description. */
export const pplQueryText = (description: string = ''): string =>
  description.replace(PPL_DESCRIPTION_PREFIX, '');

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
  for (const match of queryText.matchAll(PPL_SOURCE)) {
    splitIndices(match[1]).forEach((name) => indices.add(name));
  }
  for (const task of childTasks) {
    if (task.action !== SEARCH_ACTION) continue;
    const match = task.description?.match(SEARCH_INDICES);
    if (match) splitIndices(match[1]).forEach((name) => indices.add(name));
  }
  return Array.from(indices);
};
