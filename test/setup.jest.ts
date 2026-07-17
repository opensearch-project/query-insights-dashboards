/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-ignore
window.Worker = function () {
  this.postMessage = () => {};
  // @ts-ignore
  this.terminate = () => {};
};

// Preserve the real URL constructor (needed by jest-location-mock's relative-URL
// resolution) while stubbing the object-URL methods jsdom does not implement.
window.URL.createObjectURL = () => '';
window.URL.revokeObjectURL = (_url: string) => {};

// jest-location-mock uses process.env.HOST as the base URL for its window.location mock.
// Set it to match testEnvironmentOptions.url so window.location.origin is 'http://localhost:5601'.
process.env.HOST = 'http://localhost:5601';

// Mock matchMedia for Monaco editor
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

jest.mock('@elastic/eui/lib/components/form/form_row/make_id', () => () => 'random_id');

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => {
    return () => 'random_html_id';
  },
}));

jest.mock('plotly.js-dist', () => ({ Plotly: {} }));

jest.mock('react-ace', () => () => null);

jest.mock('echarts-for-react', () => () => null);

jest.mock('react-vis', () => ({
  RadialChart: () => null,
}));

// jsdom 26 marks window.localStorage and window.sessionStorage as non-configurable.
// Re-declare them as configurable once here so individual tests can override them
// with Object.defineProperty without hitting "Cannot redefine property" errors.
['localStorage', 'sessionStorage'].forEach((key) => {
  const descriptor = Object.getOwnPropertyDescriptor(window, key);
  if (descriptor && !descriptor.configurable) {
    Object.defineProperty(window, key, {
      configurable: true,
      writable: true,
      value: descriptor.value,
    });
  }
});

jest.setTimeout(10000); // in milliseconds
