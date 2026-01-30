"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Truck, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductGrid } from "@/components/products/ProductGrid";
import { useSiteSettings } from "@/providers/SiteSettingsProvider";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Product, Category } from "@/types/database.types";

const features = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "On orders over ₹999",
  },
  {
    icon: Shield,
    title: "Secure Payment",
    description: "100% secure checkout",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Dedicated customer support",
  },
  {
    icon: Sparkles,
    title: "Premium Quality",
    description: "Curated products only",
  },
];

export default function HomePage() {
  const { settings } = useSiteSettings();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch only featured and active products with limit
        const productsQuery = query(
          collection(db, "products"),
          where("is_active", "==", true),
          where("is_featured", "==", true),
          orderBy("created_at", "desc"),
          limit(8),
        );
        const productsSnap = await getDocs(productsQuery);
        const featured = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setFeaturedProducts(featured);
      } catch (error: unknown) {
        console.error("Error fetching featured products:", error);

        // Fallback: fetch without orderBy and sort client-side
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = (error as { code?: string })?.code;
        if (
          errorMessage.includes("index") ||
          errorCode === "failed-precondition"
        ) {
          console.warn(
            "Missing Firestore composite index. Falling back to client-side sorting.",
          );
          try {
            const fallbackQuery = query(
              collection(db, "products"),
              where("is_active", "==", true),
              where("is_featured", "==", true),
              limit(50),
            );
            const fallbackSnap = await getDocs(fallbackQuery);
            const fallbackProducts = fallbackSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Product[];

            // Sort by created_at client-side
            fallbackProducts.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );

            setFeaturedProducts(fallbackProducts.slice(0, 8));
          } catch (fallbackError) {
            console.error("Fallback fetch failed:", fallbackError);
          }
        }
      }

      try {
        // Fetch only active categories with limit
        const categoriesQuery = query(
          collection(db, "categories"),
          where("is_active", "==", true),
          orderBy("sort_order", "asc"),
          limit(6),
        );
        const categoriesSnap = await getDocs(categoriesQuery);
        const cats = categoriesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(cats);
      } catch (error: unknown) {
        console.error("Error fetching categories:", error);

        // Fallback for categories
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = (error as { code?: string })?.code;
        if (
          errorMessage.includes("index") ||
          errorCode === "failed-precondition"
        ) {
          try {
            const fallbackQuery = query(
              collection(db, "categories"),
              where("is_active", "==", true),
              limit(50),
            );
            const fallbackSnap = await getDocs(fallbackQuery);
            const fallbackCats = fallbackSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Category[];

            // Sort by sort_order client-side
            fallbackCats.sort((a, b) => a.sort_order - b.sort_order);

            setCategories(fallbackCats.slice(0, 6));
          } catch (fallbackError) {
            console.error("Category fallback fetch failed:", fallbackError);
          }
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: `linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.primary_color}dd 50%, ${settings.primary_color}bb 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Welcome to{" "}
              <span style={{ color: settings.accent_color }}>
                {settings.site_name}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              {settings.site_description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button
                  size="lg"
                  className="bg-white hover:bg-gray-100"
                  style={{ color: settings.primary_color }}
                >
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/categories">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                >
                  Browse Categories
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className="p-3 rounded-full"
                  style={{ backgroundColor: `${settings.primary_color}15` }}
                >
                  <feature.icon
                    className="h-5 w-5"
                    style={{ color: settings.primary_color }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">
                Shop by Category
              </h2>
              <Link href="/categories">
                <Button variant="ghost">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((category) => (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div
                        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: `${settings.primary_color}15`,
                        }}
                      >
                        <span
                          className="text-2xl font-bold"
                          style={{ color: settings.primary_color }}
                        >
                          {category.name.charAt(0)}
                        </span>
                      </div>
                      <h3 className="font-medium group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">
              Featured Products
            </h2>
            <Link href="/products?featured=true">
              <Button variant="ghost">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <ProductGrid products={featuredProducts} isLoading={isLoading} />
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20"
        style={{ backgroundColor: settings.primary_color }}
      >
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Shopping?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of happy customers. Sign up today and get 10% off
            your first order!
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              className="bg-white text-purple-700 hover:bg-gray-100"
            >
              Create an Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
