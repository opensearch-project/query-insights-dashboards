import React from 'react';
import ReactDOM from 'react-dom';
import { QueryInsightsDashboardsApp } from './components/app';
import { HashRouter as Router, Route } from 'react-router-dom';

export const renderApp = (
  coreStart,
  { navigation },
  { appBasePath, element }
) => {
  coreStart.chrome.setBreadcrumbs([{text: 'Query insights'}]);
  ReactDOM.render(
    <Router>
      <QueryInsightsDashboardsApp
        basename={appBasePath}
        notifications={coreStart.notifications}
        http={coreStart.http}
        navigation={navigation}
      />
    </Router>
    , element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
