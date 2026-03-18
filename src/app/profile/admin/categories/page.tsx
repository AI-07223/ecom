"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Category } from "@/types/database.types";
import { toast } from "sonner";
import { CategoryForm } from "@/components/admin/CategoryForm";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { settings } = useSiteSettings();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    parent_id: "",
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/profile");
    }
  }, [user, isAdmin, authLoading, router]);

  const fetchCategories = async () => {
    try {
      const categoriesSnap = await getDocs(collection(db, "categories"));
      const cats = categoriesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      cats.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setCategories(cats);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchCategories();
    }
  }, [isAdmin]);

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

    if (isSaving) return; // Prevent double submission

    setIsSaving(true);

    const categoryId = editingCategory?.id || formData.slug;

    try {
      await setDoc(doc(db, "categories", categoryId), {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        image_url: formData.image_url || null,
        parent_id: formData.parent_id || null,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order.toString()) || 0,
        created_at: editingCategory?.created_at || serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      toast.success(editingCategory ? "Category updated" : "Category created");
      setIsDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  const checkProductsInCategory = async (categoryId: string) => {
    const q = query(
      collection(db, "products"),
      where("category_id", "==", categoryId),
    );
    const snap = await getDocs(q);
    return snap.size;
  };

  const handleDelete = async (categoryId: string) => {
    try {
      // Check if products use this category
      const productCount = await checkProductsInCategory(categoryId);
      if (productCount > 0) {
        toast.error(
          `Cannot delete: ${productCount} product${productCount > 1 ? "s" : ""} use this category. Please reassign them first.`,
        );
        setDeleteConfirm(null);
        return;
      }

      await deleteDoc(doc(db, "categories", categoryId));
      toast.success("Category deleted");
      setDeleteConfirm(null);
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      parent_id: "",
      is_active: true,
      sort_order: categories.length,
    });
    setEditingCategory(null);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image_url: category.image_url || "",
      parent_id: category.parent_id || "",
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setIsDialogOpen(true);
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {categories.length} categories
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          style={{ backgroundColor: settings.primary_color }}
          className="w-full sm:w-auto"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">No categories yet</p>
            <Button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 hidden sm:block" />
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${settings.primary_color}15` }}
                    >
                      <span
                        className="text-xl font-bold"
                        style={{ color: settings.primary_color }}
                      >
                        {category.name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">
                          {category.name}
                        </h3>
                        <Badge
                          variant={category.is_active ? "default" : "outline"}
                          className="shrink-0"
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {category.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditDialog(category)}
                      className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-accent transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="inline-flex items-center justify-center h-10 w-10 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                      onClick={() => setDeleteConfirm(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog - Mobile Optimized */}
      <CategoryForm
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingCategory={editingCategory}
        categories={categories}
        formData={formData}
        setFormData={setFormData}
        isSaving={isSaving}
        primaryColor={settings.primary_color}
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure? Products in this category will be unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
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
