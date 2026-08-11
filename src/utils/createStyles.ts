import { StyleSheet } from 'react-native';
import { THEME } from '../theme';

/**
 * Styles de base sans références THEME
 * Les couleurs sont appliquées en inline au runtime
 */
export const baseStyles = {
  container: {
    flex: 1,
  },
  flexCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

/**
 * Utilitaire pour appliquer les couleurs THEME en inline
 */
export const withThemeColors = (baseStyle: any, themeOverrides: any = {}) => {
  return {
    ...baseStyle,
    backgroundColor: baseStyle.backgroundColor || themeOverrides.backgroundColor,
    color: baseStyle.color || themeOverrides.color,
    borderColor: baseStyle.borderColor || themeOverrides.borderColor,
  };
};
