import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useNews } from '../context/NewsContext';
import { useTheme } from '../context/ThemeContext';

type NewsDetailRouteProp = RouteProp<RootStackParamList, 'NewsDetail'>;

const { width } = Dimensions.get('window');

export default function NewsDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<NewsDetailRouteProp>();
  const { articleId } = route.params;
  const { news, markAsRead } = useNews();
  const { theme } = useTheme();
  
  const [isBookmarked, setIsBookmarked] = useState(false);

  const article = news.find(a => a.id === articleId);

  useEffect(() => {
    if (article) {
      markAsRead(articleId);
    }
  }, [articleId]);

  if (!article) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Article not found</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSentimentColor = () => {
    if (article.sentiment === 'positive') return '#10B981';
    if (article.sentiment === 'negative') return '#EF4444';
    return '#6B7280';
  };

  const getSentimentIcon = () => {
    if (article.sentiment === 'positive') return 'trending-up';
    if (article.sentiment === 'negative') return 'trending-down';
    return 'remove';
  };

  const getImpactColor = () => {
    switch (article.impactLevel) {
      case 'critical': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#775a96';
      case 'low': return '#6B7280';
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title}\n\n${article.summary}\n\nRead more on Moro`,
        title: article.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleOpenSource = () => {
    if (article.sourceUrl) {
      Linking.openURL(article.sourceUrl);
    }
  };

  const handleEntityPress = () => {
    if (article.entityId) {
      navigation.navigate('Entity' as never, {
        entityId: article.entityId,
        categoryId: article.category,
      } as never);
    }
  };

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
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setIsBookmarked(!isBookmarked)}
          >
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isBookmarked ? theme.primary : theme.textSecondary}
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: theme.backgroundSecondary }]} showsVerticalScrollIndicator={false}>
        {/* Breaking Badge */}
        {article.isBreaking && (
          <View style={styles.breakingBadge}>
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={styles.breakingText}>BREAKING NEWS</Text>
          </View>
        )}

        {/* Category & Impact */}
        <View style={styles.metadataRow}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.categoryText, { color: theme.primary }]}>{article.category}</Text>
          </View>
          <View style={[styles.impactBadge, { backgroundColor: getImpactColor() }]}>
            <Text style={styles.impactText}>{article.impactLevel.toUpperCase()} IMPACT</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.text }]}>{article.title}</Text>

        {/* Entity Tag */}
        {article.entityTicker && (
          <TouchableOpacity style={[styles.entityTag, { backgroundColor: theme.primaryLight }]} onPress={handleEntityPress}>
            <Ionicons name="pricetag" size={16} color={theme.primary} />
            <Text style={[styles.entityTagText, { color: theme.primary }]}>
              ${article.entityTicker}
            </Text>
            {article.entityName && (
              <Text style={[styles.entityName, { color: theme.textSecondary }]}> · {article.entityName}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Source & Date */}
        <View style={[styles.sourceRow, { borderBottomColor: theme.borderLight }]}>
          <View style={styles.sourceInfo}>
            <Ionicons name="newspaper-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.sourceName, { color: theme.text }]}>{article.source}</Text>
            {article.author && (
              <>
                <View style={[styles.dot, { backgroundColor: theme.textTertiary }]} />
                <Text style={[styles.authorName, { color: theme.textSecondary }]}>By {article.author}</Text>
              </>
            )}
          </View>
          <Text style={[styles.publishDate, { color: theme.textTertiary }]}>{formatDate(article.publishedAt)}</Text>
        </View>

        {/* Sentiment Analysis */}
        <View style={[styles.sentimentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sentimentCardTitle, { color: theme.text }]}>Market Sentiment Analysis</Text>
          <View style={styles.sentimentContent}>
            <View style={styles.sentimentLeft}>
              <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor() + '20' }]}>
                <Ionicons name={getSentimentIcon()} size={24} color={getSentimentColor()} />
              </View>
              <View style={styles.sentimentInfo}>
                <Text style={[styles.sentimentLabel, { color: getSentimentColor() }]}>
                  {article.sentiment.toUpperCase()}
                </Text>
                <Text style={[styles.sentimentDescription, { color: theme.textSecondary }]}>
                  {article.sentiment === 'positive' && 'Positive market outlook'}
                  {article.sentiment === 'negative' && 'Negative market outlook'}
                  {article.sentiment === 'neutral' && 'Neutral market outlook'}
                </Text>
              </View>
            </View>
            <View style={styles.sentimentScore}>
              <Text style={[styles.sentimentScoreValue, { color: getSentimentColor() }]}>
                {article.sentimentScore > 0 ? '+' : ''}{article.sentimentScore}
              </Text>
              <Text style={[styles.sentimentScoreLabel, { color: theme.textTertiary }]}>Score</Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Summary</Text>
          <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{article.summary}</Text>
        </View>

        {/* Full Article Content */}
        <View style={styles.articleContent}>
          <Text style={[styles.contentText, { color: theme.text }]}>{article.content}</Text>
        </View>

        {/* Tags */}
        {article.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={[styles.tagsTitle, { color: theme.text }]}>Related Topics</Text>
            <View style={styles.tagsContainer}>
              {article.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: theme.backgroundTertiary }]}>
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.statsRow, { borderTopColor: theme.borderLight, borderBottomColor: theme.borderLight }]}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.statText, { color: theme.textSecondary }]}>
              {article.viewCount >= 1000 
                ? `${(article.viewCount / 1000).toFixed(1)}K views` 
                : `${article.viewCount} views`}
            </Text>
          </View>
        </View>

        {/* Source Link */}
        {article.sourceUrl && (
          <TouchableOpacity style={[styles.sourceButton, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]} onPress={handleOpenSource}>
            <Ionicons name="open-outline" size={20} color={theme.primary} />
            <Text style={[styles.sourceButtonText, { color: theme.primary }]}>Read on {article.source}</Text>
          </TouchableOpacity>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  breakingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 16,
    marginBottom: 12,
    gap: 6,
  },
  breakingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  impactBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  impactText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    lineHeight: 34,
    marginBottom: 16,
  },
  entityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  entityTagText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  entityName: {
    fontSize: 14,
  },
  sourceRow: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },
  authorName: {
    fontSize: 14,
  },
  publishDate: {
    fontSize: 13,
  },
  sentimentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  sentimentCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  sentimentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sentimentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sentimentBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentimentInfo: {
    flex: 1,
  },
  sentimentLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  sentimentDescription: {
    fontSize: 13,
  },
  sentimentScore: {
    alignItems: 'center',
  },
  sentimentScoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  sentimentScoreLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  articleContent: {
    marginBottom: 24,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  sourceButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#775a96',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

