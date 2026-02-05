"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  Heart,
  Settings,
  Shield,
  ChevronRight,
  LogOut,
  MapPin,
  Phone,
  FileQuestion,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/AuthProvider";

const menuItems = [
  {
    icon: Package,
    label: "My Orders",
    href: "/profile/orders",
    description: "View and track your orders",
  },
  {
    icon: Heart,
    label: "Wishlist",
    href: "/wishlist",
    description: "Products you saved for later",
  },
  {
    icon: Settings,
    label: "Account Settings",
    href: "/profile/settings",
    description: "Manage your profile and preferences",
  },
];

const wholesellerMenuItems = [
  {
    icon: Store,
    label: "Request Item",
    href: "/item-request",
    description: "Request products not in store",
  },
  {
    icon: FileQuestion,
    label: "My Requests",
    href: "/profile/item-requests",
    description: "View your submitted requests",
  },
];

const adminMenuItems = [
  {
    icon: Shield,
    label: "Admin Dashboard",
    href: "/profile/admin",
    description: "Overview and statistics",
  },
  {
    label: "Manage Products",
    href: "/profile/admin/products",
    description: "Add, edit, or remove products",
  },
  {
    label: "Manage Categories",
    href: "/profile/admin/categories",
    description: "Organize product categories",
  },
  {
    label: "Manage Orders",
    href: "/profile/admin/orders",
    description: "Process and fulfill orders",
  },
  {
    label: "Manage Users",
    href: "/profile/admin/users",
    description: "View and manage customers",
  },
  {
    label: "Coupons",
    href: "/profile/admin/coupons",
    description: "Create discount codes",
  },
  {
    label: "Item Requests",
    href: "/profile/admin/item-requests",
    description: "View wholeseller requests",
  },
  {
    label: "Site Settings",
    href: "/profile/admin/settings",
    description: "Customize your store",
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, isAdmin, isWholeseller, isLoading, signOut } =
    useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/profile");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
      </div>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#FAFAF5]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <Card className="mb-8 border-[#E2E0DA] shadow-soft">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-24 w-24 border-4 border-[#2D5A27]/10">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-[#2D5A27] to-[#4CAF50] text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-2xl font-bold text-[#1A1A1A]">
                      {profile?.full_name || "User"}
                    </h1>
                    {isAdmin ? (
                      <Badge className="bg-[#2D5A27] text-white">
                        Admin
                      </Badge>
                    ) : isWholeseller ? (
                      <Badge
                        variant="outline"
                        className="border-[#4CAF50] text-[#4CAF50]"
                      >
                        Wholeseller
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[#6B7280]">{user.email}</p>
                  {profile?.phone && (
                    <p className="text-sm text-[#6B7280] flex items-center gap-1 justify-center sm:justify-start mt-1">
                      <Phone className="h-3 w-3" />
                      {profile.phone}
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => signOut()}
                  className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Account Menu */}
            <Card className="border-[#E2E0DA] shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
                  <div className="w-8 h-8 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-[#2D5A27]" />
                  </div>
                  My Account
                </CardTitle>
                <CardDescription className="text-[#6B7280]">
                  Manage your account and view your activity
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {menuItems.map((item, index) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center justify-between p-4 hover:bg-[#F0EFE8] transition-colors ${
                        index !== menuItems.length - 1 ? "border-b border-[#E2E0DA]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-[#2D5A27]/10">
                          <item.icon className="h-4 w-4 text-[#2D5A27]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{item.label}</p>
                          <p className="text-sm text-[#6B7280]">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Wholeseller Panel - Only visible to wholesellers (but not admins) */}
            {isWholeseller && !isAdmin && (
              <Card className="border-2 border-[#4CAF50] shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#4CAF50]">
                    <div className="w-8 h-8 rounded-lg bg-[#4CAF50]/10 flex items-center justify-center">
                      <Store className="h-4 w-4 text-[#4CAF50]" />
                    </div>
                    Wholeseller Panel
                  </CardTitle>
                  <CardDescription className="text-[#6B7280]">
                    Request products and manage your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {wholesellerMenuItems.map((item, index) => (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={`flex items-center justify-between p-4 hover:bg-[#F0EFE8] transition-colors ${
                          index !== wholesellerMenuItems.length - 1
                            ? "border-b border-[#E2E0DA]"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-[#4CAF50]/10">
                            <item.icon className="h-4 w-4 text-[#4CAF50]" />
                          </div>
                          <div>
                            <p className="font-medium text-[#1A1A1A]">{item.label}</p>
                            <p className="text-sm text-[#6B7280]">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Admin Panel - Only visible to admins */}
            {isAdmin && (
              <Card className="border-2 border-[#2D5A27] shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#2D5A27]">
                    <div className="w-8 h-8 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-[#2D5A27]" />
                    </div>
                    Admin Panel
                  </CardTitle>
                  <CardDescription className="text-[#6B7280]">
                    Manage your store and view analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {adminMenuItems.map((item, index) => (
                    <Link key={item.href} href={item.href}>
                      <div
                        className={`flex items-center justify-between p-4 hover:bg-[#F0EFE8] transition-colors ${
                          index !== adminMenuItems.length - 1 ? "border-b border-[#E2E0DA]" : ""
                        }`}
                      >
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{item.label}</p>
                          <p className="text-sm text-[#6B7280]">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#9CA3AF]" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Address Card - Show if not admin or in additional column */}
            {!isAdmin && (
              <Card className="border-[#E2E0DA] shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#1A1A1A]">
                    <div className="w-8 h-8 rounded-lg bg-[#2D5A27]/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-[#2D5A27]" />
                    </div>
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.address && Object.keys(profile.address).length > 0 ? (
                    <div className="text-sm text-[#1A1A1A]">
                      <p>{profile.address.street}</p>
                      <p>
                        {profile.address.city}, {profile.address.state}{" "}
                        {profile.address.postal_code}
                      </p>
                      <p>{profile.address.country}</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-[#6B7280] mb-3">
                        No address saved
                      </p>
                      <Link href="/profile/settings">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white"
                        >
                          Add Address
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
