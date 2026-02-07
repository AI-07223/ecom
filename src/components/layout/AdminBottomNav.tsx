"use client";

import { usePathname } from "next/navigation";
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
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

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
          "md:hidden fixed bottom-0 left-0 right-0 z-50",
          "bg-white border-t border-[#E2E0DA]",
          "touch-none select-none",
          "transform-gpu will-change-transform"
        )}
        style={{
          // Total height includes nav height + safe area
          height: "calc(64px + env(safe-area-inset-bottom, 0px))",
          // Safe area padding at bottom
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
        }}
        aria-label="Admin navigation"
      >
        {/* Flexbox container - Back, Dashboard, Products, Orders, More */}
        <div className="flex items-stretch h-full">
          {/* Back button */}
          <Link
            href="/profile"
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[44px] tap-active no-underline"
            )}
          >
            <div className="flex items-center justify-center w-11 h-11">
              <ArrowLeft className="w-5 h-5 text-[#6B7280]" />
            </div>
            <span className="text-[10px] font-medium leading-none mt-0.5 text-[#6B7280]">
              Back
            </span>
          </Link>

          {/* Dashboard */}
          <Link
            href="/profile/admin"
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[44px] tap-active no-underline",
              isActive("/profile/admin") && pathname === "/profile/admin"
                ? "bg-[#2D5A27]"
                : "bg-transparent"
            )}
          >
            <div className="flex items-center justify-center w-11 h-11">
              <LayoutDashboard
                className={cn(
                  "w-5 h-5",
                  isActive("/profile/admin") && pathname === "/profile/admin"
                    ? "text-white"
                    : "text-[#6B7280]"
                )}
              />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-none mt-0.5",
                isActive("/profile/admin") && pathname === "/profile/admin"
                  ? "text-white"
                  : "text-[#6B7280]"
              )}
            >
              Dash
            </span>
          </Link>

          {/* Products */}
          <Link
            href="/profile/admin/products"
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[44px] tap-active no-underline",
              isActive("/profile/admin/products")
                ? "bg-[#2D5A27]"
                : "bg-transparent"
            )}
          >
            <div className="flex items-center justify-center w-11 h-11">
              <Package
                className={cn(
                  "w-5 h-5",
                  isActive("/profile/admin/products")
                    ? "text-white"
                    : "text-[#6B7280]"
                )}
              />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-none mt-0.5",
                isActive("/profile/admin/products")
                  ? "text-white"
                  : "text-[#6B7280]"
              )}
            >
              Products
            </span>
          </Link>

          {/* Orders */}
          <Link
            href="/profile/admin/orders"
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[44px] tap-active no-underline",
              isActive("/profile/admin/orders")
                ? "bg-[#2D5A27]"
                : "bg-transparent"
            )}
          >
            <div className="flex items-center justify-center w-11 h-11">
              <ShoppingBag
                className={cn(
                  "w-5 h-5",
                  isActive("/profile/admin/orders")
                    ? "text-white"
                    : "text-[#6B7280]"
                )}
              />
            </div>
            <span
              className={cn(
                "text-[10px] font-medium leading-none mt-0.5",
                isActive("/profile/admin/orders")
                  ? "text-white"
                  : "text-[#6B7280]"
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
              >
                <div className="flex items-center justify-center w-11 h-11">
                  <Menu className="w-5 h-5 text-[#6B7280]" />
                </div>
                <span className="text-[10px] font-medium leading-none mt-0.5 text-[#6B7280]">
                  More
                </span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-auto max-h-[85vh] rounded-t-3xl p-0 border-t border-[#E2E0DA] bg-[#FAFAF5]"
            >
              {/* Pull indicator */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-[#E2E0DA]" />
              </div>

              {/* Admin Header with User Info */}
              <SheetHeader className="px-5 pb-4">
                <div className="flex items-center gap-3">
                  {/* Admin Badge */}
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#2D5A27]/10">
                    <Crown className="h-6 w-6 text-[#2D5A27]" />
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
                        >
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              active
                                ? "bg-white/20"
                                : "bg-[#F0EFE8]"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
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
