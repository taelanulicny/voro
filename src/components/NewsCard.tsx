import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { NewsArticle, RootStackParamList } from '../types';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NewsCardProps {
  article: NewsArticle;
  onPress?: () => void;
  showEntity?: boolean;
}

export default function NewsCard({ article, onPress, showEntity = true }: NewsCardProps) {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('NewsDetail', { articleId: article.id });
    }
  };

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

  const handleEntityPress = () => {
    if (article.entityId) {
      navigation.navigate('Entity', {
        entityId: article.entityId,
        categoryId: article.category,
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={handlePress}
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
          <Text style={[styles.source, { color: theme.text }]}>{article.source}</Text>
          <View style={[styles.dot, { backgroundColor: theme.textTertiary }]} />
          <Text style={[styles.time, { color: theme.textTertiary }]}>{formatTimeAgo(article.publishedAt)}</Text>
        </View>
        
        {/* Impact Level Indicator */}
        <View style={[styles.impactBadge, { backgroundColor: getImpactColor() }]}>
          <Text style={styles.impactText}>{article.impactLevel.toUpperCase()}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {article.title}
      </Text>

      {/* Summary */}
      <Text style={[styles.summary, { color: theme.textSecondary }]} numberOfLines={2}>
        {article.summary}
      </Text>

      {/* Entity Tag */}
      {showEntity && article.entityName && (
        <TouchableOpacity
          style={[styles.entityTag, { backgroundColor: theme.primaryLight }]}
          onPress={handleEntityPress}
        >
          <Ionicons name="pricetag" size={14} color={theme.primary} />
          <Text style={[styles.entityTagText, { color: theme.primary }]}>
            ${article.entityName}
          </Text>
          {article.entityName && (
            <Text style={[styles.entityName, { color: theme.textSecondary }]}> · {article.entityName}</Text>
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
          <Ionicons name="eye-outline" size={14} color={theme.textTertiary} />
          <Text style={[styles.views, { color: theme.textTertiary }]}>
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
            <View key={index} style={[styles.tag, { backgroundColor: theme.backgroundTertiary }]}>
              <Text style={[styles.tagText, { color: theme.textSecondary }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
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
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },
  time: {
    fontSize: 12,
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
    lineHeight: 24,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  entityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  entityTagText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  entityName: {
    fontSize: 13,
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
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

