/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const createVegaPieSpec = (data: Record<string, number>, width = 350, height = 350) => {
  const values = Object.entries(data).map(([category, value]) => ({ category, value }));

  return {
    $schema: 'https://vega.github.io/schema/vega/v5.json',
    width,
    height: height + 100,
    padding: { top: 10, left: 10, right: 10, bottom: 100 },
    autosize: 'pad',
    signals: [
      { name: 'startAngle', value: 0 },
      { name: 'endAngle', value: 6.29 },
      { name: 'padAngle', value: 0 },
      { name: 'innerRadius', value: 50 },
      { name: 'cornerRadius', value: 0 },
      { name: 'sort', value: false },
    ],
    data: [
      {
        name: 'table',
        values,
        transform: [
          {
            type: 'pie',
            field: 'value',
            startAngle: { signal: 'startAngle' },
            endAngle: { signal: 'endAngle' },
            padAngle: { signal: 'padAngle' },
            sort: { signal: 'sort' },
          },
        ],
      },
    ],
    scales: [
      {
        name: 'color',
        type: 'ordinal',
        domain: { data: 'table', field: 'category' },
        range: { scheme: 'category20' },
      },
    ],
    marks: [
      {
        type: 'arc',
        from: { data: 'table' },
        encode: {
          enter: {
            fill: { scale: 'color', field: 'category' },
            x: { signal: 'width / 2' },
            y: { signal: '(height - 100) / 2' },
            startAngle: { field: 'startAngle' },
            endAngle: { field: 'endAngle' },
            innerRadius: { signal: 'innerRadius' },
            outerRadius: { signal: 'min(width, height) / 2 - 50' },
          },
          update: {
            cornerRadius: { signal: 'cornerRadius' },
            padAngle: { signal: 'padAngle' },
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
