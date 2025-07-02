/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import vega from 'vega';

interface VegaChartProps {
  spec: object; // Vega spec JSON
  width?: number;
  height?: number;
}

export const VegaChart = ({ spec, width = 400, height = 400 }: VegaChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<vega.View | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const runtime = vega.parse(spec);
    const view = new vega.View(runtime)
      .renderer('canvas')
      .initialize(containerRef.current)
      .width(width)
      .height(height)
      .run();

    viewRef.current = view;

    return () => {
      if (viewRef.current) {
        viewRef.current.finalize();
        viewRef.current = null;
      }
    };
  }, [spec, width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    />
  );
};
