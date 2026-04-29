/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuerySummary from './QuerySummary';
import { SearchQueryRecord } from '../../../../types/types';

const baseQuery: SearchQueryRecord = {
  timestamp: 1726178995210,
  id: 'test-id',
  group_by: 'NONE',
  search_type: 'query_then_fetch',
  indices: ['my-index'],
  node_id: 'node-1',
  total_shards: 1,
  source: '{"query":{"match_all":{}}}',
  source_truncated: false,
  labels: {},
  phase_latency_map: { expand: 0, query: 5, fetch: 0 },
  task_resource_usages: [],
  measurements: {
    latency: { number: 20, count: 1, aggregationType: 'NONE' },
    cpu: { number: 5000000, count: 1, aggregationType: 'NONE' },
    memory: { number: 204800, count: 1, aggregationType: 'NONE' },
  },
};

describe('QuerySummary', () => {
  it('renders no data message when query is null', () => {
    render(<QuerySummary query={null} />);
    expect(screen.getByText('No Data Available')).toBeInTheDocument();
  });

  it('renders base fields always', () => {
    render(<QuerySummary query={baseQuery} />);
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Indices')).toBeInTheDocument();
    expect(screen.getByText('Search Type')).toBeInTheDocument();
    expect(screen.getByText('Coordinator Node ID')).toBeInTheDocument();
    expect(screen.getByText('Total Shards')).toBeInTheDocument();
  });

  it('does not render WLM group when wlmSupported is false', () => {
    render(
      <QuerySummary
        query={{ ...baseQuery, wlm_group_id: 'DEFAULT_WORKLOAD_GROUP' }}
        wlmSupported={false}
      />
    );
    expect(screen.queryByText('WLM Group')).not.toBeInTheDocument();
  });

  it('renders WLM group when wlmSupported is true and wlm_group_id is present', () => {
    render(
      <QuerySummary
        query={{ ...baseQuery, wlm_group_id: 'DEFAULT_WORKLOAD_GROUP' }}
        wlmSupported={true}
      />
    );
    expect(screen.getByText('WLM Group')).toBeInTheDocument();
    expect(screen.getByText('DEFAULT_WORKLOAD_GROUP')).toBeInTheDocument();
  });

  it('does not render WLM group when wlmSupported is true but wlm_group_id is absent', () => {
    render(<QuerySummary query={baseQuery} wlmSupported={true} />);
    expect(screen.queryByText('WLM Group')).not.toBeInTheDocument();
  });

  it('does not render Status when statusSupported is false', () => {
    render(<QuerySummary query={{ ...baseQuery, failed: false }} statusSupported={false} />);
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
  });

  it('renders Completed badge when statusSupported is true and failed is false', () => {
    render(<QuerySummary query={{ ...baseQuery, failed: false }} statusSupported={true} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders Failed badge when statusSupported is true and failed is true', () => {
    render(<QuerySummary query={{ ...baseQuery, failed: true }} statusSupported={true} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('does not render username/user_roles when userInfoSupported is false', () => {
    render(
      <QuerySummary
        query={{ ...baseQuery, username: 'alice', user_roles: ['admin'] }}
        userInfoSupported={false}
      />
    );
    expect(screen.queryByText('Username')).not.toBeInTheDocument();
    expect(screen.queryByText('User Roles')).not.toBeInTheDocument();
  });

  it('renders username when userInfoSupported is true and username is present', () => {
    render(<QuerySummary query={{ ...baseQuery, username: 'alice' }} userInfoSupported={true} />);
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('renders user_roles when userInfoSupported is true and user_roles are present', () => {
    render(
      <QuerySummary
        query={{ ...baseQuery, user_roles: ['admin', 'viewer'] }}
        userInfoSupported={true}
      />
    );
    expect(screen.getByText('User Roles')).toBeInTheDocument();
    expect(screen.getByText('admin, viewer')).toBeInTheDocument();
  });

  it('does not render username when userInfoSupported is true but username is absent', () => {
    render(<QuerySummary query={baseQuery} userInfoSupported={true} />);
    expect(screen.queryByText('Username')).not.toBeInTheDocument();
  });

  it('does not render user_roles when userInfoSupported is true but user_roles is empty', () => {
    render(<QuerySummary query={{ ...baseQuery, user_roles: [] }} userInfoSupported={true} />);
    expect(screen.queryByText('User Roles')).not.toBeInTheDocument();
  });
});
