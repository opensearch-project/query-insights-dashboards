/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiTextArea,
  EuiText,
  EuiButton,
  EuiRadio,
} from '@elastic/eui';

export type InputMode = 'enterQuery' | 'addJson';

interface QueryEditorProps {
  queryInput: string;
  jsonInput: string;
  inputMode: InputMode;
  onQueryChange: (value: string) => void;
  onJsonChange: (value: string) => void;
  onInputModeChange: (mode: InputMode) => void;
  onImportJson: () => void;
}

// Shared styles
const HEADER_STYLE = {
  padding: '10px 16px',
  borderBottom: '1px solid #D3DAE6',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'white',
  height: '48px',
  flexShrink: 0,
} as const;

const EDITOR_STYLE = {
  flex: 1,
  border: 'none',
  borderRadius: 0,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
  fontSize: '13px',
  padding: '12px',
  minHeight: '100%',
} as const;

/**
 * Dual editor component for query and JSON input with mode toggle
 */
export const QueryEditor: React.FC<QueryEditorProps> = ({
  queryInput,
  jsonInput,
  inputMode,
  onQueryChange,
  onJsonChange,
  onInputModeChange,
  onImportJson,
}) => {
  const handleJsonKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = jsonInput.substring(0, cursorPos);
      const textAfterCursor = jsonInput.substring(cursorPos);
      
      // Calculate indentation based on bracket nesting (default 2 spaces)
      const openBrackets = (textBeforeCursor.match(/[{[]/g) || []).length;
      const closeBrackets = (textBeforeCursor.match(/[}\]]/g) || []).length;
      const indentLevel = Math.max(0, openBrackets - closeBrackets);
      const indent = ' '.repeat(indentLevel * 2);
      
      e.preventDefault();
      const newValue = textBeforeCursor + '\n' + indent + textAfterCursor;
      onJsonChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos + 1 + indent.length;
      }, 0);
    }
  };

  const renderEditor = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  ) => (
    <div style={{ flex: 1, display: 'flex' }}>
      <EuiTextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        fullWidth
        compressed
        resize="none"
        style={{
          ...EDITOR_STYLE,
          tabSize: 2,
        }}
      />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Mode selection */}
      <div style={{ padding: '16px', borderBottom: '1px solid #D3DAE6', display: 'flex', gap: '24px' }}>
        <EuiRadio
          id="enterQuery"
          label="Enter Query"
          checked={inputMode === 'enterQuery'}
          onChange={() => onInputModeChange('enterQuery')}
          compressed
        />
        <EuiRadio
          id="addJson"
          label="Add JSON"
          checked={inputMode === 'addJson'}
          onChange={() => onInputModeChange('addJson')}
          compressed
        />
      </div>

      {inputMode === 'enterQuery' ? (
        // Dual editor mode
        <div style={{ display: 'flex', flex: 1, minHeight: '400px' }}>
          {/* Query editor */}
          <div style={{ 
            flex: 1,
            borderRight: '1px solid #D3DAE6',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
          }}>
            <div style={HEADER_STYLE}>
              <EuiText size="s" style={{ fontWeight: 600, color: '#343741' }}>
                Enter query
              </EuiText>
            </div>
            {renderEditor(queryInput, onQueryChange, 'Enter your OpenSearch query here...')}
          </div>

          {/* JSON editor */}
          <div style={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
          }}>
            <div style={HEADER_STYLE} />
            {renderEditor(jsonInput, onJsonChange, '', handleJsonKeyDown)}
          </div>
        </div>
      ) : (
        // JSON-only mode
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          minHeight: '400px',
        }}>
          <div style={HEADER_STYLE}>
            <EuiText size="s" style={{ fontWeight: 600, color: '#343741' }}>
              Enter JSON
            </EuiText>
            <EuiButton size="s" iconType="importAction" onClick={onImportJson}>
              Import JSON
            </EuiButton>
          </div>
          {renderEditor(jsonInput, onJsonChange, 'Paste profile JSON here or use Import JSON button...', handleJsonKeyDown)}
        </div>
      )}
    </div>
  );
};
