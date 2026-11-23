/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiTitle,
  EuiDescriptionList,
} from '@elastic/eui';
import { SearchQueryRecord } from '../../../../types/types';
import {
  CPU_TIME,
  INDICES,
  LATENCY,
  MEMORY_USAGE,
  NODE_ID,
  SEARCH_TYPE,
  TIMESTAMP,
  TOTAL_SHARDS,
  OPAQUE_ID,
  USERNAME,
  USER_ROLES,
  BACKEND_ROLES,
  WLM_GROUP,
} from '../../../../common/constants';
import { calculateMemory, calculateMetric } from '../../../../common/utils/MetricUtils';
import { getOpaqueId } from '../../../../common/utils/QueryUtils';
import { isDslQuery } from '../../../utils/query-formatter-utils';
import { QUERY_SOURCE_BADGE_COLORS, pplSourceIndices } from '../../../utils/live-query-utils';

// Panel component for displaying query detail values
const PanelItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <EuiFlexItem>
    <EuiDescriptionList
      compressed={true}
      listItems={[
        {
          title: <h4>{label}</h4>,
          description: value,
        },
      ]}
    />
  </EuiFlexItem>
);

const QuerySummary = ({
  query,
  userInfoSupported = false,
  wlmSupported = false,
  statusSupported = false,
  searchesWlmGroupId,
}: {
  query: SearchQueryRecord | null;
  userInfoSupported?: boolean;
  wlmSupported?: boolean;
  statusSupported?: boolean;
  // The workload group(s) of the searches a SQL/PPL query ran; its own record names none.
  searchesWlmGroupId?: string;
}) => {
  // If query is null, return a message indicating no data is available
  if (!query) {
    return (
      <EuiPanel data-test-subj={'query-details-summary-section'}>
        <EuiTitle size="xs">
          <h2>No Data Available</h2>
        </EuiTitle>
      </EuiPanel>
    );
  }

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const {
    timestamp,
    measurements,
    indices,
    search_type: searchType,
    node_id: nodeId,
    total_shards: totalShards,
    labels,
    username,
    user_roles: userRoles,
    backend_roles: backendRoles,
  } = query;
  const appId = getOpaqueId(labels, '');
  // A PPL query's record names no indices, shard count or search type: its searches have their own
  // records, so the summary leaves out the search type and shard count. Its indices come from its
  // text, as in Live Queries.
  const isPpl = !isDslQuery(query);
  // PPL for a query the SQL plugin reported, else DSL, as in the Top N list.
  const querySource = query.query_source || 'DSL';
  const indexList =
    indices && indices.length > 0
      ? indices.toString()
      : isPpl && typeof query.source === 'string'
        ? Array.from(new Set(pplSourceIndices(query.source))).join(',')
        : '';
  return (
    <EuiPanel data-test-subj={'query-details-summary-section'}>
      <EuiTitle size="s">
        <h2>Summary</h2>
      </EuiTitle>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGrid columns={4}>
        <PanelItem label={TIMESTAMP} value={convertTime(timestamp)} />
        <PanelItem
          label={LATENCY}
          value={calculateMetric(measurements.latency?.number, measurements.latency?.count, 'ms')}
        />
        <PanelItem
          label={CPU_TIME}
          value={calculateMetric(measurements.cpu?.number, measurements.cpu?.count, 'ms', 1000000)}
        />
        <PanelItem
          label={MEMORY_USAGE}
          value={calculateMemory(measurements.memory?.number, measurements.memory?.count)}
        />
        <PanelItem
          label="Query Source"
          value={
            <EuiBadge color={QUERY_SOURCE_BADGE_COLORS[querySource] ?? 'hollow'}>
              {querySource}
            </EuiBadge>
          }
        />
        <PanelItem label={INDICES} value={indexList || '-'} />
        {!isPpl && (
          <PanelItem
            label={SEARCH_TYPE}
            value={searchType ? searchType.replaceAll('_', ' ') : '-'}
          />
        )}
        <PanelItem label={NODE_ID} value={nodeId} />
        {!isPpl && <PanelItem label={TOTAL_SHARDS} value={totalShards ?? '-'} />}
        {appId && <PanelItem label={OPAQUE_ID} value={appId} />}
        {wlmSupported && (query.wlm_group_id || searchesWlmGroupId) && (
          <PanelItem label={WLM_GROUP} value={query.wlm_group_id || searchesWlmGroupId || ''} />
        )}
        {statusSupported && (
          <EuiFlexItem>
            <EuiDescriptionList
              compressed={true}
              listItems={[
                {
                  title: <h4>Status</h4>,
                  description: (
                    <EuiBadge color={query.failed ? 'danger' : 'success'}>
                      {query.failed ? 'Failed' : 'Completed'}
                    </EuiBadge>
                  ),
                },
              ]}
            />
          </EuiFlexItem>
        )}
        {userInfoSupported && username && <PanelItem label={USERNAME} value={username} />}
        {userInfoSupported && userRoles && userRoles.length > 0 && (
          <PanelItem label={USER_ROLES} value={userRoles.join(', ')} />
        )}
        {userInfoSupported && backendRoles && backendRoles.length > 0 && (
          <PanelItem label={BACKEND_ROLES} value={backendRoles.join(', ')} />
        )}
      </EuiFlexGrid>
    </EuiPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default QuerySummary;
