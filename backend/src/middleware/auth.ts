import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import jwt from 'jsonwebtoken';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// JWT secret for OAuth tokens (should match oauth.ts)
// SECURITY: Must be set via environment variable - never use a hardcoded fallback
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
}

// Cognito JWT verifier - cryptographically verifies ID tokens
// This verifies the signature against Cognito's JWKS and checks issuer, audience, expiration
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;

let cognitoJwtVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

if (USER_POOL_ID && CLIENT_ID) {
  try {
    cognitoJwtVerifier = CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: 'id', // Verify ID tokens (not access tokens)
      clientId: CLIENT_ID,
    });
  } catch (error) {
    console.error('Failed to create Cognito JWT verifier:', error);
  }
}

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

// Verify Cognito token with cryptographic signature verification
async function verifyCognitoToken(token: string): Promise<any> {
  try {
    // Use the Cognito JWT verifier to cryptographically verify ID tokens
    if (cognitoJwtVerifier) {
      try {
        const payload = await cognitoJwtVerifier.verify(token);
        // Payload is already verified - signature, issuer, audience, expiration all checked
        return {
          sub: payload.sub,
          email: payload.email as string | undefined,
        };
      } catch (verifyError) {
        // If verification fails, it's not a valid Cognito ID token
        // Try GetUser as fallback for access tokens (legacy support)
        console.warn('Cognito ID token verification failed, trying GetUser for access token:', verifyError);
      }
    }

    // Fallback: Try using GetUser for access tokens (legacy support)
    // Note: This is less secure than JWT verification but may be needed for some tokens
    try {
      const command = new GetUserCommand({ AccessToken: token });
      const response = await cognitoClient.send(command);
      
      return {
        sub: response.UserAttributes?.find(attr => attr.Name === 'sub')?.Value || response.Username,
        email: response.UserAttributes?.find(attr => attr.Name === 'email')?.Value,
      };
    } catch (getUserError) {
      // If GetUser also fails, the token is invalid
      throw new Error('Invalid Cognito token: verification and GetUser both failed');
    }
  } catch (error) {
    console.error('Error verifying Cognito token:', error);
    throw error;
  }
}

// Verify our custom OAuth JWT token
function verifyOAuthToken(token: string): any {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
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
      // SECURITY: No CORS headers for mobile-only API (mobile apps don't use CORS)
      // If web access is needed, configure specific origins in API Gateway
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

