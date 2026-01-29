'use client'

import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { Card, CardContent } from '@/components/ui/card'
import {
    ShoppingBag,
    Truck,
    Shield,
    Headphones,
    Award,
    Users,
    Sparkles,
    Heart
} from 'lucide-react'

const features = [
    {
        icon: ShoppingBag,
        title: 'Premium Products',
        description: 'We source only the finest products from trusted suppliers around the world.'
    },
    {
        icon: Truck,
        title: 'Fast Shipping',
        description: 'Free shipping on orders over ₹999. Quick delivery to your doorstep.'
    },
    {
        icon: Shield,
        title: 'Secure Shopping',
        description: 'Your security is our priority. Shop with confidence using our secure platform.'
    },
    {
        icon: Headphones,
        title: '24/7 Support',
        description: 'Our dedicated support team is always here to help you with any questions.'
    }
]

const values = [
    {
        icon: Heart,
        title: 'Customer First',
        description: 'Everything we do is focused on providing the best experience for our customers.'
    },
    {
        icon: Award,
        title: 'Quality Excellence',
        description: 'We never compromise on quality. Every product is carefully curated.'
    },
    {
        icon: Users,
        title: 'Community Driven',
        description: 'We listen to our community and continuously improve based on your feedback.'
    },
    {
        icon: Sparkles,
        title: 'Innovation',
        description: 'We stay ahead of trends to bring you the latest and greatest products.'
    }
]

export default function AboutPage() {
    const { settings } = useSiteSettings()

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section
                className="py-20 px-4 text-white"
                style={{ backgroundColor: settings.primary_color }}
            >
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        About {settings.site_name}
                    </h1>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        Your trusted destination for premium products. We&apos;re on a mission
                        to make quality shopping accessible to everyone.
                    </p>
                </div>
            </section>

            {/* Story Section */}
            <section className="py-16 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Our Story</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Founded with a passion for quality and customer satisfaction, {settings.site_name}
                            has grown from a small startup to one of the most trusted e-commerce platforms.
                            We believe that everyone deserves access to premium products at fair prices.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 text-center">
                        <div>
                            <div
                                className="text-4xl font-bold mb-2"
                                style={{ color: settings.primary_color }}
                            >
                                10K+
                            </div>
                            <p className="text-muted-foreground">Happy Customers</p>
                        </div>
                        <div>
                            <div
                                className="text-4xl font-bold mb-2"
                                style={{ color: settings.primary_color }}
                            >
                                1000+
                            </div>
                            <p className="text-muted-foreground">Products</p>
                        </div>
                        <div>
                            <div
                                className="text-4xl font-bold mb-2"
                                style={{ color: settings.primary_color }}
                            >
                                4.9
                            </div>
                            <p className="text-muted-foreground">Average Rating</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-16 px-4 bg-muted/50">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature) => (
                            <Card key={feature.title} className="text-center">
                                <CardContent className="pt-6">
                                    <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                                        style={{ backgroundColor: `${settings.primary_color}15` }}
                                    >
                                        <feature.icon
                                            className="h-7 w-7"
                                            style={{ color: settings.primary_color }}
                                        />
                                    </div>
                                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="py-16 px-4">
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
                    <div className="grid sm:grid-cols-2 gap-6">
                        {values.map((value) => (
                            <Card key={value.title} className="flex items-start gap-4 p-6">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${settings.accent_color}15` }}
                                >
                                    <value.icon
                                        className="h-6 w-6"
                                        style={{ color: settings.accent_color }}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg mb-1">{value.title}</h3>
                                    <p className="text-muted-foreground text-sm">
                                        {value.description}
                                    </p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section
                className="py-16 px-4 text-white"
                style={{ backgroundColor: settings.primary_color }}
            >
                <div className="container mx-auto max-w-4xl text-center">
                    <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        To provide our customers with the highest quality products, exceptional service,
                        and a seamless shopping experience that exceeds expectations every single time.
                    </p>
                </div>
            </section>
        </div>
    )
}
