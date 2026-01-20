/**
 * Sentiment-Based Trading Utilities (Frontend)
 * 
 * Implements the same algorithm as backend:
 * Price = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
 */

// Global constants (must match backend)
export const BASE_PRICE = 100;
export const EPSILON = 10_000; // Default epsilon for backwards compatibility

/**
 * Calculate the sentiment ratio R = (P + EPSILON) / (N + EPSILON)
 */
export function calculateSentimentRatio(positiveTokens: number, negativeTokens: number, epsilon: number = EPSILON): number {
  const p = positiveTokens || 0;
  const n = negativeTokens || 0;
  return (p + epsilon) / (n + epsilon);
}

/**
 * Calculate the current price based on sentiment pools
 * Price = BASE_PRICE * R = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
 */
export function calculatePrice(positiveTokens: number, negativeTokens: number, epsilon: number = EPSILON): number {
  const ratio = calculateSentimentRatio(positiveTokens, negativeTokens, epsilon);
  return BASE_PRICE * ratio;
}

/**
 * Get initial pool values for a new entity
 */
export function getInitialPoolValues(epsilon: number = EPSILON) {
  return {
    positiveTokens: 0,
    negativeTokens: 0,
    // Initial ratio = (0 + epsilon) / (0 + epsilon) = 1
    // Initial price = 100 * 1 = 100
    epsilon,
  };
}
