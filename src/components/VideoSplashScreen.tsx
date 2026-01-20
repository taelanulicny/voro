import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

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
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

  useEffect(() => {
    // Play video when component mounts
    videoRef.current?.playAsync();
  }, []);

  const handlePlaybackStatusUpdate = (playbackStatus: AVPlaybackStatus) => {
    setStatus(playbackStatus);
    
    // Check if video finished playing
    if (playbackStatus.isLoaded && playbackStatus.didJustFinish) {
      onFinish();
    }
  };

  const handleSkip = () => {
    if (skippable) {
      videoRef.current?.pauseAsync();
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={videoSource}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
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
