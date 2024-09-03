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
import { CoreStart } from '../../../../../src/core/public';
import { QUERY_INSIGHTS, MetricSettings } from '../TopNQueries/TopNQueries';

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
  const metricTypes = [
    { value: 'latency', text: 'Latency' },
    { value: 'cpu', text: 'CPU' },
    { value: 'memory', text: 'Memory' },
  ];

  const timeUnits = [
    { value: 'MINUTES', text: 'Minute(s)' },
    { value: 'HOURS', text: 'Hour(s)' },
  ];

  const minutesOptions = [
    { value: '1', text: '1' },
    { value: '5', text: '5' },
    { value: '10', text: '10' },
    { value: '30', text: '30' },
  ];

  const history = useHistory();
  const location = useLocation();

  const [metric, setMetric] = useState<'latency' | 'cpu' | 'memory'>('latency');
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [topNSize, setTopNSize] = useState(latencySettings.currTopN);
  const [windowSize, setWindowSize] = useState(latencySettings.currWindowSize);
  const [time, setTime] = useState(latencySettings.currTimeUnit);

  const metricSettingsMap = useMemo(
    () => ({
      latency: latencySettings,
      cpu: cpuSettings,
      memory: memorySettings,
    }),
    [latencySettings, cpuSettings, memorySettings]
  );

  const newOrReset = useCallback(() => {
    const currMetric = metricSettingsMap[metric];
    setTopNSize(currMetric.currTopN);
    setWindowSize(currMetric.currWindowSize);
    setTime(currMetric.currTimeUnit);
    setIsEnabled(currMetric.isEnabled);
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
      options={minutesOptions}
      value={windowSize}
      onChange={(e) => onWindowSizeChange(e)}
    />
  );

  const HoursBox = () => (
    <EuiFieldNumber
      min={1}
      max={24}
      required={true}
      value={windowSize}
      onChange={(e) => onWindowSizeChange(e)}
    />
  );

  const WindowChoice = time === timeUnits[0].value ? MinutesBox : HoursBox;

  let changed = false;
  if (isEnabled !== metricSettingsMap[metric].isEnabled) {
    changed = true;
  } else if (topNSize !== metricSettingsMap[metric].currTopN) {
    changed = true;
  } else if (windowSize !== metricSettingsMap[metric].currWindowSize) {
    changed = true;
  } else if (time !== metricSettingsMap[metric].currTimeUnit) {
    changed = true;
  }

  let valid = false;

  const nVal = parseInt(topNSize, 10);
  if (1 <= nVal && nVal <= 100) {
    if (time === timeUnits[0].value) {
      valid = true;
    } else {
      const windowVal = parseInt(windowSize, 10);
      if (1 <= windowVal && windowVal <= 24) {
        valid = true;
      }
    }
  }

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
                        options={metricTypes}
                        value={metric}
                        onChange={(e) => onMetricChange(e)}
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
                        <EuiSwitch
                          label=""
                          checked={isEnabled}
                          onChange={(e) => onEnabledChange(e)}
                        />
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
                            onChange={(e) => onTopNSizeChange(e)}
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
                                onChange={(e) => onTimeChange(e)}
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
      {changed && valid ? (
        <EuiBottomBar>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty color="ghost" size="s" iconType="cross" onClick={newOrReset}>
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
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
