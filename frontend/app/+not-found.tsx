import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LocalizedText } from '@/components/LocalizedText';
import { useAppSettings } from '@/components/AppSettings';
import { translate } from '@/components/LocalizedText';
import { useAppTheme } from '@/components/useAppTheme';
import { useThemedStyles } from '@/components/useThemedStyles';
import { theme as lightTheme } from '@/constants/Colors';

export default function NotFoundScreen() {
  const { language } = useAppSettings();
  const theme = useAppTheme();
  const styles = useThemedStyles(baseStyles);
  return (
    <>
      <Stack.Screen options={{ title: translate('Oops!', language) }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LocalizedText style={styles.title}>This screen doesn’t exist.</LocalizedText>

        <Link href="/" style={styles.link}>
          <LocalizedText style={styles.linkText}>Go to home screen!</LocalizedText>
        </Link>
      </View>
    </>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: lightTheme.colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: lightTheme.colors.textPrimary,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
