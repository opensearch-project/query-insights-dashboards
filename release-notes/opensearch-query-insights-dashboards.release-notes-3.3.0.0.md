## Version 3.3.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.3.0

### Features
* Enhance User Experience with Bi-Directional Navigation Between WLM and Live Queries ([#299](https://github.com/opensearch-project/query-insights-dashboards/pull/299))
* Add navigation for query insights and WLM dashboards ([#330](https://github.com/opensearch-project/query-insights-dashboards/pull/330))
* Add feature flag for wlm ([#348](https://github.com/opensearch-project/query-insights-dashboards/pull/348))
* MDS support for WLM ([#352](https://github.com/opensearch-project/query-insights-dashboards/pull/352))

### Enhancements
* Added version decoupling for wlm dashboard ([#361](https://github.com/opensearch-project/query-insights-dashboards/pull/361))
* Version decouple unit test ([#363](https://github.com/opensearch-project/query-insights-dashboards/pull/363))

### Bug Fixes
* Bug fix for filter and date picker [2.19] ([#338](https://github.com/opensearch-project/query-insights-dashboards/pull/338))
* Group by selector on Configuration page always shows "None" after refresh ([#366](https://github.com/opensearch-project/query-insights-dashboards/pull/366))
* Explicitly match query by id and fix q scope in retrieveQueryById ([#367](https://github.com/opensearch-project/query-insights-dashboards/pull/367))

### Infrastructure
* Enable wlm mode in pipeline ([#336](https://github.com/opensearch-project/query-insights-dashboards/pull/336))
* Cypress-workflow-fix ([#329](https://github.com/opensearch-project/query-insights-dashboards/pull/329))
* Revert "cypress-workflow-fix (#329)" ([#335](https://github.com/opensearch-project/query-insights-dashboards/pull/335))
* Update delete-backport-branch workflow to include release-chores branches ([#327](https://github.com/opensearch-project/query-insights-dashboards/pull/327))

### Maintenance
* Increment version to 3.3.0.0 ([#332](https://github.com/opensearch-project/query-insights-dashboards/pull/332))
* Update dependency pbkdf2 to v3.1.4 ([#375](https://github.com/opensearch-project/query-insights-dashboards/pull/375))
* Update dependency pbkdf2 to v3.1.5 ([#378](https://github.com/opensearch-project/query-insights-dashboards/pull/378))
* Fix form-data CVE-2025-7783 ([#380](https://github.com/opensearch-project/query-insights-dashboards/pull/380))