/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CoreStart } from '../../../../src/core/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../types';

export const PageHeader = (props: {
  coreStart: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  fallBackComponent: JSX.Element;
}) => {
  // const { HeaderControl } = props.depsStart.navigation.ui; // TODO: enable this if more page header features are needed
  const useNewUx = props.coreStart.uiSettings.get('home:useNewHomePage');
  if (useNewUx) {
    // TODO: add any controls here
    return <></>;
  } else {
    return props.fallBackComponent;
  }
};
