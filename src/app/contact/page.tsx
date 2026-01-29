'use client'

import { useState } from 'react'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Mail,
    Phone,
    MapPin,
    Clock,
    Send,
    MessageCircle,
    CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function ContactPage() {
    const { settings } = useSiteSettings()
    const [submitted, setSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1000))

        setSubmitted(true)
        setLoading(false)
        toast.success('Message sent successfully!')
    }

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section
                className="py-16 px-4 text-white"
                style={{ backgroundColor: settings.primary_color }}
            >
                <div className="container mx-auto max-w-4xl text-center">
                    <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
                    <p className="text-lg text-white/90">
                        We&apos;re here to help! Reach out to us for any questions or concerns.
                    </p>
                </div>
            </section>

            {/* Contact Info Cards */}
            <section className="py-12 px-4 -mt-8">
                <div className="container mx-auto max-w-5xl">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                                    style={{ backgroundColor: `${settings.primary_color}15` }}
                                >
                                    <Phone
                                        className="h-6 w-6"
                                        style={{ color: settings.primary_color }}
                                    />
                                </div>
                                <h3 className="font-semibold mb-1">Phone</h3>
                                <p className="text-sm text-muted-foreground">
                                    {settings.contact_phone || '+91 1234567890'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6 text-center">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                                    style={{ backgroundColor: `${settings.primary_color}15` }}
                                >
                                    <Mail
                                        className="h-6 w-6"
                                        style={{ color: settings.primary_color }}
                                    />
                                </div>
                                <h3 className="font-semibold mb-1">Email</h3>
                                <p className="text-sm text-muted-foreground">
                                    {settings.contact_email || 'support@royalstore.com'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6 text-center">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                                    style={{ backgroundColor: `${settings.primary_color}15` }}
                                >
                                    <Clock
                                        className="h-6 w-6"
                                        style={{ color: settings.primary_color }}
                                    />
                                </div>
                                <h3 className="font-semibold mb-1">Working Hours</h3>
                                <p className="text-sm text-muted-foreground">
                                    Mon - Sat: 9AM - 8PM
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6 text-center">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                                    style={{ backgroundColor: `${settings.primary_color}15` }}
                                >
                                    <MessageCircle
                                        className="h-6 w-6"
                                        style={{ color: settings.primary_color }}
                                    />
                                </div>
                                <h3 className="font-semibold mb-1">Live Chat</h3>
                                <p className="text-sm text-muted-foreground">
                                    Available 24/7
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Contact Form Section */}
            <section className="py-12 px-4">
                <div className="container mx-auto max-w-5xl">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Form */}
                        <Card>
                            <CardContent className="p-6">
                                {submitted ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                                        <p className="text-muted-foreground mb-4">
                                            Thank you for contacting us. We&apos;ll get back to you within 24 hours.
                                        </p>
                                        <Button
                                            onClick={() => setSubmitted(false)}
                                            style={{ backgroundColor: settings.primary_color }}
                                        >
                                            Send Another Message
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="name">Your Name</Label>
                                                    <Input id="name" placeholder="John Doe" required />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="email">Email Address</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="john@example.com"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="subject">Subject</Label>
                                                <Input id="subject" placeholder="How can we help?" required />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="message">Message</Label>
                                                <Textarea
                                                    id="message"
                                                    placeholder="Tell us more about your query..."
                                                    rows={5}
                                                    required
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full"
                                                disabled={loading}
                                                style={{ backgroundColor: settings.primary_color }}
                                            >
                                                {loading ? (
                                                    'Sending...'
                                                ) : (
                                                    <>
                                                        <Send className="h-4 w-4 mr-2" />
                                                        Send Message
                                                    </>
                                                )}
                                            </Button>
                                        </form>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Address & Map Placeholder */}
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Our Address</h3>
                                    <div className="flex items-start gap-3">
                                        <MapPin
                                            className="h-5 w-5 mt-0.5 shrink-0"
                                            style={{ color: settings.primary_color }}
                                        />
                                        <div>
                                            <p className="font-medium">{settings.site_name}</p>
                                            <p className="text-muted-foreground">
                                                123 Commerce Street<br />
                                                Business District<br />
                                                Mumbai, Maharashtra 400001<br />
                                                India
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="font-medium text-sm">How long does shipping take?</p>
                                            <p className="text-sm text-muted-foreground">
                                                Standard shipping takes 3-5 business days.
                                                Express shipping is available for 1-2 day delivery.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">What is your return policy?</p>
                                            <p className="text-sm text-muted-foreground">
                                                We accept returns within 7 days of delivery.
                                                See our Returns page for more details.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Do you offer Cash on Delivery?</p>
                                            <p className="text-sm text-muted-foreground">
                                                Yes! We offer COD for all orders across India.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
