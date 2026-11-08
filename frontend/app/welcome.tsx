import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { theme } from '@/constants/Colors';

export default function WelcomeScreen() {
  const router = useRouter();
  const startApp = () => {
    router.replace('/(tabs)');
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