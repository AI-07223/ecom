"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, X, Clock, TrendingUp, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const RECENT_SEARCHES_KEY = "recent_searches";
const MAX_RECENT_SEARCHES = 5;
const TRENDING_SEARCHES = ["organic", "spices", "rice", "oil", "dry fruits"];

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onClear: () => void;
  onFeaturedFilter?: () => void;
  onSaleFilter?: () => void;
}

export function ProductSearch({
  value,
  onChange,
  onSubmit,
  onClear,
  onFeaturedFilter,
  onSaleFilter,
}: ProductSearchProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      const searches: string[] = saved ? JSON.parse(saved) : [];
      const next = [term, ...searches.filter((s) => s !== term)].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      setRecentSearches(next);
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = useCallback((term: string) => {
    onSubmit(term);
    setShowSuggestions(false);
    saveRecentSearch(term);
  }, [onSubmit, saveRecentSearch]);

  const clearRecentSearches = useCallback(() => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTrending = TRENDING_SEARCHES.filter(
    (t) => t.toLowerCase().includes(value.toLowerCase()) && t !== value,
  );

  return (
    <div className="mb-6 relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
        <Input
          ref={inputRef}
          type="text"
          inputMode="search"
          placeholder="Search products..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(value); }}
          className="pl-10 bg-white border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
        />
        {value && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A1A1A]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-[#E2E0DA] shadow-elevated">
          <Command className="rounded-lg">
            <CommandList className="max-h-[300px] overflow-auto">
              {recentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((term) => (
                    <CommandItem key={term} onSelect={() => handleSubmit(term)} className="cursor-pointer">
                      <Clock className="mr-2 h-4 w-4 text-[#6B7280]" />
                      <span>{term}</span>
                    </CommandItem>
                  ))}
                  <CommandItem onSelect={clearRecentSearches} className="cursor-pointer text-[#6B7280]">
                    <X className="mr-2 h-4 w-4" />
                    <span>Clear recent searches</span>
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandGroup heading="Trending">
                {filteredTrending.map((term) => (
                  <CommandItem key={term} onSelect={() => handleSubmit(term)} className="cursor-pointer">
                    <TrendingUp className="mr-2 h-4 w-4 text-[#4CAF50]" />
                    <span>{term}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              {value && (
                <CommandGroup heading="Search">
                  <CommandItem onSelect={() => handleSubmit(value)} className="cursor-pointer">
                    <Search className="mr-2 h-4 w-4 text-[#2D5A27]" />
                    <span>Search for &quot;{value}&quot;</span>
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandGroup heading="Quick Filters">
                {onFeaturedFilter && (
                  <CommandItem
                    onSelect={() => { onFeaturedFilter(); setShowSuggestions(false); }}
                    className="cursor-pointer"
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                    <span>Featured Products</span>
                  </CommandItem>
                )}
                {onSaleFilter && (
                  <CommandItem
                    onSelect={() => { onSaleFilter(); setShowSuggestions(false); }}
                    className="cursor-pointer"
                  >
                    <TrendingUp className="mr-2 h-4 w-4 text-red-500" />
                    <span>On Sale</span>
                  </CommandItem>
                )}
              </CommandGroup>

              <CommandEmpty>No suggestions found</CommandEmpty>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
