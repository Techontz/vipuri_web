"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  ShoppingCart,
  CheckCircle2,
  Star,
  Heart,
  X,
} from "lucide-react";
import { updateCartCache } from "@/lib/cartUtils";
import AuthModal from "@/app/auth/AuthModal";

/* ---------------- TYPES ---------------- */
interface Product {
  id: number;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  rating?: number | string;
  reviews?: number;
  description?: string;
  attributes?: string[];
}

interface Props {
  product: Product;
}

/* ---------------- COMPONENT ---------------- */
export default function ProductCard({ product }: Props) {
  const router = useRouter();

  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);

  /* 🔐 AUTH */
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  /* ---------------- AUTH GUARD ---------------- */
  const requireAuth = (action: () => void) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    action();
  };

  /* ---------------- NORMALIZE RATING ---------------- */
  const ratingValue = Math.max(
    0,
    Math.min(5, Math.floor(Number(product.rating) || 0))
  );

  /* ---------------- DISCOUNT ---------------- */
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(
          ((product.oldPrice - product.price) / product.oldPrice) * 100
        )
      : 0;

  /* ---------------- ADD TO CART ---------------- */
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding || added) return;

    requireAuth(async () => {
      setAdding(true);
      setAdded(true);

      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const existing = localStorage.getItem("cart_items");
        let updated = existing ? JSON.parse(existing) : [];

        const idx = updated.findIndex(
          (it: any) => it.product_id === product.id
        );

        if (idx >= 0) updated[idx].quantity += 1;
        else {
          updated.push({
            product_id: product.id,
            quantity: 1,
            product,
          });
        }

        localStorage.setItem("cart_items", JSON.stringify(updated));
        window.dispatchEvent(new Event("cart-updated"));

        axios
          .post(
            `${apiBaseUrl}/cart/add`,
            { product_id: product.id, quantity: 1 },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then((res) => {
            updateCartCache(
              res.data.items || res.data.cart?.items || []
            );
          })
          .catch(() => {});
      } catch (err) {
        console.error("Cart update failed:", err);
      } finally {
        setTimeout(() => {
          setAdding(false);
          setAdded(false);
        }, 1200);
      }
    });
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <div
        onClick={() =>
          router.push(`/user/products?id=${product.id}`)
        }
        className="relative bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer flex flex-col h-[440px]"
      >
        {/* BEST SELLER */}
        <div className="absolute top-0 left-0 bg-black text-white text-[11px] font-semibold px-4 py-1.5 rounded-br-xl z-20">
          Best Seller
        </div>

        {/* ❤️ WISHLIST */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            requireAuth(() => setLiked(!liked));
          }}
          className="absolute top-2 right-2 bg-white rounded-full shadow p-1 z-20"
        >
          <Heart
            size={18}
            className={
              liked
                ? "text-red-500 fill-red-500"
                : "text-gray-400"
            }
          />
        </button>

        {/* IMAGE */}
        <div className="relative w-full h-[320px] bg-gray-100">
          <Image
            src={product.image || "/placeholder.png"}
            alt={product.name}
            fill
            className="object-cover"
          />

          {/* ADD TO CART */}
          <button
            onClick={handleAddToCart}
            disabled={adding}
            className="absolute bottom-2 right-2 bg-white rounded-lg shadow p-2"
          >
            {added ? (
              <CheckCircle2
                className="text-green-600"
                size={18}
              />
            ) : adding ? (
              <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShoppingCart
                className="text-gray-700"
                size={18}
              />
            )}
          </button>
        </div>

        {/* CONTENT */}
        <div className="px-3 py-3 flex flex-col flex-grow">
          <h3 className="font-bold text-[17px] text-gray-900 line-clamp-2">
            {product.name}
          </h3>

          <p className="mt-1 text-sm font-semibold text-gray-700 line-clamp-1">
            {product.description}
          </p>

          {/* ⭐ RATING (ABSOLUTE FINAL FIX) */}
<div className="flex items-center gap-1 mt-2">
  {[0, 1, 2, 3, 4].map((i) => {
    const filled = i < ratingValue;

    return (
      <Star
        key={`star-${product.id}-${i}`}
        size={15}
        className="rating-star"                 // ✅ EXCLUDED FROM GLOBAL CSS
        fill={filled ? "#facc15" : "none"}      // ✅ STAR FILL
        stroke={filled ? "#facc15" : "#d1d5db"} // ✅ STAR STROKE
        style={{
          fill: filled ? "#facc15" : "none",    // ✅ FINAL OVERRIDE
          stroke: filled ? "#facc15" : "#d1d5db",
        }}
      />
    );
  })}

  {product.reviews !== undefined && (
    <span className="text-xs text-gray-500 ml-1">
      ({product.reviews})
    </span>
  )}
</div>

          {/* PRICE */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-[15px] text-gray-900">
              TZS {product.price.toLocaleString()}
            </span>

            {product.oldPrice && (
              <span className="line-through text-xs text-gray-400">
                {product.oldPrice.toLocaleString()}
              </span>
            )}

            {discount > 0 && (
              <span className="text-green-600 text-xs font-semibold">
                {discount}% OFF
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] text-gray-500">
              🚚 Selling out fast
            </span>
            <span className="text-[10px] font-semibold text-yellow-500 uppercase">
              EXPRESS
            </span>
          </div>
        </div>
      </div>

      {/* 🔐 LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowLogin(false)}
          />
          <div className="relative bg-white w-[92%] max-w-md rounded-2xl shadow-2xl">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute right-4 top-4"
            >
              <X size={20} />
            </button>
            <AuthModal
              onClose={() => setShowLogin(false)}
              onLoginSuccess={() => {
                setShowLogin(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
