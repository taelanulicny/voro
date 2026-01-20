import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Animated,
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

// X-axis positions: 1 in center (position 5), 2 left (3), 3 right (7), 4 left of 2 (1), etc.
// This creates the alternating pattern from center outward
const getXAxisPosition = (rank: number): number => {
  // Center is at 5, then alternate left/right: [5, 3, 7, 1, 9, 0, 10, 2, 8, 4]
  const positions = [5, 3, 7, 1, 9, 0, 10, 2, 8, 4]; // Positions 1-10 mapped to indices 0-9
  return positions[rank - 1] || 5;
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
  const [voteData, setVoteData] = useState<VoteEntity[]>(FAKE_VOTE_DATA);
  const [barAnimations] = useState(
    FAKE_VOTE_DATA.map(() => new Animated.Value(0))
  );

  // Animate bars on mount
  useEffect(() => {
    Animated.parallel(
      barAnimations.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  // Simulate updates every second (fake data will update)
  useEffect(() => {
    const interval = setInterval(() => {
      // In real implementation, this would fetch from backend
      // For now, just use the same fake data
      setVoteData([...FAKE_VOTE_DATA]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Sort by rank to ensure correct order
  const sortedData = [...voteData].sort((a, b) => a.rank - b.rank);

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
            {/* Bars */}
            {sortedData.map((entity, index) => {
              const slotPosition = getXAxisPosition(entity.rank); // 0-10 position
              const barHeight = (entity.votes / maxVotes) * (CHART_HEIGHT - 100); // Reserve space for labels
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
                  {/* Bar */}
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: entity.rank === 1 ? '#775a96' : theme.primary,
                        height: barHeight,
                        width: baseBarWidth,
                        bottom: 80, // Space for labels
                        transform: [
                          {
                            scaleY: barAnimations[index],
                          },
                        ],
                      },
                    ]}
                  >
                    {/* Entity name inside bar (rotated vertically, starting from bottom) */}
                    <View
                      style={[
                        styles.barTextContainer,
                        {
                          width: baseBarWidth,
                          height: barHeight,
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          paddingTop: 4,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.barText,
                          {
                            color: '#FFFFFF',
                            fontSize: 10,
                            fontWeight: '600',
                            transform: [{ rotate: '-90deg' }],
                            textAlign: 'left',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {entity.name}
                      </Text>
                    </View>
                  </Animated.View>
                  
                  {/* X-axis label (rank number) */}
                  <Text style={[styles.rankLabel, { color: theme.textSecondary }]}>
                    {entity.rank}
                  </Text>
                  
                  {/* Vote count label */}
                  <Text style={[styles.voteCountLabel, { color: theme.text }]}>
                    {formatVotes(entity.votes)}
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
            Select from the top 10 or write your own
          </Text>

          {/* Top 10 Entity Buttons */}
          <View style={styles.entityButtonsContainer}>
            {sortedData.map((entity) => (
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
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  barContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 4,
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  barTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barText: {
    fontSize: 10,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  rankLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    position: 'absolute',
    bottom: 40,
  },
  voteCountLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    position: 'absolute',
    bottom: 20,
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
