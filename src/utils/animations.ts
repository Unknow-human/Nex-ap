import { Animated, Easing } from 'react-native';

export const AnimationPresets = {
  // Fade in/out
  fadeIn: (duration = 300) => ({
    useNativeDriver: true,
    duration,
    easing: Easing.out(Easing.ease),
  }),

  // Scale
  scaleIn: (duration = 300) => ({
    useNativeDriver: true,
    duration,
    easing: Easing.out(Easing.cubic),
  }),

  // Slide
  slideInFromLeft: (duration = 300) => ({
    useNativeDriver: true,
    duration,
    easing: Easing.out(Easing.quad),
  }),

  // Bounce
  bounce: (duration = 600) => ({
    useNativeDriver: true,
    duration,
    easing: Easing.bounce,
  }),

  // Pulse
  pulse: (duration = 1500) => ({
    useNativeDriver: true,
    duration,
    easing: Easing.inOut(Easing.ease),
    isInteraction: false,
  }),

  // Quick response
  quick: (duration = 150) => ({
    useNativeDriver: true,
    duration,
    easing: Easing.out(Easing.quad),
  }),
};

// Helpers pour animations courantes
export const createAnimation = (initialValue = 0) => new Animated.Value(initialValue);

export const animateTo = (
  value: Animated.Value,
  targetValue: number,
  config: any = {}
) => {
  return Animated.timing(value, {
    toValue: targetValue,
    ...AnimationPresets.fadeIn(),
    ...config,
  });
};

export const fadeInSequence = (values: Animated.Value[], staggerDelay = 100) => {
  return Animated.sequence(
    values.map((val, index) => [
      Animated.delay(index * staggerDelay),
      Animated.timing(val, {
        toValue: 1,
        ...AnimationPresets.fadeIn(300),
      }),
    ]).flat()
  );
};
