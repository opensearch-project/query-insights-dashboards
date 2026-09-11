/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getErrorStatusCode,
  isFailedResponse,
  isForbiddenError,
  isSecurityExceptionError,
} from './ErrorUtils';

describe('ErrorUtils', () => {
  it.each([
    [{ statusCode: 403 }],
    [{ meta: { statusCode: 403 } }],
    [{ response: { status: 403 } }],
    [{ response: { statusCode: 403 } }],
    [{ body: { statusCode: 403 } }],
    [{ body: { status: 403 } }],
  ])('recognizes a 403 status from supported error shapes', (error) => {
    expect(isForbiddenError(error)).toBe(true);
  });

  it('recognizes an OpenSearch security exception', () => {
    expect(
      isForbiddenError({
        meta: {
          body: {
            error: {
              type: 'security_exception',
            },
          },
        },
      })
    ).toBe(true);
  });

  it.each([400, 401])('preserves an explicit %i status on a security exception', (statusCode) => {
    const error = {
      statusCode,
      body: {
        error: {
          type: 'security_exception',
        },
      },
    };

    expect(isSecurityExceptionError(error)).toBe(true);
    expect(isForbiddenError(error)).toBe(false);
  });

  it('recognizes a direct security exception type', () => {
    expect(isSecurityExceptionError({ type: 'security_exception' })).toBe(true);
  });

  it('recognizes a security exception in a top-level error string', () => {
    expect(
      isForbiddenError({
        ok: false,
        error: '[security_exception] no permissions for live queries',
      })
    ).toBe(true);
  });

  it('recognizes the legacy data source failure envelope', () => {
    expect(
      isForbiddenError({
        ok: false,
        response: 'Data Source Error: [security_exception] no permissions for top queries',
      })
    ).toBe(true);
  });

  it('recognizes a nested legacy data source failure envelope', () => {
    expect(
      isForbiddenError({
        ok: true,
        response: {
          ok: false,
          response: 'Data Source Error: [security_exception] no permissions for top queries',
        },
      })
    ).toBe(true);
  });

  it('does not classify an unrelated error as forbidden', () => {
    expect(isForbiddenError(new Error('Service unavailable'))).toBe(false);
  });

  it('returns undefined when an error has no numeric status', () => {
    expect(getErrorStatusCode({ statusCode: '403' })).toBeUndefined();
  });

  it('recognizes a resolved failure envelope', () => {
    expect(isFailedResponse({ ok: false, response: 'Failed' })).toBe(true);
    expect(isFailedResponse({ ok: true, response: {} })).toBe(false);
  });
});
