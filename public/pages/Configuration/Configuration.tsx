/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useEffect, useContext } from 'react';
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiDescriptionList,
  EuiLoadingSpinner,
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
  RemoteExporterSettings,
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
import { validateConfiguration } from './configurationValidation';
import RegisterRepositoryFlyout from './Components/RegisterRepositoryFlyout';

const Configuration = ({
  latencySettings,
  cpuSettings,
  memorySettings,
  groupBySettings,
  dataRetentionSettings,
  remoteExporterSettings,
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
  remoteExporterSettings: RemoteExporterSettings;
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

  const [remoteEnabled, setRemoteEnabled] = useState(remoteExporterSettings.enabled);
  const [remoteRepository, setRemoteRepository] = useState(remoteExporterSettings.repository);
  const [remotePath, setRemotePath] = useState(remoteExporterSettings.path);
  const [isRepoFlyoutOpen, setIsRepoFlyoutOpen] = useState(false);
  const [repoOptions, setRepoOptions] = useState<Array<{ label: string }>>([]);
  const [isS3PluginInstalled, setIsS3PluginInstalled] = useState<boolean | null>(null);
  const [isCheckingPlugin, setIsCheckingPlugin] = useState(false);

  const checkS3Plugin = useCallback(async () => {
    setIsCheckingPlugin(true);
    try {
      const resp = await core.http.get('/api/cat/plugins', {
        query: { dataSourceId: dataSource?.id || '' },
      });
      if (resp.ok && Array.isArray(resp.response)) {
        const found = resp.response.some(
          (p: { component: string }) => p.component === 'repository-s3'
        );
        setIsS3PluginInstalled(found);
      }
    } catch (error) {
      console.error('Failed to check for repository-s3 plugin:', error);
      // On failure, assume plugin is installed so the user isn't stuck
      setIsS3PluginInstalled(true);
    } finally {
      setIsCheckingPlugin(false);
    }
  }, [core.http, dataSource]);

  const fetchRepositories = useCallback(async () => {
    try {
      const resp = await core.http.get('/api/snapshot/repositories', {
        query: { dataSourceId: dataSource?.id || '' },
      });
      if (resp.ok && resp.response) {
        const names = Object.keys(resp.response)
          .filter((name) => resp.response[name].type === 's3')
          .map((name) => ({ label: name }));
        setRepoOptions(names);
      }
    } catch (error) {
      console.error('Failed to fetch snapshot repositories:', error);
    }
  }, [core.http, dataSource]);

  useEffect(() => {
    fetchRepositories();
    if (remoteExporterSettings.enabled) {
      checkS3Plugin();
    }
  }, [fetchRepositories, checkS3Plugin, remoteExporterSettings.enabled]);

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

  const [remoteExporterSettingMap, setRemoteExporterSettingMap] = useState({
    remoteExporter: remoteExporterSettings,
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
    setRemoteEnabled(remoteExporterSettingMap.remoteExporter.enabled);
    setRemoteRepository(remoteExporterSettingMap.remoteExporter.repository);
    setRemotePath(remoteExporterSettingMap.remoteExporter.path);
  }, [metric, metricSettingsMap, remoteExporterSettingMap]);

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
    setRemoteExporterSettingMap({
      remoteExporter: remoteExporterSettings,
    });
    setRemoteEnabled(remoteExporterSettings.enabled);
    setRemoteRepository(remoteExporterSettings.repository);
    setRemotePath(remoteExporterSettings.path);
  }, [remoteExporterSettings]);

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

  const onRemoteEnabledChange = (e: any) => {
    const enabling = e.target.checked;
    setRemoteEnabled(enabling);
    if (enabling && isS3PluginInstalled === null) {
      checkS3Plugin();
    }
  };

  const onRemotePathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRemotePath(e.target.value);
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
  const isDeleteAfterValid = !isLocalIndex || (parsedDeleteAfter >= 1 && parsedDeleteAfter <= 180);

  const isChanged =
    isEnabled !== metricSettingsMap[metric].isEnabled ||
    topNSize !== metricSettingsMap[metric].currTopN ||
    windowSize !== metricSettingsMap[metric].currWindowSize ||
    time !== metricSettingsMap[metric].currTimeUnit ||
    groupBy !== groupBySettingMap.groupBy.groupBy ||
    exporterType !== dataRetentionSettingMap.dataRetention.exporterType ||
    deleteAfterDays !== dataRetentionSettingMap.dataRetention.deleteAfterDays ||
    remoteEnabled !== remoteExporterSettingMap.remoteExporter.enabled ||
    remoteRepository !== remoteExporterSettingMap.remoteExporter.repository ||
    remotePath !== remoteExporterSettingMap.remoteExporter.path;

  const isValid =
    validateConfiguration(
      topNSize,
      windowSize,
      time,
      deleteAfterDays,
      exporterType,
      remoteEnabled,
      remoteRepository
    ) &&
    (!remoteEnabled || isS3PluginInstalled !== false);

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
                  <h2>Export and data retention settings</h2>
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
                <h2>Statuses for export and retention</h2>
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
      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          <EuiPanel paddingSize="m">
            <EuiForm>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>Remote repository exporter settings</h2>
                </EuiTitle>
                <EuiSpacer size="xs" />
                <EuiText size="xs" color="subdued">
                  Export top N query insights data to a remote S3 repository for cheaper, long-term
                  storage. Unlike the local index exporter, Query Insights does not read from remote
                  repository data. Data retention is managed by the bucket configuration, not
                  OpenSearch.
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGrid columns={2} gutterSize="s" style={{ padding: '15px 0px' }}>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      compressed={true}
                      listItems={[
                        {
                          title: <h3>Enabled</h3>,
                          description: 'Enable or disable the remote repository exporter.',
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow style={formRowPadding}>
                      <EuiFlexItem>
                        <EuiSpacer size="s" />
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiSwitch
                              label=""
                              checked={remoteEnabled}
                              onChange={onRemoteEnabledChange}
                              data-test-subj="remote-exporter-toggle"
                            />
                          </EuiFlexItem>
                          {isCheckingPlugin && (
                            <EuiFlexItem grow={false}>
                              <EuiLoadingSpinner size="m" />
                            </EuiFlexItem>
                          )}
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGrid>
              </EuiFlexItem>
              {remoteEnabled && isS3PluginInstalled === false && (
                <EuiFlexItem>
                  <EuiCallOut
                    title="The repository-s3 plugin is not installed"
                    color="danger"
                    iconType="alert"
                    size="s"
                  >
                    <EuiText size="xs">
                      <p>
                        The remote exporter requires the{' '}
                        <EuiLink
                          href="https://opensearch.org/docs/latest/tuning-your-cluster/availability-and-recovery/snapshots/snapshot-restore/#amazon-s3"
                          target="_blank"
                          external
                        >
                          repository-s3 plugin
                        </EuiLink>
                        . Follow the setup guide to install the plugin, configure AWS credentials,
                        and restart the cluster.
                      </p>
                    </EuiText>
                  </EuiCallOut>
                </EuiFlexItem>
              )}
              {remoteEnabled && isS3PluginInstalled === true && (
                <EuiFlexItem>
                  <EuiFlexGrid columns={2} gutterSize="s" style={{ padding: '0px 0px 15px' }}>
                    <EuiFlexItem>
                      <EuiDescriptionList
                        compressed={true}
                        listItems={[
                          {
                            title: <h3>Repository</h3>,
                            description:
                              'The name of the registered snapshot repository to use for exporting data.',
                          },
                        ]}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow
                        label="exporter.remote.repository"
                        helpText="Select an existing repository or register a new one."
                        style={formRowPadding}
                        isInvalid={remoteEnabled && remoteRepository.trim() === ''}
                        error={
                          remoteEnabled && remoteRepository.trim() === ''
                            ? 'Repository name is required when remote export is enabled.'
                            : undefined
                        }
                      >
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                          <EuiFlexItem>
                            <EuiComboBox
                              placeholder={
                                repoOptions.length === 0
                                  ? 'No S3 repositories registered'
                                  : 'Select a registered S3 repository'
                              }
                              singleSelection={{ asPlainText: true }}
                              options={repoOptions}
                              isLoading={isCheckingPlugin}
                              selectedOptions={
                                remoteRepository ? [{ label: remoteRepository }] : []
                              }
                              onChange={(selected) => {
                                setRemoteRepository(selected.length > 0 ? selected[0].label : '');
                              }}
                              data-test-subj="remote-exporter-repository"
                            />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              size="s"
                              onClick={() => setIsRepoFlyoutOpen(true)}
                              data-test-subj="register-repo-button"
                            >
                              Register new
                            </EuiButton>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFormRow>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiDescriptionList
                        compressed={true}
                        listItems={[
                          {
                            title: <h3>Path</h3>,
                            description:
                              'The base path within the repository for organizing exported files.',
                          },
                        ]}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFormRow label="exporter.remote.path" style={formRowPadding}>
                        <EuiFieldText
                          placeholder="query-insights"
                          value={remotePath}
                          onChange={onRemotePathChange}
                          data-test-subj="remote-exporter-path"
                        />
                      </EuiFormRow>
                    </EuiFlexItem>
                  </EuiFlexGrid>
                </EuiFlexItem>
              )}
            </EuiForm>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel paddingSize="m" grow={false}>
            <EuiFlexItem>
              <EuiTitle size="s">
                <h2>Statuses for remote exporter</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">Remote Exporter</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {remoteExporterSettings.enabled ? enabledSymb : disabledSymb}
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
                    deleteAfterDays,
                    remoteEnabled,
                    remoteRepository,
                    remotePath
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
      {isRepoFlyoutOpen && (
        <RegisterRepositoryFlyout
          core={core}
          dataSourceId={dataSource?.id}
          onClose={() => setIsRepoFlyoutOpen(false)}
          onSuccess={(repoName) => {
            setRemoteRepository(repoName);
            fetchRepositories();
          }}
        />
      )}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default Configuration;
