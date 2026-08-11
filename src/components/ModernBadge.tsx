import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  Text,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { THEME } from '../theme';

interface ModernBadgeProps {
  /** Emoji (string, legacy) ou composant icône lucide-react-native. */
  icon?: string | LucideIcon;
  label: string;
  value?: string | number;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  animated?: boolean;
}

export const ModernBadge: React.FC<ModernBadgeProps> = ({
  icon,
  label,
  value,
  variant = 'primary',
  size = 'md',
  style,
  animated = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const getBackgroundColor = () => {
    switch (variant) {
      case 'success':
        return THEME.colors.success;
      case 'warning':
        return THEME.colors.warning;
      case 'danger':
        return THEME.colors.error;
      case 'primary':
      default:
        return THEME.colors.primary;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: 6, fontSize: 11 };
      case 'lg':
        return { padding: 10, fontSize: 15 };
      case 'md':
      default:
        return { padding: 8, fontSize: 13 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.badge,
          {
            backgroundColor: getBackgroundColor(),
            padding: sizeStyles.padding,
          },
          style,
        ]}
      >
        {icon && (typeof icon === 'string' ? (
          <Text
            style={[
              styles.icon,
              { fontSize: sizeStyles.fontSize + 2 },
            ]}
          >
            {icon}
          </Text>
        ) : (
          React.createElement(icon, { size: sizeStyles.fontSize + 2, color: '#ffffff', strokeWidth: 2.5 })
        ))}
        <Text
          style={[
            styles.label,
            { fontSize: sizeStyles.fontSize },
          ]}
        >
          {label}
        </Text>
        {value !== undefined && (
          <Text
            style={[
              styles.value,
              { fontSize: sizeStyles.fontSize },
            ]}
          >
            {value}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...THEME.shadow.sm,
  },
  icon: {
    fontWeight: '700',
  },
  label: {
    color: '#ffffff',
    fontWeight: '600',
  },
  value: {
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 4,
  },
});
