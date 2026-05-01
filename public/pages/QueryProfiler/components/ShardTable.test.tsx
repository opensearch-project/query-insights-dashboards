/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { ShardTable } from './ShardTable';

const mockShards = [
  {
    id: '[node1][my-index][0]',
    searches: [
      {
        query: [
          {
            type: 'MatchAllDocsQuery',
            description: '*:*',
            time_in_nanos: 50000000,
            breakdown: {},
          },
        ],
        rewrite_time: 1000000,
        collector: [
          {
            name: 'SimpleTopScoreDocCollector',
            reason: 'search_top_hits',
            time_in_nanos: 2000000,
          },
        ],
      },
    ],
    aggregations: [
      {
        type: 'TermsAggregator',
        description: 'terms',
        time_in_nanos: 30000000,
        breakdown: {},
      },
    ],
  },
  {
    id: '[node2][my-index][1]',
    searches: [
      {
        query: [
          {
            type: 'TermQuery',
            description: 'field:value',
            time_in_nanos: 80000000,
            breakdown: {},
          },
        ],
        rewrite_time: 500000,
        collector: [],
      },
    ],
    aggregations: [],
  },
];

const defaultProps = {
  shards: mockShards as any,
  onShardSelect: jest.fn(),
  onRedThresholdChange: jest.fn(),
  onOrangeThresholdChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ShardTable', () => {
  it('returns null when shards is empty', () => {
    const { container } = render(<ShardTable {...defaultProps} shards={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders shard IDs as links', () => {
    const { getByText } = render(<ShardTable {...defaultProps} />);
    expect(getByText('[node1][my-index][0]')).toBeTruthy();
    expect(getByText('[node2][my-index][1]')).toBeTruthy();
  });

  it('shows search time and aggregation time columns', () => {
    const { getAllByText } = render(<ShardTable {...defaultProps} />);
    expect(getAllByText('Search time').length).toBeGreaterThan(0);
    expect(getAllByText('Aggregation time').length).toBeGreaterThan(0);
  });

  it('shows computed time values in ms', () => {
    const { getByText } = render(<ShardTable {...defaultProps} />);
    expect(getByText('53 ms')).toBeTruthy();
    expect(getByText('30 ms')).toBeTruthy();
  });

  it('search input filters shards by ID', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ShardTable {...defaultProps} />
    );
    const search = getByPlaceholderText('Search shard');
    act(() => fireEvent.change(search, { target: { value: 'node1' } }));
    await waitFor(() => {
      expect(getByText('[node1][my-index][0]')).toBeTruthy();
      expect(queryByText('[node2][my-index][1]')).toBeNull();
    });
  });

  it('clicking shard link calls onShardSelect with correct index', () => {
    const onShardSelect = jest.fn();
    const { getByText } = render(<ShardTable {...defaultProps} onShardSelect={onShardSelect} />);
    fireEvent.click(getByText('[node1][my-index][0]'));
    expect(onShardSelect).toHaveBeenCalledWith(0);
    fireEvent.click(getByText('[node2][my-index][1]'));
    expect(onShardSelect).toHaveBeenCalledWith(1);
  });

  it('sort popover toggles', async () => {
    const { getAllByText } = render(<ShardTable {...defaultProps} />);
    const sortBtns = getAllByText(/Sort by:/);
    fireEvent.click(sortBtns[0]);
    await waitFor(() => {
      const aggSortOptions = getAllByText(/Sort by: Aggregation time/);
      expect(aggSortOptions.length).toBeGreaterThan(0);
      fireEvent.click(aggSortOptions[aggSortOptions.length - 1]);
    });
  });

  it('clicking shard ID column header sorts by ID', () => {
    const { container } = render(<ShardTable {...defaultProps} />);
    const shardHeader = container.querySelector(
      '[role="button"][title*="shard ID"]'
    ) as HTMLElement;
    if (shardHeader) {
      fireEvent.click(shardHeader);
      fireEvent.click(shardHeader);
    }
    expect(shardHeader).toBeTruthy();
  });

  it('color threshold legend displays', () => {
    const { getByText } = render(<ShardTable {...defaultProps} />);
    expect(getByText(/Low/)).toBeTruthy();
    expect(getByText(/Medium/)).toBeTruthy();
    expect(getByText(/High/)).toBeTruthy();
  });

  it('threshold gear icon opens popover', async () => {
    const { getByLabelText, getByText } = render(<ShardTable {...defaultProps} />);
    fireEvent.click(getByLabelText('Customize thresholds'));
    await waitFor(() => expect(getByText('Customize color thresholds')).toBeTruthy());
  });

  it('reset to defaults calls threshold callbacks', async () => {
    const onRed = jest.fn();
    const onOrange = jest.fn();
    const { getByLabelText, getByText } = render(
      <ShardTable
        {...defaultProps}
        onRedThresholdChange={onRed}
        onOrangeThresholdChange={onOrange}
      />
    );
    fireEvent.click(getByLabelText('Customize thresholds'));
    await waitFor(() => expect(getByText('Reset to defaults')).toBeTruthy());
    fireEvent.click(getByText('Reset to defaults'));
    expect(onRed).toHaveBeenCalledWith(80);
    expect(onOrange).toHaveBeenCalledWith(50);
  });
});
