import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "./api";

/**
 * Settings change bus.
 *
 * Admin saves settings through the API and dispatches a `settings-changed`
 * window event; every public component (header, footer, auth page, policy
 * pages) subscribes and re-reads the cached map so changes reflect instantly
 * without a full page reload.
 */
const CACHE_KEY = "siteSettings";
const CACHE_META_KEY = "siteSettingsMeta";
export const SETTINGS_CHANGED_EVENT = "settings-changed";

export function getCachedPublicSettings() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(CACHE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function setCachedPublicSettings(settings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CACHE_KEY, JSON.stringify(settings ?? {}));
}

export function broadcastSettingsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

export function clearSettingsCache() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CACHE_KEY);
  window.localStorage.removeItem(CACHE_META_KEY);
  broadcastSettingsChanged();
}

/**
 * Fetch the public settings map from the Laravel API and cache it locally.
 */
export async function fetchPublicSettings(options = {}) {
  const skipCache = options.skipCache ?? false;

  if (!skipCache) {
    const cached = getCachedPublicSettings();
    if (Object.keys(cached).length > 0) {
      return cached;
    }
  }

  const response = await apiFetch("/settings");
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.message ?? "Failed to load site settings.");
  }

  const settings = result?.settings ?? {};
  setCachedPublicSettings(settings);

  if (result?.meta?.lastUpdatedAt) {
    window.localStorage.setItem(CACHE_META_KEY, result.meta.lastUpdatedAt);
  }

  return settings;
}

/**
 * React hook — returns the public settings map plus loading / error state and
 * re-syncs whenever settings change (admin saves, API fetch, etc.).
 */
export function useSiteSettings() {
  const [settings, setSettings] = useState(() => getCachedPublicSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function sync() {
      try {
        const fresh = await fetchPublicSettings({ skipCache: true });
        if (active) {
          setSettings(fresh);
          setLoading(false);
          setError("");
        }
      } catch {
        if (active) {
          const cached = getCachedPublicSettings();
          setSettings(cached);
          setLoading(false);
          setError("Could not reach the settings API.");
        }
      }
    }

    function onChanged() {
      setSettings(getCachedPublicSettings());
      void sync();
    }

    window.addEventListener(SETTINGS_CHANGED_EVENT, onChanged);
    void sync();

    return () => {
      active = false;
      window.removeEventListener(SETTINGS_CHANGED_EVENT, onChanged);
    };
  }, []);

  return useMemo(
    () => ({ settings, loading, error, refresh: fetchPublicSettings }),
    [settings, loading, error],
  );
}

/**
 * Small helpers for reading common values out of the settings map.
 */
export function settingsString(settings, key, fallback = "") {
  const value = settings?.[key];
  return value === undefined || value === null ? fallback : String(value);
}

export function settingsBool(settings, key, fallback = false) {
  const value = settings?.[key];
  return value === undefined || value === null ? fallback : Boolean(value);
}