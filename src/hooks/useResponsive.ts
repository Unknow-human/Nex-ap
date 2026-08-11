import { useWindowDimensions } from 'react-native';

export interface ResponsiveSizes {
  isSmallPhone: boolean;    // < 360px
  isPhone: boolean;         // < 600px
  isTablet: boolean;        // >= 600px
  isLargeTablet: boolean;   // >= 900px
  width: number;
  height: number;
  fontSize: {
    tiny: number;
    small: number;
    base: number;
    large: number;
    xl: number;
    xxl: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export function useResponsive(): ResponsiveSizes {
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < 360;
  const isPhone = width < 600;
  const isTablet = width >= 600;
  const isLargeTablet = width >= 900;

  // Calcul dynamique des tailles de police
  const baseFontSize = isSmallPhone ? 11 : isPhone ? 12 : 13;

  return {
    isSmallPhone,
    isPhone,
    isTablet,
    isLargeTablet,
    width,
    height,
    fontSize: {
      tiny: baseFontSize - 2,
      small: baseFontSize - 1,
      base: baseFontSize,
      large: baseFontSize + 2,
      xl: baseFontSize + 4,
      xxl: baseFontSize + 8,
    },
    spacing: {
      xs: isSmallPhone ? 4 : 6,
      sm: isSmallPhone ? 8 : 10,
      md: isSmallPhone ? 12 : 14,
      lg: isSmallPhone ? 16 : 20,
      xl: isSmallPhone ? 20 : 24,
    },
  };
}
