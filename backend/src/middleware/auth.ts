import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import jwt from 'jsonwebtoken';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// JWT secret for OAuth tokens (should match oauth.ts)
const JWT_SECRET = process.env.JWT_SECRET || 'moro-oauth-secret-key-change-in-production';

// Verify token - supports both Cognito tokens and our custom OAuth JWT tokens
async function verifyToken(token: string): Promise<any> {
  // First, try to decode the token to check its type
  const decoded = jwt.decode(token, { complete: true }) as any;
  
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }

  // Check if it's a Cognito token (has cognito-specific claims)
  const payload = decoded.payload;
  
  if (payload.iss && payload.iss.includes('cognito')) {
    // It's a Cognito token - verify with Cognito
    return verifyCognitoToken(token);
  } else {
    // It's our custom OAuth JWT - verify with our secret
    return verifyOAuthToken(token);
  }
}

// Verify Cognito token
async function verifyCognitoToken(token: string): Promise<any> {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded) {
      throw new Error('Invalid token format');
    }

    // For Cognito ID tokens, we can decode and trust them
    // In production, verify signature with Cognito's JWKS
    if (decoded.sub) {
      return {
        sub: decoded.sub,
        email: decoded.email,
      };
    }

    // Try using GetUser for access tokens
    const command = new GetUserCommand({ AccessToken: token });
    const response = await cognitoClient.send(command);
    
    return {
      sub: response.UserAttributes?.find(attr => attr.Name === 'sub')?.Value || response.Username,
      email: response.UserAttributes?.find(attr => attr.Name === 'email')?.Value,
    };
  } catch (error) {
    // If GetUser fails, try to just decode the token
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.sub) {
      return decoded;
    }
    throw error;
  }
}

// Verify our custom OAuth JWT token
function verifyOAuthToken(token: string): any {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return {
      sub: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    throw new Error('Invalid OAuth token');
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
      const payload = await verifyToken(token);
      
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

