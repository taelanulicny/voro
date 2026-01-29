import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';
import { generateId } from '../utils/idGenerator';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const SUPPORT_TICKETS_TABLE = process.env.SUPPORT_TICKETS_TABLE || 'SupportTickets';

interface CreateTicketParams {
  userId: string;
  category: string;
  subject: string;
  description: string;
  userEmail?: string;
  userName?: string;
}

export async function createSupportTicket(params: CreateTicketParams): Promise<{
  success: boolean;
  error?: string;
  ticketId?: string;
  createdAt?: string;
}> {
  try {
    const ticketId = `TICKET-${generateId()}`;
    const now = new Date().toISOString();

    const ticket = {
      ticketId,
      userId: params.userId,
      category: params.category,
      subject: params.subject,
      description: params.description,
      userEmail: params.userEmail,
      userName: params.userName,
      status: 'open',
      createdAt: now,
      updatedAt: now,
      GSI1PK: `USER#${params.userId}`,
      GSI1SK: `TICKET#${now}`,
    };

    await dynamodb.send(
      new PutCommand({
        TableName: SUPPORT_TICKETS_TABLE,
        Item: ticket,
      })
    );

    logger.info('Support ticket created', { ticketId, userId: params.userId });

    // TODO: Send notification email to support team
    // await sendSupportNotification(ticket);

    return {
      success: true,
      ticketId,
      createdAt: now,
    };
  } catch (error) {
    logger.error('Error creating support ticket', error);
    return {
      success: false,
      error: 'Failed to create support ticket',
    };
  }
}
