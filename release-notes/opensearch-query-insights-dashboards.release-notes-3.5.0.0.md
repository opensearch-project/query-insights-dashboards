## Version 3.5.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.5.0

### Features

* [Feature] Handle source as both string and json object ([#357](https://github.com/opensearch-project/query-insights-dashboards/pull/357))
* [Feature] TopNQueries - WLM Intergation ([#432](https://github.com/opensearch-project/query-insights-dashboards/pull/432))

### Bug Fixes

* Fix CVE-2025-57352 ([#448](https://github.com/opensearch-project/query-insights-dashboards/pull/448))
* CVE-2025-64718 ([#452](https://github.com/opensearch-project/query-insights-dashboards/pull/452))
* Resolves version mismatch between plugin (^5.6.0) and OpenSearch-Dashboards core (^6.0.0) ([#443](https://github.com/opensearch-project/query-insights-dashboards/pull/443))

### Infrastructure

* Fix security plugin version mismatch in Cypress WLM Workflow ([#444](https://github.com/opensearch-project/query-insights-dashboards/pull/444))
* More reliable check on dashboards readiness in cypress test pipelines ([#451](https://github.com/opensearch-project/query-insights-dashboards/pull/451))