"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import {
  Home,
  ShoppingBag,
  Grid3X3,
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu,
  Settings,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useCart } from "@/providers/CartProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
  description?: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home, description: "Browse homepage" },
  {
    href: "/products",
    label: "Products",
    icon: ShoppingBag,
    description: "View all products",
  },
  {
    href: "/categories",
    label: "Categories",
    icon: Grid3X3,
    description: "Browse categories",
  },
  {
    href: "/cart",
    label: "Cart",
    icon: ShoppingCart,
    description: "View your cart",
  },
  {
    href: "/wishlist",
    label: "Wishlist",
    icon: Heart,
    description: "Saved items",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: User,
    description: "Your account",
  },
  {
    href: "/products?search=",
    label: "Search",
    icon: Search,
    description: "Find products",
  },
  {
    href: "/profile/orders",
    label: "Orders",
    icon: Package,
    description: "Order history",
  },
  {
    href: "/profile/admin",
    label: "Admin",
    icon: Settings,
    adminOnly: true,
    description: "Admin dashboard",
  },
];

// Quick action items for the expanded menu
const quickActions = [
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile/orders", label: "Orders", icon: Package },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { isAdmin, user, profile } = useAuth();
  const { settings } = useSiteSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMoreButton, setShowMoreButton] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Filter nav items based on auth
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  // Filter quick actions based on auth (no admin-only)
  const visibleQuickActions = quickActions;

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
  }, [visibleItems.length]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.split("?")[0]);
  };

  const getBadge = (item: NavItem) => {
    if (item.href === "/cart" && itemCount > 0) return itemCount;
    return item.badge;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-bottom">
      <div className="flex items-center h-16">
        {/* Scrollable nav items */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center overflow-x-auto scrollbar-hide scroll-smooth px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {visibleItems.map((item, index) => {
            const active = isActive(item.href);
            const badge = getBadge(item);
            const isAlternate = index % 2 === 1;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex-shrink-0 flex flex-col items-center justify-center
                  min-w-[64px] h-14 px-2 rounded-xl mx-0.5
                  transition-all duration-200 ease-out
                  ${
                    active
                      ? "text-primary scale-105"
                      : "text-muted-foreground hover:text-foreground"
                  }
                `}
                style={{
                  backgroundColor: active
                    ? `${settings.accent_color}15`
                    : isAlternate
                      ? `${settings.accent_color}08`
                      : "transparent",
                }}
              >
                <div className="relative">
                  <item.icon
                    className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`}
                  />
                  {badge !== undefined && badge > 0 && (
                    <Badge
                      className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 flex items-center justify-center text-[10px] bg-primary animate-in zoom-in-50"
                      style={{ backgroundColor: settings.accent_color }}
                    >
                      {badge > 99 ? "99+" : badge}
                    </Badge>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-0.5 font-medium ${active ? "font-semibold" : ""}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* More button - shows when not scrolled to end */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`
                flex-shrink-0 h-14 w-14 mr-1 rounded-xl
                transition-all duration-300
                ${showMoreButton ? "opacity-100" : "opacity-50"}
              `}
            >
              <div className="flex flex-col items-center">
                <Menu className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 font-medium">More</span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-auto max-h-[85vh] rounded-t-3xl p-0"
          >
            {/* Pull indicator */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
            </div>

            {/* User Header */}
            <SheetHeader className="px-6 pb-4 text-left">
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${settings.primary_color}20, ${settings.accent_color}20)`,
                      }}
                    >
                      <span
                        className="text-lg font-semibold"
                        style={{ color: settings.primary_color }}
                      >
                        {(profile?.full_name || user.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-base truncate">
                        {profile?.full_name || "Welcome back"}
                      </SheetTitle>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${settings.primary_color}20, ${settings.accent_color}20)`,
                      }}
                    >
                      <User
                        className="h-6 w-6"
                        style={{ color: settings.primary_color }}
                      />
                    </div>
                    <div className="flex-1">
                      <SheetTitle className="text-base">Guest</SheetTitle>
                      <p className="text-xs text-muted-foreground">
                        Sign in for a better experience
                      </p>
                    </div>
                  </>
                )}
              </div>
            </SheetHeader>

            {/* Quick Actions */}
            <div className="px-6 pb-4">
              <div
                className="grid grid-cols-3 gap-3 p-3 rounded-2xl"
                style={{ backgroundColor: `${settings.accent_color}08` }}
              >
                {visibleQuickActions.map((action) => {
                  const active = isActive(action.href);
                  const badge =
                    action.href === "/cart" && itemCount > 0 ? itemCount : 0;

                  return (
                    <SheetClose key={action.href} asChild>
                      <Link
                        href={action.href}
                        className={`
                          flex flex-col items-center justify-center
                          p-3 rounded-xl transition-all duration-200
                          ${
                            active
                              ? "text-primary-foreground shadow-md"
                              : "hover:opacity-80"
                          }
                        `}
                        style={{
                          backgroundColor: active
                            ? settings.accent_color
                            : "transparent",
                        }}
                      >
                        <div className="relative">
                          <action.icon className="h-5 w-5" />
                          {badge > 0 && (
                            <Badge
                              className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px]"
                              variant={active ? "secondary" : "default"}
                            >
                              {badge > 99 ? "99+" : badge}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs font-medium mt-1">
                          {action.label}
                        </span>
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>
            </div>

            {/* All Menu Items */}
            <div className="overflow-y-auto max-h-[calc(85vh-200px)] px-6 pb-8">
              <div className="grid grid-cols-1 gap-1">
                {visibleItems.map((item, index) => {
                  const active = isActive(item.href);
                  const badge = getBadge(item);

                  return (
                    <SheetClose key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={`
                          flex items-center gap-4 p-4 rounded-xl
                          transition-all duration-200 tap-scale
                          ${
                            active
                              ? "font-medium"
                              : "text-muted-foreground hover:bg-accent/30"
                          }
                        `}
                        style={{
                          backgroundColor: active
                            ? `${settings.accent_color}15`
                            : index % 2 === 0
                              ? `${settings.accent_color}05`
                              : "transparent",
                          color: active ? settings.primary_color : undefined,
                        }}
                      >
                        <div
                          className={`
                            w-10 h-10 rounded-xl flex items-center justify-center
                            ${active ? "shadow-sm" : ""}
                          `}
                          style={{
                            backgroundColor: active
                              ? `${settings.accent_color}30`
                              : `${settings.accent_color}15`,
                          }}
                        >
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {item.label}
                          </span>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {badge !== undefined && badge > 0 && (
                          <Badge
                            className="h-5 min-w-[20px] px-2 text-[10px] font-bold"
                            style={{
                              backgroundColor: settings.accent_color,
                              color: "#ffffff",
                            }}
                          >
                            {badge > 99 ? "99+" : badge}
                          </Badge>
                        )}
                        {active && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: settings.accent_color }}
                          />
                        )}
                      </Link>
                    </SheetClose>
                  );
                })}
              </div>

              {/* Sign In / Profile Button */}
              <div className="mt-4">
                {user ? (
                  <SheetClose asChild>
                    <Link
                      href="/profile"
                      className="flex items-center justify-center gap-2 w-full p-4 rounded-xl font-medium transition-all duration-200 tap-scale"
                      style={{
                        background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})`,
                        color: "#ffffff",
                      }}
                    >
                      <User className="h-5 w-5" />
                      <span>Go to Profile</span>
                    </Link>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Link
                      href="/login"
                      className="flex items-center justify-center gap-2 w-full p-4 rounded-xl font-medium transition-all duration-200 tap-scale"
                      style={{
                        background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})`,
                        color: "#ffffff",
                      }}
                    >
                      <User className="h-5 w-5" />
                      <span>Sign In</span>
                    </Link>
                  </SheetClose>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
