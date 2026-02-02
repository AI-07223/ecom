"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Ticket, Tag, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase: number | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: { toDate: () => Date } | Date | null;
  created_at: { toDate: () => Date } | Date;
}

export default function AdminCouponsPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: "",
    min_purchase: "",
    max_uses: "",
    is_active: true,
    expires_at: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/profile");
  }, [user, isAdmin, authLoading, router]);

  const fetchCoupons = async () => {
    try {
      const couponsSnap = await getDocs(
        query(collection(db, "coupons"), orderBy("created_at", "desc")),
      );
      setCoupons(
        couponsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Coupon[],
      );
    } catch (error) {
      console.error("Error fetching coupons:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchCoupons();
  }, [isAdmin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const couponId = editingCoupon?.id || formData.code.toUpperCase();
    try {
      await setDoc(doc(db, "coupons", couponId), {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value) || 0,
        min_purchase: formData.min_purchase
          ? parseFloat(formData.min_purchase)
          : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        current_uses: editingCoupon?.current_uses || 0,
        is_active: formData.is_active,
        expires_at: formData.expires_at ? new Date(formData.expires_at) : null,
        created_at: editingCoupon?.created_at || serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      toast.success(editingCoupon ? "Coupon updated" : "Coupon created");
      setIsDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error("Failed to save coupon");
    }
  };

  const handleDelete = async (couponId: string) => {
    try {
      await deleteDoc(doc(db, "coupons", couponId));
      toast.success("Coupon deleted");
      setDeleteConfirm(null);
      fetchCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Failed to delete coupon");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      min_purchase: "",
      max_uses: "",
      is_active: true,
      expires_at: "",
    });
    setEditingCoupon(null);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_purchase: coupon.min_purchase?.toString() || "",
      max_uses: coupon.max_uses?.toString() || "",
      is_active: coupon.is_active,
      expires_at: coupon.expires_at
        ? ("toDate" in coupon.expires_at
            ? coupon.expires_at.toDate()
            : coupon.expires_at
          )
            .toISOString()
            .split("T")[0]
        : "",
    });
    setIsDialogOpen(true);
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage")
      return `${coupon.discount_value}%`;
    return `${settings.currency_symbol}${coupon.discount_value}`;
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
              <h1 className="text-xl font-bold">Coupons</h1>
              <p className="text-sm text-muted-foreground">
                {coupons.length} coupons
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              style={{ backgroundColor: settings.primary_color }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Coupon
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No coupons yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first coupon to get started
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Create Coupon
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <Card key={coupon.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono font-bold text-lg">
                            {coupon.code}
                          </span>
                        </div>
                        <Badge
                          variant={coupon.is_active ? "default" : "secondary"}
                        >
                          {coupon.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Percent className="h-3.5 w-3.5" />
                        <span>{formatDiscount(coupon)} off</span>
                        {coupon.min_purchase ? (
                          <span>
                            • Min {settings.currency_symbol}
                            {coupon.min_purchase}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Used {coupon.current_uses}
                        {coupon.max_uses ? ` / ${coupon.max_uses}` : " times"}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => setDeleteConfirm(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Edit Coupon" : "Create Coupon"}
            </DialogTitle>
            <DialogDescription>
              Configure your discount coupon
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Coupon Code</Label>
              <Input
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="SAVE20"
                className="uppercase"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v: "percentage" | "fixed") =>
                    setFormData((prev) => ({ ...prev, discount_type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discount_value">Discount Value</Label>
                <Input
                  id="discount_value"
                  name="discount_value"
                  type="number"
                  value={formData.discount_value}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_purchase">Min Purchase</Label>
                <Input
                  id="min_purchase"
                  name="min_purchase"
                  type="number"
                  value={formData.min_purchase}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="max_uses">Max Uses</Label>
                <Input
                  id="max_uses"
                  name="max_uses"
                  type="number"
                  value={formData.max_uses}
                  onChange={handleInputChange}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="expires_at">Expires At</Label>
              <Input
                id="expires_at"
                name="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
              <Label>Active</Label>
            </div>
            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                style={{ backgroundColor: settings.primary_color }}
              >
                {editingCoupon ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this coupon?
            </DialogDescription>
          </DialogHeader>
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
