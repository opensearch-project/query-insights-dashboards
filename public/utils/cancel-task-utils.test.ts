/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { notifyCancelTaskFailure } from './cancel-task-utils';

const makeNotifications = () =>
  ({
    toasts: { addWarning: jest.fn(), addDanger: jest.fn() },
  }) as any;

describe('notifyCancelTaskFailure', () => {
  it('warns when the task already finished (404)', () => {
    const notifications = makeNotifications();
    notifyCancelTaskFailure(notifications, { response: { status: 404 }, body: { message: 'x' } });
    expect(notifications.toasts.addWarning).toHaveBeenCalledWith(
      'The query already finished, so there was nothing to cancel.'
    );
    expect(notifications.toasts.addDanger).not.toHaveBeenCalled();
  });

  it('reads the status from the error body too', () => {
    const notifications = makeNotifications();
    notifyCancelTaskFailure(notifications, { body: { statusCode: 404 } });
    expect(notifications.toasts.addWarning).toHaveBeenCalled();
  });

  it('shows the server message for other failures', () => {
    const notifications = makeNotifications();
    notifyCancelTaskFailure(notifications, {
      response: { status: 403 },
      body: { message: 'no permissions to cancel' },
    });
    expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: 'Failed to cancel query',
      text: 'no permissions to cancel',
    });
  });

  it('does nothing when notifications are unavailable', () => {
    expect(() => notifyCancelTaskFailure(undefined, new Error('x'))).not.toThrow();
  });
});
