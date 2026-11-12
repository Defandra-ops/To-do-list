import { useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { ACCENT_COLOR_PALETTE, useAppSettings } from '@/components/AppSettings';
import { darkTheme, theme } from '@/constants/Colors';

const blendHex = (first: string, second: string, secondWeight: number) => {
  const firstChannels = [1, 3, 5].map((index) => Number.parseInt(first.slice(index, index + 2), 16));
  const secondChannels = [1, 3, 5].map((index) => Number.parseInt(second.slice(index, index + 2), 16));
  return `#${firstChannels.map((channel, index) =>
    Math.round(channel * (1 - secondWeight) + secondChannels[index] * secondWeight)
      .toString(16)
      .padStart(2, '0')
  ).join('')}`;
};

const getReadableColor = (color: string) => {
  const channels = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16) / 255);
  const linearChannels = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  const luminance = linearChannels[0] * 0.2126 + linearChannels[1] * 0.7152 + linearChannels[2] * 0.0722;
  return luminance > 0.18 ? '#17212B' : '#FFFFFF';
};

const backgroundForMode = (color: string | null, isDark: boolean, fallback: string) => {
  if (!color) return fallback;
  const channels = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = channels;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;

  const adjustedLightness = isDark
    ? lightness > 0.5 ? 0.09 + ((lightness - 0.88) / 0.1) * 0.15 : lightness
    : lightness < 0.5 ? 0.88 + ((lightness - 0.09) / 0.15) * 0.1 : lightness;
  const safeLightness = Math.max(isDark ? 0.09 : 0.88, Math.min(isDark ? 0.24 : 0.98, adjustedLightness));
  const chroma = (1 - Math.abs(2 * safeLightness - 1)) * saturation;
  const huePart = hue / 60;
  const secondary = chroma * (1 - Math.abs((huePart % 2) - 1));
  const offset = safeLightness - chroma / 2;
  const values = huePart < 1 ? [chroma, secondary, 0]
    : huePart < 2 ? [secondary, chroma, 0]
      : huePart < 3 ? [0, chroma, secondary]
        : huePart < 4 ? [0, secondary, chroma]
          : huePart < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  return `#${values.map((value) => Math.round((value + offset) * 255).toString(16).padStart(2, '0')).join('')}`;
};

export function useAppTheme() {
  const { themeMode, preferences } = useAppSettings();
  const systemColorScheme = useSystemColorScheme();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const accentColor = ACCENT_COLOR_PALETTE.find(({ id }) => id === preferences.accentColor);
  const primary = preferences.customAccentColor ??
    accentColor?.[isDark ? 'dark' : 'light'] ?? ACCENT_COLOR_PALETTE[0][isDark ? 'dark' : 'light'];
  const baseColors = isDark ? darkTheme.colors : theme.colors;
  const cardBackground = blendHex(baseColors.cardBackground, primary, isDark ? 0.14 : 0.09);
  const primarySoft = blendHex(baseColors.cardBackground, primary, isDark ? 0.24 : 0.3);
  const primaryGradientEnd = blendHex(baseColors.cardBackground, primary, isDark ? 0.35 : 0.42);
  const border = blendHex(baseColors.border, primary, isDark ? 0.45 : 0.32);

  return useMemo(() => ({
    colors: {
      ...baseColors,
      primary,
      primarySoft,
      primaryGradientEnd,
      primarySoftForeground: getReadableColor(primarySoft),
      cardBackground,
      border,
      background: backgroundForMode(preferences.customBackgroundColor, isDark, baseColors.background),
      actionForeground: getReadableColor(primary),
      actionBackground: primary,
    },
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    isDark,
  }), [baseColors, border, cardBackground, isDark, preferences.customBackgroundColor, primary, primarySoft]);
}
