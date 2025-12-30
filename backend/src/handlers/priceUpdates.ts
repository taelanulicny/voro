import { EventBridgeEvent } from 'aws-lambda';
import { docClient, TABLE_NAMES } from '../utils/dynamodb';
import { ScanCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Entity, PriceHistory } from '../models/types';

/**
 * Price Update Lambda Handler
 * 
 * This Lambda is scheduled to run every 5 minutes via EventBridge.
 * It updates prices for all entities in the PriceHistory table.
 * 
 * To verify deployment:
 * 1. Check CloudWatch logs for execution logs
 * 2. Verify EventBridge rule is active in AWS Console
 * 3. Check PriceHistory table for recent price updates
 */
export async function updatePrices(event: EventBridgeEvent<'Scheduled Event', any>): Promise<void> {
  try {
    // Get all entities
    const entitiesResult = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.ENTITIES,
      })
    );

    const entities = (entitiesResult.Items || []) as Entity[];
    const now = new Date().toISOString();

    // Update prices for each entity
    for (const entity of entities) {
      // Get current price
      const priceResult = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAMES.PRICE_HISTORY,
          KeyConditionExpression: 'entityId = :entityId',
          ExpressionAttributeValues: {
            ':entityId': entity.entityId,
          },
          ScanIndexForward: false,
          Limit: 1,
        })
      );

      let currentPrice = entity.basePrice;
      if (priceResult.Items && priceResult.Items.length > 0) {
        currentPrice = (priceResult.Items[0] as PriceHistory).price;
      }

      // Simulate realistic price changes
      // Use a random walk with slight mean reversion to base price
      // Volatility: ±0.5% to ±2% per update (every 5 minutes)
      const volatility = 0.02; // 2% max change per update
      const meanReversion = 0.1; // 10% pull toward base price
      
      // Random walk component
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      
      // Mean reversion component (pull price toward base price)
      const deviationFromBase = (currentPrice - entity.basePrice) / entity.basePrice;
      const reversionForce = -deviationFromBase * meanReversion;
      
      // Combine both forces
      const totalChangePercent = randomChange + reversionForce;
      const change = currentPrice * totalChangePercent;
      const newPrice = Math.max(
        entity.basePrice * 0.3, // Allow prices to drop to 30% of base
        Math.min(entity.basePrice * 2.0, currentPrice + change) // Allow prices to rise to 200% of base
      );
      const roundedPrice = Math.round(newPrice * 100) / 100;

      // Store new price in history
      const priceHistory: PriceHistory = {
        entityId: entity.entityId,
        timestamp: now,
        price: roundedPrice,
      };

      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.PRICE_HISTORY,
          Item: priceHistory,
        })
      );
    }

    console.log(`Updated prices for ${entities.length} entities at ${now}`);
  } catch (error) {
    console.error('Error updating prices:', error);
    throw error;
  }
}

