import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppSettings, type AppLanguage } from '@/components/AppSettings';
import { theme } from '@/constants/Colors';

const languages: { code: AppLanguage; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
];

const copy = {
  en: {
    title: 'Settings',
    subtitle: 'Personalize your app preferences.',
    language: 'Language',
    languageDescription: 'Choose the language for the app interface.',
    selected: 'Selected',
    about: 'About',
    appName: 'To-do list',
    appDescription: 'A simple planner for tasks, notes, and job applications.',
    languageNote: 'This language setting applies to interface text across all screens.',
    saveError: 'Could not save your language preference. Please try again.',
    reminders: 'Task reminders',
    remindersDescription: 'Get notifications for daily tasks and upcoming deadlines.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    remindersPlatformNote: 'Task reminder notifications are available in the mobile app.',
    notificationSaveError: 'Could not save your notification preference. Please try again.',
  },
  id: {
    title: 'Pengaturan',
    subtitle: 'Atur preferensi aplikasi Anda.',
    language: 'Bahasa',
    languageDescription: 'Pilih bahasa antarmuka aplikasi.',
    selected: 'Dipilih',
    about: 'Tentang',
    appName: 'To-do list',
    appDescription: 'Perencana sederhana untuk tugas, catatan, dan lamaran kerja.',
    languageNote: 'Bahasa ini diterapkan pada teks antarmuka seluruh halaman.',
    saveError: 'Preferensi bahasa tidak dapat disimpan. Silakan coba lagi.',
    reminders: 'Pengingat tugas',
    remindersDescription: 'Terima notifikasi untuk tugas harian dan tenggat yang akan datang.',
    enabled: 'Aktif',
    disabled: 'Nonaktif',
    remindersPlatformNote: 'Notifikasi pengingat tugas tersedia di aplikasi seluler.',
    notificationSaveError: 'Preferensi notifikasi tidak dapat disimpan. Silakan coba lagi.',
  },
} as const;

export default function SettingsScreen() {
  const {
    language,
    notificationsEnabled,
    isReady,
    setLanguage,
    setNotificationsEnabled,
  } = useAppSettings();
  const [saveError, setSaveError] = useState('');
  const [notificationSaveError, setNotificationSaveError] = useState('');
  const text = copy[language];

  const selectLanguage = async (nextLanguage: AppLanguage) => {
    if (nextLanguage === language || !isReady) return;
    setSaveError('');
    try {
      await setLanguage(nextLanguage);
    } catch (error) {
      console.error('Failed to save app language setting:', error);
      setSaveError(copy[nextLanguage].saveError);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    setNotificationSaveError('');
    try {
      await setNotificationsEnabled(enabled);
    } catch (error) {
      console.error('Failed to save notification setting:', error);
      setNotificationSaveError(text.notificationSaveError);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.subtitle}>{text.subtitle}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="notifications-outline" size={19} color={theme.colors.buttonDark} />
            <Text style={styles.sectionTitle}>{text.reminders}</Text>
          </View>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.description}>{text.remindersDescription}</Text>
              <Text style={styles.preferenceState}>
                {notificationsEnabled ? text.enabled : text.disabled}
              </Text>
            </View>
            <Switch
              accessibilityLabel={text.reminders}
              value={notificationsEnabled}
              disabled={!isReady}
              onValueChange={(enabled) => void toggleNotifications(enabled)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.cardBackground}
            />
          </View>
          {Platform.OS === 'web' ? <Text style={styles.note}>{text.remindersPlatformNote}</Text> : null}
          {notificationSaveError ? <Text style={styles.error}>{notificationSaveError}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="language-outline" size={19} color={theme.colors.buttonDark} />
            <Text style={styles.sectionTitle}>{text.language}</Text>
          </View>
          <Text style={styles.description}>{text.languageDescription}</Text>
          <View style={styles.options}>
            {languages.map((option) => {
              const isSelected = language === option.code;
              return (
                <Pressable
                  key={option.code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected, disabled: !isReady }}
                  disabled={!isReady}
                  onPress={() => void selectLanguage(option.code)}
                  style={[styles.languageOption, isSelected && styles.languageOptionSelected]}>
                  <View style={styles.languageCopy}>
                    <Text style={styles.languageName}>{option.nativeLabel}</Text>
                    <Text style={styles.languageLabel}>{option.label}</Text>
                  </View>
                  {isSelected ? (
                    <View style={styles.selectedLabel}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                      <Text style={styles.selectedText}>{text.selected}</Text>
                    </View>
                  ) : (
                    <Ionicons name="ellipse-outline" size={19} color={theme.colors.textMuted} />
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.note}>{text.languageNote}</Text>
          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="information-circle-outline" size={19} color={theme.colors.buttonDark} />
            <Text style={styles.sectionTitle}>{text.about}</Text>
          </View>
          <View style={styles.aboutRow}>
            <View style={styles.aboutIcon}>
              <Ionicons name="checkbox-outline" size={20} color={theme.colors.buttonDark} />
            </View>
            <View style={styles.aboutCopy}>
              <Text style={styles.languageName}>{text.appName}</Text>
              <Text style={styles.description}>{text.appDescription}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  heading: {
    marginBottom: 2,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Nunito_500Medium',
  },
  section: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
  description: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Nunito_500Medium',
  },
  options: {
    marginTop: 12,
    gap: 8,
  },
  languageOption: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 13,
    backgroundColor: '#F7FBFC',
  },
  languageOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF9FC',
  },
  languageCopy: {
    gap: 1,
  },
  languageName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  languageLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_500Medium',
  },
  selectedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedText: {
    color: theme.colors.success,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  note: {
    marginTop: 9,
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Nunito_500Medium',
  },
  error: {
    marginTop: 8,
    color: theme.colors.accent,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  aboutRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  aboutIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E8F4F7',
  },
  aboutCopy: {
    flex: 1,
  },
  preferenceRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceCopy: {
    flex: 1,
  },
  preferenceState: {
    marginTop: 4,
    color: theme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
});
