"use client";

import Image from "next/image";
import { Plus } from "lucide-react";

/* ---------------- TYPES ---------------- */
interface Deal {
  id: number;
  title: string;
  image: string;
  category: string;
  oldPrice: number;
  newPrice: number;
}

interface Props {
  deals: Deal[];
}

/* ---------------- COMPONENT ---------------- */
export default function SpotlightDeals({ deals }: Props) {
  if (!deals.length) return null;

  const formatPrice = (price: number) =>
    `TZS ${price.toLocaleString("en-TZ")}`;

  return (
    <section className="bg-[#BDBDBD] py-5 px-3 sm:px-6 mt-8 rounded-md">
      {/* TITLE */}
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
        Spotlight deals
      </h2>

      {/* ROW */}
      <div
        className="
          flex
          gap-4 sm:gap-6
          overflow-x-auto
          pb-4
          scrollbar-hide
          snap-x snap-mandatory
        "
      >
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="
              relative
              flex-shrink-0
              w-[240px] sm:w-[280px] md:w-[300px]
              bg-white
              rounded-xl
              overflow-hidden
              snap-start
            "
          >
            {/* CATEGORY BADGE – TOUCHING CORNER */}
            <div
              className="
                absolute
                top-0
                right-0
                bg-black
                text-white
                text-[11px]
                font-medium
                px-3 sm:px-4
                py-1 sm:py-1.5
                rounded-bl-xl
                z-10
              "
            >
              {deal.category}
            </div>

            {/* IMAGE AREA */}
            <div className="relative h-[150px] sm:h-[180px] md:h-[190px] flex items-center justify-center bg-white">
              <Image
                src={deal.image}
                alt={deal.title}
                width={140}
                height={140}
                className="object-contain"
              />

              {/* PLUS BUTTON */}
              <button
                className="
                  absolute
                  right-2 sm:right-3
                  top-1/2
                  -translate-y-1/2
                  w-9 h-9 sm:w-10 sm:h-10
                  rounded-xl
                  border
                  border-gray-300
                  bg-white
                  flex
                  items-center
                  justify-center
                  hover:bg-gray-100
                "
              >
                <Plus size={18} className="sm:hidden" />
                <Plus size={20} className="hidden sm:block" />
              </button>
            </div>

            {/* DESCRIPTION + PRICE */}
            <div className="bg-[#F1F1F1] px-3 sm:px-4 pt-3 pb-4">
              {/* TITLE */}
              <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
                {deal.title}
              </p>

              {/* PRICE */}
              <div className="mt-2 flex items-end gap-2">
                <span className="text-xs sm:text-sm line-through text-gray-500">
                  {formatPrice(deal.oldPrice)}
                </span>

                <span className="text-xl sm:text-2xl font-bold text-black">
                  {formatPrice(deal.newPrice)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
