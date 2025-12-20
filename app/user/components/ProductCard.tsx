"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { ShoppingCart, CheckCircle2, Star, Heart } from "lucide-react";
import { updateCartCache } from "@/lib/cartUtils";

interface Product {
  id: number;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  rating?: number;
  reviews?: number;
  description?: string;       // ✅ ADD
  attributes?: string[];      // ✅ ALREADY OK
}

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : 0;

  /* --------------------------- Add To Cart --------------------------- */
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding || added) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/user/login");
      return;
    }

    // Instant UI feedback
    setAdding(true);
    setAdded(true);

    // Optimistic local update
    try {
      const existing = localStorage.getItem("cart_items");
      let updated = existing ? JSON.parse(existing) : [];

      const idx = updated.findIndex((it: any) => it.product_id === product.id);

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

      // Background sync
      axios
        .post(
          `${apiBaseUrl}/cart/add`,
          { product_id: product.id, quantity: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .then((res) => {
          updateCartCache(res.data.items || res.data.cart?.items || []);
        })
        .catch(() => {});
    } catch (err) {
      console.error("Cart local update failed:", err);
    } finally {
      setTimeout(() => {
        setAdding(false);
        setAdded(false);
      }, 1200);
    }
  };

  /* ---------------------------- UI ---------------------------- */

  return (
    <div
      onClick={() => router.push(`/user/products?id=${product.id}`)}
      className="
        relative 
        bg-white 
        border border-gray-200
        rounded-[8px]
        transition-all 
        duration-200 
        cursor-pointer 
        overflow-hidden 
        flex flex-col
        h-[440px]
      "
    >
      {/* Best Seller Badge */}
      <div className="absolute top-2 left-2 bg-gray-900 text-white text-xs font-semibold px-2 py-0.5 rounded-md z-10 shadow">
        Best Seller
      </div>

      {/* Wish Icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setLiked(!liked);
        }}
        className="
          absolute 
          top-2 right-2 
          bg-white 
          rounded-full 
          shadow 
          p-1 
          z-10 
          hover:scale-105 
          transition
        "
      >
        <Heart
          size={18}
          className={liked ? "text-red-500 fill-red-500" : "text-gray-400"}
        />
      </button>

        {/* Image */}
        <div className="relative w-full h-[320px] bg-gray-100">
        <Image
          src={product.image || "/placeholder.png"}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, 200px"
        />

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={adding}
          className="
            absolute bottom-2 right-2 
            bg-white 
            rounded-lg 
            shadow 
            p-2 
            hover:bg-gray-50 
            transition
          "
        >
          {added ? (
            <CheckCircle2 className="text-green-600" size={18} />
          ) : adding ? (
            <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShoppingCart className="text-gray-700" size={18} />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-3 flex flex-col flex-grow">
        {/* Title */}
        <h3 className="font-bold text-[17px] text-gray-900 line-clamp-2 leading-tight min-h-[26px]">
        {product.name}
        </h3>
        {/* Description */}
        <p className="mt-1 text-sm font-semibold text-gray-700 line-clamp-1">
          {product.description}
        </p>
        {/* Attributes */}
        {product.attributes && product.attributes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {product.attributes.slice(0, 3).map((attr, i) => (
              <span
                key={i}
                className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                {attr}
              </span>
            ))}
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={14}
              className={
                i < Math.floor(product.rating || 0)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300"
              }
            />
          ))}

          {product.reviews && (
            <span className="text-xs text-gray-500 ml-1">
              ({product.reviews})
            </span>
          )}
        </div>

        {/* Price */}
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
            <span className="text-green-600 text-xs font-medium">
              {discount}% OFF
            </span>
          )}
        </div>

        {/* Footer Badges */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-gray-500">🚚 Selling out fast</span>
          <span className="text-[10px] font-semibold text-yellow-500 uppercase">
            express
          </span>
        </div>
      </div>
    </div>
  );
}
