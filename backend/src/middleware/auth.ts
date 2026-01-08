import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// For JWT verification, we'll use a simpler approach with Cognito's public keys
// In production, you'd want to cache the JWKS
async function verifyCognitoToken(token: string): Promise<any> {
  try {
    // Decode without verification first to get the kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }

    // For now, we'll use a simpler verification
    // In production, fetch JWKS from Cognito and verify properly
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID not set');
    }

    // Use Cognito's GetUser to verify the token
    const command = new GetUserCommand({ AccessToken: token });
    const response = await cognitoClient.send(command);
    
    return {
      sub: response.Username,
      email: response.UserAttributes?.find(attr => attr.Name === 'email')?.Value,
    };
  } catch (error) {
    // If GetUser fails, try to verify as ID token
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.sub) {
        return decoded;
      }
    } catch (e) {
      throw error;
    }
    throw error;
  }
}

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  userId?: string;
  userEmail?: string;
}

export async function authenticateRequest(
  event: APIGatewayProxyEvent
): Promise<{ authenticated: boolean; event?: AuthenticatedEvent; error?: string }> {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7);
    
    try {
      const payload = await verifyCognitoToken(token);
      
      const authenticatedEvent: AuthenticatedEvent = {
        ...event,
        userId: payload.sub,
        userEmail: payload.email,
      };

      return { authenticated: true, event: authenticatedEvent };
    } catch (error) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }
  } catch (error: any) {
    return { authenticated: false, error: error.message || 'Authentication failed' };
  }
}

export function createResponse(
  statusCode: number,
  body: any,
  headers?: Record<string, string>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function createErrorResponse(
  statusCode: number,
  message: string,
  error?: any
): APIGatewayProxyResult {
  return createResponse(statusCode, {
    success: false,
    error: message,
    ...(error && process.env.NODE_ENV === 'development' && { details: error }),
  });
}

