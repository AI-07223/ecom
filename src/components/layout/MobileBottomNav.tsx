"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useCallback } from "react";
import { Home, ShoppingBag, Grid3X3, ShoppingCart, User, Heart, Package, LogOut, Settings, Store, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: Grid3X3 },
  { href: "/products", label: "Shop", icon: ShoppingBag },
  { href: "/cart", label: "Cart", icon: ShoppingCart, showBadge: true },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const isActive = useCallback((href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }, [pathname]);

  // Hide on admin pages
  if (pathname.startsWith("/profile/admin")) return null;

  const handleTabPress = (href: string) => {
    setActiveTab(href);
    // Haptic feedback simulation via vibration API (if supported)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    setTimeout(() => setActiveTab(null), 150);
  };

  return (
    <>
      {/* Fixed Bottom Navigation - Native App Style */}
      <nav
        className={cn(
          "md:hidden fixed bottom-0 left-0 right-0 z-[100]",
          "bg-white/95 backdrop-blur-xl",
          "border-t border-[#E2E0DA]/80",
          "select-none",
          "transform-gpu will-change-transform",
          "transition-transform duration-300 ease-out"
        )}
        style={{
          height: "calc(64px + env(safe-area-inset-bottom, 0px))",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08), 0 -1px 3px rgba(0,0,0,0.04)",
        }}
        aria-label="Mobile navigation"
      >
        {/* Floating indicator background for active state */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[#2D5A27]/20 to-transparent" />

        <div className="flex items-stretch h-[64px]">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const isPressed = activeTab === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleTabPress(item.href)}
                onTouchStart={() => setActiveTab(item.href)}
                onTouchEnd={() => setTimeout(() => setActiveTab(null), 100)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center",
                  "relative overflow-hidden",
                  "tap-highlight-transparent"
                )}
              >
                {/* Active indicator dot */}
                {active && (
                  <span className="absolute top-1.5 w-1 h-1 rounded-full bg-[#2D5A27] animate-fade-in" />
                )}

                {/* Icon container with floating effect when active */}
                <div
                  className={cn(
                    "flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200",
                    active && "bg-[#2D5A27]/10 -translate-y-0.5",
                    isPressed && "scale-90 bg-[#2D5A27]/20",
                    !active && !isPressed && "hover:bg-gray-50"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-[22px] h-[22px] transition-all duration-200",
                      active ? "text-[#2D5A27] scale-110" : "text-gray-400",
                      isPressed && "scale-95"
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[11px] font-semibold leading-none mt-0.5 transition-all duration-200",
                    active ? "text-[#2D5A27]" : "text-gray-400",
                    isPressed && "scale-95 opacity-70"
                  )}
                >
                  {item.label}
                </span>

                {/* Cart badge */}
                {item.showBadge && itemCount > 0 && (
                  <Badge
                    className={cn(
                      "absolute top-0.5 right-[15%]",
                      "h-5 min-w-[20px] px-1.5",
                      "flex items-center justify-center",
                      "text-[10px] font-bold",
                      "bg-[#2D5A27] text-white",
                      "border-2 border-white rounded-full",
                      "shadow-sm",
                      "animate-scale-in"
                    )}
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </Badge>
                )}
              </Link>
            );
          })}

          {/* Profile Sheet Trigger */}
          <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
            <SheetTrigger asChild>
              <button
                onClick={() => handleTabPress("profile")}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center",
                  "relative overflow-hidden",
                  "tap-highlight-transparent",
                  "bg-transparent border-none p-0"
                )}
              >
                {/* Avatar container */}
                <div
                  className={cn(
                    "flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200",
                    profileOpen && "bg-[#2D5A27]/10 -translate-y-0.5"
                  )}
                >
                  {user ? (
                    <div className="relative">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md transition-transform duration-200",
                        profileOpen ? "scale-110" : "scale-100",
                        "bg-gradient-to-br from-[#2D5A27] to-[#4CAF50]"
                      )}>
                        {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                      {/* Online indicator */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                        profileOpen ? "bg-[#2D5A27]/10" : "bg-gray-100"
                      )}
                    >
                      <User className={cn(
                        "w-5 h-5 transition-colors",
                        profileOpen ? "text-[#2D5A27]" : "text-gray-400"
                      )} />
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold leading-none mt-0.5 transition-colors",
                    profileOpen ? "text-[#2D5A27]" : "text-gray-400"
                  )}
                >
                  Profile
                </span>
              </button>
            </SheetTrigger>

            {/* Profile Bottom Sheet - Native Style */}
            <SheetContent
              side="bottom"
              className="h-auto max-h-[85vh] rounded-t-[28px] p-0 bg-white border-0"
            >
              {/* Pull indicator */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1.5 rounded-full bg-gray-300" />
              </div>

              {/* User Header */}
              <SheetHeader className="px-5 pb-4">
                {user ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center shadow-lg shadow-[#2D5A27]/20">
                      <span className="text-white text-2xl font-bold">
                        {(profile?.full_name || user.email || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-lg text-[#1A1A1A] text-left font-bold">
                        {profile?.full_name || "Welcome back"}
                      </SheetTitle>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <User className="h-7 w-7 text-gray-400" />
                    </div>
                    <div>
                      <SheetTitle className="text-lg text-[#1A1A1A] text-left font-bold">Guest</SheetTitle>
                      <p className="text-sm text-gray-500">Sign in to access your account</p>
                    </div>
                  </div>
                )}
              </SheetHeader>

              {/* Quick Actions Grid */}
              <div className="px-5 pb-4">
                <div className="grid grid-cols-4 gap-3">
                  <Link
                    href="/wishlist"
                    onClick={() => setProfileOpen(false)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 tap-active hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2">
                      <Heart className="h-5 w-5 text-[#2D5A27]" />
                    </div>
                    <span className="text-xs font-semibold text-[#1A1A1A]">Wishlist</span>
                  </Link>
                  <Link
                    href="/profile/orders"
                    onClick={() => setProfileOpen(false)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 tap-active hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2">
                      <Package className="h-5 w-5 text-[#2D5A27]" />
                    </div>
                    <span className="text-xs font-semibold text-[#1A1A1A]">Orders</span>
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setProfileOpen(false)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 tap-active hover:bg-gray-100 transition-colors relative"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2">
                      <ShoppingCart className="h-5 w-5 text-[#2D5A27]" />
                    </div>
                    <span className="text-xs font-semibold text-[#1A1A1A]">Cart</span>
                    {itemCount > 0 && (
                      <Badge className="absolute top-3 right-3 h-5 min-w-[20px] px-1.5 text-[10px] bg-[#2D5A27] text-white border-2 border-white">
                        {itemCount > 99 ? "99+" : itemCount}
                      </Badge>
                    )}
                  </Link>
                  <Link
                    href="/profile/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 tap-active hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-2">
                      <Settings className="h-5 w-5 text-[#2D5A27]" />
                    </div>
                    <span className="text-xs font-semibold text-[#1A1A1A]">Settings</span>
                  </Link>
                </div>
              </div>

              {/* Menu Links */}
              <div className="px-5 pb-8 max-h-[40vh] overflow-y-auto no-scrollbar">
                <div className="space-y-1">
                  {user && (
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 tap-active transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <span className="text-sm font-semibold text-[#1A1A1A]">My Profile</span>
                    </Link>
                  )}

                  {profile?.role === "wholeseller" && (
                    <>
                      <Link
                        href="/item-request"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 tap-active transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Store className="h-5 w-5 text-gray-500" />
                        </div>
                        <span className="text-sm font-semibold text-[#1A1A1A]">Request Item</span>
                      </Link>
                      <Link
                        href="/profile/item-requests"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 tap-active transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                          <FileQuestion className="h-5 w-5 text-gray-500" />
                        </div>
                        <span className="text-sm font-semibold text-[#1A1A1A]">My Requests</span>
                      </Link>
                    </>
                  )}

                  {isAdmin && (
                    <Link
                      href="/profile/admin"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-[#2D5A27]/10 tap-active transition-colors"
                    >
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-[#2D5A27]/20 bg-white">
                        <Image src="/logo.jpeg" alt="" fill className="object-cover" />
                      </div>
                      <span className="text-sm font-bold text-[#2D5A27]">Admin Dashboard</span>
                    </Link>
                  )}

                  {user ? (
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 text-red-500 mt-2 tap-active transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <LogOut className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold">Sign Out</span>
                    </button>
                  ) : (
                    <div className="flex gap-3 mt-4">
                      <Link href="/login" onClick={() => setProfileOpen(false)} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full rounded-xl h-12 text-sm border-gray-200 text-gray-600 hover:text-[#1A1A1A] hover:bg-gray-50 font-semibold"
                        >
                          Sign In
                        </Button>
                      </Link>
                      <Link href="/signup" onClick={() => setProfileOpen(false)} className="flex-1">
                        <Button className="w-full rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white h-12 text-sm font-bold shadow-md shadow-[#2D5A27]/20">
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for bottom nav - matches nav height exactly */}
      <div
        className="md:hidden flex-shrink-0"
        style={{
          height: "calc(64px + env(safe-area-inset-bottom, 0px))",
        }}
        aria-hidden="true"
      />
    </>
  );
}
