"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

import BannerCarousel from "@/app/user/components/BannerCarousel";
import ProductCard from "@/app/user/components/ProductCard";
import SubcategorySection from "@/app/user/components/SubcategorySection";
import FilterSidebar from "@/app/user/components/FilterSidebar";
import SpotlightDeals from "@/app/user/components/SpotlightDeals";

/* ------------------------------- Types ------------------------------- */
interface Product {
  id: number;
  name: string;
  description?: string;
  new_price: number;
  old_price?: number;
  average_rating?: number;
  review_count?: number;
  images: string[];
  attribute_values?: { value: string }[];
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

  /* ---------------- Load Categories ---------------- */
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

  /* ---------------- SPOTLIGHT DEALS ---------------- */
  const spotlightDeals = [
    {
      id: 1,
      title: "Toyota Brake Pads – Front Set (Genuine)",
      image: "/spareparts/brake-pads.png",
      category: "Brake System",
      oldPrice: 85000,
      newPrice: 65000,
    },
    {
      id: 2,
      title: "Engine Oil Filter – Toyota / Nissan",
      image: "/spareparts/oil-filter.png",
      category: "Engine Parts",
      oldPrice: 25000,
      newPrice: 18000,
    },
    {
      id: 3,
      title: "Shock Absorber – Rear (SUV / Pickup)",
      image: "/spareparts/shock-absorber.png",
      category: "Suspension",
      oldPrice: 220000,
      newPrice: 185000,
    },
    {
      id: 4,
      title: "NGK Spark Plugs – Set of 4",
      image: "/spareparts/spark-plugs.png",
      category: "Ignition",
      oldPrice: 60000,
      newPrice: 45000,
    },
  ];

  return (
    <>
      {/* ================= MAIN CONTENT ================= */}
      <main className="bg-gray-50 pb-[90px]">
        
        {/* BANNER */}
        <BannerCarousel />

        <div className="flex w-full mt-2 gap-4 md:gap-12">
          {/* LEFT SIDEBAR */}
          <aside className="hidden md:block w-[250px]">
            <FilterSidebar
              onSelectCategory={(catId) => {
                const found = categories.find((c) => c.id === catId);
                setSelectedCategory(found || null);
              }}
              onSelectSubcategory={(id) => setSelectedSubcategory(id)}
              onApplyFilters={(f) => console.log(f)}
            />
          </aside>

          {/* RIGHT CONTENT */}
          <section className="flex-1 overflow-x-hidden px-4 sm:px-0 md:pr-8 lg:pr-8">
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

            <SpotlightDeals deals={spotlightDeals} />
          </section>
        </div>
      </main>

  
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* PRODUCTS BY SUBCATEGORY                                                     */
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
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/categories/${categoryId}/subcategories`
      );

      const subs: Subcategory[] = res.data || [];
      setSubcategories(subs);

      const map: Record<number, Product[]> = {};

      await Promise.all(
        subs.map(async (sub) => {
          try {
            const r = await axios.get(
              `${process.env.NEXT_PUBLIC_API_URL}/subcategories/${sub.id}/products`
            );
            map[sub.id] = r.data.products || [];
          } catch {
            map[sub.id] = [];
          }
        })
      );

      setProductsBySub(map);
    };

    load();
  }, [categoryId]);

  const orderedSubs = [
    ...subcategories.filter((s) => s.id === selectedSubcategory),
    ...subcategories.filter((s) => s.id !== selectedSubcategory),
  ];

  return (
    <section className="mt-4 space-y-8">
      {orderedSubs.map((sub) => {
        const products = productsBySub[sub.id] || [];

        return (
          <div key={sub.id}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[22px] font-bold text-gray-800">
                {sub.name}
              </h2>

              <button
                onClick={() =>
                  router.push(`/user/subcategories?id=${sub.id}`)
                }
                className="border border-gray-300 px-4 py-1.5 text-sm font-semibold rounded-md hover:bg-gray-100"
              >
                View all
              </button>
            </div>

            {products.length === 0 ? (
              <div className="w-full flex flex-col items-center justify-center gap-3 py-14 rounded-xl bg-gray-100">
                <div className="w-16 h-16 rounded-full bg-white shadow flex items-center justify-center text-3xl">
                  🚗
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  No spare parts available
                </p>
                <p className="text-xs text-gray-500 text-center max-w-[260px]">
                  We’re sourcing quality car parts for this category.
                  Please check back soon.
                </p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 px-4 sm:px-0 md:pr-8 lg:pr-12">
                {products.map((p) => (
                  <div key={p.id} className="w-[220px] flex-shrink-0">
                    <ProductCard
                      product={{
                        id: p.id,
                        name: p.name,
                        image: p.images?.[0] || "/placeholder.png",
                        price: p.new_price,
                        oldPrice: p.old_price,
                        rating: p.average_rating,
                        reviews: p.review_count,
                        description: p.description,
                        attributes: p.attribute_values?.map(
                          (a) => a.value
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
