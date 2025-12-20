"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import BannerCarousel from "@/app/user/components/BannerCarousel";
import ProductCard from "@/app/user/components/ProductCard";
import SubcategorySection from "@/app/user/components/SubcategorySection";
import FilterSidebar from "@/app/user/components/FilterSidebar";

/* ------------------------------- Types ------------------------------- */
interface Product {
  id: number;
  name: string;
  description?: string; // ✅ ADD
  new_price: number;
  old_price?: number;
  average_rating?: number;
  review_count?: number;
  images: string[];
  attribute_values?: { value: string }[];

  vendor?: {            // ✅ ADD
    id: number;
    business_name: string;
  };
}

interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  name: string;
}

/* ------------------------------- Cache ------------------------------- */
const CAT_CACHE_KEY = "vipuri_home_categories";
const CAT_CACHE_TIME = "vipuri_home_cache_time";
const CACHE_TTL = 1000 * 60 * 60 * 12;

/* -------------------------------------------------------------------------- */
/* HOME PAGE                                                                   */
/* -------------------------------------------------------------------------- */
export default function HomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<number | null>(null);

  /* ---------------- Load Categories (Cache First) ---------------- */
  useEffect(() => {
    const cached = localStorage.getItem(CAT_CACHE_KEY);
    const cachedTime = localStorage.getItem(CAT_CACHE_TIME);
    const now = Date.now();

    if (cached && cachedTime && now - Number(cachedTime) < CACHE_TTL) {
      const parsed: Category[] = JSON.parse(cached);
      setCategories(parsed);
      setSelectedCategory(parsed[0]);
      return;
    }

    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/categories`)
      .then((res) => {
        const list: Category[] = Array.isArray(res.data) ? res.data : [];
        setCategories(list);
        setSelectedCategory(list[0]);

        localStorage.setItem(CAT_CACHE_KEY, JSON.stringify(list));
        localStorage.setItem(CAT_CACHE_TIME, now.toString());
      })
      .catch(console.error);
  }, []);

  return (
    <main className="bg-gray-50 min-h-screen pb-20">

      {/* HEADER */}
      <Header
        onCategorySelect={(cat) => setSelectedCategory(cat)}
        onSubcategorySelect={(id) => setSelectedSubcategory(id)}
      />

      {/* BANNER */}
      <div className="mt-0">
        <BannerCarousel />
      </div>

      {/* -------------------------------------- LAYOUT -------------------------------------- */}
      <div className="flex w-full mt-1 sm:mt-2">

        {/* LEFT SIDEBAR — FIXED WIDTH — TOUCHES LEFT WALL */}
        <aside className="hidden md:block w-[250px] flex-shrink-0 ml-0 pl-0">
          <FilterSidebar
            onSelectCategory={(catId) => {
              const found = categories.find((c) => c.id === catId);
              setSelectedCategory(found || null);
            }}
            onSelectSubcategory={(id) => setSelectedSubcategory(id)}
            onApplyFilters={(f) => console.log("Filters:", f)}
          />
        </aside>

        {/* RIGHT CONTENT — NO OVERLAP — FULL WIDTH */}
        <section className="flex-1 pl-3 pr-3 sm:pl-6 sm:pr-6 md:pl-12">

          {selectedCategory && (
            <SubcategorySection
              key={selectedCategory.id}
              categoryId={selectedCategory.id}
              onSelectSubcategory={(id) => setSelectedSubcategory(id)}
            />
          )}

          {selectedCategory && (
            <ProductsBySubcategoryRows
              categoryId={selectedCategory.id}
              selectedSubcategory={selectedSubcategory}
            />
          )}

        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* PRODUCTS BY SUBCATEGORY (CLEAN + TYPED + SPACING PERFECT)                  */
/* -------------------------------------------------------------------------- */
function ProductsBySubcategoryRows({
  categoryId,
  selectedSubcategory,
}: {
  categoryId: number;
  selectedSubcategory: number | null;
}) {
  const router = useRouter();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [productsBySub, setProductsBySub] =
    useState<Record<number, Product[]>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/categories/${categoryId}/subcategories`
        );

        const subs: Subcategory[] = res.data || [];
        setSubcategories(subs);

        const map: Record<number, Product[]> = {};

        await Promise.all(
          subs.map(async (sub: Subcategory) => {
            try {
              const r = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/subcategories/${sub.id}/products`
              );
              map[sub.id] = Array.isArray(r.data.products)
                ? r.data.products
                : [];
            } catch {
              map[sub.id] = [];
            }
          })
        );

        setProductsBySub(map);
      } catch (err) {
        console.error("Error loading products", err);
      }
    };

    load();
  }, [categoryId]);

  const orderedSubs: Subcategory[] = [
    ...subcategories.filter((s) => s.id === selectedSubcategory),
    ...subcategories.filter((s) => s.id !== selectedSubcategory),
  ];

  return (
    <section className="mt-3 space-y-6">

      {orderedSubs.map((sub: Subcategory) => (
        <div key={sub.id} className="space-y-3">

          {/* SUB TITLE */}
          <div className="flex items-center justify-between">
          {/* LEFT TITLE */}
          <h2 className="text-[22px] font-bold text-gray-800">
            {sub.name}
          </h2>

          {/* RIGHT VIEW ALL BUTTON */}
          <button
            onClick={() => router.push(`/user/subcategories?id=${sub.id}`)}
            className="
              px-4 py-1.5
              border border-gray-400
              text-gray-700
              text-sm
              font-semibold
              uppercase
              rounded
              hover:bg-gray-100
              transition
            "
          >
            View all
          </button>
        </div>

          {/* PRODUCT ROW */}
          <div className="flex gap-3 overflow-x-auto pb-2 ml-0">
          {(productsBySub[sub.id] || []).length === 0 ? (
              <p className="text-gray-400 text-sm px-4 py-6">
                No products found
              </p>
            ) : (
              (productsBySub[sub.id] || []).map((p: Product) => (
                <div
                  key={p.id}
                  className="flex-shrink-0 w-[210px] md:w-[230px]"
                >
                  <ProductCard
                    product={{
                      id: p.id,
                      name: p.name,
                      image: p.images?.[0] || "/placeholder.png",
                      price: p.new_price,
                      oldPrice: p.old_price,
                      rating: p.average_rating,
                      reviews: p.review_count,
                      description: p.description, // ✅
                      attributes: p.attribute_values?.map((a) => a.value), // ✅
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
