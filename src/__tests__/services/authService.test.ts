import { login, signup, loginWithOAuth, verifyToken, refreshToken, logout } from '../../services/authService';
import { apiRequest, authenticatedRequest } from '../../config/api';

jest.mock('../../config/api');

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockAuthenticatedRequest = authenticatedRequest as jest.MockedFunction<typeof authenticatedRequest>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
        },
      };

      mockApiRequest.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token');
      expect(result.user).toEqual(mockResponse.user);
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );
    });

    it('should handle login failure', async () => {
      mockApiRequest.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const result = await login({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle network error', async () => {
      mockApiRequest.mockRejectedValue(new Error('Network error'));

      const result = await login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('signup', () => {
    it('should signup and auto-login successfully', async () => {
      mockApiRequest
        .mockResolvedValueOnce({
          success: true,
          data: {
            userId: 'user-123',
            message: 'User created successfully',
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            token: 'test-token',
            refreshToken: 'refresh-token',
            user: {
              id: 'user-123',
              email: 'newuser@example.com',
              username: 'newuser',
              displayName: 'New User',
            },
          },
        });

      const result = await signup({
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
        displayName: 'New User',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token');
      expect(mockApiRequest).toHaveBeenCalledTimes(2); // Signup + auto-login
    });

    it('should handle signup failure', async () => {
      mockApiRequest.mockResolvedValue({
        success: false,
        error: 'Email already exists',
      });

      const result = await signup({
        email: 'existing@example.com',
        password: 'password123',
        username: 'existing',
        displayName: 'Existing User',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });
  });

  describe('loginWithOAuth', () => {
    it('should login with Google successfully', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        data: {
          token: 'test-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'user-123',
            email: 'google@example.com',
            username: 'googleuser',
            displayName: 'Google User',
          },
        },
      });

      const result = await loginWithOAuth({
        email: 'google@example.com',
        id: 'google-id',
        name: 'Google User',
        photo: 'https://example.com/photo.jpg',
        provider: 'google',
        idToken: 'id-token',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token');
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/auth/google',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should login with Apple successfully', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        data: {
          token: 'test-token',
          refreshToken: 'refresh-token',
          user: {
            id: 'user-123',
            email: 'apple@example.com',
            username: 'appleuser',
            displayName: 'Apple User',
          },
        },
      });

      const result = await loginWithOAuth({
        email: 'apple@example.com',
        id: 'apple-id',
        name: 'Apple User',
        provider: 'apple',
        identityToken: 'identity-token',
      });

      expect(result.success).toBe(true);
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/auth/apple',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
      };

      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await verifyToken('test-token');

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
        '/api/auth/me',
        'test-token',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle invalid token', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: false,
        error: 'Invalid token',
      });

      const result = await verifyToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockApiRequest.mockResolvedValue({
        success: true,
        data: {
          token: 'new-token',
        },
      });

      const result = await refreshToken('refresh-token');

      expect(result.success).toBe(true);
      expect(result.token).toBe('new-token');
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: 'refresh-token' }),
        })
      );
    });

    it('should handle refresh failure', async () => {
      mockApiRequest.mockResolvedValue({
        success: false,
        error: 'Invalid refresh token',
      });

      const result = await refreshToken('invalid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockAuthenticatedRequest.mockResolvedValue({
        success: true,
      });

      const result = await logout('test-token');

      expect(result.success).toBe(true);
      expect(mockAuthenticatedRequest).toHaveBeenCalledWith(
        '/api/auth/logout',
        'test-token',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle logout error gracefully', async () => {
      mockAuthenticatedRequest.mockRejectedValue(new Error('Network error'));

      const result = await logout('test-token');

      // Logout should succeed even if server call fails
      expect(result.success).toBe(true);
    });
  });
});

