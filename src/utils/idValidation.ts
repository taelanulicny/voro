/**
 * ID Validation Utilities
 * Ensures all user and entity IDs are valid before use
 */

/**
 * Validates a user ID
 * @param userId - The user ID to validate
 * @returns true if the user ID is valid, false otherwise
 */
export function isValidUserId(userId: string | null | undefined): userId is string {
  return !!userId && typeof userId === 'string' && userId.trim().length > 0;
}

/**
 * Validates an entity ID
 * @param entityId - The entity ID to validate
 * @returns true if the entity ID is valid, false otherwise
 */
export function isValidEntityId(entityId: number | null | undefined): entityId is number {
  return typeof entityId === 'number' && !isNaN(entityId) && entityId > 0 && Number.isInteger(entityId);
}

/**
 * Validates a user object has a valid ID
 * @param user - The user object to validate
 * @returns true if the user exists and has a valid ID
 */
export function hasValidUserId(user: { id?: string } | null | undefined): user is { id: string } {
  return !!user && isValidUserId(user.id);
}

/**
 * Validates an entity object has a valid ID
 * @param entity - The entity object to validate
 * @returns true if the entity exists and has a valid ID
 */
export function hasValidEntityId(entity: { id?: number } | null | undefined): entity is { id: number } {
  return !!entity && isValidEntityId(entity.id);
}

/**
 * Assert that a user ID is valid, throw error if not
 * @param userId - The user ID to assert
 * @param context - Optional context for error message
 */
export function assertValidUserId(userId: string | null | undefined, context?: string): asserts userId is string {
  if (!isValidUserId(userId)) {
    throw new Error(`Invalid user ID${context ? ` in ${context}` : ''}: ${userId}`);
  }
}

/**
 * Assert that an entity ID is valid, throw error if not
 * @param entityId - The entity ID to assert
 * @param context - Optional context for error message
 */
export function assertValidEntityId(entityId: number | null | undefined, context?: string): asserts entityId is number {
  if (!isValidEntityId(entityId)) {
    throw new Error(`Invalid entity ID${context ? ` in ${context}` : ''}: ${entityId}`);
  }
}


