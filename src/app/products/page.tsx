'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductGrid } from '@/components/products/ProductGrid'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Product, Category } from '@/types/database.types'

function ProductsContent() {
    const searchParams = useSearchParams()
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Filters
    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [sortBy, setSortBy] = useState('newest')
    const [minPrice, setMinPrice] = useState('')
    const [maxPrice, setMaxPrice] = useState('')
    const [showFeatured, setShowFeatured] = useState(searchParams.get('featured') === 'true')
    const [showOnSale, setShowOnSale] = useState(searchParams.get('sale') === 'true')

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoriesQuery = query(
                    collection(db, 'categories'),
                    where('is_active', '==', true),
                    orderBy('name')
                )
                const categoriesSnap = await getDocs(categoriesQuery)
                const cats = categoriesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Category[]
                setCategories(cats)
            } catch (error) {
                console.error('Error fetching categories:', error)
            }
        }
        fetchCategories()
    }, [])

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true)

            try {
                // Start with base query
                let productsQuery = query(
                    collection(db, 'products'),
                    where('is_active', '==', true)
                )

                const productsSnap = await getDocs(productsQuery)
                let productList = productsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Product[]

                // Apply client-side filters (Firestore has limitations on compound queries)
                if (search) {
                    const searchLower = search.toLowerCase()
                    productList = productList.filter(p =>
                        p.name.toLowerCase().includes(searchLower) ||
                        p.description?.toLowerCase().includes(searchLower)
                    )
                }

                if (selectedCategories.length > 0) {
                    productList = productList.filter(p =>
                        p.category_id && selectedCategories.includes(p.category_id)
                    )
                }

                if (minPrice) {
                    productList = productList.filter(p => p.price >= parseFloat(minPrice))
                }

                if (maxPrice) {
                    productList = productList.filter(p => p.price <= parseFloat(maxPrice))
                }

                if (showFeatured) {
                    productList = productList.filter(p => p.is_featured)
                }

                if (showOnSale) {
                    productList = productList.filter(p => p.compare_at_price !== null)
                }

                // Apply sorting
                switch (sortBy) {
                    case 'price_asc':
                        productList.sort((a, b) => a.price - b.price)
                        break
                    case 'price_desc':
                        productList.sort((a, b) => b.price - a.price)
                        break
                    case 'name':
                        productList.sort((a, b) => a.name.localeCompare(b.name))
                        break
                    case 'newest':
                    default:
                        productList.sort((a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )
                }

                setProducts(productList)
            } catch (error) {
                console.error('Error fetching products:', error)
                setProducts([])
            }
            setIsLoading(false)
        }

        fetchProducts()
    }, [search, selectedCategories, sortBy, minPrice, maxPrice, showFeatured, showOnSale])

    const handleCategoryToggle = (categoryId: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        )
    }

    const clearFilters = () => {
        setSearch('')
        setSelectedCategories([])
        setSortBy('newest')
        setMinPrice('')
        setMaxPrice('')
        setShowFeatured(false)
        setShowOnSale(false)
    }

    const hasActiveFilters = search || selectedCategories.length > 0 || minPrice || maxPrice || showFeatured || showOnSale

    const FilterContent = () => (
        <div className="space-y-6">
            {/* Search */}
            <div>
                <Label htmlFor="search">Search</Label>
                <Input
                    id="search"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mt-2"
                />
            </div>

            {/* Categories */}
            <div>
                <Label>Categories</Label>
                <div className="space-y-2 mt-2">
                    {categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={category.id}
                                checked={selectedCategories.includes(category.id)}
                                onCheckedChange={() => handleCategoryToggle(category.id)}
                            />
                            <label
                                htmlFor={category.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                {category.name}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <Label>Price Range</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <Input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Filters */}
            <div>
                <Label>Quick Filters</Label>
                <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="featured"
                            checked={showFeatured}
                            onCheckedChange={(checked) => setShowFeatured(checked === true)}
                        />
                        <label htmlFor="featured" className="text-sm font-medium">
                            Featured Products
                        </label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="sale"
                            checked={showOnSale}
                            onCheckedChange={(checked) => setShowOnSale(checked === true)}
                        />
                        <label htmlFor="sale" className="text-sm font-medium">
                            On Sale
                        </label>
                    </div>
                </div>
            </div>

            {hasActiveFilters && (
                <Button variant="outline" className="w-full" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                </Button>
            )}
        </div>
    )

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Desktop Filters Sidebar */}
                <aside className="hidden md:block w-64 shrink-0">
                    <div className="sticky top-24">
                        <h2 className="font-semibold text-lg mb-4">Filters</h2>
                        <FilterContent />
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Products</h1>
                            <p className="text-muted-foreground">
                                {isLoading ? 'Loading...' : `${products.length} products found`}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {/* Mobile Filter Button */}
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" className="md:hidden">
                                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                                        Filters
                                        {hasActiveFilters && (
                                            <span className="ml-2 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                                                {selectedCategories.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (showFeatured ? 1 : 0) + (showOnSale ? 1 : 0)}
                                            </span>
                                        )}
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left">
                                    <SheetHeader>
                                        <SheetTitle>Filters</SheetTitle>
                                    </SheetHeader>
                                    <div className="mt-6">
                                        <FilterContent />
                                    </div>
                                </SheetContent>
                            </Sheet>

                            {/* Sort Dropdown */}
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                                    <SelectItem value="name">Name: A-Z</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Products Grid */}
                    <ProductGrid products={products} isLoading={isLoading} />
                </div>
            </div>
        </div>
    )
}

function ProductsSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="hidden md:block w-64 shrink-0">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </aside>
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-6">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-10 w-44" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton className="aspect-square rounded-lg" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<ProductsSkeleton />}>
            <ProductsContent />
        </Suspense>
    )
}
