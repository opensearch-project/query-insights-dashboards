/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as ReactDOM from 'react-dom';
import { mountQueryInsightsDashboards } from './application';
import { coreMock } from '../../../src/core/public/mocks';

jest.mock('react-dom', () => {
  const actualReactDOM = jest.requireActual('react-dom');
  return {
    ...actualReactDOM,
    render: jest.fn(),
    unmountComponentAtNode: jest.fn(),
  };
});

describe('mountQueryInsightsDashboards', () => {
  const coreMockStart = coreMock.createStart();
  const depsStartMock = {};
  const paramsMock = { element: document.createElement('div') };
  const dataSourceManagementMock = {};

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should unmount the component when the returned function is called', () => {
    const unmount = mountQueryInsightsDashboards(
      coreMockStart,
      depsStartMock,
      paramsMock,
      dataSourceManagementMock
    );
    unmount();

    expect(ReactDOM.unmountComponentAtNode).toHaveBeenCalledWith(paramsMock.element);
  });
});
