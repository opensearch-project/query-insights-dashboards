/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  WLM_SETTING_DEFS,
  emptyDraft,
  hasInvalidSettings,
  parseRawSettings,
  serializeDraft,
  toDraft,
  validateSetting,
} from './wlm_settings_types';

describe('wlm_settings_types', () => {
  describe('emptyDraft', () => {
    it('returns one entry per defined key, all disabled', () => {
      const draft = emptyDraft();
      for (const def of WLM_SETTING_DEFS) {
        expect(draft[def.key]).toEqual({ enabled: false, value: '', wasSetOnServer: false });
      }
    });
  });

  describe('parseRawSettings', () => {
    it('returns {} for undefined or null', () => {
      expect(parseRawSettings(undefined)).toEqual({});
      expect(parseRawSettings(null)).toEqual({});
    });

    it('parses int strings as numbers', () => {
      const parsed = parseRawSettings({ 'search.max_buckets': '10000' });
      expect(parsed).toEqual({ 'search.max_buckets': 10000 });
    });

    it('parses boolean strings', () => {
      expect(parseRawSettings({ override_request_values: 'true' })).toEqual({
        override_request_values: true,
      });
      expect(parseRawSettings({ override_request_values: 'false' })).toEqual({
        override_request_values: false,
      });
    });

    it('drops the search.default_search_timeout sentinel "-1"', () => {
      expect(parseRawSettings({ 'search.default_search_timeout': '-1' })).toEqual({});
    });

    it('keeps other time values verbatim', () => {
      expect(parseRawSettings({ 'search.default_search_timeout': '30s' })).toEqual({
        'search.default_search_timeout': '30s',
      });
    });

    it('ignores unknown keys', () => {
      expect(parseRawSettings({ 'something.unknown': '5' })).toEqual({});
    });
  });

  describe('toDraft', () => {
    it('marks a returned int setting as enabled and wasSetOnServer', () => {
      const draft = toDraft({ 'search.max_buckets': 10000 });
      expect(draft['search.max_buckets']).toEqual({
        enabled: true,
        value: '10000',
        wasSetOnServer: true,
      });
    });

    it('treats override_request_values=false as not user-set', () => {
      const draft = toDraft({ override_request_values: false });
      expect(draft.override_request_values).toEqual({
        enabled: false,
        value: 'false',
        wasSetOnServer: false,
      });
    });

    it('treats override_request_values=true as user-set', () => {
      const draft = toDraft({ override_request_values: true });
      expect(draft.override_request_values).toEqual({
        enabled: true,
        value: 'true',
        wasSetOnServer: true,
      });
    });
  });

  describe('validateSetting', () => {
    it('accepts valid time values', () => {
      expect(validateSetting('search.default_search_timeout', '30s')).toBeNull();
      expect(validateSetting('search.default_search_timeout', '1m')).toBeNull();
      expect(validateSetting('search.default_search_timeout', '250ms')).toBeNull();
    });

    it('rejects bare numeric time values', () => {
      expect(validateSetting('search.default_search_timeout', '30')).not.toBeNull();
    });

    it('rejects empty time values', () => {
      expect(validateSetting('search.default_search_timeout', '')).not.toBeNull();
    });

    it('enforces int minimums', () => {
      expect(validateSetting('search.batched_reduce_size', '2')).toBeNull();
      expect(validateSetting('search.batched_reduce_size', '1')).not.toBeNull();
      expect(validateSetting('search.max_concurrent_shard_requests', '1')).toBeNull();
      expect(validateSetting('search.max_concurrent_shard_requests', '0')).not.toBeNull();
      expect(validateSetting('search.max_buckets', '0')).toBeNull();
      expect(validateSetting('search.max_buckets', '-1')).not.toBeNull();
    });

    it('rejects non-integer ints', () => {
      expect(validateSetting('search.max_buckets', '1.5')).not.toBeNull();
      expect(validateSetting('search.max_buckets', 'abc')).not.toBeNull();
    });

    it('enforces int maximum (Integer.MAX_VALUE)', () => {
      expect(validateSetting('search.max_buckets', '2147483647')).toBeNull();
      expect(validateSetting('search.max_buckets', '2147483648')).not.toBeNull();
      expect(validateSetting('search.max_concurrent_shard_requests', '2147483648')).not.toBeNull();
      expect(validateSetting('search.batched_reduce_size', '999999999999')).not.toBeNull();
    });

    it('treats boolean keys as always valid', () => {
      expect(validateSetting('override_request_values', '')).toBeNull();
    });
  });

  describe('hasInvalidSettings', () => {
    it('is false when nothing is enabled', () => {
      expect(hasInvalidSettings(emptyDraft())).toBe(false);
    });

    it('is true when an enabled row has an invalid value', () => {
      const draft = emptyDraft();
      draft['search.batched_reduce_size'] = { enabled: true, value: '1', wasSetOnServer: false };
      expect(hasInvalidSettings(draft)).toBe(true);
    });

    it('ignores invalid values on disabled rows', () => {
      const draft = emptyDraft();
      draft['search.batched_reduce_size'] = { enabled: false, value: '1', wasSetOnServer: false };
      expect(hasInvalidSettings(draft)).toBe(false);
    });
  });

  describe('serializeDraft', () => {
    it('returns undefined for empty draft', () => {
      expect(serializeDraft(emptyDraft())).toBeUndefined();
    });

    it('emits typed values for enabled rows', () => {
      const draft = emptyDraft();
      draft['search.max_buckets'] = { enabled: true, value: '5000', wasSetOnServer: false };
      draft['search.default_search_timeout'] = {
        enabled: true,
        value: '30s',
        wasSetOnServer: false,
      };
      expect(serializeDraft(draft)).toEqual({
        'search.max_buckets': 5000,
        'search.default_search_timeout': '30s',
      });
    });

    it('emits null for previously-set keys that are toggled off', () => {
      const draft = emptyDraft();
      draft['search.max_buckets'] = { enabled: false, value: '10000', wasSetOnServer: true };
      expect(serializeDraft(draft)).toEqual({ 'search.max_buckets': null });
    });

    it('omits never-set keys that remain off', () => {
      const draft = emptyDraft();
      draft['search.max_buckets'] = { enabled: false, value: '', wasSetOnServer: false };
      expect(serializeDraft(draft)).toBeUndefined();
    });

    it('emits boolean true when override_request_values is enabled', () => {
      const draft = emptyDraft();
      draft.override_request_values = { enabled: true, value: 'true', wasSetOnServer: false };
      expect(serializeDraft(draft)).toEqual({ override_request_values: true });
    });

    it('emits null when override_request_values was true and is toggled off', () => {
      const draft = emptyDraft();
      draft.override_request_values = { enabled: false, value: 'true', wasSetOnServer: true };
      expect(serializeDraft(draft)).toEqual({ override_request_values: null });
    });

    it('mixes set and removal in one payload', () => {
      const draft = emptyDraft();
      draft['search.max_buckets'] = { enabled: true, value: '9999', wasSetOnServer: true };
      draft['search.batched_reduce_size'] = { enabled: false, value: '512', wasSetOnServer: true };
      expect(serializeDraft(draft)).toEqual({
        'search.max_buckets': 9999,
        'search.batched_reduce_size': null,
      });
    });
  });
});
