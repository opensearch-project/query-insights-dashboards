/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiText } from '@elastic/eui';
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
} from '../../../../common/constants';

// Panel component for displaying query detail values
const PanelItem = ({ label, value }: { label: string; value: string | number }) => (
  <EuiFlexItem>
    <EuiText size="xs">
      <h4>{label}</h4>
    </EuiText>
    <EuiText size="xs">{value}</EuiText>
  </EuiFlexItem>
);

const QuerySummary = ({ query }: { query: SearchQueryRecord }) => {
  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { timestamp, measurements, indices, search_type, node_id, total_shards } = query;
  return (
    <EuiPanel data-test-subj={'query-details-summary-section'}>
      <EuiText size="xs">
        <h2>Summary</h2>
      </EuiText>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGrid columns={4}>
        <PanelItem label={TIMESTAMP} value={convertTime(timestamp)} />
        <PanelItem
          label={LATENCY}
          value={
            measurements.latency?.number !== undefined && measurements.latency?.count !== undefined
              ? `${(measurements.latency.number / measurements.latency.count).toFixed(2)} ms`
              : 'N/A'
          }
        />
        <PanelItem
          label={CPU_TIME}
          value={
            measurements.cpu?.number !== undefined && measurements.cpu?.count !== undefined
              ? `${(measurements.cpu.number / measurements.cpu.count / 1000000).toFixed(2)} ms`
              : 'N/A'
          }
        />
        <PanelItem
          label={MEMORY_USAGE}
          value={
            measurements.memory?.number !== undefined ? `${measurements.memory.number} B` : 'N/A'
          }
        />
        <PanelItem label={INDICES} value={indices.toString()} />
        <PanelItem label={SEARCH_TYPE} value={search_type.replaceAll('_', ' ')} />
        <PanelItem label={NODE_ID} value={node_id} />
        <PanelItem label={TOTAL_SHARDS} value={total_shards} />
      </EuiFlexGrid>
    </EuiPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default QuerySummary;
