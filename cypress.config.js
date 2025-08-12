const { defineConfig } = require('cypress')

module.exports = defineConfig({
  video: false,
  screenshotOnRunFailure: false,
  defaultCommandTimeout: 60000,
  requestTimeout: 600000,
  responseTimeout: 600000,
  pageLoadTimeout: 120000,
  // Increase timeouts for CI environments
  taskTimeout: 120000,
  execTimeout: 120000,
  // Retry configuration for flaky tests
  retries: {
    runMode: 2,
    openMode: 0
  },
  env: {
    openSearchUrl: 'http://localhost:9200',
    SECURITY_ENABLED: false,
    username: 'admin',
    password: 'admin',
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      // Increase timeouts for CI environments
      if (config.isInteractive === false) {
        config.defaultCommandTimeout = 90000;
        config.requestTimeout = 90000;
        config.responseTimeout = 90000;
        config.pageLoadTimeout = 180000;
      }
      return require('./cypress/plugins/index.js')(on, config)
    },
    baseUrl: 'http://localhost:5601',
    // Slow down tests slightly to reduce race conditions
    slowTestThreshold: 30000,
  },
})
