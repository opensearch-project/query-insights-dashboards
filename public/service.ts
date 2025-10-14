/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// public/services.ts
import type { CoreStart } from '../../../src/core/public';

let coreStartServices: CoreStart;

export function setStartServices(coreStart: CoreStart) {
  coreStartServices = coreStart;
}

export function getSavedObjectsClient() {
  return coreStartServices.savedObjects.client;
}

export function getRouteService() {
  return coreStartServices.http;
}
