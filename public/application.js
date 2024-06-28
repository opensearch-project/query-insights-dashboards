import React from 'react';
import ReactDOM from 'react-dom';
// import { AppMountParameters, CoreStart } from '../../../src/core/public';
// import { AppPluginStartDependencies } from './types';
import { QueryInsightsDashboardsApp } from './components/app';
import { HashRouter as Router, Route } from 'react-router-dom';
// import { CoreContext } from './utils/CoreContext';
// import { ServicesContext, NotificationService, getDataSourceEnabled } from './services';
// import { initManageChannelsUrl } from './utils/helpers';

export const renderApp = (
  // { notifications, http }: CoreStart,
  coreStart,
  { navigation },
  { appBasePath, element }
) => {
  const isDarkMode = coreStart.uiSettings.get('theme:darkMode') || false;
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
