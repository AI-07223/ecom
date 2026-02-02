"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  User,
  Mail,
  Phone,
  Printer,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface OrderItem {
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user_email?: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  subtotal: number;
  shipping: number;
  discount: number;
  coupon_code?: string | null;
  gst_number?: string | null;
  total: number;
  shipping_address: {
    full_name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items: OrderItem[];
  notes?: string;
  created_at: { toDate: () => Date } | Date;
}

const statusSteps = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/profile");
    }
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        if (orderDoc.exists()) {
          setOrder({ id: orderDoc.id, ...orderDoc.data() } as Order);
        } else {
          toast.error("Order not found");
          router.push("/profile/admin/orders");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("Failed to load order");
      }
      setIsLoading(false);
    };
    if (isAdmin) fetchOrder();
  }, [orderId, isAdmin, router]);

  const formatPrice = (price: number) => {
    return `${settings.currency_symbol}${price.toLocaleString("en-IN")}`;
  };

  const formatDate = (date: { toDate: () => Date } | Date | undefined) => {
    if (!date) return "N/A";
    const d = "toDate" in date ? date.toDate() : date;
    return d.toLocaleDateString("en-IN", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const handleUpdateStatus = async () => {
    if (!order || !newStatus) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
        updated_at: serverTimestamp(),
      });
      toast.success("Order status updated");
      setOrder({ ...order, status: newStatus });
      setShowStatusDialog(false);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
    setIsUpdating(false);
  };

  const handlePrint = () => window.print();
  const getCurrentStepIndex = () => statusSteps.findIndex((s) => s.key === order?.status);

  if (authLoading || !isAdmin || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-32" /><Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!order) return null;
  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push("/profile/admin/orders")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{order.order_number}</h1>
                  <Badge className={statusColors[order.status]}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Placed on {formatDate(order.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex">
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button size="sm" onClick={() => { setNewStatus(order.status); setShowStatusDialog(true); }}
                style={{ backgroundColor: settings.primary_color }}>
                <Edit className="h-4 w-4 mr-2" /> Update Status
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Progress */}
            {order.status !== "cancelled" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Order Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Mobile Progress */}
                  <div className="sm:hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${settings.accent_color}20` }}>
                        {(() => {
                          const StepIcon = statusSteps[currentStepIndex]?.icon || Package;
                          return <StepIcon className="h-6 w-6" style={{ color: settings.accent_color }} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">{order.status}</p>
                        <p className="text-sm text-muted-foreground">Step {currentStepIndex + 1} of {statusSteps.length}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${((currentStepIndex + 1) / statusSteps.length) * 100}%`, backgroundColor: settings.accent_color }} />
                    </div>
                  </div>

                  {/* Desktop Progress */}
                  <div className="hidden sm:flex justify-between relative">
                    {statusSteps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isActive = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      return (
                        <div key={step.key} className="flex flex-col items-center relative z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? "text-white" : "bg-muted text-muted-foreground"}`}
                            style={{ backgroundColor: isActive ? (isCurrent ? settings.accent_color : settings.primary_color) : undefined }}>
                            <StepIcon className="h-5 w-5" />
                          </div>
                          <span className={`text-xs mt-2 font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
                        </div>
                      );
                    })}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0">
                      <div className="h-full transition-all"
                        style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`, backgroundColor: settings.primary_color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" /> Order Items ({order.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-md shrink-0 overflow-hidden">
                        {item.product_image ? (
                          <Image src={item.product_image} alt={item.product_name} fill className="object-cover" sizes="80px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{item.product_name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{formatPrice(item.price)} × {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm sm:text-base">{formatPrice(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="font-medium">{order.shipping_address.full_name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{order.shipping_address.phone}</p>
                  <p className="text-sm text-muted-foreground mt-2">{order.shipping_address.address}</p>
                  <p className="text-sm text-muted-foreground">{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                  <p className="text-sm text-muted-foreground">{order.shipping_address.country}</p>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" /> Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium truncate">{order.user_email || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{order.shipping_address.phone}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Order Notes</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="lg:sticky lg:top-24">
              <CardHeader className="pb-3"><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payment</span>
                  <Badge className={paymentStatusColors[order.payment_status]}>
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </Badge>
                </div>
                {order.payment_method && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Method</span>
                    <span className="text-sm font-medium capitalize">{order.payment_method}</span>
                  </div>
                )}
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</span></div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span style={{ color: settings.primary_color }}>{formatPrice(order.total)}</span>
                </div>
                {order.coupon_code && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Coupon Applied</p>
                    <span className="inline-block font-mono text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{order.coupon_code}</span>
                  </div>
                )}
                {order.gst_number && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">GST Number</p>
                    <span className="font-mono text-xs">{order.gst_number}</span>
                  </div>
                )}
                <div className="sm:hidden pt-4">
                  <Button variant="outline" className="w-full" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" /> Print Order
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push("/profile/admin/orders")}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/profile/admin/users?search=${order.user_email}`)}>
                  <User className="h-4 w-4 mr-2" /> View Customer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Order Status</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating || newStatus === order.status}
              style={{ backgroundColor: settings.primary_color }}>
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
