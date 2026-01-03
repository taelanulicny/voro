# Test Suite Documentation

This directory contains a comprehensive test suite for the Moro mobile application.

## Test Structure

```
src/__tests__/
├── helpers/
│   └── testUtils.tsx          # Test utilities and factories
├── context/                   # Context unit tests
│   ├── AuthContext.test.tsx
│   ├── TradingContext.test.tsx
│   ├── SocialContext.test.tsx
│   ├── NewsContext.test.tsx
│   ├── ThemeContext.test.tsx
│   ├── WatchlistContext.test.tsx
│   ├── NotificationsContext.test.tsx
│   └── SideMenuContext.test.tsx
├── services/                   # Service unit tests
│   └── authService.test.ts
├── utils/                      # Utility unit tests
│   ├── jwt.test.ts
│   ├── sanitize.test.ts
│   ├── contentModeration.test.ts
│   └── idValidation.test.ts
├── config/                     # Configuration tests
│   └── api.test.ts
└── integration/                # Integration tests
    ├── authFlow.test.tsx
    ├── tradeFlow.test.tsx
    └── postFlow.test.tsx
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

The test suite covers:

### Contexts (100% coverage)
- **AuthContext**: Login, signup, logout, token refresh, biometric auth, session timeout
- **TradingContext**: Portfolio management, trade execution, price updates, market hours
- **SocialContext**: Posts, comments, likes, bookmarks, drafts, groups, follows
- **NewsContext**: News fetching, caching, filtering, search
- **ThemeContext**: Theme switching, persistence
- **WatchlistContext**: Watchlist management, price alerts
- **NotificationsContext**: Notification fetching, marking as read, pagination
- **SideMenuContext**: Menu visibility state

### Services
- **authService**: Login, signup, OAuth, token verification, refresh, logout

### Utilities
- **jwt**: Token decoding, expiry checking, time until expiry
- **sanitize**: HTML escaping, tag stripping, input sanitization
- **contentModeration**: Slur detection, spam detection, content moderation
- **idValidation**: User ID and entity ID validation

### Configuration
- **api**: Request handling, authentication, caching, rate limiting, offline queue

### Integration Tests
- **Auth Flow**: Complete signup/login/logout flows with session persistence
- **Trade Flow**: Complete buy/sell trade execution with portfolio updates
- **Post Flow**: Complete post creation and interaction flows

## Test Utilities

The `testUtils.tsx` file provides:

- **Custom render function**: Wraps components with all providers
- **Mock data factories**: `createMockUser`, `createMockToken`, `createMockEntity`, etc.
- **Helper functions**: `waitForAsync`, `flushPromises`

## Mocking

The test suite includes comprehensive mocks for:

- React Native modules (AsyncStorage, SecureStore, etc.)
- Expo modules (local-authentication, image-picker, etc.)
- Third-party libraries (react-native-purchases, @sentry/react-native, etc.)
- API requests (fetch, authenticatedRequest, etc.)

## Writing New Tests

When adding new tests:

1. Place unit tests in the appropriate directory (`context/`, `services/`, `utils/`)
2. Place integration tests in `integration/`
3. Use the test utilities from `helpers/testUtils.tsx`
4. Follow the existing test patterns
5. Mock external dependencies
6. Test both success and error cases
7. Test edge cases and boundary conditions

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock all external dependencies (API, storage, native modules)
3. **Coverage**: Aim for high coverage but focus on critical paths
4. **Clarity**: Use descriptive test names and organize tests logically
5. **Speed**: Keep tests fast by avoiding unnecessary waits and using mocks

## Continuous Integration

The test suite is designed to run in CI/CD pipelines. All tests should:
- Run without requiring a device or simulator
- Complete in a reasonable time (< 30 seconds for full suite)
- Be deterministic (no flaky tests)
- Provide clear error messages on failure

