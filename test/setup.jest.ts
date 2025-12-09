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

// @ts-ignore
window.URL = {
  createObjectURL: () => {
    return '';
  },
};

// Mock matchMedia for Monaco editor
Object.defineProperty(window, 'matchMedia', {
  writable: true,
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

jest.setTimeout(10000); // in milliseconds
