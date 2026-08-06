import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { AppSettings } from '@/types/training';
import { getStorageData, saveStorageData } from '@/utils/storage';

type ColorMode = 'light' | 'dark' | 'auto';

interface SettingsContextValue {
  settings: AppSettings;
  colorMode: ColorMode;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  setColorMode: (mode: ColorMode) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  athleteName: '',
  defaultTrainingType: 'Resistencia',
  defaultDistancePerLap: 400,
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  colorMode: 'auto',
  updateSettings: async () => {},
  setColorMode: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [colorMode, setColorModeState] = useState<ColorMode>('auto');

  useEffect(() => {
    getStorageData().then(data => {
      setSettings(data.appSettings);
      const mode = data.colorMode ?? 'auto';
      setColorModeState(mode);
      if (mode !== 'auto') Appearance.setColorScheme(mode);
    });
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      const next = { ...settings, ...updates };
      setSettings(next);
      await saveStorageData({ appSettings: next, colorMode });
    },
    [settings, colorMode],
  );

  const setColorMode = useCallback(
    async (mode: ColorMode) => {
      setColorModeState(mode);
      Appearance.setColorScheme(mode === 'auto' ? null : mode);
      await saveStorageData({ appSettings: settings, colorMode: mode });
    },
    [settings],
  );

  return (
    <SettingsContext.Provider value={{ settings, colorMode, updateSettings, setColorMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
