import { useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useAppSettings } from '@/components/AppSettings';
import { darkTheme, theme } from '@/constants/Colors';

export function useAppTheme() {
  const { themeMode } = useAppSettings();
  const systemColorScheme = useSystemColorScheme();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  return useMemo(() => ({
    colors: {
      ...(isDark ? darkTheme.colors : theme.colors),
      actionForeground: '#FFFFFF',
      actionBackground: isDark ? '#387789' : theme.colors.buttonDark,
    },
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    isDark,
  }), [isDark]);
}
