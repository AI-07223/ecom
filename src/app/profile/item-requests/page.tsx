"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";
import { ItemRequest, ItemRequestStatus } from "@/types/database.types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<ItemRequestStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  fulfilled: "bg-blue-100 text-blue-800",
};

const statusIcons: Record<ItemRequestStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  fulfilled: Package,
};

export default function MyItemRequestsPage() {
  const router = useRouter();
  const { user, isWholeseller, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteRequest, setDeleteRequest] = useState<ItemRequest | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isWholeseller)) {
      router.push("/profile");
    }
  }, [user, isWholeseller, authLoading, router]);

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "item_requests"),
        where("user_id", "==", user.uid),
        orderBy("created_at", "desc"),
      );
      const snap = await getDocs(q);
      setRequests(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ItemRequest[],
      );
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load requests");
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (isWholeseller && user) {
      fetchRequests();
    }
  }, [isWholeseller, user, fetchRequests]);

  const handleDelete = async () => {
    if (!deleteRequest) return;

    try {
      await deleteDoc(doc(db, "item_requests", deleteRequest.id));
      toast.success("Request deleted successfully");
      fetchRequests();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Failed to delete request");
    }

    setDeleteRequest(null);
  };

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

  if (authLoading || !isWholeseller) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold">My Item Requests</h1>
            <p className="text-muted-foreground">
              Track the status of your product requests
            </p>
          </div>
          <Link href="/item-request">
            <Button style={{ backgroundColor: settings.primary_color }}>
              <Plus className="h-4 w-4 mr-1" />
              New Request
            </Button>
          </Link>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Requests Yet</h3>
              <p className="text-muted-foreground mb-4">
                You haven&apos;t submitted any item requests.
              </p>
              <Link href="/item-request">
                <Button style={{ backgroundColor: settings.primary_color }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Request an Item
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const StatusIcon = statusIcons[request.status];
              const canDelete = request.status === "pending";

              return (
                <Card
                  key={request.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            {request.item_name}
                          </h3>
                          <Badge className={statusColors[request.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </Badge>
                        </div>

                        {request.item_description && (
                          <p className="text-muted-foreground mb-3">
                            {request.item_description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm mb-3">
                          {request.requested_price && (
                            <span className="bg-muted px-2 py-1 rounded">
                              Expected:{" "}
                              <strong>
                                {settings.currency_symbol}
                                {request.requested_price.toLocaleString(
                                  "en-IN",
                                )}
                              </strong>
                            </span>
                          )}
                          {request.quantity_needed && (
                            <span className="bg-muted px-2 py-1 rounded">
                              Qty: <strong>{request.quantity_needed}</strong>
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            Submitted: {formatDate(request.created_at)}
                          </span>
                        </div>

                        {request.admin_notes && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Admin Response:</strong>{" "}
                              {request.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        {request.images && request.images.length > 0 && (
                          <div className="flex gap-2">
                            {request.images.slice(0, 3).map((img, idx) => (
                              <a
                                key={idx}
                                href={img}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                              >
                                <Image
                                  src={img}
                                  alt={`Reference ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </a>
                            ))}
                            {request.images.length > 3 && (
                              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-sm">
                                +{request.images.length - 3}
                              </div>
                            )}
                          </div>
                        )}

                        {canDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteRequest(request)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteRequest}
        onOpenChange={() => setDeleteRequest(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the request for &quot;
              {deleteRequest?.item_name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
