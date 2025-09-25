/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useEffect, useContext } from 'react';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHealth,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiDescriptionList,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';
import {
  QUERY_INSIGHTS,
  MetricSettings,
  GroupBySettings,
  DataSourceContext,
  DataRetentionSettings,
} from '../TopNQueries/TopNQueries';
import {
  METRIC_TYPES_TEXT,
  TIME_UNITS_TEXT,
  MINUTES_OPTIONS,
  GROUP_BY_OPTIONS,
  EXPORTER_TYPES_LIST,
  EXPORTER_TYPE,
} from '../../../common/constants';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';

const Configuration = ({
  latencySettings,
  cpuSettings,
  memorySettings,
  groupBySettings,
  dataRetentionSettings,
  configInfo,
  core,
  depsStart,
  params,
  dataSourceManagement,
}: {
  latencySettings: MetricSettings;
  cpuSettings: MetricSettings;
  memorySettings: MetricSettings;
  groupBySettings: GroupBySettings;
  dataRetentionSettings: DataRetentionSettings;
  configInfo: any;
  core: CoreStart;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}) => {
  const history = useHistory();
  const location = useLocation();

  const [metric, setMetric] = useState<'latency' | 'cpu' | 'memory'>('latency');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [topNSize, setTopNSize] = useState(latencySettings.currTopN);
  const [windowSize, setWindowSize] = useState(latencySettings.currWindowSize);
  const [time, setTime] = useState(latencySettings.currTimeUnit);
  const [groupBy, setGroupBy] = useState(groupBySettings.groupBy);
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;
  const [deleteAfterDays, setDeleteAfterDays] = useState(dataRetentionSettings.deleteAfterDays);
  const [exporterType, setExporterTypeType] = useState(dataRetentionSettings.exporterType);

  const [metricSettingsMap, setMetricSettingsMap] = useState({
    latency: latencySettings,
    cpu: cpuSettings,
    memory: memorySettings,
  });

  const [groupBySettingMap, setGroupBySettingMap] = useState({
    groupBy: groupBySettings,
  });

  const [dataRetentionSettingMap, setDataRetentionSettingMap] = useState({
    dataRetention: dataRetentionSettings,
  });

  useEffect(() => {
    setMetricSettingsMap({
      latency: latencySettings,
      cpu: cpuSettings,
      memory: memorySettings,
    });
  }, [latencySettings, cpuSettings, memorySettings, groupBySettings]);

  const newOrReset = useCallback(() => {
    const currMetric = metricSettingsMap[metric];
    setTopNSize(currMetric.currTopN);
    setWindowSize(currMetric.currWindowSize);
    setTime(currMetric.currTimeUnit);
    setIsEnabled(currMetric.isEnabled);
    // setExporterTypeType(currMetric.exporterType);
  }, [metric, metricSettingsMap]);

  useEffect(() => {
    newOrReset();
  }, [newOrReset, metricSettingsMap]);

  useEffect(() => {
    setGroupBySettingMap({
      groupBy: groupBySettings,
    });
    setGroupBy(groupBySettings.groupBy);
  }, [groupBySettings]);

  useEffect(() => {
    setDataRetentionSettingMap({
      dataRetention: dataRetentionSettings,
    });
    setDeleteAfterDays(dataRetentionSettings.deleteAfterDays);
    setExporterTypeType(dataRetentionSettings.exporterType);
  }, [dataRetentionSettings]);

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
    ]);
  }, [core.chrome, history, location]);

  const onMetricChange = (e: any) => {
    setMetric(e.target.value);
  };

  const onEnabledChange = (e: any) => {
    setIsEnabled(e.target.checked);
  };

  const onTopNSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopNSize(e.target.value);
  };

  const onWindowSizeChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>
  ) => {
    setWindowSize(e.target.value);
  };

  const onTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTime(e.target.value);
  };

  const onExporterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setExporterTypeType(e.target.value);
  };

  const onGroupByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGroupBy(e.target.value);
  };

  const onDeleteAfterDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeleteAfterDays(e.target.value);
  };

  const MinutesBox = () => (
    <EuiSelect
      id="minutes"
      required={true}
      options={MINUTES_OPTIONS}
      value={windowSize}
      onChange={onWindowSizeChange}
    />
  );

  const HoursBox = () => (
    <EuiFieldNumber
      min={1}
      max={24}
      required={true}
      value={windowSize}
      onChange={onWindowSizeChange}
    />
  );

  const WindowChoice = time === TIME_UNITS_TEXT[0].value ? MinutesBox : HoursBox;
  const isLocalIndex = exporterType === EXPORTER_TYPE.localIndex;
  const parsedDeleteAfter = parseInt(deleteAfterDays, 10);
  const deleteAfterNum = Number.isFinite(parsedDeleteAfter) ? parsedDeleteAfter : NaN;
  const isDeleteAfterValid = !isLocalIndex || (deleteAfterNum >= 1 && deleteAfterNum <= 180);

  const isChanged =
    isEnabled !== metricSettingsMap[metric].isEnabled ||
    topNSize !== metricSettingsMap[metric].currTopN ||
    windowSize !== metricSettingsMap[metric].currWindowSize ||
    time !== metricSettingsMap[metric].currTimeUnit ||
    groupBy !== groupBySettingMap.groupBy.groupBy ||
    exporterType !== dataRetentionSettingMap.dataRetention.exporterType ||
    deleteAfterDays !== dataRetentionSettingMap.dataRetention.deleteAfterDays;

  const isValid = (() => {
    const nVal = parseInt(topNSize, 10);
    if (nVal < 1 || nVal > 100) return false;
    if (time === TIME_UNITS_TEXT[0].value) {
      if (windowSize === '' || Number.isNaN(parseInt(windowSize, 10))) return false;
    } else {
      const windowVal = parseInt(windowSize, 10);
      if (!(windowVal >= 1 && windowVal <= 24)) return false;
    }
    return isDeleteAfterValid;
  })();

  const formRowPadding = { padding: '0px 0px 20px' };
  const enabledSymb = <EuiHealth color="primary">Enabled</EuiHealth>;
  const disabledSymb = <EuiHealth color="default">Disabled</EuiHealth>;

  return (
    <div>
      <QueryInsightsDataSourceMenu
        coreStart={core}
        depsStart={depsStart}
        params={params}
        dataSourceManagement={dataSourceManagement}
        setDataSource={setDataSource}
        selectedDataSource={dataSource}
        onManageDataSource={() => {}}
        onSelectedDataSource={() => {
          configInfo(true);
        }}
        dataSourcePickerReadOnly={false}
      />
      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          <EuiPanel paddingSize="m">
            <EuiForm>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>Top n queries monitoring configuration settings</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGrid columns={2} gutterSize="s" style={{ padding: '15px 0px' }}>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      compressed={true}
                      listItems={[
                        {
                          title: <h3>Metric Type</h3>,
                          description: 'Specify the metric type to set settings for.',
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow style={formRowPadding}>
                      <EuiSelect
                        id="metricType"
                        required={true}
                        options={METRIC_TYPES_TEXT}
                        value={metric}
                        onChange={onMetricChange}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      compressed={true}
                      listItems={[
                        {
                          title: <h3>Enabled</h3>,
                          description: `Enable/disable top N query monitoring by ${metric}.`,
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow style={formRowPadding}>
                      <EuiFlexItem>
                        <EuiSpacer size="s" />
                        <EuiSwitch
                          label=""
                          checked={isEnabled}
                          onChange={onEnabledChange}
                          data-test-subj="top-n-metric-toggle"
                        />
                      </EuiFlexItem>
                    </EuiFormRow>
                  </EuiFlexItem>
                  {isEnabled ? (
                    <>
                      <EuiFlexItem>
                        <EuiDescriptionList
                          compressed={true}
                          listItems={[
                            {
                              title: <h3>Value of N (count)</h3>,
                              description:
                                'Specify the value of N. N is the number of queries to be collected within the window size.',
                            },
                          ]}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFormRow
                          label={`${metric}.top_n_size`}
                          helpText="Max allowed limit 100."
                          style={formRowPadding}
                        >
                          <EuiFieldNumber
                            min={1}
                            max={100}
                            required={isEnabled}
                            value={topNSize}
                            onChange={onTopNSizeChange}
                          />
                        </EuiFormRow>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiDescriptionList
                          compressed={true}
                          listItems={[
                            {
                              title: <h3>Window size</h3>,
                              description:
                                ' The duration during which the Top N queries are collected.',
                            },
                          ]}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFormRow
                          label={`${metric}.window_size`}
                          helpText="Max allowed limit 24 hours."
                          style={{ padding: '15px 0px 5px' }}
                        >
                          <EuiFlexGroup>
                            <EuiFlexItem style={{ flexDirection: 'row' }}>
                              <WindowChoice />
                            </EuiFlexItem>
                            <EuiFlexItem>
                              <EuiSelect
                                id="timeUnit"
                                required={isEnabled}
                                options={TIME_UNITS_TEXT}
                                value={time}
                                onChange={onTimeChange}
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFormRow>
                      </EuiFlexItem>
                    </>
                  ) : null}
                </EuiFlexGrid>
              </EuiFlexItem>
            </EuiForm>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel paddingSize="m" grow={false}>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>Statuses for configuration metrics</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">Latency</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {latencySettings.isEnabled ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">CPU Usage</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {cpuSettings.isEnabled ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">Memory</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {memorySettings.isEnabled ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          <EuiPanel paddingSize="m">
            <EuiForm>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>Top n queries grouping configuration settings</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGrid columns={2} gutterSize="s" style={{ padding: '15px 0px' }}>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      compressed={true}
                      listItems={[
                        {
                          title: <h3>Group By</h3>,
                          description: ' Specify the group by type.',
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow style={formRowPadding}>
                      <EuiSelect
                        id="groupBy"
                        required={true}
                        options={GROUP_BY_OPTIONS}
                        value={groupBy}
                        onChange={onGroupByChange}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGrid>
              </EuiFlexItem>
            </EuiForm>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel paddingSize="m" grow={false}>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>Statuses for group by</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">Group By</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {groupBySettings.groupBy === 'similarity' ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          <EuiPanel paddingSize="m">
            <EuiForm>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>Query Insights export and data retention settings</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGrid columns={2} gutterSize="s" style={{ padding: '15px 0px' }}>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      compressed={true}
                      listItems={[
                        {
                          title: <h3>Exporter</h3>,
                          description: ' Configure a sink for exporting Query Insights data.',
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow style={formRowPadding}>
                      <EuiSelect
                        id="exporterType"
                        required={true}
                        options={EXPORTER_TYPES_LIST}
                        value={exporterType}
                        onChange={onExporterTypeChange}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      compressed={true}
                      listItems={[
                        {
                          title: <h3>Delete After (days)</h3>,
                          description: ' Number of days to retain Query Insights data.',
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      style={formRowPadding}
                      helpText="Max allowed limit 180."
                      isInvalid={isLocalIndex && !isDeleteAfterValid}
                      error={
                        isLocalIndex && !isDeleteAfterValid
                          ? 'Please enter a value between 1 and 180.'
                          : undefined
                      }
                    >
                      <EuiFieldNumber
                        disabled={!isLocalIndex}
                        min={1}
                        max={180}
                        value={
                          !isLocalIndex ? '' : deleteAfterDays === '' ? '' : Number(deleteAfterDays)
                        }
                        onChange={onDeleteAfterDaysChange}
                        isInvalid={isLocalIndex && !isDeleteAfterValid}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGrid>
              </EuiFlexItem>
            </EuiForm>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel paddingSize="m" grow={false}>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>Statuses for data retention</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">Exporter</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {exporterType === EXPORTER_TYPE.localIndex ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isChanged && isValid ? (
        <EuiBottomBar>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" size="s" iconType="cross" onClick={newOrReset}>
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj={'save-config-button'}
                color="primary"
                fill
                size="s"
                iconType="check"
                onClick={() => {
                  configInfo(
                    false,
                    isEnabled,
                    metric,
                    topNSize,
                    windowSize,
                    time,
                    exporterType,
                    groupBy,
                    deleteAfterDays
                  );
                  return history.push(QUERY_INSIGHTS);
                }}
              >
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      ) : null}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default Configuration;
