import React from 'react';
import { Route } from 'react-router-dom';
import TopNQueries from '../pages/TopNQueries/TopNQueries';
import { CoreStart } from '../../../../src/core/public';

export const QueryInsightsDashboardsApp = ({ core }: { core: CoreStart }) => {
  return <Route render={() => <TopNQueries core={core} />} />;
};
