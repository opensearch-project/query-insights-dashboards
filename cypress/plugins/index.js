/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="cypress" />

/**
 * @type {Cypress.PluginConfig}
 */
const fs = require('fs');

module.exports = (on, config) => {
  on('task', {
    deleteFile(filePath) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error(e);
      }
      return null;
    },
  });
  return config;
};
