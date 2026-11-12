import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useAppSettings } from '@/components/AppSettings';
import { completeWelcome } from '@/components/LaunchFlow';

const welcomeBlue = '#2563EB';

export default function WelcomeScreen() {
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
      <View style={styles.header}>
        <Text style={styles.brand}>TODO PLANNER</Text>
        <Text style={styles.stepLabel}>{step + 1} / {steps.length}</Text>
      </View>

      <Animated.View style={[styles.hero, { opacity: fade }]}>
        <View style={styles.calendarIconCircle}>
          <Ionicons name={currentStep.icon} size={38} color="#FFFFFF" />
          <Ionicons name="checkmark" size={19} color={welcomeBlue} style={styles.calendarCheck} />
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
            <Ionicons name={step === steps.length - 1 ? 'arrow-forward' : 'chevron-forward'} size={18} color={welcomeBlue} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: welcomeBlue,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  calendarIconCircle: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  calendarCheck: {
    position: 'absolute',
    right: 32,
    bottom: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  title: {
    marginTop: 26,
    color: '#FFFFFF',
    fontSize: 29,
    lineHeight: 36,
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    maxWidth: 360,
    marginTop: 10,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  stepDotActive: {
    width: 26,
    backgroundColor: '#FFFFFF',
  },
  footerActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    minWidth: 100,
    minHeight: 50,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
  },
  primaryButton: {
    minHeight: 50,
    minWidth: 150,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: welcomeBlue,
    fontSize: 14,
    fontFamily: 'Nunito_800ExtraBold',
  },
});