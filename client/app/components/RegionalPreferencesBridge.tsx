"use client";

import { useEffect } from "react";

function applyRegionalPreferences() {
  const language = localStorage.getItem("language") || "en";
  const timezone = localStorage.getItem("timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const dateFormat = localStorage.getItem("dateFormat") || "MM/DD/YYYY";
  const timeFormat = localStorage.getItem("timeFormat") || "12h";

  document.documentElement.lang = language;
  document.documentElement.setAttribute("data-language", language);
  document.documentElement.setAttribute("data-timezone", timezone);
  document.documentElement.setAttribute("data-date-format", dateFormat);
  document.documentElement.setAttribute("data-time-format", timeFormat);

  const toLocaleDateString = Date.prototype.toLocaleDateString;
  const toLocaleTimeString = Date.prototype.toLocaleTimeString;

  Date.prototype.toLocaleDateString = function(locale?: string | string[] | undefined, options?: Intl.DateTimeFormatOptions) {
    const activeLanguage = document.documentElement.getAttribute("data-language") || language;
    const activeTimezone = document.documentElement.getAttribute("data-timezone") || timezone;
    const finalOptions = options ?? {};

    return toLocaleDateString.call(this, locale ?? activeLanguage, {
      ...finalOptions,
      timeZone: finalOptions.timeZone ?? activeTimezone,
    });
  };

  Date.prototype.toLocaleTimeString = function(locale?: string | string[] | undefined, options?: Intl.DateTimeFormatOptions) {
    const activeLanguage = document.documentElement.getAttribute("data-language") || language;
    const activeTimezone = document.documentElement.getAttribute("data-timezone") || timezone;
    const activeFormat = document.documentElement.getAttribute("data-time-format") || timeFormat;
    const finalOptions = options ?? {};

    const hour12 = activeFormat === "12h" ? true : false;

    return toLocaleTimeString.call(this, locale ?? activeLanguage, {
      ...finalOptions,
      hour12,
      timeZone: finalOptions.timeZone ?? activeTimezone,
    });
  };
}

export default function RegionalPreferencesBridge() {
  useEffect(() => {
    applyRegionalPreferences();

    const syncRegionalPreferences = () => applyRegionalPreferences();

    window.addEventListener("languageChanged", syncRegionalPreferences);
    window.addEventListener("timezoneChanged", syncRegionalPreferences);

    return () => {
      window.removeEventListener("languageChanged", syncRegionalPreferences);
      window.removeEventListener("timezoneChanged", syncRegionalPreferences);
    };
  }, []);

  return null;
}
