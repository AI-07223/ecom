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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  { href: "/profile/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile/admin/products", label: "Products", icon: Package },
  { href: "/profile/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/profile/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/profile/admin/users", label: "Users", icon: Users },
  { href: "/profile/admin/coupons", label: "Coupons", icon: Ticket },
  {
    href: "/profile/admin/item-requests",
    label: "Requests",
    icon: FileQuestion,
  },
  { href: "/profile/admin/settings", label: "Settings", icon: Settings },
];

// Helper function to darken a hex color
function darkenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Darken each component
  const darkenedR = Math.max(0, Math.floor(r * (1 - percent / 100)));
  const darkenedG = Math.max(0, Math.floor(g * (1 - percent / 100)));
  const darkenedB = Math.max(0, Math.floor(b * (1 - percent / 100)));

  // Convert back to hex
  return `#${darkenedR.toString(16).padStart(2, "0")}${darkenedG.toString(16).padStart(2, "0")}${darkenedB.toString(16).padStart(2, "0")}`;
}

// Helper to check if a color is light or dark
function isLightColor(hex: string): boolean {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function AdminBottomNav() {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMoreButton, setShowMoreButton] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Generate admin colors based on site settings
  const adminBg = darkenColor(settings.primary_color, 75); // Very dark version of primary
  const adminBgLight = darkenColor(settings.primary_color, 60); // Slightly lighter
  const adminAccent = settings.accent_color; // Use accent for active items
  const adminTextColor = "#ffffff"; // White text for dark background
  const adminTextMuted = `${settings.accent_color}cc`; // Slightly transparent accent for muted text

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

  // Determine text color for active state based on accent brightness
  const activeTextColor = isLightColor(adminAccent) ? "#1a1a1a" : "#ffffff";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg border-t safe-area-bottom"
      style={{
        backgroundColor: adminBg,
        borderColor: `${settings.primary_color}40`,
      }}
    >
      <div className="flex items-center h-16">
        {/* Back to Store button */}
        <Link
          href="/profile"
          className="flex-shrink-0 flex flex-col items-center justify-center min-w-[56px] h-14 px-2 rounded-xl mx-0.5 transition-colors"
          style={{
            backgroundColor: adminBgLight,
            color: adminTextColor,
          }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-[9px] mt-0.5 font-medium">Back</span>
        </Link>

        {/* Scrollable nav items */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center overflow-x-auto scrollbar-hide scroll-smooth px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {adminNavItems.map((item, index) => {
            const active = isActive(item.href);
            const isAlternate = index % 2 === 1;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                                    flex-shrink-0 flex flex-col items-center justify-center
                                    min-w-[64px] h-14 px-2 rounded-xl mx-0.5
                                    transition-all duration-200 ease-out
                                    ${active ? "scale-105" : ""}
                                `}
                style={{
                  backgroundColor: active
                    ? adminAccent
                    : isAlternate
                      ? adminBgLight
                      : "transparent",
                  color: active ? activeTextColor : adminTextMuted,
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

        {/* More button */}
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
              style={{ color: adminTextMuted }}
            >
              <div className="flex flex-col items-center">
                <Menu className="h-5 w-5" />
                <span className="text-[10px] mt-0.5 font-medium">More</span>
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="h-auto max-h-[70vh] rounded-t-3xl"
            style={{
              backgroundColor: adminBg,
              borderColor: `${settings.primary_color}40`,
            }}
          >
            <SheetHeader className="pb-4">
              <SheetTitle style={{ color: adminTextColor }}>
                Admin Menu
              </SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto max-h-[calc(70vh-80px)] pb-8">
              <div className="grid grid-cols-4 gap-3 pb-safe">
                {/* Back to Store link */}
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 hover:opacity-80"
                  style={{
                    backgroundColor: adminBgLight,
                    color: adminTextColor,
                  }}
                >
                  <div className="relative mb-1">
                    <ArrowLeft className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium">Back</span>
                </Link>

                {adminNavItems.map((item, index) => {
                  const active = isActive(item.href);
                  // Create checkerboard pattern for 4-column grid (offset by 1 for back button)
                  const actualIndex = index + 1;
                  const row = Math.floor(actualIndex / 4);
                  const col = actualIndex % 4;
                  const isAlternate = (row + col) % 2 === 1;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                                                flex flex-col items-center justify-center
                                                p-4 rounded-2xl
                                                transition-all duration-200
                                                ${active ? "shadow-lg" : "hover:opacity-80"}
                                            `}
                      style={{
                        backgroundColor: active
                          ? adminAccent
                          : isAlternate
                            ? adminBgLight
                            : `${adminBgLight}80`,
                        color: active ? activeTextColor : adminTextColor,
                      }}
                    >
                      <div className="relative mb-1">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
