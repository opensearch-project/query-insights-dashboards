/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import ReactECharts from 'echarts-for-react';
import { useHistory, useLocation } from 'react-router-dom';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { DataSourceContext, QUERY_INSIGHTS } from '../TopNQueries/TopNQueries';
import { QueryGroupAggregateSummary } from './Components/QueryGroupAggregateSummary';
import { QueryGroupSampleQuerySummary } from './Components/QueryGroupSampleQuerySummary';

import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { SearchQueryRecord } from '../../../types/types';
import { retrieveQueryById } from '../../../common/utils/QueryUtils';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { getDataSourceFromUrl } from '../../utils/datasource-utils';
import { formatQueryDisplay } from '../../utils/query-formatter-utils';

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
  const verbose = Boolean(searchParams.get('verbose'));

  const [query, setQuery] = useState<SearchQueryRecord | null>(null);
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  const convertTime = (unixTime: number) => {
    const date = new Date(unixTime);
    const loc = date.toDateString().split(' ');
    return loc[1] + ' ' + loc[2] + ', ' + loc[3] + ' @ ' + date.toLocaleTimeString('en-US');
  };

  const history = useHistory();

  const fetchQueryDetails = async () => {
    const retrievedQuery = await retrieveQueryById(
      core,
      getDataSourceFromUrl().id,
      from,
      to,
      id,
      verbose
    );
    setQuery(retrievedQuery);
  };

  useEffect(() => {
    if (id && from && to && verbose) {
      fetchQueryDetails();
    }
  }, [id, from, to, verbose]);

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

  const chartOptions = useMemo(() => {
    const phaseLatency = query?.phase_latency_map || { expand: 0, query: 0, fetch: 0 };
    return {
      grid: { left: 80, right: 80, top: 25, bottom: 15 },
      xAxis: {
        type: 'value',
        position: 'top',
        axisLabel: { formatter: '{value}ms', color: '#535966' },
        axisLine: { lineStyle: { color: '#D4DAE5' } },
        splitLine: { lineStyle: { color: '#D4DAE5' } },
      },
      yAxis: {
        type: 'category',
        data: ['Fetch', 'Query', 'Expand'],
        axisLine: { lineStyle: { color: '#D4DAE5' } },
      },
      series: [
        {
          type: 'bar',
          stack: 'total',
          data: [
            { value: phaseLatency.fetch || 0, itemStyle: { color: '#F990C0' } },
            { value: phaseLatency.query || 0, itemStyle: { color: '#1BA9F5' } },
            { value: phaseLatency.expand || 0, itemStyle: { color: '#7DE2D1' } },
          ],
          label: { show: true, position: 'right', formatter: '{c}ms' },
          barWidth: '50%',
        },
      ],
    };
  }, [query]);

  const queryDisplay = formatQueryDisplay(query);

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
                  <EuiTitle size="xs">
                    <h2>Query</h2>
                  </EuiTitle>
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
            <EuiPanel data-test-subj="query-group-details-latency-chart">
              <EuiTitle size="s">
                <h2>Latency</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <ReactECharts option={chartOptions} style={{ height: 120 }} />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGrid>
      </EuiFlexItem>
    </div>
  );
};
