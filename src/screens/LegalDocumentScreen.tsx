import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

type DocumentType = 'terms' | 'privacy' | 'eula';

interface LegalDocument {
  title: string;
  lastUpdated: string;
  content: string;
}

const LEGAL_DOCUMENTS: Record<DocumentType, LegalDocument> = {
  terms: {
    title: 'Terms of Service',
    lastUpdated: 'January 29, 2026',
    content: `# Terms of Service

## 1. Acceptance of Terms

By accessing and using Moro ("the App"), you accept and agree to be bound by the terms and provision of this agreement.

## 2. Description of Service

Moro is a social trading simulation platform that allows users to trade virtual shares of people, companies, teams, and other entities using virtual currency. All trading is simulated and does not involve real money or securities.

## 3. User Accounts

### 3.1 Registration
- You must be at least 13 years old to use this service
- You must provide accurate and complete information
- You are responsible for maintaining the security of your account

### 3.2 Account Security
- You are responsible for all activities under your account
- You must notify us immediately of any unauthorized use
- We reserve the right to suspend or terminate accounts that violate these terms

## 4. Virtual Currency and Trading

### 4.1 Virtual Currency
- All currency in the App is virtual and has no real-world value
- Virtual currency cannot be exchanged for real money
- We reserve the right to adjust balances for maintenance or abuse

### 4.2 Trading Rules
- All trades are simulated and for entertainment purposes only
- Prices are determined by market dynamics and algorithms
- We do not guarantee any specific trading outcomes

## 5. User Conduct

You agree NOT to:
- Violate any laws or regulations
- Harass, abuse, or harm other users
- Manipulate markets or engage in fraudulent activity
- Use bots or automated tools without permission
- Attempt to gain unauthorized access to the service

## 6. Content

### 6.1 User Content
- You retain rights to your content
- You grant us a license to use, display, and distribute your content
- You are responsible for your content and must not post illegal or harmful content

### 6.2 Our Content
- All App content and trademarks are owned by Moro
- You may not copy, modify, or distribute our content without permission

## 7. Disclaimers

### 7.1 Service "As Is"
- The service is provided "as is" without warranties
- We do not guarantee uninterrupted or error-free service
- We are not responsible for any data loss

### 7.2 Investment Disclaimer
- This is NOT investment advice
- Virtual trading does not reflect real market conditions
- Past performance does not indicate future results

## 8. Limitation of Liability

We are not liable for:
- Any indirect, incidental, or consequential damages
- Loss of profits, data, or goodwill
- Service interruptions or errors

Maximum liability is limited to $100 or the amount you paid us in the last 12 months, whichever is greater.

## 9. Termination

We reserve the right to:
- Suspend or terminate accounts for violations
- Modify or discontinue the service at any time
- Remove content that violates these terms

## 10. Changes to Terms

We may modify these terms at any time. Continued use after changes constitutes acceptance of new terms.

## 11. Governing Law

These terms are governed by the laws of the United States and the State of California.

## 12. Contact

For questions about these terms, contact us at legal@moro.app

---

By using Moro, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.`,
  },
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'January 29, 2026',
    content: `# Privacy Policy

## 1. Introduction

Moro ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.

## 2. Information We Collect

### 2.1 Information You Provide
- **Account Information**: Name, username, email, password
- **Profile Information**: Bio, profile picture, preferences
- **Content**: Posts, comments, messages
- **Trading Data**: Transactions, portfolio, watchlist

### 2.2 Automatically Collected Information
- **Device Information**: Device type, OS version, unique identifiers
- **Usage Data**: App interactions, features used, time spent
- **Log Data**: IP address, browser type, timestamps
- **Location Data**: Approximate location (if permitted)

### 2.3 Information from Third Parties
- **Social Media**: If you link social accounts
- **Analytics Providers**: Aggregated usage statistics
- **News APIs**: For personalized content

## 3. How We Use Your Information

We use your information to:
- Provide and improve our services
- Personalize your experience
- Process transactions and maintain records
- Send notifications and updates
- Analyze usage and trends
- Prevent fraud and abuse
- Comply with legal obligations

## 4. Information Sharing

We DO NOT sell your personal information. We may share information with:

### 4.1 Service Providers
- Cloud hosting (AWS)
- Analytics (if configured)
- Crash reporting (Sentry)
- Email services

### 4.2 Legal Requirements
- To comply with laws and regulations
- To respond to legal requests
- To protect our rights and safety

### 4.3 Business Transfers
- In connection with mergers, acquisitions, or asset sales

## 5. Data Storage and Security

### 5.1 Storage
- Data is stored on secure servers (AWS)
- Local data stored on your device using encryption
- Passwords are hashed and never stored in plain text

### 5.2 Security Measures
- Encryption in transit (HTTPS/TLS)
- Encryption at rest
- Regular security audits
- Access controls and authentication

### 5.3 Data Retention
- Account data: Retained while account is active
- Deleted data: Removed within 30 days of deletion request
- Legal requirements: Retained as required by law

## 6. Your Rights and Choices

You have the right to:
- **Access**: Request a copy of your data
- **Correction**: Update or correct your information
- **Deletion**: Request deletion of your account and data
- **Export**: Download your data in a portable format
- **Opt-Out**: Disable notifications and marketing communications

To exercise these rights, go to Settings > Account or contact privacy@moro.app

## 7. Children's Privacy

Moro is not intended for children under 13. We do not knowingly collect data from children under 13. If we learn we have collected such data, we will delete it immediately.

## 8. Third-Party Services

Our app may contain links to third-party services:
- **NewsAPI**: For news content (see newsapi.org/privacy)
- **Social Media**: When you share content
- **Analytics**: For usage statistics

These services have their own privacy policies. We are not responsible for their practices.

## 9. Cookies and Tracking

We use:
- **Essential Cookies**: For authentication and security
- **Analytics Cookies**: To understand usage (can be disabled)
- **Preference Cookies**: To remember your settings

You can manage cookies in your device settings.

## 10. International Data Transfers

Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.

## 11. California Privacy Rights (CCPA)

California residents have additional rights:
- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of sale (we don't sell data)
- Right to non-discrimination

Contact privacy@moro.app to exercise these rights.

## 12. European Privacy Rights (GDPR)

EU residents have rights under GDPR:
- Right to access, rectification, erasure
- Right to data portability
- Right to object to processing
- Right to withdraw consent

Contact privacy@moro.app or our EU representative.

## 13. Changes to This Policy

We may update this Privacy Policy periodically. We will notify you of significant changes via:
- In-app notification
- Email notification
- Notice on our website

Continued use after changes constitutes acceptance.

## 14. Contact Us

For privacy questions or requests:
- Email: privacy@moro.app
- In-App: Settings > Support > Contact Support
- Mail: Moro Privacy Team, [Address]

---

Last Updated: January 29, 2026`,
  },
  eula: {
    title: 'End User License Agreement',
    lastUpdated: 'January 29, 2026',
    content: `# End User License Agreement (EULA)

## 1. License Grant

Subject to your compliance with this Agreement, Moro grants you a limited, non-exclusive, non-transferable, revocable license to use the Moro mobile application for personal, non-commercial purposes.

## 2. License Restrictions

You may NOT:
- Copy, modify, or create derivative works of the App
- Reverse engineer, decompile, or disassemble the App
- Remove or alter any proprietary notices
- Use the App for any commercial purpose without permission
- Rent, lease, lend, sell, or sublicense the App
- Transfer the App to any third party

## 3. Ownership

The App and all intellectual property rights remain the exclusive property of Moro. This Agreement does not grant you any ownership rights.

## 4. Updates and Modifications

We may:
- Provide updates, patches, or new versions
- Modify or discontinue features
- Require you to update to continue using the App

## 5. User Data

### 5.1 Your Data
- You retain ownership of your content
- You grant us a license to use your content as described in our Terms of Service
- We may use aggregated, anonymized data for analytics

### 5.2 Backups
- You are responsible for backing up your data
- We are not responsible for any data loss

## 6. Third-Party Components

The App may include third-party software components:
- React Native (MIT License)
- Expo (MIT License)
- Other open-source libraries (see licenses in app)

These components are governed by their respective licenses.

## 7. Beta Features

Some features may be labeled as "Beta" or "Experimental":
- These features are provided "as is" without warranty
- We may change or remove these features at any time
- Data associated with beta features may be lost

## 8. Analytics and Crash Reporting

The App may collect:
- Usage statistics
- Crash reports
- Performance data

This data is used to improve the App and is subject to our Privacy Policy.

## 9. Prohibited Uses

You may not use the App to:
- Violate any laws or regulations
- Infringe on intellectual property rights
- Transmit malware or harmful code
- Harass, abuse, or harm others
- Manipulate or abuse the trading system
- Collect user data without consent

## 10. Account Termination

We may terminate your account if you:
- Violate this Agreement
- Engage in fraudulent activity
- Abuse the service
- Remain inactive for an extended period

## 11. Disclaimer of Warranties

THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
- Merchantability
- Fitness for a particular purpose
- Non-infringement
- Accuracy or reliability

## 12. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
- Indirect, incidental, or consequential damages
- Loss of profits, data, or use
- Service interruptions
- Errors or omissions

MAXIMUM LIABILITY IS LIMITED TO $100 OR AMOUNT PAID IN LAST 12 MONTHS.

## 13. Indemnification

You agree to indemnify and hold harmless Moro from any claims, damages, or expenses arising from:
- Your use of the App
- Your violation of this Agreement
- Your violation of any rights of others

## 14. Export Compliance

You agree to comply with all export and import laws. You represent that you are not:
- Located in an embargoed country
- On any government prohibited or restricted party list

## 15. Dispute Resolution

### 15.1 Informal Resolution
- Contact us at legal@moro.app to resolve disputes
- Good faith effort to resolve before formal proceedings

### 15.2 Arbitration
- Disputes shall be resolved through binding arbitration
- Arbitration conducted under AAA rules
- Individual basis only, no class actions

### 15.3 Exceptions
- Small claims court
- Injunctive relief for intellectual property
- Governmental investigations

## 16. Governing Law

This Agreement is governed by the laws of the State of California, USA, excluding conflict of law provisions.

## 17. Severability

If any provision is found invalid, the remaining provisions remain in full effect.

## 18. Entire Agreement

This Agreement, together with our Terms of Service and Privacy Policy, constitutes the entire agreement.

## 19. Changes to EULA

We reserve the right to modify this EULA. Continued use after changes constitutes acceptance.

## 20. Contact

For questions about this EULA:
- Email: legal@moro.app
- In-App: Settings > Support

---

By installing and using Moro, you acknowledge that you have read, understood, and agree to be bound by this EULA.

Last Updated: January 29, 2026`,
  },
};

export default function LegalDocumentScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const documentType: DocumentType = route.params?.documentType || 'terms';
  const document = LEGAL_DOCUMENTS[documentType];

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
    lastUpdated: {
      ...styles.lastUpdated,
      color: theme.textSecondary,
    },
    content: {
      ...styles.content,
      color: theme.text,
    },
  };

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return (
          <Text key={index} style={[dynamicStyles.content, styles.h1]}>
            {line.substring(2)}
          </Text>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <Text key={index} style={[dynamicStyles.content, styles.h2]}>
            {line.substring(3)}
          </Text>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <Text key={index} style={[dynamicStyles.content, styles.h3]}>
            {line.substring(4)}
          </Text>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <Text key={index} style={[dynamicStyles.content, styles.listItem]}>
            {'  • ' + line.substring(2)}
          </Text>
        );
      }
      if (line.startsWith('---')) {
        return <View key={index} style={[styles.divider, { backgroundColor: theme.border }]} />;
      }
      if (line.trim() === '') {
        return <View key={index} style={styles.spacing} />;
      }
      return (
        <Text key={index} style={[dynamicStyles.content, styles.paragraph]}>
          {line}
        </Text>
      );
    });
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>{document.title}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={dynamicStyles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={dynamicStyles.lastUpdated}>Last Updated: {document.lastUpdated}</Text>
          {renderContent(document.content)}
          <View style={{ height: 40 }} />
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
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  lastUpdated: {
    fontSize: 13,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 10,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
  },
  listItem: {
    marginBottom: 4,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  spacing: {
    height: 8,
  },
});
