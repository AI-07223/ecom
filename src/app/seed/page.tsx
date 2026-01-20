'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { collection, doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/providers/AuthProvider'
import { toast } from 'sonner'

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
    {
        id: 'yoga-mat-premium',
        name: 'Yoga Mat Premium',
        slug: 'yoga-mat-premium',
        description: 'Non-slip premium yoga mat with extra cushioning.',
        short_description: 'Non-slip premium quality',
        price: 899,
        compare_at_price: 1199,
        quantity: 60,
        category_id: 'sports',
        is_active: true,
        is_featured: false,
        images: ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500'],
        thumbnail: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=300',
        tags: ['yoga', 'fitness'],
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
    const { user, isAdmin } = useAuth()
    const [isSeeding, setIsSeeding] = useState(false)
    const [progress, setProgress] = useState('')

    const seedDatabase = async () => {
        if (!isAdmin) {
            toast.error('Only admins can seed the database')
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
                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }

            // Seed products
            setProgress('Creating products...')
            for (const product of products) {
                await setDoc(doc(db, 'products', product.id), {
                    ...product,
                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }

            // Seed site settings
            setProgress('Creating site settings...')
            for (const setting of siteSettings) {
                await setDoc(doc(db, 'site_settings', setting.id), {
                    value: setting.value,
                    created_at: new Date(),
                    updated_at: new Date(),
                })
            }

            setProgress('Complete!')
            toast.success('Database seeded successfully!')
        } catch (error) {
            console.error('Error seeding database:', error)
            toast.error('Failed to seed database')
            setProgress('Error: ' + (error as Error).message)
        }

        setIsSeeding(false)
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
                <p className="text-muted-foreground">You need to be signed in as admin to seed the database.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>Seed Database</CardTitle>
                    <CardDescription>
                        Populate Firestore with initial categories, products, and settings.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        <p>This will create:</p>
                        <ul className="list-disc list-inside mt-2">
                            <li>{categories.length} categories</li>
                            <li>{products.length} products</li>
                            <li>{siteSettings.length} site settings</li>
                        </ul>
                    </div>

                    {!isAdmin && (
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm">
                            You are not an admin. Make yourself admin first by updating your profile in Firebase Console.
                        </div>
                    )}

                    {progress && (
                        <div className="p-4 bg-muted rounded-md text-sm">
                            {progress}
                        </div>
                    )}

                    <Button
                        onClick={seedDatabase}
                        disabled={isSeeding || !isAdmin}
                        className="w-full"
                    >
                        {isSeeding ? 'Seeding...' : 'Seed Database'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
