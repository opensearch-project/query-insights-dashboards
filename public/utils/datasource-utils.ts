/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 *   Copyright OpenSearch Contributors
 *
 *   Licensed under the Apache License, Version 2.0 (the "License").
 *   You may not use this file except in compliance with the License.
 *   A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   or in the "license" file accompanying this file. This file is distributed
 *   on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *   express or implied. See the License for the specific language governing
 *   permissions and limitations under the License.
 */

import semver from 'semver';
import { DataSourceOption } from 'src/plugins/data_source_management/public';
import pluginManifest from '../../opensearch_dashboards.json';
import type { SavedObject } from '../../../../src/core/public';
import type { DataSourceAttributes } from '../../../../src/plugins/data_source/common/data_sources';
import { getSavedObjectsClient } from '../../public/service';
import { getLocalClusterVersion } from './getLocalClusterVersion';

export function getDataSourceEnabledUrl(dataSource: DataSourceOption) {
  const url = new URL(window.location.href);
  url.searchParams.set('dataSource', JSON.stringify(dataSource));
  return url;
}

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
    console.error('Error getting version: ', error);
    return undefined;
  }
};

export function getDataSourceFromUrl(): DataSourceOption {
  const urlParams = new URLSearchParams(window.location.search);
  const dataSourceParam = (urlParams && urlParams.get('dataSource')) || '{}';
  // following block is needed if the dataSource param is set to non-JSON value, say 'undefined'
  try {
    return JSON.parse(dataSourceParam);
  } catch (e) {
    return JSON.parse('{}'); // Return an empty object or some default value if parsing fails
  }
}

export const isDataSourceCompatible = (dataSource: SavedObject<DataSourceAttributes>) => {
  if (
    'requiredOSDataSourcePlugins' in pluginManifest &&
    !pluginManifest.requiredOSDataSourcePlugins.every((plugin) =>
      dataSource.attributes.installedPlugins?.includes(plugin)
    )
  ) {
    return false;
  }

  // filter out data sources which is NOT in the support range of plugin
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
