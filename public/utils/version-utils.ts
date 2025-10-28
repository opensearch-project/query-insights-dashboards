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

const cleanVersion = (version: string | undefined): string | null => {
  if (!version) return null;
  // Remove snapshot suffix and clean the version
  const cleaned = version.replace(/-SNAPSHOT$/, '').trim();
  return semver.valid(semver.coerce(cleaned));
};

export const isVersion31OrHigher = (version: string | undefined): boolean => {
  const cleanedVersion = cleanVersion(version);
  return cleanedVersion ? semver.gte(cleanedVersion, '3.1.0') : false;
};

export const isVersion33OrHigher = (version: string | undefined): boolean => {
  const cleanedVersion = cleanVersion(version);
  return cleanedVersion ? semver.gte(cleanedVersion, '3.3.0') : false;
};

export const isVersion34OrHigher = (version: string | undefined): boolean => {
  const cleanedVersion = cleanVersion(version);
  return cleanedVersion ? semver.gte(cleanedVersion, '3.4.0') : false;
};

export const isVersion219 = (version: string | undefined): boolean => {
  const cleanedVersion = cleanVersion(version);
  return cleanedVersion
    ? semver.gte(cleanedVersion, '2.19.0') && semver.lt(cleanedVersion, '2.20.0')
    : false;
};

export const getGroupBySettingsPath = (version: string | undefined, settings: any) => {
  return isVersion31OrHigher(version) ? settings?.grouping?.group_by : settings?.group_by;
};
