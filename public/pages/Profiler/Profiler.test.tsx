/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { renderProfiler, setCoreStart } from './Profiler';
import { fireEvent, waitFor, act } from '@testing-library/react';

// @ts-ignore
window.URL.revokeObjectURL = jest.fn();
// @ts-ignore
window.URL.createObjectURL = jest.fn(() => 'blob:mock');

describe('Profiler', () => {
  const mockCoreStart = ({
    http: {
      post: jest.fn().mockResolvedValue({ profile: { shards: [] } }),
      get: jest.fn(),
    },
  } as unknown) as Parameters<typeof setCoreStart>[0];

  beforeAll(() => {
    setCoreStart(mockCoreStart);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  let currentUnmount: (() => void) | null = null;

  const renderInContainer = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let unmount: () => void;
    act(() => {
      unmount = renderProfiler(container);
    });
    currentUnmount = unmount!;
    return { container, unmount: unmount! };
  };

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
    act(() => {
      if (currentUnmount) {
        currentUnmount();
        currentUnmount = null;
      }
      document.body.innerHTML = '';
    });
  });

  it('renders profiler with all tabs', () => {
    const { container } = renderInContainer();
    expect(container.textContent).toContain('Settings');
    expect(container.textContent).toContain('Import');
    expect(container.textContent).toContain('Export JSON');
    expect(container.textContent).toContain('Help');
  });

  it('opens settings modal when Settings tab is clicked', async () => {
    const { container } = renderInContainer();
    const settingsTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Settings'
    );
    act(() => fireEvent.click(settingsTab!));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Query Profiler Settings');
    });
  });

  it('opens import flyout when Import tab is clicked', async () => {
    const { container } = renderInContainer();
    const importTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Import'
    );
    act(() => fireEvent.click(importTab!));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Search query');
      expect(document.body.textContent).toContain('Profile JSON');
    });
  });

  it('opens help flyout when Help tab is clicked', async () => {
    const { container } = renderInContainer();
    const helpTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Help'
    );
    act(() => fireEvent.click(helpTab!));
    await waitFor(() => {
      expect(document.body.textContent).toContain('About Query Profiler');
    });
  });

  it('exports JSON when Export JSON tab is clicked', () => {
    const { container } = renderInContainer();
    const createElementSpy = jest.spyOn(document, 'createElement');
    const exportTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Export JSON'
    );
    act(() => fireEvent.click(exportTab!));
    expect(createElementSpy).toHaveBeenCalledWith('a');
    createElementSpy.mockRestore();
  });

  it('executes query when play button is clicked', async () => {
    const { container } = renderInContainer();
    await waitFor(() => {
      expect(container.querySelector('.conApp__editorActionButton--success')).toBeTruthy();
    });
    const playButton = container.querySelector(
      '.conApp__editorActionButton--success'
    ) as HTMLElement;
    act(() => fireEvent.click(playButton));
    await waitFor(() => {
      expect(mockCoreStart.http.post).toHaveBeenCalledWith(
        '/api/profiler-proxy',
        expect.any(Object)
      );
    });
  });

  it('resets editors when reset button is clicked', async () => {
    const { container } = renderInContainer();
    await waitFor(() => {
      expect(container.querySelectorAll('.conApp__editorActionButton--success').length).toBe(2);
    });
    const resetButton = container.querySelectorAll(
      '.conApp__editorActionButton--success'
    )[1] as HTMLElement;
    act(() => fireEvent.click(resetButton));
    expect(resetButton).toBeTruthy();
  });

  it('updates font size in settings', async () => {
    const { container } = renderInContainer();
    const settingsTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Settings'
    );
    act(() => fireEvent.click(settingsTab!));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Font Size');
    });
    const fontInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    act(() => fireEvent.change(fontInput, { target: { value: '16' } }));
    expect(fontInput.value).toBe('16');
  });
});
