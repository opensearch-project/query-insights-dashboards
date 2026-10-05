## Version 3.9.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.9.0

### Features

* Add toggle to hide remote repository registration in the configuration page ([#576](https://github.com/opensearch-project/query-insights-dashboards/pull/576))

### Enhancements

* Disable username and role inputs in WLM rule forms when the Security plugin is unavailable ([#533](https://github.com/opensearch-project/query-insights-dashboards/pull/533))

### Bug Fixes

* Fix Top N Cypress sort assertions that always passed due to incorrect column extraction ([#589](https://github.com/opensearch-project/query-insights-dashboards/pull/589))

### Infrastructure

* Bump code coverage action to V7 ([#591](https://github.com/opensearch-project/query-insights-dashboards/pull/591))
* Fix OpenSearch-Dashboards branch resolution for push events in CI ([#592](https://github.com/opensearch-project/query-insights-dashboards/pull/592))
* Shorten GitHub Actions check names for readability ([#583](https://github.com/opensearch-project/query-insights-dashboards/pull/583))

### Maintenance

* Update brace-expansion to 1.1.18 to address CVE-2026-14257 and CVE-2026-69152 ([#582](https://github.com/opensearch-project/query-insights-dashboards/pull/582))
* Update qs to 6.16.0 and browserslist to 4.28.9 to address CVEs ([#590](https://github.com/opensearch-project/query-insights-dashboards/pull/590))
* Clean up dependency resolutions and align with OpenSearch Dashboards 3.8, addressing CVEs ([#578](https://github.com/opensearch-project/query-insights-dashboards/pull/578))
