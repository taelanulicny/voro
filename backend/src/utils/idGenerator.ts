/**
 * ID Generation Utilities
 * Ensures unique IDs for entities and users
 */

import { docClient, TABLE_NAMES } from './dynamodb';
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get the next available entity ID
 * Scans existing entities to find the highest ID and returns the next one
 */
export async function getNextEntityId(): Promise<number> {
  try {
    // Scan all entities to find the maximum ID
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.ENTITIES,
        ProjectionExpression: 'entityId',
      })
    );

    // Find the maximum entityId
    let maxId = 0;
    if (result.Items && result.Items.length > 0) {
      for (const item of result.Items) {
        const entityId = item.entityId as number;
        if (entityId > maxId) {
          maxId = entityId;
        }
      }
    }

    // Return the next ID (maxId + 1)
    return maxId + 1;
  } catch (error) {
    console.error('Error getting next entity ID:', error);
    // Fallback: use timestamp-based ID if scan fails
    return Date.now();
  }
}

/**
 * Validate that all entity IDs are unique
 * Returns array of duplicate IDs if any found
 */
export async function validateEntityIdsUniqueness(): Promise<{ isValid: boolean; duplicates: number[] }> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.ENTITIES,
        ProjectionExpression: 'entityId',
      })
    );

    const ids = (result.Items || []).map(item => item.entityId as number);
    const seen = new Set<number>();
    const duplicates: number[] = [];

    for (const id of ids) {
      if (seen.has(id)) {
        duplicates.push(id);
      } else {
        seen.add(id);
      }
    }

    return {
      isValid: duplicates.length === 0,
      duplicates,
    };
  } catch (error) {
    console.error('Error validating entity IDs:', error);
    return { isValid: false, duplicates: [] };
  }
}

/**
 * Validate that all user IDs are unique
 * Returns array of duplicate IDs if any found
 */
export async function validateUserIdsUniqueness(): Promise<{ isValid: boolean; duplicates: string[] }> {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.USERS,
        ProjectionExpression: 'userId',
      })
    );

    const ids = (result.Items || []).map(item => item.userId as string);
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const id of ids) {
      if (seen.has(id)) {
        duplicates.push(id);
      } else {
        seen.add(id);
      }
    }

    return {
      isValid: duplicates.length === 0,
      duplicates,
    };
  } catch (error) {
    console.error('Error validating user IDs:', error);
    return { isValid: false, duplicates: [] };
  }
}

/**
 * Generate a unique user ID
 * Uses UUID v4 which provides sufficient uniqueness
 */
export function generateUserId(): string {
  return uuidv4();
}

/**
 * Validate that entity IDs in an array are unique
 */
export function validateEntityIdsArray(entities: Array<{ entityId: number }>): { isValid: boolean; duplicates: number[] } {
  const seen = new Set<number>();
  const duplicates: number[] = [];

  for (const entity of entities) {
    if (seen.has(entity.entityId)) {
      duplicates.push(entity.entityId);
    } else {
      seen.add(entity.entityId);
    }
  }

  return {
    isValid: duplicates.length === 0,
    duplicates,
  };
}

