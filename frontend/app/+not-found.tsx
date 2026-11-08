import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { View } from '@/components/Themed';
import { LocalizedText } from '@/components/LocalizedText';
import { useAppSettings } from '@/components/AppSettings';
import { translate } from '@/components/LocalizedText';

export default function NotFoundScreen() {
  const { language } = useAppSettings();
  return (
    <>
      <Stack.Screen options={{ title: translate('Oops!', language) }} />
      <View style={styles.container}>
        <LocalizedText style={styles.title}>This screen doesn’t exist.</LocalizedText>

        <Link href="/" style={styles.link}>
          <LocalizedText style={styles.linkText}>Go to home screen!</LocalizedText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
