import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NewsArticle } from '../types';
import { useNavigation } from '@react-navigation/native';

interface NewsCardProps {
  article: NewsArticle;
  onPress?: () => void;
  showEntity?: boolean;
}

export default function NewsCard({ article, onPress, showEntity = true }: NewsCardProps) {
  const navigation = useNavigation();

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const articleDate = new Date(timestamp);
    const diffMs = now.getTime() - articleDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return articleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSentimentColor = () => {
    if (article.sentiment === 'bullish') return '#10B981';
    if (article.sentiment === 'bearish') return '#EF4444';
    return '#6B7280';
  };

  const getSentimentIcon = () => {
    if (article.sentiment === 'bullish') return 'trending-up';
    if (article.sentiment === 'bearish') return 'trending-down';
    return 'remove';
  };

  const getImpactColor = () => {
    switch (article.impactLevel) {
      case 'critical': return '#DC2626';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#6B7280';
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
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Breaking News Badge */}
      {article.isBreaking && (
        <View style={styles.breakingBadge}>
          <Ionicons name="flash" size={12} color="#FFFFFF" />
          <Text style={styles.breakingText}>BREAKING</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.source}>{article.source}</Text>
          <View style={styles.dot} />
          <Text style={styles.time}>{formatTimeAgo(article.publishedAt)}</Text>
        </View>
        
        {/* Impact Level Indicator */}
        <View style={[styles.impactBadge, { backgroundColor: getImpactColor() }]}>
          <Text style={styles.impactText}>{article.impactLevel.toUpperCase()}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {article.title}
      </Text>

      {/* Summary */}
      <Text style={styles.summary} numberOfLines={2}>
        {article.summary}
      </Text>

      {/* Entity Tag */}
      {showEntity && article.entityTicker && (
        <TouchableOpacity
          style={styles.entityTag}
          onPress={handleEntityPress}
        >
          <Ionicons name="pricetag" size={14} color="#3B82F6" />
          <Text style={styles.entityTagText}>
            ${article.entityTicker}
          </Text>
          {article.entityName && (
            <Text style={styles.entityName}> · {article.entityName}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {/* Sentiment Indicator */}
        <View style={styles.sentimentContainer}>
          <View style={[styles.sentimentBadge, { backgroundColor: getSentimentColor() + '20' }]}>
            <Ionicons name={getSentimentIcon()} size={14} color={getSentimentColor()} />
            <Text style={[styles.sentimentText, { color: getSentimentColor() }]}>
              {article.sentiment.charAt(0).toUpperCase() + article.sentiment.slice(1)}
            </Text>
          </View>
          {article.sentimentScore !== 0 && (
            <Text style={[styles.sentimentScore, { color: getSentimentColor() }]}>
              {article.sentimentScore > 0 ? '+' : ''}{article.sentimentScore}
            </Text>
          )}
        </View>

        {/* Views */}
        <View style={styles.viewsContainer}>
          <Ionicons name="eye-outline" size={14} color="#9CA3AF" />
          <Text style={styles.views}>
            {article.viewCount >= 1000 
              ? `${(article.viewCount / 1000).toFixed(1)}K` 
              : article.viewCount}
          </Text>
        </View>
      </View>

      {/* Tags */}
      {article.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {article.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  breakingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
    zIndex: 1,
  },
  breakingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  source: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  impactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  impactText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginBottom: 12,
  },
  entityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  entityTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
  entityName: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sentimentScore: {
    fontSize: 13,
    fontWeight: '700',
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  views: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
});

