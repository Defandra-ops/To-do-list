import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { theme } from '@/constants/Colors';
import { useAppSettings } from '@/components/AppSettings';
import { completeWelcome } from '@/components/LaunchFlow';
import { useAppTheme } from '@/components/useAppTheme';
import { useThemedStyles } from '@/components/useThemedStyles';

export default function WelcomeScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(baseStyles);
  const router = useRouter();
  const { isReady, preferences } = useAppSettings();
  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const steps = [
    { icon: 'calendar' as const, title: 'Welcome to Todo Planner', body: 'Plan your day and keep your goals moving, one step at a time.' },
    { icon: 'checkbox' as const, title: 'Break work into steps', body: 'Create tasks, add subtasks, schedule reminders, and track progress.' },
    { icon: 'briefcase' as const, title: 'Keep everything together', body: 'Manage notes, profiles, and job applications from one home.' },
  ];
  const currentStep = steps[step];

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [fade, step]);

  const startApp = () => {
    if (!isReady) return;
    completeWelcome();
    const destinations = {
      home: '/(tabs)',
      planner: '/(tabs)/planner',
      calendar: '/(tabs)/calendar',
      overview: '/(tabs)/overview',
    } as const;
    router.replace(destinations[preferences.defaultView] as never);
  };

  return (
    <SafeAreaView style={styles.canvas}>
      <View style={styles.previewBar}>
        <View style={styles.buildLabel}>
          <Ionicons name="phone-portrait-outline" size={12} color={theme.colors.primary} />
          <Text style={styles.buildText}>TODO PLANNER</Text>
        </View>
        <Text style={styles.buildText}>READY WHEN YOU ARE</Text>
      </View>

      <View style={styles.phoneFrame}>
        <View style={styles.notch}>
          <View style={styles.notchCamera} />
          <View style={styles.notchSpeaker} />
        </View>
        <View style={styles.screen}>
          <View style={styles.firstLaunchPill}>
            <Text style={styles.firstLaunchText}>WELCOME · {step + 1} / {steps.length}</Text>
          </View>

          <Animated.View style={[styles.hero, { opacity: fade }]}>
            <View style={styles.calendarIconCircle}>
              <Ionicons name={currentStep.icon} size={38} color={theme.colors.actionForeground} />
              <Ionicons
                name="checkmark"
                size={19}
                color={theme.colors.primary}
                style={styles.calendarCheck}
              />
            </View>
            <Text style={styles.title}>{currentStep.title}</Text>
            <Text style={styles.subtitle}>{currentStep.body}</Text>
          </Animated.View>

          <View style={styles.footer}>
            <View style={styles.stepDots}>
              {steps.map((_, index) => (
                <View key={index} style={[styles.stepDot, index === step && styles.stepDotActive]} />
              ))}
            </View>
            <View style={styles.footerActions}>
              {step > 0 ? (
                <Pressable accessibilityRole="button" onPress={() => setStep((current) => current - 1)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
              ) : <View style={styles.secondaryButton} />}
              <Pressable
                accessibilityRole="button"
                disabled={!isReady}
                onPress={() => step === steps.length - 1 ? startApp() : setStep((current) => current + 1)}
                style={[styles.primaryButton, !isReady && styles.disabledButton]}>
                <Text style={styles.primaryButtonText}>{step === steps.length - 1 ? 'Get started' : 'Continue'}</Text>
                <Ionicons name={step === steps.length - 1 ? 'arrow-forward' : 'chevron-forward'} size={18} color={theme.colors.buttonDark} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
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
    width: '100%',
    alignItems: 'center',
    gap: 18,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  stepDotActive: {
    width: 22,
    backgroundColor: theme.colors.cardBackground,
  },
  footerActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    minWidth: 96,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.cardBackground,
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 132,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.full,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: theme.colors.buttonDark,
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
});