/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { getTaskCancelFailure } from './taskCancelUtils';

describe('getTaskCancelFailure', () => {
  it('returns undefined when the cancel succeeded', () => {
    expect(getTaskCancelFailure({ nodes: { n1: { tasks: {} } } })).toBeUndefined();
    expect(getTaskCancelFailure({ node_failures: [], task_failures: [] })).toBeUndefined();
    expect(getTaskCancelFailure(undefined)).toBeUndefined();
  });

  it('returns 404 when the task is not found', () => {
    expect(
      getTaskCancelFailure({
        node_failures: [
          {
            type: 'failed_node_exception',
            reason: 'Failed node [n1]',
            node_id: 'n1',
            caused_by: {
              type: 'resource_not_found_exception',
              reason: 'task [n1:99] is not found',
            },
          },
        ],
      })
    ).toEqual({ statusCode: 404, reason: 'task [n1:99] is not found' });
  });

  it('returns 404 when the node does not exist', () => {
    expect(
      getTaskCancelFailure({
        node_failures: [
          {
            type: 'failed_node_exception',
            reason: 'Failed node [zz]',
            caused_by: { type: 'no_such_node_exception', reason: 'No such node [zz]' },
          },
        ],
      })
    ).toEqual({ statusCode: 404, reason: 'No such node [zz]' });
  });

  it('returns 400 when the task cannot be cancelled', () => {
    expect(
      getTaskCancelFailure({
        node_failures: [
          {
            type: 'failed_node_exception',
            reason: 'Failed node [n1]',
            caused_by: {
              type: 'illegal_argument_exception',
              reason: "task [n1:5] doesn't support cancellation",
            },
          },
        ],
      })
    ).toEqual({ statusCode: 400, reason: "task [n1:5] doesn't support cancellation" });
  });

  it('reads task failures, which carry the error under reason', () => {
    expect(
      getTaskCancelFailure({
        task_failures: [
          {
            task_id: 5,
            node_id: 'n1',
            status: 'INTERNAL_SERVER_ERROR',
            reason: { type: 'exception', reason: 'cancellation failed' },
          },
        ],
      })
    ).toEqual({ statusCode: 500, reason: 'cancellation failed' });
  });
});
