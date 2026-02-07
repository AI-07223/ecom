"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowLeft,
  ImageIcon,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ImageUpload } from "@/components/admin/ImageUpload";
import { useAuth } from "@/providers/AuthProvider";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Product, Category } from "@/types/database.types";
import { toast } from "sonner";
import { Suspense } from "react";
import { Pagination } from "@/components/ui/pagination";

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    price: "",
    wholeseller_price: "",
    compare_at_price: "",
    quantity: "",
    category_id: "",
    images: [] as string[],
    tags: "",
    sku: "",
    barcode: "",
    weight: "",
    is_active: true,
    is_featured: false,
    track_inventory: true,
    allow_backorder: false,
  });

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      short_description: "",
      price: "",
      wholeseller_price: "",
      compare_at_price: "",
      quantity: "",
      category_id: "",
      images: [],
      tags: "",
      sku: "",
      barcode: "",
      weight: "",
      is_active: true,
      is_featured: false,
      track_inventory: true,
      allow_backorder: false,
    });
    setEditingProduct(null);
  }, []);

  const openEditForm = useCallback((product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      short_description: product.short_description || "",
      price: product.price.toString(),
      wholeseller_price: product.wholeseller_price?.toString() || "",
      compare_at_price: product.compare_at_price?.toString() || "",
      quantity: product.quantity.toString(),
      category_id: product.category_id || "",
      images: product.images || [],
      tags: product.tags?.join(", ") || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      weight: product.weight?.toString() || "",
      is_active: product.is_active,
      is_featured: product.is_featured,
      track_inventory: product.track_inventory,
      allow_backorder: product.allow_backorder,
    });
    setShowForm(true);
  }, []);

  const loadProduct = useCallback(
    async (productId: string) => {
      try {
        const productDoc = await getDoc(doc(db, "products", productId));
        if (productDoc.exists()) {
          openEditForm({ id: productDoc.id, ...productDoc.data() } as Product);
        }
      } catch (error) {
        console.error("Error loading product:", error);
        toast.error("Failed to load product");
      }
    },
    [openEditForm],
  );

  const fetchData = useCallback(async () => {
    try {
      const [productsSnap, categoriesSnap] = await Promise.all([
        getDocs(
          query(collection(db, "products"), orderBy("created_at", "desc")),
        ),
        getDocs(collection(db, "categories")),
      ]);
      setProducts(
        productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[],
      );
      setCategories(
        categoriesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[],
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) router.push("/profile");
  }, [user, isAdmin, authLoading, router]);

  useEffect(() => {
    const action = searchParams.get("action");
    const productId = searchParams.get("id");
    if (action === "new") {
      resetForm();
      setShowForm(true);
    } else if (action === "edit" && productId) loadProduct(productId);
  }, [searchParams, resetForm, loadProduct]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const formatPrice = (price: number) =>
    `${settings.currency_symbol}${price.toLocaleString("en-IN")}`;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "name") {
      setFormData((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug || !formData.price) {
      toast.error("Please fill in required fields");
      return;
    }
    setIsSaving(true);
    const productId = editingProduct?.id || `prod-${Date.now()}`;
    try {
      await setDoc(doc(db, "products", productId), {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        short_description: formData.short_description || null,
        price: parseFloat(formData.price) || 0,
        wholeseller_price: formData.wholeseller_price
          ? parseFloat(formData.wholeseller_price)
          : null,
        compare_at_price: formData.compare_at_price
          ? parseFloat(formData.compare_at_price)
          : null,
        quantity: parseInt(formData.quantity) || 0,
        category_id: formData.category_id || null,
        images: formData.images,
        thumbnail: formData.images[0] || null,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim())
          : [],
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        track_inventory: formData.track_inventory,
        allow_backorder: formData.allow_backorder,
        created_at: editingProduct?.created_at || serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      toast.success(editingProduct ? "Product updated!" : "Product created!");
      setShowForm(false);
      resetForm();
      fetchData();
      router.push("/profile/admin/products");
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
    setIsSaving(false);
  };

  const handleDelete = async (productId: string) => {
    try {
      await deleteDoc(doc(db, "products", productId));
      toast.success("Product deleted");
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
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

  if (showForm) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                resetForm();
                router.push("/profile/admin/products");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <h1 className="text-xl font-bold mb-6">
            {editingProduct ? "Edit Product" : "Add New Product"}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
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
                    <Label htmlFor="price">
                      Price ({settings.currency_symbol}) *
                    </Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
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
                    onChange={handleInputChange}
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
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
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
                    <Label className="text-sm cursor-pointer">Track inventory</Label>
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
                    <Label className="text-sm cursor-pointer">Allow backorders</Label>
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
                    onChange={handleInputChange}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  router.push("/profile/admin/products");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                style={{ backgroundColor: settings.primary_color }}
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

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Products</h1>
              <p className="text-sm text-muted-foreground">
                {products.length} products
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={{ backgroundColor: settings.primary_color }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
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
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No products found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-muted rounded-lg shrink-0 overflow-hidden">
                        {product.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h3 className="font-semibold truncate text-sm sm:text-base">
                              {product.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {product.sku || product.slug}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={() => openEditForm(product)}
                            >
                              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-red-500"
                              onClick={() => setDeleteConfirm(product.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className="font-medium text-sm"
                            style={{ color: settings.primary_color }}
                          >
                            {formatPrice(product.price)}
                          </span>
                          <Badge
                            variant={
                              product.quantity > 5
                                ? "secondary"
                                : product.quantity > 0
                                  ? "outline"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {product.quantity} in stock
                          </Badge>
                          {product.is_active ? (
                            <Badge className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Draft</Badge>
                          )}
                          {product.is_featured && (
                            <Badge variant="secondary" className="text-xs">Featured</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length > 0 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={filteredProducts.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </div>
            )}
          </>
        )}
      </div>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
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

export default function AdminProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
