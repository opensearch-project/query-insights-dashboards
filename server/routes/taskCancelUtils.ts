/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const NOT_FOUND_ERROR_TYPES = new Set(['resource_not_found_exception', 'no_such_node_exception']);

// Follows an OpenSearch error object through caused_by (node failures) and reason
// (task failures) and returns every level, outermost first.
const errorChain = (failure: any): any[] => {
  const chain: any[] = [];
  let current = failure;
  while (current && typeof current === 'object' && chain.length < 10) {
    chain.push(current);
    current =
      current.caused_by ?? (typeof current.reason === 'object' ? current.reason : undefined);
  }
  return chain;
};

/**
 * The task cancel API answers 200 even when nothing was cancelled and lists the reason in
 * node_failures or task_failures, for example when the task has already finished or the
 * node does not exist. Returns the status and reason to send for such a response, or
 * undefined when nothing failed.
 */
export const getTaskCancelFailure = (
  body: any
): { statusCode: number; reason: string } | undefined => {
  const failures = [...(body?.node_failures ?? []), ...(body?.task_failures ?? [])];
  if (failures.length === 0) {
    return undefined;
  }
  const chain = errorChain(failures[0]);
  const types = failures.flatMap(errorChain).map((e) => e.type);
  const reasons = chain.map((e) => e.reason).filter((r) => typeof r === 'string');
  let statusCode = 500;
  if (types.some((t) => NOT_FOUND_ERROR_TYPES.has(t))) {
    statusCode = 404;
  } else if (types.includes('illegal_argument_exception')) {
    statusCode = 400;
  }
  return {
    statusCode,
    reason: reasons[reasons.length - 1] ?? 'the task could not be cancelled',
  };
};
