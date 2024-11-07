/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import { removeQueryGroups } from './utils';
import { SearchQueryRecord } from '../../types/types';
import { MockGroups, MockQueries } from '../../test/testUtils';

const mockQueries = MockQueries();
const mockGroups = MockGroups();
describe('removeQueryGroups', () => {
  it('should return an empty array when input is an empty array', () => {
    const records: SearchQueryRecord[] = [];
    const result = removeQueryGroups(records);
    expect(result).toEqual([]);
  });

  it('should return only records where all measurements have count equal to 1 (native queries)', () => {
    const records: SearchQueryRecord[] = [...mockQueries, ...mockGroups];
    const result = removeQueryGroups(records);
    expect(result).toEqual(mockQueries);
  });

  it('should exclude all records where all records are groups', () => {
    const result = removeQueryGroups(mockGroups);
    expect(result).toEqual([]);
  });

  it('should include records where all records are native queries', () => {
    const result = removeQueryGroups(mockQueries);
    expect(result).toEqual(mockQueries);
  });

  it('should handle empty records', () => {
    const result = removeQueryGroups([]);
    expect(result).toEqual([]);
  });
});
