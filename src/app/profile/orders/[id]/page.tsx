"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import Invoice from "@/components/orders/Invoice";

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
  created_at: { toDate: () => Date } | Date;
}

const statusSteps = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

const statusIcons: Record<string, typeof Package> = {
  pending: Clock,
  confirmed: CheckCircle,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/profile/orders");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!user || !orderId) return;

      try {
        const orderDoc = await getDoc(doc(db, "orders", orderId));

        if (orderDoc.exists()) {
          const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;

          // Verify order belongs to user
          if (orderData.user_id !== user.uid) {
            router.push("/profile/orders");
            return;
          }

          setOrder(orderData);
        } else {
          router.push("/profile/orders");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      }
      setIsLoading(false);
    };

    if (user) {
      fetchOrder();
    }
  }, [user, orderId, router]);

  const formatPrice = (price: number) => {
    return `${settings.currency_symbol}${price.toLocaleString("en-IN")}`;
  };

  const formatDate = (date: { toDate: () => Date } | Date) => {
    const d = "toDate" in date ? date.toDate() : date;
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || !user || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-4 w-48 mb-6" />
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const currentStepIndex = statusSteps.indexOf(order.status);
  const StatusIcon = statusIcons[order.status] || Package;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/profile" className="hover:text-foreground">
          Profile
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/profile/orders" className="hover:text-foreground">
          Orders
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{order.order_number}</span>
      </nav>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-muted-foreground">
            Placed on {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColors[order.status] || "bg-gray-100"}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
          {/* Invoice Button */}
          <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Receipt className="h-4 w-4 mr-2" />
                View Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tax Invoice
                </DialogTitle>
              </DialogHeader>
              <Invoice order={order} showActions={true} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status Progress */}
          {order.status !== "cancelled" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon className="h-5 w-5" />
                  Order Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="flex justify-between">
                    {statusSteps.map((step, index) => (
                      <div
                        key={step}
                        className="flex flex-col items-center flex-1 relative z-10"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                            index <= currentStepIndex
                              ? "bg-green-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="text-xs mt-2 text-center capitalize hidden sm:block">
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${
                          (currentStepIndex / (statusSteps.length - 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items ({order.items?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="relative w-20 h-20 bg-muted rounded-md shrink-0 overflow-hidden">
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
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <p className="font-medium">
                  {order.shipping_address.full_name}
                </p>
                <p>{order.shipping_address.phone}</p>
                <p>{order.shipping_address.address}</p>
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state}{" "}
                  {order.shipping_address.postal_code}
                </p>
                <p>{order.shipping_address.country}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {order.shipping === 0
                      ? "Free"
                      : formatPrice(order.shipping)}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span style={{ color: settings.primary_color }}>
                  {formatPrice(order.total)}
                </span>
              </div>

              <div className="pt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Payment:{" "}
                  <span className="capitalize font-medium">
                    {order.payment_status}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Method:{" "}
                  <span className="capitalize">
                    {order.payment_method === "cod"
                      ? "Cash on Delivery"
                      : order.payment_method || "N/A"}
                  </span>
                </p>
                {order.coupon_code && (
                  <p className="text-sm text-muted-foreground">
                    Coupon:{" "}
                    <span className="font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">
                      {order.coupon_code}
                    </span>
                  </p>
                )}
                {order.gst_number && (
                  <p className="text-sm text-muted-foreground">
                    Your GST:{" "}
                    <span className="font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">
                      {order.gst_number}
                    </span>
                  </p>
                )}
              </div>

              {/* View Invoice Button for Mobile */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-4">
                    <Receipt className="h-4 w-4 mr-2" />
                    View Invoice
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Tax Invoice
                    </DialogTitle>
                  </DialogHeader>
                  <Invoice order={order} showActions={true} />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
