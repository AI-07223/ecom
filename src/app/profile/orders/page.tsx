'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Package, ChevronRight, Eye, ImageIcon, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

interface OrderItem {
    product_id: string
    product_name: string
    product_image?: string
    quantity: number
    price: number
    total: number
}

interface Order {
    id: string
    order_number: string
    status: string
    payment_status: string
    total: number
    items: OrderItem[]
    created_at: { toDate: () => Date } | Date
}

const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    processing: 'bg-purple-100 text-purple-800 border-purple-200',
    shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
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
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Skeleton className="h-10 w-48 mb-8 bg-[#E2E0DA]" />
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 bg-[#E2E0DA]" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAF5] pb-20">
            {/* Header */}
            <div className="bg-white border-b border-[#E2E0DA] sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <nav className="flex items-center space-x-2 text-sm text-[#6B7280] mb-2">
                        <Link href="/profile" className="hover:text-[#1A1A1A]">Profile</Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-[#1A1A1A]">Orders</span>
                    </nav>
                    <h1 className="text-xl font-bold text-[#1A1A1A]">My Orders</h1>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                {orders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-[#E2E0DA]">
                        <Package className="h-16 w-16 mx-auto text-[#9CA3AF] mb-4" />
                        <h2 className="text-xl font-semibold mb-2 text-[#1A1A1A]">No Orders Yet</h2>
                        <p className="text-[#6B7280] mb-6">
                            You haven&apos;t placed any orders yet.
                        </p>
                        <Link href="/products">
                            <Button 
                                className="h-12 px-6 rounded-xl"
                                style={{ backgroundColor: settings.primary_color }}
                            >
                                Start Shopping
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <Card key={order.id} className="border-[#E2E0DA] shadow-soft overflow-hidden">
                                <CardContent className="p-4">
                                    {/* Order Header */}
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-semibold text-[#1A1A1A]">
                                                    {order.order_number}
                                                </span>
                                                <Badge className={`${statusColors[order.status] || 'bg-gray-100'} text-xs`}>
                                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-[#6B7280] flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(order.created_at)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg" style={{ color: settings.primary_color }}>
                                                {formatPrice(order.total)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Order Items Preview */}
                                    {order.items && order.items.length > 0 && (
                                        <div className="flex items-center gap-3 py-3 border-t border-b border-[#E2E0DA]">
                                            <div className="flex -space-x-2">
                                                {order.items.slice(0, 3).map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="relative w-10 h-10 rounded-lg border-2 border-white bg-[#F0EFE8] overflow-hidden"
                                                    >
                                                        {item.product_image ? (
                                                            <Image
                                                                src={item.product_image}
                                                                alt={item.product_name}
                                                                fill
                                                                className="object-cover"
                                                                sizes="40px"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ImageIcon className="h-4 w-4 text-[#9CA3AF]" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {order.items.length > 3 && (
                                                    <div className="w-10 h-10 rounded-lg border-2 border-white bg-[#E2E0DA] flex items-center justify-center">
                                                        <span className="text-xs font-medium text-[#6B7280]">
                                                            +{order.items.length - 3}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-[#1A1A1A] truncate">
                                                    {order.items[0].product_name}
                                                    {order.items.length > 1 && ` +${order.items.length - 1} more`}
                                                </p>
                                                <p className="text-xs text-[#6B7280]">
                                                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Order Footer */}
                                    <div className="flex items-center justify-between pt-3">
                                        <p className="text-sm text-[#6B7280]">
                                            {order.items?.length || 0} products
                                        </p>
                                        <Link href={`/profile/orders/${order.id}`}>
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                className="h-9 rounded-lg border-[#E2E0DA] hover:bg-[#F0EFE8] tap-active"
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View Details
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
