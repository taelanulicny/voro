import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTrading } from '../context/TradingContext';
import { useScreenshotProtection } from '../utils/security';
import { RootStackParamList } from '../types';
import { authenticatedRequest, isBackendConfigured } from '../config/api';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Product configuration - map product IDs to cash amounts
const PRODUCT_CONFIG: Record<string, { cashAmount: number; label: string }> = {
  tokens_100: { cashAmount: 100, label: '100 Tokens' },
  tokens_500: { cashAmount: 500, label: '500 Tokens' },
  tokens_1000: { cashAmount: 1000, label: '1,000 Tokens' },
  tokens_2500: { cashAmount: 2500, label: '2,500 Tokens' },
  tokens_5000: { cashAmount: 5000, label: '5,000 Tokens' },
  tokens_10000: { cashAmount: 10000, label: '10,000 Tokens' },
};

export default function PurchasesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, token } = useAuth();
  const { theme, isDark } = useTheme();
  const { refreshPortfolio } = useTrading();
  // SECURITY: Enable screenshot protection for sensitive purchase data
  const { BlurOverlay } = useScreenshotProtection(true);

  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);

  useEffect(() => {
    initializeRevenueCat();
    loadOfferings();
  }, [user]);

  const initializeRevenueCat = async () => {
    try {
      // Initialize RevenueCat with your API key
      // Get your API key from RevenueCat dashboard: https://app.revenuecat.com
      // For iOS: Use your iOS API key
      // For Android: Use your Android API key
      const apiKey = Platform.select({
        ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
        android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
      });

      if (!apiKey) {
        console.warn('RevenueCat API key not configured. Set EXPO_PUBLIC_REVENUECAT_IOS_API_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY');
        setIsLoading(false);
        return;
      }

      await Purchases.configure({ apiKey });

      // Set user ID for RevenueCat (use your app's user ID)
      if (user?.id) {
        await Purchases.logIn(user.id);
      }

      // Set up listener for purchase updates
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        console.log('Customer info updated:', customerInfo);
      });
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
      Alert.alert('Error', 'Failed to initialize purchases. Please try again later.');
    }
  };

  const loadOfferings = async () => {
    try {
      setIsLoading(true);
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null) {
        setOfferings([offerings.current]);
      } else {
        setOfferings([]);
      }
    } catch (error: any) {
      console.error('Error loading offerings:', error);
      Alert.alert('Error', 'Failed to load purchase options. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (packageToPurchase: PurchasesPackage) => {
    if (!user || !token) {
      Alert.alert('Error', 'Please log in to make a purchase.');
      return;
    }

    if (!isBackendConfigured()) {
      Alert.alert('Error', 'Backend not configured. Purchases are not available.');
      return;
    }

    const productId = packageToPurchase.product.identifier;
    const productConfig = PRODUCT_CONFIG[productId];

    if (!productConfig) {
      Alert.alert('Error', `Unknown product: ${productId}`);
      return;
    }

    try {
      setPurchasingProductId(productId);
      
      // Make purchase through RevenueCat
      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToPurchase);

      // Get transaction ID from customerInfo
      const transactionId = customerInfo.latestExpirationDate || 
                           customerInfo.originalPurchaseDate || 
                           `${Date.now()}-${productIdentifier}`;

      // Send purchase to backend for verification and crediting
      const response = await authenticatedRequest(
        '/api/purchases/process',
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            transactionId: `${transactionId}-${productIdentifier}`,
            productId,
            amount: productConfig.cashAmount,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
          }),
        }
      );

      if (response.success) {
        Alert.alert(
          'Success!',
          `You've received ${productConfig.cashAmount.toLocaleString()} tokens!`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Refresh portfolio to show updated balance
                refreshPortfolio();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to process purchase. Please contact support.');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);

      // Handle user cancellation
      if (error.userCancelled) {
        // User cancelled, don't show error
        return;
      }

      // Handle other errors
      if (error.code === 'PURCHASE_NOT_ALLOWED') {
        Alert.alert('Purchase Not Allowed', 'In-app purchases are not allowed on this device.');
      } else if (error.code === 'PAYMENT_PENDING') {
        Alert.alert('Payment Pending', 'Your payment is being processed. You will receive your tokens once payment is confirmed.');
      } else {
        Alert.alert('Purchase Failed', error.message || 'An error occurred during purchase. Please try again.');
      }
    } finally {
      setPurchasingProductId(null);
    }
  };

  const formatPrice = (price: string, currencyCode?: string) => {
    if (!currencyCode) return price;
    // Simple formatting - you might want to use a library like react-native-localize for better formatting
    return `${currencyCode} ${price}`;
  };

  const renderPackage = (packageToPurchase: PurchasesPackage) => {
    const productId = packageToPurchase.product.identifier;
    const productConfig = PRODUCT_CONFIG[productId];
    const isPurchasing = purchasingProductId === productId;

    if (!productConfig) {
      return null; // Skip unknown products
    }

    return (
      <TouchableOpacity
        key={packageToPurchase.identifier}
        style={[
          styles.packageCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
          isPurchasing && styles.packageCardDisabled,
        ]}
        onPress={() => handlePurchase(packageToPurchase)}
        disabled={isPurchasing || !user || !token}
      >
        <View style={styles.packageHeader}>
          <Text style={[styles.packageTitle, { color: theme.text }]}>
            {productConfig.label}
          </Text>
          <Text style={[styles.packagePrice, { color: theme.primary }]}>
            {formatPrice(packageToPurchase.product.priceString, packageToPurchase.product.currencyCode)}
          </Text>
        </View>
        <View style={styles.packageDetails}>
          <View style={styles.packageDetailRow}>
            <Ionicons name="cash-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.packageDetailText, { color: theme.textSecondary }]}>
              {productConfig.cashAmount.toLocaleString()} tokens
            </Text>
          </View>
        </View>
        {isPurchasing && (
          <View style={[styles.purchasingOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)' }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.purchasingText, { color: theme.text }]}>Processing...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {BlurOverlay}
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Buy Tokens</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Loading purchase options...
            </Text>
          </View>
        ) : offerings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Purchase Options Available
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Purchase options are not available at this time. Please check back later.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.infoSection, { backgroundColor: theme.backgroundSecondary }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Tokens are used to trade in the simulator. All purchases are processed securely through Apple/Google.
              </Text>
            </View>

            {offerings.map((offering) => (
              <View key={offering.identifier} style={styles.offeringSection}>
                {offering.availablePackages.map((packageToPurchase) => renderPackage(packageToPurchase))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 24,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  offeringSection: {
    marginBottom: 24,
  },
  packageCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    position: 'relative',
  },
  packageCardDisabled: {
    opacity: 0.6,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  packageDetails: {
    marginTop: 8,
  },
  packageDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  packageDetailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  purchasingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchasingText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

