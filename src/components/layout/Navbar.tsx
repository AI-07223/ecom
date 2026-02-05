"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, Heart, Search, ChevronLeft, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { useCart } from "@/providers/CartProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
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
  const isAdminPage = pathname.startsWith("/profile/admin");

  // Don't show regular navbar on admin pages (admin has its own)
  if (isAdminPage) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  return (
    <>
      {/* Desktop Navbar */}
      <header className="hidden md:block sticky top-0 z-50 w-full glass border-b border-[#E2E0DA]/50">
        <nav className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-[#2D5A27]/10">
                <Image
                  src="/logo.jpeg"
                  alt="RTC"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#1A1A1A] leading-tight">
                  Royal Trading
                </span>
                <span className="text-[10px] text-[#6B7280] tracking-wider">
                  COMPANY
                </span>
              </div>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="w-full pl-11 pr-4 h-11 bg-[#F0EFE8] border-0 rounded-xl text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#2D5A27]/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Nav Links */}
              <div className="flex items-center gap-1 mr-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      pathname === link.href
                        ? "text-[#2D5A27] bg-[#2D5A27]/10"
                        : "text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F0EFE8]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Wishlist */}
              <Link href="/wishlist">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-[#6B7280] hover:text-[#2D5A27] hover:bg-[#2D5A27]/10"
                >
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>

              {/* Cart */}
              <Link href="/cart" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl text-[#6B7280] hover:text-[#2D5A27] hover:bg-[#2D5A27]/10"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-semibold bg-[#2D5A27] text-white border-2 border-white">
                      {itemCount > 9 ? "9+" : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Profile */}
              {user ? (
                <Link href="/profile">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center text-white font-semibold text-sm">
                    {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                </Link>
              ) : (
                <Link href="/login">
                  <Button className="h-10 px-5 rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-medium">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Navbar - Native App Style */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50">
        {/* Main Header */}
        <div className="glass border-b border-[#E2E0DA]/50">
          <div className="flex items-center h-14 px-4 gap-3">
            {/* Back Button (non-home pages) */}
            {!isHomePage ? (
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full tap-active"
              >
                <ChevronLeft className="h-6 w-6 text-[#1A1A1A]" />
              </button>
            ) : null}

            {/* Logo (home page only) */}
            {isHomePage && (
              <Link href="/" className="flex items-center gap-2">
                <div className="relative w-9 h-9 rounded-lg overflow-hidden ring-2 ring-[#2D5A27]/10">
                  <Image
                    src="/logo.jpeg"
                    alt="RTC"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <span className="font-bold text-[#1A1A1A]">RTC</span>
              </Link>
            )}

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 h-10 bg-[#F0EFE8] border-0 rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#2D5A27]/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>

            {/* Cart */}
            <Link href="/cart" className="relative">
              <div className="flex items-center justify-center w-10 h-10 tap-active">
                <ShoppingCart className="h-5 w-5 text-[#1A1A1A]" />
                {itemCount > 0 && (
                  <Badge className="absolute top-1 right-0 h-4 min-w-[16px] px-1 flex items-center justify-center text-[10px] font-bold bg-[#2D5A27] text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </Badge>
                )}
              </div>
            </Link>

            {/* Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="flex items-center justify-center w-10 h-10 -mr-2 rounded-full tap-active">
                  <Menu className="h-6 w-6 text-[#1A1A1A]" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0 bg-white">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <SheetHeader className="px-5 py-4 border-b border-[#E2E0DA]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-[#2D5A27]/10">
                          <Image
                            src="/logo.jpeg"
                            alt="RTC"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <SheetTitle className="text-base text-[#1A1A1A]">Royal Trading</SheetTitle>
                          <p className="text-xs text-[#6B7280]">Company</p>
                        </div>
                      </div>
                      <SheetClose asChild>
                        <button className="flex items-center justify-center w-8 h-8 rounded-full tap-active">
                          <X className="h-5 w-5 text-[#6B7280]" />
                        </button>
                      </SheetClose>
                    </div>
                  </SheetHeader>

                  {/* User Info */}
                  {user ? (
                    <div className="px-5 py-4 bg-[#F0EFE8]">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] flex items-center justify-center text-white font-bold">
                          {(profile?.full_name || user.email || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#1A1A1A] truncate">
                            {profile?.full_name || "User"}
                          </p>
                          <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-4 bg-[#F0EFE8]">
                      <p className="font-medium text-[#1A1A1A]">Welcome, Guest</p>
                      <p className="text-xs text-[#6B7280]">Sign in to access your account</p>
                    </div>
                  )}

                  {/* Navigation */}
                  <nav className="flex-1 overflow-y-auto py-2">
                    <div className="px-3 space-y-1">
                      {navLinks.map((link) => (
                        <SheetClose key={link.href} asChild>
                          <Link
                            href={link.href}
                            className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                              pathname === link.href
                                ? "text-[#2D5A27] bg-[#2D5A27]/10"
                                : "text-[#1A1A1A] hover:bg-[#F0EFE8]"
                            }`}
                          >
                            {link.label}
                          </Link>
                        </SheetClose>
                      ))}

                      <div className="my-2 border-t border-[#E2E0DA]" />

                      <SheetClose asChild>
                        <Link
                          href="/wishlist"
                          className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#F0EFE8]"
                        >
                          <Heart className="h-4 w-4 mr-3 text-[#6B7280]" />
                          Wishlist
                        </Link>
                      </SheetClose>

                      <SheetClose asChild>
                        <Link
                          href="/cart"
                          className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-[#1A1A1A] hover:bg-[#F0EFE8]"
                        >
                          <ShoppingCart className="h-4 w-4 mr-3 text-[#6B7280]" />
                          Cart
                          {itemCount > 0 && (
                            <Badge className="ml-auto bg-[#2D5A27] text-white text-xs">
                              {itemCount}
                            </Badge>
                          )}
                        </Link>
                      </SheetClose>

                      {isAdmin && (
                        <>
                          <div className="my-2 border-t border-[#E2E0DA]" />
                          <SheetClose asChild>
                            <Link
                              href="/profile/admin"
                              className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-[#2D5A27] bg-[#2D5A27]/10"
                            >
                              Admin Dashboard
                            </Link>
                          </SheetClose>
                        </>
                      )}
                    </div>
                  </nav>

                  {/* Footer */}
                  <div className="p-4 border-t border-[#E2E0DA]">
                    {user ? (
                      <button
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-500 font-medium hover:bg-red-50 tap-active"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <SheetClose asChild>
                        <Link href="/login">
                          <Button className="w-full h-12 rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-medium">
                            Sign In
                          </Button>
                        </Link>
                      </SheetClose>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14 md:h-16" />
    </>
  );
}
