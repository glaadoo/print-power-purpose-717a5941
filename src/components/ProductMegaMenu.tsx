import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon_emoji: string | null;
  display_order: number;
};

type ProductMegaMenuProps = {
  categories: Category[];
  onCategorySelect: (category: string) => void;
  selectedCategory: string | null;
};

export default function ProductMegaMenu({
  categories,
  onCategorySelect,
  selectedCategory,
}: ProductMegaMenuProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);

  // Organize categories by parent
  const parentCategories = categories.filter((cat) => !cat.parent_id);
  const subcategoriesByParent = categories.reduce((acc, cat) => {
    if (cat.parent_id) {
      if (!acc[cat.parent_id]) acc[cat.parent_id] = [];
      acc[cat.parent_id].push(cat);
    }
    return acc;
  }, {} as Record<string, Category[]>);

  const handleCategoryClick = (slug: string) => {
    onCategorySelect(slug);
  };

  const handleSubcategoryClick = (parentSlug: string, subSlug: string) => {
    navigate(`/products/${parentSlug}/${subSlug}`);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Toggle Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between py-4 text-gray-700 hover:text-blue-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            <span className="font-semibold">Browse Categories</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {/* Category Grid */}
        {isExpanded && (
          <div className="pb-6">
            {/* All Products Button */}
            <div className="mb-4">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => handleCategoryClick("all")}
                className="w-full sm:w-auto"
              >
                View All Products
              </Button>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {parentCategories.map((parent) => {
                const subcategories = subcategoriesByParent[parent.id] || [];
                const isSelected = selectedCategory === parent.slug;

                return (
                  <div
                    key={parent.id}
                    className={cn(
                      "bg-gray-50 rounded-xl p-4 border-2 transition-all hover:shadow-md",
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-transparent hover:border-gray-200"
                    )}
                  >
                    {/* Parent Category Header */}
                    <button
                      onClick={() => handleCategoryClick(parent.slug)}
                      className={cn(
                        "w-full text-left flex items-center gap-2 font-semibold mb-3 transition-colors",
                        isSelected ? "text-blue-600" : "text-gray-800 hover:text-blue-600"
                      )}
                    >
                      {parent.icon_emoji && (
                        <span className="text-xl">{parent.icon_emoji}</span>
                      )}
                      <span>{parent.name}</span>
                    </button>

                    {/* Subcategories List */}
                    {subcategories.length > 0 && (
                      <ul className="space-y-1.5">
                        {subcategories.slice(0, 5).map((sub) => (
                          <li key={sub.id}>
                            <button
                              onClick={() => handleSubcategoryClick(parent.slug, sub.slug)}
                              className="w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-white px-2 py-1 rounded transition-colors truncate"
                            >
                              {sub.name}
                            </button>
                          </li>
                        ))}
                        {subcategories.length > 5 && (
                          <li>
                            <button
                              onClick={() => handleCategoryClick(parent.slug)}
                              className="text-sm text-blue-600 hover:text-blue-700 px-2 py-1 font-medium"
                            >
                              +{subcategories.length - 5} more
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
