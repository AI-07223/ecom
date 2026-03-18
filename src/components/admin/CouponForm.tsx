"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Coupon } from "@/types/database.types";

interface CouponFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCoupon: Coupon | null;
  formData: {
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: string;
    min_order_amount: string;
    usage_limit: string;
    description: string;
    max_discount_amount: string;
    is_active: boolean;
    starts_at: string;
    expires_at: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<CouponFormProps["formData"]>>;
  isSaving: boolean;
  primaryColor: string;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CouponForm({
  isOpen,
  onOpenChange,
  editingCoupon,
  formData,
  setFormData,
  isSaving,
  primaryColor,
  onSubmit,
  onInputChange,
}: CouponFormProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingCoupon ? "Edit Coupon" : "Create Coupon"}
          </DialogTitle>
          <DialogDescription>
            Configure your discount coupon
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="code">Coupon Code</Label>
            <Input
              id="code"
              name="code"
              value={formData.code}
              onChange={onInputChange}
              placeholder="SAVE20"
              className="uppercase"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={onInputChange}
              placeholder="Optional description"
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
                onChange={onInputChange}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_order_amount">Min Order Amount</Label>
              <Input
                id="min_order_amount"
                name="min_order_amount"
                type="number"
                value={formData.min_order_amount}
                onChange={onInputChange}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="usage_limit">Usage Limit</Label>
              <Input
                id="usage_limit"
                name="usage_limit"
                type="number"
                value={formData.usage_limit}
                onChange={onInputChange}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="starts_at">Starts At</Label>
              <Input
                id="starts_at"
                name="starts_at"
                type="date"
                value={formData.starts_at}
                onChange={onInputChange}
              />
            </div>
            <div>
              <Label htmlFor="expires_at">Expires At</Label>
              <Input
                id="expires_at"
                name="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={onInputChange}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="max_discount_amount">Max Discount Amount</Label>
            <Input
              id="max_discount_amount"
              name="max_discount_amount"
              type="number"
              value={formData.max_discount_amount}
              onChange={onInputChange}
              placeholder="Optional (for percentage discounts)"
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
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{ backgroundColor: primaryColor }}
              disabled={isSaving}
            >
              {editingCoupon ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
