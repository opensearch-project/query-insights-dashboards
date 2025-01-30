/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import dateMath from '@elastic/datemath';

export const parseDateString = (dateString: string): string => {
  const date = dateMath.parse(dateString);
  return date ? date.toDate().toISOString() : new Date().toISOString();
};
