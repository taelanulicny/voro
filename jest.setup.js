// Note: @testing-library/jest-native is deprecated, using built-in matchers from @testing-library/react-native v12.4+
// jest-expo handles most of the setup, we just add our mocks here

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(storage[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(storage))),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map(key => [key, storage[key] || null]))
    ),
    multiSet: jest.fn((pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => {
        storage[key] = value;
      });
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach(key => delete storage[key]);
      return Promise.resolve();
    }),
  };
});

// Mock SecureStore
jest.mock('expo-secure-store', () => {
  const secureStorage = {};
  return {
    getItemAsync: jest.fn((key: string) => Promise.resolve(secureStorage[key] || null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      secureStorage[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      delete secureStorage[key];
      return Promise.resolve();
    }),
  };
});

// Mock React Native modules
jest.mock('react-native', () => {
  // Create a complete mock since react-native isn't available in test environment
  return {
    Platform: {
      OS: 'ios',
      select: jest.fn((dict) => dict.ios),
      Version: 1,
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({
        remove: jest.fn(),
      })),
      removeEventListener: jest.fn(),
    },
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(() => ({
        remove: jest.fn(),
      })),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    StyleSheet: {
      create: jest.fn((styles) => styles),
      flatten: jest.fn(),
      compose: jest.fn(),
    },
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    FlatList: 'FlatList',
    TouchableOpacity: 'TouchableOpacity',
    TouchableHighlight: 'TouchableHighlight',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    Image: 'Image',
    ActivityIndicator: 'ActivityIndicator',
    SafeAreaView: 'SafeAreaView',
    TextInput: 'TextInput',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    Modal: 'Modal',
    Alert: {
      alert: jest.fn(),
      prompt: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
    },
  };
});

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      cancelled: false,
      assets: [
        {
          uri: 'file:///test/image.jpg',
          type: 'image/jpeg',
          width: 100,
          height: 100,
        },
      ],
    })
  ),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
  ImagePickerOptions: {},
}));

// Mock react-native-ssl-pinning
jest.mock('react-native-ssl-pinning', () => ({
  fetch: jest.fn(),
}));

// Mock react-native-screenshot-prevent
jest.mock('react-native-screenshot-prevent', () => ({
  enabled: jest.fn(),
  disabled: jest.fn(),
}));

// Mock react-native-purchases
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  setDebugLogsEnabled: jest.fn(),
  getOfferings: jest.fn(() => Promise.resolve({ current: null })),
  getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  purchasePackage: jest.fn(() => Promise.resolve({ customerInfo: {} })),
  restorePurchases: jest.fn(() => Promise.resolve({})),
  logIn: jest.fn(() => Promise.resolve({})),
  logOut: jest.fn(() => Promise.resolve({})),
}));

// Mock @sentry/react-native
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  configureScope: jest.fn(),
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  useAuthRequest: jest.fn(() => [
    {
      request: {},
      response: null,
      promptAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
    },
    null,
  ]),
  ResponseType: {
    Code: 'code',
  },
  useAutoDiscovery: jest.fn(() => null),
}));

// Mock expo-apple-authentication
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  signInAsync: jest.fn(() =>
    Promise.resolve({
      user: 'test-user-id',
      email: 'test@example.com',
      fullName: { givenName: 'Test', familyName: 'User' },
      identityToken: 'test-identity-token',
      authorizationCode: 'test-auth-code',
    })
  ),
}));

// Mock react-native-chart-kit
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  BarChart: 'BarChart',
  PieChart: 'PieChart',
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Line: 'Line',
  Rect: 'Rect',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Pattern: 'Pattern',
  Mask: 'Mask',
  Marker: 'Marker',
  View: 'View',
}));

// Global test utilities
global.console = {
  ...console,
  // Uncomment to ignore specific console methods in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch globally
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Clear AsyncStorage mock
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  AsyncStorage.clear();
  // Clear SecureStore mock
  const SecureStore = require('expo-secure-store');
  Object.keys(SecureStore).forEach(key => {
    if (typeof SecureStore[key] === 'function') {
      SecureStore[key].mockClear();
    }
  });
});

