/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
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
} from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { CoreStart } from 'opensearch-dashboards/public';
import { QUERY_INSIGHTS, MetricSettings } from '../TopNQueries/TopNQueries';
import {
  METRIC_TYPES,
  TIME_UNITS,
  MINUTES_OPTIONS,
  DEFAULT_TOP_N_SIZE,
  DEFAULT_WINDOW_SIZE,
} from '../Utils/Constants';

const getDefaultMetricSettings = (
  metricSettingsMap: Record<string, MetricSettings>,
  metric: string
) => {
  const defaultSettings = metricSettingsMap[metric];
  return {
    isEnabled: defaultSettings.isEnabled ?? false,
    topNSize: defaultSettings.currTopN ?? DEFAULT_TOP_N_SIZE,
    windowSize: defaultSettings.currWindowSize ?? DEFAULT_WINDOW_SIZE,
    time: defaultSettings.currTimeUnit ?? 'MINUTES',
  };
};

const Configuration = ({
  latencySettings,
  cpuSettings,
  memorySettings,
  configInfo,
  core,
}: {
  latencySettings: MetricSettings;
  cpuSettings: MetricSettings;
  memorySettings: MetricSettings;
  configInfo: any;
  core: CoreStart;
}) => {
  const history = useHistory();
  const location = useLocation();

  const [metric, setMetric] = useState<'latency' | 'cpu' | 'memory'>('latency');
  const metricSettingsMap = useMemo(
    () => ({
      latency: latencySettings,
      cpu: cpuSettings,
      memory: memorySettings,
    }),
    [latencySettings, cpuSettings, memorySettings]
  );

  const initialSettings = useMemo(() => getDefaultMetricSettings(metricSettingsMap, 'latency'), [
    metricSettingsMap,
  ]);
  const [isEnabled, setIsEnabled] = useState(initialSettings.isEnabled);
  const [topNSize, setTopNSize] = useState(initialSettings.topNSize);
  const [windowSize, setWindowSize] = useState(initialSettings.windowSize);
  const [time, setTime] = useState(initialSettings.time);

  const newOrReset = useCallback(() => {
    const settings = getDefaultMetricSettings(metricSettingsMap, metric);
    setIsEnabled(settings.isEnabled);
    setTopNSize(settings.topNSize);
    setWindowSize(settings.windowSize);
    setTime(settings.time);
  }, [metric, metricSettingsMap]);

  useEffect(() => {
    newOrReset();
  }, [newOrReset]);

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

  const WindowChoice = time === TIME_UNITS[0].value ? MinutesBox : HoursBox;

  const isChanged =
    isEnabled !== metricSettingsMap[metric].isEnabled ||
    topNSize !== metricSettingsMap[metric].currTopN ||
    windowSize !== metricSettingsMap[metric].currWindowSize ||
    time !== metricSettingsMap[metric].currTimeUnit;

  const isValid = (() => {
    const nVal = parseInt(topNSize, 10);
    if (nVal < 1 || nVal > 100) return false;
    if (time === TIME_UNITS[0].value) return true;
    const windowVal = parseInt(windowSize, 10);
    return windowVal >= 1 && windowVal <= 24;
  })();

  const textPadding = { lineHeight: '22px', padding: '5px 0px' };
  const formRowPadding = { padding: '0px 0px 20px' };
  const enabledSymb = <EuiHealth color="primary">Enabled</EuiHealth>;
  const disabledSymb = <EuiHealth color="default">Disabled</EuiHealth>;

  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem grow={6}>
          <EuiPanel paddingSize="m">
            <EuiForm>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <EuiText size="s">
                    <h2>Top n queries monitoring configuration settings</h2>
                  </EuiText>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGrid columns={2} gutterSize="s" style={{ padding: '15px 0px' }}>
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <h3>Metric Type</h3>
                    </EuiText>
                    <EuiText size="xs" style={textPadding}>
                      Specify the metric type to set settings for.
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow style={formRowPadding}>
                      <EuiSelect
                        id="metricType"
                        required={true}
                        options={METRIC_TYPES}
                        value={metric}
                        onChange={onMetricChange}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <h3>Enabled</h3>
                    </EuiText>
                    <EuiText size="xs" style={textPadding}>
                      {`Enable/disable top N query monitoring by ${metric}.`}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow style={formRowPadding}>
                      <EuiFlexItem>
                        <EuiSpacer size="s" />
                        <EuiSwitch label="" checked={isEnabled} onChange={onEnabledChange} />
                      </EuiFlexItem>
                    </EuiFormRow>
                  </EuiFlexItem>
                  {isEnabled ? (
                    <>
                      <EuiFlexItem>
                        <EuiText size="xs">
                          <h3>Value of N (count)</h3>
                        </EuiText>
                        <EuiText size="xs" style={textPadding}>
                          Specify the value of N. N is the number of queries to be collected within
                          the window size.
                        </EuiText>
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
                        <EuiText size="xs">
                          <h3>Window size</h3>
                        </EuiText>
                        <EuiText size="xs" style={textPadding}>
                          The duration during which the Top N queries are collected.
                        </EuiText>
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
                                options={timeUnits}
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
                <EuiText size="s">
                  <h2>Statuses for configuration metrics</h2>
                </EuiText>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="m">Latency</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {latencySettings.isEnabled ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="m">CPU Usage</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiSpacer size="xs" />
                  {cpuSettings.isEnabled ? enabledSymb : disabledSymb}
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="m">Memory</EuiText>
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
                  configInfo(false, isEnabled, metric, topNSize, windowSize, time);
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
