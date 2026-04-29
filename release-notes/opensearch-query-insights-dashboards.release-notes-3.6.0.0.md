## Version 3.6.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.6.0

### Features

* Add visualizations to Top N Queries page including P90/P99 stats, queries by node/index/user/WLM group pie charts, and performance analysis line charts ([#473](https://github.com/opensearch-project/query-insights-dashboards/pull/473))
* Add heatmap visualization, interactive pie charts, collapsible sections, and sorting/pagination to Top N Queries page ([#486](https://github.com/opensearch-project/query-insights-dashboards/pull/486))

### Enhancements

* Switch latency graphs from Plotly to React ECharts for consistency ([#487](https://github.com/opensearch-project/query-insights-dashboards/pull/487))

### Bug Fixes

* Fix CVE-2026-26996 (minimatch ReDoS), CVE-2025-13465 (lodash prototype pollution), and CVE-2025-15284 (qs arrayLimit bypass DoS) via yarn resolutions ([#489](https://github.com/opensearch-project/query-insights-dashboards/pull/489))
* Bump serialize-javascript to 7.0.3 to address GHSA-5c6j-r48x-rmvq ([#491](https://github.com/opensearch-project/query-insights-dashboards/pull/491))
* Update lodash to 4.18.1 to address CVE-2026-4800 ([#496](https://github.com/opensearch-project/query-insights-dashboards/pull/496))

### Infrastructure

* Remove flaky verbose=false API schema test from Cypress that was failing due to timing sensitivity ([#480](https://github.com/opensearch-project/query-insights-dashboards/pull/480))
* Use poll-based check in Cypress beforeEach for improved test reliability ([#482](https://github.com/opensearch-project/query-insights-dashboards/pull/482))
* Pin Gradle wrapper version in Cypress workflows to prevent Gradle 9.x download and fix related CI issues ([#484](https://github.com/opensearch-project/query-insights-dashboards/pull/484))
