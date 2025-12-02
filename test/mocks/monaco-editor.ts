/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const editor = {
  create: jest.fn(),
  createModel: jest.fn(),
};

export const languages = {
  register: jest.fn(),
  setMonarchTokensProvider: jest.fn(),
  setLanguageConfiguration: jest.fn(),
  registerCompletionItemProvider: jest.fn(),
  onLanguage: jest.fn(),
};

export const monaco = {
  editor,
  languages,
};
