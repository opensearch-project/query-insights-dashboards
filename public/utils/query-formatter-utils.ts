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

export const formatQueryDisplay = (query: SearchQueryRecord | null): string => {
  if (!query) {
    return '';
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
