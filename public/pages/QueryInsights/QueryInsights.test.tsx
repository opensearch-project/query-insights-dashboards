/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import QueryInsights from './QueryInsights';
import { MemoryRouter } from 'react-router-dom';
import { MockQueries } from '../../../test/testUtils';

// Mock functions and data
const mockOnTimeChange = jest.fn();
const mockCore = {
  chrome: {
    setBreadcrumbs: jest.fn(),
  },
};

// TODO: change to use MockQueries once https://github.com/opensearch-project/query-insights-dashboards/pull/21/files is merged
const sampleQueries = MockQueries();

const renderQueryInsights = () => {
  render(
    <MemoryRouter>
      <QueryInsights
        queries={sampleQueries}
        loading={false}
        onTimeChange={mockOnTimeChange}
        recentlyUsedRanges={[]}
        currStart="now-15m"
        currEnd="now"
        // @ts-ignore
        core={mockCore}
      />
    </MemoryRouter>
  );
};

describe('QueryInsights Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the table with the correct columns and data', () => {
    renderQueryInsights();

    // Check that the table and columns render correctly
    expect(document.querySelector('span[title="Timestamp"]')).toBeInTheDocument();
    expect(document.querySelector('span[title="Latency"]')).toBeInTheDocument();
    expect(document.querySelector('span[title="CPU Time"]')).toBeInTheDocument();
    expect(document.querySelector('span[title="Memory Usage"]')).toBeInTheDocument();
    expect(document.querySelector('span[title="Indices"]')).toBeInTheDocument();
    expect(document.querySelector('span[title="Search Type"]')).toBeInTheDocument();
    expect(document.querySelector('span[title="Coordinator Node ID"]')).toBeInTheDocument();
    expect(document.querySelector('span[title="Total Shards"]')).toBeInTheDocument();
    // TODO add tests for the values
  });

  it('calls setBreadcrumbs on mount', () => {
    renderQueryInsights();
    expect(mockCore.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      {
        text: 'Query insights',
        href: '/queryInsights',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('triggers onTimeChange when the date picker changes', () => {
    renderQueryInsights();

    // Find the date picker update button
    const updateButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(updateButton);

    // Verify the onTimeChange callback is triggered
    expect(mockOnTimeChange).toHaveBeenCalled();
  });
});
