import { useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useAppSettings } from '@/components/AppSettings';
import { darkTheme, theme } from '@/constants/Colors';

export function useAppTheme() {
  const { themeMode, preferences } = useAppSettings();
  const systemColorScheme = useSystemColorScheme();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const accentColors = {
    blue: { light: '#72C9E4', dark: '#387789' },
    purple: { light: '#A78BFA', dark: '#7B61B8' },
    green: { light: '#65B98A', dark: '#3F8C68' },
    orange: { light: '#F2A65A', dark: '#B66B2B' },
  } as const;
  const primary = accentColors[preferences.accentColor][isDark ? 'dark' : 'light'];

  return useMemo(() => ({
    colors: {
      ...(isDark ? darkTheme.colors : theme.colors),
      primary,
      actionForeground: '#FFFFFF',
      actionBackground: isDark ? primary : theme.colors.buttonDark,
    },
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    isDark,
  }), [isDark, primary]);
}
