/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiText } from '@elastic/eui';
import {
  INDICES,
  NODE_ID,
  SEARCH_TYPE,
  TIMESTAMP,
  TOTAL_SHARDS,
} from '../../../../common/constants';

const PanelItem = ({ label, value }: { label: string; value: string | number }) => (
  <EuiFlexItem>
    <EuiText size="xs">
      <h4>{label}</h4>
    </EuiText>
    <EuiText size="xs">{value}</EuiText>
  </EuiFlexItem>
);

export const QueryGroupSampleQuerySummary = ({ query }: { query: any }) => {
  if (!query) {
    return <EuiText size="s">No query data available.</EuiText>;
  }
  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };

  const {
    timestamp,
    indices,
    search_type: searchType,
    node_id: nodeId,
    total_shards: totalShards,
  } = query;
  return (
    <EuiPanel>
      <EuiText size="xs">
        <h2>Sample query summary</h2>
      </EuiText>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGrid columns={4}>
        <PanelItem label={TIMESTAMP} value={convertTime(timestamp)} />
        <PanelItem label={INDICES} value={indices.toString()} />
        <PanelItem label={SEARCH_TYPE} value={searchType.replace(/_/g, ' ')} />
        <PanelItem label={NODE_ID} value={nodeId} />
        <PanelItem label={TOTAL_SHARDS} value={totalShards} />
      </EuiFlexGrid>
    </EuiPanel>
  );
};
