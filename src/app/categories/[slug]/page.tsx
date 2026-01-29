"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductGrid } from "@/components/products/ProductGrid";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Category, Product } from "@/types/database.types";

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { settings } = useSiteSettings();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategoryAndProducts = async () => {
      try {
        // Find category by slug
        const categoriesQuery = query(
          collection(db, "categories"),
          where("slug", "==", slug),
          where("is_active", "==", true),
        );
        const categoriesSnap = await getDocs(categoriesQuery);

        if (categoriesSnap.empty) {
          setIsLoading(false);
          return;
        }

        const categoryDoc = categoriesSnap.docs[0];
        const categoryData = {
          id: categoryDoc.id,
          ...categoryDoc.data(),
        } as Category;
        setCategory(categoryData);

        // Fetch products in this category
        const productsQuery = query(
          collection(db, "products"),
          where("category_id", "==", categoryDoc.id),
          where("is_active", "==", true),
        );
        const productsSnap = await getDocs(productsQuery);
        const productsList = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(productsList);
      } catch (error) {
        console.error("Error fetching category:", error);
      }
      setIsLoading(false);
    };

    if (slug) {
      fetchCategoryAndProducts();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The category you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/categories"
          className="font-medium hover:underline"
          style={{ color: settings.primary_color }}
        >
          Browse all categories
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/categories" className="hover:text-foreground">
          Categories
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{category.name}</span>
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground">{category.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
      </div>

      {/* Products Grid */}
      <ProductGrid products={products} isLoading={false} />
    </div>
  );
}
