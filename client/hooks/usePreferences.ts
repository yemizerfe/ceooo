// hooks/usePreferences.ts
import { useEffect, useState } from 'react';
import { preferencesService, UserPreferences } from '@/lib/preferences-service';

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(preferencesService.getPreferences());

  useEffect(() => {
    const unsubscribe = preferencesService.subscribe(setPreferences);
    return unsubscribe;
  }, []);

  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    preferencesService.updatePreferences(newPrefs);
  };

  const formatDate = (date: Date | string) => preferencesService.formatDate(date);
  const formatTime = (date: Date | string) => preferencesService.formatTime(date);
  const formatDateTime = (date: Date | string) => preferencesService.formatDateTime(date);

  return {
    preferences,
    updatePreferences,
    formatDate,
    formatTime,
    formatDateTime,
  };
}