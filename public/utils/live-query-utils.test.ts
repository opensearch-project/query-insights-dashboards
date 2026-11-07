/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PPL_ACTION,
  SEARCH_ACTION,
  liveQuerySource,
  pplIndices,
  pplQueryText,
  pplSourceIndices,
} from './live-query-utils';

const search = (description: string) => ({ action: SEARCH_ACTION, description });

describe('liveQuerySource', () => {
  it('is PPL only for a PPL task', () => {
    expect(liveQuerySource(PPL_ACTION)).toBe('PPL');
    expect(liveQuerySource(SEARCH_ACTION)).toBe('DSL');
    expect(liveQuerySource(undefined)).toBe('DSL');
  });
});

describe('pplQueryText', () => {
  it('drops the PPL task description prefix', () => {
    expect(pplQueryText('PPL: source=logs | head 5')).toBe('source=logs | head 5');
  });

  it('drops the prefix that carries a query id', () => {
    expect(pplQueryText('PPL [queryId=q-123]: source=logs | head 5')).toBe('source=logs | head 5');
  });

  it('leaves text without the prefix as it is', () => {
    expect(pplQueryText('source=logs')).toBe('source=logs');
    expect(pplQueryText(undefined)).toBe('');
  });
});

describe('pplSourceIndices', () => {
  it.each([
    ['index=logs | head 5', ['logs']],
    ['| source=logs', ['logs']],
    ['/* note */ source=logs', ['logs']],
    ['search status=500 source=logs', ['logs']],
    ['source=[ source=logs | where a > 1 ] as t', ['logs']],
  ])('reads %s', (query, expected) => {
    expect(pplSourceIndices(query)).toEqual(expected);
  });

  it('ignores comments, including a line comment before the next command', () => {
    expect(pplSourceIndices('// all logs\nsource=logs // the index\n| head 5')).toEqual(['logs']);
    expect(pplSourceIndices('source=/* old */ logs')).toEqual(['logs']);
  });

  it('does not read source= inside a quoted string', () => {
    expect(pplSourceIndices('search message="source=fake [ source=other ]" source=logs')).toEqual([
      'logs',
    ]);
  });

  it('keeps cluster prefixes, dots and backticked names', () => {
    expect(pplSourceIndices('SOURCE = remote:logs.2026, `my index` as t')).toEqual([
      'remote:logs.2026',
      'my index',
    ]);
  });

  it('reads the sources of nested subsearches', () => {
    expect(
      pplSourceIndices(
        'source=a | where id in [ source=b | where x in [ index=c | fields x ] | fields id ]'
      )
    ).toEqual(['a', 'b', 'c']);
  });

  it('names no index for a table function or a bracketed source list', () => {
    expect(pplSourceIndices("source=prometheus.query_range('up', 1, 2, 3)")).toEqual([]);
    expect(pplSourceIndices('source=[logs-*, metrics]')).toEqual([]);
  });

  it('reads only the command that starts each pipeline', () => {
    expect(pplSourceIndices('source=logs | eval index = 1 | where source = "x"')).toEqual(['logs']);
  });
});

describe('pplIndices', () => {
  it('reads the source index', () => {
    expect(pplIndices('source=qibig | stats count() by grp')).toEqual(['qibig']);
    expect(pplIndices('search source = qibig | head 3')).toEqual(['qibig']);
  });

  it('splits an index list and drops backticks', () => {
    expect(pplIndices('source=logs-a, `logs-b`,logs-* | head 1')).toEqual([
      'logs-a',
      'logs-b',
      'logs-*',
    ]);
  });

  it('reads the source of a subsearch', () => {
    expect(
      pplIndices('source=orders | join left=o right=c ON o.id = c.id [ source=customers ]')
    ).toEqual(['orders', 'customers']);
  });

  it('does not read a field named source', () => {
    expect(pplIndices("source=logs | where source = 'app1' | fields source")).toEqual(['logs']);
  });

  it('adds the indices of running searches that the text does not name', () => {
    expect(
      pplIndices('source=orders | join left=o right=c ON o.id = c.id customers', [
        search('indices[orders], search_type[QUERY_THEN_FETCH], source[{}]'),
        search('indices[customers], search_type[QUERY_THEN_FETCH], source[{}]'),
        { action: 'indices:data/read/search[phase/query]', description: 'shardId[[other][0]]' },
      ])
    ).toEqual(['orders', 'customers']);
  });

  it('is empty when nothing names an index', () => {
    expect(pplIndices('describe accounts')).toEqual([]);
  });
});
