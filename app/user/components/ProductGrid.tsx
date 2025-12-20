"use client";

import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: any[] }) {
  if (!products?.length) {
    return (
      <div className="text-center text-gray-400 py-10">
        No products found.
      </div>
    );
  }

  const normalized = products.map((p) => ({
    id: p.id,
    name: p.name,
    image:
      Array.isArray(p.images) && p.images.length
        ? p.images[0]?.image || p.images[0]
        : "/placeholder.png",
    price: p.new_price || 0,
    oldPrice: p.old_price || 0,
    rating: p.average_rating || 0,
    reviews: p.review_count || 0,
  }));

  return (
    <div
      className="
        grid
        grid-cols-2
        sm:grid-cols-3
        md:grid-cols-4
        lg:grid-cols-5
        xl:grid-cols-4
        gap-1
        py-4
      "
    >
      {normalized.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
