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
import { calculateMetric } from '../../../../common/utils/MetricUtils';

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

const QuerySummary = ({ query }: { query: SearchQueryRecord | null }) => {
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { timestamp, measurements, indices, search_type, node_id, total_shards } = query;
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
        <PanelItem label={SEARCH_TYPE} value={search_type.replaceAll('_', ' ')} />
        <PanelItem label={NODE_ID} value={node_id} />
        <PanelItem label={TOTAL_SHARDS} value={total_shards} />
      </EuiFlexGrid>
    </EuiPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default QuerySummary;
