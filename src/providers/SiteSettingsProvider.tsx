"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { SiteSettings } from "@/types/database.types";

interface SiteSettingsContextType {
  settings: SiteSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
}

export const defaultSettings: SiteSettings = {
  site_name: "Royal Store",
  site_description: "Your one-stop shop for premium products",
  logo_url: "/logo.svg",
  favicon_url: "/favicon.ico",
  primary_color: "#7c3aed",
  secondary_color: "#a78bfa",
  accent_color: "#f59e0b",
  footer_text: "© 2024 Royal Store. All rights reserved.",
  social_links: {},
  contact_email: "support@royalstore.com",
  contact_phone: "+91 1234567890",
  currency: "INR",
  currency_symbol: "₹",
  // Business details for invoices
  business_name: "Royal Store Pvt. Ltd.",
  business_address: "123 Business Street, Commercial Area",
  business_city: "Mumbai",
  business_state: "Maharashtra",
  business_postal_code: "400001",
  business_country: "India",
  business_gst_number: "27AABCU9603R1ZX",
  business_pan_number: "AABCU9603R",
  business_phone: "+91 1234567890",
  business_email: "billing@royalstore.com",
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(
  undefined,
);

const SETTINGS_CACHE_KEY = "site_settings_cache";

// Get cached settings from localStorage (runs synchronously before render)
function getCachedSettings(): SiteSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      return { ...defaultSettings, ...JSON.parse(cached) };
    }
  } catch (error) {
    console.error("Error reading cached settings:", error);
  }
  return defaultSettings;
}

// Save settings to localStorage
function cacheSettings(settings: SiteSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error caching settings:", error);
  }
}

export function SiteSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize with cached settings for instant hydration
  const [settings, setSettings] = useState<SiteSettings>(() =>
    getCachedSettings(),
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const settingsRef = collection(db, "site_settings");
      const settingsSnap = await getDocs(settingsRef);

      if (!settingsSnap.empty) {
        const settingsMap: Record<string, unknown> = {};
        settingsSnap.forEach((doc) => {
          const data = doc.data();
          settingsMap[doc.id] = data.value;
        });
        const newSettings = {
          ...defaultSettings,
          ...settingsMap,
        } as SiteSettings;
        setSettings(newSettings);
        // Cache the fresh settings for next page load
        cacheSettings(newSettings);
      }
    } catch (error) {
      console.error("Error fetching site settings:", error);
    }
    setIsLoading(false);
  };

  // Apply cached CSS variables immediately on mount (before Firebase fetch)
  useEffect(() => {
    const cachedSettings = getCachedSettings();
    document.documentElement.style.setProperty(
      "--primary-color",
      cachedSettings.primary_color,
    );
    document.documentElement.style.setProperty(
      "--secondary-color",
      cachedSettings.secondary_color,
    );
    document.documentElement.style.setProperty(
      "--accent-color",
      cachedSettings.accent_color,
    );

    // Then fetch fresh settings from Firebase
    fetchSettings();
  }, []);

  // Update CSS variables when settings change
  useEffect(() => {
    if (!isLoading) {
      document.documentElement.style.setProperty(
        "--primary-color",
        settings.primary_color,
      );
      document.documentElement.style.setProperty(
        "--secondary-color",
        settings.secondary_color,
      );
      document.documentElement.style.setProperty(
        "--accent-color",
        settings.accent_color,
      );
    }
  }, [settings, isLoading]);

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        isLoading,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useSiteSettings must be used within a SiteSettingsProvider",
    );
  }
  return context;
}
