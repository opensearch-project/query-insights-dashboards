## Version 3.8.0 Release Notes

Compatible with OpenSearch and OpenSearch Dashboards version 3.8.0

### Features

* Add dynamic column visibility system allowing users to show/hide columns in Top N Queries and Live Queries tables via a popover UI with localStorage persistence ([#569](https://github.com/opensearch-project/query-insights-dashboards/pull/569))

### Enhancements

* Onboard code diff analyzer/reviewer and issue dedupe workflows ([#548](https://github.com/opensearch-project/query-insights-dashboards/pull/548))
* Onboard new backport-pr reusable GitHub workflow ([#545](https://github.com/opensearch-project/query-insights-dashboards/pull/545))

### Bug Fixes

* Fix flaky top_queries Timestamp-sort Cypress test by reloading until data populates ([#573](https://github.com/opensearch-project/query-insights-dashboards/pull/573))
* Fix main CI failures by bumping @babel/runtime to ^7.29.7 and removing unpinnable composite action from binary-install workflow ([#549](https://github.com/opensearch-project/query-insights-dashboards/pull/549))

### Infrastructure

* Adopt ESLint 10 with flat config format, replacing legacy .eslintrc.js configuration ([#566](https://github.com/opensearch-project/query-insights-dashboards/pull/566))
* Pin get-ci-image-tag reusable workflow to a SHA with pinned nested actions to satisfy org SHA-pin policy ([#555](https://github.com/opensearch-project/query-insights-dashboards/pull/555))
* Replace start-opensearch composite action in WLM security Cypress workflow to satisfy SHA-pin policy ([#556](https://github.com/opensearch-project/query-insights-dashboards/pull/556))
* Use official opensearch-build start-opensearch action for OpenSearch startup in CI ([#559](https://github.com/opensearch-project/query-insights-dashboards/pull/559))
* Update opensearch-build workflow references from commit SHA to main branch ([#539](https://github.com/opensearch-project/query-insights-dashboards/pull/539))
* Migrate Jest test suite to Jest 30 and jsdom 26 ([#571](https://github.com/opensearch-project/query-insights-dashboards/pull/571))

### Maintenance

* Bump form-data to 4.0.6 to address CVE-2026-12143 ([#550](https://github.com/opensearch-project/query-insights-dashboards/pull/550))
* Bump js-yaml to 4.3.0 to address CVE-2026-59869 ([#574](https://github.com/opensearch-project/query-insights-dashboards/pull/574))
* Bump js-yaml to 4.2.0 and qs to 6.15.2 to address CVE-2026-53550 and CVE-2026-8723 ([#564](https://github.com/opensearch-project/query-insights-dashboards/pull/564))
* Bump tmp to 0.2.7 and ws to 7.5.11 to address CVE-2026-44705 and CVE-2026-48779 ([#560](https://github.com/opensearch-project/query-insights-dashboards/pull/560))
* Update dependency echarts to v6.1.0 to address CVE-2026-45249 ([#532](https://github.com/opensearch-project/query-insights-dashboards/pull/532))
