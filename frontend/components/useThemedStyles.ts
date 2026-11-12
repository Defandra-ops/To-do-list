import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { darkTheme, theme } from '@/constants/Colors';
import { useAppTheme } from '@/components/useAppTheme';

const darkColorMap: Record<string, string> = {
  '#28627A': '#B7E4F0',
  '#F1ECFA': '#39324D',
  '#684A98': '#D7C2F6',
  '#8B641B': '#FFDA91',
  '#34734E': '#A8E4C1',
  '#A64B3C': '#FFB0A3',
  '#5D6670': '#C4CED6',
  '#CDE8DA': '#436B58',
  '#F3D0CA': '#7A4A45',
  '#F8DDD8': '#5A3D3A',
  '#CDECF4': '#416B78',
  '#E8D8BA': '#756347',
};

const normalize = (color: string) => color.toUpperCase();

function mapColor(value: string, property: string, isDark: boolean, colors: ReturnType<typeof useAppTheme>['colors']) {
  const normalized = normalize(value);
  if (property === 'shadowColor') return value;
  if ([theme.colors.background, darkTheme.colors.background].some((color) => normalize(color) === normalized)) {
    return colors.background;
  }
  if ([theme.colors.cardBackground, darkTheme.colors.cardBackground].some((color) => normalize(color) === normalized)) {
    return colors.cardBackground;
  }
  if ([theme.colors.border, darkTheme.colors.border].some((color) => normalize(color) === normalized)) {
    return colors.border;
  }
  if (normalized === normalize(theme.colors.primary)) {
    return isDark && property !== 'backgroundColor' && property !== 'borderColor'
      ? darkTheme.colors.buttonDark
      : colors.primary;
  }
  if (!isDark) return value;
  if (normalized === '#FFFFFF' && property === 'color') return '#FFFFFF';
  const paletteMap: Record<string, string> = {
    [theme.colors.accent]: darkTheme.colors.accent,
    [theme.colors.canvas]: darkTheme.colors.canvas,
    [theme.colors.background]: darkTheme.colors.background,
    [theme.colors.cardBackground]: darkTheme.colors.cardBackground,
    [theme.colors.textPrimary]: darkTheme.colors.textPrimary,
    [theme.colors.textSecondary]: darkTheme.colors.textSecondary,
    [theme.colors.textMuted]: darkTheme.colors.textMuted,
    [theme.colors.border]: darkTheme.colors.border,
    [theme.colors.success]: darkTheme.colors.success,
  };
  const mapped = paletteMap[normalized] ?? darkColorMap[normalized];
  if (mapped) return mapped;
  if (normalized === '#0B1220') return darkTheme.colors.background;
  if (normalized === '#101827') return darkTheme.colors.cardBackground;
  if (normalized === '#D5DFEF') return darkTheme.colors.textSecondary;
  if (normalized === '#D8E0EC') return darkTheme.colors.border;
  if (normalized === '#243247') return darkTheme.colors.border;

  if (normalized.startsWith('RGBA(') && property === 'backgroundColor') {
    return 'rgba(0, 0, 0, 0.72)';
  }
  if (!/^#[0-9A-F]{6}$/.test(normalized)) return value;

  const channels = [1, 3, 5].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16));
  const luminance = (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) / 255;
  if (property === 'backgroundColor' && luminance > 0.58) {
    const darkBase = [32, 51, 74];
    return `#${channels.map((channel, index) => Math.round(channel * 0.24 + darkBase[index] * 0.76).toString(16).padStart(2, '0')).join('')}`;
  }
  if (property === 'borderColor' && luminance > 0.58) return darkTheme.colors.border;
  if (property === 'color' && luminance < 0.58) {
    return `#${channels.map((channel) => Math.round(channel * 0.25 + 230 * 0.75).toString(16).padStart(2, '0')).join('')}`;
  }
  return value;
}

function transformStyles(value: unknown, isDark: boolean, colors: ReturnType<typeof useAppTheme>['colors']): unknown {
  if (Array.isArray(value)) return value.map((item) => transformStyles(item, isDark, colors));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      typeof item === 'string' && key.toLowerCase().includes('color')
        ? mapColor(item, key, isDark, colors)
        : transformStyles(item, isDark, colors),
    ])
  );
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(styles: T): T {
  const { isDark, colors } = useAppTheme();
  return useMemo(
    () => StyleSheet.create(transformStyles(styles, isDark, colors) as T),
    [colors, isDark, styles]
  );
}
