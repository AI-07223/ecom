"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";
import { ItemRequest, ItemRequestStatus } from "@/types/database.types";
import { ImageUpload } from "@/components/admin/ImageUpload";

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

export default function ItemRequestsPage() {
  const router = useRouter();
  const { user, isWholeseller, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    item_name: "",
    item_description: "",
    requested_price: "",
    quantity_needed: "",
    images: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/profile/requests");
    }
  }, [user, authLoading, router]);

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
    if (user) {
      fetchRequests();
    }
  }, [user, fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) {
      toast.error("Please sign in to submit a request");
      return;
    }

    if (!formData.item_name.trim()) {
      toast.error("Please enter an item name");
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "item_requests"), {
        user_id: user.uid,
        user_email: user.email,
        user_name: user.displayName || user.email,
        item_name: formData.item_name.trim(),
        item_description: formData.item_description.trim() || null,
        requested_price: formData.requested_price
          ? parseFloat(formData.requested_price)
          : null,
        quantity_needed: formData.quantity_needed
          ? parseInt(formData.quantity_needed)
          : null,
        images: formData.images,
        status: "pending",
        admin_notes: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      toast.success("Item request submitted successfully!");
      setFormData({
        item_name: "",
        item_description: "",
        requested_price: "",
        quantity_needed: "",
        images: [],
      });
      setShowForm(false);
      fetchRequests();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, "item_requests", requestId));
      toast.success("Request deleted");
      setDeleteConfirm(null);
      fetchRequests();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Failed to delete request");
    }
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show upgrade message for non-wholesellers
  if (!isWholeseller) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${settings.primary_color}15` }}
          >
            <Package
              className="h-10 w-10"
              style={{ color: settings.primary_color }}
            />
          </div>
          <h1 className="text-2xl font-bold mb-4">Wholeseller Feature</h1>
          <p className="text-muted-foreground mb-6">
            Item requests are exclusive to wholesellers. Contact our admin team
            to upgrade your account and access special wholesale pricing and
            features.
          </p>
          <Link href="/contact">
            <Button style={{ backgroundColor: settings.primary_color }}>
              Contact Admin
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Item Requests</h1>
          <p className="text-muted-foreground">
            Request items not available in our store
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          style={{ backgroundColor: settings.primary_color }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Request Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request an Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="item_name">Item Name *</Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    item_name: e.target.value,
                  }))
                }
                placeholder="e.g., iPhone 15 Pro Max 256GB"
                required
              />
            </div>

            <div>
              <Label htmlFor="item_description">Description</Label>
              <Textarea
                id="item_description"
                value={formData.item_description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    item_description: e.target.value,
                  }))
                }
                placeholder="Describe the item, specifications, preferred brand, etc."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requested_price">
                  Expected Price ({settings.currency_symbol})
                </Label>
                <Input
                  id="requested_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.requested_price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      requested_price: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="quantity_needed">Quantity Needed</Label>
                <Input
                  id="quantity_needed"
                  type="number"
                  min="1"
                  value={formData.quantity_needed}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity_needed: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <Label>Reference Images</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload images of the item you&apos;re looking for (optional)
              </p>
              <ImageUpload
                value={formData.images}
                onChange={(urls) =>
                  setFormData((prev) => ({ ...prev, images: urls }))
                }
                maxImages={5}
                folder="item_requests"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: settings.primary_color }}
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <h3 className="text-lg font-semibold mb-2">No Requests Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven&apos;t made any item requests. Click the button above to
              request an item.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              style={{ backgroundColor: settings.primary_color }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Make Your First Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const StatusIcon = statusIcons[request.status];
            return (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
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

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {request.requested_price && (
                          <span>
                            Expected Price:{" "}
                            <strong>
                              {settings.currency_symbol}
                              {request.requested_price.toLocaleString("en-IN")}
                            </strong>
                          </span>
                        )}
                        {request.quantity_needed && (
                          <span>
                            Quantity: <strong>{request.quantity_needed}</strong>
                          </span>
                        )}
                        <span>Submitted: {formatDate(request.created_at)}</span>
                      </div>

                      {request.admin_notes && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm">
                            <strong>Admin Note:</strong> {request.admin_notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col items-center gap-3">
                      {request.images && request.images.length > 0 && (
                        <div className="flex gap-2">
                          {request.images.slice(0, 3).map((img, idx) => (
                            <div
                              key={idx}
                              className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted"
                            >
                              <img
                                src={img}
                                alt={`Reference ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {request.images.length > 3 && (
                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-sm">
                              +{request.images.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      {request.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => setDeleteConfirm(request.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
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

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this request? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
