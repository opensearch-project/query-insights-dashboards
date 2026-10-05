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
import { calculateMetric } from '../../../../common/utils/MetricUtils';
import { getOpaqueId } from '../../../../common/utils/QueryUtils';

// Panel component for displaying query detail values
const PanelItem = ({ label, value }: { label: string; value: string | number }) => (
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
}: {
  query: SearchQueryRecord | null;
  userInfoSupported?: boolean;
  wlmSupported?: boolean;
  statusSupported?: boolean;
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
          value={calculateMetric(measurements.memory?.number, measurements.memory?.count, 'B')}
        />
        <PanelItem label={INDICES} value={indices.toString()} />
        <PanelItem label={SEARCH_TYPE} value={searchType.replaceAll('_', ' ')} />
        <PanelItem label={NODE_ID} value={nodeId} />
        <PanelItem label={TOTAL_SHARDS} value={totalShards} />
        {appId && <PanelItem label={OPAQUE_ID} value={appId} />}
        {wlmSupported && query.wlm_group_id && (
          <PanelItem label={WLM_GROUP} value={query.wlm_group_id} />
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
