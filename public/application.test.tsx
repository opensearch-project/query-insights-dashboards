/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as ReactDOM from 'react-dom';
import { renderApp } from './application';

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

  it('should unmount the component when the returned function is called', () => {
    const unmount = renderApp(coreMock, depsStartMock, paramsMock, dataSourceManagementMock);
    unmount();

    expect(ReactDOM.unmountComponentAtNode).toHaveBeenCalledWith(paramsMock.element);
  });
});
