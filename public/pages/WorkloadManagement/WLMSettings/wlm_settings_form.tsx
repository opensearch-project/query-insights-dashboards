/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import {
  WLM_SETTING_DEFS,
  WlmGroupSettings,
  WlmGroupSettingsDraft,
  WlmGroupSettingsDraftEntry,
  WlmGroupSettingsKey,
  WlmSettingDef,
  validateSetting,
} from './wlm_settings_types';

export interface WLMSettingsFormProps {
  initialSettings: WlmGroupSettings | undefined;
  draft: WlmGroupSettingsDraft;
  // Callers must merge this patch into the latest draft, ideally via a
  // functional state updater. Passing a fully-built next-draft from inside the
  // form would race with any other pending setSettingsDraft updater (e.g. the
  // post-save mark-as-saved write) — the caller would close over a stale draft
  // prop and silently overwrite the queued update.
  onChange: (key: WlmGroupSettingsKey, patch: Partial<WlmGroupSettingsDraftEntry>) => void;
  disabled?: boolean;
}

const renderInput = (
  def: WlmSettingDef,
  entry: WlmGroupSettingsDraftEntry,
  disabled: boolean,
  onValueChange: (value: string) => void
) => {
  if (def.kind === 'boolean') return null;
  const isDisabled = disabled || !entry.enabled;
  if (def.kind === 'int') {
    return (
      <EuiFieldNumber
        data-testid={`wlm-setting-input-${def.key}`}
        value={entry.value === '' ? '' : Number(entry.value)}
        disabled={isDisabled}
        min={def.min}
        max={def.max}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (['e', 'E', '+', '-', '.'].includes(e.key)) {
            e.preventDefault();
          }
        }}
      />
    );
  }
  return (
    <EuiFieldText
      data-testid={`wlm-setting-input-${def.key}`}
      value={entry.value}
      disabled={isDisabled}
      placeholder="e.g. 30s"
      onChange={(e) => onValueChange(e.target.value)}
    />
  );
};

export const WLMSettingsForm: React.FC<WLMSettingsFormProps> = ({
  draft,
  onChange,
  disabled = false,
}) => {
  return (
    <div>
      {WLM_SETTING_DEFS.map((def, idx) => {
        const entry = draft[def.key];
        const isBoolean = def.kind === 'boolean';
        const error = entry.enabled && !isBoolean ? validateSetting(def.key, entry.value) : null;

        const onToggle = (checked: boolean) => {
          if (isBoolean) {
            onChange(def.key, {
              enabled: checked,
              value: checked ? 'true' : 'false',
            });
          } else {
            onChange(def.key, { enabled: checked });
          }
        };

        return (
          <React.Fragment key={def.key}>
            {idx > 0 && <EuiSpacer size="m" />}
            <EuiFlexGroup alignItems="flexStart" gutterSize="l">
              <EuiFlexItem grow={3}>
                <EuiText size="m">
                  <code style={{ fontWeight: 600 }}>{def.key}</code>
                </EuiText>
                <EuiText size="xs" color="subdued">
                  {def.description}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <EuiFlexGroup alignItems="center" gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      label="Enabled"
                      data-testid={`wlm-setting-toggle-${def.key}`}
                      checked={entry.enabled}
                      disabled={disabled}
                      onChange={(e) => onToggle(e.target.checked)}
                    />
                  </EuiFlexItem>
                  {!isBoolean && (
                    <EuiFlexItem>
                      <EuiFormRow isInvalid={Boolean(error)} error={error || undefined} fullWidth>
                        {renderInput(def, entry, disabled, (value) => onChange(def.key, { value }))}
                      </EuiFormRow>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </React.Fragment>
        );
      })}
    </div>
  );
};
