/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

jest.mock('../components/QueryDetailPanel', () => ({
  QueryDetailPanel: ({ query }: any) => (
    <div data-testid="query-detail-panel">{query ? query.type : 'Select a query'}</div>
  ),
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryTree } from './QueryTree';
import { ProcessedQuery } from '../types';

const mockQueries = [
  {
    type: 'BooleanQuery',
    description: '+field:value',
    time_in_nanos: 100000000,
    breakdown: { create_weight: 5000, create_weight_count: 1 },
    children: [
      {
        type: 'TermQuery',
        description: 'field:value',
        time_in_nanos: 50000000,
        breakdown: { create_weight: 2000, create_weight_count: 1 },
      },
    ],
  },
];

const mockAggregations = [
  {
    type: 'TermsAggregator',
    description: 'my_agg',
    time_in_nanos: 20000000,
    breakdown: { collect: 10000, collect_count: 5 },
  },
];

const mockCollectors = [
  {
    name: 'SimpleTopScoreDocCollector',
    reason: 'search_top_hits',
    time_in_nanos: 5000000,
  },
];

const defaultProps = {
  queries: mockQueries,
  selectedQuery: null as ProcessedQuery | null,
  onQuerySelect: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('QueryTree', () => {
  it('renders Search and Aggregation tabs', () => {
    const { getByText } = render(<QueryTree {...defaultProps} />);
    expect(getByText('Search')).toBeTruthy();
    expect(getByText('Aggregation')).toBeTruthy();
  });

  it('shows query nodes with type name and time in ms', () => {
    const { getByText } = render(<QueryTree {...defaultProps} />);
    expect(getByText('BooleanQuery')).toBeTruthy();
    expect(getByText('100.00 ms')).toBeTruthy();
  });

  it('clicking a query node calls onQuerySelect', () => {
    const onQuerySelect = jest.fn();
    const { getByText } = render(<QueryTree {...defaultProps} onQuerySelect={onQuerySelect} />);
    act(() => fireEvent.click(getByText('BooleanQuery')));
    expect(onQuerySelect).toHaveBeenCalledTimes(1);
    expect(onQuerySelect).toHaveBeenCalledWith(expect.objectContaining({ type: 'BooleanQuery' }));
  });

  it('expand/collapse button works for nodes with children', async () => {
    const { getByText, queryByText, getByLabelText } = render(<QueryTree {...defaultProps} />);
    expect(queryByText('TermQuery')).toBeNull();

    const expandBtn = getByLabelText('Expand');
    act(() => fireEvent.click(expandBtn));
    await waitFor(() => expect(getByText('TermQuery')).toBeTruthy());

    const collapseBtn = getByLabelText('Collapse');
    act(() => fireEvent.click(collapseBtn));
    await waitFor(() => expect(queryByText('TermQuery')).toBeNull());
  });

  it('shows "No query data to display" when queries is empty', () => {
    const { getByText } = render(<QueryTree {...defaultProps} queries={[]} />);
    expect(getByText('No query data to display')).toBeTruthy();
  });

  it('switches to aggregation tab and shows empty message when no aggs', async () => {
    const { getByText } = render(<QueryTree {...defaultProps} />);
    act(() => fireEvent.click(getByText('Aggregation')));
    await waitFor(() => expect(getByText('No aggregation data to display')).toBeTruthy());
  });

  it('shows aggregation data when aggregations are provided and tab is clicked', async () => {
    const { getByText } = render(<QueryTree {...defaultProps} aggregations={mockAggregations} />);
    act(() => fireEvent.click(getByText('Aggregation')));
    await waitFor(() => expect(getByText('TermsAggregator')).toBeTruthy());
  });

  it('auto-selects aggregation tab when no search data exists but aggs do', () => {
    const { getByText } = render(
      <QueryTree {...defaultProps} queries={[]} aggregations={mockAggregations} />
    );
    expect(getByText('TermsAggregator')).toBeTruthy();
  });

  it('shows rewrite node when rewriteTime is provided', () => {
    const { getByText } = render(<QueryTree {...defaultProps} rewriteTime={10000000} />);
    expect(getByText('Rewrite')).toBeTruthy();
    expect(getByText('10.00 ms')).toBeTruthy();
  });

  it('shows collector nodes when collectors are provided', () => {
    const { getByText } = render(<QueryTree {...defaultProps} collectors={mockCollectors} />);
    expect(getByText('SimpleTopScoreDocCollector')).toBeTruthy();
  });

  it('renders QueryDetailPanel on the right side', () => {
    const { getByTestId } = render(<QueryTree {...defaultProps} />);
    const detailPanel = getByTestId('query-detail-panel');
    expect(detailPanel).toBeTruthy();
    expect(detailPanel.textContent).toBe('Select a query');
  });

  it('resizer div exists for split panel', () => {
    const { container } = render(<QueryTree {...defaultProps} />);
    const resizer = container.querySelector('[style*="col-resize"]');
    expect(resizer).toBeTruthy();
  });
});
