'use client'

import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { Card, CardContent } from '@/components/ui/card'
import {
    RefreshCcw,
    CheckCircle,
    XCircle,
    Package,
    Clock,
    Shield,
    HelpCircle,
    ArrowRight
} from 'lucide-react'

const returnSteps = [
    {
        icon: HelpCircle,
        title: 'Check Eligibility',
        description: 'Ensure your item is eligible for return within 7 days of delivery.'
    },
    {
        icon: Package,
        title: 'Request Return',
        description: 'Go to your orders and click on "Return Item" for the product you want to return.'
    },
    {
        icon: Clock,
        title: 'Pickup Scheduled',
        description: 'Our team will review and schedule a pickup at your convenience.'
    },
    {
        icon: CheckCircle,
        title: 'Refund Processed',
        description: 'Once received and inspected, your refund will be processed within 5-7 business days.'
    }
]

const eligibleItems = [
    'Items in original condition with tags attached',
    'Items with manufacturing defects',
    'Wrong item delivered',
    'Damaged during shipping'
]

const nonEligibleItems = [
    'Items used or washed',
    'Items without original packaging',
    'Intimate or hygiene products',
    'Items past 7 days of delivery',
    'Digital products or gift cards'
]

export default function ReturnsPage() {
    const { settings } = useSiteSettings()

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section
                className="py-16 px-4 text-white"
                style={{ backgroundColor: settings.primary_color }}
            >
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl font-bold mb-4">Returns & Refunds</h1>
                    <p className="text-lg text-white/90">
                        Hassle-free returns within 7 days. Your satisfaction is our priority.
                    </p>
                </div>
            </section>

            {/* Policy Overview */}
            <section className="py-12 px-4">
                <div className="container mx-auto max-w-5xl">
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="text-center">
                            <CardContent className="p-6">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ backgroundColor: `${settings.primary_color}15` }}
                                >
                                    <Clock
                                        className="h-8 w-8"
                                        style={{ color: settings.primary_color }}
                                    />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">7-Day Returns</h3>
                                <p className="text-muted-foreground text-sm">
                                    Return any item within 7 days of delivery for a full refund
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center">
                            <CardContent className="p-6">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ backgroundColor: `${settings.primary_color}15` }}
                                >
                                    <RefreshCcw
                                        className="h-8 w-8"
                                        style={{ color: settings.primary_color }}
                                    />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Easy Process</h3>
                                <p className="text-muted-foreground text-sm">
                                    Simple return process with doorstep pickup at no extra cost
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="text-center">
                            <CardContent className="p-6">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ backgroundColor: `${settings.primary_color}15` }}
                                >
                                    <Shield
                                        className="h-8 w-8"
                                        style={{ color: settings.primary_color }}
                                    />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Full Protection</h3>
                                <p className="text-muted-foreground text-sm">
                                    Complete refund guarantee for all eligible returns
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Return Process */}
            <section className="py-12 px-4 bg-muted/50">
                <div className="container mx-auto max-w-5xl">
                    <h2 className="text-2xl font-bold text-center mb-8">How to Return</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {returnSteps.map((step, index) => (
                            <Card key={step.title} className="relative">
                                <CardContent className="p-6 text-center">
                                    <div
                                        className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                        style={{ backgroundColor: settings.accent_color }}
                                    >
                                        {index + 1}
                                    </div>
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
                                        style={{ backgroundColor: `${settings.primary_color}15` }}
                                    >
                                        <step.icon
                                            className="h-7 w-7"
                                            style={{ color: settings.primary_color }}
                                        />
                                    </div>
                                    <h3 className="font-semibold mb-2">{step.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {step.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Eligibility */}
            <section className="py-12 px-4">
                <div className="container mx-auto max-w-5xl">
                    <h2 className="text-2xl font-bold text-center mb-8">Return Eligibility</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="border-green-200">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                    <h3 className="text-xl font-semibold">Eligible for Return</h3>
                                </div>
                                <ul className="space-y-3">
                                    {eligibleItems.map((item) => (
                                        <li key={item} className="flex items-start gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-red-200">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <XCircle className="h-6 w-6 text-red-600" />
                                    <h3 className="text-xl font-semibold">Not Eligible</h3>
                                </div>
                                <ul className="space-y-3">
                                    {nonEligibleItems.map((item) => (
                                        <li key={item} className="flex items-start gap-2 text-sm">
                                            <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Refund Info */}
            <section className="py-12 px-4 bg-muted/50">
                <div className="container mx-auto max-w-4xl">
                    <h2 className="text-2xl font-bold text-center mb-8">Refund Information</h2>
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-lg mb-2">Refund Timeline</h3>
                                <p className="text-muted-foreground mb-4">
                                    Once we receive and inspect your returned item, we will process your refund
                                    within 5-7 business days. The refund will be credited to your original
                                    payment method.
                                </p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" style={{ color: settings.primary_color }} />
                                        <strong>COD Orders:</strong> Refund will be processed to your bank account
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" style={{ color: settings.primary_color }} />
                                        <strong>Online Payments:</strong> Refund to original payment method
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <h3 className="font-semibold text-lg mb-2">Exchange Policy</h3>
                                <p className="text-muted-foreground">
                                    We currently do not offer direct exchanges. If you need a different size
                                    or color, please return the original item and place a new order. This
                                    ensures faster processing and availability confirmation.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section
                className="py-12 px-4 text-white"
                style={{ backgroundColor: settings.primary_color }}
            >
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-2xl font-bold mb-4">Need Help with a Return?</h2>
                    <p className="text-white/90 mb-6">
                        Our support team is here to assist you with any return-related queries.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="/profile/orders"
                            className="inline-flex items-center justify-center bg-white px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
                            style={{ color: settings.primary_color }}
                        >
                            View My Orders
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </a>
                        <a
                            href="/contact"
                            className="inline-flex items-center justify-center border-2 border-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                        >
                            Contact Support
                        </a>
                    </div>
                </div>
            </section>
        </div>
    )
}
