/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProfileData, ProfilerError, ProfilerErrorType } from '../types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: ProfilerError;
}

/**
 * Validates that the provided data matches the ProfileData structure
 * @param data - The data to validate
 * @returns ValidationResult indicating if the data is valid
 */
export const validateProfileData = (data: any): ValidationResult => {
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.INVALID_PROFILE_FORMAT,
        message: 'Invalid profile data',
        details: 'Profile data must be an object',
      },
    };
  }

  // The most critical field is profile.shards - this is what we actually need to visualize
  if (!data.profile || typeof data.profile !== 'object') {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.MISSING_PROFILE_DATA,
        message: 'Missing required field: profile',
        details: 'The "profile" field must be an object containing profiling information',
      },
    };
  }

  if (!Array.isArray(data.profile.shards)) {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.INVALID_PROFILE_FORMAT,
        message: 'Invalid profile.shards structure',
        details: 'profile.shards must be an array of shard profiles',
      },
    };
  }

  if (data.profile.shards.length === 0) {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.MISSING_PROFILE_DATA,
        message: 'No shard data found',
        details: 'profile.shards array must contain at least one shard profile',
      },
    };
  }

  // Validate each shard has required structure
  for (let i = 0; i < data.profile.shards.length; i++) {
    const shard = data.profile.shards[i];
    if (!shard || typeof shard !== 'object') {
      return {
        isValid: false,
        error: {
          type: ProfilerErrorType.INVALID_PROFILE_FORMAT,
          message: `Invalid shard at index ${i}`,
          details: 'Each shard must be an object',
        },
      };
    }

    if (!Array.isArray(shard.searches)) {
      return {
        isValid: false,
        error: {
          type: ProfilerErrorType.INVALID_PROFILE_FORMAT,
          message: `Invalid shard at index ${i}`,
          details: 'Each shard must have a "searches" array',
        },
      };
    }
  }

  // Optional fields - add defaults if missing
  if (typeof data.took !== 'number') {
    data.took = 0;
  }

  if (!data._shards) {
    data._shards = {
      total: data.profile.shards.length,
      successful: data.profile.shards.length,
      skipped: 0,
      failed: 0,
    };
  }

  if (!data.hits) {
    data.hits = {
      total: 0,
      max_score: null,
      hits: [],
    };
  }

  return { isValid: true };
};

/**
 * Validates that a string contains valid JSON
 * @param jsonString - The string to validate
 * @returns ValidationResult indicating if the JSON is valid
 */
export const validateJSON = (jsonString: string): ValidationResult => {
  if (!jsonString || typeof jsonString !== 'string') {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.INVALID_JSON,
        message: 'Invalid JSON input',
        details: 'Input must be a non-empty string',
      },
    };
  }

  try {
    JSON.parse(jsonString);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.INVALID_JSON,
        message: 'Failed to parse JSON',
        details: error instanceof Error ? error.message : 'Unknown parsing error',
      },
    };
  }
};

/**
 * Validates that a file is a JSON file based on its name and type
 * @param file - The file to validate
 * @returns ValidationResult indicating if the file is valid
 */
export const validateFileType = (file: File): ValidationResult => {
  if (!file) {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.FILE_READ_ERROR,
        message: 'No file provided',
        details: 'Please select a file to upload',
      },
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.json')) {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.FILE_READ_ERROR,
        message: 'Invalid file type',
        details: 'Only JSON files (.json) are supported',
      },
    };
  }

  // Check MIME type if available
  if (file.type && file.type !== 'application/json' && file.type !== 'text/json') {
    return {
      isValid: false,
      error: {
        type: ProfilerErrorType.FILE_READ_ERROR,
        message: 'Invalid file type',
        details: `Expected JSON file but got ${file.type}`,
      },
    };
  }

  return { isValid: true };
};
