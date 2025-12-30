/**
 * JWT utility functions
 * Simple JWT decoding (no verification - backend handles verification)
 */

export interface JWTPayload {
  exp?: number; // Expiration timestamp
  iat?: number; // Issued at timestamp
  sub?: string; // Subject (user ID)
  [key: string]: any;
}

/**
 * Decode JWT token (base64 decode, no verification)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode payload (second part)
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Check if token is expired or near expiry
 * @param token JWT token
 * @param bufferMinutes Minutes before expiry to consider token "near expiry" (default: 5)
 */
export function isTokenExpiredOrNearExpiry(token: string, bufferMinutes: number = 5): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // If we can't decode or no expiry, consider expired
  }
  
  const expiryTime = payload.exp * 1000; // Convert to milliseconds
  const bufferTime = bufferMinutes * 60 * 1000; // Convert buffer to milliseconds
  const now = Date.now();
  
  return now >= (expiryTime - bufferTime);
}

/**
 * Get time until token expires (in milliseconds)
 */
export function getTimeUntilExpiry(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }
  
  const expiryTime = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  return Math.max(0, expiryTime - now);
}

