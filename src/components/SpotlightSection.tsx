import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface Spotlight {
  id: string;
  title: string;
  imageSource?: any;
  icon?: string;
  backgroundColor?: string;
  textColor?: string;
  onPress: () => void;
}

interface SpotlightSectionProps {
  spotlights: Spotlight[];
  autoRotateInterval?: number; // milliseconds
}

export default function SpotlightSection({ 
  spotlights, 
  autoRotateInterval = 5000 
}: SpotlightSectionProps) {
  const { theme } = useTheme();
  const [currentSpotlightIndex, setCurrentSpotlightIndex] = useState(0);
  const spotlightFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (spotlights.length <= 1) return;

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(spotlightFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(spotlightFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentSpotlightIndex((prev) => (prev + 1) % spotlights.length);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [spotlights.length, autoRotateInterval]);

  if (spotlights.length === 0) return null;

  const currentSpotlight = spotlights[currentSpotlightIndex];

  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.backgroundSecondary }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Spotlights</Text>
      <View style={styles.spotlightsContainer}>
        <Animated.View
          style={[
            styles.spotlightCardContainer,
            {
              opacity: spotlightFadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.spotlightCard}
            onPress={currentSpotlight.onPress}
          >
            {currentSpotlight.imageSource ? (
              <Image
                source={currentSpotlight.imageSource}
                style={styles.spotlightImage}
                resizeMode="contain"
              />
            ) : (
              <View
                style={[
                  styles.spotlightCardContent,
                  {
                    backgroundColor: currentSpotlight.backgroundColor || theme.primary,
                  },
                ]}
              >
                {currentSpotlight.icon && (
                  <Text style={styles.spotlightIcon}>{currentSpotlight.icon}</Text>
                )}
                <Text
                  style={[
                    styles.spotlightCardTitle,
                    {
                      color: currentSpotlight.textColor || '#FFFFFF',
                    },
                  ]}
                >
                  {currentSpotlight.title}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  spotlightsContainer: {
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotlightCardContainer: {
    width: '100%',
  },
  spotlightCard: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  spotlightCardContent: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    justifyContent: 'center',
  },
  spotlightIcon: {
    fontSize: 24,
  },
  spotlightCardTitle: {
    fontSize: 18,
    fontWeight: '400',
    fontStyle: 'italic',
  },
});


