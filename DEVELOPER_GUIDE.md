<p align="center"><img src="https://opensearch.org/assets/brand/SVG/Logo/opensearch_dashboards_logo_darkmode.svg" height="64px"/></p>
<h1 align="center">Query Insights Dashboards Plugin — Developer Guide</h1>

This guide helps developers understand, build, and contribute to the **Query Insights Dashboards plugin**, which integrates with OpenSearch Dashboards to provide visibility into query behavior.

> 📄 To view this plugin's documentation and related resources, visit the [OpenSearch Dashboards documentation](https://opensearch.org/docs/latest/dashboards/).

##  Getting Started Guide

This guide is for developers who want to contribute to the **Query Insights Dashboards Plugin** and run it within the OpenSearch Dashboards platform.

> If you're only interested in installing and running OpenSearch Dashboards, refer to the [Installing OpenSearch Dashboards](https://opensearch.org/docs/latest/install-and-configure/install-dashboards) guide.

If you plan to contribute features or fixes to this plugin, make sure to also read the [Contributing Guide](CONTRIBUTING.md).

### Key Technologies

This plugin is a **React-based extension** of OpenSearch Dashboards, and primarily uses:

- **Node.js** — runtime environment
- **React + TypeScript** — for UI components
- **VegaLite** — for chart rendering
- **EUI (Elastic UI)** — for layout and visual elements
- **Jest / Cypress** — for testing

You should be comfortable with:
- HTML and CSS/SASS
- TypeScript
- React (components, props, hooks)
- Git and GitHub workflows

## 🔧 Prerequisites

To develop the **Query Insights Dashboards Plugin**, you’ll need:

- A [GitHub account](https://docs.github.com/en/get-started/onboarding/getting-started-with-your-github-account)
- [`git`](https://git-scm.com/) for version control
- [`Node.js`](https://nodejs.org/), [`npm`](https://www.npmjs.com/), and [`yarn`](https://yarnpkg.com/) for building and running OpenSearch Dashboards
- A code editor like [Visual Studio Code](https://code.visualstudio.com/) configured for JavaScript/TypeScript development


### Install `git`

Check if Git is installed:

```bash
git --version
```
#### Install `git`

If you don't already have it installed (check with `git --version`) we recommend following the [the `git` installation guide for your OS](https://git-scm.com/downloads).

#### Install `node`

We recommend using [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm) to install and manage different node versions, which may differ between release branches.

1. Install nvm (as specified by the [`nvm` README](https://github.com/nvm-sh/nvm#installing-and-updating)): `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash`
2. Install the version of the Node.js runtime defined in [`.nvmrc`](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/.nvmrc): `nvm install`

If it's the only version of node installed, it will automatically be set to the `default` alias. Otherwise, use `nvm list` to see all installed `node` versions, and `nvm use` to select the node version required by OpenSearch Dashboards.

## Fork and Clone Repositories

You will be working with two repositories:

1. **OpenSearch Dashboards** — the core platform where the plugin runs.
2. **Query Insights Dashboards Plugin** — the plugin you are developing.

---

### Step 1: Fork the Repositories

Fork both of the following repositories to your own GitHub account:

- [OpenSearch Dashboards](https://github.com/opensearch-project/OpenSearch-Dashboards)
- [Query Insights Dashboards Plugin](https://github.com/opensearch-project/query-insights-dashboards)


### Step 2: Clone OpenSearch Dashboards

Clone your fork of **OpenSearch Dashboards** to your local machine:

```bash
git clone https://github.com/<your-username>/OpenSearch-Dashboards.git
cd OpenSearch-Dashboards
```


### Step 3: Clone the Plugin into the plugins/ Directory
Inside the OpenSearch-Dashboards directory:

```
cd plugins
git clone https://github.com/<your-username>/query-insights-dashboards.git
cd ..
```

### File Structure

The file structure should be this

```
OpenSearch-Dashboards/
├── plugins/
    └── query-insights-dashboards/
```



##  Bootstrap OpenSearch Dashboards with the Query Insights Plugin

After cloning both the OpenSearch Dashboards repository and placing the Query Insights plugin inside the `plugins/` folder, you need to bootstrap the environment. This installs all dependencies and registers the plugin with OpenSearch Dashboards.

---

### Step 1: Install Dependencies and Build

From the root of your `OpenSearch-Dashboards\plugins` directory, run:

```bash
cd..
yarn osd bootstrap
```

If you've previously bootstrapped the project and need to start fresh, first run:

```bash
$ yarn osd clean
```

##  Fork and Run Query Insights Plugin (Backend)

The Query Insights Dashboards Plugin works in tandem with the backend Query Insights plugin. You must have the backend plugin installed and running within an OpenSearch cluster.



### Step 1: Fork and Clone Query Insights Backend Plugin

1. Fork the repository:  
   [https://github.com/opensearch-project/query-insights](https://github.com/opensearch-project/query-insights)

2. Clone your fork locally:

```bash
git clone https://github.com/<your-username>/query-insights.git
cd query-insights
```

### Step 2: Run OpenSearch with the Plugin
Use the included Gradle task to start a local OpenSearch cluster with the plugin auto-installed:

```
bash
./gradlew run
```

 By default, the cluster runs at: http://localhost:9200

Step 3: Verify Plugin Installation
Check that the plugin is installed:

```
curl http://localhost:9200/_cat/plugins?v
```

You should see query-insights in the list.




### Run OpenSearch Dashboards

_**Warning:** Starting the OpenSearch Dashboards instance before the OpenSearch server is fully initialized can cause Dashboards to misbehave. Ensure that the OpenSearch server instance is up and running first. You can validate by running `curl localhost:9200` in another console tab or window (see [OpenSearch developer guide](https://github.com/opensearch-project/OpenSearch/blob/main/DEVELOPER_GUIDE.md#run-opensearch))._

Start the OpenSearch Dashboards development server:

```bash
$ yarn start
```

When the server is up and ready (the console messages will look something like this),

```
[info][listening] Server running at http://localhost:5603/pgt
[info][server][OpenSearchDashboards][http] http server running at http://localhost:5603/pgt
```

click on the link displayed in your terminal to
access it.

Note - it may take a couple minutes to generate all the necessary bundles. If the Dashboards link is not yet accessible, wait for a log message like

```
[success][@osd/optimizer] 28 bundles compiled successfully after 145.9 sec, watching for changes
```

Note: If you run a docker image, an error may occur:

```
Error: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]
```

This error is because there is not enough memory so more memory must be allowed to be used:

```
$ sudo sysctl -w vm.max_map_count=262144
```

For windows:

```
$ wsl -d docker-desktop
$ sysctl -w vm.max_map_count=262144
```

##  Development Checklist

Before submitting a pull request, please ensure the following tasks are completed:

### Lint your code

Run the linter to maintain code style consistency:

```bash
yarn lint
```

To auto-fix simple issues:

```bash
yarn lint --fix
```

###  Run tests

Ensure your code changes do not break existing functionality:

```bash
yarn test:jest      # Unit tests
yarn cypress run    # Integration tests
```

####  Update snapshot tests (if applicable)

If you’re working with UI components or output that uses Jest snapshots and your changes are expected:

```bash
yarn test:jest -u   # Updates snapshot files
```

---


## Submit pull request

### Before submit a pull request
First-time contributors should head to the [contributing guide](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/CONTRIBUTING.md) to get started.

Make sure your pull request adheres to our [code guidelines](#code-guidelines).

Follow [testing guideline](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/TESTING.md) about current tests in the repo, writing tests and running tests locally.


### Best practices for pull request
We deeply appreciate everyone who takes the time to make a contribution. We will review all contributions as quickly as possible. As a best practice, opening an issue and discussing your change before you make it is the best way to smooth the PR process. This will prevent a rejection because someone else is already working on the problem, or because the solution is incompatible with the architectural direction.

In addition, below are a few best practices so your pull request gets reviewed quickly.

#### Mark unfinished pull requests
It's okay to submit a draft PR if you want to solicit reviews before the implementation of your pull request is complete. To do that, you may add a `WIP` or `[WIP]` prefix to your pull request title and [convert the PR to a draft](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/changing-the-stage-of-a-pull-request#converting-a-pull-request-to-a-draft)

#### Clear title and description for pull request
Make sure that the title of the PR is easy to understand about the intent, and it should not conflict with the PR description or the implementation. To help reviewers get better context of the PR, we suggest to have a clear summary of the intent of the change as well as detailed steps for the manual tests that have been performed for this PR.

#### Small pull request is better
Small pull requests get reviewed faster and are more likely to be correct than big ones. Breaking your change into small pull requests while keep in mind that every pull request should be useful on its own.

#### Check and fix tests
The repository uses codecov to gather coverage information, contributors submitting pull requests to the codebase are required to ensure that their code changes include appropriate testing coverage. Very few pull requests can touch the code and NOT touch the tests.

If you don't know how to test a feature, please ask! Pull requests lacking sufficient testing coverage may be subject to delays in review or rejection until adequate tests are provided.

The repository has automated test workflows, and contributors submitting pull requests are required to check the failed test workflows and fix the tests related to their code change. If flaky test is identified, please ask a maintainer to retry the workflow. 
