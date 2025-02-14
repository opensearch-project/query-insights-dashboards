/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext, useEffect, useState } from 'react';
// @ts-ignore
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
  EuiTitle,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import QuerySummary from './Components/QuerySummary';
import { DataSourceContext, QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { SearchQueryRecord } from '../../../types/types';
import { PageHeader } from '../../components/PageHeader';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { retrieveQueryById } from '../../../common/utils/QueryUtils';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';

import { getDataSourceFromUrl } from '../../utils/datasource-utils';

const QueryDetails = ({
  core,
  depsStart,
  params,
  dataSourceManagement,
}: {
  core: CoreStart;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  // Get url parameters
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [query, setQuery] = useState<SearchQueryRecord | null>(null);
  const history = useHistory();
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  // Convert UNIX time to a readable format
  const convertTime = useCallback((unixTime: number) => {
    const date = new Date(unixTime);
    const [_weekDay, month, day, year] = date.toDateString().split(' ');
    return `${month} ${day}, ${year} @ ${date.toLocaleTimeString('en-US')}`;
  }, []);

  const fetchQueryDetails = async () => {
    const retrievedQuery = await retrieveQueryById(core, getDataSourceFromUrl().id, from, to, id);
    setQuery(retrievedQuery);
  };

  useEffect(() => {
    if (id && from && to) {
      fetchQueryDetails();
    }
  }, [id, from, to]);

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
    if (query) {
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
    }
  }, [query, history, core.chrome, convertTime, initPlotlyChart]);

  const queryString = query
    ? JSON.stringify(JSON.parse(JSON.stringify(query.source)), null, 2)
    : '';
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
      <QueryInsightsDataSourceMenu
        coreStart={core}
        depsStart={depsStart}
        params={params}
        dataSourceManagement={dataSourceManagement}
        setDataSource={setDataSource}
        selectedDataSource={dataSource}
        onManageDataSource={() => {}}
        onSelectedDataSource={fetchQueryDetails}
        dataSourcePickerReadOnly={true}
      />
      <EuiFlexItem>
        <QuerySummary query={query} />
        <EuiSpacer size="m" />
        <EuiFlexGrid columns={2}>
          <EuiFlexItem grow={1}>
            <EuiPanel data-test-subj={'query-details-source-section'}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>Query</h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
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
              <EuiTitle size="xs">
                <h2>Latency</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
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
