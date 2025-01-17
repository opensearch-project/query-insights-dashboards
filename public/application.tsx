/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router } from 'react-router-dom';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { QueryInsightsDashboardsApp } from './components/app';
import { QueryInsightsDashboardsPluginStartDependencies } from './types';

export const renderApp = (
  core: CoreStart,
  depsStart: QueryInsightsDashboardsPluginStartDependencies,
  { element }: AppMountParameters
) => {
  ReactDOM.render(
    <Router>
      <QueryInsightsDashboardsApp core={core} depsStart={depsStart} />
    </Router>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
