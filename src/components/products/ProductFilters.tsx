"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/types/database.types";

interface ProductFiltersProps {
  search: string;
  selectedCategory: string;
  minPrice: string;
  maxPrice: string;
  showFeatured: boolean;
  showOnSale: boolean;
  categories: Category[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onFeaturedChange: (value: boolean) => void;
  onSaleChange: (value: boolean) => void;
  onClearFilters: () => void;
}

export function ProductFilters({
  search,
  selectedCategory,
  minPrice,
  maxPrice,
  showFeatured,
  showOnSale,
  categories,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onMinPriceChange,
  onMaxPriceChange,
  onFeaturedChange,
  onSaleChange,
  onClearFilters,
}: ProductFiltersProps) {
  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <Label htmlFor="filter-search" className="text-[#1A1A1A]">Search</Label>
        <Input
          id="filter-search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="mt-1 bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
        />
      </div>

      {/* Categories */}
      <div>
        <Label className="text-[#1A1A1A]">Category</Label>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="mt-1 bg-[#F0EFE8] border-[#E2E0DA] focus:ring-[#2D5A27]/20">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories
              .filter((c) => c.id && c.name)
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <Label className="text-[#1A1A1A]">Price Range</Label>
        <div className="flex gap-2 mt-1">
          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
          />
          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="bg-[#F0EFE8] border-[#E2E0DA] focus:border-[#2D5A27] focus:ring-[#2D5A27]/20"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="featured"
            checked={showFeatured}
            onCheckedChange={(checked) => onFeaturedChange(checked === true)}
            className="border-[#2D5A27] data-[state=checked]:bg-[#2D5A27] data-[state=checked]:text-white"
          />
          <Label htmlFor="featured" className="cursor-pointer text-[#1A1A1A]">
            Featured Only
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sale"
            checked={showOnSale}
            onCheckedChange={(checked) => onSaleChange(checked === true)}
            className="border-[#2D5A27] data-[state=checked]:bg-[#2D5A27] data-[state=checked]:text-white"
          />
          <Label htmlFor="sale" className="cursor-pointer text-[#1A1A1A]">
            On Sale
          </Label>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="w-full border-[#E2E0DA] text-[#6B7280] hover:bg-[#F0EFE8] hover:text-[#2D5A27]"
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );
}
