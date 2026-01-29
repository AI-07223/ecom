"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  FileQuestion,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Order, Product } from "@/types/database.types";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/profile");
    }
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return;

      try {
        // Fetch products
        const productsSnap = await getDocs(collection(db, "products"));
        const products = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        const productsCount = products.length;
        const lowStockCount = products.filter(
          (p) => p.is_active && p.quantity <= 5,
        ).length;
        const lowStock = products
          .filter((p) => p.is_active && p.quantity <= 5)
          .slice(0, 5);

        // Fetch orders
        const ordersSnap = await getDocs(collection(db, "orders"));
        const orders = ordersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        const ordersCount = orders.length;
        const pendingCount = orders.filter(
          (o) => o.status === "pending",
        ).length;

        // Get recent orders (sort client-side)
        const sortedOrders = [...orders]
          .sort((a, b) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const aTime = (a.created_at as any)?.seconds
              ? (a.created_at as any).seconds * 1000
              : 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bTime = (b.created_at as any)?.seconds
              ? (b.created_at as any).seconds * 1000
              : 0;
            return bTime - aTime;
          })
          .slice(0, 5);

        // Fetch users count
        const usersSnap = await getDocs(collection(db, "profiles"));
        const usersCount = usersSnap.size;

        // Calculate total revenue
        const totalRevenue = orders
          .filter((o) => o.payment_status === "paid")
          .reduce((sum, o) => sum + (o.total || 0), 0);

        setStats({
          totalProducts: productsCount,
          totalOrders: ordersCount,
          totalUsers: usersCount,
          totalRevenue,
          pendingOrders: pendingCount,
          lowStockProducts: lowStockCount,
        });
        setRecentOrders(sortedOrders);
        setLowStockItems(lowStock);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
      setIsLoading(false);
    };

    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `${settings.currency_symbol}${amount.toLocaleString("en-IN")}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const quickActions = [
    {
      icon: Plus,
      label: "Add Product",
      href: "/profile/admin/products?action=new",
      color: settings.accent_color,
    },
    {
      icon: FolderTree,
      label: "Add Category",
      href: "/profile/admin/categories?action=new",
      color: "#10b981",
    },
    {
      icon: ShoppingBag,
      label: "View Orders",
      href: "/profile/admin/orders",
      color: "#3b82f6",
    },
    {
      icon: Ticket,
      label: "Create Coupon",
      href: "/profile/admin/coupons?action=new",
      color: "#8b5cf6",
    },
    {
      icon: Users,
      label: "Manage Users",
      href: "/profile/admin/users",
      color: "#ec4899",
    },
    {
      icon: FileQuestion,
      label: "Item Requests",
      href: "/profile/admin/item-requests",
      color: "#f59e0b",
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/profile/admin/settings",
      color: "#6b7280",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b"
        style={{
          background: `linear-gradient(135deg, ${settings.accent_color}15 0%, ${settings.accent_color}05 50%, transparent 100%)`,
        }}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: `${settings.accent_color}20` }}
                >
                  <LayoutDashboard
                    className="h-6 w-6"
                    style={{ color: settings.accent_color }}
                  />
                </div>
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Welcome back! Here&apos;s your store overview.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/">View Store</Link>
              </Button>
              <Button
                asChild
                size="sm"
                style={{ backgroundColor: settings.accent_color }}
              >
                <Link href="/profile/admin/products?action=new">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))
          ) : (
            <>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Revenue
                        </p>
                        <p
                          className="text-2xl font-bold mt-1"
                          style={{ color: settings.accent_color }}
                        >
                          {formatCurrency(stats?.totalRevenue || 0)}
                        </p>
                      </div>
                      <div
                        className="p-3 rounded-xl"
                        style={{
                          backgroundColor: `${settings.accent_color}15`,
                        }}
                      >
                        <DollarSign
                          className="h-5 w-5"
                          style={{ color: settings.accent_color }}
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    className="px-5 py-2 text-xs flex items-center gap-1"
                    style={{ backgroundColor: `${settings.accent_color}08` }}
                  >
                    <TrendingUp
                      className="h-3 w-3"
                      style={{ color: settings.accent_color }}
                    />
                    <span className="text-muted-foreground">
                      From paid orders
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Orders
                        </p>
                        <p className="text-2xl font-bold mt-1">
                          {stats?.totalOrders || 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-100">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-5 py-2 text-xs flex items-center gap-1 ${(stats?.pendingOrders || 0) > 0 ? "bg-orange-50" : "bg-muted/50"}`}
                  >
                    {(stats?.pendingOrders || 0) > 0 ? (
                      <>
                        <Clock className="h-3 w-3 text-orange-500" />
                        <span className="text-orange-600 font-medium">
                          {stats?.pendingOrders} pending
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        All orders processed
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Products
                        </p>
                        <p className="text-2xl font-bold mt-1">
                          {stats?.totalProducts || 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-green-100">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-5 py-2 text-xs flex items-center gap-1 ${(stats?.lowStockProducts || 0) > 0 ? "bg-red-50" : "bg-muted/50"}`}
                  >
                    {(stats?.lowStockProducts || 0) > 0 ? (
                      <>
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span className="text-red-600 font-medium">
                          {stats?.lowStockProducts} low stock
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        Stock levels healthy
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Customers
                        </p>
                        <p className="text-2xl font-bold mt-1">
                          {stats?.totalUsers || 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-purple-100">
                        <UserCheck className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-2 text-xs flex items-center gap-1 bg-muted/50">
                    <span className="text-muted-foreground">
                      Registered users
                    </span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Jump to common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div
                    className="flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: `${action.color}10` }}
                  >
                    <div
                      className="p-2.5 rounded-lg mb-2"
                      style={{ backgroundColor: `${action.color}20` }}
                    >
                      <action.icon
                        className="h-5 w-5"
                        style={{ color: action.color }}
                      />
                    </div>
                    <span className="text-xs font-medium text-center">
                      {action.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile/admin/orders" className="text-xs">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No orders yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/profile/admin/orders?id=${order.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          Order #{order.id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.items?.length || 0} items •{" "}
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                      <Badge className={`ml-2 ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Low Stock Alert
                  {(stats?.lowStockProducts || 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {stats?.lowStockProducts}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Products running low on inventory
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile/admin/products" className="text-xs">
                  View All <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : lowStockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>All products are well stocked!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lowStockItems.map((product) => (
                    <Link
                      key={product.id}
                      href={`/profile/admin/products?action=edit&id=${product.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.sku || product.slug}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive" className="ml-2">
                        {product.quantity} left
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
