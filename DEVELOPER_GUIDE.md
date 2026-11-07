# Developer Guide

So you want to contribute code to this project? We're glad you're here. Here's what you need to do.

- [Getting started](#getting-started)
- [Run OpenSearch with the Query Insights backend](#run-opensearch-with-the-query-insights-backend)
- [Run OpenSearch Dashboards](#run-opensearch-dashboards)
- [Build](#build)
- [Test](#test)
- [Lint and format](#lint-and-format)
- [Project structure](#project-structure)
- [Submit changes](#submit-changes)
- [Troubleshooting](#troubleshooting)

## Getting started

This plugin is the OpenSearch Dashboards (OSD) frontend for the OpenSearch [Query Insights plugin](https://github.com/opensearch-project/query-insights). To work on it, you need an OSD source checkout with this repository inside its `plugins/` directory, an OpenSearch cluster on `http://localhost:9200` with the `query-insights` backend plugin, and the OSD dev server on `http://localhost:5601`. The OSD [developer guide](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/DEVELOPER_GUIDE.md) covers the OSD side in more depth.

Use the same branch in every repository, either `main` or the matching `<major>.<minor>` release branch (for example `3.9`). The target version is `opensearchDashboards.version` in [`package.json`](package.json).

### Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | The version in the OSD `.nvmrc` | Use [nvm](https://github.com/nvm-sh/nvm). Older versions break `yarn start` and `yarn lint` (see [Troubleshooting](#yarn-start-or-yarn-lint-fails-with-an-es-module-error)). |
| Yarn | 1.x | Install it after `nvm install`, because nvm keeps global npm packages separately for each Node version. |
| JDK | 21 | Only needed to run the backend from source. Point `JAVA_HOME` at it (on macOS, `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`). |

### Fork and clone

Fork this repository on GitHub. Then clone OpenSearch Dashboards into a parent directory (this guide uses `~/workspace`) and clone your fork into its `plugins/` directory.

```bash
mkdir -p ~/workspace && cd ~/workspace
git clone https://github.com/opensearch-project/OpenSearch-Dashboards.git
cd OpenSearch-Dashboards
git checkout <branch>   # main, or the release branch that matches this repo

git clone https://github.com/<your-github-username>/query-insights-dashboards.git plugins/query-insights-dashboards
cd plugins/query-insights-dashboards
git remote add upstream https://github.com/opensearch-project/query-insights-dashboards.git
git fetch upstream
git checkout -b <branch> upstream/<branch>   # only for a release branch, forks copy only the default branch
```

The plugin must sit directly under `OpenSearch-Dashboards/plugins/`, because its scripts call into the OSD root through `../../`. Name the directory `query-insights-dashboards`, not `queryInsightsDashboards` (the manifest ID), because `test/jest.config.js` ignores every path that contains that string and Jest then finds no tests. The plugin is its own Git repository that OSD ignores, so run Git commands from the plugin directory. Clone the backend repositories from the following sections next to `OpenSearch-Dashboards/`, never inside it.

### Bootstrap

Bootstrap installs the dependencies for OSD and for every plugin under `plugins/`.

```bash
cd ~/workspace/OpenSearch-Dashboards
nvm install            # first time only, installs the .nvmrc version
nvm use
npm install -g yarn@1  # first time only, after nvm install
cd plugins/query-insights-dashboards
yarn osd bootstrap
```

The first bootstrap takes several minutes. Run it again whenever you pull new changes in OSD or in this repository. To start over, run `yarn osd clean` (this deletes `node_modules` across the whole OSD checkout) and bootstrap again.

## Run OpenSearch with the Query Insights backend

Start OpenSearch before you start OSD. Build and run the backend from source in a new terminal and leave it open.

```bash
cd ~/workspace
git clone https://github.com/opensearch-project/query-insights.git
cd query-insights
git checkout <branch>   # same branch as this repo
./gradlew run -Dopensearch.version=<opensearch-dashboards-version>-SNAPSHOT
```

For example, with `opensearchDashboards.version` set to `3.10.0` the flag is `-Dopensearch.version=3.10.0-SNAPSHOT`. It matters when the backend `main` branch has already moved to the next version. The task starts a local cluster with security disabled on `http://localhost:9200`. Check that `curl "http://localhost:9200/_cat/plugins"` lists `query-insights`. Each run starts a fresh cluster, so indexes, persistent cluster settings, and workload groups from the previous run are gone. Add `--preserve-data` to keep them.

On a release branch, you can instead run a released full OpenSearch distribution of the matching version, which already includes the Query Insights and security plugins. It serves HTTPS with demo certificates and needs an admin password that you choose at startup. The demo configuration rejects weak passwords.

```bash
docker run -d -p 127.0.0.1:9200:9200 \
  -e "discovery.type=single-node" \
  -e "OPENSEARCH_INITIAL_ADMIN_PASSWORD=<strong-password>" \
  opensearchproject/opensearch:<opensearch-version>
```

`yarn opensearch snapshot` from the OSD root is not enough, because the minimal distribution it starts does not include `query-insights`.

### Run the backend with security

```bash
./gradlew runWithSecurity -Dopensearch.version=<opensearch-dashboards-version>-SNAPSHOT
```

This task installs the security plugin with its demo users, including `admin` with password `admin`, and keeps HTTP TLS off, so the cluster listens on plain `http://localhost:9200` with basic authentication. These demo users and settings are for local development only.

The `curl` commands in this guide assume an unsecured cluster. With `runWithSecurity`, add `-u admin:admin`. For an HTTPS cluster such as the Docker image, use `https://localhost:9200`, add `-k`, and pass `-u admin:<admin-password>`.

### Add Workload Management

The Workload Management (WLM) pages and the WLM integration in Top N and Live queries need the `workload-management` plugin from the OpenSearch core repository. Build it on the matching branch and copy the zip file into the `plugins/` directory of your `query-insights` checkout. The backend build installs it on the next start.

```bash
cd ~/workspace
git clone https://github.com/opensearch-project/OpenSearch.git
cd OpenSearch
git checkout <branch>
./gradlew :plugins:workload-management:assemble
mkdir -p ../query-insights/plugins
cp plugins/workload-management/build/distributions/workload-management-*.zip ../query-insights/plugins/
```

The zip file name must match the `-Dopensearch.version` value (for example `workload-management-3.10.0-SNAPSHOT.zip`). Renaming the file doesn't help, because the version recorded inside the zip file must also match the cluster. Restart the backend, then turn on WLM mode and create a workload group.

```bash
curl -X PUT "http://localhost:9200/_cluster/settings" \
  -H 'Content-Type: application/json' \
  -d '{"persistent":{"wlm.workload_group.mode":"enabled"}}'

curl -X PUT "http://localhost:9200/_wlm/workload_group" \
  -H 'Content-Type: application/json' \
  -d '{"name":"test_group","resiliency_mode":"soft","resource_limits":{"cpu":0.1,"memory":0.1}}'
```

### Generate data

Top N records only appear after searches run against an index. For faster feedback, shorten the window and raise the Top N size, then index a document and run some searches. The [Top N queries documentation](https://docs.opensearch.org/latest/observing-your-data/query-insights/top-n-queries/) lists the Top N settings.

```bash
curl -X PUT "http://localhost:9200/_cluster/settings" \
  -H 'Content-Type: application/json' \
  -d '{"persistent":{
    "search.insights.top_queries.latency.enabled": true,
    "search.insights.top_queries.latency.window_size": "1m",
    "search.insights.top_queries.latency.top_n_size": 100}}'

curl -X POST "http://localhost:9200/my-index/_doc?refresh=true" \
  -H 'Content-Type: application/json' \
  -d '{"title":"hello world","views":1}'

for i in $(seq 1 20); do
  curl -s -X POST "http://localhost:9200/my-index/_search" \
    -H 'Content-Type: application/json' \
    -d '{"query":{"match":{"title":"hello"}}}' > /dev/null
done

curl "http://localhost:9200/_insights/top_queries?type=latency&pretty"
```

Repeat the settings for `cpu` and `memory`, or change them on the plugin's **Configuration** page. To try the **Query group details** page, also add `"search.insights.top_queries.grouping.group_by": "similarity"` to the settings call (see [Grouping top N queries](https://docs.opensearch.org/latest/observing-your-data/query-insights/grouping-top-n-queries/)). The Top N page loads its data once when it opens, so select **Refresh** or reload the page after you run searches.

The **Live queries** tab refreshes every 30 seconds by default. It shows the searches that are running at that moment and, on OpenSearch 3.7.0 or later, the recently finished ones, so the preceding search loop shows up as completed rows if you run it while the tab is open. See the [Live queries documentation](https://docs.opensearch.org/latest/observing-your-data/query-insights/live-queries/#finished-query-cache) for how long the backend keeps finished searches.

## Run OpenSearch Dashboards

Start the dev server from the OSD root.

```bash
cd ~/workspace/OpenSearch-Dashboards
nvm use
yarn start --no-base-path
```

The first start compiles every bundle and can take several minutes. Wait for the log line that contains `bundles compiled successfully`, then open `http://localhost:5601`.

Always pass `--no-base-path`. Without it, the dev server serves OSD under a random prefix such as `http://localhost:5601/abc/`, and the URLs in this guide and the Cypress `baseUrl` return `404 Not Found`. Add `--no-watch` for Cypress runs so the server doesn't restart in the middle of a test. If the optimizer runs out of memory, run `export NODE_OPTIONS="--max-old-space-size=6144"` before `yarn start`.

### Connect to a secured cluster

OSD connects to `http://localhost:9200` by default. In dev mode it signs in with `kibanaserver`, one of the security plugin's demo users, so it works against `runWithSecurity` without any configuration. For an HTTPS cluster, add these settings to `config/opensearch_dashboards.dev.yml` in the OSD root (dev mode loads that file, and Git ignores it), then restart OSD.

```yaml
opensearch.hosts: ["https://localhost:9200"]
opensearch.ssl.verificationMode: none   # self-signed demo certificates, local only
```

The security dashboards plugin isn't installed in this setup, so the browser shows its own sign-in prompt when you open OSD. Sign in as `admin` (password `admin` for `runWithSecurity`, or the password you chose for an HTTPS cluster). The plugin's API calls run as that user.

### Multiple data sources

To try multiple data sources (MDS), add `data_source.enabled: true` to `config/opensearch_dashboards.dev.yml` and restart OSD. The Query Insights and Workload Management pages then show a data source picker. Remote data sources appear in it only when they meet `supportedOSDataSourceVersions` and `requiredOSDataSourcePlugins` in [`opensearch_dashboards.json`](opensearch_dashboards.json).

### Where to find the pages

| Page | URL |
| --- | --- |
| Top N queries | `http://localhost:5601/app/query-insights-dashboards#/queryInsights` |
| Configuration | `http://localhost:5601/app/query-insights-dashboards#/configuration` |
| Live queries (OpenSearch 3.1.0 or later) | `http://localhost:5601/app/query-insights-dashboards#/LiveQueries` |
| Workload Management | `http://localhost:5601/app/workload-management#/workloadManagement` |
| Query Profiler (Dev Tools tab) | `http://localhost:5601/app/dev_tools#/queryProfiler` |

The **Query details**, **Query group details**, and task detail pages open from rows in the tables. In the left navigation, both apps are listed under **OpenSearch Plugins**, or under **Data administration** > **Performance** when the **Use New Home Page** advanced setting is on.

## Build

```bash
cd ~/workspace/OpenSearch-Dashboards/plugins/query-insights-dashboards
yarn build
```

The output is `build/queryInsightsDashboards-<plugin-version>.zip` (for example `build/queryInsightsDashboards-3.10.0.0.zip`). On every pull request, the [`verify-binary-installation.yml`](.github/workflows/verify-binary-installation.yml) workflow installs it into the minimal OSD distribution, and that file has the exact steps if you need to reproduce the check on Linux x64. The full OSD distribution already bundles this plugin, so run `./bin/opensearch-dashboards-plugin remove queryInsightsDashboards` there before you install your build.

## Test

### Unit tests

Run the Jest unit tests from the plugin directory.

```bash
yarn test:jest                                  # all unit tests
yarn test:jest common/utils/QueryUtils.test.ts  # a single file
yarn test:jest --coverage                       # what CI runs, writes ./coverage
yarn test:jest:update-snapshots <path>          # rewrite snapshots after an intentional change
```

Tests sit next to the code as `*.test.ts` or `*.test.tsx` and use [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/). Shared fixtures are in `test/mocks/`, and global setup is in `test/setup.jest.ts`. Most page tests mock `public/utils/version-utils.ts` with an inline `jest.mock(...)` factory. If a page starts calling a new version helper, add it to that page test's factory, and to `public/utils/__mocks__/version-utils.ts` if `TopNQueries` renders the page.

### End-to-end tests with Cypress

The specs in `cypress/e2e/` run against a real OSD dev server and a real cluster.

1. Start the backend that the suite needs (see the following table).
2. From the OSD root, run `yarn start --no-base-path --no-watch` and wait for `bundles compiled successfully`.
3. Run Cypress from the plugin directory.

```bash
npx cypress install                                         # first time only
yarn cypress open                                           # interactive runner
yarn cypress run --spec cypress/e2e/qi/1_top_queries.cy.js  # one spec, headless
```

| Spec folder | Backend it needs | CI workflow |
| --- | --- | --- |
| `cypress/e2e/qi` specs 1 to 6 | `./gradlew run` (CI also installs WLM and enables WLM mode) | [`cypress-tests.yml`](.github/workflows/cypress-tests.yml) |
| `cypress/e2e/qi/8_user_info_security.cy.js` | A security-enabled cluster on OpenSearch 3.6 or later | [`cypress-tests-user-info.yml`](.github/workflows/cypress-tests-user-info.yml) |
| `cypress/e2e/wlm` | Security plus WLM | [`cypress-tests-wlm.yml`](.github/workflows/cypress-tests-wlm.yml) |
| `cypress/e2e/wlm-no-security` | WLM without security | [`cypress-tests-wlm-no-security.yml`](.github/workflows/cypress-tests-wlm-no-security.yml) |
| `cypress/e2e/qi-wlm-interaction` | WLM without security | [`cypress-tests-qi-wlm-interaction.yml`](.github/workflows/cypress-tests-qi-wlm-interaction.yml) |

Each workflow file is the exact recipe for its backend, including the workload groups and data it creates. For a secured cluster, set `CYPRESS_SECURITY_ENABLED=true`, and for HTTPS also set `CYPRESS_openSearchUrl=https://localhost:9200` and `CYPRESS_OPENSEARCH_INITIAL_ADMIN_PASSWORD`. The specs change cluster state, including turning Top N collection off when they finish, so run them against a throwaway cluster (see [The Top N queries table is empty](#the-top-n-queries-table-is-empty)).

The release integration tests run adapted copies of the `cypress/e2e/qi` specs that live in [opensearch-dashboards-functional-test](https://github.com/opensearch-project/opensearch-dashboards-functional-test) under `cypress/integration/plugins/query-insights-dashboards/`. When you change one of these specs, or UI behavior that they assert, open a matching pull request there.

## Lint and format

Linting uses the OSD ESLint setup through [`eslint.config.js`](eslint.config.js), with Prettier running as an ESLint rule. It needs the Node version from `.nvmrc`.

```bash
yarn lint                                # lint the whole plugin
node ../../scripts/eslint --fix <files>  # lint and fix the files you changed
```

This repository installs no Git hooks, and the OSD root `precommit_hook.js` does not check plugin files, so lint your files before you commit. Avoid `yarn lint --fix`, because it applies fixes across the whole tree and can change files you didn't touch.

### License headers

Every source file, including `.js`, `.ts`, `.tsx`, and `.scss` files, must start with this header.

```js
/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
```

`node ../../scripts/eslint --fix` adds it to JavaScript and TypeScript files. Add it to `.scss` and `.d.ts` files by hand. CI also checks headers with [`license-header-checker.yml`](.github/workflows/license-header-checker.yml) and the rules in [`.licenserc.json`](.licenserc.json). To run that check locally, delete `.eslintcache`, `coverage/`, and IDE folders (it scans untracked files too), then run `npx @kt3k/license-checker@3.2.2` from the plugin directory.

## Project structure

- `common/` holds code shared by the browser and the server, such as constants and the API endpoint map.
- `public/` is the browser plugin. `plugin.ts` registers the apps, and each page lives in `public/pages/` (for example `InflightQueries/` is the Live queries tab).
- `server/` is the OSD server plugin. Routes under `/api/` are in `server/routes/`, and the client actions that call OpenSearch are in `server/clusters/`.
- `test/` and `cypress/` hold the unit and end-to-end test setup.

The plugin registers two apps. The manifest ID is `queryInsightsDashboards`, the Query Insights app ID (and URL segment) is `query-insights-dashboards`, and the Workload Management app is served at `/app/workload-management`.

A page calls an OSD route under `/api/` with `core.http`. The route handler calls a client action, which calls the OpenSearch REST API (for example `GET /_insights/top_queries`) on the local cluster as the current user, or on a remote cluster when the request carries a `dataSourceId`. To add a backend call, add the client action and the route, handle both cases, use `snake_case` for new paths and parameters, and add tests for the route (see `server/routes/index.test.ts`) and the page.

The UI supports clusters back to OpenSearch 2.19.0 and hides newer features on older clusters. Gate new features with the helpers in `public/utils/version-utils.ts` and `public/utils/datasource-utils.ts`.

## Submit changes

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full process. Every commit needs a Developer Certificate of Origin sign-off, so commit with `git commit -s`. Pull requests run the unit tests, lint, the license check, the build and install check, and the Cypress suites in [`.github/workflows/`](.github/workflows). Release notes in `release-notes/` are generated at release time, so there is no changelog to edit.

### Backports

A maintainer adds the label `backport <branch>` (for example `backport 3.9`) to the pull request on `main`, so ask in the pull request if your change needs a backport. After a squash merge, the [`backport.yml`](.github/workflows/backport.yml) workflow opens a `[Backport <branch>]` pull request. If the cherry-pick fails, follow the manual steps in [RELEASING.md](RELEASING.md#backporting) and sign off with `git cherry-pick <commit-id> -s`.

## Troubleshooting

### `yarn start` or `yarn lint` fails with an ES module error

`yarn start` fails with `Error [ERR_REQUIRE_ESM]`, or `yarn lint` reports `require() of ES Module ... not supported`. Your Node version is older than the one in the OSD `.nvmrc`. Run `nvm use` in the OSD root (run `nvm install` first if needed) and try again. Jest works on some older Node versions, so passing unit tests don't prove that your Node version is right.

### OSD logs a plugin version mismatch

The log reads `Plugin "queryInsightsDashboards" is version "<x>", but used OpenSearch Dashboards version is "<y>"`. Your OSD checkout is on a different branch or an older commit. Check out and pull the matching OSD branch, then bootstrap again.

### Gradle fails to start the backend

Check that `java -version` (or `JAVA_HOME`) points at JDK 21. If `runWithSecurity` fails while it installs `opensearch-security` after you switch branches or change `-Dopensearch.version`, delete `bin/opensearch-security-snapshot.zip` in your `query-insights` checkout and run it again. The task reuses that file instead of downloading the matching version.

### OSD cannot connect to OpenSearch, or API calls fail with 401

Check that OpenSearch responds (`curl http://localhost:9200`, or `curl -k -u admin:<admin-password> https://localhost:9200` for the Docker image) and that `opensearch.hosts` uses the right scheme (`http` for `runWithSecurity`, `https` for the Docker image). The plugin's API calls use the credentials from the browser sign-in prompt. If you dismissed the prompt, reload the page. To sign in as a different user, open a private window, because browsers keep basic authentication credentials for the whole session.

### The Top N queries table is empty

- The page loaded before your searches ran. Select **Refresh** or reload the page.
- The selected time range (the last hour by default) doesn't include your searches.
- Top N collection is turned off. The Cypress specs turn it off when they finish, and some also set `search.insights.top_queries.exporter.type` to `none`, which hides older records. Turn collection back on and set the exporter back to local index on the **Configuration** page, or restart the backend without `--preserve-data`.

### The Live queries tab is missing

The tab only appears when the cluster runs OpenSearch 3.1.0 or later and OSD can read its version. Check in the browser network tab that `GET /api/cluster/version` succeeds. If it returns 401, sign in again and reload the page.

### Workload Management pages show errors or no workload groups

Check that `curl http://localhost:9200/_cat/plugins` lists `workload-management`. If it doesn't, the zip file in `query-insights/plugins/` is missing or its name doesn't match `-Dopensearch.version` (look for `WLM plugin not found` in the Gradle output). If the backend fails to start after it picks up the zip file, the zip was built from an OpenSearch checkout on a different version, so rebuild it from a checkout on the cluster's version. Also check that WLM mode is enabled and that a workload group exists, because each backend restart resets both unless you use `--preserve-data`.
