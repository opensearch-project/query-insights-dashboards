/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderApp } from './application';
import { coreMock } from '../../../src/core/public/mocks';

const mockUnmount = jest.fn();
const mockRender = jest.fn();

jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: mockRender,
    unmount: mockUnmount,
  })),
}));

describe('renderApp', () => {
  const coreMockStart = coreMock.createStart();
  const depsStartMock = {};
  const paramsMock = { element: document.createElement('div') };
  const dataSourceManagementMock = {};

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should unmount the component when the returned function is called', () => {
    const unmount = renderApp(coreMockStart, depsStartMock, paramsMock, dataSourceManagementMock);
    unmount();

    expect(mockUnmount).toHaveBeenCalled();
  });
});
