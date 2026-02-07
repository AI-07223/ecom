"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Shield,
  ShieldOff,
  Store,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { timestampToString } from "@/lib/firebase/utils";
import { Pagination } from "@/components/ui/pagination";

interface UserProfile extends Profile {
  id: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  useSiteSettings();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/profile");
  }, [user, isAdmin, authLoading, router]);

  const convertToUserProfile = (docId: string, data: Record<string, unknown>): UserProfile => {
    return {
      id: docId,
      email: data.email as string,
      full_name: (data.full_name as string | null) ?? null,
      avatar_url: (data.avatar_url as string | null) ?? null,
      phone: (data.phone as string | null) ?? null,
      address: (data.address as Profile['address']) ?? null,
      saved_addresses: (data.saved_addresses as Profile['saved_addresses']) ?? [],
      gst_number: (data.gst_number as string | null) ?? null,
      role: (data.role as UserRole) ?? "customer",
      created_at: timestampToString(data.created_at as Parameters<typeof timestampToString>[0]),
      updated_at: timestampToString(data.updated_at as Parameters<typeof timestampToString>[0]),
    };
  };

  const fetchUsers = useCallback(async () => {
    try {
      const usersSnap = await getDocs(
        query(collection(db, "profiles"), orderBy("created_at", "desc")),
      );
      const usersData = usersSnap.docs.map((doc) => 
        convertToUserProfile(doc.id, doc.data() as Record<string, unknown>)
      );
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const formatDate = (date: string | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const setUserRole = async (userId: string, newRole: UserRole) => {
    if (userId === user?.uid) {
      toast.error("You can't change your own role");
      return;
    }
    try {
      await updateDoc(doc(db, "profiles", userId), {
        role: newRole,
        updated_at: serverTimestamp(),
      });
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const toggleAdmin = async (userId: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === "admin" ? "customer" : "admin";
    await setUserRole(userId, newRole);
  };

  const toggleWholeseller = async (userId: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === "wholeseller" ? "customer" : "wholeseller";
    await setUserRole(userId, newRole);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-600">Admin</Badge>;
      case "wholeseller":
        return <Badge className="bg-green-600">Wholeseller</Badge>;
      default:
        return <Badge variant="secondary">Customer</Badge>;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Users</h1>
              <p className="text-sm text-muted-foreground">
                {users.length} registered users
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No users found</h3>
              <p className="text-muted-foreground">Try adjusting your search</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedUsers.map((profile) => (
                <Card key={profile.id} className="overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {(profile.full_name || profile.email || "U")
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h3 className="font-semibold text-sm sm:text-base truncate">
                              {profile.full_name || "Unnamed User"}
                            </h3>
                            <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{profile.email}</span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {getRoleBadge(profile.role)}
                          </div>
                        </div>
                        {profile.phone && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mt-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{profile.phone}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Joined {formatDate(profile.created_at)}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              toggleAdmin(profile.id, profile.role)
                            }
                            disabled={profile.id === user?.uid}
                            className={`text-xs sm:text-sm ${
                              profile.role === "admin"
                                ? "border-purple-200 text-purple-700"
                                : ""
                            }`}
                          >
                            {profile.role === "admin" ? (
                              <>
                                <ShieldOff className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                <span className="hidden sm:inline">Remove Admin</span>
                                <span className="sm:hidden">Remove</span>
                              </>
                            ) : (
                              <>
                                <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                <span className="hidden sm:inline">Make Admin</span>
                                <span className="sm:hidden">Admin</span>
                              </>
                            )}
                          </Button>
                          {profile.role !== "admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleWholeseller(profile.id, profile.role)
                              }
                              disabled={profile.id === user?.uid}
                              className={`text-xs sm:text-sm ${
                                profile.role === "wholeseller"
                                  ? "border-green-200 text-green-700"
                                  : ""
                              }`}
                            >
                              {profile.role === "wholeseller" ? (
                                <>
                                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                  <span className="hidden sm:inline">Remove Wholeseller</span>
                                  <span className="sm:hidden">Remove</span>
                                </>
                              ) : (
                                <>
                                  <Store className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                                  <span className="hidden sm:inline">Make Wholeseller</span>
                                  <span className="sm:hidden">Wholeseller</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredUsers.length > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredUsers.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
