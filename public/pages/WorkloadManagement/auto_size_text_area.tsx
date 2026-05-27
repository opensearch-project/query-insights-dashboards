/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useLayoutEffect, useRef } from 'react';
import { EuiTextArea, EuiTextAreaProps } from '@elastic/eui';

const MAX_HEIGHT_PX = 120;

export const AutoSizeTextArea: React.FC<EuiTextAreaProps> = (props) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? 'auto' : 'hidden';
  }, [props.value]);

  return (
    <EuiTextArea
      {...props}
      inputRef={(node) => {
        ref.current = node;
        if (typeof props.inputRef === 'function') props.inputRef(node);
      }}
      rows={1}
      resize="none"
      style={{ minHeight: 40, ...(props.style || {}) }}
    />
  );
};
