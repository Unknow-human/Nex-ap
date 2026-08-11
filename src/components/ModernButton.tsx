import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import { THEME } from '../theme';
import { haptics } from '../utils/haptics';

interface ModernButtonProps {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  /** Icône lucide-react-native optionnelle, affichée avant le texte. */
  icon?: LucideIcon;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  text,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  textStyle,
  icon: Icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getColors = (): readonly [string, string] => {
    switch (variant) {
      case 'primary':
        return [THEME.colors.primary, THEME.colors.primaryDark];
      case 'secondary':
        return [THEME.colors.secondary, THEME.colors.primary];
      case 'danger':
        return [THEME.colors.error, THEME.colors.warning];
      case 'success':
        return [THEME.colors.success, THEME.colors.secondary];
      default:
        return [THEME.colors.primary, THEME.colors.secondary];
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 16, fontSize: 12 };
      case 'lg':
        return { paddingVertical: 14, paddingHorizontal: 28, fontSize: 16 };
      case 'md':
      default:
        return { paddingVertical: 12, paddingHorizontal: 24, fontSize: 14 };
    }
  };

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    // Retour haptique proportionné à la gravité de l'action.
    if (variant === 'danger') {
      haptics.heavy();
    } else if (variant === 'secondary') {
      haptics.light();
    } else {
      haptics.medium();
    }
    onPress();
  };

  const sizeStyles = getSizeStyles();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={disabled ? ([THEME.colors.gray400, THEME.colors.gray400] as const) : getColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.button,
            {
              paddingVertical: sizeStyles.paddingVertical,
              paddingHorizontal: sizeStyles.paddingHorizontal,
            },
            style,
          ]}
        >
          {Icon ? (
            <Icon
              size={sizeStyles.fontSize + 4}
              color={THEME.colors.black}
              strokeWidth={2.5}
              style={styles.icon}
            />
          ) : null}
          <Text
            style={[
              styles.text,
              {
                fontSize: sizeStyles.fontSize,
              },
              textStyle,
            ]}
          >
            {text}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...THEME.shadow.md,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: THEME.colors.black,
    fontWeight: '700',
    textAlign: 'center',
  },
});
