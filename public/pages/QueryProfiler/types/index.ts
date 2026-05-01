/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// Profile Data Types
// ============================================================================

/**
 * Main profile data structure from OpenSearch query profiling API
 */
export interface ProfileData {
  took: number;
  timed_out: boolean;
  _shards: ShardInfo;
  hits: HitsInfo;
  profile: ProfileInfo;
}

/**
 * Shard information from query response
 */
export interface ShardInfo {
  total: number;
  successful: number;
  skipped: number;
  failed: number;
}

/**
 * Hits information from query response
 */
export interface HitsInfo {
  total: number | { value: number; relation: string };
  max_score: number | null;
  hits: any[];
}

/**
 * Profile information containing shard profiles
 */
export interface ProfileInfo {
  shards: ShardProfile[];
}

/**
 * Individual shard profile with searches and optional aggregations
 */
export interface ShardProfile {
  id: string;
  searches: SearchProfile[];
  aggregations?: AggregationProfile[];
}

/**
 * Search profile containing query, rewrite time, and collector information
 */
export interface SearchProfile {
  query: QueryProfile[];
  rewrite_time: number;
  collector: CollectorProfile[];
}

/**
 * Query profile with timing breakdown and optional children
 */
export interface QueryProfile {
  id?: string;
  type: string;
  description: string;
  time_in_nanos: number;
  time_ms?: number;
  percentage?: number;
  queryName?: string;
  breakdown: QueryBreakdown;
  children?: QueryProfile[];
}

/**
 * Detailed breakdown of query execution timing
 */
export interface QueryBreakdown {
  advance: number;
  advance_count: number;
  build_scorer: number;
  build_scorer_count: number;
  create_weight: number;
  create_weight_count: number;
  match: number;
  match_count: number;
  next_doc: number;
  next_doc_count: number;
  score: number;
  score_count: number;
  compute_max_score: number;
  compute_max_score_count: number;
  shallow_advance: number;
  shallow_advance_count: number;
  set_min_competitive_score: number;
  set_min_competitive_score_count: number;
  [key: string]: number; // Allow dynamic property access
}

/**
 * Collector profile with timing and optional children
 */
export interface CollectorProfile {
  name: string;
  reason: string;
  time_in_nanos: number;
  children?: CollectorProfile[];
}

/**
 * Aggregation profile with timing breakdown and optional children
 */
export interface AggregationProfile {
  type: string;
  description: string;
  time_in_nanos: number;
  breakdown: Record<string, number>;
  children?: AggregationProfile[];
}

/**
 * Processed query node used in tree visualization and detail panel
 */
export interface ProcessedQuery {
  id: string;
  queryName: string;
  type: string;
  description: string;
  time_ms: number;
  time_in_nanos: number;
  percentage: number;
  breakdown: Record<string, number>;
  children?: ProcessedQuery[];
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

/**
 * Props for the ShardTable component
 */
export interface ShardTableProps {
  shards: ShardProfile[];
  onShardSelect: (index: number) => void;
  redThreshold?: number;
  orangeThreshold?: number;
  onRedThresholdChange?: (value: number) => void;
  onOrangeThresholdChange?: (value: number) => void;
}

/**
 * Props for the QueryTree component
 */
export interface QueryTreeProps {
  queries: QueryProfile[];
  aggregations?: AggregationProfile[];
  selectedQuery: ProcessedQuery | null;
  onQuerySelect: (query: ProcessedQuery | null) => void;
  rewriteTime?: number;
  collectors?: CollectorProfile[];
  redThreshold?: number;
  orangeThreshold?: number;
}

/**
 * Props for the QueryDetail component
 */
export interface QueryDetailProps {
  query: ProcessedQuery | null;
  redThreshold?: number;
  orangeThreshold?: number;
}
