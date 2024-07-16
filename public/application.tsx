import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router } from 'react-router-dom';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { QueryInsightsDashboardsApp } from './components/app';

export const renderApp = ({ chrome }: CoreStart, { element }: AppMountParameters) => {
  chrome.setBreadcrumbs([{ text: 'Query insights' }]);
  ReactDOM.render(
    <Router>
      <QueryInsightsDashboardsApp />
    </Router>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
