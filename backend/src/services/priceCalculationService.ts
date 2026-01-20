/**
 * Price Calculation Service
 * 
 * Implements sentiment-based price calculation using the ratio algorithm:
 * Price = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
 * 
 * Where:
 * - P = positive tokens pool
 * - N = negative tokens pool
 * - EPSILON = per-entity value (determines price sensitivity, typically set to expected daily volume)
 * - BASE_PRICE = 100
 */

import { Entity } from '../models/types';

// Global constants
export const BASE_PRICE = 100;
export const DEFAULT_EPSILON = 10_000; // Default epsilon for backwards compatibility

/**
 * Calculate the sentiment ratio R = (P + EPSILON) / (N + EPSILON)
 */
export function calculateSentimentRatio(positiveTokens: number, negativeTokens: number, epsilon: number): number {
  return (positiveTokens + epsilon) / (negativeTokens + epsilon);
}

/**
 * Calculate the current price based on sentiment pools
 * Price = BASE_PRICE * R = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
 */
export function calculatePrice(positiveTokens: number, negativeTokens: number, epsilon: number = DEFAULT_EPSILON): number {
  const ratio = calculateSentimentRatio(positiveTokens, negativeTokens, epsilon);
  return BASE_PRICE * ratio;
}

/**
 * Calculate price from an Entity object
 */
export function calculatePriceFromEntity(entity: Entity): number {
  const p = entity.positiveTokens ?? 0;
  const n = entity.negativeTokens ?? 0;
  const epsilon = entity.epsilon ?? DEFAULT_EPSILON;
  return calculatePrice(p, n, epsilon);
}

/**
 * Get initial state values (for new entities)
 */
export function getInitialEntityValues(epsilon: number = DEFAULT_EPSILON) {
  return {
    positiveTokens: 0,
    negativeTokens: 0,
    // Initial ratio = (0 + epsilon) / (0 + epsilon) = 1
    // Initial price = 100 * 1 = 100
    epsilon,
  };
}
