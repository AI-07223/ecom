"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Shield, ShieldOff, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";
import { Profile, UserRole } from "@/types/database.types";

interface UserProfile extends Profile {
  id: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/profile");
    }
  }, [user, isAdmin, authLoading, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const usersSnap = await getDocs(
        query(collection(db, "profiles"), orderBy("created_at", "desc")),
      );
      setUsers(
        usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserProfile[],
      );
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const formatDate = (
    date: { toDate: () => Date } | Date | string | undefined,
  ) => {
    if (!date) return "N/A";
    if (typeof date === "string")
      return new Date(date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    const d = "toDate" in date ? date.toDate() : date;
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const toggleAdmin = async (userId: string, currentStatus: boolean) => {
    if (userId === user?.uid) {
      toast.error("You can't change your own admin status");
      return;
    }

    try {
      await updateDoc(doc(db, "profiles", userId), {
        is_admin: !currentStatus,
        role: !currentStatus ? "admin" : "customer",
        updated_at: serverTimestamp(),
      });
      toast.success(
        currentStatus ? "Admin access removed" : "Admin access granted",
      );
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const toggleWholeseller = async (userId: string, currentStatus: boolean) => {
    if (userId === user?.uid) {
      toast.error("You can't change your own wholeseller status");
      return;
    }

    try {
      await updateDoc(doc(db, "profiles", userId), {
        is_wholeseller: !currentStatus,
        role: !currentStatus ? "wholeseller" : "customer",
        updated_at: serverTimestamp(),
      });
      toast.success(
        currentStatus
          ? "Wholeseller access removed"
          : "Promoted to Wholeseller",
      );
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const getRoleBadge = (userProfile: UserProfile) => {
    if (userProfile.is_admin) {
      return <Badge className="bg-purple-600">Admin</Badge>;
    }
    if (userProfile.is_wholeseller) {
      return <Badge className="bg-green-600">Wholeseller</Badge>;
    }
    return <Badge variant="secondary">Customer</Badge>;
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">{users.length} registered users</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Phone</th>
                    <th className="text-left py-3 px-4">Role</th>
                    <th className="text-left py-3 px-4">Joined</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((profile) => (
                    <tr key={profile.id} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage
                              src={profile.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {profile.full_name?.charAt(0) ||
                                profile.email?.charAt(0) ||
                                "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {profile.full_name || "No name"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {profile.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">{profile.phone || "-"}</td>
                      <td className="py-3 px-4">{getRoleBadge(profile)}</td>
                      <td className="py-3 px-4">
                        {formatDate(profile.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-2">
                          {/* Admin Toggle */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleAdmin(profile.id, profile.is_admin)
                            }
                            disabled={profile.id === user?.uid}
                            className="justify-start"
                          >
                            {profile.is_admin ? (
                              <>
                                <ShieldOff className="h-4 w-4 mr-1" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-1" />
                                Make Admin
                              </>
                            )}
                          </Button>

                          {/* Wholeseller Toggle */}
                          {!profile.is_admin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleWholeseller(
                                  profile.id,
                                  profile.is_wholeseller,
                                )
                              }
                              disabled={profile.id === user?.uid}
                              className="justify-start"
                            >
                              {profile.is_wholeseller ? (
                                <>
                                  <User className="h-4 w-4 mr-1" />
                                  Remove Wholeseller
                                </>
                              ) : (
                                <>
                                  <Store className="h-4 w-4 mr-1" />
                                  Make Wholeseller
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
