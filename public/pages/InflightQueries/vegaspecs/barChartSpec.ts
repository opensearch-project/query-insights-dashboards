/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const createVegaBarSpec = (data: Record<string, number>, width = 100, height = 200) => {
  const values = Object.entries(data).map(([category, value]) => ({ category, value }));

  return {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width,
    height,
    padding: 5,
    autosize: 'pad',
    data: [
      {
        name: 'table',
        values,
      },
    ],
    scales: [
      {
        name: 'yscale',
        type: 'band',
        domain: { data: 'table', field: 'category' },
        range: 'height',
        padding: 0.05,
        round: true,
      },
      {
        name: 'xscale',
        domain: { data: 'table', field: 'value' },
        nice: true,
        range: 'width',
      },
      {
        name: 'color',
        type: 'ordinal',
        domain: { data: 'table', field: 'category' },
        range: { scheme: 'category20' },
      },
    ],
    axes: [
      { orient: 'left', scale: 'yscale' },
      { orient: 'bottom', scale: 'xscale' },
    ],
    marks: [
      {
        type: 'rect',
        from: { data: 'table' },
        encode: {
          enter: {
            y: { scale: 'yscale', field: 'category' },
            height: { scale: 'yscale', band: 1 },
            x: { scale: 'xscale', value: 0 },
            x2: { scale: 'xscale', field: 'value' },
            fill: { scale: 'color', field: 'category' },
          },
        },
      },
    ],
    legends: [
      {
        fill: 'color',
        orient: 'bottom',
        title: 'Category',
        columns: 3, // number of columns for legend items
        columnPadding: 10, // optional spacing between columns
        encode: {
          labels: { update: { fontSize: { value: 16 } } },
          symbols: { update: { size: { value: 100 } } },
        },
      },
    ],
  };
};
