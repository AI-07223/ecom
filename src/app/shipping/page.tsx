'use client'

import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { Card, CardContent } from '@/components/ui/card'
import {
    Truck,
    Package,
    MapPin,
    Clock,
    CheckCircle,
    AlertCircle,
    Info
} from 'lucide-react'

const shippingMethods = [
    {
        name: 'Standard Shipping',
        duration: '3-5 Business Days',
        price: '₹99',
        freeThreshold: 'Free on orders over ₹999',
        icon: Truck
    },
    {
        name: 'Express Shipping',
        duration: '1-2 Business Days',
        price: '₹199',
        freeThreshold: null,
        icon: Package
    }
]

const deliverySteps = [
    {
        title: 'Order Placed',
        description: 'We receive your order and start processing it immediately.'
    },
    {
        title: 'Order Processed',
        description: 'Your items are picked, packed, and prepared for shipment.'
    },
    {
        title: 'Shipped',
        description: 'Your order is handed over to our delivery partner.'
    },
    {
        title: 'Out for Delivery',
        description: 'Your package is on its way to your address.'
    },
    {
        title: 'Delivered',
        description: 'Your order has been successfully delivered!'
    }
]

export default function ShippingPage() {
    const { settings } = useSiteSettings()

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section
                className="py-16 px-4 text-white"
                style={{ backgroundColor: settings.primary_color }}
            >
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl font-bold mb-4">Shipping Information</h1>
                    <p className="text-lg text-white/90">
                        Fast, reliable delivery to your doorstep. Free shipping on orders over ₹999!
                    </p>
                </div>
            </section>

            {/* Shipping Methods */}
            <section className="py-12 px-4">
                <div className="container mx-auto max-w-5xl">
                    <h2 className="text-2xl font-bold text-center mb-8">Shipping Options</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {shippingMethods.map((method) => (
                            <Card key={method.name} className="relative overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${settings.primary_color}15` }}
                                        >
                                            <method.icon
                                                className="h-7 w-7"
                                                style={{ color: settings.primary_color }}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-semibold mb-1">{method.name}</h3>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span>{method.duration}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Info className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium" style={{ color: settings.primary_color }}>
                                                        {method.price}
                                                    </span>
                                                </div>
                                                {method.freeThreshold && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                                        <span className="text-green-600">{method.freeThreshold}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Delivery Process */}
            <section className="py-12 px-4 bg-muted/50">
                <div className="container mx-auto max-w-4xl">
                    <h2 className="text-2xl font-bold text-center mb-8">Delivery Process</h2>
                    <div className="space-y-4">
                        {deliverySteps.map((step, index) => (
                            <Card key={step.title}>
                                <CardContent className="p-4 flex items-start gap-4">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold"
                                        style={{
                                            backgroundColor: `${settings.primary_color}15`,
                                            color: settings.primary_color
                                        }}
                                    >
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{step.title}</h3>
                                        <p className="text-muted-foreground">{step.description}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Coverage Area */}
            <section className="py-12 px-4">
                <div className="container mx-auto max-w-5xl">
                    <div className="grid md:grid-cols-2 gap-8">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <MapPin
                                        className="h-6 w-6"
                                        style={{ color: settings.primary_color }}
                                    />
                                    <h3 className="text-xl font-semibold">Delivery Coverage</h3>
                                </div>
                                <p className="text-muted-foreground mb-4">
                                    We deliver to all major cities and towns across India.
                                    Our extensive delivery network ensures your order reaches you
                                    no matter where you are.
                                </p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        Metro Cities: 1-2 days
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        Tier 2 Cities: 2-4 days
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        Remote Areas: 5-7 days
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertCircle
                                        className="h-6 w-6"
                                        style={{ color: settings.accent_color }}
                                    />
                                    <h3 className="text-xl font-semibold">Important Notes</h3>
                                </div>
                                <ul className="space-y-3 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-foreground">•</span>
                                        Orders are processed within 24 hours of placement
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-foreground">•</span>
                                        Delivery times may vary during festivals and holidays
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-foreground">•</span>
                                        You will receive tracking details via email and SMS
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-foreground">•</span>
                                        Someone must be available to receive the package
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-foreground">•</span>
                                        Cash on Delivery (COD) orders require OTP verification
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Order Tracking CTA */}
            <section
                className="py-12 px-4 text-white"
                style={{ backgroundColor: settings.primary_color }}
            >
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-2xl font-bold mb-4">Track Your Order</h2>
                    <p className="text-white/90 mb-6">
                        Already placed an order? Track its status in real-time from your account.
                    </p>
                    <a
                        href="/profile/orders"
                        className="inline-block bg-white px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
                        style={{ color: settings.primary_color }}
                    >
                        View My Orders
                    </a>
                </div>
            </section>
        </div>
    )
}
