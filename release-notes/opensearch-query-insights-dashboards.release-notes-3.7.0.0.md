## Version 3.7.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.7.0

### Features

* Add Query Profiler tool to Dev Tools with visualization components for analyzing and visualizing query performance ([#475](https://github.com/opensearch-project/query-insights-dashboards/pull/475))
* Add Query Profiler tool integrated as a Dev Tools tab with split-pane editor for executing and viewing profiling output ([#472](https://github.com/opensearch-project/query-insights-dashboards/pull/472))
* Add remote S3 repository exporter to the configuration page for exporting query insights data ([#512](https://github.com/opensearch-project/query-insights-dashboards/pull/512))
* Add dynamic search bar with expression-based filtering to the Top N Queries page ([#510](https://github.com/opensearch-project/query-insights-dashboards/pull/510))
* Add task detail page with navigation from live queries ([#504](https://github.com/opensearch-project/query-insights-dashboards/pull/504))

### Bug Fixes

* Fix filter bar not filling screen width when zooming in and out ([#493](https://github.com/opensearch-project/query-insights-dashboards/pull/493))
* Fix catch block variable references in index.ts where actively used error variables were incorrectly prefixed with underscore ([#515](https://github.com/opensearch-project/query-insights-dashboards/pull/515))

### Infrastructure

* Add issues write permission to untriaged label workflow to fix 403 error when applying labels ([#521](https://github.com/opensearch-project/query-insights-dashboards/pull/521))
* Pin GitHub Actions to commit SHAs to prevent supply chain attacks from mutable tag references ([#524](https://github.com/opensearch-project/query-insights-dashboards/pull/524))

### Maintenance

* Bump yaml to ^2.8.3 and serialize-javascript to 7.0.5 to address CVE-2026-33532 and CVE-2026-34043 ([#522](https://github.com/opensearch-project/query-insights-dashboards/pull/522))
* Remove caret range for echarts-for-react to prevent risk from compromised packages ([#519](https://github.com/opensearch-project/query-insights-dashboards/pull/519))
* Migrate plugin to TypeScript 6.0.2 compatibility by removing conflicting dependencies and regenerating yarn.lock ([#508](https://github.com/opensearch-project/query-insights-dashboards/pull/508))
* Prefix unused caught error variables with underscore to satisfy lint rules ([#509](https://github.com/opensearch-project/query-insights-dashboards/pull/509))
