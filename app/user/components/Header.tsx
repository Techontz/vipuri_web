"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  MessageSquare,
  User,
  Menu,
  X,
  Heart,
} from "lucide-react";
import SearchBar from "./SearchBar";
import CategoryNav from "./CategoryNav";
import axios from "axios";
import { listenEvent } from "@/lib/eventBus";

/* ================= TYPES ================= */
interface Category {
  id: number;
  name: string;
  subcategories?: { id: number; name: string }[];
}

interface LocationData {
  city: string;
  country: string;
  countryCode: string;
}

interface HeaderProps {
  onCategorySelect?: (category: Category) => void;
  onSubcategorySelect?: (subcategoryId: number) => void;
}

/* ================= CACHE ================= */
const CAT_CACHE_KEY = "d2k_categories_cache";
const CAT_CACHE_TIME = "d2k_categories_cache_time";
const CAT_CACHE_EXPIRY = 1000 * 60 * 60 * 24;

/* ================= COMPONENT ================= */
export default function Header({
  onCategorySelect,
  onSubcategorySelect,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [showMenu, setShowMenu] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const [location, setLocation] = useState<LocationData>({
    city: "Dar es Salaam",
    country: "Tanzania",
    countryCode: "tz",
  });
  const [loadingLocation, setLoadingLocation] = useState(true);

  /* ================= LOCATION ================= */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.coords.latitude},${pos.coords.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await res.json();

          if (data.results?.length) {
            const comp = data.results[0].address_components;
            const city =
              comp.find((c: any) => c.types.includes("locality"))?.long_name ||
              "City";
            const countryObj = comp.find((c: any) =>
              c.types.includes("country")
            );

            setLocation({
              city,
              country: countryObj?.long_name || "Country",
              countryCode:
                countryObj?.short_name?.toLowerCase() || "tz",
            });
          }
        } catch {}
        setLoadingLocation(false);
      },
      () => setLoadingLocation(false)
    );
  }, []);

  /* ================= CATEGORIES ================= */
  useEffect(() => {
    let cancelled = false;

    const loadCats = async () => {
      try {
        const cached = localStorage.getItem(CAT_CACHE_KEY);
        const cachedTime = localStorage.getItem(CAT_CACHE_TIME);

        if (cached && cachedTime && Date.now() - +cachedTime < CAT_CACHE_EXPIRY) {
          setCategories(JSON.parse(cached));
          setLoadingCats(false);
        }

        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/categories-with-subcategories`
        );

        if (!cancelled) {
          setCategories(res.data || []);
          localStorage.setItem(CAT_CACHE_KEY, JSON.stringify(res.data || []));
          localStorage.setItem(CAT_CACHE_TIME, Date.now().toString());
          setLoadingCats(false);
        }
      } catch {
        setLoadingCats(false);
      }
    };

    loadCats();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ================= COUNTS ================= */
  const updateCounts = async () => {
    if (isNavigating) return;

    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      if (!token || !userId) return;

      const headers = { Authorization: `Bearer ${token}` };

      const [msg, ord, cart] = await Promise.allSettled([
        axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/messages/count-unread-messages/${userId}`,
          { headers }
        ),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/orders/count`, { headers }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/cart`, { headers }),
      ]);

      if (msg.status === "fulfilled") setUnreadCount(msg.value.data.count || 0);
      if (ord.status === "fulfilled") setOrderCount(ord.value.data.count || 0);
      if (cart.status === "fulfilled")
        setCartCount(cart.value.data.items?.length || 0);
    } catch {}
  };

  useEffect(() => {
    updateCounts();
    const off1 = listenEvent("cart-updated", updateCounts);
    const off2 = listenEvent("orders-updated", updateCounts);
    return () => {
      off1();
      off2();
    };
  }, [pathname]);

  /* ================= RENDER ================= */
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* ================= YELLOW BAR ================= */}
      <div className="bg-[#FFD100] h-[64px] px-4 md:px-8 flex items-center justify-between gap-4">
        {/* LEFT */}
        <div className="flex items-center gap-4">
          <button className="md:hidden" onClick={() => setShowMenu(!showMenu)}>
            {showMenu ? <X /> : <Menu />}
          </button>

          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/vipuri.png`}
            alt="Vipuri"
            width={120}
            height={32}
            onClick={() => router.push("/user")}
            className="cursor-pointer"
          />

          {!loadingLocation && (
            <div className="hidden md:flex items-center gap-2 text-sm">
              <Image
                src={`https://flagcdn.com/24x18/${location.countryCode}.png`}
                width={24}
                height={18}
                alt="flag"
              />
              <span className="text-gray-700">Deliver to</span>
              <span className="font-semibold">{location.city}</span>
            </div>
          )}
        </div>

        {/* CENTER SEARCH */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="w-full max-w-[900px]">
            <SearchBar />
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium">العربية</button>

          <button onClick={() => router.push("/login")} className="flex items-center gap-1">
            <User size={18} />
            <span className="hidden md:inline text-sm">Log in</span>
          </button>

          <Heart size={20} className="cursor-pointer" />

          <button
            onClick={() => router.push("/user/cart")}
            className="relative"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[10px] px-1.5 rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ================= CATEGORIES ================= */}
      <div className="bg-white border-t shadow-sm">
        {!loadingCats && (
          <CategoryNav
          categories={categories}
          activeCategory={selectedCategory}
          onSelect={(cat) => {
            setSelectedCategory(cat);
            onCategorySelect?.(cat); // 🔥 passes to HomePage
          }}
        />        
        )}
      </div>
    </header>
  );
}
