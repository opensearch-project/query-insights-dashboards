import React from 'react';
import { Route } from 'react-router-dom';
import TopNQueries from '../pages/TopNQueries/TopNQueries';

export const QueryInsightsDashboardsApp = () => {
  return <Route render={() => <TopNQueries />} />;
};
