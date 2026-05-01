/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryDetailPanel } from './QueryDetailPanel';
import { ProcessedQuery } from '../types';

const mockQuery: ProcessedQuery = {
  id: 'query-0',
  queryName: 'BooleanQuery',
  type: 'BooleanQuery',
  description: '+field:value #OtherQuery',
  time_ms: 100.5,
  time_in_nanos: 100500000,
  percentage: 75.5,
  breakdown: {
    create_weight: 50000,
    create_weight_count: 1,
    build_scorer: 30000,
    build_scorer_count: 2,
    next_doc: 0,
    next_doc_count: 0,
    advance: 20000,
    advance_count: 5,
    score: 0,
    score_count: 0,
    match: 0,
    match_count: 0,
  },
  children: [
    {
      id: 'query-0-0',
      queryName: 'TermQuery',
      type: 'TermQuery',
      description: 'field:value',
      time_ms: 50.0,
      time_in_nanos: 50000000,
      percentage: 49.75,
      breakdown: { create_weight: 25000, create_weight_count: 1 },
    },
  ],
};

describe('QueryDetailPanel', () => {
  it('shows placeholder when query is null', () => {
    const { getByText } = render(<QueryDetailPanel query={null} />);
    expect(getByText('Select a query to view details')).toBeTruthy();
  });

  it('renders query type as header', () => {
    const { getAllByText } = render(<QueryDetailPanel query={mockQuery} />);
    expect(getAllByText('BooleanQuery').length).toBeGreaterThan(0);
  });

  it('shows total time in ms', () => {
    const { getByText } = render(<QueryDetailPanel query={mockQuery} />);
    expect(getByText('100.50 ms')).toBeTruthy();
  });

  it('shows query description', () => {
    const { getAllByText } = render(<QueryDetailPanel query={mockQuery} />);
    expect(getAllByText('+field:value #OtherQuery').length).toBeGreaterThan(0);
  });

  it('shows Query Hierarchy section', () => {
    const { getByText } = render(<QueryDetailPanel query={mockQuery} />);
    expect(getByText('Query Hierarchy')).toBeTruthy();
  });

  it('shows Operation Breakdown section', () => {
    const { getByText } = render(<QueryDetailPanel query={mockQuery} />);
    expect(getByText(/Operation Breakdown/)).toBeTruthy();
  });

  it('shows breakdown entries sorted by time descending', () => {
    const { getAllByText } = render(<QueryDetailPanel query={mockQuery} />);
    const createWeightElements = getAllByText('Create Weight');
    const advanceElements = getAllByText('Advance');
    expect(createWeightElements.length).toBeGreaterThan(0);
    expect(advanceElements.length).toBeGreaterThan(0);
  });

  it('hides zero-time entries in visual mode', () => {
    const { queryByText } = render(<QueryDetailPanel query={mockQuery} />);
    expect(queryByText('Next Doc')).toBeNull();
    expect(queryByText('Score')).toBeNull();
    expect(queryByText('Match')).toBeNull();
  });

  it('shows all entries including zeros in raw data mode', () => {
    const { getByLabelText, getByText } = render(<QueryDetailPanel query={mockQuery} />);
    fireEvent.click(getByLabelText('Raw data'));
    expect(getByText('Next Doc')).toBeTruthy();
    expect(getByText('Score')).toBeTruthy();
  });

  it('switches back to visual mode', () => {
    const { getByLabelText, queryByText } = render(<QueryDetailPanel query={mockQuery} />);
    fireEvent.click(getByLabelText('Raw data'));
    fireEvent.click(getByLabelText('Visual breakdown'));
    expect(queryByText('Next Doc')).toBeNull();
  });

  it('renders hierarchy with expandable children', async () => {
    const { getByText, queryByText } = render(<QueryDetailPanel query={mockQuery} />);
    expect(queryByText('TermQuery')).toBeNull();
    const expander = document.querySelector('[aria-expanded="false"]') as HTMLElement;
    expect(expander).toBeTruthy();
    fireEvent.click(expander);
    await waitFor(() => expect(getByText('TermQuery')).toBeTruthy());
  });

  it('shows percentage badge', () => {
    const { getByText } = render(<QueryDetailPanel query={mockQuery} />);
    expect(getByText('100.0%')).toBeTruthy();
  });
});
