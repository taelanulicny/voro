/**
 * Sentiment-Based Trading Utilities (Frontend)
 * 
 * Implements the same algorithm as backend:
 * Price = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
 */

// Global constants (must match backend)
export const BASE_PRICE = 100;
export const EPSILON = 10_000;

/**
 * Calculate the sentiment ratio R = (P + EPSILON) / (N + EPSILON)
 */
export function calculateSentimentRatio(positiveTokens: number, negativeTokens: number): number {
  const p = positiveTokens || 0;
  const n = negativeTokens || 0;
  return (p + EPSILON) / (n + EPSILON);
}

/**
 * Calculate the current price based on sentiment pools
 * Price = BASE_PRICE * R = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
 */
export function calculatePrice(positiveTokens: number, negativeTokens: number): number {
  const ratio = calculateSentimentRatio(positiveTokens, negativeTokens);
  return BASE_PRICE * ratio;
}

/**
 * Get initial pool values for a new entity
 */
export function getInitialPoolValues() {
  return {
    positiveTokens: 0,
    negativeTokens: 0,
    // Initial ratio = (0 + 10,000) / (0 + 10,000) = 1
    // Initial price = 100 * 1 = 100
  };
}
