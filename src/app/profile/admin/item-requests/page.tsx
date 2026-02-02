"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";
import { ItemRequest, ItemRequestStatus } from "@/types/database.types";

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

export default function AdminItemRequestsPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemRequestStatus | "all">(
    "all",
  );
  const [selectedRequest, setSelectedRequest] = useState<ItemRequest | null>(
    null,
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    status: "pending" as ItemRequestStatus,
    admin_notes: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/profile");
  }, [user, isAdmin, authLoading, router]);

  const fetchRequests = useCallback(async () => {
    try {
      const q = query(
        collection(db, "item_requests"),
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
  }, []);

  useEffect(() => {
    if (isAdmin) fetchRequests();
  }, [isAdmin, fetchRequests]);

  const handleUpdate = async () => {
    if (!selectedRequest) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "item_requests", selectedRequest.id), {
        status: updateForm.status,
        admin_notes: updateForm.admin_notes.trim() || null,
        updated_at: serverTimestamp(),
      });
      toast.success("Request updated successfully");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Error updating request:", error);
      toast.error("Failed to update request");
    }
    setIsUpdating(false);
  };

  const openUpdateDialog = (request: ItemRequest) => {
    setSelectedRequest(request);
    setUpdateForm({
      status: request.status,
      admin_notes: request.admin_notes || "",
    });
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

  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.item_name.toLowerCase().includes(search.toLowerCase()) ||
      req.user_email.toLowerCase().includes(search.toLowerCase()) ||
      req.user_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    fulfilled: requests.filter((r) => r.status === "fulfilled").length,
  };

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
              <h1 className="text-xl font-bold">Item Requests</h1>
              <p className="text-sm text-muted-foreground">
                {requests.length} requests
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.approved}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Fulfilled</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.fulfilled}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as ItemRequestStatus | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Requests Found</h3>
              <p className="text-muted-foreground">
                No item requests match your search criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => {
              const StatusIcon = statusIcons[request.status];
              return (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold">{request.item_name}</h3>
                          <Badge className={statusColors[request.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          by <strong>{request.user_name}</strong> •{" "}
                          {request.user_email}
                        </p>
                        {request.item_description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {request.item_description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {request.requested_price && (
                            <span className="text-xs bg-muted px-2 py-1 rounded">
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
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              Qty: <strong>{request.quantity_needed}</strong>
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(request.created_at)}
                          </span>
                        </div>
                        {request.admin_notes && (
                          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-800">
                              <strong>Note:</strong> {request.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {request.images && request.images.length > 0 && (
                          <div className="flex gap-1">
                            {request.images.slice(0, 2).map((img, idx) => (
                              <a
                                key={idx}
                                href={img}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={img}
                                  alt={`Ref ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ))}
                            {request.images.length > 2 && (
                              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs">
                                +{request.images.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                        <Button
                          size="sm"
                          onClick={() => openUpdateDialog(request)}
                          style={{ backgroundColor: settings.primary_color }}
                        >
                          Update
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Update Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={() => setSelectedRequest(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Item</p>
                <p className="font-medium">{selectedRequest.item_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requested by</p>
                <p className="font-medium">
                  {selectedRequest.user_name} ({selectedRequest.user_email})
                </p>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={updateForm.status}
                  onValueChange={(v) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      status: v as ItemRequestStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin_notes">Admin Notes</Label>
                <Textarea
                  id="admin_notes"
                  value={updateForm.admin_notes}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      admin_notes: e.target.value,
                    }))
                  }
                  placeholder="Add notes..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  style={{ backgroundColor: settings.primary_color }}
                >
                  {isUpdating ? "Updating..." : "Update Request"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
