"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Package,
  Calendar,
  ChevronRight,
  Filter,
  ImageIcon,
  X,
  User,
  ShoppingBag,
  ArrowDownUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Pagination } from "@/components/ui/pagination";

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
  user_email?: string;
  user_name?: string;
  user_phone?: string;
  status: string;
  payment_status: string;
  total: number;
  items: OrderItem[];
  created_at: { toDate: () => Date } | Date;
}

type SortField = "created_at" | "total" | "status";
type SortOrder = "asc" | "desc";

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

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/profile");
    }
  }, [user, isAdmin, authLoading, router]);

  const fetchOrders = async () => {
    try {
      const ordersSnap = await getDocs(collection(db, "orders"));
      const ordersData = ordersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchOrders();
  }, [isAdmin]);

  const formatPrice = (price: number) => {
    return `${settings.currency_symbol}${price.toLocaleString("en-IN")}`;
  };

  const formatDate = (date: { toDate: () => Date } | Date) => {
    const d = "toDate" in date ? date.toDate() : date;
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Enhanced filtering with search by product name, customer name, email, phone
  const filteredOrders = useMemo(() => {
    let result = orders.filter((order) => {
      // Search filter - search in order number, email, user name, phone, and product names
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.user_email?.toLowerCase().includes(searchLower) ||
        order.user_name?.toLowerCase().includes(searchLower) ||
        order.user_phone?.toLowerCase().includes(searchLower) ||
        order.items?.some((item) =>
          item.product_name.toLowerCase().includes(searchLower)
        );

      // Status filter
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      // Payment status filter
      const matchesPaymentStatus =
        paymentStatusFilter === "all" ||
        order.payment_status === paymentStatusFilter;

      // Date range filter
      let matchesDateRange = true;
      const orderDate =
        "toDate" in order.created_at
          ? order.created_at.toDate()
          : new Date(order.created_at);

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (orderDate < fromDate) matchesDateRange = false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) matchesDateRange = false;
      }

      return (
        matchesSearch && matchesStatus && matchesPaymentStatus && matchesDateRange
      );
    });

    // Sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "created_at":
          const dateA =
            "toDate" in a.created_at
              ? a.created_at.toDate()
              : new Date(a.created_at);
          const dateB =
            "toDate" in b.created_at
              ? b.created_at.toDate()
              : new Date(b.created_at);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case "total":
          comparison = a.total - b.total;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    orders,
    search,
    statusFilter,
    paymentStatusFilter,
    dateFrom,
    dateTo,
    sortField,
    sortOrder,
  ]);

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, paymentStatusFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPaymentStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const activeFiltersCount = [
    statusFilter !== "all",
    paymentStatusFilter !== "all",
    dateFrom !== "",
    dateTo !== "",
  ].filter(Boolean).length;

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E0DA] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Orders</h1>
              <p className="text-sm text-[#6B7280]">
                {filteredOrders.length} of {orders.length} orders
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder="Search by order #, customer, email, phone, or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 border-[#E2E0DA] focus:border-[#2D5A27] h-11"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-[#9CA3AF]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        {/* Filters Row */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs border-[#E2E0DA]">
              <Filter className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Payment Status Filter */}
          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-xs border-[#E2E0DA]">
              <span className="text-[10px] mr-1">₹</span>
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <div className="relative">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[130px] h-9 text-xs border-[#E2E0DA]"
              placeholder="From"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[130px] h-9 text-xs border-[#E2E0DA]"
              placeholder="To"
            />
          </div>

          {/* Sort */}
          <Select
            value={`${sortField}-${sortOrder}`}
            onValueChange={(v) => {
              const [field, order] = v.split("-") as [SortField, SortOrder];
              setSortField(field);
              setSortOrder(order);
            }}
          >
            <SelectTrigger className="w-[130px] h-9 text-xs border-[#E2E0DA]">
              <ArrowDownUp className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="total-desc">High to Low</SelectItem>
              <SelectItem value="total-asc">Low to High</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center h-9 px-3 text-xs rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl bg-[#E2E0DA]" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-[#E2E0DA]">
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 mx-auto text-[#9CA3AF] mb-4" />
              <h3 className="text-lg font-semibold mb-1 text-[#1A1A1A]">
                No orders found
              </h3>
              <p className="text-[#6B7280]">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/profile/admin/orders/${order.id}`}
                  className="block bg-white rounded-2xl border border-[#E2E0DA] p-4 hover:shadow-soft transition-all tap-scale"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-[#1A1A1A] text-sm sm:text-base">
                          {order.order_number}
                        </span>
                        <Badge
                          className={`${statusColors[order.status]} text-[10px] px-1.5 py-0`}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                        <User className="h-3 w-3" />
                        <span className="truncate">
                          {order.user_name || order.user_email || "Guest"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="font-bold text-base sm:text-lg"
                        style={{ color: settings.primary_color }}
                      >
                        {formatPrice(order.total)}
                      </p>
                      <Badge
                        className={`${
                          paymentStatusColors[order.payment_status]
                        } text-[10px] px-1.5 py-0 mt-1`}
                      >
                        {order.payment_status}
                      </Badge>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="flex items-center gap-3 mb-3 py-2 border-t border-b border-[#E2E0DA] overflow-x-auto no-scrollbar">
                      <div className="flex -space-x-2 shrink-0">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            className="relative w-9 h-9 rounded-lg border-2 border-white bg-[#F0EFE8] overflow-hidden"
                          >
                            {item.product_image ? (
                              <Image
                                src={item.product_image}
                                alt={item.product_name}
                                fill
                                className="object-cover"
                                sizes="36px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-3.5 w-3.5 text-[#9CA3AF]" />
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-9 h-9 rounded-lg border-2 border-white bg-[#E2E0DA] flex items-center justify-center">
                            <span className="text-[10px] font-medium text-[#6B7280]">
                              +{order.items.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#1A1A1A] truncate">
                          {order.items[0].product_name}
                          {order.items.length > 1 &&
                            ` +${order.items.length - 1} more`}
                        </p>
                        <p className="text-[10px] text-[#6B7280]">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                          items total
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(order.created_at)}</span>
                      {order.items && (
                        <span className="flex items-center gap-1 ml-2">
                          <ShoppingBag className="h-3 w-3" />
                          {order.items.length} products
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#9CA3AF]" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredOrders.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
