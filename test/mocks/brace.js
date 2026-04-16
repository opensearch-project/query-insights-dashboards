/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const mockEditor = {
  setTheme: jest.fn(),
  session: {
    setMode: jest.fn(),
    setUseWrapMode: jest.fn(),
    setUseWorker: jest.fn(),
  },
  setValue: jest.fn(),
  setOptions: jest.fn(),
  setReadOnly: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
  setFontSize: jest.fn(),
  getValue: jest.fn(() => ''),
};

const ace = {
  edit: jest.fn(() => mockEditor),
  acequire: jest.fn(() => ({ Range: jest.fn() })),
  require: jest.fn(() => ({ Range: jest.fn() })),
  Range: jest.fn(),
};

Object.defineProperty(exports, '__esModule', { value: true });
exports.default = ace;
