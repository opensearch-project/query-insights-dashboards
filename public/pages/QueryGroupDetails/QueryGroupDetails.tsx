/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
// @ts-ignore
import Plotly from 'plotly.js-dist';
import { useHistory, useLocation } from 'react-router-dom';
import React, { useContext, useEffect, useState } from 'react';
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
  EuiIconTip,
} from '@elastic/eui';
import { DataSourceContext, QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { QueryGroupAggregateSummary } from './Components/QueryGroupAggregateSummary';
import { QueryGroupSampleQuerySummary } from './Components/QueryGroupSampleQuerySummary';

import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { SearchQueryRecord } from '../../../types/types';
import { retrieveQueryById } from '../Utils/QueryUtils';
import {
  getDataSourceFromUrl,
  QueryInsightsDataSourceMenu,
} from '../../components/DataSourcePicker';

export const QueryGroupDetails = ({
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
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return loc[1] + ' ' + loc[2] + ', ' + loc[3] + ' @ ' + date.toLocaleTimeString('en-US');
  };

  const history = useHistory();

  const fetchQueryDetails = async () => {
    const retrievedQuery = await retrieveQueryById(core, getDataSourceFromUrl().id, from, to, id);
    setQuery(retrievedQuery);
  };

  useEffect(() => {
    if (id && from && to) {
      fetchQueryDetails();
    }
  }, [id, from, to]);

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
        { text: `Query group details: ${convertTime(query.timestamp)}` },
      ]);
    }
  }, [core.chrome, history, location, query]);

  useEffect(() => {
    if (query && query.phase_latency_map) {
      let x: number[] = Object.values(query.phase_latency_map);
      if (x.length < 3) {
        x = [0, 0, 0];
      }
      const data = [
        {
          x: x.reverse(),
          y: ['Fetch    ', 'Query    ', 'Expand    '],
          type: 'bar',
          orientation: 'h',
          width: 0.5,
          marker: { color: ['#F990C0', '#1BA9F5', '#7DE2D1'] },
          base: [x[2] + x[1], x[2], 0],
          text: x.map((value) => `${value}ms`),
          textposition: 'outside',
          cliponaxis: false,
        },
      ];
      const layout = {
        autosize: true,
        margin: { l: 80, r: 80, t: 25, b: 15, pad: 0 },
        autorange: true,
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
    }
  }, [query]);

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
            <EuiFlexGrid columns={2}>
              <EuiTitle size="l">
                <h1>Query group details</h1>
              </EuiTitle>
              <EuiIconTip
                content="Details for the query group including aggregate statistics and number of queries in the group"
                position="right"
                type="iInCircle"
                aria-label="Details tooltip"
              />
            </EuiFlexGrid>
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
        <QueryGroupAggregateSummary query={query} />
      </EuiFlexItem>
      <EuiSpacer size="l" />
      <EuiSpacer size="l" />
      <EuiFlexGrid columns={2}>
        <EuiTitle size="l">
          <h1>Sample query details</h1>
        </EuiTitle>
        <EuiIconTip
          content="Details for a sample query in the query group. This is the first query encountered in the group."
          position="right"
          type="iInCircle"
          aria-label="Details tooltip"
        />
      </EuiFlexGrid>
      <EuiSpacer size="l" />
      <EuiFlexItem>
        <QueryGroupSampleQuerySummary query={query} />
        <EuiSpacer size="m" />
        <EuiFlexGrid columns={2}>
          <EuiFlexItem grow={1}>
            <EuiPanel>
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
                    Open in search comparision
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
            <EuiPanel>
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
