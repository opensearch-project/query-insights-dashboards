/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiIcon,
  EuiToolTip,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiText,
  EuiCallOut,
  EuiCompressedFilePicker,
  EuiForm,
  EuiCompressedFormRow,
  EuiCompressedRadioGroup,
  EuiTabs,
  EuiTab,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiSmallButtonEmpty,
  EuiSmallButton,
  EuiCompressedFieldNumber,
  EuiCompressedSwitch,
} from '@elastic/eui';
import { createRoot } from 'react-dom/client';
import ace from 'brace';
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import { DataSourceManagementPluginSetup } from '../../../../../src/plugins/data_source_management/public';
import { QueryInsightsDashboardsPluginStartDependencies } from '../../types';
import { QueryInsightsDataSourceMenu } from '../../components/DataSourcePicker';
import { getDataSourceFromUrl } from '../../utils/datasource-utils';
import { OpenSearchDashboardsContextProvider } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import 'brace/mode/json';
import 'brace/theme/textmate';

const DEFAULT_PROFILER_QUERY = `GET _search\n{\n  "profile": true,\n  "query": {\n    "match_all": {}\n  }\n}`;

const ImportFlyout: React.FC<{
  onClose: () => void;
  onImportQuery: (content: string) => void;
  onImportResult: (content: string) => void;
}> = ({ onClose, onImportQuery, onImportResult }) => {
  const [file, setFile] = React.useState<File>();
  const [error, setError] = React.useState<string>();
  const [importType, setImportType] = React.useState<'query' | 'result'>('query');

  const handleFileChange = (files: FileList | null) => {
    if (!files?.[0]) {
      setFile(undefined);
      return;
    }
    setFile(files[0]);
    setError(undefined);
  };

  const handleImport = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (importType === 'query') onImportQuery(content);
        else onImportResult(content);
        onClose();
      } catch (err) {
        setError('Failed to read file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiText size="s">
          <h2>Import</h2>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error && (
          <>
            <EuiCallOut title="Sorry, there was an error" color="danger">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiForm>
          <EuiCompressedFormRow fullWidth label="Import to">
            <EuiCompressedRadioGroup
              options={[
                { id: 'query', label: 'Search query' },
                { id: 'result', label: 'Profile JSON' },
              ]}
              idSelected={importType}
              onChange={(id) => setImportType(id as 'query' | 'result')}
            />
          </EuiCompressedFormRow>
          <EuiCompressedFormRow fullWidth label="Select a file to import">
            <EuiCompressedFilePicker
              accept=".json,.txt"
              fullWidth
              initialPromptText="Import"
              onChange={handleFileChange}
            />
          </EuiCompressedFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} size="s">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleImport}
              size="s"
              fill
              disabled={!file}
              data-test-subj="importQueriesConfirmBtn"
            >
              Import
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

// Settings modal — uses draft state so Cancel discards and Save applies
const SettingsModal: React.FC<{
  fontSize: number;
  wrapMode: boolean;
  onSave: (fontSize: number, wrapMode: boolean) => void;
  onCancel: () => void;
}> = ({ fontSize, wrapMode, onSave, onCancel }) => {
  const [draftFontSize, setDraftFontSize] = React.useState(fontSize);
  const [draftWrapMode, setDraftWrapMode] = React.useState(wrapMode);

  return (
    <EuiModal onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiText size="s">
            <h2>Query Profiler Settings</h2>
          </EuiText>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCompressedFormRow label="Font Size">
          <EuiCompressedFieldNumber
            value={draftFontSize}
            min={6}
            max={50}
            onChange={(e) => setDraftFontSize(parseInt(e.target.value, 10) || 14)}
          />
        </EuiCompressedFormRow>
        <EuiCompressedFormRow>
          <EuiCompressedSwitch
            label="Wrap long lines"
            checked={draftWrapMode}
            onChange={(e) => setDraftWrapMode(e.target.checked)}
          />
        </EuiCompressedFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiSmallButtonEmpty onClick={onCancel}>Cancel</EuiSmallButtonEmpty>
        <EuiSmallButton fill onClick={() => onSave(draftFontSize, draftWrapMode)}>
          Save
        </EuiSmallButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

// Page component — used inside the query-insights app router
export const ConsoleProfiler: React.FC<{
  core: CoreStart;
  depsStart: QueryInsightsDashboardsPluginStartDependencies;
  params: AppMountParameters;
  dataSourceManagement?: DataSourceManagementPluginSetup;
}> = ({ core, depsStart, params, dataSourceManagement }) => {
  const [dataSource, setDataSource] = useState(getDataSourceFromUrl());
  const initialQuery = localStorage.getItem('profilerQuery') || undefined;
  localStorage.removeItem('profilerQuery');

  return (
    <OpenSearchDashboardsContextProvider services={core}>
      <QueryInsightsDataSourceMenu
        coreStart={core}
        depsStart={depsStart}
        params={params}
        dataSourceManagement={dataSourceManagement}
        setDataSource={setDataSource}
        selectedDataSource={dataSource}
        onManageDataSource={() => {}}
        onSelectedDataSource={() => {}}
        dataSourcePickerReadOnly={false}
      />
      <ProfilerEditor http={core.http} dataSourceId={dataSource?.id} initialQuery={initialQuery} />
    </OpenSearchDashboardsContextProvider>
  );
};

// Core editor — used both by the page component and the dev_tools registration
export const ProfilerEditor: React.FC<{
  http: CoreStart['http'];
  dataSourceId?: string;
  initialQuery?: string;
}> = ({ http, dataSourceId, initialQuery }) => {
  const inputRef = useRef(DEFAULT_PROFILER_QUERY);
  const [output, setOutput] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wrapMode, setWrapMode] = useState(false);
  const [hideInput, setHideInput] = useState(false);

  const inputEditorRef = useRef<HTMLDivElement>(null);
  const outputEditorRef = useRef<HTMLDivElement>(null);
  const inputEditorInstance = useRef<ReturnType<typeof ace.edit> | null>(null);
  const outputEditorInstance = useRef<ReturnType<typeof ace.edit> | null>(null);
  const dataSourceIdRef = useRef<string | undefined>(dataSourceId);

  useEffect(() => {
    dataSourceIdRef.current = dataSourceId;
  }, [dataSourceId]);

  useEffect(() => {
    if (inputEditorRef.current && !inputEditorInstance.current) {
      inputEditorInstance.current = ace.edit(inputEditorRef.current);
      inputEditorInstance.current.setTheme('ace/theme/textmate');
      inputEditorInstance.current.session.setMode('ace/mode/json');
      inputEditorInstance.current.session.setUseWorker(false);
      inputEditorInstance.current.setValue(initialQuery || DEFAULT_PROFILER_QUERY, -1);
      inputEditorInstance.current.setOptions({
        fontSize,
        showPrintMargin: false,
        showFoldWidgets: true,
        foldStyle: 'markbegin',
      });
      inputEditorInstance.current.session.setUseWrapMode(wrapMode);
      inputEditorInstance.current.on(
        'change',
        () => (inputRef.current = inputEditorInstance.current!.getValue())
      );
    }
    if (outputEditorRef.current && !outputEditorInstance.current) {
      outputEditorInstance.current = ace.edit(outputEditorRef.current);
      outputEditorInstance.current.setTheme('ace/theme/textmate');
      outputEditorInstance.current.session.setMode('ace/mode/json');
      outputEditorInstance.current.session.setUseWorker(false);
      outputEditorInstance.current.setReadOnly(true);
      outputEditorInstance.current.setOptions({
        fontSize,
        showPrintMargin: false,
        showFoldWidgets: true,
        foldStyle: 'markbegin',
      });
      outputEditorInstance.current.session.setUseWrapMode(wrapMode);
      if (initialQuery) executeQuery(initialQuery);
    }
    return () => {
      inputEditorInstance.current?.destroy();
      inputEditorInstance.current = null;
      outputEditorInstance.current?.destroy();
      outputEditorInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    inputEditorInstance.current?.setFontSize(fontSize);
    inputEditorInstance.current?.session.setUseWrapMode(wrapMode);
    outputEditorInstance.current?.setFontSize(fontSize);
    outputEditorInstance.current?.session.setUseWrapMode(wrapMode);
  }, [fontSize, wrapMode]);

  useEffect(() => {
    outputEditorInstance.current?.setValue(output, -1);
  }, [output]);

  const executeQuery = async (queryInput?: string) => {
    try {
      const queryText = queryInput !== undefined ? queryInput : inputRef.current;
      const lines = queryText.trim().split('\n');
      const parts = lines[0].trim().split(/\s+/);
      const method = parts[0] || 'GET';
      const path = parts[1] || '_search';
      const bodyText = lines.slice(1).join('\n').trim();

      if (path.includes('..') || !path.split('?')[0].endsWith('_search')) {
        setOutput(
          'Error: Profiler only supports search queries. Please use Dev Tools Console for other operations.'
        );
        return;
      }

      const { profile: _p, ...rest } = bodyText ? JSON.parse(bodyText) : {};
      const response = await http.post('/api/profiler-proxy', {
        body: JSON.stringify({
          method,
          path,
          body: JSON.stringify({ profile: true, ...rest }),
          dataSourceId: dataSourceIdRef.current,
        }),
      });
      setOutput(typeof response === 'string' ? response : JSON.stringify(response, null, 2));
    } catch (error) {
      const err = error as { body?: { message?: string }; message?: string };
      setOutput(`Error: ${err.body?.message || err.message || JSON.stringify(error, null, 2)}`);
    }
  };

  const exportJson = () => {
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profile.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div>
      <EuiTabs size="s">
        <EuiTab onClick={() => setIsSettingsOpen(true)}>Settings</EuiTab>
        <EuiTab onClick={() => setIsImportOpen(true)}>Import</EuiTab>
        <EuiTab onClick={exportJson}>Export JSON</EuiTab>
        <EuiTab onClick={() => setIsHelpOpen(true)}>Help</EuiTab>
      </EuiTabs>

      <div style={{ height: '400px', width: '100%', display: 'flex' }}>
        {hideInput && (
          <div
            role="button"
            tabIndex={0}
            data-test-subj="show-input-toggle"
            style={{
              width: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f7fa',
              borderRight: '1px solid #D4DAE5',
              cursor: 'pointer',
            }}
            onClick={() => {
              setHideInput(false);
              inputEditorInstance.current?.setValue('', -1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setHideInput(false);
                inputEditorInstance.current?.setValue('', -1);
              }
            }}
          >
            <EuiToolTip content="Show query editor">
              <EuiIcon type="plus" />
            </EuiToolTip>
          </div>
        )}
        <div
          style={{
            display: hideInput ? 'none' : 'flex',
            flex: 1,
            position: 'relative',
            borderRight: '1px solid #D4DAE5',
          }}
        >
          <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <EuiFlexGroup
              gutterSize="none"
              responsive={false}
              style={{ position: 'absolute', zIndex: 1000, top: 0, right: '16px', lineHeight: 1 }}
            >
              <EuiFlexItem>
                <EuiToolTip content="Generate profile">
                  <button
                    onClick={() => executeQuery()}
                    className="conApp__editorActionButton conApp__editorActionButton--success"
                    style={{ padding: '0 8px', cursor: 'pointer', lineHeight: 'inherit' }}
                  >
                    <EuiIcon type="play" />
                  </button>
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiToolTip content="Reset all">
                  <button
                    onClick={() => {
                      inputEditorInstance.current?.setValue(DEFAULT_PROFILER_QUERY, -1);
                      setOutput('');
                    }}
                    className="conApp__editorActionButton conApp__editorActionButton--success"
                    style={{ padding: '0 8px', cursor: 'pointer', lineHeight: 'inherit' }}
                  >
                    <EuiIcon type="refresh" />
                  </button>
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <div ref={inputEditorRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative', background: '#FFF' }}>
          <div ref={outputEditorRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          fontSize={fontSize}
          wrapMode={wrapMode}
          onSave={(newFontSize, newWrapMode) => {
            setFontSize(newFontSize);
            setWrapMode(newWrapMode);
            setIsSettingsOpen(false);
          }}
          onCancel={() => setIsSettingsOpen(false)}
        />
      )}

      {isImportOpen && (
        <ImportFlyout
          onClose={() => setIsImportOpen(false)}
          onImportQuery={(c) => {
            inputEditorInstance.current?.setValue(c, -1);
            setHideInput(false);
          }}
          onImportResult={(c) => {
            try {
              setOutput(JSON.stringify(JSON.parse(c), null, 2));
            } catch {
              setOutput(c);
            }
            setHideInput(true);
          }}
        />
      )}

      {isHelpOpen && (
        <EuiFlyout onClose={() => setIsHelpOpen(false)} size="s">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2>Query Profiler Help</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText size="s">
              <h3>About Query Profiler</h3>
              <p>
                The Query Profiler helps you understand how OpenSearch executes your search queries
                by providing detailed performance metrics and execution breakdowns.
              </p>
              <h3>How to Use</h3>
              <p>
                1. Enter your search query in the left editor panel
                <br />
                2. Click the play button to execute and generate profile
                <br />
                3. View the profiling results in the right panel
                <br />
                4. Use the reset button to clear both query and results
              </p>
              <h3>Query Format</h3>
              <pre
                style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}
              >{`GET _search\n{\n  "query": {\n    "match_all": {}\n  }\n}`}</pre>
              <h3>Features</h3>
              <dl>
                <dt>
                  <strong>Settings</strong>
                </dt>
                <dd>Customize font size and enable line wrapping</dd>
                <dt>
                  <strong>Import</strong>
                </dt>
                <dd>Load search queries or profile JSON results</dd>
                <dt>
                  <strong>Export JSON</strong>
                </dt>
                <dd>Save profiling results as profile.json</dd>
                <dt>
                  <strong>Auto-profiling</strong>
                </dt>
                <dd>Automatically adds &quot;profile&quot;: true to your queries</dd>
                <dt>
                  <strong>Reset All</strong>
                </dt>
                <dd>Clear both query input and profiling results</dd>
              </dl>
            </EuiText>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </div>
  );
};

// Dev tools registration — kept for backward compatibility
let coreStart: CoreStart;
export const setCoreStart = (core: CoreStart) => {
  coreStart = core;
};

let root: ReturnType<typeof createRoot> | null = null;
export const renderProfiler = (element: HTMLElement, dataSourceId?: string) => {
  const urlDataSourceId =
    new URLSearchParams(window.location.search).get('dataSource') || undefined;
  const storedDataSourceId = localStorage.getItem('profilerDataSourceId') || undefined;
  localStorage.removeItem('profilerDataSourceId');
  const effectiveDataSourceId = urlDataSourceId || dataSourceId || storedDataSourceId;
  const initialQuery = localStorage.getItem('profilerQuery') || undefined;
  localStorage.removeItem('profilerQuery');

  if (root) {
    root.unmount();
    root = null;
  }

  root = createRoot(element);
  root.render(
    <OpenSearchDashboardsContextProvider services={coreStart}>
      <ProfilerEditor
        http={coreStart.http}
        dataSourceId={effectiveDataSourceId}
        initialQuery={initialQuery}
      />
    </OpenSearchDashboardsContextProvider>
  );

  return () => {
    if (root) {
      root.unmount();
      root = null;
    }
  };
};
