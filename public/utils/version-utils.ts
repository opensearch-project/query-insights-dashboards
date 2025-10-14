/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import semver from 'semver';
import { getDataSourceVersion } from './datasource-utils';

let cachedVersion: string | undefined;
let cachedDataSourceId: string | undefined;

export const getVersionOnce = async (dataSourceId: string): Promise<string | undefined> => {
  if (cachedDataSourceId === dataSourceId && cachedVersion !== undefined) {
    return cachedVersion;
  }

  cachedVersion = await getDataSourceVersion(dataSourceId);
  cachedDataSourceId = dataSourceId;
  return cachedVersion;
};

export const isVersion31OrHigher = (version: string | undefined): boolean => {
  return version ? semver.gte(version, '3.1.0') : false;
};

export const getGroupBySettingsPath = (version: string | undefined, settings: any) => {
  return isVersion31OrHigher(version) ? settings?.grouping?.group_by : settings?.group_by;
};
