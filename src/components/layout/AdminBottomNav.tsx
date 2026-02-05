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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
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
  const { settings } = useSiteSettings();
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Use app theme colors - green/cream
  const bgColor = "#FAFAF5";
  const borderColor = "#E2E0DA";
  const primaryColor = settings.primary_color;
  const textColor = "#1A1A1A";
  const mutedTextColor = "#6B7280";
  const cardBg = "#FFFFFF";
  const hoverBg = "#F0EFE8";

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
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-full bg-white border-t touch-none select-none"
      style={{ 
        borderColor: borderColor,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
      }}
    >
      {/* Fixed 5-column grid layout */}
      <div className="grid grid-cols-5 h-[68px] w-full">
        {/* Back button */}
        <Link
          href="/profile"
          className="flex flex-col items-center justify-center h-full tap-active no-underline"
          style={{ backgroundColor: hoverBg }}
        >
          <div className="flex items-center justify-center w-10 h-9">
            <ArrowLeft className="h-[20px] w-[20px] text-[#2D5A27]" />
          </div>
          <span className="text-[10px] font-medium text-[#6B7280]">Back</span>
        </Link>

        {/* Dashboard */}
        <Link
          href="/profile/admin"
          className="flex flex-col items-center justify-center h-full tap-active no-underline"
          style={{
            backgroundColor: isActive("/profile/admin") && pathname === "/profile/admin" ? primaryColor : "transparent",
          }}
        >
          <div className="flex items-center justify-center w-10 h-9">
            <LayoutDashboard
              className="h-[20px] w-[20px]"
              style={{ color: isActive("/profile/admin") && pathname === "/profile/admin" ? "#ffffff" : mutedTextColor }}
            />
          </div>
          <span
            className="text-[10px] font-medium"
            style={{ color: isActive("/profile/admin") && pathname === "/profile/admin" ? "#ffffff" : mutedTextColor }}
          >
            Dash
          </span>
        </Link>

        {/* Products */}
        <Link
          href="/profile/admin/products"
          className="flex flex-col items-center justify-center h-full tap-active no-underline"
          style={{
            backgroundColor: isActive("/profile/admin/products") ? primaryColor : "transparent",
          }}
        >
          <div className="flex items-center justify-center w-10 h-9">
            <Package
              className="h-[20px] w-[20px]"
              style={{ color: isActive("/profile/admin/products") ? "#ffffff" : mutedTextColor }}
            />
          </div>
          <span
            className="text-[10px] font-medium"
            style={{ color: isActive("/profile/admin/products") ? "#ffffff" : mutedTextColor }}
          >
            Products
          </span>
        </Link>

        {/* Orders */}
        <Link
          href="/profile/admin/orders"
          className="flex flex-col items-center justify-center h-full tap-active no-underline"
          style={{
            backgroundColor: isActive("/profile/admin/orders") ? primaryColor : "transparent",
          }}
        >
          <div className="flex items-center justify-center w-10 h-9">
            <ShoppingBag
              className="h-[20px] w-[20px]"
              style={{ color: isActive("/profile/admin/orders") ? "#ffffff" : mutedTextColor }}
            />
          </div>
          <span
            className="text-[10px] font-medium"
            style={{ color: isActive("/profile/admin/orders") ? "#ffffff" : mutedTextColor }}
          >
            Orders
          </span>
        </Link>

        {/* More Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center h-full tap-active bg-transparent border-none">
              <div className="flex items-center justify-center w-10 h-9">
                <Menu className="h-[20px] w-[20px] text-[#6B7280]" />
              </div>
              <span className="text-[10px] font-medium text-[#6B7280]">More</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-auto max-h-[85vh] rounded-t-3xl p-0 border-t"
            style={{
              backgroundColor: bgColor,
              borderColor: borderColor,
            }}
          >
            {/* Pull indicator */}
            <div className="flex justify-center pt-3 pb-2">
              <div
                className="w-12 h-1.5 rounded-full"
                style={{ backgroundColor: `${primaryColor}40` }}
              />
            </div>

            {/* Admin Header with User Info */}
            <SheetHeader className="px-6 pb-4">
              <div className="flex items-center gap-3">
                {/* Admin Badge */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${settings.accent_color}30, ${primaryColor}30)`,
                  }}
                >
                  <Crown className="h-6 w-6" style={{ color: primaryColor }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-base truncate" style={{ color: textColor }}>
                      Admin Panel
                    </SheetTitle>
                    <Badge
                      className="text-[10px] px-1.5 py-0"
                      style={{ backgroundColor: primaryColor, color: "#ffffff" }}
                    >
                      Admin
                    </Badge>
                  </div>
                  <p className="text-xs truncate" style={{ color: mutedTextColor }}>
                    {profile?.full_name || user?.email || "Administrator"}
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* All Admin Menu Items */}
            <div className="overflow-y-auto max-h-[calc(85vh-200px)] px-6 pb-8">
              <div className="grid grid-cols-1 gap-1">
                {adminNavItems.map((item, index) => {
                  const active = isActive(item.href);
                  return (
                    <SheetClose key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl",
                          "transition-all duration-200 tap-scale",
                          active ? "font-medium" : "hover:opacity-80"
                        )}
                        style={{
                          backgroundColor: active
                            ? primaryColor
                            : index % 2 === 0
                              ? cardBg
                              : "transparent",
                          color: active ? "#ffffff" : textColor,
                          border: active ? "none" : `1px solid ${index % 2 === 0 ? borderColor : "transparent"}`,
                        }}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            active && "shadow-sm"
                          )}
                          style={{
                            backgroundColor: active ? "rgba(255,255,255,0.2)" : hoverBg,
                          }}
                        >
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.description && (
                            <p
                              className="text-xs"
                              style={{ color: active ? "rgba(255,255,255,0.8)" : mutedTextColor }}
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
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 tap-active"
                    style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: hoverBg }}
                    >
                      <User className="h-5 w-5 text-[#2D5A27]" />
                    </div>
                    <span className="text-sm font-medium">My Profile</span>
                  </Link>
                </SheetClose>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left tap-active"
                  style={{
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                  }}
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
  );
}
