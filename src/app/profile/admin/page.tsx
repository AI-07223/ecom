'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    LayoutDashboard,
    Package,
    FolderTree,
    ShoppingBag,
    Users,
    Ticket,
    Settings,
    DollarSign,
    ShoppingCart,
    UserCheck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

interface DashboardStats {
    totalProducts: number
    totalOrders: number
    totalUsers: number
    totalRevenue: number
    pendingOrders: number
    lowStockProducts: number
}

const adminNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/profile/admin', active: true },
    { icon: Package, label: 'Products', href: '/profile/admin/products' },
    { icon: FolderTree, label: 'Categories', href: '/profile/admin/categories' },
    { icon: ShoppingBag, label: 'Orders', href: '/profile/admin/orders' },
    { icon: Users, label: 'Users', href: '/profile/admin/users' },
    { icon: Ticket, label: 'Coupons', href: '/profile/admin/coupons' },
    { icon: Settings, label: 'Settings', href: '/profile/admin/settings' },
]

export default function AdminDashboardPage() {
    const router = useRouter()
    const { user, isAdmin, isLoading: authLoading } = useAuth()
    const { settings } = useSiteSettings()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/profile')
        }
    }, [user, isAdmin, authLoading, router])

    useEffect(() => {
        const fetchStats = async () => {
            if (!isAdmin) return

            try {
                // Fetch products count
                const productsSnap = await getDocs(collection(db, 'products'))
                const productsCount = productsSnap.size

                // Fetch low stock products
                const lowStockQuery = query(
                    collection(db, 'products'),
                    where('is_active', '==', true)
                )
                const lowStockSnap = await getDocs(lowStockQuery)
                const lowStockCount = lowStockSnap.docs.filter(doc => doc.data().quantity <= 5).length

                // Fetch orders count
                const ordersSnap = await getDocs(collection(db, 'orders'))
                const ordersCount = ordersSnap.size

                // Fetch pending orders
                const pendingCount = ordersSnap.docs.filter(doc => doc.data().status === 'pending').length

                // Fetch users count
                const usersSnap = await getDocs(collection(db, 'profiles'))
                const usersCount = usersSnap.size

                // Calculate total revenue
                const totalRevenue = ordersSnap.docs
                    .filter(doc => doc.data().payment_status === 'paid')
                    .reduce((sum, doc) => sum + (doc.data().total || 0), 0)

                setStats({
                    totalProducts: productsCount,
                    totalOrders: ordersCount,
                    totalUsers: usersCount,
                    totalRevenue,
                    pendingOrders: pendingCount,
                    lowStockProducts: lowStockCount,
                })
            } catch (error) {
                console.error('Error fetching stats:', error)
            }
            setIsLoading(false)
        }

        if (isAdmin) {
            fetchStats()
        }
    }, [isAdmin])

    if (authLoading || !user || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    const formatCurrency = (amount: number) => {
        return `${settings.currency_symbol}${amount.toLocaleString('en-IN')}`
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="lg:w-64 shrink-0">
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle
                                className="text-lg flex items-center gap-2"
                                style={{ color: settings.primary_color }}
                            >
                                Admin Panel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <nav className="space-y-1">
                                {adminNavItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted ${item.active ? 'bg-muted font-medium' : 'text-muted-foreground'
                                            }`}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        </CardContent>
                    </Card>
                </aside>

                {/* Main Content */}
                <div className="flex-1">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold">Dashboard</h1>
                        <p className="text-muted-foreground">
                            Overview of your store performance
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-32" />
                            ))
                        ) : (
                            <>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Revenue</p>
                                                <p className="text-2xl font-bold" style={{ color: settings.primary_color }}>
                                                    {formatCurrency(stats?.totalRevenue || 0)}
                                                </p>
                                            </div>
                                            <div
                                                className="p-3 rounded-full"
                                                style={{ backgroundColor: `${settings.primary_color}15` }}
                                            >
                                                <DollarSign className="h-6 w-6" style={{ color: settings.primary_color }} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Orders</p>
                                                <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
                                                {(stats?.pendingOrders || 0) > 0 && (
                                                    <p className="text-xs text-orange-500">
                                                        {stats?.pendingOrders} pending
                                                    </p>
                                                )}
                                            </div>
                                            <div className="p-3 rounded-full bg-blue-100">
                                                <ShoppingCart className="h-6 w-6 text-blue-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Products</p>
                                                <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
                                                {(stats?.lowStockProducts || 0) > 0 && (
                                                    <p className="text-xs text-red-500">
                                                        {stats?.lowStockProducts} low stock
                                                    </p>
                                                )}
                                            </div>
                                            <div className="p-3 rounded-full bg-green-100">
                                                <Package className="h-6 w-6 text-green-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Customers</p>
                                                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                                            </div>
                                            <div className="p-3 rounded-full bg-purple-100">
                                                <UserCheck className="h-6 w-6 text-purple-600" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                            <CardDescription>Common tasks you can perform</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Link href="/profile/admin/products?action=new">
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                        <CardContent className="p-4 text-center">
                                            <Package className="h-8 w-8 mx-auto mb-2" style={{ color: settings.primary_color }} />
                                            <p className="text-sm font-medium">Add Product</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                                <Link href="/profile/admin/categories?action=new">
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                        <CardContent className="p-4 text-center">
                                            <FolderTree className="h-8 w-8 mx-auto mb-2" style={{ color: settings.primary_color }} />
                                            <p className="text-sm font-medium">Add Category</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                                <Link href="/profile/admin/orders?status=pending">
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                        <CardContent className="p-4 text-center">
                                            <ShoppingBag className="h-8 w-8 mx-auto mb-2" style={{ color: settings.primary_color }} />
                                            <p className="text-sm font-medium">View Orders</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                                <Link href="/profile/admin/coupons?action=new">
                                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                        <CardContent className="p-4 text-center">
                                            <Ticket className="h-8 w-8 mx-auto mb-2" style={{ color: settings.primary_color }} />
                                            <p className="text-sm font-medium">Create Coupon</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
