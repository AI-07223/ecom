"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Ticket,
  Settings,
  Menu,
  ArrowLeft,
  FileQuestion,
  User,
  LogOut,
  Crown,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const adminNavItems: NavItem[] = [
  { href: "/profile/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile/admin/products", label: "Products", icon: Package },
  { href: "/profile/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/profile/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/profile/admin/users", label: "Users", icon: Users },
  { href: "/profile/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/profile/admin/item-requests", label: "Requests", icon: FileQuestion },
  { href: "/profile/admin/settings", label: "Settings", icon: Settings },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleTabPress = (href: string) => {
    setActiveTab(href);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    setTimeout(() => setActiveTab(null), 150);
  };

  const isActive = (href: string) => {
    if (href === "/profile/admin") return pathname === "/profile/admin";
    return pathname.startsWith(href);
  };

  // Only show on admin pages
  if (!pathname.startsWith("/profile/admin")) return null;

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <>
      {/* Fixed Admin Bottom Navigation */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-[100]",
          "bg-white/95 backdrop-blur-xl border-t border-[#E2E0DA]/80",
          "select-none",
          "transform-gpu will-change-transform"
        )}
        style={{
          // Total height includes nav height + safe area
          height: "calc(64px + env(safe-area-inset-bottom, 0px))",
          // Safe area padding at bottom
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08), 0 -1px 3px rgba(0,0,0,0.04)",
        }}
        aria-label="Admin navigation"
      >
        {/* Flexbox container - Back, Dashboard, Products, Orders, More */}
        <div className="flex items-stretch h-full">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[44px] tap-active"
            )}
            aria-label="Go back"
          >
            <div className="flex items-center justify-center w-12 h-12">
              <ArrowLeft className="w-6 h-6 text-gray-500" strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-gray-500">Back</span>
          </button>

          {/* Dashboard */}
          <Link
            href="/profile/admin"
            onClick={() => handleTabPress("/profile/admin")}
            onTouchStart={() => setActiveTab("/profile/admin")}
            onTouchEnd={() => setTimeout(() => setActiveTab(null), 100)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[44px] tap-active no-underline"
            )}
            aria-current={isActive("/profile/admin") && pathname === "/profile/admin" ? "page" : undefined}
            aria-label="Admin Dashboard"
          >
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                (isActive("/profile/admin") && pathname === "/profile/admin" || activeTab === "/profile/admin") && "bg-[#2D5A27]/10 -translate-y-0.5"
              )}
            >
              <LayoutDashboard
                className={cn(
                  "w-6 h-6 transition-all duration-200",
                  isActive("/profile/admin") && pathname === "/profile/admin"
                    ? "text-[#2D5A27] scale-110"
                    : "text-gray-500"
                )}
                strokeWidth={isActive("/profile/admin") && pathname === "/profile/admin" ? 2.5 : 2}
              />
            </div>
            <span
              className={cn(
                "text-xs font-semibold leading-none mt-0.5",
                isActive("/profile/admin") && pathname === "/profile/admin"
                  ? "text-[#2D5A27]"
                  : "text-gray-500"
              )}
            >
              Dash
            </span>
          </Link>

          {/* Products */}
          <Link
            href="/profile/admin/products"
            onClick={() => handleTabPress("/profile/admin/products")}
            onTouchStart={() => setActiveTab("/profile/admin/products")}
            onTouchEnd={() => setTimeout(() => setActiveTab(null), 100)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[44px] tap-active no-underline"
            )}
            aria-current={isActive("/profile/admin/products") ? "page" : undefined}
          >
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                (isActive("/profile/admin/products") || activeTab === "/profile/admin/products") && "bg-[#2D5A27]/10 -translate-y-0.5"
              )}
            >
              <Package
                className={cn(
                  "w-6 h-6 transition-all duration-200",
                  isActive("/profile/admin/products")
                    ? "text-[#2D5A27] scale-110"
                    : "text-gray-500"
                )}
                strokeWidth={isActive("/profile/admin/products") ? 2.5 : 2}
              />
            </div>
            <span
              className={cn(
                "text-xs font-semibold leading-none mt-0.5",
                isActive("/profile/admin/products")
                  ? "text-[#2D5A27]"
                  : "text-gray-500"
              )}
            >
              Products
            </span>
          </Link>

          {/* Orders */}
          <Link
            href="/profile/admin/orders"
            onClick={() => handleTabPress("/profile/admin/orders")}
            onTouchStart={() => setActiveTab("/profile/admin/orders")}
            onTouchEnd={() => setTimeout(() => setActiveTab(null), 100)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[44px] tap-active no-underline"
            )}
            aria-current={isActive("/profile/admin/orders") ? "page" : undefined}
          >
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                (isActive("/profile/admin/orders") || activeTab === "/profile/admin/orders") && "bg-[#2D5A27]/10 -translate-y-0.5"
              )}
            >
              <ShoppingBag
                className={cn(
                  "w-6 h-6 transition-all duration-200",
                  isActive("/profile/admin/orders")
                    ? "text-[#2D5A27] scale-110"
                    : "text-gray-500"
                )}
                strokeWidth={isActive("/profile/admin/orders") ? 2.5 : 2}
              />
            </div>
            <span
              className={cn(
                "text-xs font-semibold leading-none mt-0.5",
                isActive("/profile/admin/orders")
                  ? "text-[#2D5A27]"
                  : "text-gray-500"
              )}
            >
              Orders
            </span>
          </Link>

          {/* More Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex-1 flex flex-col items-center justify-center",
                  "min-h-[44px] tap-active",
                  "bg-transparent border-none"
                )}
                aria-label="More admin options"
                aria-expanded={isOpen}
                aria-haspopup="dialog"
              >
                <div className="flex items-center justify-center w-12 h-12" aria-hidden="true">
                  <Menu className="w-6 h-6 text-gray-500" aria-hidden="true" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold leading-none mt-0.5 text-gray-500">
                  More
                </span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-auto max-h-[85vh] rounded-t-3xl p-0 border-t border-[#E2E0DA] bg-[#FAFAF5]"
              aria-label="Admin menu"
            >
              {/* Pull indicator - decorative */}
              <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
                <div className="w-12 h-1.5 rounded-full bg-[#E2E0DA]" />
              </div>

              {/* Admin Header with User Info */}
              <SheetHeader className="px-5 pb-4">
                <SheetDescription className="sr-only">
                  Admin menu. Access all admin functions including products, categories, orders, users, coupons, and settings.
                </SheetDescription>
                <div className="flex items-center gap-3">
                  {/* Admin Badge */}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#2D5A27]/10" aria-hidden="true">
                    <Crown className="h-6 w-6 text-[#2D5A27]" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="text-base truncate text-[#1A1A1A]">
                        Admin Panel
                      </SheetTitle>
                      <Badge className="text-[10px] px-1.5 py-0 bg-[#2D5A27] text-white">
                        Admin
                      </Badge>
                    </div>
                    <p className="text-xs truncate text-[#6B7280]">
                      {profile?.full_name || user?.email || "Administrator"}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              {/* All Admin Menu Items */}
              <div className="overflow-y-auto max-h-[calc(85vh-200px)] px-5 pb-8">
                <div className="grid grid-cols-1 gap-2">
                  {adminNavItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <SheetClose key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-xl transition-all duration-200 tap-active",
                            active
                              ? "bg-[#2D5A27] text-white font-medium"
                              : "bg-white text-[#1A1A1A] hover:bg-[#F0EFE8] border border-[#E2E0DA]"
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              active
                                ? "bg-white/20"
                                : "bg-[#F0EFE8]"
                            )}
                            aria-hidden="true"
                          >
                            <item.icon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium">{item.label}</span>
                            {item.description && (
                              <p
                                className={cn(
                                  "text-xs",
                                  active ? "text-white/80" : "text-[#6B7280]"
                                )}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                          {active && <div className="w-2 h-2 rounded-full bg-white" />}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>

                {/* User Actions */}
                <div className="mt-4 space-y-2">
                  <SheetClose asChild>
                    <Link
                      href="/profile"
                      className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 tap-active bg-white text-[#1A1A1A] border border-[#E2E0DA] hover:bg-[#F0EFE8]"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F0EFE8]">
                        <User className="h-5 w-5 text-[#2D5A27]" />
                      </div>
                      <span className="text-sm font-medium">My Profile</span>
                    </Link>
                  </SheetClose>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left tap-active bg-red-50 text-red-600 border border-red-200"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
                      <LogOut className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for admin bottom nav */}
      <div
        className="md:hidden"
        style={{
          height: "calc(64px + env(safe-area-inset-bottom, 0px))",
        }}
        aria-hidden="true"
      />
    </>
  );
}
