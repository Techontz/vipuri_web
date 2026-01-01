"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getImageUrl } from "@/lib/getImageUrl";

interface Subcategory {
  id: number;
  name: string;
  icon_image_url?: string | null;
}

interface Props {
  categoryId: number;
  onSelectSubcategory: (id: number) => void;
}

const CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000;
const memoryCache = new Map<number, { data: Subcategory[]; time: number }>();

export default function SubcategorySection({
  categoryId,
  onSelectSubcategory,
}: Props) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [progress, setProgress] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ---------------- Load ---------------- */
  useEffect(() => {
    if (!categoryId) return;

    const now = Date.now();
    const cached = memoryCache.get(categoryId);

    if (cached && now - cached.time < CACHE_EXPIRY_MS) {
      setSubcategories(cached.data);
      cached.data[0] && onSelectSubcategory(cached.data[0].id);
      setLoading(false);
      return;
    }

    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_URL}/categories/${categoryId}/subcategories`
      )
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        memoryCache.set(categoryId, { data: list, time: now });
        setSubcategories(list);
        list[0] && onSelectSubcategory(list[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [categoryId]);

  /* ---------------- Scroll ---------------- */
  const updateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;

    setCanLeft(el.scrollLeft > 5);
    setCanRight(el.scrollLeft < maxScroll - 5);

    if (maxScroll <= 0) {
      setProgress(0);
    } else {
      setProgress(el.scrollLeft / maxScroll);
    }
  };

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScroll);
    window.addEventListener("resize", updateScroll);

    return () => {
      el.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  if (loading || !subcategories.length) return null;

  /* ---------------- Indicator math ---------------- */
  const TRACK_WIDTH_MOBILE = 80;
  const TRACK_WIDTH_DESKTOP = 120;
  const THUMB_WIDTH = 24;

  const trackWidth =
    typeof window !== "undefined" && window.innerWidth < 640
      ? TRACK_WIDTH_MOBILE
      : TRACK_WIDTH_DESKTOP;

  const maxThumbMove = trackWidth - THUMB_WIDTH;
  const thumbX = Math.max(0, Math.min(progress * maxThumbMove, maxThumbMove));

  return (
    <div className="relative pt-1 pb-2 overflow-hidden">
      {/* LEFT ARROW */}
      {canLeft && (
        <button
          onClick={() =>
            scrollRef.current?.scrollBy({ left: -180, behavior: "smooth" })
          }
          className="
            absolute left-1 top-1/2 -translate-y-1/2 z-20
            w-8 h-8 sm:w-9 sm:h-9
            rounded-full bg-white shadow
            flex items-center justify-center
          "
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* SCROLL AREA */}
      <div
        ref={scrollRef}
        className="
          flex gap-3 sm:gap-4
          pr-4 sm:pr-6
          overflow-x-auto scrollbar-hide scroll-smooth
        "
      >
        {subcategories.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSelectSubcategory(sub.id)}
            className="flex-shrink-0 text-center"
          >
            <div
              className="
                w-[64px] h-[56px]
                sm:w-[110px] sm:h-[96px]
                rounded-xl sm:rounded-2xl
                flex items-center justify-center
                bg-gradient-to-b
                from-[#ECEDEF] via-[#F6F7F8] to-white
              "
            >
              {sub.icon_image_url ? (
                <img
                  src={getImageUrl(sub.icon_image_url)}
                  alt={sub.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span>🛍️</span>
              )}
            </div>

            <div className="mt-2 text-[11px] sm:text-[14px] font-semibold text-gray-900">
              {sub.name}
            </div>
          </button>
        ))}
      </div>

      {/* RIGHT ARROW */}
      {canRight && (
        <button
          onClick={() =>
            scrollRef.current?.scrollBy({ left: 180, behavior: "smooth" })
          }
          className="
            absolute right-1 top-1/2 -translate-y-1/2 z-20
            w-8 h-8 sm:w-9 sm:h-9
            rounded-full bg-white shadow
            flex items-center justify-center
          "
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
