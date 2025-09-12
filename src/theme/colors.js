// src/theme/colors.js

// Base palette using the recommended Teal & Coral theme
const palette = {
  teal: '#1ABC9C',
  lightTeal: '#48C9B0',
  paleTeal: '#D0F4EA',
  darkTeal: '#00382C',

  coral: '#FF6347',
  lightCoral: '#FFB4A8',
  paleCoral: '#FFDAD5',
  darkCoral: '#650000',

  purple: '#7A5AF8',
  lightPurple: '#D0BCFF',
  palePurple: '#EADDFF',
  darkPurple: '#321A75',

  // Neutrals
  black: '#000000',
  white: '#FFFFFF',

  // Grays
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // System & Accent
  error: '#EF4444',
  lightError: '#F2B8B5',
  paleError: '#F9DEDC',
  darkError: '#601410',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const lightColors = {
  // React Native Paper specific colors
  primary: palette.teal,
  onPrimary: palette.white,
  primaryContainer: palette.paleTeal,
  onPrimaryContainer: palette.darkTeal,
  secondary: palette.coral,
  onSecondary: palette.white,
  secondaryContainer: palette.paleCoral,
  onSecondaryContainer: palette.darkCoral,
  tertiary: palette.purple,
  onTertiary: palette.white,
  tertiaryContainer: palette.palePurple,
  onTertiaryContainer: palette.darkPurple,
  error: palette.error,
  onError: palette.white,
  errorContainer: palette.paleError,
  onErrorContainer: palette.darkError,
  background: palette.white,
  onBackground: palette.gray900,
  surface: palette.white,
  onSurface: palette.gray900,
  surfaceVariant: palette.gray100,
  onSurfaceVariant: palette.gray800,
  outline: palette.gray300,
  outlineVariant: palette.gray200,
  inverseOnSurface: palette.gray50,
  inverseSurface: palette.gray900,
  inversePrimary: palette.lightTeal,

 // Custom semantic names for the rest of the app
  text: palette.gray900,
  textSecondary: palette.gray500,
  textTertiary: palette.gray400,

  border: palette.gray200,
  inputBackground: palette.gray100,

  logout: palette.coral,
  like: palette.coral,

  tabBarActive: palette.teal,
  tabBarInactive: palette.gray400,
  badge: palette.coral,
  badgeText: palette.white,
};

export const darkColors = {
  // React Native Paper specific colors
  primary: palette.lightTeal,
  onPrimary: palette.darkTeal,
  primaryContainer: '#005144',
  onPrimaryContainer: palette.paleTeal,
  secondary: palette.lightCoral,
  onSecondary: palette.darkCoral,
  secondaryContainer: '#8C3A2D',
  onSecondaryContainer: palette.paleCoral,
  tertiary: palette.lightPurple,
  onTertiary: palette.darkPurple,
  tertiaryContainer: '#4A4458',
  onTertiaryContainer: palette.palePurple,
  error: palette.lightError,
  onError: palette.darkError,
  errorContainer: '#8C1D18',
  onErrorContainer: palette.paleError,
  background: palette.black,
  onBackground: palette.gray100,
  surface: palette.gray900,
  onSurface: palette.gray100,
  surfaceVariant: palette.gray700,
  onSurfaceVariant: palette.gray300,
  outline: palette.gray600,
  outlineVariant: palette.gray700,
  inverseOnSurface: palette.gray900,
  inverseSurface: palette.gray100,
  inversePrimary: palette.teal,

  // Custom semantic names for the rest of the app
  text: palette.gray100,
  textSecondary: palette.gray400,
  textTertiary: palette.gray500,
  border: palette.gray700,
  inputBackground: palette.gray800,
  logout: palette.coral,
  like: palette.coral,
  tabBarActive: palette.teal,
  tabBarInactive: palette.gray500,
  badge: palette.coral,
  badgeText: palette.white,
};
