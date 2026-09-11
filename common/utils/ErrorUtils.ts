/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

type ErrorRecord = Record<string, unknown>;

const asErrorRecord = (value: unknown): ErrorRecord | undefined =>
  typeof value === 'object' && value !== null ? (value as ErrorRecord) : undefined;

const getProperty = (value: unknown, property: string): unknown => asErrorRecord(value)?.[property];

const getErrorContainers = (error: unknown): unknown[] => {
  const meta = getProperty(error, 'meta');
  const response = getProperty(error, 'response');

  return [
    error,
    meta,
    getProperty(meta, 'body'),
    getProperty(error, 'body'),
    response,
    getProperty(response, 'body'),
    getProperty(response, 'response'),
  ].filter((container) => container != null);
};

const getSecurityExceptionType = (error: unknown): string | undefined => {
  for (const container of getErrorContainers(error)) {
    const type =
      getProperty(getProperty(container, 'error'), 'type') ?? getProperty(container, 'type');
    if (typeof type === 'string') return type;
  }
};

const getErrorMessages = (error: unknown): string[] => {
  const messages: string[] = [];

  for (const container of getErrorContainers(error)) {
    if (typeof container === 'string') {
      messages.push(container);
      continue;
    }

    for (const message of [
      getProperty(container, 'message'),
      getProperty(container, 'reason'),
      getProperty(container, 'error'),
      getProperty(getProperty(container, 'error'), 'reason'),
    ]) {
      if (typeof message === 'string') messages.push(message);
    }
  }

  return messages;
};

export const getErrorMessage = (error: unknown): string | undefined => getErrorMessages(error)[0];

export const getErrorStatusCode = (error: unknown): number | undefined => {
  for (const container of getErrorContainers(error)) {
    const statusCode = getProperty(container, 'statusCode') ?? getProperty(container, 'status');
    if (typeof statusCode === 'number') return statusCode;
  }
};

export const isFailedResponse = (response: unknown): boolean =>
  getProperty(response, 'ok') === false;

export const isSecurityExceptionError = (error: unknown): boolean =>
  getSecurityExceptionType(error) === 'security_exception' ||
  getErrorMessages(error).some((message) => message.includes('[security_exception]'));

export const isForbiddenError = (error: unknown): boolean => {
  const statusCode = getErrorStatusCode(error);
  return statusCode === undefined ? isSecurityExceptionError(error) : statusCode === 403;
};
