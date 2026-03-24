/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  EuiCodeBlock,
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
import { formatQueryDisplay } from '../../utils/query-formatter-utils';

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
  const verbose = Boolean(searchParams.get('verbose'));

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
    if (id && from && to && verbose != null) {
      fetchQueryDetails();
    }
  }, [id, from, to, verbose]);

  // ECharts options for latency chart
  const chartOptions = useMemo(() => {
    const phaseLatency = query?.phase_latency_map || { expand: 0, query: 0, fetch: 0 };
    const expand = phaseLatency.expand || 0;
    const queryVal = phaseLatency.query || 0;
    const fetch = phaseLatency.fetch || 0;
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
          silent: true,
          data: [expand + queryVal, expand, 0],
          itemStyle: { color: 'transparent' },
          label: { show: false },
          tooltip: { show: false },
          barWidth: '50%',
        },
        {
          type: 'bar',
          stack: 'total',
          data: [
            { value: fetch, itemStyle: { color: '#F990C0' } },
            { value: queryVal, itemStyle: { color: '#1BA9F5' } },
            { value: expand, itemStyle: { color: '#7DE2D1' } },
          ],
          label: { show: true, position: 'right', formatter: '{c}ms' },
          barWidth: '50%',
        },
      ],
    };
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
    }
  }, [query, history, core.chrome, convertTime]);

  const queryDisplay = formatQueryDisplay(query);

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
        <EuiFlexGroup>
          <EuiFlexItem grow={1} style={{ minWidth: 0 }}>
            <EuiPanel data-test-subj={'query-details-source-section'}>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <EuiTitle size="s">
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
          <EuiFlexItem grow={1} style={{ alignSelf: 'start', minWidth: 0 }}>
            <EuiPanel data-test-subj={'query-details-latency-chart'}>
              <EuiTitle size="xs">
                <h2>Latency</h2>
              </EuiTitle>
              <EuiHorizontalRule margin="xs" />
              <ReactECharts
                option={chartOptions}
                style={{ height: 120, width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default QueryDetails;
