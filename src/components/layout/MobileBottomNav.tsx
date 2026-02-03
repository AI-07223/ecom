"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Home,
  ShoppingBag,
  Grid3X3,
  ShoppingCart,
  User,
  Heart,
  Package,
  LogOut,
  Settings,
} from "lucide-react";
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
  { href: "/cart", label: "Cart", icon: ShoppingCart },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-[#E2E0DA] safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const isCart = item.href === "/cart";

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full tap-scale relative py-1"
              >
                <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${active ? "bg-[#2D5A27]/10" : ""
                  }`}>
                  <item.icon
                    className={`h-5 w-5 transition-colors duration-200 ${active ? "text-[#2D5A27]" : "text-[#9CA3AF]"
                      }`}
                  />
                  {isCart && itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] font-bold bg-[#2D5A27] text-white border-2 border-white">
                      {itemCount > 99 ? "99+" : itemCount}
                    </Badge>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-0.5 font-medium transition-colors duration-200 ${active ? "text-[#2D5A27]" : "text-[#9CA3AF]"
                    }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Profile Button */}
          <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 h-full tap-scale py-1">
                <div className="relative p-1.5 rounded-xl">
                  {user ? (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center ring-2 ring-white">
                      <span className="text-white text-[9px] font-bold">
                        {(profile?.full_name || user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <User className="h-5 w-5 text-[#9CA3AF]" />
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium text-[#9CA3AF]">
                  Profile
                </span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-auto max-h-[85vh] rounded-t-3xl p-0 bg-white border-t border-[#E2E0DA]"
            >
              {/* Pull indicator */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-[#E2E0DA]" />
              </div>

              {/* User Header */}
              <SheetHeader className="px-5 pb-4">
                <div className="flex items-center gap-4">
                  {user ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">
                          {(profile?.full_name || user.email || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <SheetTitle className="text-base text-[#1A1A1A] truncate text-left">
                          {profile?.full_name || "Welcome back"}
                        </SheetTitle>
                        <p className="text-sm text-[#6B7280] truncate">
                          {user.email}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-[#F0EFE8] border border-[#E2E0DA] flex items-center justify-center">
                        <User className="h-6 w-6 text-[#6B7280]" />
                      </div>
                      <div>
                        <SheetTitle className="text-base text-[#1A1A1A] text-left">
                          Guest
                        </SheetTitle>
                        <p className="text-sm text-[#6B7280]">
                          Sign in for a better experience
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </SheetHeader>

              {/* Quick Actions Grid */}
              <div className="px-5 pb-4">
                <div className="grid grid-cols-3 gap-3">
                  <Link
                    href="/wishlist"
                    onClick={() => setProfileOpen(false)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#F0EFE8] hover:bg-[#E8E7E0] transition-colors tap-scale"
                  >
                    <Heart className="h-6 w-6 text-[#2D5A27] mb-2" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Wishlist</span>
                  </Link>
                  <Link
                    href="/profile/orders"
                    onClick={() => setProfileOpen(false)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#F0EFE8] hover:bg-[#E8E7E0] transition-colors tap-scale"
                  >
                    <Package className="h-6 w-6 text-[#2D5A27] mb-2" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Orders</span>
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setProfileOpen(false)}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#F0EFE8] hover:bg-[#E8E7E0] transition-colors tap-scale relative"
                  >
                    <ShoppingCart className="h-6 w-6 text-[#2D5A27] mb-2" />
                    <span className="text-xs font-medium text-[#1A1A1A]">Cart</span>
                    {itemCount > 0 && (
                      <Badge className="absolute top-2 right-2 h-5 min-w-[20px] px-1.5 text-[10px] bg-[#2D5A27] text-white">
                        {itemCount}
                      </Badge>
                    )}
                  </Link>
                </div>
              </div>

              {/* Menu Links */}
              <div className="px-5 pb-5 max-h-[35vh] overflow-y-auto">
                <div className="space-y-1">
                  {user && (
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#F0EFE8] transition-colors tap-scale"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#F0EFE8] flex items-center justify-center">
                        <User className="h-5 w-5 text-[#6B7280]" />
                      </div>
                      <span className="text-sm font-medium text-[#1A1A1A]">My Profile</span>
                    </Link>
                  )}

                  {user && (
                    <Link
                      href="/profile/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#F0EFE8] transition-colors tap-scale"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#F0EFE8] flex items-center justify-center">
                        <Settings className="h-5 w-5 text-[#6B7280]" />
                      </div>
                      <span className="text-sm font-medium text-[#1A1A1A]">Settings</span>
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      href="/profile/admin"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-[#2D5A27]/10 hover:bg-[#2D5A27]/20 transition-colors tap-scale"
                    >
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-[#2D5A27]/20">
                        <Image
                          src="/logo.jpeg"
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-sm font-semibold text-[#2D5A27]">
                        Admin Dashboard
                      </span>
                    </Link>
                  )}

                  {user ? (
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 text-red-500 transition-colors mt-2 tap-scale"
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <LogOut className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium">Sign Out</span>
                    </button>
                  ) : (
                    <div className="flex gap-3 mt-4">
                      <Link
                        href="/login"
                        onClick={() => setProfileOpen(false)}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full rounded-2xl h-12 text-sm border-[#E2E0DA] text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F0EFE8] font-medium tap-scale"
                        >
                          Sign In
                        </Button>
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setProfileOpen(false)}
                        className="flex-1"
                      >
                        <Button className="w-full rounded-2xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white h-12 text-sm font-semibold tap-scale">
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
    </>
  );
}
