/**
 * Price Impact Service
 * 
 * Applies price updates to entities based on news analysis
 * Uses Gemini analysis results to determine token price movements
 */

import { GeminiAnalysisResult } from './geminiService';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Entity } from '../models/types';

/**
 * Apply price impact from Gemini analysis to an entity
 */
export async function applyPriceImpact(
  entityId: number,
  analysis: GeminiAnalysisResult
): Promise<{ success: boolean; newPrice?: number; error?: string }> {
  try {
    // Get current entity
    const entityResult = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAMES.ENTITIES,
        Key: { entityId },
      })
    );

    if (!entityResult.Item) {
      return { success: false, error: `Entity ${entityId} not found` };
    }

    const entity = entityResult.Item as Entity;
    const currentPrice = entity.basePrice || 0;

    // Calculate price change based on tokens
    // Each token = 0.1% price change (adjust as needed)
    const TOKEN_PRICE_RATIO = 0.001; // 1 token = 0.1% change
    
    const tokensUp = analysis.priceImpact.tokensUp || 0;
    const tokensDown = analysis.priceImpact.tokensDown || 0;
    
    const priceChangeUp = currentPrice * (tokensUp * TOKEN_PRICE_RATIO);
    const priceChangeDown = currentPrice * (tokensDown * TOKEN_PRICE_RATIO);
    
    const netPriceChange = priceChangeUp - priceChangeDown;
    const newPrice = Math.max(0.01, currentPrice + netPriceChange); // Minimum price of $0.01

    // Update entity price
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.ENTITIES,
        Key: { entityId },
        UpdateExpression: 'SET basePrice = :newPrice, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':newPrice': newPrice,
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    console.log(`[applyPriceImpact] Updated entity ${entityId}: ${currentPrice} -> ${newPrice} (${tokensUp} up, ${tokensDown} down)`);

    return { success: true, newPrice };
  } catch (error: any) {
    console.error(`[applyPriceImpact] Error applying price impact:`, error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Apply price impact to multiple entities from a single news article
 */
export async function applyPriceImpactToMultiple(
  assignedEntities: GeminiAnalysisResult['assignedEntities'],
  analysis: GeminiAnalysisResult
): Promise<Array<{ entityId: number; success: boolean; newPrice?: number; error?: string }>> {
  const results = await Promise.all(
    assignedEntities.map(async (entity) => {
      const result = await applyPriceImpact(entity.entityId, analysis);
      return {
        entityId: entity.entityId,
        ...result,
      };
    })
  );

  return results;
}

