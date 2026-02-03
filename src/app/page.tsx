"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Truck,
  Shield,
  Clock,
  Award,
  ChevronRight,
  Star,
  Sparkles,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/ProductGrid";
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
    title: "Free Delivery",
    description: "On orders over ₹999",
  },
  {
    icon: Shield,
    title: "Genuine Products",
    description: "100% authentic",
  },
  {
    icon: Clock,
    title: "Fast Shipping",
    description: "2-4 days delivery",
  },
  {
    icon: Award,
    title: "Best Quality",
    description: "Curated by experts",
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = (error as { code?: string })?.code;
        if (
          errorMessage.includes("index") ||
          errorCode === "failed-precondition"
        ) {
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
    <div className="min-h-screen bg-[#FAFAF5] pb-20 md:pb-0">
      {/* Hero Section - Fresh Green Theme */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-[#F0EFE8]">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#2D5A27]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#4CAF50]/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

        <div className="container mx-auto px-4 py-10 md:py-16 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Logo Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white border border-[#E2E0DA] shadow-soft mb-6">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#2D5A27]/20">
                <Image
                  src="/logo.jpeg"
                  alt="RTC"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-[#2D5A27] text-xs font-semibold tracking-wider uppercase">
                Premium Quality
              </span>
              <span className="text-[#9CA3AF] text-xs">|</span>
              <span className="text-[#6B7280] text-xs">Since 2020</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4 leading-tight">
              Royal Trading
              <span className="block text-gradient-green-shimmer mt-1">
                Company
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-[#6B7280] mb-6 max-w-lg mx-auto leading-relaxed">
              Premium crockery, cutlery, homecare & cleaning essentials for the
              discerning customer
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
              <Link href="/products" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-bold px-8 rounded-full shadow-green hover:shadow-green-lg tap-scale"
                >
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/categories" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-[#2D5A27]/30 text-[#2D5A27] hover:bg-[#2D5A27]/10 px-8 rounded-full tap-scale"
                >
                  Categories
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex justify-center gap-6 mt-8 text-[#9CA3AF] text-xs">
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-[#2D5A27]" />
                <span className="text-[#6B7280]">Genuine</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-[#2D5A27]" />
                <span className="text-[#6B7280]">Free Delivery</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-[#2D5A27]" />
                <span className="text-[#6B7280]">Best Prices</span>
              </span>
            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60V30C240 10 480 0 720 0C960 0 1200 10 1440 30V60H0Z" fill="#FAFAF5" />
          </svg>
        </div>
      </section>

      {/* Features Section - Modern Cards */}
      <section className="py-6 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 border border-[#E2E0DA] hover:border-[#2D5A27]/30 hover:shadow-soft transition-all tap-scale"
              >
                <div className="w-10 h-10 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center mb-3">
                  <feature.icon className="h-5 w-5 text-[#2D5A27]" />
                </div>
                <h3 className="font-semibold text-[#1A1A1A] text-sm mb-0.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-[#6B7280]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section - Horizontal Scroll */}
      {categories.length > 0 && (
        <section className="py-6">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-[#2D5A27] to-[#4CAF50] rounded-full" />
                Categories
              </h2>
              <Link href="/categories">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#2D5A27] hover:text-[#3B7D34] hover:bg-[#2D5A27]/10 h-8 text-xs"
                >
                  See All
                  <ChevronRight className="ml-0.5 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {/* Horizontal Scroll */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="flex-shrink-0"
                >
                  <div className="w-24 bg-white rounded-2xl p-3 text-center border border-[#E2E0DA] hover:border-[#2D5A27]/30 hover:shadow-soft transition-all tap-scale">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-xl bg-[#F0EFE8] border border-[#E2E0DA] flex items-center justify-center overflow-hidden">
                      {category.image_url ? (
                        <Image
                          src={category.image_url}
                          alt={category.name}
                          width={40}
                          height={40}
                          className="object-cover w-10 h-10 rounded-lg"
                        />
                      ) : (
                        <span className="text-xl font-bold text-[#2D5A27]">
                          {category.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-[#1A1A1A] text-xs truncate">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="py-6 bg-[#FAFAF5]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#2D5A27]" />
              <h2 className="text-lg font-bold text-[#1A1A1A]">
                Featured Products
              </h2>
            </div>
            <Link href="/products?featured=true">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#2D5A27] hover:text-[#3B7D34] h-8 text-xs hidden sm:flex"
              >
                View All
                <ChevronRight className="ml-0.5 h-3 w-3" />
              </Button>
            </Link>
          </div>

          <ProductGrid products={featuredProducts} isLoading={isLoading} />

          <div className="mt-4 text-center sm:hidden">
            <Link href="/products?featured=true">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-10 border-[#E2E0DA] text-[#6B7280] hover:text-[#1A1A1A] hover:border-[#2D5A27]/30 tap-scale"
              >
                View All Products
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-8 bg-gradient-to-b from-[#FAFAF5] to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[#1A1A1A]">
              Why Choose{" "}
              <span className="text-gradient-green">Royal Trading</span>?
            </h2>
            <p className="text-[#6B7280] text-sm mt-1">
              Excellence in every product we deliver
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "Premium Quality",
                description:
                  "Strict quality checks ensure you receive only the best products.",
                icon: Award,
              },
              {
                title: "Best Prices",
                description:
                  "Direct sourcing from manufacturers for competitive pricing.",
                icon: Star,
              },
              {
                title: "Fast Delivery",
                description: "Quick and safe delivery right to your doorstep.",
                icon: Truck,
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 border border-[#E2E0DA] flex items-start gap-4 hover:shadow-soft transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-6 w-6 text-[#2D5A27]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A1A1A] text-sm mb-0.5">
                    {item.title}
                  </h3>
                  <p className="text-[#6B7280] text-xs leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Premium CTA Section */}
      <section className="py-6 px-4">
        <div className="bg-gradient-to-br from-[#2D5A27] to-[#3B7D34] rounded-3xl p-6 text-center relative overflow-hidden shadow-green-lg">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-[60px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#4CAF50]/20 rounded-full blur-[80px] translate-x-1/4 translate-y-1/4" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-4">
              <Leaf className="h-4 w-4 text-white" />
              <span className="text-white text-xs font-medium">Premium Collection</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Experience Royal Quality
            </h2>
            <p className="text-white/80 mb-5 text-sm">
              Join thousands of satisfied customers
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-white text-[#2D5A27] font-bold rounded-full hover:bg-[#F0EFE8] tap-scale"
                >
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/products" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10 rounded-full tap-scale"
                >
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
