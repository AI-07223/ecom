'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductGrid } from '@/components/products/ProductGrid'
import { collection, getDocs, query, where, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Product, Category } from '@/types/database.types'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'

const PRODUCTS_PER_PAGE = 12

function ProductsContent() {
    const searchParams = useSearchParams()
    const { settings } = useSiteSettings()
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null)
    const [hasMore, setHasMore] = useState(true)

    // Filters
    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '')
    const [sortBy, setSortBy] = useState('newest')
    const [minPrice, setMinPrice] = useState('')
    const [maxPrice, setMaxPrice] = useState('')
    const [showFeatured, setShowFeatured] = useState(searchParams.get('featured') === 'true')
    const [showOnSale, setShowOnSale] = useState(searchParams.get('sale') === 'true')

    // Debounced search
    const [debouncedSearch, setDebouncedSearch] = useState(search)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(timer)
    }, [search])

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

    const buildQuery = useCallback(() => {
        const constraints: Parameters<typeof query>[1][] = [
            where('is_active', '==', true)
        ]

        // Category filter (server-side)
        if (selectedCategory) {
            constraints.push(where('category_id', '==', selectedCategory))
        }

        // Featured filter (server-side)
        if (showFeatured) {
            constraints.push(where('is_featured', '==', true))
        }

        // Sorting (server-side where possible)
        switch (sortBy) {
            case 'price_asc':
                constraints.push(orderBy('price', 'asc'))
                break
            case 'price_desc':
                constraints.push(orderBy('price', 'desc'))
                break
            case 'name':
                constraints.push(orderBy('name', 'asc'))
                break
            case 'newest':
            default:
                constraints.push(orderBy('created_at', 'desc'))
        }

        return constraints
    }, [selectedCategory, showFeatured, sortBy])

    const applyClientFilters = useCallback((productList: Product[]) => {
        let filtered = productList

        // Search filter (client-side for partial matching)
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase()
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchLower) ||
                p.description?.toLowerCase().includes(searchLower)
            )
        }

        // Price filters (client-side)
        if (minPrice) {
            filtered = filtered.filter(p => p.price >= parseFloat(minPrice))
        }
        if (maxPrice) {
            filtered = filtered.filter(p => p.price <= parseFloat(maxPrice))
        }

        // On sale filter (client-side)
        if (showOnSale) {
            filtered = filtered.filter(p => p.compare_at_price !== null)
        }

        return filtered
    }, [debouncedSearch, minPrice, maxPrice, showOnSale])

    const fetchProducts = useCallback(async (loadMore = false) => {
        if (loadMore) {
            setIsLoadingMore(true)
        } else {
            setIsLoading(true)
            setProducts([])
            setLastDoc(null)
        }

        try {
            const constraints = buildQuery()
            let productsQuery = query(
                collection(db, 'products'),
                ...constraints,
                limit(PRODUCTS_PER_PAGE)
            )

            // For pagination, start after last document
            if (loadMore && lastDoc) {
                productsQuery = query(
                    collection(db, 'products'),
                    ...constraints,
                    startAfter(lastDoc),
                    limit(PRODUCTS_PER_PAGE)
                )
            }

            const productsSnap = await getDocs(productsQuery)
            const newProducts = productsSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Product[]

            // Apply client-side filters
            const filteredProducts = applyClientFilters(newProducts)

            // Update last document for pagination
            if (productsSnap.docs.length > 0) {
                setLastDoc(productsSnap.docs[productsSnap.docs.length - 1])
            }

            // Check if there are more products
            setHasMore(productsSnap.docs.length === PRODUCTS_PER_PAGE)

            if (loadMore) {
                setProducts(prev => [...prev, ...filteredProducts])
            } else {
                setProducts(filteredProducts)
            }
        } catch (error) {
            console.error('Error fetching products:', error)
            if (!loadMore) {
                setProducts([])
            }
        }

        setIsLoading(false)
        setIsLoadingMore(false)
    }, [buildQuery, applyClientFilters, lastDoc])

    // Fetch products when filters change (not for loadMore)
    useEffect(() => {
        fetchProducts(false)
    }, [fetchProducts])

    const handleLoadMore = () => {
        if (!isLoadingMore && hasMore) {
            fetchProducts(true)
        }
    }

    const clearFilters = () => {
        setSearch('')
        setSelectedCategory('')
        setSortBy('newest')
        setMinPrice('')
        setMaxPrice('')
        setShowFeatured(false)
        setShowOnSale(false)
    }

    const hasActiveFilters = search || selectedCategory || minPrice || maxPrice || showFeatured || showOnSale

    const filterContent = (
        <div className="space-y-6">
            {/* Search */}
            <div>
                <Label htmlFor="search">Search</Label>
                <Input
                    id="search"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mt-1"
                />
            </div>

            {/* Categories */}
            <div>
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="mt-1">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Price Range */}
            <div>
                <Label>Price Range</Label>
                <div className="flex gap-2 mt-1">
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

            {/* Toggles */}
            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="featured"
                        checked={showFeatured}
                        onCheckedChange={(checked) => setShowFeatured(checked === true)}
                    />
                    <Label htmlFor="featured" className="cursor-pointer">Featured Only</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="sale"
                        checked={showOnSale}
                        onCheckedChange={(checked) => setShowOnSale(checked === true)}
                    />
                    <Label htmlFor="sale" className="cursor-pointer">On Sale</Label>
                </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full"
                >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                </Button>
            )}
        </div>
    )

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Desktop Filters */}
                <aside className="hidden lg:block w-64 shrink-0">
                    <div className="sticky top-24 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold">Filters</h2>
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters}>
                                    Clear
                                </Button>
                            )}
                        </div>
                        {filterContent}
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                    {/* Mobile Header & Sort */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold">Products</h1>
                            <p className="text-muted-foreground text-sm">
                                {products.length} product{products.length !== 1 ? 's' : ''}
                                {hasMore && '+'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Mobile Filter Button */}
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="sm" className="lg:hidden">
                                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                                        Filters
                                        {hasActiveFilters && (
                                            <span className="ml-1 bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center">
                                                !
                                            </span>
                                        )}
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left">
                                    <SheetHeader>
                                        <SheetTitle>Filters</SheetTitle>
                                    </SheetHeader>
                                    <div className="mt-6">
                                        {filterContent}
                                    </div>
                                </SheetContent>
                            </Sheet>

                            {/* Sort */}
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="price_asc">Price: Low</SelectItem>
                                    <SelectItem value="price_desc">Price: High</SelectItem>
                                    <SelectItem value="name">Name</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Products Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="aspect-square rounded-lg" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-muted-foreground mb-4">No products found</p>
                            {hasActiveFilters && (
                                <Button variant="outline" onClick={clearFilters}>
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <ProductGrid products={products} />

                            {/* Load More Button */}
                            {hasMore && (
                                <div className="mt-8 text-center">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={handleLoadMore}
                                        disabled={isLoadingMore}
                                        style={{ borderColor: settings.primary_color, color: settings.primary_color }}
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            'Load More Products'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function ProductsPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="aspect-square rounded-lg" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            </div>
        }>
            <ProductsContent />
        </Suspense>
    )
}
