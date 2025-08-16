import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B81', // Main pink/red from Figma
    secondary: '#FFC947', // Accent yellow from Figma
    background: '#FFFFFF', // White background for screens
    surface: '#F8F9FA', // Light grey for cards
    text: '#1A1A1A', // Primary text color
    placeholder: '#9E9E9E', // Placeholder/input text
    success: '#4CAF50', // Green for success labels
    error: '#F44336', // Red for errors
    outline: '#E0E0E0', // Border color
  },
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
