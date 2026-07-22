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
import type { CoreStart } from 'opensearch-dashboards/public';
import pluginManifest from '../../opensearch_dashboards.json';
import type { SavedObject } from '../../../../src/core/public';
import type { DataSourceAttributes } from '../../../../src/plugins/data_source/common/data_sources';
import { getSavedObjectsClient, getRouteService } from '../service';

export function getDataSourceEnabledUrl(dataSource: DataSourceOption) {
  const url = new URL(window.location.href);
  if (
    dataSource &&
    (dataSource.id || dataSource.label) &&
    dataSource.id !== undefined &&
    String(dataSource.id) !== 'undefined'
  ) {
    url.searchParams.set('dataSource', JSON.stringify(dataSource));
  } else {
    url.searchParams.delete('dataSource');
  }
  return url;
}

export const getDataSourceVersion = async (
  dataSourceId: string | undefined
): Promise<string | undefined> => {
  try {
    if (dataSourceId === undefined || dataSourceId === '') {
      return await getRouteService().getLocalClusterVersion();
    }

    const savedObjectsClient = getSavedObjectsClient();
    if (!savedObjectsClient) {
      console.warn('SavedObjects client not available');
      return undefined;
    }

    const dataSource = await savedObjectsClient.get<DataSourceAttributes>(
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
  if (!dataSourceParam || dataSourceParam === 'undefined' || dataSourceParam === 'null') {
    return {} as DataSourceOption;
  }
  try {
    const parsed = JSON.parse(dataSourceParam);
    // Guard against parsed objects with id set to undefined or the string "undefined"
    if (
      Object.keys(parsed).length > 0 &&
      (parsed.id === undefined || parsed.id === 'undefined' || parsed.id === null)
    ) {
      return { ...parsed, id: '' } as DataSourceOption;
    }
    return parsed;
  } catch (_e) {
    return {} as DataSourceOption;
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

export const isWLMDataSourceCompatible = (dataSource: SavedObject<DataSourceAttributes>) => {
  // First check if it meets basic compatibility requirements
  if (!isDataSourceCompatible(dataSource)) {
    return false;
  }

  // Then check WLM-specific version requirement
  if (
    'supportedOSDataSourceVersions' in pluginManifest &&
    !semver.satisfies(dataSource.attributes.dataSourceVersion, '>=3.1.0')
  ) {
    return false;
  }
  return true;
};

export async function resolveDataSourceVersion(
  core: CoreStart,
  selected?: DataSourceOption | { id?: string; dataSourceVersion?: string }
): Promise<string | undefined> {
  // 1) fetch the saved object to read attributes.dataSourceVersion.
  const id = (selected as any)?.id;
  if (id) {
    try {
      const so = await core.savedObjects.client.get<SavedObject<DataSourceAttributes>>(
        'data-source',
        id
      );
      return (so as any)?.attributes?.dataSourceVersion;
    } catch {
      return undefined;
    }
  }

  // 2) If it's local cluster then always show security
  if (selected?.label === 'Local cluster') {
    return '3.3.0';
  }
  return undefined;
}

/** Whether Security rule attributes (username/role) are supported (>= 3.3.0). */
export function isSecurityAttributesSupported(version?: string): boolean {
  // defend against undefined or loose versions
  const v = version && semver.valid(version) ? version : semver.coerce(version || '')?.version;
  return !!v && semver.gte(v, '3.3.0');
}

/** Whether per-workload-group settings are supported (>= 3.7.0). */
export function isWlmGroupSettingsSupported(version?: string): boolean {
  const v = version && semver.valid(version) ? version : semver.coerce(version || '')?.version;
  return !!v && semver.gte(v, '3.7.0');
}
