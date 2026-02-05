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
  ArrowRight,
  Plus,
  FileQuestion,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Order, Product } from "@/types/database.types";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  lowStockProducts: number;
  todayOrders: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
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

        // Fetch orders
        const ordersSnap = await getDocs(collection(db, "orders"));
        const orders = ordersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];

        // Fetch users
        const usersSnap = await getDocs(collection(db, "profiles"));

        // Calculate stats
        const paidOrders = orders.filter((o) => o.payment_status === "paid");
        const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        // Get today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = orders.filter((o) => {
          const orderDate = o.created_at ? new Date(o.created_at as any) : null;
          return orderDate && orderDate >= today;
        }).length;

        // Low stock items
        const lowStock = products
          .filter((p) => p.is_active && p.quantity <= 5)
          .slice(0, 5);

        // Recent orders
        const sortedOrders = [...orders]
          .sort((a, b) => {
            const aTime = (a.created_at as any)?.seconds
              ? (a.created_at as any).seconds * 1000
              : 0;
            const bTime = (b.created_at as any)?.seconds
              ? (b.created_at as any).seconds * 1000
              : 0;
            return bTime - aTime;
          })
          .slice(0, 5);

        setStats({
          totalProducts: products.length,
          totalOrders: orders.length,
          totalUsers: usersSnap.size,
          totalRevenue,
          pendingOrders: orders.filter((o) => o.status === "pending").length,
          processingOrders: orders.filter((o) => o.status === "processing").length,
          lowStockProducts: lowStock.length,
          todayOrders,
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      processing: "bg-blue-100 text-blue-700 border-blue-200",
      shipped: "bg-purple-100 text-purple-700 border-purple-200",
      delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
    };
    return styles[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const quickActions = [
    { icon: Plus, label: "Add Product", href: "/profile/admin/products?action=new", color: "#2D5A27" },
    { icon: FolderTree, label: "Category", href: "/profile/admin/categories?action=new", color: "#3b82f6" },
    { icon: ShoppingBag, label: "Orders", href: "/profile/admin/orders", color: "#8b5cf6" },
    { icon: Ticket, label: "Coupon", href: "/profile/admin/coupons?action=new", color: "#f59e0b" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF5] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E0DA] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Admin Dashboard</h1>
              <p className="text-sm text-[#6B7280]">Manage your store</p>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" className="rounded-xl border-[#E2E0DA]">
                View Store
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 space-y-4">
        {/* Revenue Card */}
        {isLoading ? (
          <Skeleton className="h-32 rounded-2xl bg-[#E2E0DA]" />
        ) : (
          <Card className="bg-gradient-to-br from-[#2D5A27] to-[#3B7D34] border-0 text-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.totalRevenue || 0)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 text-emerald-300 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      <span>{stats?.todayOrders} orders today</span>
                    </div>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 rounded-2xl bg-[#E2E0DA]" />
              <Skeleton className="h-24 rounded-2xl bg-[#E2E0DA]" />
              <Skeleton className="h-24 rounded-2xl bg-[#E2E0DA]" />
              <Skeleton className="h-24 rounded-2xl bg-[#E2E0DA]" />
            </>
          ) : (
            <>
              <Card className="border-[#E2E0DA] shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#1A1A1A]">{stats?.totalOrders}</p>
                      <p className="text-xs text-[#6B7280]">Total Orders</p>
                    </div>
                  </div>
                  {stats && stats.pendingOrders > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      {stats.pendingOrders} pending
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#E2E0DA] shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#1A1A1A]">{stats?.totalProducts}</p>
                      <p className="text-xs text-[#6B7280]">Products</p>
                    </div>
                  </div>
                  {stats && stats.lowStockProducts > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                      <TrendingDown className="h-3 w-3" />
                      {stats.lowStockProducts} low stock
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-[#E2E0DA] shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#1A1A1A]">{stats?.totalUsers}</p>
                      <p className="text-xs text-[#6B7280]">Customers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#E2E0DA] shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <ShoppingBag className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#1A1A1A]">{stats?.todayOrders}</p>
                      <p className="text-xs text-[#6B7280]">Today&apos;s Orders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="border-[#E2E0DA] shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#1A1A1A]">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href} className="tap-active">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: `${action.color}15` }}
                    >
                      <action.icon className="h-6 w-6" style={{ color: action.color }} />
                    </div>
                    <span className="text-xs font-medium text-[#1A1A1A] text-center">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="border-[#E2E0DA] shadow-soft">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#1A1A1A]">Recent Orders</CardTitle>
            <Link href="/profile/admin/orders">
              <Button variant="ghost" size="sm" className="text-[#2D5A27] h-8">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl bg-[#E2E0DA]" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-[#6B7280]">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/profile/admin/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F0EFE8] tap-active"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#1A1A1A] text-sm">
                          #{order.id.slice(-6).toUpperCase()}
                        </p>
                        <Badge variant="outline" className={`text-xs ${getStatusBadge(order.status)}`}>
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        {order.items?.length || 0} items • {formatCurrency(order.total)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="border-red-200 shadow-soft bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2">
                {lowStockItems.map((product) => (
                  <Link
                    key={product.id}
                    href={`/profile/admin/products?action=edit&id=${product.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-red-100 tap-active"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <Package className="h-5 w-5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1A1A] text-sm truncate">{product.name}</p>
                        <p className="text-xs text-[#6B7280]">{product.sku || "No SKU"}</p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {product.quantity} left
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Management Links */}
        <Card className="border-[#E2E0DA] shadow-soft">
          <CardContent className="p-0">
            {[
              { label: "All Products", href: "/profile/admin/products", icon: Package },
              { label: "Categories", href: "/profile/admin/categories", icon: FolderTree },
              { label: "All Orders", href: "/profile/admin/orders", icon: ShoppingBag },
              { label: "Customers", href: "/profile/admin/users", icon: Users },
              { label: "Coupons", href: "/profile/admin/coupons", icon: Ticket },
              { label: "Item Requests", href: "/profile/admin/item-requests", icon: FileQuestion },
              { label: "Settings", href: "/profile/admin/settings", icon: Settings },
            ].map((item, index, arr) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between p-4 tap-active ${
                  index !== arr.length - 1 ? "border-b border-[#E2E0DA]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F0EFE8] flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-[#2D5A27]" />
                  </div>
                  <span className="font-medium text-[#1A1A1A]">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
