'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShoppingCart, Heart, User, Search, ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/providers/AuthProvider'
import { useCart } from '@/providers/CartProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/categories', label: 'Categories' },
    { href: '/products', label: 'Products' },
]

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, profile, isAdmin, signOut } = useAuth()
    const { itemCount } = useCart()
    const { settings } = useSiteSettings()
    const [searchQuery, setSearchQuery] = useState('')

    // Check if we're on homepage (don't show back button there)
    const isHomePage = pathname === '/'

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`
        }
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <nav className="container mx-auto px-4">
                {/* Desktop Navigation */}
                <div className="hidden md:flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <span
                            className="text-2xl font-bold"
                            style={{ color: settings.primary_color }}
                        >
                            {settings.site_name}
                        </span>
                    </Link>

                    {/* Desktop Nav Links */}
                    <div className="flex items-center space-x-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-medium transition-colors hover:text-primary ${pathname === link.href
                                    ? 'text-primary'
                                    : 'text-muted-foreground'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Search Bar - Desktop */}
                    <div className="flex-1 max-w-sm mx-6">
                        <form onSubmit={handleSearch} className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search products..."
                                className="pl-10 pr-4"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </form>
                    </div>

                    {/* Right Side Actions - Desktop */}
                    <div className="flex items-center space-x-2">
                        <Link href="/wishlist">
                            <Button variant="ghost" size="icon">
                                <Heart className="h-5 w-5" />
                            </Button>
                        </Link>

                        <Link href="/cart" className="relative">
                            <Button variant="ghost" size="icon">
                                <ShoppingCart className="h-5 w-5" />
                                {itemCount > 0 && (
                                    <Badge
                                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                                        style={{ backgroundColor: settings.accent_color }}
                                    >
                                        {itemCount > 99 ? '99+' : itemCount}
                                    </Badge>
                                )}
                            </Button>
                        </Link>

                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <User className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <div className="px-2 py-1.5">
                                        <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile">Profile</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile/orders">My Orders</Link>
                                    </DropdownMenuItem>
                                    {isAdmin && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href="/profile/admin" className="text-primary font-medium">
                                                    Admin Panel
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => signOut()}>
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link href="/login">
                                <Button variant="default" size="sm">
                                    Sign In
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile Navigation - App-like design with back button */}
                <div className="md:hidden flex h-14 items-center gap-2">
                    {/* Back Button - Shows on all pages except homepage */}
                    {!isHomePage && (
                        <button
                            onClick={() => router.back()}
                            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 active:scale-95"
                            style={{ backgroundColor: `${settings.accent_color}10` }}
                            aria-label="Go back"
                        >
                            <ChevronLeft
                                className="h-5 w-5"
                                style={{ color: settings.accent_color }}
                            />
                        </button>
                    )}

                    {/* Logo - Shows on homepage, compact elsewhere */}
                    <Link href="/" className="flex-shrink-0 min-w-0">
                        <span
                            className={`font-bold truncate block ${isHomePage ? 'text-lg' : 'text-base'}`}
                            style={{
                                color: settings.primary_color,
                                maxWidth: isHomePage ? '140px' : '100px'
                            }}
                        >
                            {settings.site_name}
                        </span>
                    </Link>

                    {/* Search Bar - Fills remaining space */}
                    <div className="flex-1 min-w-0">
                        <form onSubmit={handleSearch} className="relative w-full">
                            <Search
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4"
                                style={{ color: settings.accent_color }}
                            />
                            <Input
                                type="search"
                                placeholder="Search..."
                                className="h-9 pl-3 pr-8 text-sm rounded-full w-full transition-all duration-200 focus:ring-2"
                                style={{
                                    borderColor: `${settings.accent_color}40`,
                                    backgroundColor: `${settings.accent_color}08`,
                                    // @ts-expect-error - CSS variable for focus ring
                                    '--tw-ring-color': `${settings.accent_color}40`,
                                }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </form>
                    </div>
                </div>
            </nav>
        </header>
    )
}
