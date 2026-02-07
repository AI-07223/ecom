"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  User,
  Mail,
  IndianRupee,
  Hash,
  MessageSquare,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  fulfilled: "bg-blue-100 text-blue-800 border-blue-200",
};

const statusIcons: Record<ItemRequestStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  fulfilled: Package,
};

const statusLabels: Record<ItemRequestStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  fulfilled: "Fulfilled",
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF5] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E0DA] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Item Requests</h1>
              <p className="text-sm text-[#6B7280]">
                {requests.length} requests from customers
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="border-[#E2E0DA] shadow-soft">
            <CardContent className="p-4">
              <p className="text-xs text-[#6B7280]">Total Requests</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-[#E2E0DA] shadow-soft">
            <CardContent className="p-4">
              <p className="text-xs text-[#6B7280]">Pending</p>
              <p className="text-2xl font-bold text-amber-600">
                {stats.pending}
              </p>
            </CardContent>
          </Card>
          <Card className="border-[#E2E0DA] shadow-soft">
            <CardContent className="p-4">
              <p className="text-xs text-[#6B7280]">Approved</p>
              <p className="text-2xl font-bold text-emerald-600">
                {stats.approved}
              </p>
            </CardContent>
          </Card>
          <Card className="border-[#E2E0DA] shadow-soft">
            <CardContent className="p-4">
              <p className="text-xs text-[#6B7280]">Fulfilled</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.fulfilled}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 border-[#E2E0DA] shadow-soft">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <Input
                  placeholder="Search by item, customer name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 border-[#E2E0DA] focus:border-[#2D5A27]"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as ItemRequestStatus | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[180px] border-[#E2E0DA]">
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
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl bg-[#E2E0DA]" />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="border-[#E2E0DA]">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-[#9CA3AF] mb-4" />
              <h3 className="text-lg font-semibold text-[#1A1A1A]">No Requests Found</h3>
              <p className="text-[#6B7280]">
                No item requests match your search criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const StatusIcon = statusIcons[request.status];
              return (
                <Card key={request.id} className="border-[#E2E0DA] shadow-soft overflow-hidden">
                  <CardContent className="p-4">
                    {/* Header: Item Name & Status */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold text-lg text-[#1A1A1A]">{request.item_name}</h3>
                          <Badge className={`${statusColors[request.status]} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabels[request.status]}
                          </Badge>
                        </div>
                        
                        {/* Customer Info */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[#6B7280]">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {request.user_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {request.user_email}
                          </span>
                        </div>
                      </div>
                      
                      {/* Images */}
                      {request.images && request.images.length > 0 && (
                        <div className="flex gap-2 shrink-0">
                          {request.images.slice(0, 2).map((img, idx) => (
                            <a
                              key={idx}
                              href={img}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#F0EFE8] border border-[#E2E0DA] hover:opacity-80 transition-opacity"
                            >
                              <Image
                                src={img}
                                alt={`Reference ${idx + 1}`}
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            </a>
                          ))}
                          {request.images.length > 2 && (
                            <div className="w-14 h-14 rounded-xl bg-[#F0EFE8] border border-[#E2E0DA] flex items-center justify-center">
                              <span className="text-sm font-medium text-[#6B7280]">
                                +{request.images.length - 2}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {request.item_description && (
                      <div className="mb-4 p-3 bg-[#F0EFE8] rounded-xl">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-[#6B7280] mt-0.5 shrink-0" />
                          <p className="text-sm text-[#1A1A1A]">
                            {request.item_description}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Details Row */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      {request.requested_price && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <IndianRupee className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs text-[#6B7280]">Expected Price</p>
                            <p className="font-medium text-[#1A1A1A]">
                              {settings.currency_symbol}{request.requested_price.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      )}
                      {request.quantity_needed && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Hash className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-[#6B7280]">Quantity Needed</p>
                            <p className="font-medium text-[#1A1A1A]">{request.quantity_needed} units</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-sm ml-auto">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-[#6B7280]">Requested On</p>
                          <p className="font-medium text-[#1A1A1A]">{formatDate(request.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes */}
                    {request.admin_notes && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">Admin Note</p>
                            <p className="text-sm text-blue-900">{request.admin_notes}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="flex justify-end pt-2 border-t border-[#E2E0DA]">
                      <Button
                        size="sm"
                        onClick={() => openUpdateDialog(request)}
                        className="h-9 rounded-lg tap-active"
                        style={{ backgroundColor: settings.primary_color }}
                      >
                        Update Status
                      </Button>
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
            <DialogTitle className="text-[#1A1A1A]">Update Request Status</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-[#F0EFE8] rounded-xl">
                <p className="text-xs text-[#6B7280] mb-1">Item</p>
                <p className="font-medium text-[#1A1A1A]">{selectedRequest.item_name}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-[#6B7280]" />
                <span className="text-[#6B7280]">Requested by</span>
                <span className="font-medium text-[#1A1A1A]">
                  {selectedRequest.user_name} ({selectedRequest.user_email})
                </span>
              </div>
              <div>
                <Label htmlFor="status" className="text-[#1A1A1A]">Status</Label>
                <Select
                  value={updateForm.status}
                  onValueChange={(v) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      status: v as ItemRequestStatus,
                    }))
                  }
                >
                  <SelectTrigger className="border-[#E2E0DA]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin_notes" className="text-[#1A1A1A]">Admin Notes</Label>
                <Textarea
                  id="admin_notes"
                  value={updateForm.admin_notes}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      admin_notes: e.target.value,
                    }))
                  }
                  placeholder="Add notes for the customer..."
                  rows={3}
                  className="border-[#E2E0DA] focus:border-[#2D5A27]"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                  className="border-[#E2E0DA]"
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
