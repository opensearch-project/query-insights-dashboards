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
import { OpenSearchDashboardsContextProvider } from '../../../../../src/plugins/opensearch_dashboards_react/public';
import { CoreStart } from '../../../../../src/core/public';
import 'brace/mode/json';
import 'brace/theme/textmate';

interface Props {
  http: CoreStart['http'];
  coreStart: CoreStart;
}

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
        if (importType === 'query') {
          onImportQuery(content);
        } else {
          onImportResult(content);
        }
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

const ConsoleProfiler: React.FC<Props> = ({ http, coreStart }) => {
  const [input, setInput] = useState(
    `GET _search
{
  "profile": true,
  "query": {
    "match_all": {}
  }
}`
  );

  const [output, setOutput] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [wrapMode, setWrapMode] = useState(false);
  const [hideInput, setHideInput] = useState(false);
  const inputEditorRef = useRef<HTMLDivElement>(null);
  const outputEditorRef = useRef<HTMLDivElement>(null);
  const inputEditorInstance = useRef<any>(null);
  const outputEditorInstance = useRef<any>(null);

  useEffect(() => {
    if (inputEditorRef.current && !inputEditorInstance.current) {
      inputEditorInstance.current = ace.edit(inputEditorRef.current);
      inputEditorInstance.current.setTheme('ace/theme/textmate');
      inputEditorInstance.current.session.setMode('ace/mode/json');
      const initialValue = pendingQueryRef.current || input;
      inputEditorInstance.current.setValue(initialValue, -1);
      inputEditorInstance.current.setOptions({
        fontSize,
        showPrintMargin: false,
        showFoldWidgets: true,
        foldStyle: 'markbegin',
      });
      inputEditorInstance.current.session.setUseWrapMode(wrapMode);
      inputEditorInstance.current.on('change', () => {
        setInput(inputEditorInstance.current.getValue());
      });
    }
    if (outputEditorRef.current && !outputEditorInstance.current) {
      outputEditorInstance.current = ace.edit(outputEditorRef.current);
      outputEditorInstance.current.setTheme('ace/theme/textmate');
      outputEditorInstance.current.session.setMode('ace/mode/json');
      outputEditorInstance.current.setReadOnly(true);
      outputEditorInstance.current.setOptions({
        fontSize,
        showPrintMargin: false,
        showFoldWidgets: true,
        foldStyle: 'markbegin',
      });
      outputEditorInstance.current.session.setUseWrapMode(wrapMode);
      if (pendingQueryRef.current) {
        const q = pendingQueryRef.current;
        pendingQueryRef.current = null;
        executeQuery(q);
      }
    }
    return () => {
      if (inputEditorInstance.current) {
        inputEditorInstance.current.destroy();
      }
      if (outputEditorInstance.current) {
        outputEditorInstance.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (inputEditorInstance.current) {
      inputEditorInstance.current.setFontSize(fontSize);
      inputEditorInstance.current.session.setUseWrapMode(wrapMode);
    }
    if (outputEditorInstance.current) {
      outputEditorInstance.current.setFontSize(fontSize);
      outputEditorInstance.current.session.setUseWrapMode(wrapMode);
    }
  }, [fontSize, wrapMode]);

  useEffect(() => {
    if (outputEditorInstance.current) {
      outputEditorInstance.current.setValue(output, -1);
    }
  }, [output]);

  const pendingQueryRef = useRef<string | null>(localStorage.getItem('profilerQuery'));

  useEffect(() => {
    if (pendingQueryRef.current) {
      localStorage.removeItem('profilerQuery');
    }
  }, []);

  const executeQuery = async (queryInput?: string) => {
    try {
      const queryText = queryInput !== undefined ? queryInput : input;
      const lines = queryText.trim().split('\n');
      const firstLine = lines[0].trim();
      const parts = firstLine.split(/\s+/);
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
      const bodyObj = { profile: true, ...rest };

      const urlParams = new URLSearchParams(window.location.search);
      const dataSourceId = urlParams.get('dataSource') || undefined;

      const response = await http.post('/api/profiler-proxy', {
        body: JSON.stringify({
          method,
          path,
          body: JSON.stringify(bodyObj),
          dataSourceId,
        }),
      });

      const formatted = typeof response === 'string' ? response : JSON.stringify(response, null, 2);

      setOutput(formatted);
    } catch (error: any) {
      const errorMsg = error.body?.message || error.message || JSON.stringify(error, null, 2);
      setOutput(`Error: ${errorMsg}`);
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

  const handleImportQuery = (content: string) => {
    if (inputEditorInstance.current) {
      inputEditorInstance.current.setValue(content, -1);
    }
    setHideInput(false);
  };

  const handleImportResult = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      setOutput(formatted);
    } catch (err) {
      setOutput(content);
    }
    setHideInput(true);
  };

  return (
    <OpenSearchDashboardsContextProvider services={coreStart}>
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
                if (inputEditorInstance.current) inputEditorInstance.current.setValue('', -1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setHideInput(false);
                  if (inputEditorInstance.current) inputEditorInstance.current.setValue('', -1);
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
                style={{
                  position: 'absolute',
                  zIndex: 1000,
                  top: 0,
                  right: '16px',
                  lineHeight: 1,
                }}
              >
                <EuiFlexItem>
                  <EuiToolTip content="Generate profile">
                    <button
                      onClick={() => executeQuery()}
                      className="conApp__editorActionButton conApp__editorActionButton--success"
                      style={{
                        padding: '0 8px',
                        cursor: 'pointer',
                        lineHeight: 'inherit',
                      }}
                    >
                      <EuiIcon type="play" />
                    </button>
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiToolTip content="Reset all">
                    <button
                      onClick={() => {
                        if (inputEditorInstance.current) {
                          inputEditorInstance.current.setValue(
                            `GET _search
{
  "profile": true,
  "query": {
    "match_all": {}
  }
}`,
                            -1
                          );
                        }
                        setOutput('');
                      }}
                      className="conApp__editorActionButton conApp__editorActionButton--success"
                      style={{
                        padding: '0 8px',
                        cursor: 'pointer',
                        lineHeight: 'inherit',
                      }}
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
          <EuiModal onClose={() => setIsSettingsOpen(false)}>
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
                  value={fontSize}
                  min={6}
                  max={50}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 14)}
                />
              </EuiCompressedFormRow>
              <EuiCompressedFormRow>
                <EuiCompressedSwitch
                  label="Wrap long lines"
                  checked={wrapMode}
                  onChange={(e) => setWrapMode(e.target.checked)}
                />
              </EuiCompressedFormRow>
            </EuiModalBody>
            <EuiModalFooter>
              <EuiSmallButtonEmpty onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </EuiSmallButtonEmpty>
              <EuiSmallButton fill onClick={() => setIsSettingsOpen(false)}>
                Save
              </EuiSmallButton>
            </EuiModalFooter>
          </EuiModal>
        )}

        {isImportOpen && (
          <ImportFlyout
            onClose={() => setIsImportOpen(false)}
            onImportQuery={handleImportQuery}
            onImportResult={handleImportResult}
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
                  The Query Profiler helps you understand how OpenSearch executes your search
                  queries by providing detailed performance metrics and execution breakdowns.
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
                <p>Queries should follow this format:</p>
                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                  {`GET _search
{
  "query": {
    "match_all": {}
  }
}`}
                </pre>

                <h3>Features</h3>
                <dl>
                  <dt>
                    <strong>Settings</strong>
                  </dt>
                  <dd>Customize font size and enable line wrapping for better readability</dd>
                  <dt>
                    <strong>Import</strong>
                  </dt>
                  <dd>
                    Load search queries or profile JSON results. Choose &quot;Search query&quot; to
                    import to the left editor or &quot;Profile JSON&quot; to import to the right
                    panel
                  </dd>
                  <dt>
                    <strong>Export JSON</strong>
                  </dt>
                  <dd>Save profiling results as profile.json for later analysis or sharing</dd>
                  <dt>
                    <strong>Auto-profiling</strong>
                  </dt>
                  <dd>The profiler automatically adds &quot;profile&quot;: true to your queries</dd>
                  <dt>
                    <strong>Reset All</strong>
                  </dt>
                  <dd>Clear both query input and profiling results to start fresh</dd>
                </dl>

                <h3>Keyboard Shortcuts</h3>
                <dl>
                  <dt>Ctrl/Cmd + Enter</dt>
                  <dd>Execute the current query</dd>
                </dl>
              </EuiText>
            </EuiFlyoutBody>
          </EuiFlyout>
        )}
      </div>
    </OpenSearchDashboardsContextProvider>
  );
};

let coreStart: CoreStart;

export const setCoreStart = (core: CoreStart) => {
  coreStart = core;
};

let root: any = null;

export const renderProfiler = (element: HTMLElement) => {
  root = createRoot(element);
  root.render(<ConsoleProfiler http={coreStart.http} coreStart={coreStart} />);

  return () => {
    if (root) {
      root.unmount();
      root = null;
    }
  };
};
