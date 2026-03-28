/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiButtonIcon,
} from '@elastic/eui';
import { QueryTreeProps, QueryProfile, AggregationProfile } from '../types';
import { QueryDetailPanel } from '../components/QueryDetailPanel';
import { LAYOUT_CONSTANTS } from '../constants';

interface ProcessedQuery {
  id: string;
  queryName: string;
  type: string;
  description: string;
  time_ms: number;
  time_in_nanos: number;
  percentage: number;
  breakdown: Record<string, number>;
  rawBreakdown: Record<string, number>;
  children?: ProcessedQuery[];
}

/**
 * Component for displaying query tree with expand/collapse and selection
 * Features split-panel layout with resizable divider
 */
export const QueryTree: React.FC<QueryTreeProps> = ({
  queries,
  aggregations,
  selectedQuery,
  onQuerySelect,
  rewriteTime,
  collectors,
  redThreshold = 80,
  orangeThreshold = 50,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'aggregation'>('search');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [leftPanelWidth, setLeftPanelWidth] = useState(LAYOUT_CONSTANTS.TREE_PANEL_DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);

  // Get the active data based on selected tab
  const activeData = useMemo(() => {
    if (activeTab === 'aggregation') {
      return aggregations || [];
    }
    return queries || [];
  }, [activeTab, queries, aggregations]);

  // Process queries into tree structure
  const processedQueries = useMemo(() => {
    if (!activeData || activeData.length === 0) return [];

    // Calculate total time including rewrite and collectors for search tab
    let totalTime = activeData.reduce((sum, q) => sum + (q.time_in_nanos || 0), 0);
    
    if (activeTab === 'search') {
      if (rewriteTime !== undefined && rewriteTime > 0) {
        totalTime += rewriteTime;
      }
      if (collectors && collectors.length > 0) {
        const collectorsTime = collectors.reduce((sum, c) => sum + (c.time_in_nanos || 0), 0);
        totalTime += collectorsTime;
      }
    }

    const transformQuery = (query: QueryProfile | AggregationProfile, index: number, parentPath = ''): ProcessedQuery => {
      const nodeId = parentPath ? `${parentPath}-${index}` : `${index}`;
      const timeMs = (query.time_in_nanos || 0) / 1000000;
      const percentage = totalTime > 0 ? ((query.time_in_nanos || 0) / totalTime) * 100 : 0;

      return {
        id: `query-${nodeId}`,
        queryName: query.type || 'Unknown Query',
        type: query.type || 'Unknown',
        description: query.description || '',
        time_ms: timeMs,
        time_in_nanos: query.time_in_nanos || 0,
        percentage,
        breakdown: query.breakdown || {},
        rawBreakdown: query.breakdown || {},
        children: query.children?.map((child, idx) => transformQuery(child, idx, nodeId)),
      };
    };

    const result = activeData.map((q, i) => transformQuery(q, i));

    // Add rewrite_time and collectors only for search tab
    if (activeTab === 'search') {
      // Add rewrite node if rewriteTime exists
      if (rewriteTime !== undefined && rewriteTime > 0) {
        const rewriteTimeMs = rewriteTime / 1000000;
        const rewritePercentage = totalTime > 0 ? (rewriteTime / totalTime) * 100 : 0;
        result.push({
          id: 'rewrite',
          queryName: 'Rewrite',
          type: 'Rewrite',
          description: 'Query rewrite time',
          time_ms: rewriteTimeMs,
          time_in_nanos: rewriteTime,
          percentage: rewritePercentage,
          breakdown: {},
          rawBreakdown: {},
        });
      }

      // Add collector nodes if collectors exist
      if (collectors && collectors.length > 0) {
        const transformCollector = (collector: any, index: number, parentPath = ''): ProcessedQuery => {
          const nodeId = parentPath ? `${parentPath}-${index}` : `collector-${index}`;
          const timeMs = (collector.time_in_nanos || 0) / 1000000;
          const percentage = totalTime > 0 ? ((collector.time_in_nanos || 0) / totalTime) * 100 : 0;

          return {
            id: nodeId,
            queryName: collector.name || 'Collector',
            type: collector.name || 'Collector',  // Use actual collector name instead of hardcoded 'Collectors'
            description: collector.reason || '',
            time_ms: timeMs,
            time_in_nanos: collector.time_in_nanos || 0,
            percentage,
            breakdown: collector.breakdown || {},  // Include breakdown if it exists
            rawBreakdown: collector.breakdown || {},  // Include breakdown if it exists
            children: collector.children?.map((child: any, idx: number) => transformCollector(child, idx, nodeId)),
          };
        };

        collectors.forEach((collector, i) => {
          result.push(transformCollector(collector, i));
        });
      }
    }

    return result;
  }, [activeData, activeTab, rewriteTime, collectors]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  }, []);

  // Get color for query type
  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ConstantScoreQuery: '#FFE0B2',
      BooleanQuery: '#D1C4E9',
      TermQuery: '#B2DFDB',
      MatchAllDocsQuery: '#FFF9C4',
      Rewrite: '#C8E6C9',
    };
    
    // Collector types get pink shades
    if (type.includes('Collector')) return '#F2959B';
    
    return colors[type] || '#E0E7EF';
  };

  // Render tree node recursively
  const renderTreeNode = (node: ProcessedQuery, depth = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id] === true; // Default to collapsed
    const isSelected = selectedQuery?.id === node.id;

    return (
      <div key={node.id} style={{ marginLeft: depth * LAYOUT_CONSTANTS.TREE_NODE_INDENT }}>
        <div
          onClick={() => onQuerySelect(node as QueryProfile)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onQuerySelect(node as QueryProfile);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Select ${node.queryName} query`}
          aria-pressed={isSelected}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 6px',
            cursor: 'pointer',
            backgroundColor: isSelected ? 'rgba(0, 107, 180, 0.1)' : 'transparent',
            borderLeft: `3px solid ${getTypeColor(node.type)}`,
            borderRadius: '2px',
            marginBottom: '1px',
          }}
        >
          {hasChildren ? (
            <EuiButtonIcon
              iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
              size="xs"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              style={{ marginRight: '4px' }}
            />
          ) : (
            <div style={{ width: '20px' }} />
          )}

          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: getTypeColor(node.type),
              marginRight: '6px',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />

          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} style={{ flex: 1 }}>
            <EuiFlexItem>
              <EuiText size="s" style={{ fontWeight: 'normal' }}>
                {node.queryName}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {node.time_ms.toFixed(2)} ms
              </EuiText>
            </EuiFlexItem>
            {depth > 0 && (
              <EuiFlexItem grow={false} style={{ minWidth: '45px', textAlign: 'right' }}>
                <EuiText size="xs" color="subdued">
                  {node.percentage.toFixed(1)}%
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Handle mouse events for resizing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = Math.max(
        LAYOUT_CONSTANTS.TREE_PANEL_MIN_WIDTH,
        Math.min(LAYOUT_CONSTANTS.TREE_PANEL_MAX_WIDTH, e.clientX)
      );
      setLeftPanelWidth(newWidth);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!activeData || activeData.length === 0) {
    return (
      <EuiPanel paddingSize="m">
        <EuiText size="s" color="subdued">
          {activeTab === 'aggregation'
            ? 'No aggregation data to display'
            : 'No query data to display'}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <div style={{ display: 'flex', height: '600px', border: '1px solid #D3DAE6', borderRadius: '6px' }}>
      {/* Left Panel - Tree View */}
      <div
        style={{
          width: `${leftPanelWidth}px`,
          minWidth: `${LAYOUT_CONSTANTS.TREE_PANEL_MIN_WIDTH}px`,
          maxWidth: `${LAYOUT_CONSTANTS.TREE_PANEL_MAX_WIDTH}px`,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #D3DAE6',
          backgroundColor: '#FAFBFD',
        }}
      >
        {/* Tabs */}
        <div style={{ borderBottom: '1px solid #D3DAE6', padding: '8px 12px' }}>
          <EuiTabs size="s">
            <EuiTab
              isSelected={activeTab === 'search'}
              onClick={() => setActiveTab('search')}
            >
              Search
            </EuiTab>
            <EuiTab
              isSelected={activeTab === 'aggregation'}
              onClick={() => setActiveTab('aggregation')}
            >
              Aggregation
            </EuiTab>
          </EuiTabs>
        </div>

        {/* Tree Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
          {processedQueries.map((query) => renderTreeNode(query))}
        </div>
      </div>

      {/* Resizer */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          width: '7px',
          cursor: 'col-resize',
          backgroundColor: isDragging ? '#006BB4' : '#DBEAFE',
          transition: 'background-color 0.2s',
        }}
      />

      {/* Right Panel - Query Detail */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'white' }}>
        <QueryDetailPanel 
          query={selectedQuery} 
          redThreshold={redThreshold}
          orangeThreshold={orangeThreshold}
        />
      </div>
    </div>
  );
}
