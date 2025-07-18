/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import semver from 'semver';
import { DataSourceOption } from 'src/plugins/data_source_management/public';
import type { SavedObject } from '../../../../src/core/public';
import type { DataSourceAttributes } from '../../../../src/plugins/data_source/common/data_sources';
import pluginManifest from '../../opensearch_dashboards.json';

import { getSavedObjectsClient } from '../../public/service';
import { getLocalClusterVersion } from './getLocalClusterVersion';

/**
 * Returns a URL with `dataSource` query param set.
 */
export function getDataSourceEnabledUrl(dataSource: DataSourceOption): URL {
  const url = new URL(window.location.href);
  url.searchParams.set('dataSource', JSON.stringify(dataSource));
  return url;
}

/**
 * Gets the OpenSearch version of the specified data source.
 * - if `dataSourceId` is undefined → returns undefined.
 * - if `dataSourceId` is empty string → queries the local cluster.
 * - otherwise → fetches the version from saved object.
 */
export const getDataSourceVersion = async (
  dataSourceId: string | undefined
): Promise<string | undefined> => {
  try {

    if (dataSourceId === '' || dataSourceId === undefined) {
      // Local cluster
      return await getLocalClusterVersion();
    }

    const dataSource = await getSavedObjectsClient().get<DataSourceAttributes>(
      'data-source',
      dataSourceId
    );

    return dataSource?.attributes?.dataSourceVersion;
  } catch (error) {
    console.error('Error getting data source version: ', error);
    return undefined;
  }
};

/**
 * Reads the `dataSource` param from the current URL.
 */
export function getDataSourceFromUrl(): DataSourceOption {
  const urlParams = new URLSearchParams(window.location.search);
  const dataSourceParam = urlParams.get('dataSource') || '{}';
  try {
    return JSON.parse(dataSourceParam);
  } catch (e) {
    console.warn('Failed to parse dataSource param, using empty object');
    return {} as DataSourceOption;
  }
}

/**
 * Checks if a data source is compatible with this plugin, based on:
 * - required OpenSearch plugins
 * - supported OpenSearch versions
 */
export const isDataSourceCompatible = (dataSource: SavedObject<DataSourceAttributes>): boolean => {
  if (
    'requiredOSDataSourcePlugins' in pluginManifest &&
    !pluginManifest.requiredOSDataSourcePlugins.every((plugin) =>
      dataSource.attributes.installedPlugins?.includes(plugin)
    )
  ) {
    return false;
  }

  if (
    'supportedOSDataSourceVersions' in pluginManifest &&
    !semver.satisfies(
      dataSource.attributes.dataSourceVersion,
      pluginManifest.supportedOSDataSourceVersions
    )
  ) {
    return false;
  }

  return true;
};
