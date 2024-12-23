/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiText } from '@elastic/eui';
import {
  CPU_TIME, GROUP_BY,
  LATENCY,
  MEMORY_USAGE, QUERY_HASHCODE
} from '../../../../common/constants';

// Panel component for displaying query group detail values
const PanelItem = ({ label, value }: { label: string; value: string | number }) => (
  <EuiFlexItem>
    <EuiText size="xs">
      <h4>{label}</h4>
    </EuiText>
    <EuiText size="xs">{value}</EuiText>
  </EuiFlexItem>
);

const QueryGroupAggregateSummary = ({ query }: { query: any }) => {

  const { measurements, query_hashcode, group_by } = query;
  const queryCount = measurements.latency?.count || measurements.cpu?.count || measurements.memory?.count || 1;
  return (
    <EuiPanel>
      <EuiText size="xs">
        <h2>
          Aggregate summary for {queryCount} {queryCount === 1 ? 'query' : 'queries'}
        </h2>
      </EuiText>
      <EuiHorizontalRule margin="m"/>
      <EuiFlexGrid columns={4}>
      <PanelItem label={QUERY_HASHCODE} value={query_hashcode}/>
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
            measurements.memory?.number !== undefined
              ? `${measurements.memory.number} B`
              : 'N/A'
          }
        />
        <PanelItem
          label={GROUP_BY}
          value={
            group_by !== undefined
              ? `${group_by}`
              : 'N/A'
          }
        />
      </EuiFlexGrid>
    </EuiPanel>
  );
};

export default QueryGroupAggregateSummary;
