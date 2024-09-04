import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiHorizontalRule, EuiPanel, EuiText } from '@elastic/eui';

const QuerySummary = ({ query }: { query: any }) => {
  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return `${loc[1]} ${loc[2]}, ${loc[3]} @ ${date.toLocaleTimeString('en-US')}`;
  };
  return (
    <EuiPanel>
      <EuiText size="xs">
        <h2>Summary</h2>
      </EuiText>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGrid columns={4}>
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Timestamp</h4>
          </EuiText>
          <EuiText size="xs">{convertTime(query.timestamp)}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Latency</h4>
          </EuiText>
          <EuiText size="xs">{`${query.latency} ms`}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>CPU Usage</h4>
          </EuiText>
          <EuiText size="xs">{`${query.cpu} ns`}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Memory</h4>
          </EuiText>
          <EuiText size="xs">{`${query.memory} B`}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Indexes</h4>
          </EuiText>
          <EuiText size="xs">{query.indices.toString()}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Search type</h4>
          </EuiText>
          <EuiText size="xs">{query.search_type.replaceAll('_', ' ')}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Coordinator node ID</h4>
          </EuiText>
          <EuiText size="xs">{query.node_id}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">
            <h4>Total shards</h4>
          </EuiText>
          <EuiText size="xs">{query.total_shards}</EuiText>
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default QuerySummary;
