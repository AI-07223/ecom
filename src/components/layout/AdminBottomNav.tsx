"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
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
  {
    href: "/profile/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview & analytics",
  },
  {
    href: "/profile/admin/products",
    label: "Products",
    icon: Package,
    description: "Manage products",
  },
  {
    href: "/profile/admin/categories",
    label: "Categories",
    icon: FolderTree,
    description: "Organize categories",
  },
  {
    href: "/profile/admin/orders",
    label: "Orders",
    icon: ShoppingBag,
    description: "View & manage orders",
  },
  {
    href: "/profile/admin/users",
    label: "Users",
    icon: Users,
    description: "Manage customers",
  },
  {
    href: "/profile/admin/coupons",
    label: "Coupons",
    icon: Ticket,
    description: "Discount codes",
  },
  {
    href: "/profile/admin/item-requests",
    label: "Requests",
    icon: FileQuestion,
    description: "Item requests",
  },
  {
    href: "/profile/admin/settings",
    label: "Settings",
    icon: Settings,
    description: "Site configuration",
  },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const { user, profile, signOut } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMoreButton, setShowMoreButton] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Use app theme colors - green/cream
  const bgColor = "#FAFAF5";
  const borderColor = "#E2E0DA";
  const primaryColor = settings.primary_color;
  const textColor = "#1A1A1A";
  const mutedTextColor = "#6B7280";
  const cardBg = "#FFFFFF";
  const hoverBg = "#F0EFE8";

  // Check scroll position
  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowMoreButton(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      checkScroll();
    }

    return () => el?.removeEventListener("scroll", checkScroll);
  }, []);

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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t safe-area-bottom bg-white overflow-hidden max-h-[80px]"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
      }}
    >
      <div className="flex items-center h-16">
        {/* Back to Store button */}
        <Link
          href="/profile"
          className="flex-shrink-0 flex flex-col items-center justify-center min-w-[56px] h-14 px-2 rounded-xl mx-0.5 tap-active"
          style={{
            backgroundColor: hoverBg,
            color: textColor,
          }}
        >
          <ArrowLeft className="h-5 w-5 text-[#2D5A27]" />
          <span className="text-[9px] mt-0.5 font-medium text-[#6B7280]">Back</span>
        </Link>

        {/* Scrollable nav items */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center overflow-x-auto scrollbar-hide scroll-smooth px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {adminNavItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex-shrink-0 flex flex-col items-center justify-center
                  min-w-[64px] h-14 px-2 rounded-xl mx-0.5
                  transition-all duration-200 ease-out tap-active
                  ${active ? "scale-105" : ""}
                `}
                style={{
                  backgroundColor: active ? primaryColor : "transparent",
                  color: active ? "#ffffff" : mutedTextColor,
                }}
              >
                <item.icon
                  className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`}
                />
                <span
                  className={`text-[10px] mt-0.5 font-medium ${active ? "font-semibold" : ""}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* More button - Enhanced Sliding Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`
                flex-shrink-0 h-14 w-14 mr-1 rounded-xl tap-active
                transition-all duration-300
                ${showMoreButton ? "opacity-100" : "opacity-50"}
              `}
              style={{ color: mutedTextColor }}
            >
              <div className="flex flex-col items-center">
                <Menu className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 font-medium">More</span>
              </div>
            </Button>
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
                  <Crown
                    className="h-6 w-6"
                    style={{ color: primaryColor }}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <SheetTitle
                      className="text-base truncate"
                      style={{ color: textColor }}
                    >
                      Admin Panel
                    </SheetTitle>
                    <Badge
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        backgroundColor: primaryColor,
                        color: "#ffffff",
                      }}
                    >
                      Admin
                    </Badge>
                  </div>
                  <p
                    className="text-xs truncate"
                    style={{ color: mutedTextColor }}
                  >
                    {profile?.full_name || user?.email || "Administrator"}
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Quick Actions */}
            <div className="px-6 pb-4">
              <div
                className="grid grid-cols-4 gap-3 p-3 rounded-2xl"
                style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
              >
                {/* Back to Store */}
                <SheetClose asChild>
                  <Link
                    href="/profile"
                    className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 hover:opacity-80 tap-active"
                    style={{
                      backgroundColor: hoverBg,
                      color: textColor,
                    }}
                  >
                    <ArrowLeft className="h-5 w-5 text-[#2D5A27]" />
                    <span className="text-xs font-medium mt-1">Back</span>
                  </Link>
                </SheetClose>

                {/* Quick links to main sections */}
                {adminNavItems.slice(0, 3).map((item) => {
                  const active = isActive(item.href);
                  return (
                    <SheetClose key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 tap-active"
                        style={{
                          backgroundColor: active
                            ? primaryColor
                            : hoverBg,
                          color: active ? "#ffffff" : textColor,
                        }}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="text-xs font-medium mt-1">
                          {item.label}
                        </span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            </div>

            {/* All Admin Menu Items */}
            <div className="overflow-y-auto max-h-[calc(85vh-240px)] px-6 pb-8">
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
                          active ? "font-medium" : "hover:opacity-80",
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
                            active && "shadow-sm",
                          )}
                          style={{
                            backgroundColor: active
                              ? "rgba(255,255,255,0.2)"
                              : hoverBg,
                          }}
                        >
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                          {item.description && (
                            <p
                              className="text-xs"
                              style={{ color: active ? "rgba(255,255,255,0.8)" : mutedTextColor }}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                        {active && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: "#ffffff" }}
                          />
                        )}
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
