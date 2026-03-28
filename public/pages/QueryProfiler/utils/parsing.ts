/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProfileData, ProfilerError, ProfilerErrorType } from '../types';
import { validateJSON, validateProfileData } from './validation';

/**
 * Result of parsing operation
 */
export interface ParseResult {
  success: boolean;
  data?: ProfileData;
  error?: ProfilerError;
}

/**
 * Parses a JSON string into ProfileData with validation
 * @param jsonString - The JSON string to parse
 * @returns ParseResult containing the parsed data or error
 */
export const parseProfileJSON = (jsonString: string): ParseResult => {
  // First validate that it's valid JSON
  const jsonValidation = validateJSON(jsonString);
  if (!jsonValidation.isValid) {
    return {
      success: false,
      error: jsonValidation.error,
    };
  }

  // Parse the JSON
  let parsedData: any;
  try {
    parsedData = JSON.parse(jsonString);
  } catch (error) {
    return {
      success: false,
      error: {
        type: ProfilerErrorType.INVALID_JSON,
        message: 'Failed to parse JSON',
        details: error instanceof Error ? error.message : 'Unknown parsing error',
      },
    };
  }

  // Validate the parsed data matches ProfileData structure
  const profileValidation = validateProfileData(parsedData);
  if (!profileValidation.isValid) {
    return {
      success: false,
      error: profileValidation.error,
    };
  }

  return {
    success: true,
    data: parsedData as ProfileData,
  };
};

/**
 * Reads a file and returns its contents as a string
 * @param file - The file to read
 * @returns Promise that resolves with the file contents or rejects with an error
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(
          new Error('Failed to read file: No result from FileReader')
        );
      }
    };

    reader.onerror = () => {
      reject(
        new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`)
      );
    };

    reader.readAsText(file);
  });
};

/**
 * Reads and parses a profile JSON file
 * @param file - The file to read and parse
 * @returns Promise that resolves with ParseResult
 */
export const parseProfileFile = async (file: File): Promise<ParseResult> => {
  try {
    const fileContents = await readFileAsText(file);
    return parseProfileJSON(fileContents);
  } catch (error) {
    return {
      success: false,
      error: {
        type: ProfilerErrorType.FILE_READ_ERROR,
        message: 'Failed to read file',
        details: error instanceof Error ? error.message : 'Unknown file read error',
      },
    };
  }
};

/**
 * Safely serializes ProfileData to JSON string
 * @param data - The ProfileData to serialize
 * @returns JSON string or null if serialization fails
 */
export const serializeProfileData = (data: ProfileData): string | null => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return null;
  }
};
