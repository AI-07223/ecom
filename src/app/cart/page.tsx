'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/providers/CartProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { useAuth } from '@/providers/AuthProvider'

export default function CartPage() {
    const { items, itemCount, subtotal, isLoading, updateQuantity, removeFromCart, clearCart } = useCart()
    const { settings } = useSiteSettings()
    const { user } = useAuth()

    const formatPrice = (price: number) => {
        return `${settings.currency_symbol}${price.toLocaleString('en-IN')}`
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold mb-2">Please Sign In</h1>
                <p className="text-muted-foreground mb-6">
                    Sign in to view your cart and start shopping
                </p>
                <Link href="/login?redirect=/cart">
                    <Button style={{ backgroundColor: settings.primary_color }}>
                        Sign In
                    </Button>
                </Link>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
                <div className="grid lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                    <Skeleton className="h-64" />
                </div>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
                <p className="text-muted-foreground mb-6">
                    Looks like you haven&apos;t added anything to your cart yet.
                </p>
                <Link href="/products">
                    <Button style={{ backgroundColor: settings.primary_color }}>
                        Start Shopping
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                </Link>
            </div>
        )
    }

    const shipping = subtotal >= 999 ? 0 : 99
    const total = subtotal + shipping

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold">Shopping Cart ({itemCount} items)</h1>
                <Button variant="ghost" size="sm" onClick={clearCart}>
                    Clear Cart
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item) => (
                        <Card key={item.id}>
                            <CardContent className="p-4">
                                <div className="flex gap-4">
                                    {/* Product Image */}
                                    <Link href={`/products/${item.product.slug}`} className="shrink-0">
                                        <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted">
                                            <Image
                                                src={item.product.thumbnail || item.product.images[0] || '/placeholder.png'}
                                                alt={item.product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    </Link>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/products/${item.product.slug}`}>
                                            <h3 className="font-medium hover:text-primary transition-colors line-clamp-1">
                                                {item.product.name}
                                            </h3>
                                        </Link>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {formatPrice(item.product.price)} each
                                        </p>

                                        <div className="flex items-center justify-between">
                                            {/* Quantity Controls */}
                                            <div className="flex items-center border rounded-md">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="w-8 text-center text-sm">{item.quantity}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                    disabled={item.quantity >= item.product.quantity}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            {/* Remove Button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => removeFromCart(item.product_id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Item Total */}
                                    <div className="text-right">
                                        <p
                                            className="font-semibold"
                                            style={{ color: settings.primary_color }}
                                        >
                                            {formatPrice(item.product.price * item.quantity)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Order Summary */}
                <div>
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Shipping</span>
                                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                            </div>
                            {shipping > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Free shipping on orders over {formatPrice(999)}
                                </p>
                            )}
                            <Separator />
                            <div className="flex justify-between font-semibold text-lg">
                                <span>Total</span>
                                <span style={{ color: settings.primary_color }}>{formatPrice(total)}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col gap-3">
                            <Link href="/checkout" className="w-full">
                                <Button
                                    className="w-full"
                                    size="lg"
                                    style={{ backgroundColor: settings.primary_color }}
                                >
                                    Proceed to Checkout
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            </Link>
                            <Link href="/products" className="w-full">
                                <Button variant="outline" className="w-full">
                                    Continue Shopping
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
