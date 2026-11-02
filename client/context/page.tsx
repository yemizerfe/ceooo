"use client";
// app/context/PreferencesContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Preferences {
  language: string;
  timezone: string;
  dateFormat: string;
  weekStart: string;
  emailDigest: boolean;
  weeklyReport: boolean;
  marketingEmails: boolean;
}

interface PreferencesContextType {
  preferences: Preferences;
  updatePreferences: (newPrefs: Partial<Preferences>) => void;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  getCurrentLocale: () => string;
}

const defaultPreferences: Preferences = {
  language: 'en',
  timezone: 'America/Los_Angeles',
  dateFormat: 'MM/DD/YYYY',
  weekStart: 'Monday',
  emailDigest: true,
  weeklyReport: true,
  marketingEmails: false,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPrefs = localStorage.getItem('user_preferences');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
  }, []);

  // Save to localStorage and apply changes
  useEffect(() => {
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
    applyPreferencesToDocument(preferences);
  }, [preferences]);

  const applyPreferencesToDocument = (prefs: Preferences) => {
    // Apply language
    document.documentElement.lang = prefs.language;
    localStorage.setItem('language', prefs.language);
    
    // Set locale for date formatting
    const locales: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
    };
    localStorage.setItem('locale', locales[prefs.language] || 'en-US');
    
    // Apply timezone
    localStorage.setItem('timezone', prefs.timezone);
    localStorage.setItem('dateFormat', prefs.dateFormat);
    localStorage.setItem('weekStart', prefs.weekStart);
  };

  const updatePreferences = (newPrefs: Partial<Preferences>) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
  };

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    const format = preferences.dateFormat;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return d.toLocaleDateString();
    }
  };

  const formatTime = (date: Date | string): string => {
    const d = new Date(date);
    return d.toLocaleTimeString(preferences.language, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: preferences.timezone
    });
  };

  const getCurrentLocale = (): string => {
    const locales: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
    };
    return locales[preferences.language] || 'en-US';
  };

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, formatDate, formatTime, getCurrentLocale }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}