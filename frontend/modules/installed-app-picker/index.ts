import { requireOptionalNativeModule } from 'expo-modules-core';

type InstalledApp = {
  name: string;
  packageName: string;
};

type InstalledAppPickerModule = {
  getInstalledAppsAsync: () => Promise<InstalledApp[]>;
};

const InstalledAppPicker = requireOptionalNativeModule<InstalledAppPickerModule>('InstalledAppPicker');

export type { InstalledApp };

export async function getInstalledApps() {
  if (!InstalledAppPicker) return [];
  return InstalledAppPicker.getInstalledAppsAsync();
}
