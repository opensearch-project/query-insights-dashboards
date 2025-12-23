/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HttpStart } from '../../../src/core/public';

export class RouteService {
  private http: HttpStart;

  constructor(http: HttpStart) {
    this.http = http;
  }

  async getLocalClusterVersion(): Promise<string | undefined> {
    try {
      const response = await this.http.get('/api/cluster/version');
      return response?.version;
    } catch (error) {
      console.error('Error getting local cluster version:', error);
      return undefined;
    }
  }
}
