/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SearchQueryRecord } from '../../types/types';

export const removeQueryGroups = (records: SearchQueryRecord[]) => {
  return records.filter((record: SearchQueryRecord) =>
    Object.values(record.measurements).every((measurement) => measurement.count === 1)
  );
};
