import React from 'react';
import { Route, BrowserRouter as Router } from 'react-router-dom';
import TopNQueries from '../pages/TopNQueries/TopNQueries'

export const QueryInsightsDashboardsApp = ({props}) => {
  return (
    <Route
      render={(props) => (
        <TopNQueries
         {...props}
        />
      )}
    />
  );
};
