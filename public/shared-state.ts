/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataSourceOption } from 'src/plugins/data_source_management/public';

class SharedDataSourceState {
  private dataSource: DataSourceOption = { id: '', label: 'Local cluster' };
  private listeners: Array<(dataSource: DataSourceOption) => void> = [];

  setDataSource(dataSource: DataSourceOption) {
    this.dataSource = dataSource;
    this.listeners.forEach((listener) => listener(dataSource));
  }

  getDataSource(): DataSourceOption {
    return this.dataSource;
  }

  subscribe(listener: (dataSource: DataSourceOption) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}

export const sharedDataSourceState = new SharedDataSourceState();
