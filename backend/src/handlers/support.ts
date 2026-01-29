import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateRequest, createResponse, createErrorResponse } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createSupportTicket } from '../services/supportService';

export async function createTicketHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.authenticated || !auth.event) {
      return createErrorResponse(401, 'Unauthorized');
    }

    const userId = auth.event.userId!;
    const body = JSON.parse(event.body || '{}');
    const { category, subject, description, userEmail, userName } = body;

    // Validation
    if (!category || !subject || !description) {
      return createErrorResponse(400, 'Missing required fields: category, subject, description');
    }

    if (subject.length > 100) {
      return createErrorResponse(400, 'Subject must be 100 characters or less');
    }

    if (description.length < 20 || description.length > 1000) {
      return createErrorResponse(400, 'Description must be between 20 and 1000 characters');
    }

    const validCategories = ['technical', 'account', 'trading', 'billing', 'other'];
    if (!validCategories.includes(category)) {
      return createErrorResponse(400, 'Invalid category');
    }

    const result = await createSupportTicket({
      userId,
      category,
      subject,
      description,
      userEmail,
      userName,
    });

    if (!result.success) {
      return createErrorResponse(400, result.error || 'Failed to create support ticket');
    }

    return createResponse(201, {
      success: true,
      message: 'Support ticket created successfully',
      data: {
        ticketId: result.ticketId,
        status: 'open',
        createdAt: result.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Error creating support ticket', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
}
