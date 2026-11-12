import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { LocalizedText as Text } from '@/components/LocalizedText';
import { useAppTheme } from '@/components/useAppTheme';

const size = 228;
const center = size / 2;
const outerRadius = 108;
const innerRadius = 78;
const markerRadius = 93;

type Hsl = { hue: number; saturation: number; lightness: number };

type ColorWheelPickerProps = {
  value: string;
  target: 'accent' | 'background';
  isDark: boolean;
  onCommit: (color: string) => void;
};

const toHex = ({ hue, saturation, lightness }: Hsl) => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePart = hue / 60;
  const secondary = chroma * (1 - Math.abs((huePart % 2) - 1));
  const offset = lightness - chroma / 2;
  const channels = huePart < 1 ? [chroma, secondary, 0]
    : huePart < 2 ? [secondary, chroma, 0]
      : huePart < 3 ? [0, chroma, secondary]
        : huePart < 4 ? [0, secondary, chroma]
          : huePart < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  return `#${channels.map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('')}`;
};

const fromHex = (hex: string): Hsl => {
  const values = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [red, green, blue] = values;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation, lightness };
};

const pointAt = (radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return { x: center + radius * Math.cos(radians), y: center + radius * Math.sin(radians) };
};

const ringSegment = (start: number, end: number) => {
  const outerStart = pointAt(outerRadius, start);
  const outerEnd = pointAt(outerRadius, end);
  const innerEnd = pointAt(innerRadius, end);
  const innerStart = pointAt(innerRadius, start);
  return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y} Z`;
};

export function ColorWheelPicker({ value, target, isDark, onCommit }: ColorWheelPickerProps) {
  const theme = useAppTheme();
  const [draftColor, setDraftColor] = useState(value);
  const [sliderWidth, setSliderWidth] = useState(0);
  const draftColorRef = useRef(value);
  const hsl = fromHex(draftColor);
  const lightnessRange = target === 'background'
    ? isDark ? [0.09, 0.24] as const : [0.88, 0.98] as const
    : isDark ? [0.42, 0.7] as const : [0.4, 0.7] as const;
  const lightnessProgress = Math.max(0, Math.min(1,
    (hsl.lightness - lightnessRange[0]) / (lightnessRange[1] - lightnessRange[0])
  ));
  const saturationMaximum = target === 'background' ? 0.6 : 1;
  const saturationProgress = Math.max(0, Math.min(1, hsl.saturation / saturationMaximum));

  useEffect(() => {
    draftColorRef.current = value;
    setDraftColor(value);
  }, [value]);

  const updateColor = (next: Hsl) => {
    const color = toHex(next);
    draftColorRef.current = color;
    setDraftColor(color);
  };

  const updateHueFromTouch = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const x = event.nativeEvent.locationX - center;
    const y = event.nativeEvent.locationY - center;
    if (Math.sqrt(x * x + y * y) < innerRadius - 12) return;
    const degrees = (Math.atan2(y, x) * 180) / Math.PI;
    const hue = (degrees + 360) % 360;
    updateColor({
      hue,
      saturation: target === 'background' ? 0.42 : 0.82,
      lightness: Math.max(lightnessRange[0], Math.min(lightnessRange[1], hsl.lightness)),
    });
  };

  const updateLightnessFromTouch = (locationX: number) => {
    if (sliderWidth <= 0) return;
    const progress = Math.max(0, Math.min(1, locationX / sliderWidth));
    updateColor({
      ...fromHex(draftColorRef.current),
      lightness: lightnessRange[0] + progress * (lightnessRange[1] - lightnessRange[0]),
    });
  };

  const updateSaturationFromTouch = (locationX: number) => {
    if (sliderWidth <= 0) return;
    const progress = Math.max(0, Math.min(1, locationX / sliderWidth));
    updateColor({
      ...fromHex(draftColorRef.current),
      saturation: progress * saturationMaximum,
    });
  };

  const onSliderLayout = (event: LayoutChangeEvent) => setSliderWidth(event.nativeEvent.layout.width);
  const commitColor = () => onCommit(draftColorRef.current);
  const hueMarker = pointAt(markerRadius, hsl.hue - 90);
  const wheelSegments = Array.from({ length: 72 }, (_, index) => {
    const hue = index * 5;
    return { hue, path: ringSegment(-90 + hue, -90 + hue + 5.2) };
  });
  const sliderStart = toHex({ ...hsl, lightness: lightnessRange[0] });
  const sliderEnd = toHex({ ...hsl, lightness: lightnessRange[1] });
  const saturationStart = toHex({ ...hsl, saturation: 0 });
  const saturationEnd = toHex({ ...hsl, saturation: saturationMaximum });

  return (
    <View style={styles.container}>
      <View
        style={styles.wheelTouchArea}
        onTouchStart={updateHueFromTouch}
        onTouchMove={updateHueFromTouch}
        onTouchEnd={commitColor}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {wheelSegments.map(({ hue, path }) => (
            <Path key={hue} d={path} fill={toHex({ hue, saturation: 0.82, lightness: 0.56 })} />
          ))}
          <Circle cx={center} cy={center} r={38} fill={draftColor} />
          <Circle cx={hueMarker.x} cy={hueMarker.y} r={10} fill={draftColor} stroke="#FFFFFF" strokeWidth={4} />
        </Svg>
      </View>
      <View style={styles.sliderGroup}>
        <View style={styles.sliderHeading}>
          <Text style={[styles.sliderLabel, { color: theme.colors.textPrimary }]}>Saturation</Text>
          <Text style={[styles.hexValue, { color: theme.colors.textSecondary }]}>{Math.round(saturationProgress * 100)}%</Text>
        </View>
        <View
          onLayout={onSliderLayout}
          onTouchStart={(event) => updateSaturationFromTouch(event.nativeEvent.locationX)}
          onTouchMove={(event) => updateSaturationFromTouch(event.nativeEvent.locationX)}
          onTouchEnd={commitColor}
          style={styles.sliderTouchArea}>
          <LinearGradient
            colors={[saturationStart, saturationEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.sliderTrack}
          />
          <View style={[styles.sliderThumb, { left: `${saturationProgress * 100}%`, backgroundColor: draftColor }]} />
        </View>
      </View>
      <View style={styles.sliderGroup}>
        <View style={styles.sliderHeading}>
          <Text style={[styles.sliderLabel, { color: theme.colors.textPrimary }]}>Lightness</Text>
          <Text style={[styles.hexValue, { color: theme.colors.textSecondary }]}>{draftColor.toUpperCase()}</Text>
        </View>
        <View
          onLayout={onSliderLayout}
          onTouchStart={(event) => updateLightnessFromTouch(event.nativeEvent.locationX)}
          onTouchMove={(event) => updateLightnessFromTouch(event.nativeEvent.locationX)}
          onTouchEnd={commitColor}
          style={styles.sliderTouchArea}>
          <LinearGradient
            colors={[sliderStart, sliderEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.sliderTrack}
          />
          <View style={[styles.sliderThumb, { left: `${lightnessProgress * 100}%`, backgroundColor: draftColor }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  sliderGroup: { width: '100%', gap: 2 },
  wheelTouchArea: { width: size, height: size },
  sliderHeading: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  hexValue: { fontSize: 12, fontFamily: 'Nunito_700Bold' },
  sliderTouchArea: { width: '100%', height: 36, justifyContent: 'center' },
  sliderTrack: { height: 12, borderRadius: 6 },
  sliderThumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    marginLeft: -13,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
});
