'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CreditCard, Truck, Shield, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/providers/CartProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { useAuth } from '@/providers/AuthProvider'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'

export default function CheckoutPage() {
    const router = useRouter()
    const { user, profile } = useAuth()
    const { items, subtotal, clearCart } = useCart()
    const { settings } = useSiteSettings()

    const [isProcessing, setIsProcessing] = useState(false)
    const [formData, setFormData] = useState({
        fullName: profile?.full_name || '',
        email: user?.email || '',
        phone: profile?.phone || '',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
    })

    const formatPrice = (price: number) => {
        return `${settings.currency_symbol}${price.toLocaleString('en-IN')}`
    }

    const shipping = subtotal >= 999 ? 0 : 99
    const total = subtotal + shipping

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!user) {
            toast.error('Please sign in to place an order')
            return
        }

        if (items.length === 0) {
            toast.error('Your cart is empty')
            return
        }

        setIsProcessing(true)

        try {
            // Create order
            const orderId = `ORD-${Date.now()}`
            const orderRef = doc(db, 'orders', orderId)

            await setDoc(orderRef, {
                user_id: user.uid,
                order_number: orderId,
                status: 'pending',
                payment_status: 'pending',
                subtotal,
                shipping,
                discount: 0,
                total,
                shipping_address: {
                    full_name: formData.fullName,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    postal_code: formData.postalCode,
                    country: formData.country,
                },
                items: items.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product.name,
                    product_image: item.product.thumbnail,
                    quantity: item.quantity,
                    price: item.product.price,
                    total: item.product.price * item.quantity,
                })),
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
            })

            // Clear cart
            await clearCart()

            toast.success('Order placed successfully!')
            router.push(`/profile/orders/${orderId}`)
        } catch (error) {
            console.error('Error placing order:', error)
            toast.error('Failed to place order. Please try again.')
        }

        setIsProcessing(false)
    }

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
                <p className="text-muted-foreground mb-6">
                    You need to be signed in to checkout.
                </p>
                <Link href="/login?redirect=/checkout">
                    <Button style={{ backgroundColor: settings.primary_color }}>
                        Sign In
                    </Button>
                </Link>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
                <p className="text-muted-foreground mb-6">
                    Add some items to your cart before checking out.
                </p>
                <Link href="/products">
                    <Button style={{ backgroundColor: settings.primary_color }}>
                        Browse Products
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Link href="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Cart
            </Link>

            <h1 className="text-2xl font-bold mb-8">Checkout</h1>

            <form onSubmit={handleSubmit}>
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Shipping Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Truck className="h-5 w-5" />
                                    Shipping Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input
                                            id="fullName"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            required
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
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="address">Street Address</Label>
                                    <Input
                                        id="address"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        required
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
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="postalCode">Postal Code</Label>
                                        <Input
                                            id="postalCode"
                                            name="postalCode"
                                            value={formData.postalCode}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="country">Country</Label>
                                        <Input
                                            id="country"
                                            name="country"
                                            value={formData.country}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment - Placeholder for now */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Method
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 bg-muted rounded-lg text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Cash on Delivery (COD) is available for this order.
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Online payment options coming soon!
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Order Summary */}
                    <div>
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle>Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Items */}
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {items.map((item) => (
                                        <div key={item.id} className="flex gap-3">
                                            <div className="relative w-16 h-16 rounded bg-muted shrink-0">
                                                <Image
                                                    src={item.product.thumbnail || '/placeholder.png'}
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover rounded"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                                                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                                                <p className="text-sm font-medium">{formatPrice(item.product.price * item.quantity)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Separator />

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatPrice(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Shipping</span>
                                        <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex justify-between font-semibold text-lg">
                                    <span>Total</span>
                                    <span style={{ color: settings.primary_color }}>{formatPrice(total)}</span>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    style={{ backgroundColor: settings.primary_color }}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? 'Processing...' : 'Place Order'}
                                </Button>

                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                    <Shield className="h-3 w-3" />
                                    Secure checkout
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    )
}
