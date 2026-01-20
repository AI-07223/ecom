'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'

interface Order {
    id: string
    order_number: string
    user_id: string
    status: string
    payment_status: string
    total: number
    items: Array<{ product_name: string; quantity: number }>
    shipping_address: { full_name: string; city: string }
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

export default function AdminOrdersPage() {
    const router = useRouter()
    const { user, isAdmin, isLoading: authLoading } = useAuth()
    const { settings } = useSiteSettings()

    const [orders, setOrders] = useState<Order[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [editingOrder, setEditingOrder] = useState<Order | null>(null)
    const [newStatus, setNewStatus] = useState('')

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/profile')
        }
    }, [user, isAdmin, authLoading, router])

    const fetchOrders = async () => {
        try {
            const ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('created_at', 'desc')))
            setOrders(ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[])
        } catch (error) {
            console.error('Error fetching orders:', error)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        if (isAdmin) {
            fetchOrders()
        }
    }, [isAdmin])

    const formatPrice = (price: number) => {
        return `${settings.currency_symbol}${price.toLocaleString('en-IN')}`
    }

    const formatDate = (date: { toDate: () => Date } | Date) => {
        const d = 'toDate' in date ? date.toDate() : date
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const handleUpdateStatus = async () => {
        if (!editingOrder || !newStatus) return

        try {
            await updateDoc(doc(db, 'orders', editingOrder.id), {
                status: newStatus,
                updated_at: serverTimestamp(),
            })
            toast.success('Order status updated')
            setEditingOrder(null)
            fetchOrders()
        } catch (error) {
            console.error('Error updating order:', error)
            toast.error('Failed to update order')
        }
    }

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.order_number.toLowerCase().includes(search.toLowerCase()) ||
            order.shipping_address?.full_name?.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter
        return matchesSearch && matchesStatus
    })

    if (authLoading || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Orders</h1>
                <p className="text-muted-foreground">{orders.length} total orders</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search orders..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Orders</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="shipped">Shipped</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-muted-foreground">No orders found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.order_number}</TableCell>
                                        <TableCell>{order.shipping_address?.full_name || 'N/A'}</TableCell>
                                        <TableCell>{order.items?.length || 0} items</TableCell>
                                        <TableCell>{formatPrice(order.total)}</TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[order.status] || 'bg-gray-100'}>
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(order.created_at)}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setEditingOrder(order); setNewStatus(order.status); }}
                                                >
                                                    Update
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Update Status Dialog */}
            <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Order Status</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Order: {editingOrder?.order_number}
                        </p>
                        <div>
                            <Label>Status</Label>
                            <Select value={newStatus} onValueChange={setNewStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingOrder(null)}>Cancel</Button>
                        <Button onClick={handleUpdateStatus} style={{ backgroundColor: settings.primary_color }}>
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
