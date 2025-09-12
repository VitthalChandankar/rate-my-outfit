import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  fonts: {
    ...DefaultTheme.fonts,
    // Matching Figma typography weights & sizes
    titleLarge: { fontSize: 24, fontWeight: '700', letterSpacing: 0.5 },
    titleMedium: { fontSize: 20, fontWeight: '600', letterSpacing: 0.15 },
    titleSmall: { fontSize: 18, fontWeight: '500', letterSpacing: 0.15 },
    bodyLarge: { fontSize: 16, fontWeight: '400', letterSpacing: 0.5 },
    bodyMedium: { fontSize: 14, fontWeight: '400', letterSpacing: 0.25 },
    labelLarge: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1 },
  },
  roundness: 12, // Consistent rounded corners like Figma
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

export default theme;
