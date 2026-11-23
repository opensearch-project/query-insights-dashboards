/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateMemory } from './MetricUtils';

describe('calculateMemory', () => {
  it('shows bytes in binary units', () => {
    expect(calculateMemory(43068654040, 1)).toBe('40.11 GB');
    expect(calculateMemory(16528, 1)).toBe('16.14 KB');
    expect(calculateMemory(512, 1)).toBe('512 B');
  });

  it('averages over the count', () => {
    expect(calculateMemory(4096, 2)).toBe('2 KB');
  });

  it('shows the default message without a measurement', () => {
    expect(calculateMemory(undefined, undefined)).toBe('N/A');
    expect(calculateMemory(undefined, 1, '-')).toBe('-');
  });
});
