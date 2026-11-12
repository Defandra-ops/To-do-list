import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocalizedText as Text } from '@/components/LocalizedText';
import { ColorWheelPicker } from '@/components/ColorWheelPicker';
import {
  useAppSettings,
  type AppLanguage,
  type AppPreferenceKey,
  type AppPreferences,
  type ThemeMode,
} from '@/components/AppSettings';
import { useTodoStore } from '@/components/TodoStore';
import { useAppTheme } from '@/components/useAppTheme';
import { useThemedStyles } from '@/components/useThemedStyles';
import { theme as lightTheme } from '@/constants/Colors';

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
    appearance: 'Appearance',
    appearanceDescription: 'Choose light, dark, or follow your device setting.',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    appearanceSaveError: 'Could not save your appearance preference. Please try again.',
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
    appearance: 'Tampilan',
    appearanceDescription: 'Pilih tampilan terang, gelap, atau ikuti pengaturan perangkat.',
    system: 'Sistem',
    light: 'Terang',
    dark: 'Gelap',
    appearanceSaveError: 'Preferensi tampilan tidak dapat disimpan. Silakan coba lagi.',
  },
} as const;

export default function SettingsScreen() {
  const {
    language,
    notificationsEnabled,
    themeMode,
    preferences,
    isReady,
    setLanguage,
    setNotificationsEnabled,
    setThemeMode,
    setPreference,
    setAppLockPin,
    clearAppLockPin,
  } = useAppSettings();
  const { tasks, notes, users, jobApplications, activeUserId, syncStatus, syncNow, resetAppData, restoreAppState } = useTodoStore();
  const theme = useAppTheme();
  const router = useRouter();
  const styles = useThemedStyles(baseStyles);
  const [saveError, setSaveError] = useState('');
  const [notificationSaveError, setNotificationSaveError] = useState('');
  const [appearanceSaveError, setAppearanceSaveError] = useState('');
  const [preferenceError, setPreferenceError] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState('');
  const [timePickerTarget, setTimePickerTarget] = useState<'defaultDueTime' | 'dailyDigestTime' | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinDraft, setPinDraft] = useState('');
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState('');
  const [colorTarget, setColorTarget] = useState<'accent' | 'background'>('accent');
  const text = copy[language];
  const preference = <K extends AppPreferenceKey>(key: K, value: AppPreferences[K]) => {
    setPreferenceError('');
    void setPreference(key, value).catch((error) => {
      console.error(`Failed to save app preference ${key}:`, error);
      setPreferenceError('Could not save this preference. Please try again.');
    });
  };

  const saveThemeColor = async (color: string) => {
    setPreferenceError('');
    try {
      const colorKey = colorTarget === 'accent' ? 'customAccentColor' : 'customBackgroundColor';
      const recentThemeColors = [
        color.toUpperCase(),
        ...preferences.recentThemeColors.filter((recentColor) => recentColor.toUpperCase() !== color.toUpperCase()),
      ].slice(0, 8);
      await setPreference(colorKey, color.toUpperCase());
      await setPreference('recentThemeColors', recentThemeColors);
    } catch (error) {
      console.error('Failed to save theme color:', error);
      setPreferenceError('Could not save this preference. Please try again.');
    }
  };

  const openTimePicker = (key: 'defaultDueTime' | 'dailyDigestTime') => setTimePickerTarget(key);
  const onTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate && timePickerTarget) {
      const time = `${`${selectedDate.getHours()}`.padStart(2, '0')}:${`${selectedDate.getMinutes()}`.padStart(2, '0')}`;
      preference(timePickerTarget, time);
    }
    if (Platform.OS !== 'ios') setTimePickerTarget(null);
  };
  const pickerValue = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const value = new Date();
    value.setHours(hour, minute, 0, 0);
    return value;
  };

  const exportBackup = async () => {
    setBackupError('');
    setBackupMessage('');
    try {
      const backup = {
        format: 'todo-planner-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        state: {
          users: users.map(({ photoUri: _photoUri, ...user }) => user),
          activeUserId,
          tasks,
          notes,
          jobApplications,
        },
      };
      const json = JSON.stringify(backup, null, 2);
      const filename = `todo-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } else {
        if (!FileSystem.documentDirectory) throw new Error('App storage is unavailable for exporting a backup.');
        if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
        const uri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export app backup' });
      }
      setBackupMessage('Backup exported. Profile photo files are stored only on this device and are not included.');
    } catch (error) {
      console.error('Failed to export app backup:', error);
      setBackupError(error instanceof Error ? error.message : 'Could not export backup.');
    }
  };

  const importBackup = async () => {
    setBackupError('');
    setBackupMessage('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const contents = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const backup: unknown = JSON.parse(contents);
      if (
        !backup ||
        typeof backup !== 'object' ||
        !('format' in backup) ||
        backup.format !== 'todo-planner-backup' ||
        !('version' in backup) ||
        backup.version !== 1 ||
        !('state' in backup) ||
        !backup.state ||
        typeof backup.state !== 'object'
      ) {
        throw new Error('This file is not a supported Todo Planner backup.');
      }
      const importedState = backup.state as Record<string, unknown>;
      if (
        !Array.isArray(importedState.users) ||
        !Array.isArray(importedState.tasks) ||
        (importedState.notes !== undefined && !Array.isArray(importedState.notes)) ||
        (importedState.jobApplications !== undefined && !Array.isArray(importedState.jobApplications))
      ) {
        throw new Error('This backup has an invalid app state.');
      }
      const hasOnlyObjects = (items: unknown[]) =>
        items.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item));
      if (!hasOnlyObjects(importedState.users) || !hasOnlyObjects(importedState.tasks)) {
        throw new Error('This backup contains invalid profiles or tasks.');
      }
      const confirmRestore = () => {
        restoreAppState(importedState as Parameters<typeof restoreAppState>[0]);
        setBackupMessage('Backup restored successfully.');
      };
      if (Platform.OS === 'web') {
        if (window.confirm('Restore this backup? Current app data will be replaced.')) confirmRestore();
      } else {
        Alert.alert('Restore backup?', 'Current app data will be replaced by this backup.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', style: 'destructive', onPress: confirmRestore },
        ]);
      }
    } catch (error) {
      console.error('Failed to import app backup:', error);
      setBackupError(error instanceof Error ? error.message : 'Could not restore this backup.');
    }
  };

  const clearData = () => {
    const confirmClear = () => {
      resetAppData();
      setBackupMessage('App data cleared.');
    };
    const warning = 'This removes tasks, notes, applications, and profiles. If synchronization is connected, this reset will also replace the shared server state for other connected devices.';
    if (Platform.OS === 'web') {
      if (window.confirm(warning)) confirmClear();
    } else {
      Alert.alert('Clear app data?', warning, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear data', style: 'destructive', onPress: confirmClear },
      ]);
    }
  };

  const configureAppLock = async (enabled: boolean) => {
    try {
      if (!enabled) {
        await clearAppLockPin();
        await preference('appLockEnabled', false);
        return;
      }
      if (preferences.appLockMethod === 'biometric') {
        const [hardware, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (!hardware || !enrolled) throw new Error('Set up biometrics on this device before enabling App Lock.');
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Enable Todo Planner App Lock' });
        if (!result.success) return;
      } else {
        setPinDraft('');
        setPinModalVisible(true);
        return;
      }
      await preference('appLockEnabled', true);
    } catch (error) {
      console.error('Failed to configure app lock:', error);
      setPreferenceError(error instanceof Error ? error.message : 'Could not configure App Lock.');
    }
  };

  const saveAppLockPin = async () => {
    if (!/^\d{4,6}$/.test(pinDraft)) {
      setPreferenceError('PIN must contain 4 to 6 digits.');
      return;
    }
    try {
      await setAppLockPin(pinDraft);
      await preference('appLockEnabled', true);
      setPinDraft('');
      setPinModalVisible(false);
    } catch (error) {
      console.error('Failed to save app lock PIN:', error);
      setPreferenceError('Could not save the secure PIN.');
    }
  };

  const sendFeedback = async () => {
    if (!feedbackDraft.trim()) return;
    try {
      await Share.share({ title: 'Todo Planner feedback', message: feedbackDraft.trim() });
      setFeedbackVisible(false);
      setFeedbackDraft('');
    } catch (error) {
      console.error('Failed to share feedback:', error);
      setPreferenceError('Could not open the share sheet. Please try again.');
    }
  };

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

  const selectTheme = async (nextThemeMode: ThemeMode) => {
    if (nextThemeMode === themeMode || !isReady) return;
    setAppearanceSaveError('');
    try {
      await setThemeMode(nextThemeMode);
    } catch (error) {
      console.error('Failed to save app appearance setting:', error);
      setAppearanceSaveError(text.appearanceSaveError);
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
            <Ionicons name="contrast-outline" size={19} color={theme.colors.buttonDark} />
            <Text style={styles.sectionTitle}>{text.appearance}</Text>
          </View>
          <Text style={styles.description}>{text.appearanceDescription}</Text>
          <View style={styles.options}>
            {([
              ['system', text.system],
              ['light', text.light],
              ['dark', text.dark],
            ] as const).map(([mode, label]) => {
              const isSelected = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected, disabled: !isReady }}
                  disabled={!isReady}
                  onPress={() => void selectTheme(mode)}
                  style={[styles.languageOption, isSelected && styles.languageOptionSelected]}>
                  <Text style={styles.languageName}>{label}</Text>
                  {isSelected ? (
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={19} color={theme.colors.textMuted} />
                  )}
                </Pressable>
              );
            })}
          </View>
          {appearanceSaveError ? <Text style={styles.error}>{appearanceSaveError}</Text> : null}
          <Text style={styles.description}>Theme color</Text>
          <View style={styles.choiceRow}>
            {([
              ['accent', 'Accent'],
              ['background', 'Background'],
            ] as const).map(([target, label]) => (
              <Pressable
                key={target}
                accessibilityRole="radio"
                accessibilityState={{ checked: colorTarget === target }}
                onPress={() => setColorTarget(target)}
                style={[styles.choiceChip, colorTarget === target && styles.choiceChipSelected]}>
                <Text style={[styles.choiceChipText, colorTarget === target && styles.choiceChipTextSelected]}>{label}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => preference(colorTarget === 'accent' ? 'customAccentColor' : 'customBackgroundColor', null)}
              style={styles.colorResetButton}>
              <Text style={styles.choiceChipText}>Reset</Text>
            </Pressable>
          </View>
          <ColorWheelPicker
            key={colorTarget}
            target={colorTarget}
            isDark={theme.isDark}
            value={colorTarget === 'accent'
              ? preferences.customAccentColor ?? theme.colors.primary
              : theme.colors.background}
            onCommit={(color) => void saveThemeColor(color)}
          />
          <Text style={styles.description}>Recent colors</Text>
          {preferences.recentThemeColors.length > 0 ? (
            <View style={styles.recentColorsRow}>
              {preferences.recentThemeColors.map((color, index) => (
                <Pressable
                  key={`${color}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Use recent color ${color}`}
                  onPress={() => void saveThemeColor(color)}
                  style={[styles.recentColorChoice, { backgroundColor: color }]}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.description}>Colors you use will appear here.</Text>
          )}
          <Text style={styles.description}>Default opening page</Text>
          <View style={styles.choiceRow}>
            {([
              ['home', 'Home'],
              ['planner', 'Tasks'],
              ['calendar', 'Calendar'],
              ['overview', 'Progress'],
            ] as const).map(([view, label]) => (
              <Pressable key={view} onPress={() => preference('defaultView', view)} style={[styles.choiceChip, preferences.defaultView === view && styles.choiceChipSelected]}>
                <Text style={[styles.choiceChipText, preferences.defaultView === view && styles.choiceChipTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.description}>Time format</Text>
          <View style={styles.choiceRow}>
            {([['12h', '12-hour'], ['24h', '24-hour']] as const).map(([format, label]) => (
              <Pressable key={format} onPress={() => preference('timeFormat', format)} style={[styles.choiceChip, preferences.timeFormat === format && styles.choiceChipSelected]}>
                <Text style={[styles.choiceChipText, preferences.timeFormat === format && styles.choiceChipTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.description}>First day of week</Text>
          <View style={styles.choiceRow}>
            {([['sunday', 'Sunday'], ['monday', 'Monday']] as const).map(([day, label]) => (
              <Pressable key={day} onPress={() => preference('weekStartsOn', day)} style={[styles.choiceChip, preferences.weekStartsOn === day && styles.choiceChipSelected]}>
                <Text style={[styles.choiceChipText, preferences.weekStartsOn === day && styles.choiceChipTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {preferenceError ? <Text style={styles.error}>{preferenceError}</Text> : null}
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
              thumbColor={theme.colors.actionForeground}
            />
          </View>
          {Platform.OS === 'web' ? <Text style={styles.note}>{text.remindersPlatformNote}</Text> : null}
          {notificationSaveError ? <Text style={styles.error}>{notificationSaveError}</Text> : null}
          <PreferenceToggle
            label="Daily digest"
            description="Receive one daily summary of unfinished tasks."
            value={preferences.dailyDigestEnabled}
            disabled={!notificationsEnabled || !isReady}
            onChange={(value) => preference('dailyDigestEnabled', value)}
            theme={theme}
          />
          <PreferenceButton
            label="Default reminder time"
            value={preferences.defaultDueTime}
            onPress={() => openTimePicker('defaultDueTime')}
            theme={theme}
          />
          <PreferenceButton
            label="Daily digest time"
            value={preferences.dailyDigestTime}
            onPress={() => openTimePicker('dailyDigestTime')}
            disabled={!notificationsEnabled || !preferences.dailyDigestEnabled}
            theme={theme}
          />
          <PreferenceToggle
            label="Notification sound"
            description="Play the default device sound."
            value={preferences.soundEnabled}
            disabled={!notificationsEnabled || !isReady}
            onChange={(value) => preference('soundEnabled', value)}
            theme={theme}
          />
          <PreferenceToggle
            label="Vibration"
            description="Vibrate for task notifications."
            value={preferences.vibrationEnabled}
            disabled={!notificationsEnabled || !isReady}
            onChange={(value) => preference('vibrationEnabled', value)}
            theme={theme}
          />
          <Text style={styles.note}>Notification audio uses the device default sound. Change the task-reminder tone in your device notification settings.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="checkbox-outline" size={19} color={theme.colors.buttonDark} />
            <Text style={styles.sectionTitle}>Task behavior</Text>
          </View>
          <Text style={styles.description}>Position for new tasks</Text>
          <View style={styles.choiceRow}>
            {([['top', 'Top'], ['bottom', 'Bottom']] as const).map(([position, label]) => (
              <Pressable key={position} onPress={() => preference('taskPosition', position)} style={[styles.choiceChip, preferences.taskPosition === position && styles.choiceChipSelected]}>
                <Text style={[styles.choiceChipText, preferences.taskPosition === position && styles.choiceChipTextSelected]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <PreferenceToggle
            label="Hide completed tasks"
            description="Keep completed tasks out of the task list."
            value={preferences.hideCompletedTasks}
            onChange={(value) => preference('hideCompletedTasks', value)}
            theme={theme}
          />
          <PreferenceToggle
            label="Completion vibration"
            description="Give a short haptic response when completing a task."
            value={preferences.completionFeedback}
            onChange={(value) => preference('completionFeedback', value)}
            theme={theme}
          />
          <PreferenceToggle
            label="Confirm before delete"
            description="Ask before permanently removing a task."
            value={preferences.confirmBeforeDelete}
            onChange={(value) => preference('confirmBeforeDelete', value)}
            theme={theme}
          />
          {preferenceError ? <Text style={styles.error}>{preferenceError}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="cloud-outline" size={19} color={theme.colors.buttonDark} />
            <Text style={styles.sectionTitle}>Account & data</Text>
          </View>
          <Text style={styles.description}>Profiles are local planner profiles, not authenticated accounts. The connected backend currently stores one shared app state.</Text>
          <Pressable style={styles.dataAction} onPress={() => router.push('/(tabs)/users' as never)}>
            <Text style={styles.dataActionText}>Manage profiles</Text>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.buttonDark} />
          </Pressable>
          <View style={styles.syncRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.languageName}>Sync status</Text>
              <Text style={styles.description}>{syncStatus}</Text>
            </View>
            <Pressable
              style={[styles.actionButton, syncStatus === 'syncing' && styles.disabledButton]}
              disabled={syncStatus === 'syncing'}
              onPress={() => void syncNow().catch((error) => {
                console.error('Manual sync failed:', error);
                setBackupError('Sync failed. Check your connection and backend settings.');
              })}>
              <Text style={styles.actionButtonText}>{syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={() => void exportBackup()}>
              <Text style={styles.actionButtonText}>Export JSON backup</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => void importBackup()}>
              <Text style={styles.actionButtonText}>Restore backup</Text>
            </Pressable>
          </View>
          <Pressable style={[styles.dataAction, styles.dangerAction]} onPress={clearData}>
            <Text style={styles.dangerActionText}>Clear app data</Text>
            <Ionicons name="trash-outline" size={17} color={theme.colors.accent} />
          </Pressable>
          {backupMessage ? <Text style={styles.note}>{backupMessage}</Text> : null}
          {backupError ? <Text style={styles.error}>{backupError}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <Ionicons name="lock-closed-outline" size={19} color={theme.colors.buttonDark} />
            <Text style={styles.sectionTitle}>Security</Text>
          </View>
          <Text style={styles.description}>App Lock uses this device’s secure PIN storage or biometric authentication. It is not account authentication.</Text>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.languageName}>App Lock</Text>
              <Text style={styles.description}>{preferences.appLockEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
            <Switch
              value={preferences.appLockEnabled}
              disabled={Platform.OS === 'web' || !isReady}
              onValueChange={(enabled) => void configureAppLock(enabled)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.actionForeground}
            />
          </View>
          {Platform.OS !== 'web' ? (
            <View style={styles.choiceRow}>
              {([['pin', 'PIN'], ['biometric', 'Biometric']] as const).map(([method, label]) => (
                <Pressable
                  key={method}
                  disabled={preferences.appLockEnabled}
                  onPress={() => preference('appLockMethod', method)}
                  style={[styles.choiceChip, preferences.appLockMethod === method && styles.choiceChipSelected, preferences.appLockEnabled && styles.disabledButton]}>
                  <Text style={[styles.choiceChipText, preferences.appLockMethod === method && styles.choiceChipTextSelected]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          ) : <Text style={styles.note}>App Lock is available in the Android and iOS app.</Text>}
          {preferenceError ? <Text style={styles.error}>{preferenceError}</Text> : null}
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
              <Text style={styles.note}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
            </View>
          </View>
          <Pressable style={styles.dataAction} onPress={() => setLegalPage('privacy')}>
            <Text style={styles.dataActionText}>Privacy policy</Text>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.buttonDark} />
          </Pressable>
          <Pressable style={styles.dataAction} onPress={() => setLegalPage('terms')}>
            <Text style={styles.dataActionText}>Terms of service</Text>
            <Ionicons name="chevron-forward" size={17} color={theme.colors.buttonDark} />
          </Pressable>
          <Pressable style={styles.dataAction} onPress={() => setFeedbackVisible(true)}>
            <Text style={styles.dataActionText}>Send feedback / report a bug</Text>
            <Ionicons name="share-outline" size={17} color={theme.colors.buttonDark} />
          </Pressable>
        </View>
        {timePickerTarget ? (
          <View style={styles.timePickerWrap}>
            <DateTimePicker
              value={pickerValue(preferences[timePickerTarget])}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
            <Pressable onPress={() => setTimePickerTarget(null)} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Done</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <Modal visible={pinModalVisible} transparent animationType="fade" onRequestClose={() => setPinModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Set App Lock PIN</Text>
            <Text style={styles.description}>Use 4 to 6 digits. It is stored in the device secure store.</Text>
            <TextInput
              style={styles.pinInput}
              value={pinDraft}
              onChangeText={setPinDraft}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              placeholder="PIN"
              accessibilityLabel="App Lock PIN"
            />
            <View style={styles.actionRow}>
              <Pressable style={styles.actionButton} onPress={() => setPinModalVisible(false)}>
                <Text style={styles.actionButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => void saveAppLockPin()}>
                <Text style={styles.actionButtonText}>Save PIN</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={Boolean(legalPage)} transparent animationType="slide" onRequestClose={() => setLegalPage(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>{legalPage === 'privacy' ? 'Privacy policy' : 'Terms of service'}</Text>
            <ScrollView style={styles.legalContent}>
              <Text style={styles.description}>
                {legalPage === 'privacy'
                  ? 'Todo Planner stores tasks, notes, profiles, preferences, and job applications on this device. If a backend is configured, app data may synchronize to its shared state. Profile photos and App Lock PINs remain on this device. This app does not provide authenticated accounts. Exported backups can contain personal information; store and share them carefully.'
                  : 'Todo Planner is provided as a personal planning tool. You are responsible for the accuracy and backups of your data. Synchronization may replace the shared server state, and connected devices may see those changes. App Lock protects access on this device but is not a substitute for account security.'}
              </Text>
            </ScrollView>
            <Pressable style={styles.actionButton} onPress={() => setLegalPage(null)}>
              <Text style={styles.actionButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={() => setFeedbackVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Send feedback</Text>
            <Text style={styles.description}>Share a message or bug report using an app on your device.</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedbackDraft}
              onChangeText={setFeedbackDraft}
              placeholder="Describe your feedback or issue"
              multiline
              textAlignVertical="top"
            />
            <View style={styles.actionRow}>
              <Pressable style={styles.actionButton} onPress={() => setFeedbackVisible(false)}>
                <Text style={styles.actionButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.actionButton} onPress={() => void sendFeedback()}>
                <Text style={styles.actionButtonText}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  heading: {
    marginBottom: 2,
  },
  title: {
    color: lightTheme.colors.textPrimary,
    fontSize: 26,
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    marginTop: 4,
    color: lightTheme.colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Nunito_500Medium',
  },
  section: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    backgroundColor: lightTheme.colors.cardBackground,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: lightTheme.colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
  description: {
    marginTop: 4,
    color: lightTheme.colors.textSecondary,
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
    borderColor: lightTheme.colors.border,
    borderRadius: 13,
    backgroundColor: '#F7FBFC',
  },
  languageOptionSelected: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: '#EFF9FC',
  },
  languageCopy: {
    gap: 1,
  },
  languageName: {
    color: lightTheme.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  languageLabel: {
    color: lightTheme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_500Medium',
  },
  selectedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedText: {
    color: lightTheme.colors.success,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  note: {
    marginTop: 9,
    color: lightTheme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Nunito_500Medium',
  },
  error: {
    marginTop: 8,
    color: lightTheme.colors.accent,
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
  choiceRow: {
    marginTop: 10,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    backgroundColor: '#F7FBFC',
  },
  choiceChipSelected: {
    borderColor: lightTheme.colors.primary,
    backgroundColor: '#EFF9FC',
  },
  choiceChipText: {
    color: lightTheme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  choiceChipTextSelected: {
    color: lightTheme.colors.buttonDark,
  },
  recentColorsRow: {
    marginTop: 10,
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  recentColorChoice: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  colorResetButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    borderRadius: 18,
  },
  preferenceBlock: {
    marginTop: 12,
  },
  preferenceButton: {
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    backgroundColor: '#F7FBFC',
  },
  preferenceButtonValue: {
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  preferenceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceLabel: {
    color: lightTheme.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  preferenceDescription: {
    flex: 1,
    color: lightTheme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Nunito_500Medium',
  },
  dataAction: {
    minHeight: 42,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: lightTheme.colors.border,
  },
  dataActionText: {
    color: lightTheme.colors.buttonDark,
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  dangerAction: {
    marginTop: 14,
  },
  dangerActionText: {
    color: lightTheme.colors.accent,
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  syncRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#E8F4F7',
  },
  actionButtonText: {
    color: lightTheme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  timePickerWrap: {
    marginTop: 10,
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    maxHeight: '85%',
    padding: 20,
    gap: 12,
    borderRadius: 18,
    backgroundColor: lightTheme.colors.cardBackground,
  },
  pinInput: {
    height: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    borderRadius: 12,
    color: lightTheme.colors.textPrimary,
    fontSize: 18,
    letterSpacing: 8,
  },
  feedbackInput: {
    minHeight: 120,
    padding: 12,
    borderWidth: 1,
    borderColor: lightTheme.colors.border,
    borderRadius: 12,
    color: lightTheme.colors.textPrimary,
  },
  legalContent: {
    maxHeight: 240,
  },
  preferenceState: {
    marginTop: 4,
    color: lightTheme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
});

function PreferenceToggle({
  label,
  description,
  value,
  onChange,
  theme,
  disabled = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  theme: ReturnType<typeof useAppTheme>;
  disabled?: boolean;
}) {
  return (
    <View style={baseStyles.preferenceBlock}>
      <View style={baseStyles.preferenceTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[baseStyles.preferenceLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
          <Text style={[baseStyles.preferenceDescription, { color: theme.colors.textSecondary }]}>{description}</Text>
        </View>
        <Switch
          accessibilityLabel={label}
          value={value}
          disabled={disabled}
          onValueChange={onChange}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.actionForeground}
        />
      </View>
    </View>
  );
}

function PreferenceButton({
  label,
  value,
  onPress,
  theme,
  disabled = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[baseStyles.preferenceButton, disabled && baseStyles.disabledButton, { backgroundColor: theme.colors.cardBackground }]}>
      <Text style={[baseStyles.preferenceLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Text style={[baseStyles.preferenceButtonValue, { color: theme.colors.buttonDark }]}>{value}</Text>
    </Pressable>
  );
}
