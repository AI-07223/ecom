'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, User, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'

export default function SettingsPage() {
    const router = useRouter()
    const { user, profile, isLoading: authLoading, refreshProfile } = useAuth()
    const { settings } = useSiteSettings()

    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'India',
    })

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/profile/settings')
        }
    }, [user, authLoading, router])

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                phone: profile.phone || '',
                street: profile.address?.street || '',
                city: profile.address?.city || '',
                state: profile.address?.state || '',
                postal_code: profile.address?.postal_code || '',
                country: profile.address?.country || 'India',
            })
        }
    }, [profile])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!user) return

        setIsSaving(true)

        try {
            const profileRef = doc(db, 'profiles', user.uid)
            await updateDoc(profileRef, {
                full_name: formData.full_name,
                phone: formData.phone,
                address: {
                    street: formData.street,
                    city: formData.city,
                    state: formData.state,
                    postal_code: formData.postal_code,
                    country: formData.country,
                },
                updated_at: serverTimestamp(),
            })

            await refreshProfile()
            toast.success('Profile updated successfully')
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error('Failed to update profile')
        }

        setIsSaving(false)
    }

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
                <Link href="/profile" className="hover:text-foreground">Profile</Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground">Settings</span>
            </nav>

            <h1 className="text-2xl font-bold mb-8">Account Settings</h1>

            <form onSubmit={handleSubmit}>
                <div className="max-w-2xl space-y-6">
                    {/* Personal Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Update your personal details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label htmlFor="full_name">Full Name</Label>
                                    <Input
                                        id="full_name"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        value={user.email || ''}
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+91 1234567890"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Address */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Shipping Address</CardTitle>
                            <CardDescription>
                                Your default shipping address
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="street">Street Address</Label>
                                <Input
                                    id="street"
                                    name="street"
                                    value={formData.street}
                                    onChange={handleInputChange}
                                    placeholder="Enter your street address"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="city">City</Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="state">State</Label>
                                    <Input
                                        id="state"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        placeholder="State"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="postal_code">Postal Code</Label>
                                    <Input
                                        id="postal_code"
                                        name="postal_code"
                                        value={formData.postal_code}
                                        onChange={handleInputChange}
                                        placeholder="Postal Code"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="country">Country</Label>
                                    <Input
                                        id="country"
                                        name="country"
                                        value={formData.country}
                                        disabled
                                        className="bg-muted"
                                    />
                                </div>
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
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
