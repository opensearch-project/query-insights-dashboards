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
