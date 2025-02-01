/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiTitle,
  EuiDescriptionList,
} from '@elastic/eui';
import {
  INDICES,
  NODE_ID,
  SEARCH_TYPE,
  TIMESTAMP,
  TOTAL_SHARDS,
} from '../../../../common/constants';

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

export const QueryGroupSampleQuerySummary = ({ query }: { query: any }) => {
  if (!query) {
    return (
      <EuiTitle size="s">
        <h2>No query data available.</h2>
      </EuiTitle>
    );
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
      <EuiTitle size="s">
        <h2>Sample query summary</h2>
      </EuiTitle>
      <EuiHorizontalRule margin="xs" />
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
