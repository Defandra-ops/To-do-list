import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type AppLanguage = 'en' | 'id';
export type ThemeMode = 'light' | 'dark' | 'system';
export const ACCENT_COLOR_PALETTE = [
  { id: 'blue', light: '#72C9E4', dark: '#387789' },
  { id: 'purple', light: '#A78BFA', dark: '#7B61B8' },
  { id: 'green', light: '#65B98A', dark: '#3F8C68' },
  { id: 'orange', light: '#F2A65A', dark: '#B66B2B' },
  { id: 'teal', light: '#2DD4BF', dark: '#0F766E' },
  { id: 'cyan', light: '#22D3EE', dark: '#0E7490' },
  { id: 'indigo', light: '#818CF8', dark: '#4338CA' },
  { id: 'violet', light: '#C084FC', dark: '#7E22CE' },
  { id: 'pink', light: '#F472B6', dark: '#BE185D' },
  { id: 'rose', light: '#FB7185', dark: '#BE123C' },
  { id: 'red', light: '#EF6A6A', dark: '#B91C1C' },
  { id: 'amber', light: '#FBBF24', dark: '#B45309' },
  { id: 'lime', light: '#A3E635', dark: '#4D7C0F' },
  { id: 'emerald', light: '#34D399', dark: '#047857' },
  { id: 'sky', light: '#38BDF8', dark: '#0369A1' },
  { id: 'slate', light: '#94A3B8', dark: '#475569' },
] as const;
export type AccentColor = (typeof ACCENT_COLOR_PALETTE)[number]['id'];
export type DefaultView = 'home' | 'planner' | 'calendar' | 'overview';
export type TaskPosition = 'top' | 'bottom';
export type AppPreferenceKey =
  | 'accentColor'
  | 'customAccentColor'
  | 'customBackgroundColor'
  | 'recentThemeColors'
  | 'defaultView'
  | 'timeFormat'
  | 'weekStartsOn'
  | 'defaultDueTime'
  | 'dailyDigestEnabled'
  | 'dailyDigestTime'
  | 'soundEnabled'
  | 'vibrationEnabled'
  | 'taskPosition'
  | 'hideCompletedTasks'
  | 'completionFeedback'
  | 'confirmBeforeDelete'
  | 'appLockEnabled'
  | 'appLockMethod';

export type AppPreferences = {
  accentColor: AccentColor;
  customAccentColor: string | null;
  customBackgroundColor: string | null;
  recentThemeColors: string[];
  defaultView: DefaultView;
  timeFormat: '12h' | '24h';
  weekStartsOn: 'monday' | 'sunday';
  defaultDueTime: string;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  taskPosition: TaskPosition;
  hideCompletedTasks: boolean;
  completionFeedback: boolean;
  confirmBeforeDelete: boolean;
  appLockEnabled: boolean;
  appLockMethod: 'pin' | 'biometric';
};

const defaultPreferences: AppPreferences = {
  accentColor: 'blue',
  customAccentColor: null,
  customBackgroundColor: null,
  recentThemeColors: [],
  defaultView: 'home',
  timeFormat: '12h',
  weekStartsOn: 'sunday',
  defaultDueTime: '09:00',
  dailyDigestEnabled: true,
  dailyDigestTime: '09:00',
  soundEnabled: true,
  vibrationEnabled: true,
  taskPosition: 'top',
  hideCompletedTasks: false,
  completionFeedback: false,
  confirmBeforeDelete: true,
  appLockEnabled: false,
  appLockMethod: 'pin',
};

type AppSettingsValue = {
  language: AppLanguage;
  notificationsEnabled: boolean;
  themeMode: ThemeMode;
  preferences: AppPreferences;
  isReady: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
  setPreference: <K extends AppPreferenceKey>(key: K, value: AppPreferences[K]) => Promise<void>;
  setAppLockPin: (pin: string) => Promise<void>;
  getAppLockPin: () => Promise<string | null>;
  clearAppLockPin: () => Promise<void>;
};

const LANGUAGE_STORAGE_KEY = 'todo-app-language-v1';
const NOTIFICATIONS_STORAGE_KEY = 'todo-app-notifications-enabled-v1';
const THEME_MODE_STORAGE_KEY = 'todo-app-theme-mode-v1';
const PREFERENCES_STORAGE_KEY = 'todo-app-preferences-v1';
const APP_LOCK_PIN_STORAGE_KEY = 'todo-app-lock-pin-v1';
const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const preferencesRef = useRef(defaultPreferences);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const [savedLanguage, savedNotificationsEnabled, savedThemeMode, savedPreferences] = await AsyncStorage.multiGet([
          LANGUAGE_STORAGE_KEY,
          NOTIFICATIONS_STORAGE_KEY,
          THEME_MODE_STORAGE_KEY,
          PREFERENCES_STORAGE_KEY,
        ]).then((entries) => entries.map(([, value]) => value));
        if (savedLanguage === 'en' || savedLanguage === 'id') {
          setLanguageState(savedLanguage);
        }
        if (savedNotificationsEnabled === 'true' || savedNotificationsEnabled === 'false') {
          setNotificationsEnabledState(savedNotificationsEnabled === 'true');
        }
        if (savedThemeMode === 'light' || savedThemeMode === 'dark' || savedThemeMode === 'system') {
          setThemeModeState(savedThemeMode);
        }
        if (savedPreferences) {
          const parsed = JSON.parse(savedPreferences) as Partial<AppPreferences>;
          const nextPreferences = { ...defaultPreferences, ...parsed };
          if (!ACCENT_COLOR_PALETTE.some(({ id }) => id === nextPreferences.accentColor)) {
            nextPreferences.accentColor = defaultPreferences.accentColor;
          }
          if (nextPreferences.customAccentColor !== null && !/^#[0-9A-Fa-f]{6}$/.test(nextPreferences.customAccentColor ?? '')) {
            nextPreferences.customAccentColor = null;
          }
          if (nextPreferences.customBackgroundColor !== null && !/^#[0-9A-Fa-f]{6}$/.test(nextPreferences.customBackgroundColor ?? '')) {
            nextPreferences.customBackgroundColor = null;
          }
          nextPreferences.recentThemeColors = Array.isArray(nextPreferences.recentThemeColors)
            ? nextPreferences.recentThemeColors
                .filter((color): color is string => typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color))
                .slice(0, 8)
            : [];
          if (!['home', 'planner', 'calendar', 'overview'].includes(nextPreferences.defaultView)) {
            nextPreferences.defaultView = defaultPreferences.defaultView;
          }
          if (nextPreferences.timeFormat !== '12h' && nextPreferences.timeFormat !== '24h') {
            nextPreferences.timeFormat = defaultPreferences.timeFormat;
          }
          if (nextPreferences.weekStartsOn !== 'monday' && nextPreferences.weekStartsOn !== 'sunday') {
            nextPreferences.weekStartsOn = defaultPreferences.weekStartsOn;
          }
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(nextPreferences.defaultDueTime)) {
            nextPreferences.defaultDueTime = defaultPreferences.defaultDueTime;
          }
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(nextPreferences.dailyDigestTime)) {
            nextPreferences.dailyDigestTime = defaultPreferences.dailyDigestTime;
          }
          if (nextPreferences.taskPosition !== 'top' && nextPreferences.taskPosition !== 'bottom') {
            nextPreferences.taskPosition = defaultPreferences.taskPosition;
          }
          if (nextPreferences.appLockMethod !== 'pin' && nextPreferences.appLockMethod !== 'biometric') {
            nextPreferences.appLockMethod = defaultPreferences.appLockMethod;
          }
          preferencesRef.current = nextPreferences;
          setPreferences(nextPreferences);
        }
      } catch (error) {
        console.error('Failed to load app settings:', error);
      } finally {
        setIsReady(true);
      }
    };

    void loadLanguage();
  }, []);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  };

  const setNotificationsEnabled = async (enabled: boolean) => {
    await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, String(enabled));
    setNotificationsEnabledState(enabled);
  };

  const setThemeMode = async (nextThemeMode: ThemeMode) => {
    await AsyncStorage.setItem(THEME_MODE_STORAGE_KEY, nextThemeMode);
    setThemeModeState(nextThemeMode);
  };

  const setPreference: AppSettingsValue['setPreference'] = async (key, value) => {
    const nextPreferences = { ...preferencesRef.current, [key]: value };
    await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
    preferencesRef.current = nextPreferences;
    setPreferences(nextPreferences);
  };

  const setAppLockPin = (pin: string) => SecureStore.setItemAsync(APP_LOCK_PIN_STORAGE_KEY, pin);
  const getAppLockPin = () => SecureStore.getItemAsync(APP_LOCK_PIN_STORAGE_KEY);
  const clearAppLockPin = () => SecureStore.deleteItemAsync(APP_LOCK_PIN_STORAGE_KEY);

  const value = useMemo(
    () => ({
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
      getAppLockPin,
      clearAppLockPin,
    }),
    [language, notificationsEnabled, themeMode, preferences, isReady]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider.');
  }
  return context;
}
