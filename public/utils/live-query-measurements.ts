/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Measurement } from '../../types/types';

type LiveMeasurement = Pick<Measurement, 'number'> & Partial<Measurement>;
type LiveMeasurements = Partial<Record<'latency' | 'cpu' | 'memory', LiveMeasurement>>;

/** Convert finished-query latency (milliseconds) to the live table's nanoseconds. */
export const normalizeFinishedMeasurements = (
  measurements?: LiveMeasurements
): LiveMeasurements => ({
  ...measurements,
  latency: {
    ...measurements?.latency,
    number: (measurements?.latency?.number ?? 0) * 1e6,
  },
  cpu: measurements?.cpu ?? { number: 0 },
  memory: measurements?.memory ?? { number: 0 },
});
