/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from '../../../../src/core/public';
import { monaco } from '@osd/monaco';

const ConsoleProfiler: React.FC<{ http: CoreStart['http'] }> = ({ http }) => {
  const [input, setInput] = React.useState('GET _search\n{\n  "profile": true,\n  "query": {\n    "match_all": {}\n  }\n}');
  const [output, setOutput] = React.useState('');
  const inputEditorRef = useRef<any>(null);
  const outputEditorRef = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (document.getElementById('input-editor') && document.getElementById('output-editor')) {
        inputEditorRef.current = monaco.editor.create(document.getElementById('input-editor')!, {
          value: input,
          language: 'json',
          theme: 'vs',
          fontSize: 14,
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
        });

        outputEditorRef.current = monaco.editor.create(document.getElementById('output-editor')!, {
          value: output,
          language: 'json',
          theme: 'vs',
          fontSize: 14,
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
          readOnly: true,
        });

        inputEditorRef.current.onDidChangeModelContent(() => {
          setInput(inputEditorRef.current.getValue());
        });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (inputEditorRef.current) inputEditorRef.current.dispose();
      if (outputEditorRef.current) outputEditorRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (outputEditorRef.current) {
      outputEditorRef.current.setValue(output);
    }
  }, [output]);

  React.useEffect(() => {
    const storedQuery = localStorage.getItem('profilerQuery');
    if (storedQuery) {
      setInput(storedQuery);
      localStorage.removeItem('profilerQuery');
      // Auto-execute the query
      setTimeout(() => {
        executeQuery();
      }, 500);
    }
  }, []);

  const executeQuery = async () => {
    try {
      const lines = input.trim().split('\n');
      const firstLine = lines[0].trim();
      const method = firstLine.split(' ')[0] || 'GET';
      const path = firstLine.split(' ')[1] || '_search';
      const body = lines.slice(1).join('\n').trim();
      
      const response = await http.post('/api/profiler-proxy', {
        body: JSON.stringify({ method, path, body: body || '{}' })
      });
      
      setOutput(typeof response === 'string' ? response : JSON.stringify(response, null, 2));
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
  };

  const importJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setOutput(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const exportJson = () => {
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profiler-output.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ height: '400px', display: 'flex', flexDirection: 'column', fontFamily: 'Monaco, monospace' }}>
      <div style={{ padding: '8px', borderBottom: '1px solid #ccc', background: '#f5f5f5', display: 'flex' }}>
        <button onClick={executeQuery} style={{ padding: '4px 8px', marginRight: '8px' }}>▶ Profile</button>
        <button onClick={() => setOutput('')} style={{ padding: '4px 8px' }}>Clear</button>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={importJson} style={{ padding: '4px 8px', marginRight: '8px' }}>Import JSON</button>
          <button onClick={exportJson} style={{ padding: '4px 8px' }}>Export JSON</button>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        <div id="input-editor" style={{ width: '50%', height: '100%' }} />
        <div style={{ width: '2px', background: '#ccc' }} />
        <div id="output-editor" style={{ width: '50%', height: '100%' }} />
      </div>
    </div>
  );
};

let coreStart: CoreStart;

export const setCoreStart = (core: CoreStart) => {
  coreStart = core;
};

export const renderProfiler = (element: HTMLElement) => {
  element.style.height = '400px';
  element.style.display = 'flex';
  element.style.flexDirection = 'column';
  
  ReactDOM.render(<ConsoleProfiler http={coreStart.http} />, element);
  
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};