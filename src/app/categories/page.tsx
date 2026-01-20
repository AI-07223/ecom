'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Category } from '@/types/database.types'

export default function CategoriesPage() {
    const { settings } = useSiteSettings()
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                // Fetch all categories and filter/sort client-side to avoid composite index
                const categoriesSnap = await getDocs(collection(db, 'categories'))
                const cats = categoriesSnap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() })) as Category[]
                const filtered = cats
                    .filter(c => c.is_active)
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                setCategories(filtered)
            } catch (error) {
                console.error('Error fetching categories:', error)
            }
            setIsLoading(false)
        }

        fetchCategories()
    }, [])

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Shop by Category</h1>
                <p className="text-muted-foreground">
                    Browse our collection of {categories.length} categories
                </p>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-muted-foreground">No categories found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {categories.map((category) => (
                        <Link key={category.id} href={`/categories/${category.slug}`}>
                            <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
                                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                                    <div
                                        className="w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: `${settings.primary_color}15` }}
                                    >
                                        <span
                                            className="text-3xl font-bold"
                                            style={{ color: settings.primary_color }}
                                        >
                                            {category.name.charAt(0)}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-lg text-center mb-2 group-hover:text-primary transition-colors">
                                        {category.name}
                                    </h3>
                                    {category.description && (
                                        <p className="text-sm text-muted-foreground text-center line-clamp-2">
                                            {category.description}
                                        </p>
                                    )}
                                    <div className="mt-4 flex items-center text-sm font-medium" style={{ color: settings.primary_color }}>
                                        Browse Products
                                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
