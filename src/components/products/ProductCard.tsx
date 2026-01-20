'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useCart } from '@/providers/CartProvider'
import { useWishlist } from '@/providers/WishlistProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { Product } from '@/types/database.types'

interface ProductCardProps {
    product: Product
}

export function ProductCard({ product }: ProductCardProps) {
    const { addToCart } = useCart()
    const { isInWishlist, toggleWishlist } = useWishlist()
    const { settings } = useSiteSettings()

    const discount = product.compare_at_price
        ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
        : 0

    const formatPrice = (price: number) => {
        return `${settings.currency_symbol}${price.toLocaleString('en-IN')}`
    }

    return (
        <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="relative aspect-square overflow-hidden bg-muted">
                <Link href={`/products/${product.slug}`}>
                    <Image
                        src={product.thumbnail || product.images[0] || '/placeholder.png'}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                </Link>

                {/* Discount Badge */}
                {discount > 0 && (
                    <Badge
                        className="absolute top-3 left-3 px-2 py-1"
                        style={{ backgroundColor: 'var(--accent-color, #f59e0b)' }}
                    >
                        -{discount}%
                    </Badge>
                )}

                {/* Featured Badge */}
                {product.is_featured && (
                    <Badge
                        className="absolute top-3 right-12"
                        style={{ backgroundColor: 'var(--primary-color, #7c3aed)' }}
                    >
                        Featured
                    </Badge>
                )}

                {/* Wishlist Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white ${isInWishlist(product.id) ? 'text-red-500' : 'text-gray-600'
                        }`}
                    onClick={(e) => {
                        e.preventDefault()
                        toggleWishlist(product.id)
                    }}
                >
                    <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                </Button>

                {/* Quick Add to Cart */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <Button
                        className="w-full rounded-none"
                        style={{ backgroundColor: 'var(--primary-color, #7c3aed)' }}
                        onClick={(e) => {
                            e.preventDefault()
                            addToCart(product.id)
                        }}
                        disabled={product.quantity === 0}
                    >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {product.quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                </div>
            </div>

            <CardContent className="p-4">
                <Link href={`/products/${product.slug}`}>
                    <h3 className="font-medium text-sm mb-1 line-clamp-2 hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                </Link>

                {product.short_description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                        {product.short_description}
                    </p>
                )}

                <div className="flex items-center gap-2">
                    <span
                        className="font-bold"
                        style={{ color: 'var(--primary-color, #7c3aed)' }}
                    >
                        {formatPrice(product.price)}
                    </span>
                    {product.compare_at_price && (
                        <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(product.compare_at_price)}
                        </span>
                    )}
                </div>

                {product.quantity <= 5 && product.quantity > 0 && (
                    <p className="text-xs text-orange-500 mt-1">
                        Only {product.quantity} left in stock
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
