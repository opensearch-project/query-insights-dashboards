/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { EuiFieldSearch, EuiText, EuiBadge, EuiPanel } from '@elastic/eui';
import { SearchQueryRecord } from '../../types/types';

// --- Field definitions ---
export interface FieldDef {
  /** Display label shown in autocomplete */
  label: string;
  /** Internal key used in the expression */
  key: string;
  /** How to extract the value from a SearchQueryRecord */
  accessor: (q: SearchQueryRecord) => any;
  /** Field type determines available operators */
  type: 'string' | 'number' | 'array' | 'boolean';
  /** Unit label for display (e.g., 'ms', 'B') */
  unit?: string;
}

const OPERATORS_BY_TYPE: Record<string, Array<{ label: string; description: string }>> = {
  number: [
    { label: '=', description: 'equals' },
    { label: '!=', description: 'not equals' },
    { label: '>', description: 'greater than' },
    { label: '<', description: 'less than' },
    { label: '>=', description: 'greater or equal' },
    { label: '<=', description: 'less or equal' },
    { label: 'between', description: 'between two values e.g. (10, 100)' },
  ],
  string: [
    { label: '=', description: 'equals' },
    { label: '!=', description: 'not equals' },
    { label: 'starts_with', description: 'starts with' },
    { label: 'ends_with', description: 'ends with' },
    { label: 'contains', description: 'contains substring' },
  ],
  array: [
    { label: '=', description: 'contains' },
    { label: '!=', description: 'does not contain' },
  ],
  boolean: [
    { label: '=', description: 'equals' },
    { label: '!=', description: 'not equals' },
  ],
};

// --- Expression parser ---
export interface FilterCondition {
  field: string;
  operator: string;
  value: string;
}

export interface ParsedExpression {
  conditions: FilterCondition[];
  conjunctions: Array<'AND' | 'OR'>;
  freeText: string;
}

export function parseExpression(input: string): ParsedExpression {
  const conditions: FilterCondition[] = [];
  const conjunctions: Array<'AND' | 'OR'> = [];
  let freeText = '';

  if (!input.trim()) return { conditions, conjunctions, freeText };

  // Split by AND/OR (case-insensitive), keeping the conjunction
  const parts = input.split(/\s+(AND|OR)\s+/i);
  const tokens: string[] = [];
  const conjs: Array<'AND' | 'OR'> = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i].trim();
    if (/^(AND|OR)$/i.test(p)) {
      conjs.push(p.toUpperCase() as 'AND' | 'OR');
    } else if (p) {
      tokens.push(p);
    }
  }

  const opRegex = /^(.+?)\s*(!=|>=|<=|>|<|=|starts_with|ends_with|contains|between)\s+(.+)$/i;
  const freeTextParts: string[] = [];

  for (const token of tokens) {
    const match = opRegex.exec(token);
    if (match) {
      conditions.push({
        field: match[1].trim(),
        operator: match[2].toLowerCase(),
        value: match[3].trim(),
      });
    } else {
      // Try simple operator pattern (=, !=, etc. without space)
      const simpleMatch = /^(.+?)\s*(!=|>=|<=|>|<|=)\s*(.+)$/.exec(token);
      if (simpleMatch) {
        conditions.push({
          field: simpleMatch[1].trim(),
          operator: simpleMatch[2],
          value: simpleMatch[3].trim(),
        });
      } else {
        freeTextParts.push(token);
      }
    }
  }

  // Align conjunctions with conditions (there should be one fewer conjunction than conditions)
  for (let i = 0; i < conditions.length - 1 && i < conjs.length; i++) {
    conjunctions.push(conjs[i]);
  }

  freeText = freeTextParts.join(' ').trim();
  return { conditions, conjunctions, freeText };
}

export function evaluateExpression(
  query: SearchQueryRecord,
  parsed: ParsedExpression,
  fieldMap: Map<string, FieldDef>
): boolean {
  if (parsed.conditions.length === 0 && !parsed.freeText) return true;

  // Evaluate free text
  if (parsed.freeText) {
    const text = parsed.freeText.toLowerCase();
    const searchable = Object.values(query)
      .map((v) => {
        if (v == null) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return String(v);
        if (Array.isArray(v)) return v.join(' ');
        if (typeof v === 'object') return JSON.stringify(v);
        return '';
      })
      .join(' ')
      .toLowerCase();
    if (!searchable.includes(text)) return false;
  }

  if (parsed.conditions.length === 0) return true;

  // Evaluate conditions
  const results = parsed.conditions.map((cond) => {
    const fieldDef = fieldMap.get(cond.field.toLowerCase());
    if (!fieldDef) return true; // unknown field, skip

    const rawValue = fieldDef.accessor(query);
    return compareValues(rawValue, cond.operator, cond.value, fieldDef.type);
  });

  // Combine with conjunctions (default AND)
  let result = results[0];
  for (let i = 1; i < results.length; i++) {
    const conj = parsed.conjunctions[i - 1] || 'AND';
    if (conj === 'AND') result = result && results[i];
    else result = result || results[i];
  }

  return result;
}

function compareValues(
  rawValue: any,
  operator: string,
  targetStr: string,
  fieldType: string
): boolean {
  if (rawValue == null) return operator === '!=';

  if (fieldType === 'array') {
    const arr = Array.isArray(rawValue) ? rawValue : [rawValue];
    const target = targetStr.toLowerCase();
    if (operator === '=') return arr.some((v: any) => String(v).toLowerCase() === target);
    if (operator === '!=') return !arr.some((v: any) => String(v).toLowerCase() === target);
    return false;
  }

  if (fieldType === 'number') {
    const numVal = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
    const numTarget = parseFloat(targetStr);
    switch (operator) {
      case '=':
        return numVal === numTarget;
      case '!=':
        return numVal !== numTarget;
      case '>':
        return numVal > numTarget;
      case '<':
        return numVal < numTarget;
      case '>=':
        return numVal >= numTarget;
      case '<=':
        return numVal <= numTarget;
      case 'between': {
        // Format: "(10, 100)" or "10..100" or "10,100" or "10 100"
        const cleaned = targetStr.replace(/[()]/g, '').trim();
        const parts = cleaned
          .split(/\.\.|,|\s+/)
          .map((s) => s.trim())
          .filter((s) => s);
        if (parts.length === 2) {
          const low = parseFloat(parts[0]);
          const high = parseFloat(parts[1]);
          if (!isNaN(low) && !isNaN(high)) {
            return numVal >= low && numVal <= high;
          }
        }
        return false;
      }
      default:
        return false;
    }
  }

  if (fieldType === 'boolean') {
    const boolVal =
      typeof rawValue === 'boolean' ? rawValue : String(rawValue).toLowerCase() === 'true';
    const boolTarget =
      targetStr.toLowerCase() === 'true' || targetStr.toLowerCase() === 'completed';
    if (operator === '=') return boolVal === boolTarget;
    if (operator === '!=') return boolVal !== boolTarget;
    return false;
  }

  // string comparison
  const strVal = String(rawValue).toLowerCase();
  const strTarget = targetStr.toLowerCase();
  if (operator === '=') return strVal === strTarget;
  if (operator === '!=') return strVal !== strTarget;
  if (operator === 'starts_with') return strVal.startsWith(strTarget);
  if (operator === 'ends_with') return strVal.endsWith(strTarget);
  if (operator === 'contains') return strVal.includes(strTarget);
  return false;
}

// --- Autocomplete state machine ---
type SuggestionPhase = 'field' | 'operator' | 'value' | 'conjunction' | 'none';

function detectPhase(
  input: string,
  fieldMap: Map<string, FieldDef>
): {
  phase: SuggestionPhase;
  currentField?: FieldDef;
  partial: string;
} {
  if (!input.trim()) return { phase: 'field', partial: '' };

  // After a complete condition, suggest conjunction
  const lastConjMatch = input.match(/\s+(AND|OR)\s*$/i);
  if (lastConjMatch) return { phase: 'field', partial: '' };

  // Check if we just finished a value (has field op value pattern at end)
  // First check for conditions after the last AND/OR
  const lastConjIdx = input.search(/\s+(AND|OR)\s+(?!.*\s+(AND|OR)\s+)/i);
  const relevantInput =
    lastConjIdx >= 0 ? input.substring(lastConjIdx).replace(/^\s*(AND|OR)\s+/i, '') : input;

  const condPattern = /^(.+?)\s*(!=|>=|<=|>|<|=|starts_with|ends_with|contains|between)\s+(.+?)\s*$/i;
  const condMatch = condPattern.exec(relevantInput.trim());
  if (condMatch) {
    const val = condMatch[3].trim();
    const op = condMatch[2].toLowerCase();
    const fieldName = condMatch[1].trim().split(/\s+/).pop()?.toLowerCase() || '';
    // For between, check if we have two numbers
    if (op === 'between') {
      const cleaned = val.replace(/[()]/g, '').trim();
      const nums = cleaned.split(/\.\.|,|\s+/).filter((s) => s && !isNaN(Number(s)));
      if (nums.length >= 2) {
        return { phase: 'conjunction', partial: '' };
      }
      // Only one number typed — suggest second value
      const fieldDef = fieldMap.get(fieldName);
      return { phase: 'value', currentField: fieldDef, partial: '' };
    }
    // Full condition exists at end — suggest conjunction
    return { phase: 'conjunction', partial: '' };
  }

  // Check if we have field + operator but no value yet
  const opPattern = /(\S+)\s*(!=|>=|<=|>|<|=|starts_with|ends_with|contains|between)\s*$/i;
  const opMatch = opPattern.exec(input);
  if (opMatch) {
    // Walk back to find the actual field name (might be after AND/OR)
    const parts = opMatch[1].split(/\s+/);
    const actualField = parts[parts.length - 1].toLowerCase();
    const fieldDef = fieldMap.get(actualField);
    return { phase: 'value', currentField: fieldDef, partial: '' };
  }

  // Check if we're typing a field name (possibly after AND/OR)
  const parts = input.split(/\s+/);
  const lastToken = parts[parts.length - 1];

  // If input ends with a space, check if the previous token is a field name → suggest operators
  if (input.endsWith(' ')) {
    const nonEmptyParts = parts.filter((p) => p.length > 0);
    const prevToken = nonEmptyParts[nonEmptyParts.length - 1] || '';
    if (prevToken && !/^(AND|OR)$/i.test(prevToken)) {
      const fieldDef = fieldMap.get(prevToken.toLowerCase());
      if (fieldDef) {
        return { phase: 'operator', currentField: fieldDef, partial: '' };
      }
    }
  }

  if (lastToken && !/^(!=|>=|<=|>|<|=)$/.test(lastToken)) {
    // Check if previous token was AND/OR or this is the start
    const prevToken = parts.length >= 2 ? parts[parts.length - 2] : '';
    if (/^(AND|OR)$/i.test(prevToken) || parts.length === 1) {
      return { phase: 'field', partial: lastToken };
    }
    // Could be typing a field name after space
    const fieldDef = fieldMap.get(lastToken.toLowerCase());
    if (fieldDef) {
      return { phase: 'operator', currentField: fieldDef, partial: '' };
    }
    return { phase: 'field', partial: lastToken };
  }

  return { phase: 'none', partial: '' };
}

// --- Component ---
interface DynamicSearchBarProps {
  fields: FieldDef[];
  queries: SearchQueryRecord[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const DynamicSearchBar: React.FC<DynamicSearchBarProps> = ({
  fields,
  queries,
  value,
  onChange,
  placeholder = 'e.g. latency >= 100 AND type = query',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ label: string; description?: string }>>(
    []
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const fieldMap = useMemo(() => {
    const map = new Map<string, FieldDef>();
    fields.forEach((f) => map.set(f.key.toLowerCase(), f));
    // Also map by label for user convenience
    fields.forEach((f) => map.set(f.label.toLowerCase(), f));
    return map;
  }, [fields]);

  // Collect unique values for a field from the data
  const getFieldValues = useCallback(
    (fieldDef: FieldDef): string[] => {
      const set = new Set<string>();
      for (const q of queries) {
        const val = fieldDef.accessor(q);
        if (val == null) continue;
        if (Array.isArray(val)) {
          val.forEach((v) => v != null && set.add(String(v)));
        } else {
          set.add(String(val));
        }
      }
      return Array.from(set).sort();
    },
    [queries]
  );

  const updateSuggestions = useCallback(
    (text: string) => {
      const { phase, currentField, partial } = detectPhase(text, fieldMap);

      switch (phase) {
        case 'field': {
          const filtered = fields.filter(
            (f) =>
              !partial ||
              f.label.toLowerCase().includes(partial.toLowerCase()) ||
              f.key.toLowerCase().includes(partial.toLowerCase())
          );
          setSuggestions(
            filtered.map((f) => ({
              label: f.key,
              description: `${f.label} (${f.type})`,
            }))
          );
          break;
        }
        case 'operator': {
          if (currentField) {
            const ops = OPERATORS_BY_TYPE[currentField.type] || OPERATORS_BY_TYPE.string;
            setSuggestions(ops.map((op) => ({ label: op.label, description: op.description })));
          }
          break;
        }
        case 'value': {
          if (currentField) {
            if (currentField.type === 'boolean') {
              setSuggestions([{ label: 'true' }, { label: 'false' }]);
            } else {
              const values = getFieldValues(currentField);
              const unit = currentField.unit || '';
              setSuggestions(
                values.slice(0, 20).map((v) => ({
                  label: v,
                  description: unit ? `${v} ${unit}` : undefined,
                }))
              );
            }
          }
          break;
        }
        case 'conjunction': {
          setSuggestions([{ label: 'AND' }, { label: 'OR' }]);
          break;
        }
        default:
          setSuggestions([]);
      }
    },
    [fields, fieldMap, getFieldValues]
  );

  const handleChange = (text: string) => {
    // Auto-format between expressions: "... between 2 26 " → "... between (2, 26) "
    // Only triggers when there's a trailing space after the second number
    const betweenMatch = text.match(/^(.*\s+between)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s$/i);
    if (betweenMatch) {
      const formatted = `${betweenMatch[1]} (${betweenMatch[2]}, ${betweenMatch[3]}) `;
      onChange(formatted);
      updateSuggestions(formatted);
      if (formatted.trim()) {
        setIsOpen(true);
      }
      return;
    }
    onChange(text);
    updateSuggestions(text);
    if (text.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (selectedLabel: string) => {
    const { phase, partial } = detectPhase(value, fieldMap);
    let newValue = value;

    switch (phase) {
      case 'field': {
        // Replace the partial field name with the selected one
        if (partial) {
          const lastIdx = newValue.lastIndexOf(partial);
          newValue = newValue.substring(0, lastIdx) + selectedLabel + ' ';
        } else {
          newValue = (newValue.trimEnd() + ' ' + selectedLabel + ' ').trimStart();
        }
        break;
      }
      case 'operator': {
        newValue = newValue.trimEnd() + ' ' + selectedLabel + ' ';
        break;
      }
      case 'value': {
        // If value contains spaces, wrap in quotes
        const val = selectedLabel.includes(' ') ? `"${selectedLabel}"` : selectedLabel;
        // Ensure space between operator and value
        newValue = newValue.endsWith(' ') ? newValue + val + ' ' : newValue + ' ' + val + ' ';
        break;
      }
      case 'conjunction': {
        newValue = newValue.trimEnd() + ' ' + selectedLabel + ' ';
        break;
      }
    }

    onChange(newValue);
    updateSuggestions(newValue);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    updateSuggestions(value);
    if (suggestions.length > 0 || !value.trim()) {
      setIsOpen(true);
    }
  };

  // Parse the current expression to show active filter badges
  const parsed = useMemo(() => parseExpression(value), [value]);

  return (
    <div style={{ position: 'relative', minWidth: 400 }}>
      <EuiFieldSearch
        inputRef={(ref) => {
          (inputRef as any).current = ref;
        }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        fullWidth
        aria-label="Dynamic search bar"
      />
      {parsed.conditions.length > 0 && (
        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {parsed.conditions.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && parsed.conjunctions[i - 1] && (
                <EuiBadge color="hollow">{parsed.conjunctions[i - 1]}</EuiBadge>
              )}
              <EuiBadge
                color="primary"
                iconType="cross"
                iconSide="right"
                iconOnClick={() => {
                  // Remove this condition and its adjacent conjunction from the expression.
                  // Split into alternating [cond, conj, cond, conj, cond, ...] tokens.
                  const parts = value.split(/\s+(AND|OR)\s+/i);
                  const conditions: string[] = [];
                  const conjunctions: string[] = [];
                  for (const part of parts) {
                    if (/^(AND|OR)$/i.test(part)) {
                      conjunctions.push(part);
                    } else {
                      conditions.push(part);
                    }
                  }
                  // Remove the condition at index i
                  conditions.splice(i, 1);
                  // Remove the adjacent conjunction:
                  // - If removing a middle/last condition, remove the conjunction before it
                  // - If removing the first condition, remove the conjunction after it
                  if (i > 0) {
                    conjunctions.splice(i - 1, 1);
                  } else if (conjunctions.length > 0) {
                    conjunctions.splice(0, 1);
                  }
                  // Rebuild: interleave conditions with conjunctions
                  const result: string[] = [];
                  conditions.forEach((cond, idx) => {
                    if (idx > 0 && conjunctions[idx - 1]) {
                      result.push(conjunctions[idx - 1]);
                    }
                    result.push(cond);
                  });
                  onChange(result.join(' ').trim());
                }}
                iconOnClickAriaLabel={`Remove filter ${c.field} ${c.operator} ${c.value}`}
              >
                {c.field} {c.operator}{' '}
                {c.operator === 'between'
                  ? `(${c.value
                      .replace(/[()]/g, '')
                      .trim()
                      .split(/\.\.|,|\s+/)
                      .join(', ')})`
                  : c.value}
              </EuiBadge>
            </React.Fragment>
          ))}
        </div>
      )}
      {isOpen && suggestions.length > 0 && (
        <EuiPanel
          paddingSize="none"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 9999,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              role="option"
              aria-selected={false}
              tabIndex={0}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s.label);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSelect(s.label);
              }}
            >
              <EuiText size="s">
                <span>{s.label}</span>
                {s.description && (
                  <EuiText size="xs" color="subdued" component="span" style={{ marginLeft: 8 }}>
                    {s.description}
                  </EuiText>
                )}
              </EuiText>
            </div>
          ))}
        </EuiPanel>
      )}
    </div>
  );
};
