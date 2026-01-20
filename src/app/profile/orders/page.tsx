'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Package, ChevronRight, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

interface Order {
    id: string
    order_number: string
    status: string
    payment_status: string
    total: number
    items: Array<{
        product_name: string
        quantity: number
    }>
    created_at: { toDate: () => Date } | Date
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
}

export default function OrdersPage() {
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()
    const { settings } = useSiteSettings()
    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/profile/orders')
        }
    }, [user, authLoading, router])

    useEffect(() => {
        const fetchOrders = async () => {
            if (!user) return

            try {
                const ordersQuery = query(
                    collection(db, 'orders'),
                    where('user_id', '==', user.uid)
                )
                const ordersSnap = await getDocs(ordersQuery)
                const ordersList = ordersSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Order[]
                // Sort client-side to avoid requiring composite index
                ordersList.sort((a, b) => {
                    const dateA = 'toDate' in a.created_at ? a.created_at.toDate() : a.created_at
                    const dateB = 'toDate' in b.created_at ? b.created_at.toDate() : b.created_at
                    return dateB.getTime() - dateA.getTime()
                })
                setOrders(ordersList)
            } catch (error) {
                console.error('Error fetching orders:', error)
            }
            setIsLoading(false)
        }

        if (user) {
            fetchOrders()
        }
    }, [user])

    const formatPrice = (price: number) => {
        return `${settings.currency_symbol}${price.toLocaleString('en-IN')}`
    }

    const formatDate = (date: { toDate: () => Date } | Date) => {
        const d = 'toDate' in date ? date.toDate() : date
        return d.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-10 w-48 mb-8" />
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
                <Link href="/profile" className="hover:text-foreground">Profile</Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground">Orders</span>
            </nav>

            <h1 className="text-2xl font-bold mb-8">My Orders</h1>

            {orders.length === 0 ? (
                <div className="text-center py-16">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
                    <p className="text-muted-foreground mb-6">
                        You haven&apos;t placed any orders yet.
                    </p>
                    <Link href="/products">
                        <Button style={{ backgroundColor: settings.primary_color }}>
                            Start Shopping
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <Card key={order.id}>
                            <CardContent className="p-6">
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold">{order.order_number}</span>
                                            <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Placed on {formatDate(order.created_at)}
                                        </p>
                                        <p className="text-sm">
                                            {order.items?.length || 0} items • {formatPrice(order.total)}
                                        </p>
                                    </div>
                                    <div className="flex items-center">
                                        <Link href={`/profile/orders/${order.id}`}>
                                            <Button variant="outline">
                                                <Eye className="h-4 w-4 mr-2" />
                                                View Details
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
