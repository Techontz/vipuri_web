"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ================= TYPES ================= */
interface Category {
  id: number;
  name: string;
}

interface Props {
  categories: Category[];
  activeCategory: Category | null; // comes from parent
  onSelect: (cat: Category) => void; // 🔥 single source of truth
}

/* ================= COMPONENT ================= */
export default function CategoryNav({
  categories,
  activeCategory,
  onSelect,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /* ================= DEFAULT SELECT ================= */
  useEffect(() => {
    if (categories.length && !activeCategory) {
      onSelect(categories[0]); // ✅ default category
    }
  }, [categories, activeCategory, onSelect]);

  /* ================= KEEP ACTIVE VISIBLE ================= */
  useEffect(() => {
    if (activeCategory) {
      document
        .getElementById(`cat-${activeCategory.id}`)
        ?.scrollIntoView({ behavior: "smooth", inline: "center" });
    }
  }, [activeCategory]);

  /* ================= SCROLL CHECK ================= */
  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -260 : 260,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  /* ================= UI ================= */
  return (
    <div className="relative bg-white border-t border-gray-200 h-[48px] flex items-center select-none max-w-full overflow-x-hidden">
     {/* LEFT ARROW */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 h-full w-10 flex items-center justify-center bg-gradient-to-r from-white to-transparent z-10"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* CATEGORIES */}
      <div
          ref={scrollRef}
          className="
            flex items-center gap-2
            overflow-x-auto scrollbar-hide
            px-10 md:px-12
            flex-1
            max-w-full
          "
        >
        {categories.map((cat) => {
          const isActive = activeCategory?.id === cat.id;

          return (
            <button
              key={cat.id}
              id={`cat-${cat.id}`}
              onClick={() => onSelect(cat)} // ✅ ONLY CLICK CONTROLS DATA
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-semibold transition
                ${
                  isActive
                    ? "bg-gray-100 text-black"
                    : "text-black hover:bg-gray-100"
                }
              `}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* BRAND BADGE */}
      <div className="hidden md:flex items-center gap-2 pr-4">
        <span className="px-2 py-0.5 text-xs font-bold rounded border border-green-600 text-black">
          vip<span className="text-yellow-500">uri</span>
        </span>
        <span className="text-xs font-bold text-green-600">TRY FREE</span>
      </div>

      {/* RIGHT ARROW */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 h-full w-10 flex items-center justify-center bg-gradient-to-l from-white to-transparent z-10"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </div>
  );
}
