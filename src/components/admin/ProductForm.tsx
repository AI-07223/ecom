"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Product, Category } from "@/types/database.types";

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: string;
  wholeseller_price: string;
  compare_at_price: string;
  quantity: string;
  category_id: string;
  images: string[];
  tags: string;
  sku: string;
  barcode: string;
  weight: string;
  is_active: boolean;
  is_featured: boolean;
  track_inventory: boolean;
  allow_backorder: boolean;
}

interface ProductFormProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  editingProduct: Product | null;
  categories: Category[];
  isSaving: boolean;
  currencySymbol: string;
  primaryColor: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}

export function ProductForm({
  formData,
  setFormData,
  editingProduct,
  categories,
  isSaving,
  currencySymbol,
  primaryColor,
  onSubmit,
  onCancel,
  onInputChange,
}: ProductFormProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </button>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-xl font-bold mb-6">
          {editingProduct ? "Edit Product" : "Add New Product"}
        </h1>
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={onInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={onInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="short_description">Short Description</Label>
                <Input
                  id="short_description"
                  name="short_description"
                  value={formData.short_description}
                  onChange={onInputChange}
                />
              </div>
              <div>
                <Label htmlFor="description">Full Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={onInputChange}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={formData.images}
                onChange={(urls) =>
                  setFormData((prev) => ({ ...prev, images: urls }))
                }
                maxImages={5}
                folder="products"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price ({currencySymbol}) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={onInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="compare_at_price">Compare at Price</Label>
                  <Input
                    id="compare_at_price"
                    name="compare_at_price"
                    type="number"
                    step="0.01"
                    value={formData.compare_at_price}
                    onChange={onInputChange}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="wholeseller_price">Wholeseller Price</Label>
                <Input
                  id="wholeseller_price"
                  name="wholeseller_price"
                  type="number"
                  step="0.01"
                  value={formData.wholeseller_price}
                  onChange={onInputChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity">Stock Quantity *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={onInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={onInputChange}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 min-w-[140px]">
                  <Switch
                    checked={formData.track_inventory}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        track_inventory: checked,
                      }))
                    }
                    className="data-[state=checked]:bg-[#2D5A27]"
                  />
                  <Label className="text-sm cursor-pointer">
                    Track inventory
                  </Label>
                </div>
                <div className="flex items-center gap-3 min-w-[140px]">
                  <Switch
                    checked={formData.allow_backorder}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        allow_backorder: checked,
                      }))
                    }
                    className="data-[state=checked]:bg-[#2D5A27]"
                  />
                  <Label className="text-sm cursor-pointer">
                    Allow backorders
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category_id || "none"}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: value === "none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={onInputChange}
                  placeholder="wireless, audio"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 min-w-[120px]">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_active: checked }))
                    }
                    className="data-[state=checked]:bg-[#2D5A27]"
                  />
                  <Label className="text-sm cursor-pointer">Active</Label>
                </div>
                <div className="flex items-center gap-3 min-w-[120px]">
                  <Switch
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        is_featured: checked,
                      }))
                    }
                    className="data-[state=checked]:bg-[#2D5A27]"
                  />
                  <Label className="text-sm cursor-pointer">Featured</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              style={{ backgroundColor: primaryColor }}
            >
              {isSaving
                ? "Saving..."
                : editingProduct
                  ? "Update Product"
                  : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
