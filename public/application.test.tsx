/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router } from 'react-router-dom';
import * as ReactDOM from 'react-dom';
import { renderApp } from './application';
import { QueryInsightsDashboardsApp } from './components/app';

jest.mock('react-dom', () => {
  const actualReactDOM = jest.requireActual('react-dom');
  return {
    ...actualReactDOM,
    render: jest.fn(),
    unmountComponentAtNode: jest.fn(),
  };
});
describe('renderApp', () => {
  const coreMock = {};
  const depsStartMock = {};
  const paramsMock = { element: document.createElement('div') };
  const dataSourceManagementMock = {};

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the QueryInsightsDashboardsApp component inside Router', () => {
    const unmount = renderApp(coreMock, depsStartMock, paramsMock, dataSourceManagementMock);

    expect(ReactDOM.render).toHaveBeenCalledWith(
      <Router>
        <QueryInsightsDashboardsApp
          core={coreMock}
          depsStart={depsStartMock}
          params={paramsMock}
          dataSourceManagement={dataSourceManagementMock}
        />
      </Router>,
      paramsMock.element
    );

    expect(typeof unmount).toBe('function');
  });

  it('should unmount the component when the returned function is called', () => {
    const unmount = renderApp(coreMock, depsStartMock, paramsMock, dataSourceManagementMock);
    unmount();

    expect(ReactDOM.unmountComponentAtNode).toHaveBeenCalledWith(paramsMock.element);
  });
});
