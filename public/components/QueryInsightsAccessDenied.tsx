/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import {
  QUERY_INSIGHTS_ACCESS_DENIED_DESCRIPTION,
  QUERY_INSIGHTS_ACCESS_DENIED_TITLE,
} from '../../common/constants';

export const QueryInsightsAccessDenied = ({
  title = QUERY_INSIGHTS_ACCESS_DENIED_TITLE,
  description = QUERY_INSIGHTS_ACCESS_DENIED_DESCRIPTION,
  dataTestSubj = 'queryInsightsAccessDenied',
}: {
  title?: string;
  description?: string;
  dataTestSubj?: string;
}) => (
  <EuiCallOut
    title={title}
    color="danger"
    iconType="alert"
    heading="h2"
    role="alert"
    data-test-subj={dataTestSubj}
  >
    <p>{description}</p>
  </EuiCallOut>
);
