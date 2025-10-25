/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const getVersionOnce = jest.fn().mockResolvedValue('3.3.0');
export const isVersion31OrHigher = jest.fn().mockReturnValue(true);
export const isVersion33OrHigher = jest.fn().mockReturnValue(true);
export const isVersion34OrHigher = jest.fn().mockReturnValue(true);
export const isVersion219 = jest.fn().mockReturnValue(false);
export const getGroupBySettingsPath = jest
  .fn()
  .mockImplementation((version, settings) => settings?.grouping?.group_by);
