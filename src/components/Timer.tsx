import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
}

export function Timer({ timeRemaining, totalTime }: TimerProps) {
  const progress = timeRemaining / totalTime;
  const animatedWidth = React.useRef(new Animated.Value(progress)).current;

  React.useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const getColor = () => {
    if (progress > 0.5) return '#5b6ef5';
    if (progress > 0.25) return '#ed8936';
    return '#f56565';
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>⏱️ TEMPS RESTANT</Text>
        <Text style={[styles.timeText, { color: getColor() }]}>
          {timeRemaining}s
        </Text>
      </View>
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            { width: widthInterpolated, backgroundColor: getColor() },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#5b6ef5',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e0',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
