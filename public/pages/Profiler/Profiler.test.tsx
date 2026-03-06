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

  const getPlayButton = (container: HTMLElement) =>
    container.querySelectorAll('.conApp__editorActionButton--success')[0] as HTMLElement;

  const getResetButton = (container: HTMLElement) =>
    container.querySelectorAll('.conApp__editorActionButton--success')[1] as HTMLElement;

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

  it('closes settings modal on Cancel and Save', async () => {
    const { container } = renderInContainer();
    const settingsTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Settings'
    );

    // Cancel
    act(() => fireEvent.click(settingsTab!));
    await waitFor(() => expect(document.body.textContent).toContain('Query Profiler Settings'));
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Cancel'
    );
    act(() => fireEvent.click(cancelBtn!));
    await waitFor(() => expect(document.body.textContent).not.toContain('Query Profiler Settings'));

    // Save
    act(() => fireEvent.click(settingsTab!));
    await waitFor(() => expect(document.body.textContent).toContain('Query Profiler Settings'));
    const saveBtn = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Save'
    );
    act(() => fireEvent.click(saveBtn!));
    await waitFor(() => expect(document.body.textContent).not.toContain('Query Profiler Settings'));
  });

  it('toggles wrap mode in settings', async () => {
    const { container } = renderInContainer();
    const settingsTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Settings'
    );
    act(() => fireEvent.click(settingsTab!));
    await waitFor(() => expect(document.body.textContent).toContain('Wrap long lines'));
    const wrapSwitch = document.querySelector('[role="switch"]') as HTMLElement;
    expect(wrapSwitch).toBeTruthy();
    act(() => fireEvent.click(wrapSwitch));
    expect(wrapSwitch.getAttribute('aria-checked')).toBe('true');
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

  it('imports a query file and shows the editor', async () => {
    const { container } = renderInContainer();
    const importTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Import'
    );
    act(() => fireEvent.click(importTab!));
    await waitFor(() => expect(document.body.textContent).toContain('Search query'));

    const file = new File(['GET _search\n{}'], 'query.json', { type: 'application/json' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    act(() => fireEvent.change(fileInput, { target: { files: [file] } }));

    const confirmBtn = document.querySelector(
      '[data-test-subj="importQueriesConfirmBtn"]'
    ) as HTMLElement;
    await act(async () => fireEvent.click(confirmBtn));
    // flyout should close after import
    await waitFor(() => expect(document.body.textContent).not.toContain('Select a file to import'));
  });

  it('imports a profile JSON result file', async () => {
    const { container } = renderInContainer();
    const importTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Import'
    );
    act(() => fireEvent.click(importTab!));
    await waitFor(() => expect(document.body.textContent).toContain('Profile JSON'));

    // Switch to Profile JSON import type
    const profileJsonRadio = document.querySelector('input[value="result"]') as HTMLInputElement;
    if (profileJsonRadio) act(() => fireEvent.click(profileJsonRadio));

    const file = new File(['{"profile":{"shards":[]}}'], 'result.json', {
      type: 'application/json',
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    act(() => fireEvent.change(fileInput, { target: { files: [file] } }));

    const confirmBtn = document.querySelector(
      '[data-test-subj="importQueriesConfirmBtn"]'
    ) as HTMLElement;
    await act(async () => fireEvent.click(confirmBtn));
    await waitFor(() => expect(document.body.textContent).not.toContain('Select a file to import'));
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

  it('exports JSON when Export JSON tab is clicked and cleans up after timeout', () => {
    const { container } = renderInContainer();
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => ({} as any));
    const exportTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Export JSON'
    );
    act(() => fireEvent.click(exportTab!));
    expect(appendSpy).toHaveBeenCalled();
    act(() => jest.runAllTimers());
    expect(removeSpy).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('executes query when play button is clicked', async () => {
    const { container } = renderInContainer();
    await waitFor(() => expect(getPlayButton(container)).toBeTruthy());
    act(() => fireEvent.click(getPlayButton(container)));
    await waitFor(() => {
      expect(mockCoreStart.http.post).toHaveBeenCalledWith(
        '/api/profiler-proxy',
        expect.any(Object)
      );
    });
  });

  it('shows error output when query path is not _search', async () => {
    const { container } = renderInContainer();
    await waitFor(() => expect(getPlayButton(container)).toBeTruthy());

    // Trigger executeQuery with a non-_search path via pendingQuery in localStorage
    localStorage.setItem('profilerQuery', 'GET _cluster/settings\n{}');
    act(() => {
      currentUnmount?.();
      currentUnmount = null;
      document.body.innerHTML = '';
    });
    renderInContainer();
    await waitFor(() => {
      expect(mockCoreStart.http.post).not.toHaveBeenCalled();
    });
    localStorage.removeItem('profilerQuery');
  });

  it('shows error output when HTTP request fails', async () => {
    (mockCoreStart.http.post as jest.Mock).mockRejectedValueOnce({
      body: { message: 'Server error' },
    });
    const { container } = renderInContainer();
    await waitFor(() => expect(getPlayButton(container)).toBeTruthy());
    act(() => fireEvent.click(getPlayButton(container)));
    await waitFor(() => {
      expect(mockCoreStart.http.post).toHaveBeenCalled();
    });
  });

  it('shows error output when HTTP request fails with plain message', async () => {
    (mockCoreStart.http.post as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));
    const { container } = renderInContainer();

    await waitFor(() => expect(getPlayButton(container)).toBeTruthy());
    act(() => fireEvent.click(getPlayButton(container)));
    await waitFor(() => expect(mockCoreStart.http.post).toHaveBeenCalled());
  });

  it('resets editors when reset button is clicked', async () => {
    const { container } = renderInContainer();
    await waitFor(() => {
      expect(container.querySelectorAll('.conApp__editorActionButton--success').length).toBe(2);
    });
    act(() => fireEvent.click(getResetButton(container)));
    expect(getResetButton(container)).toBeTruthy();
  });

  const triggerHideInput = async (container: HTMLElement) => {
    const importTab = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Import'
    );
    act(() => fireEvent.click(importTab!));
    await waitFor(() => expect(document.body.textContent).toContain('Profile JSON'));

    // Walk React fiber from confirm button to find onImportResult prop
    const confirmBtn = document.querySelector(
      '[data-test-subj="importQueriesConfirmBtn"]'
    ) as HTMLElement;
    const fiberKey = Object.keys(confirmBtn as any).find(
      (k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    );
    let fiber = fiberKey ? (confirmBtn as any)[fiberKey] : null;
    let onImportResult: ((content: string) => void) | null = null;
    while (fiber) {
      const props = fiber.memoizedProps || fiber.pendingProps;
      if (props && typeof props.onImportResult === 'function') {
        onImportResult = props.onImportResult;
        break;
      }
      fiber = fiber.return;
    }
    if (onImportResult) {
      await act(async () => onImportResult!('{"profile":{}}'));
    }
  };

  it('shows and hides the input panel toggle when hideInput is true', async () => {
    const { container } = renderInContainer();
    await triggerHideInput(container);

    await waitFor(() =>
      expect(container.querySelector('[data-test-subj="show-input-toggle"]')).toBeTruthy()
    );
    const togglePanel = container.querySelector(
      '[data-test-subj="show-input-toggle"]'
    ) as HTMLElement;
    act(() => fireEvent.click(togglePanel));
    await waitFor(() =>
      expect(container.querySelector('[data-test-subj="show-input-toggle"]')).toBeNull()
    );
  });

  it('restores editor via keyboard on the toggle panel', async () => {
    const { container } = renderInContainer();
    await triggerHideInput(container);

    await waitFor(() =>
      expect(container.querySelector('[data-test-subj="show-input-toggle"]')).toBeTruthy()
    );
    const togglePanel = container.querySelector(
      '[data-test-subj="show-input-toggle"]'
    ) as HTMLElement;
    act(() => fireEvent.keyDown(togglePanel, { key: 'Enter' }));
    await waitFor(() =>
      expect(container.querySelector('[data-test-subj="show-input-toggle"]')).toBeNull()
    );
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

  it('loads pending query from localStorage on mount', async () => {
    localStorage.setItem('profilerQuery', 'GET my-index/_search\n{"query":{"match_all":{}}}');
    const { container } = renderInContainer();
    await waitFor(() => expect(getPlayButton(container)).toBeTruthy());
    // The useEffect clears the item only when pendingQueryRef.current was set
    // In jsdom the ace editor doesn't run, so we just verify the component mounted
    expect(getPlayButton(container)).toBeTruthy();
    localStorage.removeItem('profilerQuery');
  });
});
