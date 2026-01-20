'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, Palette, Store, Mail, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
    const router = useRouter()
    const { user, isAdmin, isLoading: authLoading } = useAuth()
    const { settings, refreshSettings } = useSiteSettings()

    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        site_name: '',
        site_description: '',
        logo_url: '',
        favicon_url: '',
        primary_color: '',
        secondary_color: '',
        accent_color: '',
        footer_text: '',
        contact_email: '',
        contact_phone: '',
        currency: '',
        currency_symbol: '',
        facebook: '',
        instagram: '',
        twitter: '',
    })

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/profile')
        }
    }, [user, isAdmin, authLoading, router])

    useEffect(() => {
        if (settings) {
            setFormData({
                site_name: settings.site_name || '',
                site_description: settings.site_description || '',
                logo_url: settings.logo_url || '',
                favicon_url: settings.favicon_url || '',
                primary_color: settings.primary_color || '#7c3aed',
                secondary_color: settings.secondary_color || '#a78bfa',
                accent_color: settings.accent_color || '#f59e0b',
                footer_text: settings.footer_text || '',
                contact_email: settings.contact_email || '',
                contact_phone: settings.contact_phone || '',
                currency: settings.currency || 'INR',
                currency_symbol: settings.currency_symbol || '₹',
                facebook: settings.social_links?.facebook || '',
                instagram: settings.social_links?.instagram || '',
                twitter: settings.social_links?.twitter || '',
            })
        }
    }, [settings])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const settingsToSave = [
                { id: 'site_name', value: formData.site_name },
                { id: 'site_description', value: formData.site_description },
                { id: 'logo_url', value: formData.logo_url },
                { id: 'favicon_url', value: formData.favicon_url },
                { id: 'primary_color', value: formData.primary_color },
                { id: 'secondary_color', value: formData.secondary_color },
                { id: 'accent_color', value: formData.accent_color },
                { id: 'footer_text', value: formData.footer_text },
                { id: 'contact_email', value: formData.contact_email },
                { id: 'contact_phone', value: formData.contact_phone },
                { id: 'currency', value: formData.currency },
                { id: 'currency_symbol', value: formData.currency_symbol },
                {
                    id: 'social_links', value: {
                        facebook: formData.facebook,
                        instagram: formData.instagram,
                        twitter: formData.twitter,
                    }
                },
            ]

            for (const setting of settingsToSave) {
                await setDoc(doc(db, 'site_settings', setting.id), {
                    value: setting.value,
                    updated_at: serverTimestamp(),
                })
            }

            await refreshSettings()
            toast.success('Settings saved successfully')
        } catch (error) {
            console.error('Error saving settings:', error)
            toast.error('Failed to save settings')
        }

        setIsSaving(false)
    }

    if (authLoading || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Site Settings</h1>
                <p className="text-muted-foreground">Customize your store appearance and configuration</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="max-w-3xl space-y-6">
                    {/* Store Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Store className="h-5 w-5" />
                                Store Information
                            </CardTitle>
                            <CardDescription>Basic information about your store</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="site_name">Store Name</Label>
                                <Input
                                    id="site_name"
                                    name="site_name"
                                    value={formData.site_name}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <Label htmlFor="site_description">Description</Label>
                                <Textarea
                                    id="site_description"
                                    name="site_description"
                                    value={formData.site_description}
                                    onChange={handleInputChange}
                                    rows={2}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="logo_url">Logo URL</Label>
                                    <Input
                                        id="logo_url"
                                        name="logo_url"
                                        value={formData.logo_url}
                                        onChange={handleInputChange}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="favicon_url">Favicon URL</Label>
                                    <Input
                                        id="favicon_url"
                                        name="favicon_url"
                                        value={formData.favicon_url}
                                        onChange={handleInputChange}
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="footer_text">Footer Text</Label>
                                <Input
                                    id="footer_text"
                                    name="footer_text"
                                    value={formData.footer_text}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Branding */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5" />
                                Branding Colors
                            </CardTitle>
                            <CardDescription>Customize your store colors</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="primary_color">Primary Color</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="primary_color"
                                            name="primary_color"
                                            type="color"
                                            value={formData.primary_color}
                                            onChange={handleInputChange}
                                            className="w-12 h-10 p-1"
                                        />
                                        <Input
                                            value={formData.primary_color}
                                            onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="secondary_color">Secondary Color</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="secondary_color"
                                            name="secondary_color"
                                            type="color"
                                            value={formData.secondary_color}
                                            onChange={handleInputChange}
                                            className="w-12 h-10 p-1"
                                        />
                                        <Input
                                            value={formData.secondary_color}
                                            onChange={(e) => setFormData(prev => ({ ...prev, secondary_color: e.target.value }))}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="accent_color">Accent Color</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="accent_color"
                                            name="accent_color"
                                            type="color"
                                            value={formData.accent_color}
                                            onChange={handleInputChange}
                                            className="w-12 h-10 p-1"
                                        />
                                        <Input
                                            value={formData.accent_color}
                                            onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: formData.primary_color }}>
                                <p className="text-white text-center">Preview: Primary Color</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="contact_email">Email</Label>
                                    <Input
                                        id="contact_email"
                                        name="contact_email"
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="contact_phone">Phone</Label>
                                    <Input
                                        id="contact_phone"
                                        name="contact_phone"
                                        value={formData.contact_phone}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="currency">Currency</Label>
                                    <Input
                                        id="currency"
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="currency_symbol">Currency Symbol</Label>
                                    <Input
                                        id="currency_symbol"
                                        name="currency_symbol"
                                        value={formData.currency_symbol}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Social Links */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                Social Links
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="facebook">Facebook URL</Label>
                                <Input
                                    id="facebook"
                                    name="facebook"
                                    value={formData.facebook}
                                    onChange={handleInputChange}
                                    placeholder="https://facebook.com/..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="instagram">Instagram URL</Label>
                                <Input
                                    id="instagram"
                                    name="instagram"
                                    value={formData.instagram}
                                    onChange={handleInputChange}
                                    placeholder="https://instagram.com/..."
                                />
                            </div>
                            <div>
                                <Label htmlFor="twitter">Twitter URL</Label>
                                <Input
                                    id="twitter"
                                    name="twitter"
                                    value={formData.twitter}
                                    onChange={handleInputChange}
                                    placeholder="https://twitter.com/..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={isSaving}
                            style={{ backgroundColor: settings.primary_color }}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Settings
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
