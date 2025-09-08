"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Ban, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FilterValues } from "@/types/filters";
import { FILTER_COLLECTIONS } from "@/constants/filters";
import Image from "next/image";

// Generate filter style string from filter values
export const generateFilterStyle = (filter: FilterValues) => {
  return `brightness(${filter.brightness}%) contrast(${filter.contrast}%) grayscale(${filter.grayscale}%) sepia(${filter.sepia}%) saturate(${filter.saturate}%) hue-rotate(${filter.hueRotate}deg)`;
};

interface FilterGalleryProps {
  onFilterChange: (filter: FilterValues) => void;
  currentFilter: FilterValues;
  sampleImageUrl?: string;
  className?: string;
}

export function FilterGallery({
  onFilterChange,
  currentFilter,
  sampleImageUrl = "/placeholder.svg?height=150&width=150",
  className,
}: FilterGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>("normal");
  const categoriesContainerRef = useRef<HTMLDivElement>(null);
  const filtersContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Find the current filter in collections
  const getCurrentFilterId = useCallback(() => {
    for (const category in FILTER_COLLECTIONS) {
      const filters =
        FILTER_COLLECTIONS[category as keyof typeof FILTER_COLLECTIONS];
      for (const filter of filters) {
        if (JSON.stringify(filter.filter) === JSON.stringify(currentFilter)) {
          return filter.id;
        }
      }
    }
    return "normal";
  }, [currentFilter]);

  const currentFilterId = getCurrentFilterId();

  // Get all categories
  const categories = Object.keys(FILTER_COLLECTIONS);

  // Add a function to find the category of a filter
  const findFilterCategory = (filterId: string): string => {
    for (const category in FILTER_COLLECTIONS) {
      const filters =
        FILTER_COLLECTIONS[category as keyof typeof FILTER_COLLECTIONS];
      if (filters.some((filter) => filter.id === filterId)) {
        return category;
      }
    }
    return "normal";
  };

  // Handle category change - scroll to the category section
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);

    // Scroll to the category section
    if (categoryRefs.current[category]) {
      categoryRefs.current[category]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }

    // Highlight the first filter in the category if not already selected
    const firstFilter =
      FILTER_COLLECTIONS[category as keyof typeof FILTER_COLLECTIONS]?.[0];
    if (firstFilter && firstFilter.id !== currentFilterId) {
      onFilterChange(firstFilter.filter);
    }
  };

  // Handle normal filter selection
  const handleNormalClick = () => {
    handleCategoryChange("normal");
  };

  // Scroll to center the active category button
  useEffect(() => {
    if (categoriesContainerRef.current) {
      const container = categoriesContainerRef.current;
      const activeButton = container.querySelector(
        `[data-category="${activeCategory}"]`,
      ) as HTMLElement;

      if (activeButton && activeCategory !== "normal") {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        // Calculate the scroll position to center the button
        const scrollLeft =
          buttonRect.left -
          containerRect.left -
          containerRect.width / 2 +
          buttonRect.width / 2;

        container.scrollTo({
          left: container.scrollLeft + scrollLeft,
          behavior: "smooth",
        });
      } else {
        container.scrollTo({
          left: 0,
          behavior: "smooth",
        });
      }
    }
  }, [activeCategory]);

  // Update the useEffect to track changes to currentFilter and update activeCategory
  useEffect(() => {
    const currentId = getCurrentFilterId();
    const category = findFilterCategory(currentId);

    if (category !== activeCategory) {
      setActiveCategory(category);
    }
  }, [currentFilter, activeCategory, getCurrentFilterId]);

  return (
    <div className={cn("w-full", className)}>
      {/* Category navigation with fixed Normal button */}
      <div className="gap relative mb-3 flex">
        {/* Fixed Normal button */}
        <div>
          <Button
            onClick={handleNormalClick}
            variant={"ghost"}
            size="icon"
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              activeCategory === "normal" ? "font-bold" : "",
            )}
          >
            <Ban className="h-3 w-3" />
            <span className="sr-only">Normal Filter</span>
          </Button>
        </div>

        {/* Scrollable categories */}
        <div
          ref={categoriesContainerRef}
          className="hide-scrollbar flex overflow-x-auto"
        >
          {categories
            .filter((cat) => cat !== "normal")
            .map((category) => (
              <Button
                key={category}
                data-category={category}
                onClick={() => handleCategoryChange(category)}
                variant={"ghost"}
                size="sm"
                className={cn(
                  "mr-2 rounded-full px-3 py-1 text-xs whitespace-nowrap capitalize",
                  activeCategory === category ? "font-bold" : "",
                )}
              >
                {category}
              </Button>
            ))}
        </div>
      </div>

      {/* All filters in a single scrollable container */}
      <div
        ref={filtersContainerRef}
        className="hide-scrollbar overflow-x-auto pb-2"
      >
        <div className="flex w-max">
          {/* Render all categories and their filters */}
          {categories.map((category) => {
            const filters =
              FILTER_COLLECTIONS[category as keyof typeof FILTER_COLLECTIONS];

            return (
              <div
                key={category}
                ref={(el) => {
                  categoryRefs.current[category] = el;
                }}
                className={cn(
                  "flex-shrink-0",
                  category !== "normal" && "ml-2 pl-2",
                )}
              >
                {/* Filters in this category */}
                <div className="flex gap-0.5">
                  {filters.map((filter) => (
                    <div
                      key={filter.id}
                      data-filter-id={filter.id}
                      className={cn(
                        "flex cursor-pointer flex-col items-center",
                        currentFilterId === filter.id
                          ? "opacity-100"
                          : "opacity-80",
                      )}
                      onClick={() => onFilterChange(filter.filter)}
                    >
                      {/* Filter preview */}
                      <div
                        className={cn(
                          "relative mb-1 aspect-[3/4] w-16 overflow-hidden transition-all duration-200 sm:w-20",
                          currentFilterId === filter.id
                            ? "border-primary"
                            : "border-gray-200",
                        )}
                      >
                        <div className="relative h-full w-full">
                          <Image
                            src={sampleImageUrl}
                            alt="Preview"
                            fill
                            className="object-cover"
                            style={{
                              filter: generateFilterStyle(filter.filter),
                            }}
                          />
                        </div>

                        {/* Selection indicator */}
                        {currentFilterId === filter.id && (
                          <div className="bg-primary/10 absolute inset-0 flex items-center justify-center">
                            <div className="bg-primary flex h-5 w-5 items-center justify-center rounded-full">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Filter name */}
                        <div className="absolute inset-0 flex items-end justify-center">
                          <div className="bg-primary/50 flex w-full items-center justify-center">
                            <span
                              className={cn(
                                "text-center text-xs font-medium text-white transition-colors",
                                // currentFilterId === filter.id
                                //   ? "text-white"
                                //   : "text-gray-600",
                              )}
                            >
                              {filter.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
