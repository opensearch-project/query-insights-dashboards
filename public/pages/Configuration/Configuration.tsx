/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useEffect, useContext, useMemo } from 'react';
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
  EuiSwitchEvent,
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import { DataSourceManagementPluginSetup } from 'src/plugins/data_source_management/public';

import {
  QUERY_INSIGHTS,
  GroupBySettings,
  DataSourceContext,
  DataRetentionSettings,
  MetricSettings,
} from '../TopNQueries/TopNQueries';

import {
  METRIC_TYPES_TEXT,
  GROUP_BY_OPTIONS,
  EXPORTER_TYPES_LIST,
  EXPORTER_TYPE,
} from '../../../common/constants';

import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';

type MetricKey = 'latency' | 'cpu' | 'memory';
type UnitUI = 'm' | 'h';

type ConfigInfoFn = (
  refreshOnly: boolean,
  isEnabled?: boolean,
  metric?: MetricKey,
  topNSize?: number,
  windowSize?: number,
  timeUnit?: string,
  exporterType?: string,
  groupBy?: string,
  deleteAfterDays?: number
) => void;

interface Props {
  latencySettings: MetricSettings; // kept only for prop shape
  cpuSettings: MetricSettings;
  memorySettings: MetricSettings;
  groupBySettings: GroupBySettings;
  dataRetentionSettings: DataRetentionSettings;
  configInfo: ConfigInfoFn;
  core: CoreStart;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
}

// ---------- helpers ----------
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const toInt = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
};
const parseBool = (v: any): boolean => {
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1';
};
// Accepts "10m" / "1h"
const parseWindowSizeStrict = (raw?: string): { value: number; unit: UnitUI } | null => {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  const m = s.match(/^(\d+)\s*([mh])$/);
  if (!m) return null;
  const value = parseInt(m[1], 10);
  const unit = (m[2] as UnitUI) ?? 'm';
  if (!Number.isFinite(value) || value <= 0) return null;
  if (unit === 'h' && (value < 1 || value > 24)) return null;
  if (unit === 'm' && (value < 1 || value > 1440)) return null;
  return { value, unit };
};

const getIn = (obj: any, path: Array<string | number>) =>
  path.reduce((acc, key) => (acc && key in acc ? acc[key] : undefined), obj);

const getClusterSetting = (root: any, nested: string[], dotted: string) => {
  const tryLevel = (lvl: any) => {
    if (!lvl) return undefined;
    const a = getIn(lvl, nested);
    if (a !== undefined) return a;
    if (dotted in (lvl.settings ?? {})) return lvl.settings[dotted];
    if (dotted in lvl) return lvl[dotted];
    return undefined;
  };
  return [root?.persistent, root?.transient, root?.defaults]
    .map(tryLevel)
    .find((v) => v !== undefined);
};

const unwrapClusterPayload = (res: any) => res?.response?.body ?? res?.body ?? res;

export default function Configuration({
  groupBySettings,
  dataRetentionSettings,
  configInfo,
  core,
  depsStart,
  params,
  dataSourceManagement,
}: Props) {
  const history = useHistory();
  const location = useLocation();
  const { dataSource, setDataSource } = useContext(DataSourceContext)!;

  // form state
  const [metric, setMetric] = useState<MetricKey>('latency');
  const [isEnabled, setIsEnabled] = useState(false);
  const [topNSize, setTopNSize] = useState(10);
  const [windowRaw, setWindowRaw] = useState('5m');
  // derived window controls state (kept in sync with windowRaw)
  const [time, setTime] = useState<number>(5);
  const [timeUnit, setTimeUnit] = useState<UnitUI>('m');
  const [groupBy, setGroupBy] = useState(groupBySettings.groupBy ?? 'none');
  const [exporterType, setExporterType] = useState(
    dataRetentionSettings.exporterType ?? EXPORTER_TYPE.none
  );
  const [deleteAfterDays, setDeleteAfterDays] = useState<number>(
    toInt(dataRetentionSettings.deleteAfterDays ?? 7)
  );

  // baselines (for isChanged)
  const [baseline, setBaseline] = useState({
    isEnabled: false,
    topNSize: 10,
    windowRaw: '5m',
    groupBy: groupBySettings.groupBy ?? 'none',
    exporterType: dataRetentionSettings.exporterType ?? EXPORTER_TYPE.none,
    deleteAfterDays: toInt(dataRetentionSettings.deleteAfterDays ?? 7),
  });

  // status cards
  const [statusLatency, setStatusLatency] = useState(false);
  const [statusCpu, setStatusCpu] = useState(false);
  const [statusMemory, setStatusMemory] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadFromCluster = useCallback(async () => {
    setFetchError(null);
    try {
      const dsId = (dataSource as any)?.id;
      const res = await core.http.get('/api/cluster_settings', {
        query: { include_defaults: true, dataSourceId: dsId },
      });
      const payload = unwrapClusterPayload(res);

      const readMetric = (key: MetricKey) => {
        const base = `search.insights.top_queries.${key}`;
        const enabled = getClusterSetting(
          payload,
          ['search', 'insights', 'top_queries', key, 'enabled'],
          `${base}.enabled`
        );
        const topN = getClusterSetting(
          payload,
          ['search', 'insights', 'top_queries', key, 'top_n_size'],
          `${base}.top_n_size`
        );
        const win = getClusterSetting(
          payload,
          ['search', 'insights', 'top_queries', key, 'window_size'],
          `${base}.window_size`
        );
        return {
          enabled: parseBool(enabled ?? false),
          topN: toInt(topN ?? 10),
          window: String(win ?? '5m'),
        };
      };

      const mLatency = readMetric('latency');
      const mCpu = readMetric('cpu');
      const mMem = readMetric('memory');

      // statuses
      setStatusLatency(mLatency.enabled);
      setStatusCpu(mCpu.enabled);
      setStatusMemory(mMem.enabled);

      // group by / exporter
      const groupByVal =
        getClusterSetting(
          payload,
          ['search', 'insights', 'top_queries', 'grouping', 'group_by'],
          'search.insights.top_queries.grouping.group_by'
        ) ?? 'none';

      const exporterTypeVal =
        getClusterSetting(
          payload,
          ['search', 'insights', 'top_queries', 'exporter', 'type'],
          'search.insights.top_queries.exporter.type'
        ) ?? EXPORTER_TYPE.none;

      const deleteAfterDaysVal = toInt(
        getClusterSetting(
          payload,
          ['search', 'insights', 'top_queries', 'exporter', 'delete_after_days'],
          'search.insights.top_queries.exporter.delete_after_days'
        ) ?? 7
      );

      // seed the current form from the selected metric
      const current = { latency: mLatency, cpu: mCpu, memory: mMem }[metric];
      setIsEnabled(current.enabled);
      setTopNSize(current.topN);
      setWindowRaw(current.window);
      setGroupBy(String(groupByVal));
      setExporterType(String(exporterTypeVal));
      setDeleteAfterDays(deleteAfterDaysVal);

      setBaseline({
        isEnabled: current.enabled,
        topNSize: current.topN,
        windowRaw: current.window,
        groupBy: String(groupByVal),
        exporterType: String(exporterTypeVal),
        deleteAfterDays: deleteAfterDaysVal,
      });
    } catch (e: any) {
      setFetchError(e?.message || 'Failed to load cluster settings');
    }
  }, [core.http, dataSource, metric]);

  // initial + on DS switch + on metric change
  useEffect(() => {
    loadFromCluster();
  }, [loadFromCluster]); // loadFromCluster depends on `metric`, so this also reacts to metric changes

  // keep number/unit controls in sync when windowRaw changes (including after fetch)
  useEffect(() => {
    const p = parseWindowSizeStrict(windowRaw);
    if (p) {
      setTime(p.value);
      setTimeUnit(p.unit);
    }
  }, [windowRaw]);

  // breadcrumbs
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

  const isValidWindow = useMemo(() => !!parseWindowSizeStrict(`${time}${timeUnit}`), [
    time,
    timeUnit,
  ]);

  const isChanged = useMemo(() => {
    return (
      isEnabled !== baseline.isEnabled ||
      topNSize !== baseline.topNSize ||
      windowRaw.trim().toLowerCase() !== baseline.windowRaw.trim().toLowerCase() ||
      groupBy !== baseline.groupBy ||
      exporterType !== baseline.exporterType ||
      deleteAfterDays !== baseline.deleteAfterDays
    );
  }, [baseline, deleteAfterDays, exporterType, groupBy, isEnabled, topNSize, windowRaw]);

  const onSave = () => {
    const parsed = parseWindowSizeStrict(`${time}${timeUnit}`);
    if (!parsed) return;

    configInfo(
      false,
      isEnabled,
      metric,
      clamp(topNSize, 1, 100),
      parsed.value,
      parsed.unit,
      exporterType,
      groupBy,
      clamp(deleteAfterDays, 1, 180)
    );
    history.push(QUERY_INSIGHTS);
  };

  const onCancel = () => {
    setIsEnabled(baseline.isEnabled);
    setTopNSize(baseline.topNSize);
    setWindowRaw(baseline.windowRaw);
    setGroupBy(baseline.groupBy);
    setExporterType(baseline.exporterType);
    setDeleteAfterDays(baseline.deleteAfterDays);
  };

  const formRowPadding = { padding: '0px 0px 20px' };
  const enabledSymb = <EuiHealth color="primary">Enabled</EuiHealth>;
  const disabledSymb = <EuiHealth color="default">Disabled</EuiHealth>;

  const TIME_UNITS_TEXT = useMemo(
    () => [
      { value: 'm', text: 'm' },
      { value: 'h', text: 'h' },
    ],
    []
  );

  const onTimeChange = (nextUnit: UnitUI) => {
    setTimeUnit(nextUnit);
    setWindowRaw(`${time}${nextUnit}`);
  };

  const WindowChoice = () => (
    <EuiFieldNumber
      min={timeUnit === 'h' ? 1 : 1}
      max={timeUnit === 'h' ? 24 : 1440}
      required={isEnabled}
      value={time}
      onChange={(e) => {
        const v = clamp(
          toInt(e.target.value),
          timeUnit === 'h' ? 1 : 1,
          timeUnit === 'h' ? 24 : 1440
        );
        setTime(v);
        setWindowRaw(`${v}${timeUnit}`);
      }}
      aria-label="Window size value"
      data-test-subj="window-size-value"
      isInvalid={isEnabled && !isValidWindow}
    />
  );

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
          void loadFromCluster();
        }}
        dataSourcePickerReadOnly={false}
      />

      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          <EuiPanel paddingSize="m">
            <EuiForm>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>Top N queries monitoring configuration settings</h2>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiFlexGrid columns={2} gutterSize="s" style={{ padding: '15px 0px' }}>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      compressed
                      listItems={[
                        {
                          title: <h3>Metric Type</h3>,
                          description: 'Specify the metric type to set settings for.',
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow>
                      <EuiSelect
                        id="metricType"
                        required
                        options={METRIC_TYPES_TEXT}
                        value={metric}
                        onChange={(e) => setMetric(e.target.value as MetricKey)}
                        aria-label="Metric type"
                      />
                    </EuiFormRow>
                  </EuiFlexItem>

                  <EuiFlexItem>
                    <EuiDescriptionList
                      compressed
                      listItems={[
                        {
                          title: <h3>Enabled</h3>,
                          description: `Enable/disable top N query monitoring by ${metric}.`,
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow>
                      <EuiSwitch
                        label=""
                        checked={isEnabled}
                        onChange={(e: EuiSwitchEvent) => setIsEnabled(e.target.checked)}
                        data-test-subj="top-n-metric-toggle"
                        aria-label="Enable metric"
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  {isEnabled ? (
                    <>
                      <EuiFlexItem>
                        <EuiDescriptionList
                          compressed
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
                        >
                          <EuiFieldNumber
                            min={1}
                            max={100}
                            required
                            value={topNSize}
                            onChange={(e) => setTopNSize(clamp(toInt(e.target.value), 1, 100))}
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
                                value={timeUnit}
                                onChange={(e) => onTimeChange(e.target.value as UnitUI)}
                                aria-label="Window size unit"
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
                  {statusLatency ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">CPU Usage</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {statusCpu ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">Memory</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {statusMemory ? enabledSymb : disabledSymb}
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
                      compressed
                      listItems={[
                        {
                          title: <h3>Group By</h3>,
                          description: 'Specify the group by type.',
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
                        onChange={(e) => setGroupBy(e.target.value)}
                        aria-label="Group by"
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
                  {groupBy === 'similarity' ? enabledSymb : disabledSymb}
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
                        onChange={(e) => setExporterType(e.target.value)}
                        aria-label="Exporter type"
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
                    <EuiFormRow style={formRowPadding}>
                      <EuiFieldNumber
                        disabled={exporterType !== EXPORTER_TYPE.localIndex}
                        min={1}
                        max={180}
                        value={
                          exporterType !== EXPORTER_TYPE.localIndex ? undefined : deleteAfterDays
                        }
                        onChange={(e) => setDeleteAfterDays(clamp(toInt(e.target.value), 1, 180))}
                        aria-label="Delete after days"
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

      {isChanged && (
        <EuiBottomBar>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" size="s" iconType="cross" onClick={onCancel}>
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="save-config-button"
                color="primary"
                fill
                size="s"
                iconType="check"
                onClick={onSave}
                isDisabled={isEnabled && !isValidWindow}
              >
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </div>
  );
}
