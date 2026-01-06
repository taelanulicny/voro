import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, getChangeColor } from '../utils/dataGenerator';

type CreateAlertScreenRouteProp = RouteProp<RootStackParamList, 'CreateAlert'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type AlertType = 'price-above' | 'price-below' | 'moving-up' | 'moving-down';

interface PriceAlert {
  id: string;
  type: AlertType;
  value: string;
  enabled: boolean;
}

const ALERT_OPTIONS = [
  { id: 'price-above' as AlertType, label: 'Price above' },
  { id: 'price-below' as AlertType, label: 'Price below' },
  { id: 'moving-up' as AlertType, label: 'Moving up %' },
  { id: 'moving-down' as AlertType, label: 'Moving down %' },
];

export default function CreateAlertScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CreateAlertScreenRouteProp>();
  const { theme } = useTheme();
  const { entityId, entityName, entityTicker, currentPrice, change24h, changePercent24h } = route.params;

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAddAlertModal, setShowAddAlertModal] = useState(false);
  const [selectedAlertType, setSelectedAlertType] = useState<AlertType | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [deleteMenuVisible, setDeleteMenuVisible] = useState<string | null>(null);
  const [newsAlertEnabled, setNewsAlertEnabled] = useState(false);
  const [sharpRiseEnabled, setSharpRiseEnabled] = useState(true);
  const [sharpFallEnabled, setSharpFallEnabled] = useState(true);
  const [new52WeekHighEnabled, setNew52WeekHighEnabled] = useState(true);
  const [new52WeekLowEnabled, setNew52WeekLowEnabled] = useState(true);

  const isPositive = change24h >= 0;

  const handleAddAlertOption = (type: AlertType) => {
    setSelectedAlertType(type);
    setShowAddAlertModal(false);
    setShowInput(true);
    setInputValue('');
  };

  const handleSaveAlert = () => {
    if (!selectedAlertType || !inputValue.trim()) return;

    const newAlert: PriceAlert = {
      id: Date.now().toString(),
      type: selectedAlertType,
      value: inputValue,
      enabled: true, // Default to ON
    };

    setAlerts([...alerts, newAlert]);
    setShowInput(false);
    setSelectedAlertType(null);
    setInputValue('');
  };

  const handleDeleteAlert = (alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setAlerts(alerts.filter(a => a.id !== alertId)),
        },
      ]
    );
  };

  const handleToggleAlert = (alertId: string) => {
    setAlerts(alerts.map(a => 
      a.id === alertId ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const getAlertLabel = (type: AlertType) => {
    return ALERT_OPTIONS.find(opt => opt.id === type)?.label || '';
  };

  const getInputPlaceholder = (type: AlertType) => {
    if (type === 'price-above' || type === 'price-below') {
      return '0.00';
    }
    return '0.00';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Create Alert</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setDeleteMenuVisible(null)}
      >
        {/* Stock Information */}
        <View style={[styles.stockInfoSection, { backgroundColor: theme.card }]}>
          <View style={styles.stockInfoLeft}>
            <View style={[styles.stockIcon, { backgroundColor: isPositive ? '#10B981' : '#EF4444' }]}>
              <Text style={styles.stockIconText}>{entityTicker.charAt(0)}</Text>
            </View>
            <View style={styles.stockInfoText}>
              <Text style={[styles.stockTicker, { color: theme.text }]}>{entityTicker}</Text>
              <View style={styles.stockPriceRow}>
                <Text style={[styles.stockPrice, { color: theme.text }]}>
                  {formatCurrency(currentPrice)}
                </Text>
                <Text style={[styles.stockChange, { color: getChangeColor(change24h, theme) }]}>
                  {isPositive ? '+' : ''}{changePercent24h.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Price Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Price</Text>
          
          {/* Existing Alerts */}
          {alerts.map((alert) => (
            <View key={alert.id} style={styles.alertRow}>
              <View style={styles.alertLeft}>
                <Text style={[styles.alertLabel, { color: theme.text }]}>
                  {getAlertLabel(alert.type)}
                </Text>
                <TextInput
                  style={[styles.alertInput, { color: theme.text, borderColor: theme.border }]}
                  value={alert.value}
                  onChangeText={(text) => {
                    setAlerts(alerts.map(a => 
                      a.id === alert.id ? { ...a, value: text } : a
                    ));
                  }}
                  placeholder={getInputPlaceholder(alert.type)}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  editable={true}
                />
              </View>
              <View style={styles.alertRight}>
                <View style={styles.deleteButtonContainer}>
                  <TouchableOpacity
                    onPress={() => setDeleteMenuVisible(deleteMenuVisible === alert.id ? null : alert.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                  {deleteMenuVisible === alert.id && (
                    <View style={[styles.deleteMenu, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <TouchableOpacity
                        onPress={() => {
                          handleDeleteAlert(alert.id);
                          setDeleteMenuVisible(null);
                        }}
                        style={styles.deleteMenuItem}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={[styles.deleteMenuText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <Switch
                  value={alert.enabled}
                  onValueChange={() => handleToggleAlert(alert.id)}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          ))}

          {/* Input Field (when adding new alert) */}
          {showInput && selectedAlertType && (
            <View style={styles.alertRow}>
              <View style={styles.alertLeft}>
                <Text style={[styles.alertLabel, { color: theme.text }]}>
                  {getAlertLabel(selectedAlertType)}
                </Text>
                <TextInput
                  style={[styles.alertInput, { color: theme.text, borderColor: theme.border }]}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder={getInputPlaceholder(selectedAlertType)}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus={true}
                />
              </View>
              <View style={styles.alertRight}>
                <TouchableOpacity
                  onPress={() => {
                    setShowInput(false);
                    setSelectedAlertType(null);
                    setInputValue('');
                  }}
                  style={styles.cancelButton}
                >
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveAlert}
                  style={[styles.saveAlertButton, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.saveAlertButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Add Alert Button */}
          <TouchableOpacity
            style={[styles.addAlertButton, { borderColor: theme.border }]}
            onPress={() => setShowAddAlertModal(true)}
          >
            <Ionicons name="add" size={20} color={theme.primary} />
            <Text style={[styles.addAlertButtonText, { color: theme.primary }]}>Add Alert</Text>
          </TouchableOpacity>
        </View>

        {/* News Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>News</Text>
          <View style={styles.newsAlertRow}>
            <View style={styles.newsAlertLeft}>
              <Text style={[styles.newsAlertDescription, { color: theme.textSecondary }]}>
                Get alerted when News that mentions this entity is posted
              </Text>
            </View>
            <Switch
              value={newsAlertEnabled}
              onValueChange={setNewsAlertEnabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Price Movement Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Price Movement</Text>
          
          {/* Sharp Rise */}
          <View style={styles.priceMovementRow}>
            <View style={styles.priceMovementLeft}>
              <Text style={[styles.priceMovementLabel, { color: theme.text }]}>Sharp Rise</Text>
              <Text style={[styles.priceMovementDescription, { color: theme.textSecondary }]}>
                Rose by 3% within 5 minutes
              </Text>
            </View>
            <Switch
              value={sharpRiseEnabled}
              onValueChange={setSharpRiseEnabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Sharp Fall */}
          <View style={styles.priceMovementRow}>
            <View style={styles.priceMovementLeft}>
              <Text style={[styles.priceMovementLabel, { color: theme.text }]}>Sharp Fall</Text>
              <Text style={[styles.priceMovementDescription, { color: theme.textSecondary }]}>
                Dropped by 3% within 5 minutes
              </Text>
            </View>
            <Switch
              value={sharpFallEnabled}
              onValueChange={setSharpFallEnabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Hit a New 52 Week High */}
          <View style={styles.priceMovementRow}>
            <View style={styles.priceMovementLeft}>
              <Text style={[styles.priceMovementLabel, { color: theme.text }]}>Hit a New 52 Week High</Text>
            </View>
            <Switch
              value={new52WeekHighEnabled}
              onValueChange={setNew52WeekHighEnabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Hit a New 52 Week Low */}
          <View style={styles.priceMovementRow}>
            <View style={styles.priceMovementLeft}>
              <Text style={[styles.priceMovementLabel, { color: theme.text }]}>Hit a New 52 Week Low</Text>
            </View>
            <Switch
              value={new52WeekLowEnabled}
              onValueChange={setNew52WeekLowEnabled}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Scheduled Price Alert Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Scheduled Price Alert</Text>
          {/* Scheduled Price Alert content will be added here */}
        </View>

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomButtonContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={() => {}}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Add Alert Modal */}
      <Modal
        visible={showAddAlertModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddAlertModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay} edges={['bottom']}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAddAlertModal(false)}
          />
          <View style={[styles.addAlertModalContent, { backgroundColor: theme.card }]}>
            {/* Handle bar */}
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Alert</Text>
            </View>

            {/* Options */}
            <View style={styles.modalOptions}>
              {ALERT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.modalOption, { borderBottomColor: theme.border }]}
                  onPress={() => handleAddAlertOption(option.id)}
                >
                  <Text style={[styles.modalOptionText, { color: theme.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  stockInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  stockInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stockIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stockInfoText: {
    flex: 1,
  },
  stockTicker: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  stockPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '500',
  },
  stockChange: {
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  bottomButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  alertLabel: {
    fontSize: 15,
    fontWeight: '500',
    minWidth: 100,
  },
  alertInput: {
    flex: 1,
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  alertRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButtonContainer: {
    position: 'relative',
  },
  deleteButton: {
    padding: 4,
  },
  deleteMenu: {
    position: 'absolute',
    top: 32,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  deleteMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  deleteMenuText: {
    fontSize: 15,
    fontWeight: '500',
  },
  cancelButton: {
    padding: 4,
  },
  saveAlertButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveAlertButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  addAlertButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  addAlertModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '35%',
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalOptions: {
    paddingTop: 8,
  },
  modalOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  modalOptionText: {
    fontSize: 16,
  },
  newsAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newsAlertLeft: {
    flex: 1,
    marginRight: 16,
  },
  newsAlertDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  priceMovementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceMovementLeft: {
    flex: 1,
    marginRight: 16,
  },
  priceMovementLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  priceMovementDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

