'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Search, Package, MapPin, CreditCard, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/providers/AuthProvider'
import { useSiteSettings } from '@/providers/SiteSettingsProvider'
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'

interface OrderItem {
    product_id: string
    product_name: string
    quantity: number
    price: number
    thumbnail?: string
}

interface Order {
    id: string
    order_number: string
    user_id: string
    user_email?: string
    status: string
    payment_status: string
    payment_method?: string
    total: number
    subtotal?: number
    shipping_cost?: number
    items: OrderItem[]
    shipping_address: {
        full_name: string
        phone?: string
        address_line1?: string
        address_line2?: string
        city: string
        state?: string
        postal_code?: string
        country?: string
    }
    notes?: string
    created_at: { toDate: () => Date } | Date
    updated_at?: { toDate: () => Date } | Date
}

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
}

const paymentStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
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
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
    const [newStatus, setNewStatus] = useState('')

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/profile')
        }
    }, [user, isAdmin, authLoading, router])

    const fetchOrders = async () => {
        try {
            const ordersSnap = await getDocs(collection(db, 'orders'))
            const ordersData = ordersSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() })) as Order[]
            // Sort client-side to avoid index requirement
            ordersData.sort((a, b) => {
                const dateA = 'toDate' in a.created_at ? a.created_at.toDate() : a.created_at
                const dateB = 'toDate' in b.created_at ? b.created_at.toDate() : b.created_at
                return dateB.getTime() - dateA.getTime()
            })
            setOrders(ordersData)
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

    const formatDateTime = (date: { toDate: () => Date } | Date) => {
        const d = 'toDate' in date ? date.toDate() : date
        return d.toLocaleString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
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
        const matchesSearch = order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
            order.shipping_address?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            order.user_email?.toLowerCase().includes(search.toLowerCase())
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
                                    <TableHead className="w-[120px]"></TableHead>
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
                                                    onClick={() => setViewingOrder(order)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
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

            {/* Order Details Sheet */}
            <Sheet open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
                <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Order {viewingOrder?.order_number}
                        </SheetTitle>
                    </SheetHeader>

                    {viewingOrder && (
                        <div className="space-y-6 mt-6">
                            {/* Status & Payment */}
                            <div className="flex flex-wrap gap-2">
                                <Badge className={statusColors[viewingOrder.status] || 'bg-gray-100'}>
                                    {viewingOrder.status}
                                </Badge>
                                <Badge className={paymentStatusColors[viewingOrder.payment_status] || 'bg-gray-100'}>
                                    Payment: {viewingOrder.payment_status}
                                </Badge>
                            </div>

                            {/* Order Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDateTime(viewingOrder.created_at)}</span>
                                </div>
                                {viewingOrder.payment_method && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <CreditCard className="h-4 w-4" />
                                        <span>{viewingOrder.payment_method}</span>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Shipping Address */}
                            <div>
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Shipping Address
                                </h4>
                                <div className="text-sm text-muted-foreground space-y-1 pl-6">
                                    <p className="font-medium text-foreground">{viewingOrder.shipping_address?.full_name}</p>
                                    {viewingOrder.shipping_address?.phone && (
                                        <p>{viewingOrder.shipping_address.phone}</p>
                                    )}
                                    {viewingOrder.shipping_address?.address_line1 && (
                                        <p>{viewingOrder.shipping_address.address_line1}</p>
                                    )}
                                    {viewingOrder.shipping_address?.address_line2 && (
                                        <p>{viewingOrder.shipping_address.address_line2}</p>
                                    )}
                                    <p>
                                        {viewingOrder.shipping_address?.city}
                                        {viewingOrder.shipping_address?.state && `, ${viewingOrder.shipping_address.state}`}
                                        {viewingOrder.shipping_address?.postal_code && ` - ${viewingOrder.shipping_address.postal_code}`}
                                    </p>
                                    {viewingOrder.shipping_address?.country && (
                                        <p>{viewingOrder.shipping_address.country}</p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Order Items */}
                            <div>
                                <h4 className="font-medium mb-3">Order Items</h4>
                                <div className="space-y-3">
                                    {viewingOrder.items?.map((item, index) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{item.product_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Qty: {item.quantity} × {formatPrice(item.price)}
                                                </p>
                                            </div>
                                            <p className="font-medium">
                                                {formatPrice(item.quantity * item.price)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Order Summary */}
                            <div className="space-y-2 text-sm">
                                {viewingOrder.subtotal && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatPrice(viewingOrder.subtotal)}</span>
                                    </div>
                                )}
                                {viewingOrder.shipping_cost !== undefined && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Shipping</span>
                                        <span>{viewingOrder.shipping_cost === 0 ? 'Free' : formatPrice(viewingOrder.shipping_cost)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Total</span>
                                    <span style={{ color: settings.primary_color }}>
                                        {formatPrice(viewingOrder.total)}
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            {viewingOrder.notes && (
                                <>
                                    <Separator />
                                    <div>
                                        <h4 className="font-medium mb-2">Order Notes</h4>
                                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                            {viewingOrder.notes}
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    className="flex-1"
                                    onClick={() => {
                                        setViewingOrder(null)
                                        setEditingOrder(viewingOrder)
                                        setNewStatus(viewingOrder.status)
                                    }}
                                    style={{ backgroundColor: settings.primary_color }}
                                >
                                    Update Status
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

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
