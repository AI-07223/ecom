"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Receipt,
  FileText,
  Building2,
  Save,
  X,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import Invoice from "@/components/orders/Invoice";

import type { Order, OrderItem, OrderStatus, PaymentStatus } from "@/types/database.types";

// Extended Order type with Firestore timestamp
interface OrderWithTimestamp extends Omit<Order, 'created_at' | 'updated_at'> {
  created_at: string | { toDate: () => Date } | Date;
  updated_at: string | { toDate: () => Date } | Date;
}

const statusSteps = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [order, setOrder] = useState<OrderWithTimestamp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>("pending");
  const [showInvoice, setShowInvoice] = useState(false);
  
  // Editing state
  const [editingItems, setEditingItems] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

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
          const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
          setOrder(orderData);
          setEditedItems(orderData.items || []);
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

  const formatDate = (date: string | { toDate: () => Date } | Date | undefined) => {
    if (!date) return "N/A";
    if (typeof date === "string") {
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    const d = "toDate" in date ? date.toDate() : date;
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleUpdateStatus = async () => {
    if (!order) return;
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

  const handleUpdatePaymentStatus = async (newPaymentStatus: PaymentStatus) => {
    if (!order) return;
    try {
      await updateDoc(doc(db, "orders", order.id), {
        payment_status: newPaymentStatus,
        updated_at: serverTimestamp(),
      });
      toast.success("Payment status updated");
      setOrder({ ...order, payment_status: newPaymentStatus });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    }
  };

  const handleSaveItems = async () => {
    if (!order) return;
    
    // Recalculate totals
    const newSubtotal = editedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newShipping = newSubtotal >= 999 ? 0 : 99;
    const newTotal = newSubtotal - order.discount + newShipping;

    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        items: editedItems,
        subtotal: newSubtotal,
        shipping: newShipping,
        total: newTotal,
        updated_at: serverTimestamp(),
      });
      toast.success("Order items updated");
      setOrder({ 
        ...order, 
        items: editedItems,
        subtotal: newSubtotal,
        shipping: newShipping,
        total: newTotal,
      });
      setEditingItems(false);
    } catch (error) {
      console.error("Error updating items:", error);
      toast.error("Failed to update items");
    }
    setIsUpdating(false);
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setEditedItems(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
        : item
    ));
  };

  const removeItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
    setShowDeleteConfirm(null);
  };

  const cancelEditing = () => {
    setEditedItems(order?.items || []);
    setEditingItems(false);
  };

  const getCurrentStepIndex = () =>
    statusSteps.findIndex((s) => s.key === order?.status);

  if (authLoading || !isAdmin || isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF5]">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6 bg-[#E2E0DA]" />
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 bg-[#E2E0DA]" />
              <Skeleton className="h-64 bg-[#E2E0DA]" />
            </div>
            <Skeleton className="h-96 bg-[#E2E0DA]" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;
  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-[#FAFAF5] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E0DA] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/profile/admin/orders")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-[#1A1A1A]">
                    {order.order_number}
                  </h1>
                  <Badge className={`${statusColors[order.status]} text-xs`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-[#6B7280]">
                  Placed on {formatDate(order.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInvoice(true)}
                className="h-9"
              >
                <Receipt className="h-4 w-4 mr-2" /> Invoice
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setNewStatus(order.status as OrderStatus);
                  setShowStatusDialog(true);
                }}
                className="h-9"
                style={{ backgroundColor: settings.primary_color }}
              >
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
              <Card className="border-[#E2E0DA] shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-[#1A1A1A]">Order Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Mobile Progress */}
                  <div className="sm:hidden">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${settings.accent_color}20` }}
                      >
                        {(() => {
                          const StepIcon =
                            statusSteps[currentStepIndex]?.icon || Package;
                          return (
                            <StepIcon
                              className="h-6 w-6"
                              style={{ color: settings.accent_color }}
                            />
                          );
                        })()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize text-[#1A1A1A]">{order.status}</p>
                        <p className="text-sm text-[#6B7280]">
                          Step {currentStepIndex + 1} of {statusSteps.length}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 bg-[#E2E0DA] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${((currentStepIndex + 1) / statusSteps.length) * 100}%`,
                          backgroundColor: settings.accent_color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Desktop Progress */}
                  <div className="hidden sm:flex justify-between relative">
                    {statusSteps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isActive = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      return (
                        <div
                          key={step.key}
                          className="flex flex-col items-center relative z-10"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                              isActive ? "text-white" : "bg-[#E2E0DA] text-[#9CA3AF]"
                            }`}
                            style={{
                              backgroundColor: isActive
                                ? isCurrent
                                  ? settings.accent_color
                                  : settings.primary_color
                                : undefined,
                            }}
                          >
                            <StepIcon className="h-5 w-5" />
                          </div>
                          <span
                            className={`text-xs mt-2 font-medium ${
                              isActive ? "text-[#1A1A1A]" : "text-[#9CA3AF]"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#E2E0DA] -z-0">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`,
                          backgroundColor: settings.primary_color,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card className="border-[#E2E0DA] shadow-soft">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base text-[#1A1A1A] flex items-center gap-2">
                  <Package className="h-4 w-4" /> Order Items ({editedItems.length})
                </CardTitle>
                {!editingItems ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItems(true)}
                    className="h-8"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" /> Edit Items
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      className="h-8"
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveItems}
                      disabled={isUpdating}
                      className="h-8"
                      style={{ backgroundColor: settings.primary_color }}
                    >
                      <Save className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(editingItems ? editedItems : order.items)?.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-3 p-3 bg-[#F0EFE8] rounded-xl"
                    >
                      {/* Product Image - Clickable to view product */}
                      <Link 
                        href={`/products/${item.product_id}`}
                        className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-lg shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        {item.product_image ? (
                          <Image
                            src={item.product_image}
                            alt={item.product_name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-[#9CA3AF]" />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/products/${item.product_id}`}>
                              <p className="font-medium text-sm sm:text-base text-[#1A1A1A] truncate hover:text-[#2D5A27] transition-colors">
                                {item.product_name}
                              </p>
                            </Link>
                            <p className="text-xs sm:text-sm text-[#6B7280]">
                              {formatPrice(item.price)} each
                            </p>
                          </div>
                          {editingItems && (
                            <button
                              onClick={() => setShowDeleteConfirm(index)}
                              className="text-red-500 p-1 hover:bg-red-50 rounded tap-active"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        
                        {/* Quantity Controls */}
                        {editingItems ? (
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center bg-white rounded-lg border border-[#E2E0DA]">
                              <button
                                onClick={() => updateItemQuantity(index, item.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center tap-active"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3.5 w-3.5 text-[#6B7280]" />
                              </button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-14 h-8 text-center text-sm border-0 p-0 focus-visible:ring-0"
                                min={1}
                              />
                              <button
                                onClick={() => updateItemQuantity(index, item.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center tap-active"
                              >
                                <Plus className="h-3.5 w-3.5 text-[#6B7280]" />
                              </button>
                            </div>
                            <p className="font-semibold text-sm text-[#2D5A27]">
                              = {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm text-[#6B7280]">Qty: {item.quantity}</p>
                            <p className="font-semibold text-sm sm:text-base text-[#2D5A27]">
                              {formatPrice(item.total)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* View Product Link */}
                {!editingItems && order.items && order.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#E2E0DA]">
                    <p className="text-xs text-[#6B7280] mb-2">Tap on any item to view product details</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card className="border-[#E2E0DA] shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1A1A1A] flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#F0EFE8] p-4 rounded-xl">
                  <p className="font-medium text-[#1A1A1A]">
                    {order.shipping_address?.full_name}
                  </p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    {order.shipping_address?.phone}
                  </p>
                  <p className="text-sm text-[#6B7280] mt-2">
                    {order.shipping_address?.street}
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    {order.shipping_address?.city},{" "}
                    {order.shipping_address?.state}{" "}
                    {order.shipping_address?.postal_code}
                  </p>
                  <p className="text-sm text-[#6B7280]">
                    {order.shipping_address?.country}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card className="border-[#E2E0DA] shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1A1A1A] flex items-center gap-2">
                  <User className="h-4 w-4" /> Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F0EFE8] flex items-center justify-center">
                      <Mail className="h-5 w-5 text-[#6B7280]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#6B7280]">Email</p>
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">
                        {order.user_email || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F0EFE8] flex items-center justify-center">
                      <Phone className="h-5 w-5 text-[#6B7280]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280]">Phone</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">
                        {order.shipping_address?.phone}
                      </p>
                    </div>
                  </div>
                </div>
                {order.gst_number && (
                  <div className="mt-4 pt-4 border-t border-[#E2E0DA]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280]">Customer GST Number</p>
                        <p className="text-sm font-medium font-mono text-[#1A1A1A]">
                          {order.gst_number}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card className="border-[#E2E0DA] shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-[#1A1A1A]">Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#6B7280] bg-[#F0EFE8] p-4 rounded-xl">
                    {order.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="lg:sticky lg:top-24 border-[#E2E0DA] shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1A1A1A]">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Payment Status</span>
                  <Select
                    value={order.payment_status}
                    onValueChange={(v) => handleUpdatePaymentStatus(v as PaymentStatus)}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <Badge className={`${paymentStatusColors[order.payment_status]} text-[10px] px-1.5 py-0`}>
                        {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {order.payment_method && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Method</span>
                    <span className="text-sm font-medium text-[#1A1A1A] capitalize">
                      {order.payment_method}
                    </span>
                  </div>
                )}
                <Separator className="bg-[#E2E0DA]" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Subtotal</span>
                    <span className="text-[#1A1A1A] font-medium">{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Shipping</span>
                    <span className="text-[#1A1A1A] font-medium">
                      {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                    </span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount</span>
                      <span className="font-medium">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                </div>
                <Separator className="bg-[#E2E0DA]" />
                <div className="flex justify-between font-bold text-lg">
                  <span className="text-[#1A1A1A]">Total</span>
                  <span style={{ color: settings.primary_color }}>
                    {formatPrice(order.total)}
                  </span>
                </div>
                {order.coupon_code && (
                  <div className="pt-2">
                    <p className="text-xs text-[#6B7280] mb-1">Coupon Applied</p>
                    <span className="inline-block font-mono text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                      {order.coupon_code}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice Card */}
            <Card className="border-[#E2E0DA] shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1A1A1A] flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Invoice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#E2E0DA]"
                  onClick={() => setShowInvoice(true)}
                >
                  <FileText className="h-4 w-4 mr-2" /> View Invoice
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#E2E0DA]"
                  onClick={() => setShowInvoice(true)}
                >
                  <Printer className="h-4 w-4 mr-2" /> Print Invoice
                </Button>
              </CardContent>
            </Card>

            <Card className="border-[#E2E0DA] shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1A1A1A]">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start border-[#E2E0DA]"
                  onClick={() => router.push("/profile/admin/orders")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Orders
                </Button>
                <Link href={`/profile/admin/users?search=${order.user_email}`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[#E2E0DA]"
                  >
                    <User className="h-4 w-4 mr-2" /> View Customer
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
              <SelectTrigger className="border-[#E2E0DA]">
                <SelectValue placeholder="Select status" />
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
              className="border-[#E2E0DA]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isUpdating || newStatus === order.status}
              style={{ backgroundColor: settings.primary_color }}
            >
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-[#1A1A1A]">Remove Item?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6B7280]">
            Are you sure you want to remove this item from the order?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
              className="border-[#E2E0DA]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm !== null && removeItem(showDeleteConfirm)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1A1A1A]">
              <FileText className="h-5 w-5" />
              Tax Invoice
            </DialogTitle>
          </DialogHeader>
          {order && <Invoice order={order} showActions={true} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
