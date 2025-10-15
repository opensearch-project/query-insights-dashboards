/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import semver from 'semver';
import { getDataSourceVersion } from './datasource-utils';

const VERSION_3_1 = { major: 3, minor: 1 };
const VERSION_3_3 = { major: 3, minor: 3 };
const VERSION_2_19 = { major: 2, minor: 19 };

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

const compareVersion = (version: string | undefined, targetMajor: number, targetMinor: number, operator: 'gte' | 'eq'): boolean => {
  if (!version) return false;
  const [major, minor] = version.split('.');
  const majorNum = parseInt(major, 10);
  const minorNum = parseInt(minor, 10);

  if (operator === 'eq') {
    return majorNum === targetMajor && minorNum === targetMinor;
  }

  return majorNum > targetMajor || (majorNum === targetMajor && minorNum >= targetMinor);
};

export const isVersion31OrHigher = (version: string | undefined): boolean => {
  return compareVersion(version, VERSION_3_1.major, VERSION_3_1.minor, 'gte');
};

export const isVersion33OrHigher = (version: string | undefined): boolean => {
  return compareVersion(version, VERSION_3_3.major, VERSION_3_3.minor, 'gte');
};

export const isVersion219 = (version: string | undefined): boolean => {
  return compareVersion(version, VERSION_2_19.major, VERSION_2_19.minor, 'eq');
};

export const getGroupBySettingsPath = (version: string | undefined, settings: any) => {
  return isVersion31OrHigher(version) ? settings?.grouping?.group_by : settings?.group_by;
};
