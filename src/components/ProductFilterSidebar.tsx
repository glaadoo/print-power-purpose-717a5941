import { useState, useEffect } from "react";
import { X, SlidersHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type FilterState = {
  priceRange: [number, number];
  vendors: string[];
  minRating: number;
};

type ProductFilterSidebarProps = {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableVendors: string[];
  maxPrice: number;
};

export default function ProductFilterSidebar({
  filters,
  onFiltersChange,
  availableVendors,
  maxPrice,
}: ProductFilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handlePriceChange = (value: number[]) => {
    setLocalFilters({ ...localFilters, priceRange: [value[0], value[1]] });
  };

  const handleVendorToggle = (vendor: string) => {
    const newVendors = localFilters.vendors.includes(vendor)
      ? localFilters.vendors.filter((v) => v !== vendor)
      : [...localFilters.vendors, vendor];
    setLocalFilters({ ...localFilters, vendors: newVendors });
  };

  const handleRatingChange = (rating: number) => {
    setLocalFilters({ ...localFilters, minRating: rating });
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const resetState = {
      priceRange: [0, maxPrice] as [number, number],
      vendors: [],
      minRating: 0,
    };
    setLocalFilters(resetState);
    onFiltersChange(resetState);
  };

  const activeFilterCount =
    (localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < maxPrice ? 1 : 0) +
    localFilters.vendors.length +
    (localFilters.minRating > 0 ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Products</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Price Range */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Price Range</Label>
              <span className="text-sm text-gray-600">
                ${(localFilters.priceRange[0] / 100).toFixed(0)} - ${(localFilters.priceRange[1] / 100).toFixed(0)}
              </span>
            </div>
            <Slider
              min={0}
              max={maxPrice}
              step={100}
              value={localFilters.priceRange}
              onValueChange={handlePriceChange}
              className="w-full"
            />
          </div>

          {/* Vendor Filter */}
          {availableVendors.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Vendor</Label>
              <div className="space-y-2">
                {availableVendors.map((vendor) => (
                  <div key={vendor} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vendor-${vendor}`}
                      checked={localFilters.vendors.includes(vendor)}
                      onCheckedChange={() => handleVendorToggle(vendor)}
                    />
                    <label
                      htmlFor={`vendor-${vendor}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                    >
                      {vendor}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Minimum Rating</Label>
            <div className="space-y-2">
              {[4, 3, 2, 1, 0].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRatingChange(rating)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg transition-colors",
                    localFilters.minRating === rating
                      ? "bg-blue-50 border-2 border-blue-600"
                      : "border-2 border-transparent hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {rating > 0 ? `${rating}+ stars` : "All ratings"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t space-y-2">
          <Button onClick={applyFilters} className="w-full rounded-full">
            Apply Filters
          </Button>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="w-full rounded-full"
          >
            Reset All
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
