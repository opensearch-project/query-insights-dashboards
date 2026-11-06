/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CoreStart } from 'opensearch-dashboards/public';

/**
 * Shows a toast for a failed task cancel request. The cancel route answers 404 when the
 * task no longer exists, which usually means the query finished before it could be
 * cancelled, so that case is a warning rather than an error.
 */
export const notifyCancelTaskFailure = (
  notifications: CoreStart['notifications'] | undefined,
  error: any
) => {
  const toasts = notifications?.toasts;
  if (!toasts) {
    return;
  }
  const status = error?.response?.status ?? error?.body?.statusCode;
  if (status === 404) {
    toasts.addWarning('The query already finished, so there was nothing to cancel.');
    return;
  }
  toasts.addDanger({
    title: 'Failed to cancel query',
    text:
      error?.body?.message ??
      error?.message ??
      'An unknown error occurred while cancelling the query.',
  });
};
