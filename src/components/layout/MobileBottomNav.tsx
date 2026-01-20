'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useRef, useState, useEffect } from 'react'
import {
    Home,
    ShoppingBag,
    Grid3X3,
    ShoppingCart,
    Heart,
    User,
    Search,
    Menu,
    Settings,
    Package
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCart } from '@/providers/CartProvider'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'

interface NavItem {
    href: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    badge?: number
    adminOnly?: boolean
}

const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Products', icon: ShoppingBag },
    { href: '/categories', label: 'Categories', icon: Grid3X3 },
    { href: '/cart', label: 'Cart', icon: ShoppingCart },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/products?search=', label: 'Search', icon: Search },
    { href: '/profile/orders', label: 'Orders', icon: Package },
    { href: '/profile/admin', label: 'Admin', icon: Settings, adminOnly: true },
]

export function MobileBottomNav() {
    const pathname = usePathname()
    const { itemCount } = useCart()
    const { isAdmin } = useAuth()
    const { settings } = useSiteSettings()
    const scrollRef = useRef<HTMLDivElement>(null)
    const [showMoreButton, setShowMoreButton] = useState(true)
    const [isOpen, setIsOpen] = useState(false)

    // Filter nav items based on auth
    const visibleItems = navItems.filter(item => {
        if (item.adminOnly) return isAdmin
        return true
    })

    // Check scroll position
    useEffect(() => {
        const checkScroll = () => {
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
                setShowMoreButton(scrollLeft < scrollWidth - clientWidth - 10)
            }
        }

        const el = scrollRef.current
        if (el) {
            el.addEventListener('scroll', checkScroll)
            checkScroll()
        }

        return () => el?.removeEventListener('scroll', checkScroll)
    }, [visibleItems.length])

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/'
        return pathname.startsWith(href.split('?')[0])
    }

    const getBadge = (item: NavItem) => {
        if (item.href === '/cart' && itemCount > 0) return itemCount
        return item.badge
    }

    // Don't show on admin pages
    if (pathname.startsWith('/profile/admin')) return null

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-bottom">
            <div className="flex items-center h-16">
                {/* Scrollable nav items */}
                <div
                    ref={scrollRef}
                    className="flex-1 flex items-center overflow-x-auto scrollbar-hide scroll-smooth px-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {visibleItems.map((item, index) => {
                        const active = isActive(item.href)
                        const badge = getBadge(item)
                        const isAlternate = index % 2 === 1

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    flex-shrink-0 flex flex-col items-center justify-center 
                                    min-w-[64px] h-14 px-2 rounded-xl mx-0.5
                                    transition-all duration-200 ease-out
                                    ${active
                                        ? 'text-primary scale-105'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }
                                `}
                                style={{
                                    backgroundColor: active
                                        ? `${settings.accent_color}15`
                                        : isAlternate
                                            ? `${settings.accent_color}08`
                                            : 'transparent'
                                }}
                            >
                                <div className="relative">
                                    <item.icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
                                    {badge !== undefined && badge > 0 && (
                                        <Badge
                                            className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 flex items-center justify-center text-[10px] bg-primary animate-in zoom-in-50"
                                        >
                                            {badge > 99 ? '99+' : badge}
                                        </Badge>
                                    )}
                                </div>
                                <span className={`text-[10px] mt-0.5 font-medium ${active ? 'font-semibold' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>

                {/* More button - shows when not scrolled to end */}
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`
                                flex-shrink-0 h-14 w-14 mr-1 rounded-xl
                                transition-all duration-300
                                ${showMoreButton ? 'opacity-100' : 'opacity-50'}
                            `}
                        >
                            <div className="flex flex-col items-center">
                                <Menu className="h-5 w-5" />
                                <span className="text-[10px] mt-0.5 font-medium">More</span>
                            </div>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl">
                        <SheetHeader className="pb-4">
                            <SheetTitle>Menu</SheetTitle>
                        </SheetHeader>
                        <div className="overflow-y-auto max-h-[calc(70vh-80px)] pb-8">
                            <div className="grid grid-cols-4 gap-3 pb-safe">
                                {visibleItems.map((item, index) => {
                                    const active = isActive(item.href)
                                    const badge = getBadge(item)
                                    // Create checkerboard pattern for 4-column grid
                                    const row = Math.floor(index / 4)
                                    const col = index % 4
                                    const isAlternate = (row + col) % 2 === 1

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`
                                                flex flex-col items-center justify-center 
                                                p-4 rounded-2xl
                                                transition-all duration-200
                                                ${active
                                                    ? 'text-primary-foreground shadow-lg'
                                                    : 'hover:opacity-80 text-foreground'
                                                }
                                            `}
                                            style={{
                                                backgroundColor: active
                                                    ? settings.accent_color
                                                    : isAlternate
                                                        ? `${settings.accent_color}15`
                                                        : `${settings.accent_color}08`
                                            }}
                                        >
                                            <div className="relative mb-1">
                                                <item.icon className="h-6 w-6" />
                                                {badge !== undefined && badge > 0 && (
                                                    <Badge
                                                        className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px]"
                                                        variant={active ? "secondary" : "default"}
                                                    >
                                                        {badge > 99 ? '99+' : badge}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs font-medium">{item.label}</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </nav>
    )
}
