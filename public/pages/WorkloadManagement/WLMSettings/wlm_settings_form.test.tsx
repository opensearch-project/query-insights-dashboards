/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WLMSettingsForm } from './wlm_settings_form';
import { WLM_SETTING_DEFS, emptyDraft, WlmGroupSettingsDraft } from './wlm_settings_types';

const renderForm = (override?: Partial<WlmGroupSettingsDraft>) => {
  const draft = { ...emptyDraft(), ...override };
  const onChange = jest.fn();
  const utils = render(
    <WLMSettingsForm initialSettings={undefined} draft={draft} onChange={onChange} />
  );
  return { ...utils, draft, onChange };
};

describe('WLMSettingsForm', () => {
  it('renders one row per defined setting key', () => {
    renderForm();
    const expectedToggles = WLM_SETTING_DEFS.map((def) => `wlm-setting-toggle-${def.key}`);
    const expectedInputs = WLM_SETTING_DEFS.filter((def) => def.kind !== 'boolean').map(
      (def) => `wlm-setting-input-${def.key}`
    );
    expect(expectedToggles.every((id) => screen.queryByTestId(id) !== null)).toBe(true);
    expect(expectedInputs.every((id) => screen.queryByTestId(id) !== null)).toBe(true);
    expect(
      screen.queryByTestId('wlm-setting-input-override_request_values')
    ).not.toBeInTheDocument();
  });

  it('keeps inputs disabled when the toggle is off', () => {
    renderForm();
    const input = screen.getByTestId('wlm-setting-input-search.max_buckets');
    expect(input).toBeDisabled();
  });

  it('fires onChange enabling a key when the toggle is clicked', () => {
    const { onChange } = renderForm();
    const toggle = screen.getByTestId('wlm-setting-toggle-search.max_buckets');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0];
    expect(next['search.max_buckets'].enabled).toBe(true);
  });

  it('fires onChange flipping override_request_values value when toggled', () => {
    const { onChange } = renderForm();
    const toggle = screen.getByTestId('wlm-setting-toggle-override_request_values');
    fireEvent.click(toggle);
    const next = onChange.mock.calls[0][0];
    expect(next.override_request_values).toEqual({
      enabled: true,
      value: 'true',
      wasSetOnServer: false,
    });
  });

  it('shows a validation error when an enabled int row has an invalid value', () => {
    const draftOverride: Partial<WlmGroupSettingsDraft> = {
      'search.batched_reduce_size': { enabled: true, value: '1', wasSetOnServer: false },
    };
    renderForm(draftOverride);
    expect(screen.getByText(/Must be ≥ 2/)).toBeInTheDocument();
  });

  it('forwards typed values via onChange', () => {
    const draftOverride: Partial<WlmGroupSettingsDraft> = {
      'search.max_buckets': { enabled: true, value: '', wasSetOnServer: false },
    };
    const { onChange } = renderForm(draftOverride);
    const input = screen.getByTestId('wlm-setting-input-search.max_buckets');
    fireEvent.change(input, { target: { value: '5000' } });
    const next = onChange.mock.calls[0][0];
    expect(next['search.max_buckets'].value).toBe('5000');
  });
});
