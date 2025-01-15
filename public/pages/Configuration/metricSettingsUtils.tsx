import { MetricSettings } from '../TopNQueries/TopNQueries';

export const getDefaultMetricSettings = (
  metricSettingsMap: Record<string, MetricSettings>,
  metric: string
) => {
  const DEFAULT_TOP_N_SIZE = 3;
  const DEFAULT_WINDOW_SIZE = 1;

  const defaultSettings = metricSettingsMap[metric];
  return {
    isEnabled: defaultSettings.isEnabled ?? false,
    topNSize: defaultSettings.currTopN ?? DEFAULT_TOP_N_SIZE,
    windowSize: defaultSettings.currWindowSize ?? DEFAULT_WINDOW_SIZE,
    time: defaultSettings.currTimeUnit ?? 'MINUTES',
  };
};
