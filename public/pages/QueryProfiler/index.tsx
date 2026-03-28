/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EuiPage, EuiPageBody } from '@elastic/eui';
import { CoreStart } from '../../../../../src/core/public';
import { ProfileData } from './types';
import { ProfilerDashboard } from './containers/ProfilerDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

export interface QueryProfilerMountParams {
  element: HTMLElement;
  core: CoreStart;
  dataSourceId?: string;
}

/**
 * Main Query Profiler application component
 */
const QueryProfilerApp: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  return (
    <ErrorBoundary>
      <EuiPage>
        <EuiPageBody>
          <ProfilerDashboard data={profileData} updateData={setProfileData} />
        </EuiPageBody>
      </EuiPage>
    </ErrorBoundary>
  );
};

/**
 * Mount function for the Query Profiler Dev Tools tab.
 * This function is called when the Query Profiler tab is activated.
 * 
 * @param params - Mount parameters including element, core services, and dataSourceId
 * @returns Unmount function to clean up resources
 */
export const renderQueryProfiler = ({
  element,
  core,
}: QueryProfilerMountParams) => {
  const I18nContext = core.i18n.Context;

  const root = createRoot(element);
  
  root.render(
    <I18nContext>
      <QueryProfilerApp />
    </I18nContext>
  );

  // Return unmount function for cleanup
  return () => {
    root.unmount();
  };
};
