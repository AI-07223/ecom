'use client'

import Link from 'next/link'
import { Mail, Phone, Facebook, Instagram, Twitter } from 'lucide-react'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'

const footerLinks = {
    shop: [
        { href: '/products', label: 'All Products' },
        { href: '/categories', label: 'Categories' },
        { href: '/products?featured=true', label: 'Featured' },
        { href: '/products?sale=true', label: 'On Sale' },
    ],
    account: [
        { href: '/profile', label: 'My Account' },
        { href: '/profile/orders', label: 'Order History' },
        { href: '/wishlist', label: 'Wishlist' },
        { href: '/cart', label: 'Shopping Cart' },
    ],
    support: [
        { href: '/about', label: 'About Us' },
        { href: '/contact', label: 'Contact' },
        { href: '/shipping', label: 'Shipping Info' },
        { href: '/returns', label: 'Returns & Refunds' },
    ],
}

export function Footer() {
    const { settings } = useSiteSettings()

    return (
        <footer className="bg-muted/50 border-t">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <h3
                            className="text-2xl font-bold"
                            style={{ color: 'var(--primary-color, #7c3aed)' }}
                        >
                            {settings.site_name}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            {settings.site_description}
                        </p>
                        <div className="flex space-x-4">
                            {settings.social_links.facebook && (
                                <a
                                    href={settings.social_links.facebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Facebook className="h-5 w-5" />
                                </a>
                            )}
                            {settings.social_links.instagram && (
                                <a
                                    href={settings.social_links.instagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Instagram className="h-5 w-5" />
                                </a>
                            )}
                            {settings.social_links.twitter && (
                                <a
                                    href={settings.social_links.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Twitter className="h-5 w-5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Shop Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Shop</h4>
                        <ul className="space-y-2">
                            {footerLinks.shop.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Account Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Account</h4>
                        <ul className="space-y-2">
                            {footerLinks.account.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="font-semibold mb-4">Contact Us</h4>
                        <ul className="space-y-3">
                            <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <a href={`mailto:${settings.contact_email}`} className="hover:text-foreground transition-colors">
                                    {settings.contact_email}
                                </a>
                            </li>
                            <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <a href={`tel:${settings.contact_phone}`} className="hover:text-foreground transition-colors">
                                    {settings.contact_phone}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
                    <p>{settings.footer_text}</p>
                </div>
            </div>
        </footer>
    )
}
