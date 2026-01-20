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
const CHART_HEIGHT = 220; // Reduced height
const CHART_PADDING = 20;

interface VoteEntity {
  name: string;
  votes: number;
  rank: number;
}

// Fake data - entities not currently in the app (top 9 for centered bell curve)
const FAKE_VOTE_DATA: VoteEntity[] = [
  { name: 'LeBron James', votes: 100000, rank: 1 }, // 100K to show clear difference
  { name: 'Kylie Jenner', votes: 48000, rank: 2 },
  { name: 'Harry Styles', votes: 42000, rank: 3 },
  { name: 'Billie Eilish', votes: 38000, rank: 4 },
  { name: 'IShowSpeed', votes: 32000, rank: 5 },
  { name: 'Tom Brady', votes: 28000, rank: 6 },
  { name: 'Pokimane', votes: 22000, rank: 7 },
  { name: 'Pete Davidson', votes: 18000, rank: 8 },
  { name: 'xQc', votes: 14000, rank: 9 },
];

// X-axis positions mapping: rank to position
// Rank 1 → Position 5, Rank 2 → Position 4, Rank 3 → Position 6, etc.
const getXAxisPositionByOrder = (order: number): number => {
  // order 0 = rank 1 (most votes) → position 5
  // order 1 = rank 2 → position 4
  // order 2 = rank 3 → position 6
  // order 3 = rank 4 → position 3
  // order 4 = rank 5 → position 7
  // order 5 = rank 6 → position 2
  // order 6 = rank 7 → position 8
  // order 7 = rank 8 → position 1
  // order 8 = rank 9 → position 9
  const positions = [5, 4, 6, 3, 7, 2, 8, 1, 9];
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
  // Calculate chart width accounting for container margin (16) and padding (16) on each side
  const containerMargin = 16;
  const containerPadding = 16;
  const chartWidth = SCREEN_WIDTH - (containerMargin * 2) - (containerPadding * 2);
  const totalSlots = 9; // 9 slots with positions 1-9
  const minPosition = 1;
  const maxPosition = 9;
  const centerPosition = 5; // Center of positions 1-9
  const barSpacing = chartWidth / (maxPosition - minPosition + 2); // Spacing between positions
  const baseBarWidth = barSpacing * 0.85; // Increased from 0.6 to 0.85 for thicker bars

  // Sort by vote count (descending) - tallest first
  // Rank 1 = most votes (position 1), Rank 2 = 2nd most (position 2), etc.
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
            {/* Bars - all 9 positions with rank 1 at position 5 (center) */}
            {sortedByVotes.map((entity, index) => {
              const slotPosition = getXAxisPositionByOrder(index); // Rank 1 → position 5, Rank 2 → position 4, Rank 3 → position 6
              const maxBarHeight = CHART_HEIGHT - 35; // Reserve minimal space for rank label at bottom
              // Use actual vote count for height - scales proportionally to show clear differences
              // If rank 1 has 100K and rank 2 has 48K, rank 2's bar will be 48% the height of rank 1's bar
              const barHeight = (entity.votes / maxVotes) * maxBarHeight;
              // Center position 5 at chart center, then space other positions relative to it
              const chartCenter = chartWidth / 2;
              const xPos = chartCenter + ((slotPosition - centerPosition) * barSpacing) - (baseBarWidth / 2);
              
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
                        bottom: 0, // Touch x-axis
                      },
                    ]}
                  />
                  
                  {/* Rank label inside the bar at the bottom */}
                  <Text style={styles.rankLabel}>
                    #{index + 1}
                  </Text>
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
            Select from the top 9 or write your own
          </Text>

          {/* Top 9 Entity Buttons */}
          <View style={styles.entityButtonsContainer}>
            {sortedByVotes.map((entity, index) => (
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
                  #{index + 1} {entity.name}
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
            The top three entities at the end of each calendar week will be taken out of the voting pool and put onto the app.
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
  rankLabel: {
    position: 'absolute',
    bottom: 5,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    fontSize: 14,
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
