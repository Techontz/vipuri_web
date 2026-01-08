"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Facebook, Instagram, Linkedin, X, Info, Mail } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 🧠 Interfaces                                                              */
/* -------------------------------------------------------------------------- */
interface Category {
  id: number;
  name: string;
}

interface Subcategory {
  id: number;
  name: string;
}

/* -------------------------------------------------------------------------- */
/* 💾 Cache Configuration                                                     */
/* -------------------------------------------------------------------------- */
const memoryCache: {
  categories?: Category[];
  subcategoriesMap?: Record<number, Subcategory[]>;
  timestamp?: number;
} = {};

const CACHE_KEY = "d2k_footer_cache";
const CACHE_TTL = 1000 * 60 * 10;

/* -------------------------------------------------------------------------- */
/* 🌍 Footer                                                                  */
/* -------------------------------------------------------------------------- */
export default function Footer() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoriesMap, setSubcategoriesMap] = useState<
    Record<number, Subcategory[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = Date.now();

    if (
      memoryCache.categories &&
      memoryCache.subcategoriesMap &&
      memoryCache.timestamp &&
      now - memoryCache.timestamp < CACHE_TTL
    ) {
      setCategories(memoryCache.categories);
      setSubcategoriesMap(memoryCache.subcategoriesMap);
      setLoading(false);
      return;
    }

    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (now - parsed.timestamp < CACHE_TTL) {
          setCategories(parsed.categories || []);
          setSubcategoriesMap(parsed.subcategoriesMap || {});
          setLoading(false);
          return;
        }
      } catch {}
    }

    const fetchData = async () => {
      try {
        const catRes = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/categories`
        );
        const cats = Array.isArray(catRes.data) ? catRes.data : [];

        const subResults = await Promise.all(
          cats.map(async (cat) => {
            try {
              const subRes = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL}/categories/${cat.id}/subcategories`
              );
              return [cat.id, Array.isArray(subRes.data) ? subRes.data : []];
            } catch {
              return [cat.id, []];
            }
          })
        );

        const map: Record<number, Subcategory[]> = {};
        subResults.forEach(
          ([id, subs]) => (map[id as number] = subs as Subcategory[])
        );

        memoryCache.categories = cats;
        memoryCache.subcategoriesMap = map;
        memoryCache.timestamp = now;

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            categories: cats,
            subcategoriesMap: map,
            timestamp: now,
          })
        );

        setCategories(cats);
        setSubcategoriesMap(map);
      } catch (e) {
        console.error("Footer error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <footer className="bg-white border-t border-gray-200 text-gray-700">
      {/* ================= HELP BAR ================= */}
      <div className="bg-[#F6F7FB] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 md:px-16 lg:px-24 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold text-gray-800">
                We&apos;re Always Here To Help
              </h3>
              <p className="text-sm text-gray-500">
                Reach out to us through any of these support channels
              </p>
            </div>

            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center">
                  <Info size={16} />
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">
                    Help Center
                  </p>
                  <a
                    href="https://help.vipuri.com"
                    className="text-sm font-medium text-gray-800 hover:underline"
                  >
                    help.vipuri.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">
                    Email Support
                  </p>
                  <a
                    href="mailto:care@vipuri.com"
                    className="text-sm font-medium text-gray-800 hover:underline"
                  >
                    care@vipuri.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= CATEGORY GRID ================= */}
      <div className="px-6 md:px-16 lg:px-24 py-10">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <div className="h-4 w-1/2 bg-gray-200 mb-3 rounded animate-pulse" />
                {[...Array(5)].map((__, j) => (
                  <div
                    key={j}
                    className="h-3 w-3/4 bg-gray-100 mb-2 rounded animate-pulse"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8 text-sm">
            {categories.slice(0, 6).map((cat) => (
              <FooterColumn
                key={cat.id}
                title={cat.name}
                links={subcategoriesMap[cat.id] || []}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================= APP + SOCIAL ================= */}
      <div className="px-6 md:px-16 lg:px-24 py-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
      <div className="flex flex-col items-center md:items-start text-center md:text-left">
        <h4 className="font-semibold uppercase mb-3">Shop On The Go</h4>

        <div className="flex flex-wrap justify-center md:justify-start gap-3">
          <Image src="/badges/appstore.png" alt="" width={110} height={38} />
          <Image src="/badges/playstore.png" alt="" width={110} height={38} />
          <Image src="/badges/appgallery.png" alt="" width={110} height={38} />
        </div>
      </div>

      <div className="flex flex-col items-center md:items-start text-center md:text-left">
        <h4 className="font-semibold uppercase mb-3">Connect With Us</h4>

        <div className="flex justify-center md:justify-start gap-3">
          {[Facebook, X, Instagram, Linkedin].map((Icon, i) => (
            <a
              key={i}
              href="#"
              className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center hover:opacity-80"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>
      </div>
      </div>

      {/* ================= DESKTOP-STYLE BOTTOM BAR ================= */}
      <div
        className="
          bg-gray-100 border-t border-gray-200
          px-6 md:px-16 lg:px-24
          py-4
          text-[13px] text-gray-600
          pb-[calc(6rem+env(safe-area-inset-bottom))]
          md:pb-4
        "
      >
        <div className="flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 text-center md:text-left">
          {/* LEFT */}
          <div className="whitespace-nowrap text-gray-400 text-sm">
            © {new Date().getFullYear()} Vipuri. All Rights Reserved
          </div>
       
          {/* CENTER */}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
            <Image src="/payments/mpesa.png" alt="" width={40} height={20} />
            <Image src="/payments/mixx.png" alt="" width={40} height={20} />
            <Image src="/payments/mastercard.png" alt="" width={40} height={20} />
            <Image src="/payments/visa.png" alt="" width={40} height={20} />
            <Image src="/payments/amex.png" alt="" width={40} height={20} />
            <Image src="/payments/cash.png" alt="" width={40} height={20} />
          </div>

          {/* RIGHT */}
          {/* RIGHT */}
<div className="flex flex-col items-center gap-6 text-center w-full font-normal">

{/* LINKS — 3 COLUMNS ON MOBILE */}
<div
  className="
    grid grid-cols-3 gap-x-6 gap-y-2
    md:flex md:flex-wrap md:justify-end md:gap-4
    text-sm font-normal
  "
>
  <a href="#" className="font-normal hover:text-gray-800">Careers</a>
  <a href="#" className="font-normal hover:text-gray-800">Warranty Policy</a>
  <a href="#" className="font-normal hover:text-gray-800">Sell with us</a>

  <a href="#" className="font-normal hover:text-gray-800">Terms of Use</a>
  <a href="#" className="font-normal hover:text-gray-800">Privacy Policy</a>
  <a href="#" className="font-normal hover:text-gray-800">Consumer Rights</a>
</div>

{/* TECHON — ALWAYS BOTTOM & CENTERED */}
<div className="whitespace-nowrap text-center font-normal">
  <span className="italic font-normal text-gray-400">Developed by </span>
  <a
    href="https://www.techonsoftware.com"
    target="_blank"
    rel="noopener noreferrer"
    className="italic font-normal text-slate-500 hover:underline hover:text-slate-600 transition"
  >
    TechOn Software Co.
  </a>
</div>
</div>

        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* 📦 Footer Column                                                           */
/* -------------------------------------------------------------------------- */
function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Subcategory[];
}) {
  return (
    <div>
      <h4 className="font-semibold text-gray-800 mb-3 text-sm">{title}</h4>
      <ul className="space-y-1">
        {links.length ? (
          links.map((l) => (
            <li
              key={l.id}
              onClick={() =>
                (window.location.href = `/user/subcategories?id=${l.id}`)
              }
              className="cursor-pointer hover:text-gray-900"
            >
              {l.name}
            </li>
          ))
        ) : (
          <li className="text-gray-400 italic">No items</li>
        )}
      </ul>
    </div>
  );
}
