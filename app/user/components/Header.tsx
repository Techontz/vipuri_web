"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  ShoppingCart,
  User,
  Heart,
  ChevronDown,
  X,
  LogOut,
  Check,
} from "lucide-react";
import { Bell, Globe } from "lucide-react";
import SearchBar from "./SearchBar";
import CategoryNav from "./CategoryNav";
import axios from "axios";
import { listenEvent } from "@/lib/eventBus";
import AuthModal from "@/app/auth/AuthModal";

/* ================= TYPES ================= */
interface Category {
  id: number;
  name: string;
}

interface HeaderProps {
  onCategorySelect?: (category: Category) => void;
}

function UnequalMenuIcon({
  size = 32,
  color = "#FF6A33",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      className="drawer-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
    >

      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="17" y2="12" />
      <line x1="4" y1="18" x2="12" y2="18" />
    </svg>
  );
}

function CloseIcon({
  size = 32,
  color = "#FF6A33",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      className="drawer-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

interface AuthUser {
  firstName?: string;
  lastName?: string;
  name?: string;
}

/* ================= TRANSLATIONS ================= */
const translations = {
  en: {
    deliverTo: "Deliver to",
    login: "Log in",
    language: "English",
  },
  sw: {
    deliverTo: "Wasilisha",
    login: "Ingia",
    language: "Swahili",
  },
};

type Lang = "en" | "sw";

export default function Header({ onCategorySelect }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const langBtnRef = useRef<HTMLButtonElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [lang, setLang] = useState<Lang>("en");
  const [showLang, setShowLang] = useState(false);
  const [langPos, setLangPos] = useState({ left: 0 });

  const t = translations[lang];

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [cartCount, setCartCount] = useState(0);

  /* ================= AUTH ================= */
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
  
    // 🔴 NOT logged in
    if (!rawUser || !token) {
      setUser(null);
      return;
    }
  
    try {
      const parsed = JSON.parse(rawUser);
  
      // 🔴 empty object = NOT logged in
      if (!parsed || Object.keys(parsed).length === 0) {
        setUser(null);
      } else {
        setUser(parsed);
      }
    } catch {
      setUser(null);
    }
  }, [pathname, showLogin]);  

  /* ================= LANGUAGE POSITION ================= */
  useEffect(() => {
    if (showLang && langBtnRef.current) {
      const rect = langBtnRef.current.getBoundingClientRect();
      setLangPos({ left: rect.left });
    }
  }, [showLang]);

  /* ================= CLOSE DROPDOWNS ================= */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        langDropdownRef.current &&
        !langDropdownRef.current.contains(e.target as Node) &&
        !langBtnRef.current?.contains(e.target as Node)
      ) {
        setShowLang(false);
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserDropdown(false);
      }      
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  
  /* ================= CATEGORIES ================= */
  useEffect(() => {
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/categories-with-subcategories`)
      .then((res) => {
        setCategories(res.data || []);
        setLoadingCats(false);
      })
      .catch(() => setLoadingCats(false));
  }, []);

  /* ================= CART ================= */
  const updateCounts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/cart`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCartCount(res.data.items?.length || 0);
    } catch {}
  };

  interface LoginPageProps {
    onLoginSuccess?: () => void;
  }
  
  useEffect(() => {
    updateCounts();
    const off = listenEvent("cart-updated", updateCounts);
    return () => off();
  }, [pathname]);

  /* ================= AUTH GUARD ================= */
  const requireAuth = (action: () => void) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    action();
  };

  /* ================= LOGOUT ================= */
  async function handleLogout() {
    setLoggingOut(true);            // 1️⃣ show progress
  
    // simulate logout delay (API-safe)
    await new Promise((res) => setTimeout(res, 800));
  
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  
    setUser(null);
    setShowUserDropdown(false);
    setConfirmLogout(false);        // 2️⃣ close dialog
    setLoggingOut(false);           // 3️⃣ reset state
  
    router.push("/");               // 4️⃣ redirect
  }
  
  const displayName =
    user?.firstName || user?.name || "My Account";

  /* ================= RENDER ================= */
  return (
    <>
      <header className="sticky top-0 z-50 w-full text-gray-400">
      <div className="relative bg-[#FFFFFF] h-[64px] px-4 md:px-8 flex items-center justify-between gap-4">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            {/* MENU ICON */}
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="flex items-center justify-center w-12 h-12 rounded-[10px] bg-[#FFF1ED]"
            >
              {drawerOpen ? <CloseIcon /> : <UnequalMenuIcon />}
            </button>

            {/* LOGO */}
            <Image
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo b.png`}
              alt="Vipuri"
              width={120}
              height={32}
              onClick={() => router.push("/")}
              className="cursor-pointer"
            />
          </div>

          {/* CENTER */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="w-full max-w-[900px]">
              <SearchBar />
            </div>
          </div>
          {/* RIGHT */}
          <div className="flex items-center">
            {/* USER */}
            <button
              onClick={() => setShowUserDropdown((v) => !v)}
              className="group flex items-center px-3"
            >
              <User
                size={20}
                className="text-gray-500 group-hover:text-[#FF6A33] transition-colors"
              />
            </button>

            {showUserDropdown && (
            <div
              ref={userMenuRef}
              className="absolute right-6 top-[64px] z-[999] w-[260px] bg-white rounded-md shadow-2xl py-2"
            >
              {!user ? (
                <>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowLogin(true);
                    }}
                    className="w-full text-left px-4 py-3 font-semibold hover:bg-gray-100"
                  >
                    Sign in / Register
                  </button>

                  <div className="h-px bg-gray-200 my-1" />

                  <button
                    onClick={() => router.push("/user/favorites")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100"
                  >
                    My wish list
                  </button>

                  <button
                    onClick={() => router.push("/support")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100"
                  >
                    Support
                  </button>

                  <button
                    onClick={() => router.push("/recently-viewed")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100"
                  >
                    Recently Viewed
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/user/profile")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100"
                  >
                    My Account
                  </button>

                  <button
                    onClick={() => router.push("/user/orders")}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100"
                  >
                    My Orders
                  </button>

                  <div className="h-px bg-gray-200 my-1" />

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setConfirmLogout(true); // ✅ open confirmation
                    }}
                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50"
                  >
                    Log out
                  </button>
                </>
              )}
            </div>
          )}

            {/* DIVIDER */}
            <span className="h-6 w-px bg-gray-300" />

            {/* LANGUAGE */}
            <button
              ref={langBtnRef}
              onClick={() => setShowLang((v) => !v)}
              className="group flex items-center px-3"
            >
              <Globe
                size={20}
                className="text-gray-500 group-hover:text-[#FF6A33] transition-colors"
              />
            </button>

            {/* DIVIDER */}
            <span className="h-6 w-px bg-gray-300" />

            {/* FAVORITES */}
            <button
              onClick={() => requireAuth(() => router.push("/user/favorites"))}
              className="group flex items-center px-3"
            >
              <Heart
                size={20}
                className="text-gray-500 group-hover:text-[#FF6A33] transition-colors"
              />
            </button>

            {/* DIVIDER */}
            <span className="h-6 w-px bg-gray-300" />

            {/* CART */}
            <button
              onClick={() => requireAuth(() => router.push("/user/cart"))}
              className="relative flex items-center gap-1 px-3"
            >
              <ShoppingCart size={20} className="text-gray-500" />
              <span className="text-sm font-medium">Cart</span>

              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-1.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {/* DIVIDER */}
            <span className="h-6 w-px bg-gray-300" />

            {/* NOTIFICATIONS */}
            <button className="group flex items-center px-3">
              <Bell
                size={20}
                className="text-gray-500 group-hover:text-[#FF6A33] transition-colors"
              />
            </button>
          </div>
        </div>

        {/* LANGUAGE DROPDOWN */}
        {showLang && (
          <div
            ref={langDropdownRef}
            className="fixed top-[64px] right-8 z-[999] w-[340px] bg-white rounded-[6px] shadow-2xl p-6"
          >
            {/* TITLE */}
            <h3 className="text-lg font-bold mb-5">Language</h3>

            {/* LANGUAGE (ACTIVE) */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                Language
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="w-full border border-gray-300 rounded-[6px] px-4 py-3 bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </div>

            {/* COUNTRY (FADED & DISABLED) */}
            <div className="mb-4 opacity-50 cursor-not-allowed">
              <label className="block text-sm font-semibold mb-2">
                Country
              </label>
              <select
                disabled
                className="w-full border border-gray-300 rounded-[6px] px-4 py-3 bg-gray-100"
              >
                <option>Tanzania</option>
              </select>
            </div>

            {/* CURRENCY (FADED & DISABLED — SAME AS COUNTRY) */}
            <div className="mb-6 opacity-50 cursor-not-allowed">
              <label className="block text-sm font-semibold mb-2">
                Currency
              </label>
              <select
                disabled
                className="w-full border border-gray-300 rounded-[6px] px-4 py-3 bg-gray-100"
              >
                <option>TZS</option>
              </select>
            </div>

            {/* SAVE BUTTON */}
            <button
          onClick={() => setShowLang(false)}
          className="w-full bg-[#FF6A33] hover:bg-[#e85f2d] text-white font-semibold py-3 rounded-[6px] transition"
          >
            Save
          </button>
          </div>
        )}

        {/* CATEGORIES */}
        <div className="bg-white relative z-10">
          {!loadingCats && (
            <CategoryNav
              categories={categories}
              activeCategory={selectedCategory}
              onSelect={(cat) => {
                setSelectedCategory(cat);
                onCategorySelect?.(cat);
              }}
            />
          )}
        </div>
      </header>

      {/* AUTH MODAL */}
      {showLogin && (
        <AuthModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={() => {
            setShowLogin(false);
            setShowUserDropdown(false);
          }}
        />
      )}


      {/* LOGOUT CONFIRMATION */}
      {confirmLogout && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!loggingOut) setConfirmLogout(false);
            }}
          />
          <div className="bg-white rounded-2xl p-6 w-[90%] max-w-sm shadow-xl z-10 text-center">
            <h3 className="text-lg font-bold mb-2">Log out?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2 rounded-xl bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className={`flex-1 py-2 rounded-xl font-semibold transition
                  ${loggingOut
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-[#FF6A33] hover:bg-[#e85f2d] text-white"
                  }`}
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
