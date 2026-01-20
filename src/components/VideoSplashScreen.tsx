import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

interface VideoSplashScreenProps {
  onFinish: () => void;
  videoSource: any; // require() asset or URI
  skippable?: boolean;
}

export default function VideoSplashScreen({ 
  onFinish, 
  videoSource, 
  skippable = true 
}: VideoSplashScreenProps) {
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    // Check when video finishes
    const subscription = player.addListener('playToEnd', () => {
      onFinish();
    });

    return () => {
      subscription.remove();
    };
  }, [player, onFinish]);

  const handleSkip = () => {
    if (skippable) {
      player.pause();
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />
      {skippable && (
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          {/* Skip button can be added here if needed */}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background (won't be visible with COVER mode)
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
});
