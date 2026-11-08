import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'en' | 'id';

type AppSettingsValue = {
  language: AppLanguage;
  notificationsEnabled: boolean;
  isReady: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
};

const LANGUAGE_STORAGE_KEY = 'todo-app-language-v1';
const NOTIFICATIONS_STORAGE_KEY = 'todo-app-notifications-enabled-v1';
const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const [savedLanguage, savedNotificationsEnabled] = await AsyncStorage.multiGet([
          LANGUAGE_STORAGE_KEY,
          NOTIFICATIONS_STORAGE_KEY,
        ]).then((entries) => entries.map(([, value]) => value));
        if (savedLanguage === 'en' || savedLanguage === 'id') {
          setLanguageState(savedLanguage);
        }
        if (savedNotificationsEnabled === 'true' || savedNotificationsEnabled === 'false') {
          setNotificationsEnabledState(savedNotificationsEnabled === 'true');
        }
      } catch (error) {
        console.error('Failed to load app language setting:', error);
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

  const value = useMemo(
    () => ({ language, notificationsEnabled, isReady, setLanguage, setNotificationsEnabled }),
    [language, notificationsEnabled, isReady]
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
