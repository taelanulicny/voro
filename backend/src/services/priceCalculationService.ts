/**
 * Price Calculation Service
 * 
 * Implements sentiment-based price calculation using the ratio algorithm:
 * Price = BASE_PRICE * (P + EPSILON) / (N + EPSILON)
 * 
 * Where:
 * - P = positive tokens pool
 * - N = negative tokens pool
 * - EPSILON = 10,000 (constant, not stored in pool)
 * - BASE_PRICE = 100
 */

import { Entity } from '../models/types';

// Global constants
export const BASE_PRICE = 100;
export const EPSILON = 10_000;

/**
 * Calculate the sentiment ratio R = (P + EPSILON) / (N + EPSILON)
 */
export function calculateSentimentRatio(positiveTokens: number, negativeTokens: number): number {
  return (positiveTokens + EPSILON) / (negativeTokens + EPSILON);
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
 * Calculate price from an Entity object
 */
export function calculatePriceFromEntity(entity: Entity): number {
  const p = entity.positiveTokens ?? 0;
  const n = entity.negativeTokens ?? 0;
  return calculatePrice(p, n);
}

/**
 * Get initial state values (for new entities)
 */
export function getInitialEntityValues() {
  return {
    positiveTokens: 0,
    negativeTokens: 0,
    // Initial ratio = (0 + 10,000) / (0 + 10,000) = 1
    // Initial price = 100 * 1 = 100
  };
}
