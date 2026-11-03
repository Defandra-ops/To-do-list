import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/Colors';

const WELCOME_STORAGE_KEY = 'todo-app-welcome-complete-v1';

export default function WelcomeScreen() {
  const router = useRouter();
  const [hasCompletedWelcome, setHasCompletedWelcome] = useState<boolean | null>(null);

  useEffect(() => {
    let isCurrent = true;
    AsyncStorage.getItem(WELCOME_STORAGE_KEY)
      .then((value) => {
        if (isCurrent) setHasCompletedWelcome(value === 'true');
      })
      .catch((error) => {
        console.error('Failed to load welcome state:', error);
        if (isCurrent) setHasCompletedWelcome(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const startApp = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    } catch (error) {
      console.error('Failed to save welcome state:', error);
    }
    router.replace('/(tabs)');
  };

  const resetFirstLaunch = async () => {
    try {
      await AsyncStorage.removeItem(WELCOME_STORAGE_KEY);
      setHasCompletedWelcome(false);
    } catch (error) {
      console.error('Failed to reset welcome state:', error);
    }
  };

  if (hasCompletedWelcome === null) return null;
  if (hasCompletedWelcome) return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView style={styles.canvas}>
      <View style={styles.previewBar}>
        <View style={styles.buildLabel}>
          <Ionicons name="phone-portrait-outline" size={12} color={theme.colors.primary} />
          <Text style={styles.buildText}>Expo SDK 54 Build</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset first launch"
          hitSlop={8}
          onPress={resetFirstLaunch}
          style={styles.resetButton}>
          <Ionicons name="refresh" size={13} color={theme.colors.primary} />
          <Text style={styles.resetText}>Reset First Launch</Text>
        </Pressable>
      </View>

      <View style={styles.phoneFrame}>
        <View style={styles.notch}>
          <View style={styles.notchCamera} />
          <View style={styles.notchSpeaker} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tap anywhere to start using the planner"
          style={styles.screen}
          onPress={startApp}>
          <View style={styles.firstLaunchPill}>
            <Text style={styles.firstLaunchText}>FIRST LAUNCH</Text>
          </View>

          <View style={styles.hero}>
            <View style={styles.calendarIconCircle}>
              <Ionicons name="calendar" size={38} color={theme.colors.cardBackground} />
              <Ionicons
                name="checkmark"
                size={19}
                color={theme.colors.primary}
                style={styles.calendarCheck}
              />
            </View>
            <Text style={styles.title}>Todo Planner</Text>
            <Text style={styles.subtitle}>
              Track habits, routines, and scheduled milestones offline or synced.
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.tapIconCircle}>
              <Ionicons name="hand-left" size={21} color={theme.colors.buttonDark} />
            </View>
            <Text style={styles.tapText}>TAP ANYWHERE TO START</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#0B1220',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  previewBar: {
    width: '100%',
    maxWidth: 380,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
    paddingHorizontal: 5,
    marginBottom: 8,
  },
  buildLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buildText: {
    color: '#D5DFEF',
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
  },
  resetButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  resetText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontFamily: 'Nunito_800ExtraBold',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 380,
    flex: 1,
    alignSelf: 'center',
    padding: 7,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: '#D8E0EC',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 8,
  },
  notch: {
    position: 'absolute',
    zIndex: 1,
    top: 10,
    alignSelf: 'center',
    width: 104,
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#101827',
    borderRadius: theme.borderRadius.full,
  },
  notchCamera: {
    width: 6,
    height: 6,
    backgroundColor: '#243247',
    borderRadius: theme.borderRadius.full,
  },
  notchSpeaker: {
    width: 27,
    height: 3,
    backgroundColor: '#243247',
    borderRadius: theme.borderRadius.full,
  },
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 46,
    paddingBottom: 34,
    overflow: 'hidden',
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
  },
  firstLaunchPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: theme.borderRadius.full,
  },
  firstLaunchText: {
    color: theme.colors.cardBackground,
    fontSize: 10,
    fontFamily: 'Nunito_800ExtraBold',
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 18,
  },
  calendarIconCircle: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  calendarCheck: {
    position: 'absolute',
    right: 27,
    bottom: 25,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.full,
  },
  title: {
    marginTop: 18,
    color: theme.colors.cardBackground,
    fontSize: 25,
    lineHeight: 32,
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    maxWidth: 250,
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  tapIconCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.full,
  },
  tapText: {
    color: theme.colors.cardBackground,
    fontSize: 10,
    fontFamily: 'Nunito_800ExtraBold',
  },
});