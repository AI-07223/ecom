"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, Clock, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { collection, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Product } from "@/types/database.types";


const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT_SEARCHES = 5;
const TRENDING_SEARCHES = ["crockery", "cutlery", "cleaning", "homecare", "kitchen"];

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Focus input when overlay opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            // Load recent searches
            try {
                const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
                if (saved) setRecentSearches(JSON.parse(saved));
            } catch {
                // Ignore
            }
        } else {
            setSearchQuery("");
            setResults([]);
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Fetch products and filter client-side for partial matching
                const productsQuery = query(
                    collection(db, "products"),
                    where("is_active", "==", true),
                    orderBy("name"),
                    limit(50)
                );
                const snap = await getDocs(productsQuery);
                const allProducts = snap.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Product[];

                const searchLower = searchQuery.toLowerCase();
                const filtered = allProducts
                    .filter(
                        (p) =>
                            p.name.toLowerCase().includes(searchLower) ||
                            p.description?.toLowerCase().includes(searchLower) ||
                            p.tags?.some((t) => t.toLowerCase().includes(searchLower))
                    )
                    .slice(0, 6);

                setResults(filtered);
            } catch (error) {
                console.error("Search error:", error);
                // Fallback without orderBy
                try {
                    const fallbackQuery = query(
                        collection(db, "products"),
                        where("is_active", "==", true),
                        limit(50)
                    );
                    const snap = await getDocs(fallbackQuery);
                    const allProducts = snap.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Product[];

                    const searchLower = searchQuery.toLowerCase();
                    const filtered = allProducts
                        .filter(
                            (p) =>
                                p.name.toLowerCase().includes(searchLower) ||
                                p.description?.toLowerCase().includes(searchLower)
                        )
                        .slice(0, 6);

                    setResults(filtered);
                } catch {
                    setResults([]);
                }
            }
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const saveRecentSearch = useCallback((term: string) => {
        if (!term.trim()) return;
        try {
            const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
            const searches: string[] = saved ? JSON.parse(saved) : [];
            const updated = [term, ...searches.filter((s) => s !== term)].slice(0, MAX_RECENT_SEARCHES);
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
            setRecentSearches(updated);
        } catch {
            // Ignore
        }
    }, []);

    const handleNavigate = useCallback(
        (path: string, term?: string) => {
            if (term) saveRecentSearch(term);
            onClose();
            router.push(path);
        },
        [router, onClose, saveRecentSearch]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            handleNavigate(`/products?search=${encodeURIComponent(searchQuery)}`, searchQuery);
        }
    };

    const clearRecentSearches = () => {
        try {
            localStorage.removeItem(RECENT_SEARCHES_KEY);
            setRecentSearches([]);
        } catch {
            // Ignore
        }
    };

    const formatPrice = (price: number) => `₹${price.toLocaleString("en-IN")}`;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-white animate-fade-in">
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 border-b border-[#E2E0DA]/50"
                style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)", paddingBottom: "8px" }}
            >
                <form onSubmit={handleSubmit} className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                    <Input
                        ref={inputRef}
                        type="search"
                        placeholder="Search products..."
                        className="w-full pl-9 pr-3 h-11 bg-[#F0EFE8] border-0 rounded-xl text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:ring-2 focus:ring-[#2D5A27]/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
                <button
                    onClick={onClose}
                    className="flex items-center justify-center w-10 h-10 rounded-full tap-active shrink-0"
                >
                    <X className="h-5 w-5 text-[#6B7280]" />
                </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ height: "calc(100vh - 70px - env(safe-area-inset-top, 0px))" }}>
                {/* Loading state */}
                {isSearching && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-[#2D5A27]" />
                    </div>
                )}

                {/* Search Results */}
                {!isSearching && searchQuery && results.length > 0 && (
                    <div className="py-2">
                        <div className="px-4 py-2">
                            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                Results
                            </p>
                        </div>
                        {results.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => handleNavigate(`/products/${product.slug}`, searchQuery)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0EFE8] tap-active transition-colors"
                            >
                                <div className="w-12 h-12 rounded-xl bg-[#F0EFE8] overflow-hidden shrink-0 relative">
                                    {product.thumbnail || product.images?.[0] ? (
                                        <Image
                                            src={product.thumbnail || product.images[0]}
                                            alt={product.name}
                                            fill
                                            className="object-cover"
                                            sizes="48px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#9CA3AF]">
                                            <Search className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{product.name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-[#2D5A27]">
                                            {formatPrice(product.price)}
                                        </span>
                                        {product.compare_at_price && (
                                            <span className="text-xs text-[#9CA3AF] line-through">
                                                {formatPrice(product.compare_at_price)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[#9CA3AF] shrink-0" />
                            </button>
                        ))}

                        {/* View all results link */}
                        <button
                            onClick={() =>
                                handleNavigate(`/products?search=${encodeURIComponent(searchQuery)}`, searchQuery)
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-[#2D5A27] hover:bg-[#2D5A27]/5 tap-active"
                        >
                            View all results
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* No results */}
                {!isSearching && searchQuery && results.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <Search className="h-10 w-10 text-[#E2E0DA] mb-3" />
                        <p className="text-sm font-medium text-[#1A1A1A]">No products found</p>
                        <p className="text-xs text-[#6B7280] mt-1">Try a different search term</p>
                    </div>
                )}

                {/* Default state: Recent + Trending */}
                {!searchQuery && (
                    <div className="py-2">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between px-4 py-2">
                                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                        Recent
                                    </p>
                                    <button
                                        onClick={clearRecentSearches}
                                        className="text-xs font-medium text-[#2D5A27] tap-active"
                                    >
                                        Clear
                                    </button>
                                </div>
                                {recentSearches.map((term) => (
                                    <button
                                        key={term}
                                        onClick={() => {
                                            setSearchQuery(term);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0EFE8] tap-active transition-colors"
                                    >
                                        <Clock className="h-4 w-4 text-[#9CA3AF] shrink-0" />
                                        <span className="text-sm text-[#1A1A1A] flex-1 text-left">{term}</span>
                                        <ArrowRight className="h-3 w-3 text-[#9CA3AF] shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Trending */}
                        <div>
                            <div className="px-4 py-2">
                                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                                    Trending
                                </p>
                            </div>
                            {TRENDING_SEARCHES.map((term) => (
                                <button
                                    key={term}
                                    onClick={() => setSearchQuery(term)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0EFE8] tap-active transition-colors"
                                >
                                    <TrendingUp className="h-4 w-4 text-[#2D5A27] shrink-0" />
                                    <span className="text-sm text-[#1A1A1A] flex-1 text-left capitalize">{term}</span>
                                    <ArrowRight className="h-3 w-3 text-[#9CA3AF] shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
