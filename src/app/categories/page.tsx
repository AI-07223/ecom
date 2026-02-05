'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Category } from '@/types/database.types'

export default function CategoriesPage() {
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
            <div className="min-h-screen bg-[#FAFAF5]">
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="h-10 w-48 mb-2 bg-[#E2E0DA]" />
                    <Skeleton className="h-6 w-64 mb-8 bg-[#E2E0DA]" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-48 rounded-2xl bg-[#E2E0DA]" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAF5]">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2 flex items-center gap-2">
                        <span className="w-1 h-8 bg-gradient-to-b from-[#2D5A27] to-[#4CAF50] rounded-full" />
                        Shop by Category
                    </h1>
                    <p className="text-[#6B7280]">
                        Browse our collection of {categories.length} categories
                    </p>
                </div>

                {categories.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-[#E2E0DA]">
                        <p className="text-[#6B7280]">No categories found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {categories.map((category) => (
                            <Link key={category.id} href={`/categories/${category.slug}`}>
                                <Card className="group overflow-hidden hover:shadow-soft-lg transition-all duration-300 h-full border-[#E2E0DA] bg-white">
                                    <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                                        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 bg-[#2D5A27]/10">
                                            <span className="text-3xl font-bold text-[#2D5A27]">
                                                {category.name.charAt(0)}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-lg text-center mb-2 text-[#1A1A1A] group-hover:text-[#2D5A27] transition-colors">
                                            {category.name}
                                        </h3>
                                        {category.description && (
                                            <p className="text-sm text-[#6B7280] text-center line-clamp-2">
                                                {category.description}
                                            </p>
                                        )}
                                        <div className="mt-4 flex items-center text-sm font-medium text-[#2D5A27]">
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
        </div>
    )
}
