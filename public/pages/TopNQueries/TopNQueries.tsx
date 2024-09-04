import React, { useState } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import QueryDetails from '../QueryDetails/QueryDetails';
import { CoreStart } from '../../../../../src/core/public';

export const QUERY_INSIGHTS = '/queryInsights';
export const CONFIGURATION = '/configuration';

const TopNQueries = ({ core }: { core: CoreStart }) => {
  const [queries, setQueries] = useState<any[]>([]);

  return (
    <div style={{ padding: '35px 35px' }}>
      <Switch>
        <Route exact path="/query-details/:hashedQuery">
          <QueryDetails queries={queries} core={core} />
        </Route>
        <Redirect to={QUERY_INSIGHTS} />
      </Switch>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default TopNQueries;
