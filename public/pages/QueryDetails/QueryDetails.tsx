/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import hash from 'object-hash';
import { useParams, useHistory } from 'react-router-dom';
import { CoreStart } from 'opensearch-dashboards/public';
import QuerySummary from './Components/QuerySummary';
import { QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { SearchQueryRecord } from '../../../types/types';
import { PageHeader } from '../../components/PageHeader';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';

const QueryDetails = ({
  queries,
  core,
  depsStart,
}: {
  queries: any;
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  const { hashedQuery } = useParams<{ hashedQuery: string }>();
  const query = queries.find((q: SearchQueryRecord) => hash(q) === hashedQuery);
  const history = useHistory();

  // Convert UNIX time to a readable format
  const convertTime = useCallback((unixTime: number) => {
    const date = new Date(unixTime);
    const [_weekDay, month, day, year] = date.toDateString().split(' ');
    return `${month} ${day}, ${year} @ ${date.toLocaleTimeString('en-US')}`;
  }, []);

  // Initialize the Plotly chart
  const initPlotlyChart = useCallback(() => {
    const latencies: number[] = Object.values(query?.phase_latency_map || [0, 0, 0]);
    const data = [
      {
        x: latencies.reverse(),
        y: ['Fetch    ', 'Query    ', 'Expand    '],
        type: 'bar',
        orientation: 'h',
        width: 0.5,
        marker: { color: ['#F990C0', '#1BA9F5', '#7DE2D1'] },
        base: [latencies[2] + latencies[1], latencies[2], 0],
        text: latencies.map((value) => `${value}ms`),
        textposition: 'outside',
        cliponaxis: false,
      },
    ];
    const layout = {
      autosize: true,
      margin: { l: 80, r: 80, t: 25, b: 15, pad: 0 },
      height: 120,
      xaxis: {
        side: 'top',
        zeroline: false,
        ticksuffix: 'ms',
        autorangeoptions: { clipmin: 0 },
        tickfont: { color: '#535966' },
        linecolor: '#D4DAE5',
        gridcolor: '#D4DAE5',
      },
      yaxis: { linecolor: '#D4DAE5' },
    };
    const config = { responsive: true };
    Plotly.newPlot('latency', data, layout, config);
  }, [query]);

  useEffect(() => {
    core.chrome.setBreadcrumbs([
      {
        text: 'Query insights',
        href: QUERY_INSIGHTS,
        onClick: (e) => {
          e.preventDefault();
          history.push(QUERY_INSIGHTS);
        },
      },
      { text: `Query details: ${convertTime(query.timestamp)}` },
    ]);
    initPlotlyChart();
  }, [query, history, core.chrome, convertTime, initPlotlyChart]);

  const queryString = JSON.stringify(query.source, null, 2);
  const queryDisplay = `{\n  "query": ${queryString ? queryString.replace(/\n/g, '\n  ') : ''}\n}`;

  return (
    <div>
      <PageHeader
        coreStart={core}
        depsStart={depsStart}
        fallBackComponent={
          <>
            <EuiTitle size="l">
              <h1>Query details</h1>
            </EuiTitle>
            <EuiSpacer size="l" />
          </>
        }
      />

      <EuiFlexItem>
        <QuerySummary query={query} />
        <EuiSpacer size="m" />
        <EuiFlexGrid columns={2}>
          <EuiFlexItem grow={1}>
            <EuiPanel data-test-subj={'query-details-source-section'}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiText size="xs">
                    <h2>Query</h2>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconSide="right"
                    iconType="popout"
                    target="_blank"
                    href="https://playground.opensearch.org/app/searchRelevance#/"
                  >
                    Open in search comparison
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="xs" />
              <EuiSpacer size="xs" />
              <EuiCodeBlock
                language="jsx"
                paddingSize="m"
                fontSize="s"
                overflowHeight={600}
                isCopyable
              >
                {queryDisplay}
              </EuiCodeBlock>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow={1} style={{ alignSelf: 'start' }}>
            <EuiPanel data-test-subj={'query-details-latency-chart'}>
              <EuiText size="xs">
                <h2>Latency</h2>
              </EuiText>
              <EuiHorizontalRule margin="m" />
              <div id="latency" />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryDetails;
