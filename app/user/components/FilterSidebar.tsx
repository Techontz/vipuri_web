"use client";

import { useEffect, useState } from "react";
import axios from "axios";

/* -------------------------------- Types -------------------------------- */
interface Category {
  id: number;
  name: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: number;
  name: string;
}

interface Attribute {
  id: number;
  name: string;
  options: AttributeOption[];
}

interface AttributeOption {
  id: number;
  value: string;
}

/* -------------------------------- Component -------------------------------- */
export default function FilterSidebar({
  onSelectCategory,
  onSelectSubcategory,
  onApplyFilters,
}: {
  onSelectCategory?: (id: number | null) => void;
  onSelectSubcategory?: (id: number | null) => void;
  onApplyFilters?: (filters: Record<string, string>) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [selectedSub, setSelectedSub] = useState<number | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});

  /* ---------------------- LOAD CATEGORIES ---------------------- */
  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/categories-with-subcategories`)
      .then((res) => {
        const cats = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      
        setCategories(cats);
      })      
      .catch(() => console.log("Failed to load categories"));
  }, []);

  /* ---------------------- LOAD ATTRIBUTES ---------------------- */
  useEffect(() => {
    if (!selectedSub) {
      setAttributes([]);
      return;
    }

    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_URL}/subcategories/${selectedSub}/attributes-with-options`
      )
      .then((res) => setAttributes(res.data || []))
      .catch(() => console.log("Failed to load attributes"));
  }, [selectedSub]);

  const currentCategory = Array.isArray(categories)
  ? categories.find((c) => c.id === selectedCat)
  : null;

  /* -------------------------------- UI -------------------------------- */
  return (
    <div
      className="
        w-full md:w-[280px]
        mt-1 sm:mt-1
        bg-white
        rounded-tr-xl rounded-br-xl rounded-tl-none rounded-bl-none
        p-6 sticky top-28 h-fit
      "
      style={{ maxHeight: "80vh", overflowY: "auto" }}
    >
      {/* Title */}
      <h2 className="text-lg font-bold mb-4 text-[#008080]">🔍 Filters</h2>

      {/* CATEGORY */}
      <div className="flex flex-col mb-4">
        <label className="text-sm font-semibold text-gray-700 mb-1">
          Category
        </label>

        <select
          className="p-3 rounded-[6px] border border-gray-300 focus:ring-2 focus:ring-[#008080] text-gray-900 bg-gray-50"
          value={selectedCat || ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            setSelectedCat(id);
            setSelectedSub(null);
            setAttributes([]);
            setFilters({});
            onSelectCategory?.(id);
          }}
        >
          <option value="">Select Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* SUBCATEGORY */}
      {currentCategory && (
        <div className="flex flex-col mb-4">
          <label className="text-sm font-semibold text-gray-700 mb-1">
            Subcategory
          </label>

          <select
            className="p-3 rounded-[6px] border border-gray-300 focus:ring-2 focus:ring-[#008080] text-gray-900 bg-gray-50"
            value={selectedSub || ""}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedSub(id);
              setFilters({});
              onSelectSubcategory?.(id);
            }}
          >
            <option value="">Select Subcategory</option>
            {currentCategory.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ATTRIBUTES */}
      {attributes.length > 0 && (
        <>
          <h3 className="text-md font-bold text-[#008080] mt-3 mb-3">
            More Filters
          </h3>

          <div className="space-y-4">
            {attributes.map((attr) => (
              <div key={attr.id} className="flex flex-col">
                <label className="font-semibold text-sm text-gray-700 mb-1">
                  {attr.name}
                </label>

                <select
                  className="p-2 rounded-[6px] border border-gray-300 bg-gray-50 
                             text-gray-900 focus:ring-2 focus:ring-[#008080]"
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      [attr.name]: e.target.value,
                    }))
                  }
                >
                  <option value="">All</option>
                  {attr.options.map((opt) => (
                    <option key={opt.id} value={opt.value}>
                      {opt.value}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {/* BUTTONS */}
      <div className="mt-6 space-y-3">
        <button
          onClick={() => onApplyFilters?.(filters)}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 
           font-semibold py-2.5 rounded-[6px] transition"
        >
          Apply Filters
        </button>

        <button
          onClick={() => {
            setSelectedCat(null);
            setSelectedSub(null);
            setAttributes([]);
            setFilters({});
            onSelectCategory?.(null);
            onSelectSubcategory?.(null);
          }}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 
                     font-semibold py-2.5 rounded-[6px] transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
