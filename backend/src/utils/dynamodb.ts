import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export const docClient = DynamoDBDocumentClient.from(client);

export const TABLE_NAMES = {
  USERS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Users`,
  ENTITIES: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Entities`,
  PORTFOLIOS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Portfolios`,
  TRANSACTIONS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Transactions`,
  POSTS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Posts`,
  COMMENTS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Comments`,
  FOLLOWS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Follows`,
  LIKES: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Likes`,
  WATCHLISTS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Watchlists`,
  NEWS_ARTICLES: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-NewsArticles`,
  PRICE_HISTORY: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-PriceHistory`,
  BLOCKS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Blocks`,
  REPORTS: `${process.env.DYNAMODB_TABLE_PREFIX || 'moro'}-Reports`,
};

