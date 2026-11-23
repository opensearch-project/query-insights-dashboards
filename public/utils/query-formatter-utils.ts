/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/*
 *   Copyright OpenSearch Contributors
 *
 *   Licensed under the Apache License, Version 2.0 (the "License").
 *   You may not use this file except in compliance with the License.
 *   A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   or in the "license" file accompanying this file. This file is distributed
 *   on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *   express or implied. See the License for the specific language governing
 *   permissions and limitations under the License.
 */

import { SearchQueryRecord } from '../../types/types';

/**
 * Whether a record is a search. A PPL query the SQL plugin reports carries its query text as its
 * source rather than a search body.
 */
export const isDslQuery = (query: Pick<SearchQueryRecord, 'query_source'>): boolean =>
  !query.query_source || query.query_source === 'DSL';

export const formatQueryDisplay = (query: SearchQueryRecord | null): string => {
  if (!query) {
    return '';
  }
  if (!isDslQuery(query)) {
    return typeof query.source === 'string' ? query.source : '';
  }
  let parsedSource = query.source;

  // New format: source is a string
  if (typeof query.source === 'string') {
    if (query.source_truncated) {
      // Truncated source can't be parsed, return with indicator
      return query.source + '\n...';
    }
    parsedSource = JSON.parse(query.source);
  }
  // Old format: source is already an object (ISearchSource)
  return JSON.stringify(parsedSource, null, 2);
};
