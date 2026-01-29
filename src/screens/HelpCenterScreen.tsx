import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Trading' | 'Account' | 'Social' | 'Technical' | 'General';
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I start trading on Moro?',
    answer:
      'To start trading, navigate to any entity (person, company, team, etc.) and tap the "Trade" button. You can buy shares if you think their value will go up, or sell if you think it will go down. All trades are simulated with virtual currency.',
    category: 'Trading',
  },
  {
    id: '2',
    question: 'What is paper trading?',
    answer:
      'Paper trading is simulated trading with virtual money. It allows you to practice trading strategies without risking real money. Access the Paper Trading Simulator from Settings > Trading > Paper Trading Simulator.',
    category: 'Trading',
  },
  {
    id: '3',
    question: 'How do I reset my portfolio?',
    answer:
      'Go to Profile > Settings > Trading > Reset Portfolio. This will clear all your positions and reset your cash balance to the starting amount. This action cannot be undone.',
    category: 'Trading',
  },
  {
    id: '4',
    question: 'What are the trading fees?',
    answer:
      'Currently, there are no trading fees on Moro. All trades execute at the displayed price without any additional charges.',
    category: 'Trading',
  },
  {
    id: '5',
    question: 'How do I change my password?',
    answer:
      'Go to Profile > Settings > Account > Security. Enter your current password, then your new password twice. Your new password must be at least 8 characters with uppercase, lowercase, and numbers.',
    category: 'Account',
  },
  {
    id: '6',
    question: 'How do I change my email address?',
    answer:
      'Go to Profile > Settings > Account > Email. Enter your new email and confirm with your password. You\'ll receive a verification email to complete the change.',
    category: 'Account',
  },
  {
    id: '7',
    question: 'How do I edit my profile?',
    answer:
      'Go to Profile > Settings > Account > Edit Profile. You can update your display name, username, bio, and profile picture.',
    category: 'Account',
  },
  {
    id: '8',
    question: 'How do I block or unblock users?',
    answer:
      'To block a user, go to their profile and tap the menu (•••) button, then select "Block User". To manage blocked users, go to Settings > Privacy & Safety > Blocked Users.',
    category: 'Social',
  },
  {
    id: '9',
    question: 'How do I create a post?',
    answer:
      'Tap the "+" button in the bottom navigation bar. You can create a text post, add images, and mention other users using @username.',
    category: 'Social',
  },
  {
    id: '10',
    question: 'How do I follow other users?',
    answer:
      'Visit any user\'s profile and tap the "Follow" button. You\'ll see their posts in your feed and trading activity.',
    category: 'Social',
  },
  {
    id: '11',
    question: 'Why is the app running slowly?',
    answer:
      'Try clearing the app cache by going to Settings > Trading > Reset All App Data. Also ensure you have a stable internet connection and the latest app version installed.',
    category: 'Technical',
  },
  {
    id: '12',
    question: 'My trades are not executing. What should I do?',
    answer:
      'Check your internet connection first. If the problem persists, try logging out and back in. If the issue continues, contact support with details about the trade you\'re trying to execute.',
    category: 'Technical',
  },
  {
    id: '13',
    question: 'What is Moro?',
    answer:
      'Moro is a social trading platform where you can trade shares of people, companies, teams, and other entities. It combines social networking with simulated trading to make markets more engaging and fun.',
    category: 'General',
  },
  {
    id: '14',
    question: 'Is this real money?',
    answer:
      'No, all trading on Moro uses virtual currency. This is a simulated trading platform designed for entertainment and learning purposes.',
    category: 'General',
  },
  {
    id: '15',
    question: 'How are entity prices determined?',
    answer:
      'Entity prices are influenced by trading activity, news sentiment, social mentions, and real-world events. Prices update in real-time based on market dynamics.',
    category: 'General',
  },
];

export default function HelpCenterScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Trading', 'Account', 'Social', 'Technical', 'General'];

  const dynamicStyles = {
    container: {
      ...styles.container,
      backgroundColor: theme.background,
    },
    header: {
      ...styles.header,
      backgroundColor: theme.background,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      ...styles.headerTitle,
      color: theme.text,
    },
    scrollView: {
      ...styles.scrollView,
      backgroundColor: theme.background,
    },
    searchContainer: {
      ...styles.searchContainer,
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    searchInput: {
      ...styles.searchInput,
      color: theme.text,
    },
    categoryButton: {
      ...styles.categoryButton,
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    categoryButtonActive: {
      ...styles.categoryButton,
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    categoryText: {
      ...styles.categoryText,
      color: theme.text,
    },
    categoryTextActive: {
      ...styles.categoryText,
      color: '#FFFFFF',
    },
    faqItem: {
      ...styles.faqItem,
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    question: {
      ...styles.question,
      color: theme.text,
    },
    answer: {
      ...styles.answer,
      color: theme.textSecondary,
    },
    emptyText: {
      ...styles.emptyText,
      color: theme.textSecondary,
    },
  };

  const filteredFAQs = FAQ_DATA.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Help Center</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('ContactSupport')}
        >
          <Ionicons name="chatbox-ellipses-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={dynamicStyles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={dynamicStyles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={dynamicStyles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for help..."
              placeholderTextColor={theme.textTertiary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={
                selectedCategory === category
                  ? dynamicStyles.categoryButtonActive
                  : dynamicStyles.categoryButton
              }
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={
                  selectedCategory === category
                    ? dynamicStyles.categoryTextActive
                    : dynamicStyles.categoryText
                }
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ List */}
        <View style={styles.faqList}>
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map((faq) => (
              <TouchableOpacity
                key={faq.id}
                style={dynamicStyles.faqItem}
                onPress={() => toggleExpanded(faq.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.questionContainer}>
                    <Ionicons
                      name="help-circle-outline"
                      size={20}
                      color={theme.primary}
                      style={styles.questionIcon}
                    />
                    <Text style={dynamicStyles.question}>{faq.question}</Text>
                  </View>
                  <Ionicons
                    name={expandedId === faq.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>

                {expandedId === faq.id && (
                  <View style={styles.answerContainer}>
                    <Text style={dynamicStyles.answer}>{faq.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={theme.textTertiary} />
              <Text style={dynamicStyles.emptyText}>No results found</Text>
              <Text style={[dynamicStyles.emptyText, { fontSize: 14, marginTop: 8 }]}>
                Try a different search term or category
              </Text>
            </View>
          )}
        </View>

        {/* Contact Support CTA */}
        <View style={styles.ctaContainer}>
          <Text style={[styles.ctaTitle, { color: theme.text }]}>Still need help?</Text>
          <Text style={[styles.ctaSubtitle, { color: theme.textSecondary }]}>
            Our support team is here to assist you
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('ContactSupport')}
          >
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#FFFFFF" />
            <Text style={styles.ctaButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

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
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  faqList: {
    paddingHorizontal: 16,
  },
  faqItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionIcon: {
    marginRight: 8,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  answerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  ctaContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
