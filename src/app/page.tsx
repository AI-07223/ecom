"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Truck, Shield, Clock, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/products/ProductGrid";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Product, Category } from "@/types/database.types";

const features = [
  { icon: Truck, title: "Free Delivery", subtitle: "On orders over ₹999" },
  { icon: Shield, title: "Genuine Products", subtitle: "100% authentic" },
  { icon: Clock, title: "Fast Shipping", subtitle: "2-4 days delivery" },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch featured products
        const productsQuery = query(
          collection(db, "products"),
          where("is_active", "==", true),
          where("is_featured", "==", true),
          limit(8)
        );
        const productsSnap = await getDocs(productsQuery);
        const featured = productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setFeaturedProducts(featured);

        // Fetch categories
        const categoriesQuery = query(
          collection(db, "categories"),
          where("is_active", "==", true),
          limit(8)
        );
        const categoriesSnap = await getDocs(categoriesQuery);
        const cats = categoriesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        cats.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setCategories(cats.slice(0, 6));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF5] pb-20 md:pb-0">
      {/* Hero Section */}
      <section className="relative bg-white">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left Content */}
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2D5A27]/10 text-[#2D5A27] text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Premium Quality Since 2020
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold text-[#1A1A1A] leading-tight">
                Premium Crockery,{" "}
                <span className="text-gradient">Cutlery & Homecare</span>
              </h1>
              
              <p className="text-[#6B7280] text-base md:text-lg max-w-md">
                Your trusted destination for premium household essentials. Quality products delivered to your doorstep.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/products">
                  <Button className="h-12 px-6 rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-semibold tap-active">
                    Shop Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/categories">
                  <Button
                    variant="outline"
                    className="h-12 px-6 rounded-xl border-[#E2E0DA] text-[#1A1A1A] hover:bg-[#F0EFE8] font-medium tap-active"
                  >
                    Browse Categories
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Content - Logo/Brand */}
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-3xl overflow-hidden shadow-elevated mx-auto">
                <Image
                  src="/logo.jpeg"
                  alt="Royal Trading Company"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-y border-[#E2E0DA] bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-3 tap-active"
              >
                <div className="w-10 h-10 rounded-xl bg-[#2D5A27]/10 flex items-center justify-center mb-2">
                  <feature.icon className="h-5 w-5 text-[#2D5A27]" />
                </div>
                <span className="text-sm font-semibold text-[#1A1A1A]">{feature.title}</span>
                <span className="text-xs text-[#6B7280] hidden sm:block">{feature.subtitle}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-6 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A1A1A]">Categories</h2>
              <Link href="/categories">
                <Button variant="ghost" size="sm" className="text-[#2D5A27] hover:text-[#3B7D34] hover:bg-[#2D5A27]/10 h-9 text-sm font-medium">
                  See All
                  <ChevronRight className="ml-0.5 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Horizontal Scroll */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className="flex-shrink-0 tap-active"
                >
                  <div className="w-20 sm:w-24 bg-[#F0EFE8] rounded-2xl p-3 text-center hover:bg-[#E8E7E0] transition-colors">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-2 rounded-xl bg-white border border-[#E2E0DA] flex items-center justify-center overflow-hidden">
                      {category.image_url ? (
                        <Image
                          src={category.image_url}
                          alt={category.name}
                          width={40}
                          height={40}
                          className="object-cover w-8 h-8 sm:w-10 sm:h-10 rounded-lg"
                        />
                      ) : (
                        <span className="text-xl font-bold text-[#2D5A27]">
                          {category.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-[#1A1A1A] text-xs sm:text-sm truncate">
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
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#2D5A27]" />
              <h2 className="text-lg font-bold text-[#1A1A1A]">Featured Products</h2>
            </div>
            <Link href="/products?featured=true" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-[#2D5A27] hover:text-[#3B7D34] h-9 text-sm font-medium">
                View All
                <ChevronRight className="ml-0.5 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <ProductGrid products={featuredProducts} isLoading={isLoading} />

          {/* Mobile View All Button */}
          <div className="mt-4 text-center sm:hidden">
            <Link href="/products?featured=true">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-sm h-10 px-6 border-[#E2E0DA] text-[#6B7280] hover:text-[#1A1A1A] hover:border-[#2D5A27]/30 tap-active"
              >
                View All Products
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-[#2D5A27] to-[#3B7D34] rounded-3xl p-6 text-white">
            <h2 className="text-xl font-bold mb-2">Why Choose Royal Trading?</h2>
            <p className="text-white/80 text-sm mb-6">
              Experience the difference with our commitment to quality
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: "Premium Quality", desc: "Curated products from trusted brands" },
                { title: "Best Prices", desc: "Direct sourcing for competitive rates" },
                { title: "Fast Delivery", desc: "Quick shipping to your doorstep" },
              ].map((item, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-white/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter / CTA */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-3xl p-6 shadow-elevated text-center">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">
              Start Shopping Today
            </h2>
            <p className="text-[#6B7280] text-sm mb-4">
              Join thousands of satisfied customers
            </p>
            <Link href="/products">
              <Button className="h-12 px-8 rounded-xl bg-[#2D5A27] hover:bg-[#3B7D34] text-white font-semibold tap-active">
                Explore Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
