import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Organize categories by parent
  const parentCategories = categories.filter((cat) => !cat.parent_id);
  const subcategoriesByParent = categories.reduce((acc, cat) => {
    if (cat.parent_id) {
      if (!acc[cat.parent_id]) acc[cat.parent_id] = [];
      acc[cat.parent_id].push(cat);
    }
    return acc;
  }, {} as Record<string, Category[]>);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCategoryClick = (slug: string) => {
    onCategorySelect(slug);
    setOpenMenu(null);
  };

  const handleMouseEnter = (categoryId: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenMenu(categoryId);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setOpenMenu(null);
  };

  return (
    <div ref={menuRef} className="relative bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-3 flex-wrap">
          {/* Parent Categories with Mega Menu */}
          {parentCategories.map((parent) => {
            const subcategories = subcategoriesByParent[parent.id] || [];
            const isOpen = openMenu === parent.id;
            const isSelected = selectedCategory === parent.slug;

            return (
              <div 
                key={parent.id} 
                className="relative"
                onMouseEnter={() => handleMouseEnter(parent.id)}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {parent.icon_emoji && <span>{parent.icon_emoji}</span>}
                  {parent.name}
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Mega Menu Dropdown */}
                {isOpen && subcategories.length > 0 && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <button
                        onClick={() => handleCategoryClick(parent.slug)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        View All {parent.name}
                      </button>
                    </div>
                    <div>
                      {subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => handleCategoryClick(sub.slug)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
