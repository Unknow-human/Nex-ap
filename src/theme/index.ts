/**
 * NEXUS ARENA — Thème Cyberpunk unifié
 * Fond sombre + néons cyan/violet. Un seul design system, plus de light mode.
 */

import { FONT_FAMILY } from './fonts';

export const THEME = {
  colors: {
    // Primaires - Cyan néon (hacking arena)
    primary: '#00f2ff',
    primaryLight: '#5cf9ff',
    primaryDark: '#00b8c4',

    // Secondaire - Violet néon
    secondary: '#8b5cf6',
    secondaryLight: '#c4b5fd',

    // Neutrals - Cyberpunk dark mode
    white: '#ffffff',
    black: '#05050c',
    gray50: '#e4e4f0',
    gray100: '#c8c8dc',
    gray200: '#9d9db8',
    gray300: '#72728f',
    gray400: '#535370',
    gray500: '#3d3d56',
    gray600: '#2c2c42',
    gray700: '#1f1f33',
    gray800: '#16162a',
    gray900: '#0a0a1a',

    // Statuts - versions néon
    success: '#39ff88',
    successLight: '#0f3d29',
    error: '#ff2e63',
    errorLight: '#3d0f1c',
    warning: '#ffb703',
    warningLight: '#3d2c0a',
    info: '#00f2ff',
    infoLight: '#0a2e33',

    // Backgrounds - dégradé sombre cyberpunk
    bgPrimary: '#0a0a1a',
    bgSecondary: '#1a1a2e',
    bgTertiary: '#16162a',

    // Texte - contrastes optimisés pour fond sombre
    textPrimary: '#f1f1fb',
    textSecondary: '#b8b8d1',
    textMuted: '#7a7a99',

    // Borders
    border: '#404a63',
    borderLight: '#2c2c42',

    // Néons dédiés (glow, particules, accents)
    neonCyan: '#00f2ff',
    neonViolet: '#8b5cf6',
    neonPink: '#ff2e63',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  // Ombres remplacées par des halos néon (shadowColor = couleur du glow)
  shadow: {
    sm: {
      elevation: 3,
      shadowColor: '#00f2ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
    },
    md: {
      elevation: 6,
      shadowColor: '#00f2ff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
    },
    lg: {
      elevation: 10,
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
    },
    // Glow violet dédié, pour victoire / éléments spéciaux
    glowViolet: {
      elevation: 10,
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
    },
  },

  typography: {
    // Titres en Orbitron — police display cyberpunk, remplace le bold système
    h1: { fontSize: 32, fontFamily: FONT_FAMILY.orbitronBold, lineHeight: 40 },
    h2: { fontSize: 28, fontFamily: FONT_FAMILY.orbitronBold, lineHeight: 36 },
    h3: { fontSize: 24, fontFamily: FONT_FAMILY.orbitronSemiBold, lineHeight: 32 },
    h4: { fontSize: 20, fontFamily: FONT_FAMILY.orbitronSemiBold, lineHeight: 28 },
    h5: { fontSize: 16, fontFamily: FONT_FAMILY.orbitronSemiBold, lineHeight: 24 },
    // Corps de texte : police système, meilleure lisibilité en petite taille
    body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    bodySm: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    caption: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
    label: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
    // Typo mono pour codes secrets / scores — JetBrains Mono, renforce le thème hacking
    mono: {
      fontSize: 16,
      lineHeight: 22,
      fontFamily: FONT_FAMILY.monoBold,
      letterSpacing: 2,
    },
    monoLg: {
      fontSize: 24,
      lineHeight: 30,
      fontFamily: FONT_FAMILY.monoBold,
      letterSpacing: 3,
    },
  },
};

// Styles réutilisables (sans THEME pour éviter les cycles circulaires)
export const COMMON_STYLES = {
  container: {
    flex: 1,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    borderRadius: 16,
    padding: 16,
  },

  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
  },
};
