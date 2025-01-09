const { defineConfig } = require('cypress')

module.exports = defineConfig({
  video: false,
  screenshotOnRunFailure: false,
  defaultCommandTimeout: 60000,
  requestTimeout: 600000,
  responseTimeout: 600000,
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
      return require('./cypress/plugins/index.js')(on, config)
    },
    baseUrl: 'http://localhost:5601',
  },
})
