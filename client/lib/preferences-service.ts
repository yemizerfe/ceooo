// lib/preferences-service.ts
export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  weekStart: string;
  emailDigest: boolean;
  weeklyReport: boolean;
  marketingEmails: boolean;
}

class PreferencesService {
  private static instance: PreferencesService;
  private listeners: ((prefs: UserPreferences) => void)[] = [];
  private currentPreferences: UserPreferences = {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/DD/YYYY',
    weekStart: 'Monday',
    emailDigest: true,
    weeklyReport: true,
    marketingEmails: false,
  };

  private constructor() {
    this.loadPreferences();
  }

  static getInstance(): PreferencesService {
    if (!PreferencesService.instance) {
      PreferencesService.instance = new PreferencesService();
    }
    return PreferencesService.instance;
  }

  private loadPreferences() {
    const saved = localStorage.getItem('user_preferences');
    if (saved) {
      try {
        this.currentPreferences = { ...this.currentPreferences, ...JSON.parse(saved) };
        this.applyPreferences();
      } catch (e) {}
    }
  }

  getPreferences(): UserPreferences {
    return this.currentPreferences;
  }

  async updatePreferences(newPrefs: Partial<UserPreferences>) {
    this.currentPreferences = { ...this.currentPreferences, ...newPrefs };
    localStorage.setItem('user_preferences', JSON.stringify(this.currentPreferences));
    this.applyPreferences();
    this.notifyListeners();
    
    // Save to backend
    const token = localStorage.getItem('token');
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(this.currentPreferences),
    });
  }

  private applyPreferences() {
    // Apply language to HTML
    document.documentElement.lang = this.currentPreferences.language;
    document.documentElement.setAttribute('data-language', this.currentPreferences.language);
    
    // Apply timezone to a data attribute
    document.documentElement.setAttribute('data-timezone', this.currentPreferences.timezone);
    
    // Apply date format
    document.documentElement.setAttribute('data-date-format', this.currentPreferences.dateFormat);
    
    // Apply week start
    document.documentElement.setAttribute('data-week-start', this.currentPreferences.weekStart);
  }

  // Format date according to preferences
  formatDate(date: Date | string): string {
    const d = new Date(date);
    const format = this.currentPreferences.dateFormat;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'MM/DD/YYYY': return `${month}/${day}/${year}`;
      case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
      default: return d.toLocaleDateString(this.currentPreferences.language);
    }
  }

  // Format time according to preferences
  formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString(this.currentPreferences.language, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: this.currentPreferences.timezone
    });
  }

  // Format datetime according to preferences
  formatDateTime(date: Date | string): string {
    return `${this.formatDate(date)} at ${this.formatTime(date)}`;
  }

  subscribe(listener: (prefs: UserPreferences) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentPreferences));
  }
}

export const preferencesService = PreferencesService.getInstance();