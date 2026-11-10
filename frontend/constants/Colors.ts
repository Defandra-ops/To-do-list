export const theme = {
  colors: {
    primary: '#72C9E4',
    accent: '#E75646',
    buttonDark: '#4D6273',
    canvas: '#39535B',
    background: '#F3F8FA',
    cardBackground: '#FFFFFF',
    textPrimary: '#1A202C',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    success: '#2F8A69',
    warning: '#C07813',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 24,
    full: 9999,
  },
} as const;

export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    primary: '#1B3654',
    accent: '#FFAD5C',
    buttonDark: '#DDEBEE',
    canvas: '#0A1728',
    background: '#142235',
    cardBackground: '#20334A',
    textPrimary: '#F6F8FB',
    textSecondary: '#B8C5D3',
    textMuted: '#91A2B5',
    border: '#344B62',
    success: '#77D6B0',
    warning: '#FFC36E',
  },
} as const;

export default {
  light: {
    text: theme.colors.textPrimary,
    background: theme.colors.background,
    tint: theme.colors.buttonDark,
    tabIconDefault: theme.colors.textMuted,
    tabIconSelected: theme.colors.buttonDark,
  },
  dark: {
    text: darkTheme.colors.textPrimary,
    background: darkTheme.colors.background,
    tint: darkTheme.colors.buttonDark,
    tabIconDefault: darkTheme.colors.textMuted,
    tabIconSelected: darkTheme.colors.buttonDark,
  },
};
