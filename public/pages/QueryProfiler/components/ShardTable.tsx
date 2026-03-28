/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiBasicTable,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiButtonEmpty,
  EuiPopover,
  EuiText,
  EuiButtonIcon,
  EuiFormRow,
  EuiRange,
} from '@elastic/eui';
import { ShardTableProps } from '../types';
import { PROFILER_COLORS, DEFAULT_THRESHOLDS, getBarColor } from '../constants';

interface ShardMetrics {
  id: string;
  name: string;
  searchTime: number;
  aggTime: number;
  index: number;
}

/**
 * Component for displaying shard execution details in a table with bar charts
 */
export const ShardTable: React.FC<ShardTableProps> = ({
  shards,
  onShardSelect,
  redThreshold = DEFAULT_THRESHOLDS.RED,
  orangeThreshold = DEFAULT_THRESHOLDS.ORANGE,
  onRedThresholdChange,
  onOrangeThresholdChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'searchTime' | 'aggTime' | 'name'>('searchTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isThresholdPopoverOpen, setIsThresholdPopoverOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  // Calculate metrics for each shard
  const shardMetrics = useMemo(() => {
    if (!shards) return [];

    return shards.map((shard, index) => {
      // Calculate search execution time
      const searchTime = shard.searches?.[0]?.query?.reduce((sum, q) => {
        return sum + (q.time_in_nanos || 0);
      }, 0) || 0;

      const rewriteTime = shard.searches?.[0]?.rewrite_time || 0;
      const collectorsTime = shard.searches?.[0]?.collector?.reduce(
        (sum, collector) => sum + (collector.time_in_nanos || 0),
        0
      ) || 0;

      // Calculate aggregation time
      const aggTime = shard.aggregations?.reduce((sum, agg) => {
        return sum + (agg.time_in_nanos || 0);
      }, 0) || 0;

      // Keep the full shard ID for display
      const shardId = shard.id || `shard-${index}`;

      return {
        id: shard.id || `shard-${index}`,
        name: shardId,
        searchTime: (searchTime + rewriteTime + collectorsTime) / 1000000,
        aggTime: aggTime / 1000000,
        index,
      };
    });
  }, [shards]);

  // Filter shards based on search term
  const filteredShards = useMemo(() => {
    if (!searchTerm) return shardMetrics;
    return shardMetrics.filter((shard) =>
      shard.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [shardMetrics, searchTerm]);

  // Sort shards
  const sortedShards = useMemo(() => {
    return [...filteredShards].sort((a, b) => {
      if (sortField === 'name') {
        // String comparison for shard names
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        // Numeric comparison for times
        return sortDirection === 'desc'
          ? b[sortField] - a[sortField]
          : a[sortField] - b[sortField];
      }
    });
  }, [filteredShards, sortField, sortDirection]);

  // Get max times for bar scaling
  const maxSearchTime = Math.max(...sortedShards.map((s) => s.searchTime), 1);
  const maxAggTime = Math.max(...sortedShards.map((s) => s.aggTime), 1);

  // Paginate items manually (EuiBasicTable doesn't do this automatically)
  const paginatedItems = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    return sortedShards.slice(startIndex, startIndex + pageSize);
  }, [sortedShards, pageIndex, pageSize]);

  const columns = [
    {
      field: 'name',
      name: (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          cursor: 'pointer',
          userSelect: 'none'
        }}
          onClick={() => {
            if (sortField === 'name') {
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
              setSortField('name');
              setSortDirection('asc');
            }
          }}
          title={sortField === 'name' 
            ? `Currently sorted ${sortDirection === 'asc' ? 'A-Z' : 'Z-A'}. Click to sort ${sortDirection === 'asc' ? 'Z-A' : 'A-Z'}.`
            : 'Click to sort by shard name'}
        >
          <span>Shard</span>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: 'bold',
            color: '#98A2B3',
            transition: 'color 0.2s'
          }}>
            ⇅
          </span>
        </div>
      ),
      width: '35%',
      render: (name: string, item: ShardMetrics) => (
        <EuiLink onClick={() => onShardSelect(item.index)} color="primary" style={{ fontWeight: 'normal', fontSize: '13px' }}>
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'searchTime',
      name: 'Search time',
      width: '32.5%',
      render: (time: number) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <div
              style={{
                width: '100%',
                height: '22px',
                backgroundColor: PROFILER_COLORS.BAR_BACKGROUND,
                borderRadius: '2px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(time / maxSearchTime) * 100}%`,
                  height: '100%',
                  backgroundColor: getBarColor(time, maxSearchTime, redThreshold, orangeThreshold),
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: '45px' }}>
            <span style={{ fontSize: '12px', color: PROFILER_COLORS.SUBDUED_TEXT }}>{time.toFixed(0)} ms</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'aggTime',
      name: 'Aggregation time',
      width: '32.5%',
      render: (time: number) => (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <div
              style={{
                width: '100%',
                height: '22px',
                backgroundColor: PROFILER_COLORS.BAR_BACKGROUND,
                borderRadius: '2px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(time / maxAggTime) * 100}%`,
                  height: '100%',
                  backgroundColor: getBarColor(time, maxAggTime, redThreshold, orangeThreshold),
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ minWidth: '45px' }}>
            <span style={{ fontSize: '12px', color: PROFILER_COLORS.SUBDUED_TEXT }}>{time.toFixed(0)} ms</span>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  if (!shards || shards.length === 0) {
    return null;
  }

  // Sort options for popover
  const sortOptions = [
    { field: 'searchTime' as const, label: 'Search time' },
    { field: 'aggTime' as const, label: 'Aggregation time' },
  ];

  const sortButton = (
    <EuiButtonEmpty
      size="xs"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
    >
      Sort by: {sortField === 'searchTime' ? 'Search time' : sortField === 'aggTime' ? 'Aggregation time' : 'Search time'}
    </EuiButtonEmpty>
  );

  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false} style={{ width: '300px' }}>
              <EuiFieldSearch
                placeholder="Search shard"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                compressed
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={sortButton}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            panelPaddingSize="s"
          >
            <div style={{ width: '200px' }}>
              {sortOptions.map(({ field, label }) => (
                <EuiButtonEmpty
                  key={field}
                  size="s"
                  onClick={() => {
                    setSortField(field);
                    setSortDirection('desc');
                    setIsPopoverOpen(false);
                  }}
                  style={{ display: 'block', textAlign: 'left' }}
                >
                  {sortField === field && '✓ '}Sort by: {label}
                </EuiButtonEmpty>
              ))}
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiBasicTable
        items={paginatedItems}
        columns={columns}
        tableLayout="auto"
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount: sortedShards.length,
          pageSizeOptions: [5, 10, 25, 50],
        }}
        onChange={({ page }) => {
          if (page) {
            setPageIndex(page.index);
            setPageSize(page.size);
          }
        }}
      />

      <EuiSpacer size="s" />

      {/* Color threshold legend */}
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" role="group" aria-label="Color threshold legend">
        {[
          { color: PROFILER_COLORS.GREEN, label: `≤${orangeThreshold}% (Low)`, ariaLabel: 'low usage' },
          { color: PROFILER_COLORS.ORANGE, label: `${orangeThreshold + 1}%-${redThreshold}% (Medium)`, ariaLabel: 'medium usage' },
          { color: PROFILER_COLORS.RED, label: `>${redThreshold}% (High)`, ariaLabel: 'high usage' },
        ].map(({ color, label, ariaLabel }) => (
          <EuiFlexItem key={color} grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <div 
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: color, 
                    borderRadius: '2px' 
                  }} 
                  role="img"
                  aria-label={`${color} indicator for ${ariaLabel}`}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {label}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ))}
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiButtonIcon
                iconType="gear"
                size="s"
                aria-label="Customize thresholds"
                onClick={() => setIsThresholdPopoverOpen(!isThresholdPopoverOpen)}
              />
            }
            isOpen={isThresholdPopoverOpen}
            closePopover={() => setIsThresholdPopoverOpen(false)}
            panelPaddingSize="m"
          >
            <div style={{ width: '280px' }}>
              <EuiText size="s">
                <strong>Customize color thresholds</strong>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiFormRow label={`Red (>${redThreshold}%)`} fullWidth>
                <EuiRange
                  min={0}
                  max={100}
                  step={5}
                  value={redThreshold}
                  onChange={(e) => onRedThresholdChange?.(Number(e.currentTarget.value))}
                  showValue
                  valuePrepend=">"
                  fullWidth
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiFormRow label={`Orange (>${orangeThreshold}%)`} fullWidth>
                <EuiRange
                  min={0}
                  max={100}
                  step={5}
                  value={orangeThreshold}
                  onChange={(e) => onOrangeThresholdChange?.(Number(e.currentTarget.value))}
                  showValue
                  valuePrepend=">"
                  fullWidth
                />
              </EuiFormRow>
              {redThreshold - orangeThreshold < 5 && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="xs" color="danger">
                    Orange must be at least 5% below red
                  </EuiText>
                </>
              )}
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                Thresholds are based on percentage of maximum time.
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButtonEmpty
                size="s"
                onClick={() => {
                  onRedThresholdChange?.(DEFAULT_THRESHOLDS.RED);
                  onOrangeThresholdChange?.(DEFAULT_THRESHOLDS.ORANGE);
                  setIsThresholdPopoverOpen(false);
                }}
              >
                Reset to defaults
              </EuiButtonEmpty>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
