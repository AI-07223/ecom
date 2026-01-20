'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { SiteSettings } from '@/types/database.types'

interface SiteSettingsContextType {
    settings: SiteSettings
    isLoading: boolean
    refreshSettings: () => Promise<void>
}

const defaultSettings: SiteSettings = {
    site_name: 'Royal Store',
    site_description: 'Your one-stop shop for premium products',
    logo_url: '/logo.svg',
    favicon_url: '/favicon.ico',
    primary_color: '#7c3aed',
    secondary_color: '#a78bfa',
    accent_color: '#f59e0b',
    footer_text: '© 2024 Royal Store. All rights reserved.',
    social_links: {},
    contact_email: 'support@royalstore.com',
    contact_phone: '+91 1234567890',
    currency: 'INR',
    currency_symbol: '₹',
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined)

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
    const [isLoading, setIsLoading] = useState(true)

    const fetchSettings = async () => {
        try {
            const settingsRef = collection(db, 'site_settings')
            const settingsSnap = await getDocs(settingsRef)

            if (!settingsSnap.empty) {
                const settingsMap: Record<string, unknown> = {}
                settingsSnap.forEach((doc) => {
                    const data = doc.data()
                    settingsMap[doc.id] = data.value
                })
                setSettings({ ...defaultSettings, ...settingsMap } as SiteSettings)
            }
        } catch (error) {
            console.error('Error fetching site settings:', error)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    // Apply CSS variables for theming
    useEffect(() => {
        if (!isLoading) {
            document.documentElement.style.setProperty('--primary-color', settings.primary_color)
            document.documentElement.style.setProperty('--secondary-color', settings.secondary_color)
            document.documentElement.style.setProperty('--accent-color', settings.accent_color)
        }
    }, [settings, isLoading])

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
    )
}

export function useSiteSettings() {
    const context = useContext(SiteSettingsContext)
    if (context === undefined) {
        throw new Error('useSiteSettings must be used within a SiteSettingsProvider')
    }
    return context
}
