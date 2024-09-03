import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router } from 'react-router-dom';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { QueryInsightsDashboardsApp } from './components/app';

export const renderApp = (core: CoreStart, { element }: AppMountParameters) => {
  ReactDOM.render(
    <Router>
      <QueryInsightsDashboardsApp core={core} />
    </Router>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
