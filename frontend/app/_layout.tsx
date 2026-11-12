import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { AppState, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import 'react-native-reanimated';

import { AppSettingsProvider } from '@/components/AppSettings';
import { useAppSettings } from '@/components/AppSettings';
import { TodoStoreProvider } from '@/components/TodoStore';
import { useAppTheme } from '@/components/useAppTheme';
import { LocalizedText as Text } from '@/components/LocalizedText';

export {

  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {

  initialRouteName: 'welcome',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    ...FontAwesome.font,
  });
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <AppSettingsProvider>
      <TodoStoreProvider>
        <RootNavigator />
      </TodoStoreProvider>
    </AppSettingsProvider>
  );
}

function RootNavigator() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data.route;
      if (route === '/(tabs)/calendar') {
        router.push('/(tabs)/calendar' as never);
      }
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <ThemeProvider value={{
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme : DefaultTheme).colors,
        background: colors.background,
        card: colors.cardBackground,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.buttonDark,
      },
    }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppLockGate>
        <Stack>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </AppLockGate>
    </ThemeProvider>
  );
}

function AppLockGate({ children }: { children: React.ReactNode }) {
  const { preferences, isReady, getAppLockPin } = useAppSettings();
  const theme = useAppTheme();
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const wasBackgrounded = useRef(false);
  const initialLockChecked = useRef(false);
  const authenticateBiometric = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Todo Planner',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        setLocked(false);
        setError('');
      } else {
        setError('Authentication was not completed.');
      }
    } catch (authError) {
      console.error('Biometric app unlock failed:', authError);
      setError('Could not start biometric authentication.');
    }
  }, []);

  useEffect(() => {
    if (!isReady || initialLockChecked.current) return;
    initialLockChecked.current = true;
    setLocked(preferences.appLockEnabled);
  }, [isReady, preferences.appLockEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        wasBackgrounded.current = true;
      } else if (wasBackgrounded.current && preferences.appLockEnabled) {
        wasBackgrounded.current = false;
        setPin('');
        setError('');
        setLocked(true);
      }
    });
    return () => subscription.remove();
  }, [preferences.appLockEnabled]);

  useEffect(() => {
    if (locked && preferences.appLockEnabled && preferences.appLockMethod === 'biometric') {
      void authenticateBiometric();
    }
  }, [authenticateBiometric, locked, preferences.appLockEnabled, preferences.appLockMethod]);

  const unlockWithPin = async () => {
    try {
      const savedPin = await getAppLockPin();
      if (!savedPin) {
        setError('No App Lock PIN is configured. Disable App Lock in Settings after unlocking the device.');
        return;
      }
      if (pin !== savedPin) {
        setPin('');
        setError('Incorrect PIN. Try again.');
        return;
      }
      setLocked(false);
      setPin('');
      setError('');
    } catch (unlockError) {
      console.error('PIN app unlock failed:', unlockError);
      setError('Could not verify the secure PIN.');
    }
  };

  return (
    <View style={lockStyles.root}>
      {children}
      {locked && preferences.appLockEnabled ? (
        <SafeAreaView style={[lockStyles.overlay, { backgroundColor: theme.colors.background }]}>
          <View style={lockStyles.lockCard}>
            <Text style={[lockStyles.lockTitle, { color: theme.colors.textPrimary }]}>Todo Planner is locked</Text>
            <Text style={[lockStyles.lockDescription, { color: theme.colors.textSecondary }]}>
              {preferences.appLockMethod === 'pin' ? 'Enter your device PIN to continue.' : 'Verify your identity to continue.'}
            </Text>
            {preferences.appLockMethod === 'pin' ? (
              <>
                <TextInput
                  accessibilityLabel="App Lock PIN"
                  style={[lockStyles.pinInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                  value={pin}
                  onChangeText={setPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={6}
                  onSubmitEditing={() => void unlockWithPin()}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void unlockWithPin()}
                  style={[lockStyles.unlockButton, { backgroundColor: theme.colors.primary }]}>
                  <Text style={lockStyles.unlockText}>Unlock</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => void authenticateBiometric()}
                style={[lockStyles.unlockButton, { backgroundColor: theme.colors.primary }]}>
                <Text style={lockStyles.unlockText}>Authenticate</Text>
              </Pressable>
            )}
            {error ? <Text style={[lockStyles.lockError, { color: theme.colors.accent }]}>{error}</Text> : null}
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const lockStyles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    justifyContent: 'center',
    padding: 24,
  },
  lockCard: {
    alignItems: 'center',
    gap: 12,
  },
  lockTitle: {
    color: '#1A202C',
    fontSize: 24,
    fontFamily: 'Nunito_800ExtraBold',
    textAlign: 'center',
  },
  lockDescription: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Nunito_500Medium',
    textAlign: 'center',
  },
  pinInput: {
    width: 220,
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
  },
  unlockButton: {
    minWidth: 160,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  unlockText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Nunito_800ExtraBold',
  },
  lockError: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
});
