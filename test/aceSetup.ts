/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Set window.ace before react-ace loads to prevent "window is not defined" error
global.ace = {
  edit: () => ({
    setTheme: () => {},
    session: { setMode: () => {}, setUseWrapMode: () => {} },
    setValue: () => {},
    setOptions: () => {},
    setReadOnly: () => {},
    on: () => {},
    destroy: () => {},
    setFontSize: () => {},
    getValue: () => '',
  }),
  acequire: () => ({ Range: () => {} }),
  require: () => ({ Range: () => {} }),
};
