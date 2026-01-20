'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { toast } from 'sonner'
import { Shield, Database, Check, X } from 'lucide-react'

const categories = [
    { id: 'electronics', name: 'Electronics', slug: 'electronics', description: 'Latest gadgets and electronics', is_active: true, sort_order: 1 },
    { id: 'clothing', name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel', is_active: true, sort_order: 2 },
    { id: 'home-garden', name: 'Home & Garden', slug: 'home-garden', description: 'Everything for your home', is_active: true, sort_order: 3 },
    { id: 'sports', name: 'Sports', slug: 'sports', description: 'Sports equipment and accessories', is_active: true, sort_order: 4 },
]

const products = [
    {
        id: 'premium-wireless-headphones',
        name: 'Premium Wireless Headphones',
        slug: 'premium-wireless-headphones',
        description: 'Experience crystal-clear audio with our premium wireless headphones.',
        short_description: 'Crystal-clear audio with ANC',
        price: 2999,
        compare_at_price: 3999,
        quantity: 50,
        category_id: 'electronics',
        is_active: true,
        is_featured: true,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
        thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
        tags: ['audio', 'wireless'],
        track_inventory: true,
        allow_backorder: false,
    },
    {
        id: 'smart-watch-pro',
        name: 'Smart Watch Pro',
        slug: 'smart-watch-pro',
        description: 'Track your fitness and stay connected with our Smart Watch Pro.',
        short_description: 'Advanced fitness tracking',
        price: 4999,
        compare_at_price: 5999,
        quantity: 30,
        category_id: 'electronics',
        is_active: true,
        is_featured: true,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'],
        thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300',
        tags: ['smartwatch', 'fitness'],
        track_inventory: true,
        allow_backorder: false,
    },
    {
        id: 'designer-backpack',
        name: 'Designer Backpack',
        slug: 'designer-backpack',
        description: 'Stylish and functional backpack with laptop compartment.',
        short_description: 'Style meets functionality',
        price: 1499,
        compare_at_price: 1999,
        quantity: 45,
        category_id: 'clothing',
        is_active: true,
        is_featured: true,
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500'],
        thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300',
        tags: ['backpack', 'travel'],
        track_inventory: true,
        allow_backorder: false,
    },
]

const siteSettings = [
    { id: 'site_name', value: 'Royal Store' },
    { id: 'site_description', value: 'Your one-stop shop for premium products' },
    { id: 'primary_color', value: '#7c3aed' },
    { id: 'secondary_color', value: '#a78bfa' },
    { id: 'accent_color', value: '#f59e0b' },
    { id: 'currency', value: 'INR' },
    { id: 'currency_symbol', value: '₹' },
]

export default function SeedPage() {
    const { user, profile, refreshProfile } = useAuth()
    const { settings } = useSiteSettings()
    const [isSeeding, setIsSeeding] = useState(false)
    const [isMakingAdmin, setIsMakingAdmin] = useState(false)
    const [progress, setProgress] = useState('')

    const [checks, setChecks] = useState({
        authenticated: false,
        hasProfile: false,
        isAdmin: false,
    })

    useEffect(() => {
        const checkStatus = async () => {
            if (user) {
                setChecks(prev => ({ ...prev, authenticated: true }))

                // Check if profile exists
                const profileDoc = await getDoc(doc(db, 'profiles', user.uid))
                if (profileDoc.exists()) {
                    setChecks(prev => ({ ...prev, hasProfile: true }))
                    const data = profileDoc.data()
                    setChecks(prev => ({ ...prev, isAdmin: data.is_admin === true }))
                }
            }
        }
        checkStatus()
    }, [user, profile])

    const makeAdmin = async () => {
        if (!user) {
            toast.error('Please sign in first')
            return
        }

        setIsMakingAdmin(true)

        try {
            const profileRef = doc(db, 'profiles', user.uid)

            // Check if profile exists
            const profileDoc = await getDoc(profileRef)

            if (profileDoc.exists()) {
                // Update existing profile
                await updateDoc(profileRef, {
                    is_admin: true,
                    updated_at: serverTimestamp(),
                })
            } else {
                // Create new profile with admin
                await setDoc(profileRef, {
                    id: user.uid,
                    email: user.email,
                    full_name: user.displayName || null,
                    avatar_url: user.photoURL || null,
                    phone: null,
                    address: null,
                    is_admin: true,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                })
            }

            toast.success('You are now an admin! Refreshing...')

            // Refresh profile
            await refreshProfile()

            // Update local state
            setChecks(prev => ({ ...prev, isAdmin: true, hasProfile: true }))

        } catch (error) {
            console.error('Error making admin:', error)
            toast.error('Failed to make admin. Check console for details.')
        }

        setIsMakingAdmin(false)
    }

    const seedDatabase = async () => {
        if (!checks.isAdmin) {
            toast.error('You need to be an admin to seed the database')
            return
        }

        setIsSeeding(true)
        setProgress('Starting...')

        try {
            // Seed categories
            setProgress('Creating categories...')
            for (const category of categories) {
                await setDoc(doc(db, 'categories', category.id), {
                    ...category,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                })
            }

            // Seed products
            setProgress('Creating products...')
            for (const product of products) {
                await setDoc(doc(db, 'products', product.id), {
                    ...product,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                })
            }

            // Seed site settings
            setProgress('Creating site settings...')
            for (const setting of siteSettings) {
                await setDoc(doc(db, 'site_settings', setting.id), {
                    value: setting.value,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp(),
                })
            }

            setProgress('Complete!')
            toast.success('Database seeded successfully!')
        } catch (error) {
            console.error('Error seeding database:', error)
            toast.error('Failed to seed database. Check console.')
            setProgress('Error: ' + (error as Error).message)
        }

        setIsSeeding(false)
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
                <p className="text-muted-foreground">You need to be signed in to access this page.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Setup & Seed Database</h1>
                    <p className="text-muted-foreground">Configure your admin access and seed initial data</p>
                </div>

                {/* Status Checks */}
                <Card>
                    <CardHeader>
                        <CardTitle>Status Check</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span>Authenticated</span>
                            {checks.authenticated ? (
                                <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Yes</Badge>
                            ) : (
                                <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> No</Badge>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Profile Exists</span>
                            {checks.hasProfile ? (
                                <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Yes</Badge>
                            ) : (
                                <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> No</Badge>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Admin Status</span>
                            {checks.isAdmin ? (
                                <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" /> Admin</Badge>
                            ) : (
                                <Badge variant="outline">Not Admin</Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground pt-2">
                            Logged in as: {user.email}
                        </p>
                    </CardContent>
                </Card>

                {/* Step 1: Make Admin */}
                <Card className={checks.isAdmin ? 'opacity-50' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Step 1: Make Yourself Admin
                        </CardTitle>
                        <CardDescription>
                            {checks.isAdmin
                                ? 'You are already an admin!'
                                : 'Click the button below to grant yourself admin access'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={makeAdmin}
                            disabled={isMakingAdmin || checks.isAdmin}
                            className="w-full"
                            style={{ backgroundColor: checks.isAdmin ? undefined : settings.primary_color }}
                            variant={checks.isAdmin ? 'outline' : 'default'}
                        >
                            {isMakingAdmin ? 'Making Admin...' : checks.isAdmin ? 'Already Admin ✓' : 'Make Me Admin'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Step 2: Seed Database */}
                <Card className={!checks.isAdmin ? 'opacity-50' : ''}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Step 2: Seed Database
                        </CardTitle>
                        <CardDescription>
                            Populate Firestore with sample categories, products, and settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            <p>This will create:</p>
                            <ul className="list-disc list-inside mt-2">
                                <li>{categories.length} categories</li>
                                <li>{products.length} sample products</li>
                                <li>{siteSettings.length} site settings</li>
                            </ul>
                        </div>

                        {progress && (
                            <div className="p-4 bg-muted rounded-md text-sm">
                                {progress}
                            </div>
                        )}

                        <Button
                            onClick={seedDatabase}
                            disabled={isSeeding || !checks.isAdmin}
                            className="w-full"
                            style={{ backgroundColor: settings.primary_color }}
                        >
                            {isSeeding ? 'Seeding...' : 'Seed Database'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Important Note */}
                <Card className="border-yellow-500">
                    <CardHeader>
                        <CardTitle className="text-yellow-600">⚠️ Important: Deploy Firestore Rules</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <p>For products to work, you need to deploy the Firestore rules:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Go to Firebase Console → Firestore Database → Rules</li>
                            <li>Copy contents of <code className="bg-muted px-1 rounded">firestore.rules</code></li>
                            <li>Paste and click &quot;Publish&quot;</li>
                        </ol>
                        <p className="pt-2">For image uploads, also deploy Storage rules:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Go to Firebase Console → Storage → Rules</li>
                            <li>Copy contents of <code className="bg-muted px-1 rounded">storage.rules</code></li>
                            <li>Paste and click &quot;Publish&quot;</li>
                        </ol>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
