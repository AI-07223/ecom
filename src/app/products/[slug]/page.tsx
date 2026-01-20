'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Heart, Minus, Plus, Truck, Shield, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductGrid } from '@/components/products/ProductGrid'
import { useCart } from '@/providers/CartProvider'
import { useWishlist } from '@/providers/WishlistProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { collection, doc, getDoc, getDocs, query, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Product, Category } from '@/types/database.types'

export default function ProductDetailPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string

    const { addToCart } = useCart()
    const { isInWishlist, toggleWishlist } = useWishlist()
    const { settings } = useSiteSettings()

    const [product, setProduct] = useState<Product | null>(null)
    const [category, setCategory] = useState<Category | null>(null)
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
    const [selectedImage, setSelectedImage] = useState(0)
    const [quantity, setQuantity] = useState(1)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchProduct = async () => {
            setIsLoading(true)

            try {
                // Find product by slug
                const productsQuery = query(
                    collection(db, 'products'),
                    where('slug', '==', slug),
                    where('is_active', '==', true),
                    limit(1)
                )
                const productsSnap = await getDocs(productsQuery)

                if (productsSnap.empty) {
                    router.push('/products')
                    return
                }

                const productDoc = productsSnap.docs[0]
                const productData = { id: productDoc.id, ...productDoc.data() } as Product
                setProduct(productData)

                // Fetch category
                if (productData.category_id) {
                    const categoryDoc = await getDoc(doc(db, 'categories', productData.category_id))
                    if (categoryDoc.exists()) {
                        setCategory({ id: categoryDoc.id, ...categoryDoc.data() } as Category)
                    }

                    // Fetch related products
                    const relatedQuery = query(
                        collection(db, 'products'),
                        where('category_id', '==', productData.category_id),
                        where('is_active', '==', true),
                        limit(5)
                    )
                    const relatedSnap = await getDocs(relatedQuery)
                    const related = relatedSnap.docs
                        .map(doc => ({ id: doc.id, ...doc.data() } as Product))
                        .filter(p => p.id !== productData.id)
                        .slice(0, 4)
                    setRelatedProducts(related)
                }
            } catch (error) {
                console.error('Error fetching product:', error)
                router.push('/products')
            }

            setIsLoading(false)
        }

        if (slug) {
            fetchProduct()
        }
    }, [slug, router])

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <Skeleton className="aspect-square rounded-lg" />
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (!product) {
        return null
    }

    const discount = product.compare_at_price
        ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
        : 0

    const formatPrice = (price: number) => {
        return `${settings.currency_symbol}${price.toLocaleString('en-IN')}`
    }

    const images = product.images.length > 0 ? product.images : [product.thumbnail || '/placeholder.png']

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
                <Link href="/products" className="hover:text-foreground">Products</Link>
                <span>/</span>
                {category && (
                    <>
                        <Link href={`/categories/${category.slug}`} className="hover:text-foreground">
                            {category.name}
                        </Link>
                        <span>/</span>
                    </>
                )}
                <span className="text-foreground">{product.name}</span>
            </nav>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Image Gallery */}
                <div className="space-y-4">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <Image
                            src={images[selectedImage]}
                            alt={product.name}
                            fill
                            className="object-cover"
                            priority
                        />
                        {discount > 0 && (
                            <Badge
                                className="absolute top-4 left-4 text-sm"
                                style={{ backgroundColor: 'var(--accent-color, #f59e0b)' }}
                            >
                                -{discount}% OFF
                            </Badge>
                        )}
                    </div>

                    {images.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {images.map((img, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImage(index)}
                                    className={`relative w-20 h-20 rounded-md overflow-hidden shrink-0 border-2 transition-colors ${selectedImage === index ? 'border-primary' : 'border-transparent'
                                        }`}
                                >
                                    <Image
                                        src={img}
                                        alt={`${product.name} ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                        {product.short_description && (
                            <p className="text-muted-foreground">{product.short_description}</p>
                        )}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-3">
                        <span
                            className="text-3xl font-bold"
                            style={{ color: settings.primary_color }}
                        >
                            {formatPrice(product.price)}
                        </span>
                        {product.compare_at_price && (
                            <span className="text-xl text-muted-foreground line-through">
                                {formatPrice(product.compare_at_price)}
                            </span>
                        )}
                        {discount > 0 && (
                            <Badge variant="secondary">Save {discount}%</Badge>
                        )}
                    </div>

                    {/* Stock Status */}
                    <div>
                        {product.quantity > 0 ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                                In Stock ({product.quantity} available)
                            </Badge>
                        ) : (
                            <Badge variant="destructive">Out of Stock</Badge>
                        )}
                    </div>

                    <Separator />

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4">
                        <span className="font-medium">Quantity:</span>
                        <div className="flex items-center border rounded-md">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={quantity <= 1}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium">{quantity}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setQuantity(Math.min(product.quantity, quantity + 1))}
                                disabled={quantity >= product.quantity}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            size="lg"
                            className="flex-1"
                            style={{ backgroundColor: settings.primary_color }}
                            onClick={() => addToCart(product.id, quantity)}
                            disabled={product.quantity === 0}
                        >
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            Add to Cart
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={() => toggleWishlist(product.id)}
                            className={isInWishlist(product.id) ? 'text-red-500 border-red-500' : ''}
                        >
                            <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                        </Button>
                    </div>

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                            <Truck className="h-5 w-5 mx-auto mb-1" style={{ color: settings.primary_color }} />
                            <p className="text-xs">Free Shipping</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                            <Shield className="h-5 w-5 mx-auto mb-1" style={{ color: settings.primary_color }} />
                            <p className="text-xs">Secure Payment</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                            <RotateCcw className="h-5 w-5 mx-auto mb-1" style={{ color: settings.primary_color }} />
                            <p className="text-xs">Easy Returns</p>
                        </div>
                    </div>

                    {/* Tags */}
                    {product.tags && product.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {product.tags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Description Tabs */}
            <Tabs defaultValue="description" className="mt-12">
                <TabsList>
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="description" className="mt-4">
                    <div className="prose max-w-none">
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {product.description || 'No description available.'}
                        </p>
                    </div>
                </TabsContent>
                <TabsContent value="details" className="mt-4">
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {product.sku && (
                            <div>
                                <dt className="text-sm text-muted-foreground">SKU</dt>
                                <dd className="font-medium">{product.sku}</dd>
                            </div>
                        )}
                        {product.barcode && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Barcode</dt>
                                <dd className="font-medium">{product.barcode}</dd>
                            </div>
                        )}
                        {product.weight && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Weight</dt>
                                <dd className="font-medium">{product.weight} kg</dd>
                            </div>
                        )}
                        {category && (
                            <div>
                                <dt className="text-sm text-muted-foreground">Category</dt>
                                <dd className="font-medium">{category.name}</dd>
                            </div>
                        )}
                    </dl>
                </TabsContent>
            </Tabs>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <section className="mt-16">
                    <h2 className="text-2xl font-bold mb-6">Related Products</h2>
                    <ProductGrid products={relatedProducts} />
                </section>
            )}
        </div>
    )
}
