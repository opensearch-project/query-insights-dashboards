/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  isVersion219,
  isVersion31OrHigher,
  isVersion33OrHigher,
  isVersion34OrHigher,
} from './version-utils';

describe('version-utils', () => {
  describe('isVersion219', () => {
    it('should return true for 2.19.x versions', () => {
      expect(isVersion219('2.19.0')).toBe(true);
      expect(isVersion219('2.19.4')).toBe(true);
      expect(isVersion219('2.19.0.0')).toBe(true);
      expect(isVersion219('2.19.999')).toBe(true);
    });

    it('should handle snapshot versions correctly', () => {
      expect(isVersion219('2.19.0-SNAPSHOT')).toBe(true);
      expect(isVersion219('2.19.4-SNAPSHOT')).toBe(true);
      expect(isVersion219('2.20.0-SNAPSHOT')).toBe(false);
      expect(isVersion219('2.18.9-SNAPSHOT')).toBe(false);
    });

    it('should return false for non-2.19.x versions', () => {
      expect(isVersion219('2.18.9')).toBe(false);
      expect(isVersion219('2.20.0')).toBe(false);
      expect(isVersion219('3.0.0')).toBe(false);
      expect(isVersion219('1.0.0')).toBe(false);
    });

    it('should return false for invalid versions', () => {
      expect(isVersion219(undefined)).toBe(false);
      expect(isVersion219('')).toBe(false);
      expect(isVersion219('invalid')).toBe(false);
    });
  });

  describe('isVersion31OrHigher', () => {
    it('should return true for 3.1.0 and higher', () => {
      expect(isVersion31OrHigher('3.1.0')).toBe(true);
      expect(isVersion31OrHigher('3.2.0')).toBe(true);
      expect(isVersion31OrHigher('4.0.0')).toBe(true);
    });

    it('should return false for versions below 3.1.0', () => {
      expect(isVersion31OrHigher('3.0.0')).toBe(false);
      expect(isVersion31OrHigher('2.19.0')).toBe(false);
    });

    it('should handle snapshot versions correctly', () => {
      expect(isVersion31OrHigher('3.1.0-SNAPSHOT')).toBe(true);
      expect(isVersion31OrHigher('3.0.0-SNAPSHOT')).toBe(false);
    });
  });

  describe('isVersion33OrHigher', () => {
    it('should return true for 3.3.0 and higher', () => {
      expect(isVersion33OrHigher('3.3.0')).toBe(true);
      expect(isVersion33OrHigher('3.4.0')).toBe(true);
    });

    it('should return false for versions below 3.3.0', () => {
      expect(isVersion33OrHigher('3.2.0')).toBe(false);
    });

    it('should handle snapshot versions correctly', () => {
      expect(isVersion33OrHigher('3.3.0-SNAPSHOT')).toBe(true);
      expect(isVersion33OrHigher('3.2.0-SNAPSHOT')).toBe(false);
    });
  });

  describe('isVersion34OrHigher', () => {
    it('should return true for 3.4.0 and higher', () => {
      expect(isVersion34OrHigher('3.4.0')).toBe(true);
      expect(isVersion34OrHigher('3.5.0')).toBe(true);
    });

    it('should return false for versions below 3.4.0', () => {
      expect(isVersion34OrHigher('3.3.0')).toBe(false);
    });

    it('should handle snapshot versions correctly', () => {
      expect(isVersion34OrHigher('3.4.0-SNAPSHOT')).toBe(true);
      expect(isVersion34OrHigher('3.3.0-SNAPSHOT')).toBe(false);
    });
  });
});
