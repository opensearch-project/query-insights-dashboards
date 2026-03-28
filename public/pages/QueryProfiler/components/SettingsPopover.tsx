/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiButton,
  EuiPopover,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

interface SettingsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  showEditors: boolean;
  onShowEditorsChange: (show: boolean) => void;
  jsonInput: string;
  onJsonChange: (json: string) => void;
  button: React.ReactElement;
}

/**
 * Settings popover component for ProfilerDashboard
 * Provides controls for toggling editor visibility and formatting JSON
 */
export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  isOpen,
  onClose,
  showEditors,
  onShowEditorsChange,
  jsonInput,
  onJsonChange,
  button,
}) => {
  const handlePrettifyJSON = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      onJsonChange(formatted);
      onClose();
    } catch (e) {
      // Invalid JSON - do nothing
    }
  };

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      panelPaddingSize="m"
      anchorPosition="downRight"
    >
      <div style={{ width: '300px' }}>
        <EuiText size="s">
          <h4>Settings</h4>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiForm component="form">
          <EuiFormRow>
            <EuiSwitch
              label="Show query and JSON editors"
              checked={showEditors}
              onChange={(e) => onShowEditorsChange(e.target.checked)}
              compressed
            />
          </EuiFormRow>

          <EuiFormRow label="JSON formatting">
            <EuiButton
              size="s"
              onClick={handlePrettifyJSON}
              fullWidth
            >
              Prettify JSON
            </EuiButton>
          </EuiFormRow>
        </EuiForm>
      </div>
    </EuiPopover>
  );
};
