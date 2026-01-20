import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useTheme } from '../context/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 300;
const CHART_PADDING = 20;

interface VoteEntity {
  name: string;
  votes: number;
  rank: number;
}

// Fake data - entities not currently in the app
const FAKE_VOTE_DATA: VoteEntity[] = [
  { name: 'LeBron James', votes: 61000, rank: 1 },
  { name: 'Kylie Jenner', votes: 48000, rank: 2 },
  { name: 'Harry Styles', votes: 42000, rank: 3 },
  { name: 'Billie Eilish', votes: 38000, rank: 4 },
  { name: 'IShowSpeed', votes: 32000, rank: 5 },
  { name: 'Tom Brady', votes: 28000, rank: 6 },
  { name: 'Pokimane', votes: 22000, rank: 7 },
  { name: 'Pete Davidson', votes: 18000, rank: 8 },
  { name: 'xQc', votes: 14000, rank: 9 },
  { name: 'Sam Altman', votes: 1000, rank: 10 },
];

// X-axis positions: tallest in center (position 5), second left (3), third right (7), etc.
// This creates the alternating pattern from center outward based on vote count order
const getXAxisPositionByOrder = (order: number): number => {
  // Center is at 5, then alternate left/right: [5, 3, 7, 1, 9, 0, 10, 2, 8, 4]
  // order 0 = tallest (center), order 1 = second (left), order 2 = third (right), etc.
  const positions = [5, 3, 7, 1, 9, 0, 10, 2, 8, 4];
  return positions[order] || 5;
};

// Format votes: 1K, 1.1K, etc. after 999
const formatVotes = (votes: number): string => {
  if (votes >= 1000) {
    const k = votes / 1000;
    if (k >= 10) {
      return `${Math.floor(k)}K`;
    }
    return `${k.toFixed(1)}K`;
  }
  return votes.toString();
};

export default function CastYourVoteScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [customEntityName, setCustomEntityName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [voteData] = useState<VoteEntity[]>(FAKE_VOTE_DATA);

  const handleCastVote = () => {
    if (selectedEntity) {
      // TODO: Submit vote to backend
      console.log('Voting for:', selectedEntity);
      setSelectedEntity(null);
      // Show success message or update UI
    } else if (customEntityName.trim()) {
      // TODO: Submit custom entity vote to backend
      console.log('Voting for custom entity:', customEntityName.trim());
      setCustomEntityName('');
      setShowCustomInput(false);
      // Show success message or update UI
    }
  };

  const maxVotes = Math.max(...voteData.map((e) => e.votes));
  const chartWidth = SCREEN_WIDTH - CHART_PADDING * 2;
  const totalSlots = 10;
  const barSpacing = chartWidth / (totalSlots + 1); // Even spacing for 10 slots
  const baseBarWidth = barSpacing * 0.6;

  // Sort by vote count (descending) - tallest first
  const sortedByVotes = [...voteData].sort((a, b) => b.votes - a.votes);

  const handleEntitySelect = (entityName: string) => {
    setSelectedEntity(entityName);
    setShowCustomInput(false);
    setCustomEntityName('');
  };

  const handleCustomInput = () => {
    setShowCustomInput(true);
    setSelectedEntity(null);
  };

  const canVote = selectedEntity !== null || (customEntityName.trim().length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Cast Your Vote</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Chart Section */}
        <View style={[styles.chartContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>This Week's Top Requests</Text>
          
          {/* Chart */}
          <View style={[styles.chart, { height: CHART_HEIGHT, width: chartWidth }]}>
            {/* Bars - ordered by vote count (tallest in center) */}
            {sortedByVotes.map((entity, index) => {
              const slotPosition = getXAxisPositionByOrder(index); // 0 = center, 1 = left, 2 = right, etc.
              const barHeight = (entity.votes / maxVotes) * (CHART_HEIGHT - 60); // Reserve space for text at bottom
              const xPos = (slotPosition * barSpacing) - (baseBarWidth / 2);
              
              return (
                <View
                  key={entity.name}
                  style={[
                    styles.barContainer,
                    {
                      left: xPos,
                      width: baseBarWidth,
                      height: CHART_HEIGHT,
                    },
                  ]}
                >
                  {/* Bar - extends upward from x-axis */}
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: index === 0 ? '#775a96' : theme.primary, // Tallest bar is purple
                        height: barHeight,
                        width: baseBarWidth,
                        bottom: 25, // Start at x-axis level
                        zIndex: 0, // Bar is behind the text
                      },
                    ]}
                  />
                  
                  {/* Entity name and votes at the bottom (x-axis level) */}
                  <View
                    style={[
                      styles.entityNameContainer,
                      {
                        bottom: 25, // Position at x-axis level, on top of bar base
                        zIndex: 1, // Text appears on top of bar
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.entityNameText,
                        {
                          color: theme.text,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.7}
                    >
                      {entity.name} {formatVotes(entity.votes)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Vote Selection Section */}
        <View style={[styles.voteSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Cast Your Vote for Next Entity
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Select from the top 10 or write your own
          </Text>

          {/* Top 10 Entity Buttons */}
          <View style={styles.entityButtonsContainer}>
            {sortedByVotes.map((entity) => (
              <TouchableOpacity
                key={entity.name}
                style={[
                  styles.entityButton,
                  {
                    backgroundColor: selectedEntity === entity.name ? theme.primary : theme.backgroundSecondary,
                    borderColor: selectedEntity === entity.name ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleEntitySelect(entity.name)}
              >
                <Text
                  style={[
                    styles.entityButtonText,
                    {
                      color: selectedEntity === entity.name ? '#FFFFFF' : theme.text,
                    },
                  ]}
                >
                  {entity.name}
                </Text>
                <Text
                  style={[
                    styles.entityButtonVotes,
                    {
                      color: selectedEntity === entity.name ? '#FFFFFF' : theme.textSecondary,
                    },
                  ]}
                >
                  {formatVotes(entity.votes)} votes
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Entity Input */}
          {showCustomInput && (
            <View style={styles.customInputContainer}>
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Enter entity name"
                placeholderTextColor={theme.textTertiary}
                value={customEntityName}
                onChangeText={setCustomEntityName}
                autoCapitalize="words"
              />
              <Text style={[styles.spellingWarning, { color: theme.textTertiary }]}>
                Make sure to double-check spelling
              </Text>
            </View>
          )}

          {/* Don't see your entity button */}
          {!showCustomInput && (
            <TouchableOpacity
              style={[styles.customButton, { borderColor: theme.border }]}
              onPress={handleCustomInput}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.customButtonText, { color: theme.textSecondary }]}>
                Don't see the entity you want included?
              </Text>
            </TouchableOpacity>
          )}

          {/* Cast Vote Button */}
          <TouchableOpacity
            style={[
              styles.castVoteButton,
              {
                backgroundColor: canVote ? theme.primary : theme.backgroundTertiary,
              },
              !canVote && styles.castVoteButtonDisabled,
            ]}
            onPress={handleCastVote}
            disabled={!canVote}
          >
            <Text
              style={[
                styles.castVoteButtonText,
                {
                  color: canVote ? '#FFFFFF' : theme.textTertiary,
                },
              ]}
            >
              Cast Your Vote
            </Text>
          </TouchableOpacity>

          {/* Voting Info */}
          <Text style={[styles.votingInfo, { color: theme.textTertiary }]}>
            You can vote once per day. Voting closes 2am EST Sunday and reopens 8am EST Monday.
          </Text>
        </View>
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  chartContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    position: 'relative',
  },
  barContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  entityNameContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Text appears on top of bar
  },
  entityNameText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  voteSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  entityButtonsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  entityButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  entityButtonText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  entityButtonVotes: {
    fontSize: 14,
    marginLeft: 8,
  },
  customInputContainer: {
    marginBottom: 16,
  },
  customInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 8,
  },
  spellingWarning: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 4,
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  customButtonText: {
    fontSize: 14,
  },
  castVoteButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  castVoteButtonDisabled: {
    opacity: 0.5,
  },
  castVoteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  votingInfo: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
