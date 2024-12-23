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

const QueryGroupSampleQuerySummary = ({ query }: { query: any }) => {
  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };


  const { timestamp, indices, search_type, node_id, total_shards } = query;
  return (
    <EuiPanel>
      <EuiText size="xs">
        <h2>Sample query summary</h2>
      </EuiText>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGrid columns={4}>
        <PanelItem label={TIMESTAMP} value={convertTime(timestamp)} />
        <PanelItem label={INDICES} value={indices.toString()} />
        <PanelItem label={SEARCH_TYPE} value={search_type.replace(/_/g, ' ')} />
        <PanelItem label={NODE_ID} value={node_id} />
        <PanelItem label={TOTAL_SHARDS} value={total_shards} />
      </EuiFlexGrid>
    </EuiPanel>
  );
};

export default QueryGroupSampleQuerySummary;
