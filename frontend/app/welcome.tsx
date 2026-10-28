import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  if (hasCompletedWelcome === null) return null;
  if (hasCompletedWelcome) return <Redirect href="/(tabs)" />;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tap anywhere to start using the planner"
      style={styles.pressable}
      onPress={startApp}>
      <LinearGradient
        colors={['#102b45', '#145c6d', '#1f827a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topline}>
            <View style={styles.mark}>
              <Ionicons name="checkmark" size={18} color="#15374d" />
            </View>
            <Text style={styles.brand}>TODO / PLANNER</Text>
          </View>

          <View style={styles.message}>
            <Text style={styles.eyebrow}>A CLEARER WAY TO GET THINGS DONE</Text>
            <Text style={styles.title}>Make today{'\n'}count.</Text>
            <View style={styles.rule} />
            <Text style={styles.subtitle}>
              Keep your plans close, your priorities clear, and your next step in reach.
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.tapHint}>
              <Text style={styles.tapText}>Tap anywhere to begin</Text>
              <Ionicons name="arrow-forward" size={19} color="#f4d58d" />
            </View>
            <Text style={styles.footerNote}>YOUR TASKS, AT YOUR PACE</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  gradient: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 24 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4d58d', borderRadius: 9 },
  brand: { color: '#d6e7e8', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  message: { marginTop: 34, marginBottom: 34 },
  eyebrow: { color: '#9ec4c4', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 18, color: '#ffffff', fontSize: 54, lineHeight: 62, fontWeight: '800' },
  rule: { width: 48, height: 3, marginTop: 24, backgroundColor: '#f4d58d', borderRadius: 2 },
  subtitle: { maxWidth: 300, marginTop: 18, color: '#d6e7e8', fontSize: 16, lineHeight: 24 },
  footer: { gap: 12 },
  tapHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(226, 242, 239, 0.35)', borderRadius: 10 },
  tapText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  footerNote: { color: '#9ec4c4', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});