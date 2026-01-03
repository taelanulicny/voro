import { decodeJWT, isTokenExpiredOrNearExpiry, getTimeUntilExpiry } from '../../utils/jwt';

describe('JWT Utils', () => {
  describe('decodeJWT', () => {
    it('should decode valid JWT token', () => {
      const payload = { sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `${header}.${encodedPayload}.signature`;

      const decoded = decodeJWT(token);

      expect(decoded).toEqual(payload);
    });

    it('should return null for invalid token format', () => {
      const invalidToken = 'invalid-token';
      const decoded = decodeJWT(invalidToken);
      expect(decoded).toBeNull();
    });

    it('should return null for token with wrong number of parts', () => {
      const invalidToken = 'part1.part2';
      const decoded = decodeJWT(invalidToken);
      expect(decoded).toBeNull();
    });

    it('should handle malformed base64', () => {
      const invalidToken = 'header.invalid-base64!.signature';
      const decoded = decodeJWT(invalidToken);
      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpiredOrNearExpiry', () => {
    it('should return false for valid token with sufficient time', () => {
      const exp = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      const payload = { exp, iat: Math.floor(Date.now() / 1000) };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `${header}.${encodedPayload}.signature`;

      const isExpired = isTokenExpiredOrNearExpiry(token, 5); // 5 minute buffer

      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp, iat: Math.floor(Date.now() / 1000) - 7200 };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `${header}.${encodedPayload}.signature`;

      const isExpired = isTokenExpiredOrNearExpiry(token, 5);

      expect(isExpired).toBe(true);
    });

    it('should return true for token near expiry', () => {
      const exp = Math.floor(Date.now() / 1000) + 240; // 4 minutes from now
      const payload = { exp, iat: Math.floor(Date.now() / 1000) };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `${header}.${encodedPayload}.signature`;

      const isExpired = isTokenExpiredOrNearExpiry(token, 5); // 5 minute buffer

      expect(isExpired).toBe(true);
    });

    it('should return true for token without exp claim', () => {
      const payload = { sub: 'user-123' };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `${header}.${encodedPayload}.signature`;

      const isExpired = isTokenExpiredOrNearExpiry(token, 5);

      expect(isExpired).toBe(true);
    });

    it('should return true for invalid token', () => {
      const isExpired = isTokenExpiredOrNearExpiry('invalid-token', 5);
      expect(isExpired).toBe(true);
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('should return correct time until expiry', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = { exp, iat: Math.floor(Date.now() / 1000) };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `${header}.${encodedPayload}.signature`;

      const timeUntilExpiry = getTimeUntilExpiry(token);

      expect(timeUntilExpiry).toBeGreaterThan(3590000); // ~1 hour in ms
      expect(timeUntilExpiry).toBeLessThan(3610000);
    });

    it('should return 0 for expired token', () => {
      const exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload = { exp, iat: Math.floor(Date.now() / 1000) - 7200 };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `${header}.${encodedPayload}.signature`;

      const timeUntilExpiry = getTimeUntilExpiry(token);

      expect(timeUntilExpiry).toBe(0);
    });

    it('should return null for token without exp claim', () => {
      const payload = { sub: 'user-123' };
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `${header}.${encodedPayload}.signature`;

      const timeUntilExpiry = getTimeUntilExpiry(token);

      expect(timeUntilExpiry).toBeNull();
    });

    it('should return null for invalid token', () => {
      const timeUntilExpiry = getTimeUntilExpiry('invalid-token');
      expect(timeUntilExpiry).toBeNull();
    });
  });
});

