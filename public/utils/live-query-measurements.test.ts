/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizeFinishedMeasurements } from './live-query-measurements';

describe('normalizeFinishedMeasurements', () => {
  it('makes finished-query latency agree with a running query in nanoseconds', () => {
    const result = normalizeFinishedMeasurements({
      latency: { number: 231566 },
    });
    expect(result.latency?.number).toBe(231566 * 1e6);
    expect(result.latency!.number / 1e9).toBe(231.566);
    expect(result.latency!.number / 1e6).toBe(231566);
  });

  it('preserves CPU, memory and measurement metadata without mutating the API response', () => {
    const source = {
      latency: { number: 0.25, unit: 'ms' },
      cpu: { number: 123456 },
      memory: { number: 8192 },
    };
    const result = normalizeFinishedMeasurements(source);
    expect(result).toEqual({
      ...source,
      latency: { number: 250000, unit: 'ms' },
    });
    expect(source.latency.number).toBe(0.25);
  });

  it.each([undefined, {}, { latency: { number: 0 } }])(
    'defaults missing metrics to zero: %p',
    (source) => {
      expect(normalizeFinishedMeasurements(source)).toEqual({
        latency: { number: 0 },
        cpu: { number: 0 },
        memory: { number: 0 },
      });
    }
  );
});
