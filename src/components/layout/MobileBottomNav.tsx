"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
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

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/categories", label: "Categories", icon: Grid3X3 },
  { href: "/products", label: "Shop", icon: ShoppingBag },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  // Hide on desktop and admin pages
  if (typeof window !== "undefined" && window.innerWidth >= 768) return null;
  if (pathname.startsWith("/profile/admin")) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 overflow-hidden">
        {/* Background with safe area */}
        <div className="bg-white border-t border-[#E2E0DA] pb-safe max-h-[80px]">
          <div className="flex items-center justify-around h-[64px]">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center flex-1 h-full tap-active"
                >
                  <div
                    className={`flex items-center justify-center w-12 h-8 rounded-full transition-all ${
                      active ? "bg-[#2D5A27]/10" : ""
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 transition-colors ${
                        active ? "text-[#2D5A27]" : "text-[#9CA3AF]"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-medium mt-0.5 transition-colors ${
                      active ? "text-[#2D5A27]" : "text-[#9CA3AF]"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Cart Tab */}
            <Link
              href="/cart"
              className="flex flex-col items-center justify-center flex-1 h-full tap-active relative"
            >
              <div
                className={`flex items-center justify-center w-12 h-8 rounded-full transition-all ${
                  isActive("/cart") ? "bg-[#2D5A27]/10" : ""
                }`}
              >
                <ShoppingCart
                  className={`h-5 w-5 transition-colors ${
                    isActive("/cart") ? "text-[#2D5A27]" : "text-[#9CA3AF]"
                  }`}
                />
                {itemCount > 0 && (
                  <Badge className="absolute top-0 right-2 h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold bg-[#2D5A27] text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </Badge>
                )}
              </div>
              <span
                className={`text-[11px] font-medium mt-0.5 transition-colors ${
                  isActive("/cart") ? "text-[#2D5A27]" : "text-[#9CA3AF]"
                }`}
              >
                Cart
              </span>
            </Link>

            {/* Profile Tab */}
            <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
              <SheetTrigger asChild>
                <button className="flex flex-col items-center justify-center flex-1 h-full tap-active">
                  <div className="flex items-center justify-center w-12 h-8">
                    {user ? (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center ring-2 ring-white">
                        <span className="text-white text-[10px] font-bold">
                          {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <User className="h-5 w-5 text-[#9CA3AF]" />
                    )}
                  </div>
                  <span className="text-[11px] font-medium mt-0.5 text-[#9CA3AF]">
                    Profile
                  </span>
                </button>
              </SheetTrigger>

              {/* Profile Bottom Sheet */}
              <SheetContent
                side="bottom"
                className="h-auto max-h-[85vh] rounded-t-3xl p-0 bg-white"
              >
                {/* Pull indicator */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-[#E2E0DA]" />
                </div>

                {/* User Header */}
                <SheetHeader className="px-5 pb-4">
                  {user ? (
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">
                          {(profile?.full_name || user.email || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-lg text-[#1A1A1A] text-left">
                          {profile?.full_name || "Welcome back"}
                        </SheetTitle>
                        <p className="text-sm text-[#6B7280] truncate">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#F0EFE8] border border-[#E2E0DA] flex items-center justify-center">
                        <User className="h-6 w-6 text-[#6B7280]" />
                      </div>
                      <div>
                        <SheetTitle className="text-lg text-[#1A1A1A] text-left">Guest</SheetTitle>
                        <p className="text-sm text-[#6B7280]">Sign in to access your account</p>
                      </div>
                    </div>
                  )}
                </SheetHeader>

                {/* Quick Actions */}
                <div className="px-5 pb-4">
                  <div className="grid grid-cols-4 gap-3">
                    <Link
                      href="/wishlist"
                      onClick={() => setProfileOpen(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#F0EFE8] tap-active"
                    >
                      <Heart className="h-6 w-6 text-[#2D5A27] mb-2" />
                      <span className="text-xs font-medium text-[#1A1A1A]">Wishlist</span>
                    </Link>
                    <Link
                      href="/profile/orders"
                      onClick={() => setProfileOpen(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#F0EFE8] tap-active"
                    >
                      <Package className="h-6 w-6 text-[#2D5A27] mb-2" />
                      <span className="text-xs font-medium text-[#1A1A1A]">Orders</span>
                    </Link>
                    <Link
                      href="/cart"
                      onClick={() => setProfileOpen(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#F0EFE8] tap-active relative"
                    >
                      <ShoppingCart className="h-6 w-6 text-[#2D5A27] mb-2" />
                      <span className="text-xs font-medium text-[#1A1A1A]">Cart</span>
                      {itemCount > 0 && (
                        <Badge className="absolute top-3 right-3 h-5 min-w-[20px] px-1.5 text-[10px] bg-[#2D5A27] text-white">
                          {itemCount}
                        </Badge>
                      )}
                    </Link>
                    <Link
                      href="/profile/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#F0EFE8] tap-active"
                    >
                      <Settings className="h-6 w-6 text-[#2D5A27] mb-2" />
                      <span className="text-xs font-medium text-[#1A1A1A]">Settings</span>
                    </Link>
                  </div>
                </div>

                {/* Menu Links */}
                <div className="px-5 pb-6 max-h-[40vh] overflow-y-auto">
                  <div className="space-y-1">
                    {user && (
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#F0EFE8] tap-active"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#F0EFE8] flex items-center justify-center">
                          <User className="h-5 w-5 text-[#6B7280]" />
                        </div>
                        <span className="text-sm font-medium text-[#1A1A1A]">My Profile</span>
                      </Link>
                    )}

                    {profile?.is_wholeseller && (
                      <>
                        <Link
                          href="/item-request"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#F0EFE8] tap-active"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#F0EFE8] flex items-center justify-center">
                            <Store className="h-5 w-5 text-[#6B7280]" />
                          </div>
                          <span className="text-sm font-medium text-[#1A1A1A]">Request Item</span>
                        </Link>
                        <Link
                          href="/profile/item-requests"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#F0EFE8] tap-active"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#F0EFE8] flex items-center justify-center">
                            <FileQuestion className="h-5 w-5 text-[#6B7280]" />
                          </div>
                          <span className="text-sm font-medium text-[#1A1A1A]">My Requests</span>
                        </Link>
                      </>
                    )}

                    {isAdmin && (
                      <Link
                        href="/profile/admin"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-[#2D5A27]/10 tap-active"
                      >
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-[#2D5A27]/20">
                          <Image src="/logo.jpeg" alt="" fill className="object-cover" />
                        </div>
                        <span className="text-sm font-semibold text-[#2D5A27]">Admin Dashboard</span>
                      </Link>
                    )}

                    {user ? (
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 text-red-500 mt-2 tap-active"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                          <LogOut className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium">Sign Out</span>
                      </button>
                    ) : (
                      <div className="flex gap-3 mt-4">
                        <Link href="/login" onClick={() => setProfileOpen(false)} className="flex-1">
                          <Button
                            variant="outline"
                            className="w-full rounded-xl h-12 text-sm border-[#E2E0DA] text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F0EFE8] font-medium"
                          >
                            Sign In
                          </Button>
                        </Link>
                        <Link href="/signup" onClick={() => setProfileOpen(false)} className="flex-1">
                          <Button className="w-full rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white h-12 text-sm font-semibold">
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
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-[64px] md:hidden" />
    </>
  );
}
