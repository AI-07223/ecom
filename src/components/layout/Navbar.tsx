"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/categories", label: "Categories" },
  { href: "/products", label: "Products" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHomePage = pathname === "/";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-light safe-area-top">
      <nav className="container mx-auto px-3 sm:px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-[#2D5A27]/20 group-hover:border-[#2D5A27]/40 transition-colors">
              <Image
                src="/logo.jpeg"
                alt="Royal Trading Company"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#2D5A27] leading-tight">
                Royal Trading
              </span>
              <span className="text-[9px] text-[#6B7280] tracking-widest uppercase">
                Company
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${pathname === link.href
                  ? "text-[#2D5A27] bg-[#2D5A27]/10"
                  : "text-[#6B7280] hover:text-[#2D5A27] hover:bg-[#F0EFE8]"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Bar - Desktop */}
          <div className="flex-1 max-w-md mx-6">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                type="search"
                placeholder="Search products..."
                className="pl-10 pr-4 h-10 rounded-full bg-[#F0EFE8] border-[#E2E0DA] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Right Side Actions - Desktop */}
          <div className="flex items-center space-x-1">
            <Link href="/wishlist">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-[#2D5A27]/10 hover:text-[#2D5A27] text-[#6B7280]"
              >
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            <Link href="/cart" className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-[#2D5A27]/10 hover:text-[#2D5A27] text-[#6B7280]"
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-[#2D5A27] text-white border-2 border-white">
                    {itemCount > 99 ? "99+" : itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-[#F0EFE8]"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {(profile?.full_name || user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-xl bg-white border-[#E2E0DA] shadow-soft-lg"
                >
                  <div className="px-3 py-2 border-b border-[#E2E0DA]">
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer text-[#6B7280] focus:text-[#1A1A1A] focus:bg-[#F0EFE8]"
                  >
                    <Link href="/profile">My Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer text-[#6B7280] focus:text-[#1A1A1A] focus:bg-[#F0EFE8]"
                  >
                    <Link href="/profile/orders">My Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="rounded-lg cursor-pointer text-[#6B7280] focus:text-[#1A1A1A] focus:bg-[#F0EFE8]"
                  >
                    <Link href="/wishlist">Wishlist</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="bg-[#E2E0DA]" />
                      <DropdownMenuItem
                        asChild
                        className="rounded-lg cursor-pointer"
                      >
                        <Link
                          href="/profile/admin"
                          className="text-[#2D5A27] font-medium"
                        >
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-[#E2E0DA]" />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="rounded-lg cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  className="rounded-full bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-semibold px-6"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation - App-like Header */}
        <div className="md:hidden flex h-14 items-center gap-2">
          {/* Back Button */}
          {!isHomePage && (
            <button
              onClick={() => router.back()}
              className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-[#F0EFE8] tap-scale"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-[#2D5A27]" />
            </button>
          )}

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#2D5A27]/20">
              <Image
                src="/logo.jpeg"
                alt="RTC"
                fill
                className="object-cover"
                priority
              />
            </div>
            <span className="font-bold text-[#2D5A27] text-sm">RTC</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 min-w-0">
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                type="search"
                placeholder="Search..."
                className="h-9 pl-3 pr-8 text-sm rounded-xl bg-[#F0EFE8] border-transparent text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:border-[#2D5A27] focus:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
            </form>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-9 w-9 rounded-full text-[#6B7280] hover:text-[#2D5A27] hover:bg-[#F0EFE8] tap-scale"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] p-0 bg-white border-l border-[#E2E0DA]"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <SheetHeader className="p-4 border-b border-[#E2E0DA]">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-[#2D5A27]/20">
                      <Image
                        src="/logo.jpeg"
                        alt="Royal Trading Company"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <SheetTitle className="text-[#1A1A1A] text-base text-left">
                        Royal Trading
                      </SheetTitle>
                      <p className="text-xs text-[#6B7280]">Est. 2020</p>
                    </div>
                  </div>
                </SheetHeader>

                {/* User Info */}
                {user ? (
                  <div className="p-4 bg-[#F0EFE8] border-b border-[#E2E0DA]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {(profile?.full_name || user.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1A1A1A] text-sm truncate">
                          {profile?.full_name || "User"}
                        </p>
                        <p className="text-xs text-[#6B7280] truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#F0EFE8] border-b border-[#E2E0DA]">
                    <p className="text-sm text-[#1A1A1A] font-medium">Welcome, Guest</p>
                    <p className="text-xs text-[#6B7280]">
                      Sign in for a better experience
                    </p>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-2">
                  <nav className="px-2 space-y-0.5">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors tap-scale ${pathname === link.href
                          ? "bg-[#2D5A27]/10 text-[#2D5A27]"
                          : "text-[#6B7280] hover:bg-[#F0EFE8] hover:text-[#1A1A1A]"
                          }`}
                      >
                        {link.label}
                      </Link>
                    ))}

                    <div className="my-3 mx-4 border-t border-[#E2E0DA]" />

                    <Link
                      href="/wishlist"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-[#F0EFE8] hover:text-[#1A1A1A] transition-colors tap-scale"
                    >
                      <Heart className="h-5 w-5" />
                      Wishlist
                    </Link>

                    <Link
                      href="/cart"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-[#F0EFE8] hover:text-[#1A1A1A] transition-colors tap-scale"
                    >
                      <span className="flex items-center gap-3">
                        <ShoppingCart className="h-5 w-5" />
                        Cart
                      </span>
                      {itemCount > 0 && (
                        <Badge className="bg-[#2D5A27] text-white text-xs">
                          {itemCount}
                        </Badge>
                      )}
                    </Link>

                    {user && (
                      <>
                        <Link
                          href="/profile/orders"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-[#F0EFE8] hover:text-[#1A1A1A] transition-colors tap-scale"
                        >
                          <User className="h-5 w-5" />
                          My Orders
                        </Link>

                        {isAdmin && (
                          <Link
                            href="/profile/admin"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2D5A27]/10 text-[#2D5A27] text-sm font-medium hover:bg-[#2D5A27]/20 transition-colors tap-scale"
                          >
                            <div className="relative w-5 h-5 rounded-full overflow-hidden">
                              <Image
                                src="/logo.jpeg"
                                alt=""
                                fill
                                className="object-cover"
                              />
                            </div>
                            Admin Dashboard
                          </Link>
                        )}
                      </>
                    )}
                  </nav>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-[#E2E0DA] safe-area-bottom">
                  {user ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-xl h-12 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 font-medium tap-scale"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                    >
                      Sign Out
                    </Button>
                  ) : (
                    <div className="flex gap-3">
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1"
                      >
                        <Button
                          variant="outline"
                          className="w-full rounded-xl h-12 border-[#E2E0DA] text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F0EFE8] font-medium tap-scale"
                        >
                          Sign In
                        </Button>
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1"
                      >
                        <Button className="w-full rounded-xl h-12 bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-semibold tap-scale">
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
    </header>
  );
}
