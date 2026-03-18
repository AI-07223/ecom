"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
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
import { Category } from "@/types/database.types";
import { SingleImageUpload } from "@/components/admin/SingleImageUpload";

interface CategoryFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingCategory: Category | null;
  categories: Category[];
  formData: {
    name: string;
    slug: string;
    description: string;
    image_url: string;
    parent_id: string;
    is_active: boolean;
    sort_order: number;
  };
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormProps["formData"]>>;
  isSaving: boolean;
  primaryColor: string;
  onSubmit: (e: React.FormEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export function CategoryForm({
  isOpen,
  onOpenChange,
  editingCategory,
  categories,
  formData,
  setFormData,
  isSaving,
  primaryColor,
  onSubmit,
  onInputChange,
}: CategoryFormProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingCategory ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <Label htmlFor="name" className="text-base md:text-sm mb-2 block">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              required
              enterKeyHint="next"
            />
          </div>
          <div>
            <Label htmlFor="slug" className="text-base md:text-sm mb-2 block">
              Slug <span className="text-destructive">*</span>
            </Label>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={onInputChange}
              required
              enterKeyHint="next"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Used in URL: /categories/{formData.slug || "slug"}
            </p>
          </div>
          <div>
            <Label
              htmlFor="description"
              className="text-base md:text-sm mb-2 block"
            >
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={onInputChange}
              rows={3}
              enterKeyHint="next"
            />
          </div>
          <div>
            <SingleImageUpload
              value={formData.image_url || null}
              onChange={(url) =>
                setFormData((prev) => ({ ...prev, image_url: url || "" }))
              }
              folder="categories"
              label="Category Image"
            />
          </div>
          <div>
            <Label htmlFor="parent_id" className="text-base md:text-sm mb-2 block">
              Parent Category
            </Label>
            <Select
              value={formData.parent_id}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, parent_id: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Top Level)</SelectItem>
                {categories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="sort_order"
                className="text-base md:text-sm mb-2 block"
              >
                Sort Order
              </Label>
              <Input
                id="sort_order"
                name="sort_order"
                type="number"
                inputMode="numeric"
                value={formData.sort_order}
                onChange={onInputChange}
                enterKeyHint="next"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
                }
              />
              <Label className="text-base md:text-sm mb-0">Active</Label>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              size="lg"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{ backgroundColor: primaryColor }}
              className="flex-1"
              size="lg"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingCategory ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{editingCategory ? "Update" : "Create"}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
