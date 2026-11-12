## Version 3.10.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.10.0

### Features

* Add Username, User Roles, Backend Roles, and Application ID columns to Query Insights UI ([#513](https://github.com/opensearch-project/query-insights-dashboards/pull/513))
* Make Live queries table columns sortable with default sort by time elapsed descending ([#614](https://github.com/opensearch-project/query-insights-dashboards/pull/614))

### Bug Fixes

* Fix race condition where stale data source capability results could update the UI after switching data sources ([#598](https://github.com/opensearch-project/query-insights-dashboards/pull/598))
* Fix broken "Learn more" link on the Create workload group page by removing duplicated path segment ([#599](https://github.com/opensearch-project/query-insights-dashboards/pull/599))

### Infrastructure

* Prevent Cypress readiness checks from hanging by adding connection and response timeouts to startup probes ([#581](https://github.com/opensearch-project/query-insights-dashboards/pull/581))

### Documentation

* Add developer guide covering setup, building, running, testing, and troubleshooting the plugin ([#611](https://github.com/opensearch-project/query-insights-dashboards/pull/611))

### Maintenance

* Update brace-expansion dependency from 1.1.18 to 1.1.21 to address reported CVEs ([#604](https://github.com/opensearch-project/query-insights-dashboards/pull/604))
