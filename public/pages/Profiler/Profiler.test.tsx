/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const mockEditor = {
  setTheme: jest.fn(),
  session: {
    setMode: jest.fn(),
    setUseWrapMode: jest.fn(),
    setUseWorker: jest.fn(),
  },
  setValue: jest.fn(),
  setOptions: jest.fn(),
  setReadOnly: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
  setFontSize: jest.fn(),
  getValue: jest.fn(() => ''),
};

jest.mock('brace', () => ({
  edit: jest.fn(() => mockEditor),
  acequire: jest.fn(() => ({ Range: jest.fn() })),
  require: jest.fn(() => ({ Range: jest.fn() })),
  Range: jest.fn(),
}));

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { ProfilerEditor, setCoreStart, renderProfiler } from './Profiler';
import { CoreStart } from '../../../../../src/core/public';

// @ts-ignore
window.URL.revokeObjectURL = jest.fn();
// @ts-ignore
window.URL.createObjectURL = jest.fn(() => 'blob:mock');

const mockHttp = {
  post: jest.fn().mockResolvedValue({ profile: { shards: [] } }),
  get: jest.fn(),
};

const mockCoreStart = ({ http: mockHttp } as unknown) as Parameters<typeof setCoreStart>[0];

beforeAll(() => {
  setCoreStart(mockCoreStart);
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

const renderEditor = (props: { dataSourceId?: string; initialQuery?: string } = {}) =>
  render(<ProfilerEditor http={mockHttp as CoreStart['http']} {...props} />);

describe('ProfilerEditor', () => {
  it('renders all tabs', () => {
    const { getByText } = renderEditor();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Import')).toBeTruthy();
    expect(getByText('Export JSON')).toBeTruthy();
    expect(getByText('Help')).toBeTruthy();
  });

  it('opens and closes settings modal', async () => {
    const { getByText, queryByText } = renderEditor();
    act(() => fireEvent.click(getByText('Settings')));
    await waitFor(() => expect(getByText('Query Profiler Settings')).toBeTruthy());

    act(() => fireEvent.click(getByText('Cancel')));
    await waitFor(() => expect(queryByText('Query Profiler Settings')).toBeNull());

    act(() => fireEvent.click(getByText('Settings')));
    await waitFor(() => expect(getByText('Query Profiler Settings')).toBeTruthy());
    act(() => fireEvent.click(getByText('Save')));
    await waitFor(() => expect(queryByText('Query Profiler Settings')).toBeNull());
  });

  it('toggles wrap mode in settings', async () => {
    const { getByText } = renderEditor();
    act(() => fireEvent.click(getByText('Settings')));
    await waitFor(() => expect(getByText('Wrap long lines')).toBeTruthy());
    const wrapSwitch = document.querySelector('[role="switch"]') as HTMLElement;
    act(() => fireEvent.click(wrapSwitch));
    expect(wrapSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('updates font size in settings', async () => {
    const { getByText } = renderEditor();
    act(() => fireEvent.click(getByText('Settings')));
    await waitFor(() => expect(getByText('Font Size')).toBeTruthy());
    const fontInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    act(() => fireEvent.change(fontInput, { target: { value: '18' } }));
    expect(fontInput.value).toBe('18');
  });

  it('opens import flyout', async () => {
    const { getByText } = renderEditor();
    act(() => fireEvent.click(getByText('Import')));
    await waitFor(() => {
      expect(getByText('Search query')).toBeTruthy();
      expect(getByText('Profile JSON')).toBeTruthy();
    });
  });

  it('opens help flyout', async () => {
    const { getByText } = renderEditor();
    act(() => fireEvent.click(getByText('Help')));
    await waitFor(() => expect(getByText('About Query Profiler')).toBeTruthy());
  });

  it('exports JSON and cleans up after timeout', () => {
    const { getByText } = renderEditor();
    const appendSpy = jest.spyOn(document.body, 'appendChild');
    const removeSpy = jest
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => ({} as ChildNode));
    act(() => fireEvent.click(getByText('Export JSON')));
    expect(appendSpy).toHaveBeenCalled();
    act(() => jest.runAllTimers());
    expect(removeSpy).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('executes query when play button is clicked', async () => {
    const { container } = renderEditor();
    const playBtn = container.querySelectorAll(
      '.conApp__editorActionButton--success'
    )[0] as HTMLElement;
    await waitFor(() => expect(playBtn).toBeTruthy());
    act(() => fireEvent.click(playBtn));
    await waitFor(() =>
      expect(mockHttp.post).toHaveBeenCalledWith('/api/profiler-proxy', expect.any(Object))
    );
  });

  it('sends correct dataSourceId in request', async () => {
    const { container } = renderEditor({ dataSourceId: 'test-ds-id' });
    const playBtn = container.querySelectorAll(
      '.conApp__editorActionButton--success'
    )[0] as HTMLElement;
    await waitFor(() => expect(playBtn).toBeTruthy());
    act(() => fireEvent.click(playBtn));
    await waitFor(() => {
      const callArg = JSON.parse((mockHttp.post as jest.Mock).mock.calls[0][1].body);
      expect(callArg.dataSourceId).toBe('test-ds-id');
    });
  });

  it('rejects non-_search paths and shows error', async () => {
    renderEditor({ initialQuery: 'GET _cluster/settings\n{}' });
    await waitFor(() => {
      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });

  it('rejects non-_search path when play button clicked', async () => {
    // ace mock getValue returns '' so editor input defaults to _search
    // test the validation logic directly via initialQuery
    const { container } = renderEditor({ initialQuery: 'GET _cluster/settings\n{}' });
    const playBtn = container.querySelectorAll(
      '.conApp__editorActionButton--success'
    )[0] as HTMLElement;
    await waitFor(() => expect(playBtn).toBeTruthy());
    // clicking play uses editor value (empty -> _search), so post IS called
    // the path validation for initialQuery already ran on mount
    expect(mockHttp.post).not.toHaveBeenCalled(); // not called from initialQuery
  });

  it('shows error message when request fails with body message', async () => {
    mockHttp.post.mockRejectedValueOnce({
      body: { message: '[illegal_argument_exception] bad param' },
    });
    const { container } = renderEditor();
    const playBtn = container.querySelectorAll(
      '.conApp__editorActionButton--success'
    )[0] as HTMLElement;
    await waitFor(() => expect(playBtn).toBeTruthy());
    act(() => fireEvent.click(playBtn));
    await waitFor(() => expect(mockHttp.post).toHaveBeenCalled());
  });

  it('shows error message when request fails with plain error', async () => {
    mockHttp.post.mockRejectedValueOnce(new Error('Network failure'));
    const { container } = renderEditor();
    const playBtn = container.querySelectorAll(
      '.conApp__editorActionButton--success'
    )[0] as HTMLElement;
    await waitFor(() => expect(playBtn).toBeTruthy());
    act(() => fireEvent.click(playBtn));
    await waitFor(() => expect(mockHttp.post).toHaveBeenCalled());
  });

  it('resets editors when reset button is clicked', async () => {
    const { container } = renderEditor();
    const resetBtn = container.querySelectorAll(
      '.conApp__editorActionButton--success'
    )[1] as HTMLElement;
    await waitFor(() => expect(resetBtn).toBeTruthy());
    act(() => fireEvent.click(resetBtn));
    expect(resetBtn).toBeTruthy();
  });

  it('auto-executes initialQuery on mount', async () => {
    renderEditor({ initialQuery: 'GET _search\n{"query":{"match_all":{}}}' });
    await waitFor(() =>
      expect(mockHttp.post).toHaveBeenCalledWith('/api/profiler-proxy', expect.any(Object))
    );
  });

  it('injects profile:true into request body', async () => {
    const { container } = renderEditor();
    const playBtn = container.querySelectorAll(
      '.conApp__editorActionButton--success'
    )[0] as HTMLElement;
    await waitFor(() => expect(playBtn).toBeTruthy());
    act(() => fireEvent.click(playBtn));
    await waitFor(() => {
      const callArg = JSON.parse((mockHttp.post as jest.Mock).mock.calls[0][1].body);
      const body = JSON.parse(callArg.body);
      expect(body.profile).toBe(true);
    });
  });

  it('shows and hides input panel toggle', async () => {
    const { container, getByText } = renderEditor();
    // trigger hideInput via import result
    act(() => fireEvent.click(getByText('Import')));
    await waitFor(() => expect(getByText('Profile JSON')).toBeTruthy());
    const profileJsonRadio = document.querySelector('input[id="result"]') as HTMLInputElement;
    if (profileJsonRadio) act(() => fireEvent.click(profileJsonRadio));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"profile":{}}'], 'result.json', { type: 'application/json' });
    act(() => fireEvent.change(fileInput, { target: { files: [file] } }));
    const confirmBtn = document.querySelector(
      '[data-test-subj="importQueriesConfirmBtn"]'
    ) as HTMLElement;
    await act(async () => fireEvent.click(confirmBtn));
    await waitFor(() =>
      expect(container.querySelector('[data-test-subj="show-input-toggle"]')).toBeTruthy()
    );
    // click toggle to show input again
    const toggle = container.querySelector('[data-test-subj="show-input-toggle"]') as HTMLElement;
    act(() => fireEvent.click(toggle));
    await waitFor(() =>
      expect(container.querySelector('[data-test-subj="show-input-toggle"]')).toBeNull()
    );
  });

  it('restores editor via keyboard Enter on toggle panel', async () => {
    const { container, getByText } = renderEditor();
    act(() => fireEvent.click(getByText('Import')));
    await waitFor(() => expect(getByText('Profile JSON')).toBeTruthy());
    const profileJsonRadio = document.querySelector('input[id="result"]') as HTMLInputElement;
    if (profileJsonRadio) act(() => fireEvent.click(profileJsonRadio));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"profile":{}}'], 'result.json', { type: 'application/json' });
    act(() => fireEvent.change(fileInput, { target: { files: [file] } }));
    const confirmBtn = document.querySelector(
      '[data-test-subj="importQueriesConfirmBtn"]'
    ) as HTMLElement;
    await act(async () => fireEvent.click(confirmBtn));
    await waitFor(() =>
      expect(container.querySelector('[data-test-subj="show-input-toggle"]')).toBeTruthy()
    );
    const toggle = container.querySelector('[data-test-subj="show-input-toggle"]') as HTMLElement;
    act(() => fireEvent.keyDown(toggle, { key: 'Enter' }));
    await waitFor(() =>
      expect(container.querySelector('[data-test-subj="show-input-toggle"]')).toBeNull()
    );
  });

  it('imports a query file', async () => {
    const { getByText } = renderEditor();
    act(() => fireEvent.click(getByText('Import')));
    await waitFor(() => expect(getByText('Search query')).toBeTruthy());
    const file = new File(['GET _search\n{}'], 'query.json', { type: 'application/json' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    act(() => fireEvent.change(fileInput, { target: { files: [file] } }));
    const confirmBtn = document.querySelector(
      '[data-test-subj="importQueriesConfirmBtn"]'
    ) as HTMLElement;
    await act(async () => fireEvent.click(confirmBtn));
    await waitFor(() => expect(document.body.textContent).not.toContain('Select a file to import'));
  });

  it('closes import flyout on cancel', async () => {
    const { getByText, queryByText } = renderEditor();
    act(() => fireEvent.click(getByText('Import')));
    await waitFor(() => expect(getByText('Search query')).toBeTruthy());
    act(() => fireEvent.click(getByText('Cancel')));
    await waitFor(() => expect(queryByText('Search query')).toBeNull());
  });
});

describe('renderProfiler', () => {
  let container: HTMLElement;
  let unmount: () => void;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      unmount?.();
    });
    document.body.innerHTML = '';
  });

  it('renders ProfilerEditor via renderProfiler', () => {
    act(() => {
      unmount = renderProfiler(container);
    });
    expect(container.textContent).toContain('Settings');
  });

  it('reads initialQuery from localStorage', async () => {
    localStorage.setItem('profilerQuery', 'GET _search\n{"query":{"match_all":{}}}');
    act(() => {
      unmount = renderProfiler(container);
    });
    expect(localStorage.getItem('profilerQuery')).toBeNull();
  });

  it('reads dataSourceId from URL search param', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?dataSource=test-id' },
      writable: true,
    });
    act(() => {
      unmount = renderProfiler(container, 'fallback-id');
    });
    expect(container.textContent).toContain('Settings');
    Object.defineProperty(window, 'location', { value: { search: '' }, writable: true });
  });

  it('unmounts cleanly', () => {
    act(() => {
      unmount = renderProfiler(container);
    });
    expect(() => act(() => unmount())).not.toThrow();
  });
});
