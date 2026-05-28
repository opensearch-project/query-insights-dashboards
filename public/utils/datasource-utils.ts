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
  url.searchParams.set('dataSource', JSON.stringify(dataSource));
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
  try {
    return JSON.parse(dataSourceParam);
  } catch (_e) {
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

/**
 * Result of probing the cluster for the opensearch-security plugin:
 * - 'available': plugin is installed and active (or its auth is intercepting requests)
 * - 'unavailable': plugin is not installed, or installed but disabled
 * - 'unknown': probe failed for an unrelated reason (network, etc.) — let user proceed
 */
export type SecurityPluginStatus = 'available' | 'unavailable' | 'unknown';

const SECURITY_PLUGIN_COMPONENTS = ['opensearch-security'];

/**
 * Detect whether the opensearch-security plugin is installed AND active on the
 * target cluster. Combines two probes:
 *   1. /_cat/plugins — confirms the plugin is installed somewhere in the cluster.
 *   2. /_plugins/_security/health — confirms the plugin is enabled and responding.
 *
 * Both probes must succeed for the plugin to be considered available. If either
 * probe fails for an inconclusive reason we return 'unknown' so the UI does not
 * over-block the user.
 */
export async function getSecurityPluginStatus(
  http: { get: (path: string, options?: any) => Promise<any> },
  dataSourceId?: string
): Promise<SecurityPluginStatus> {
  const query = { dataSourceId: dataSourceId ?? '' };

  let pluginListed: boolean | undefined;
  try {
    const pluginsResp = await http.get('/api/cat/plugins', { query });
    if (pluginsResp?.ok && Array.isArray(pluginsResp.response)) {
      pluginListed = pluginsResp.response.some(
        (p: { component?: string }) =>
          !!p?.component && SECURITY_PLUGIN_COMPONENTS.includes(p.component)
      );
    }
  } catch (err) {
    console.warn('Failed to list cluster plugins:', err);
  }

  if (pluginListed === false) {
    return 'unavailable';
  }

  try {
    const healthResp = await http.get('/api/_plugins/_security/health', { query });
    if (healthResp?.ok) {
      return healthResp.available ? 'available' : 'unavailable';
    }
  } catch (err) {
    console.warn('Failed to probe security plugin health:', err);
  }

  // _cat/plugins says it's installed but health probe was inconclusive — assume available.
  if (pluginListed === true) {
    return 'available';
  }

  return 'unknown';
}

/**
 * Convert a save error into a clearer message when the cluster rejects
 * principal-based rule attributes because the security plugin isn't active.
 *
 * The cluster surfaces this as:
 *   "[x_content_parse_exception] principal is not a valid attribute within the workload_group feature."
 * which is technically correct but unactionable. Detect that exact shape and replace it.
 */
export function describeRuleSaveError(err: unknown): string {
  // Use || rather than ?? so empty body.message falls through to err.message and
  // String(err) — otherwise an err = { body: { message: '' } } produces an empty
  // toast tail like "Failed to save changes: ".
  const raw =
    (err as any)?.body?.message || (err as any)?.message || (err == null ? '' : String(err));
  const message = typeof raw === 'string' ? raw : String(raw);
  if (/principal is not a valid attribute/i.test(message)) {
    return 'Workload group rules with username or role require the OpenSearch Security plugin to be installed and enabled on this cluster.';
  }
  return message;
}
