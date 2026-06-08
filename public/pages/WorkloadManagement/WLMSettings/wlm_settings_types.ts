/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export type WlmGroupSettingsKey =
  | 'search.default_search_timeout'
  | 'search.cancel_after_time_interval'
  | 'search.max_concurrent_shard_requests'
  | 'search.batched_reduce_size'
  | 'search.max_buckets'
  | 'override_request_values';

export type WlmSettingKind = 'time' | 'int' | 'boolean';

export interface WlmSettingDef {
  key: WlmGroupSettingsKey;
  kind: WlmSettingKind;
  description: string;
  min?: number;
  max?: number;
  implicitDefault?: string;
}

export const INT_MAX = 2147483647;

export const WLM_SETTING_DEFS: readonly WlmSettingDef[] = [
  {
    key: 'search.default_search_timeout',
    kind: 'time',
    description: 'Hard cap on per-shard search execution time.',
    implicitDefault: '-1',
  },
  {
    key: 'search.cancel_after_time_interval',
    kind: 'time',
    description: 'Coordinator-side deadline after which a search request is cancelled.',
  },
  {
    key: 'search.max_concurrent_shard_requests',
    kind: 'int',
    description: 'Maximum number of concurrent shard requests per node for a single search.',
    min: 1,
    max: INT_MAX,
    implicitDefault: '5',
  },
  {
    key: 'search.batched_reduce_size',
    kind: 'int',
    description: 'Maximum number of shard results to reduce per batch on the coordinator.',
    min: 2,
    max: INT_MAX,
    implicitDefault: '512',
  },
  {
    key: 'search.max_buckets',
    kind: 'int',
    description: 'Maximum number of aggregation buckets allowed in a single response.',
    min: 0,
    max: INT_MAX,
  },
  {
    key: 'override_request_values',
    kind: 'boolean',
    description: 'Enable to allow group settings to override caller-supplied request parameters.',
    implicitDefault: 'false',
  },
];

const KEY_TO_DEF: Record<WlmGroupSettingsKey, WlmSettingDef> = WLM_SETTING_DEFS.reduce(
  (acc, def) => {
    acc[def.key] = def;
    return acc;
  },
  {} as Record<WlmGroupSettingsKey, WlmSettingDef>
);

export type WlmGroupSettings = Partial<{
  'search.default_search_timeout': string;
  'search.cancel_after_time_interval': string;
  'search.max_concurrent_shard_requests': number;
  'search.batched_reduce_size': number;
  'search.max_buckets': number;
  override_request_values: boolean;
}>;

export interface WlmGroupSettingsDraftEntry {
  enabled: boolean;
  value: string;
  wasSetOnServer: boolean;
}

export type WlmGroupSettingsDraft = Record<WlmGroupSettingsKey, WlmGroupSettingsDraftEntry>;

export function emptyDraft(): WlmGroupSettingsDraft {
  return WLM_SETTING_DEFS.reduce((acc, def) => {
    acc[def.key] = { enabled: false, value: '', wasSetOnServer: false };
    return acc;
  }, {} as WlmGroupSettingsDraft);
}

// Shallow-merges a single entry's fields into a draft. Always create the next
// draft from the *latest* current draft (e.g. inside a setSettingsDraft
// updater) — operating on a stale closed-over draft will silently drop other
// pending updates batched in the same render.
export function patchDraftEntry(
  draft: WlmGroupSettingsDraft,
  key: WlmGroupSettingsKey,
  patch: Partial<WlmGroupSettingsDraftEntry>
): WlmGroupSettingsDraft {
  return {
    ...draft,
    [key]: { ...draft[key], ...patch },
  };
}

const TIME_VALUE_REGEX = /^\d+(?:\.\d+)?(ms|s|m|h|d)$/;

function parseBoolean(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true';
  return false;
}

function parseInteger(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') return Number(raw);
  return NaN;
}

export function parseRawSettings(
  raw: Record<string, unknown> | undefined | null
): WlmGroupSettings {
  if (!raw || typeof raw !== 'object') return {};
  const out: WlmGroupSettings = {};
  for (const def of WLM_SETTING_DEFS) {
    if (!(def.key in raw)) continue;
    const value = (raw as Record<string, unknown>)[def.key];
    if (value === null || value === undefined) continue;
    if (def.kind === 'time') {
      const s = String(value);
      if (def.key === 'search.default_search_timeout' && s === '-1') continue;
      (out as Record<string, unknown>)[def.key] = s;
    } else if (def.kind === 'int') {
      const n = parseInteger(value);
      if (Number.isFinite(n)) (out as Record<string, unknown>)[def.key] = n;
    } else {
      (out as Record<string, unknown>)[def.key] = parseBoolean(value);
    }
  }
  return out;
}

export function toDraft(parsed: WlmGroupSettings): WlmGroupSettingsDraft {
  const draft = emptyDraft();
  for (const def of WLM_SETTING_DEFS) {
    const parsedValue = (parsed as Record<string, unknown>)[def.key];
    if (parsedValue === undefined) continue;

    if (def.kind === 'boolean') {
      const booleanValue = parsedValue === true;
      const matchesImplicitDefault =
        def.implicitDefault !== undefined && String(booleanValue) === def.implicitDefault;
      draft[def.key] = {
        enabled: booleanValue,
        value: booleanValue ? 'true' : 'false',
        wasSetOnServer: !matchesImplicitDefault && booleanValue,
      };
    } else {
      draft[def.key] = {
        enabled: true,
        value: String(parsedValue),
        wasSetOnServer: true,
      };
    }
  }
  return draft;
}

export function validateSetting(key: WlmGroupSettingsKey, rawValue: string): string | null {
  const def = KEY_TO_DEF[key];
  if (!def) return null;
  const trimmed = (rawValue ?? '').trim();
  if (def.kind === 'boolean') return null;
  if (trimmed === '') return 'Value is required.';
  if (def.kind === 'time') {
    return TIME_VALUE_REGEX.test(trimmed) ? null : 'Use a duration like 250ms, 30s, or 1m.';
  }
  if (def.kind === 'int') {
    const n = Number(trimmed);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Must be an integer.';
    if (def.min !== undefined && n < def.min) return `Must be ≥ ${def.min}.`;
    if (def.max !== undefined && n > def.max) return `Must be ≤ ${def.max}.`;
    return null;
  }
  return null;
}

export function hasInvalidSettings(draft: WlmGroupSettingsDraft): boolean {
  return WLM_SETTING_DEFS.some((def) => {
    const entry = draft[def.key];
    if (!entry || !entry.enabled) return false;
    return validateSetting(def.key, entry.value) !== null;
  });
}

export type WlmSettingsPayloadValue = string | number | boolean | null;
export type WlmSettingsPayload = Record<string, WlmSettingsPayloadValue>;

export function serializeDraft(draft: WlmGroupSettingsDraft): WlmSettingsPayload | undefined {
  const out: WlmSettingsPayload = {};
  for (const def of WLM_SETTING_DEFS) {
    const entry = draft[def.key];
    if (!entry) continue;
    if (entry.enabled) {
      if (def.kind === 'time') {
        out[def.key] = entry.value.trim();
      } else if (def.kind === 'int') {
        out[def.key] = Number(entry.value);
      } else {
        out[def.key] = true;
      }
    } else if (entry.wasSetOnServer) {
      out[def.key] = null;
    }
  }
  return Object.keys(out).length === 0 ? undefined : out;
}
