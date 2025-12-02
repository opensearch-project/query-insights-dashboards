/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
  rootDir: '../',
  setupFiles: ['<rootDir>/test/setupTests.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.jest.ts'],
  roots: ['<rootDir>'],
  coverageDirectory: './coverage',
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/test/mocks/styleMock.ts',
    '^ui/(.*)': '<rootDir>/../../src/legacy/ui/public/$1/',
    '^vega-embed$': '<rootDir>/test/mocks/vega-embed.ts',
    '^monaco-editor/esm/vs/editor/editor.api$': '<rootDir>/test/mocks/monaco-editor.ts',
    '^monaco-editor$': '<rootDir>/test/mocks/monaco-editor.ts',
    '^@osd/monaco$': '<rootDir>/test/mocks/monaco-editor.ts',
  },
  transformIgnorePatterns: ['node_modules/(?!(monaco-editor)/)'],
  coverageReporters: ['lcov', 'text', 'cobertura'],
  testMatch: ['**/*.test.js', '**/*.test.jsx', '**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
    '!**/models/**',
    '!**/node_modules/**',
    '!**/index.ts',
    '!<rootDir>/index.js',
    '!<rootDir>/public/app.js',
    '!<rootDir>/public/temporary/**',
    '!<rootDir>/babel.config.js',
    '!<rootDir>/test/**',
    '!<rootDir>/server/**',
    '!<rootDir>/coverage/**',
    '!<rootDir>/scripts/**',
    '!<rootDir>/build/**',
    '!<rootDir>/cypress/**',
    '!**/vendor/**',
  ],
  clearMocks: true,
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
  modulePathIgnorePatterns: ['queryInsightsDashboards'],
  testEnvironment: 'jsdom',
  snapshotSerializers: ['enzyme-to-json/serializer'],
};
