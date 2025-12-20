"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
interface Banner {
  id: number;
  image: string;
  alt?: string;
  link?: string;
  type: "top" | "main" | "side";
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */
const CACHE_KEY = "vipuri_banners_v4";
const CACHE_TIME = "vipuri_banners_time_v4";
const CACHE_TTL = 1000 * 60 * 60 * 12;

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function BannerSection() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentTop, setCurrentTop] = useState(0);
  const [currentMain, setCurrentMain] = useState(0);
  const [loading, setLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({});

  /* -------------------- Fetch + Cache -------------------- */
  useEffect(() => {
    const now = Date.now();
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIME);

    if (cached && cachedTime && now - Number(cachedTime) < CACHE_TTL) {
      setBanners(JSON.parse(cached));
      setLoading(false);
      return;
    }

    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/banners`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setBanners(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME, now.toString());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* -------------------- Groups -------------------- */
  const topBanners = banners.filter((b) => b.type === "top");
  const mainBanners = banners.filter((b) => b.type === "main");
  const sideBanner = banners.find((b) => b.type === "side");

  /* -------------------- Auto Slide -------------------- */
  useEffect(() => {
    if (topBanners.length < 2) return;
    const i = setInterval(
      () => setCurrentTop((p) => (p + 1) % topBanners.length),
      3500
    );
    return () => clearInterval(i);
  }, [topBanners]);

  useEffect(() => {
    if (mainBanners.length < 2) return;
    const i = setInterval(
      () => setCurrentMain((p) => (p + 1) % mainBanners.length),
      4000
    );
    return () => clearInterval(i);
  }, [mainBanners]);

  /* -------------------- Loading -------------------- */
  if (loading) {
    return <div className="w-full h-[260px] bg-gray-200 animate-pulse" />;
  }

  if (!banners.length) {
    return (
      <div className="w-full h-[260px] flex items-center justify-center text-gray-400">
        No banners available
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* UI                                                                        */
  /* -------------------------------------------------------------------------- */
  return (
    <section className="w-full bg-white">
      {/* ================= TOP THIN ================= */}
      {topBanners.length > 0 && (
        <div className="relative w-full h-[44px] sm:h-[64px] overflow-hidden bg-gray-100">
          {topBanners.map((b, i) => (
            <div
              key={b.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === currentTop ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              {!brokenImages[b.id] ? (
                <Image
                  src={b.image}
                  alt={b.alt || ""}
                  fill
                  className="object-cover"
                  priority={i === 0}
                  onError={() =>
                    setBrokenImages((p) => ({ ...p, [b.id]: true }))
                  }
                />
              ) : (
                <GreyPlaceholder />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ================= MAIN + SIDE (ALWAYS SAME LAYOUT) ================= */}
      <div className="w-full grid grid-cols-4 gap-[2px] mt-[2px]">
        {/* MAIN (3/4 width) */}
        {mainBanners.length > 0 && (
          <div className="relative col-span-3 h-[160px] sm:h-[220px] md:h-[360px] bg-gray-100 overflow-hidden">
            {mainBanners.map((b, i) => (
              <div
                key={b.id}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === currentMain ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                {!brokenImages[b.id] ? (
                  <Image
                    src={b.image}
                    alt={b.alt || ""}
                    fill
                    className="object-cover"
                    onError={() =>
                      setBrokenImages((p) => ({ ...p, [b.id]: true }))
                    }
                  />
                ) : (
                  <GreyPlaceholder />
                )}
              </div>
            ))}

            {mainBanners.length > 1 && (
              <>
                <Arrow
                  left
                  onClick={() =>
                    setCurrentMain((p) =>
                      p === 0 ? mainBanners.length - 1 : p - 1
                    )
                  }
                />
                <Arrow
                  onClick={() =>
                    setCurrentMain((p) =>
                      p === mainBanners.length - 1 ? 0 : p + 1
                    )
                  }
                />
              </>
            )}
          </div>
        )}

        {/* SIDE (1/4 width) */}
        {sideBanner && (
          <div className="relative col-span-1 h-[160px] sm:h-[220px] md:h-[360px] bg-gray-100 overflow-hidden">
            {!brokenImages[sideBanner.id] ? (
              <Image
                src={sideBanner.image}
                alt={sideBanner.alt || ""}
                fill
                className="object-cover"
                onError={() =>
                  setBrokenImages((p) => ({ ...p, [sideBanner.id]: true }))
                }
              />
            ) : (
              <GreyPlaceholder />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function GreyPlaceholder() {
  return (
    <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center text-gray-400 text-xs">
      Banner
    </div>
  );
}

function Arrow({
  left,
  onClick,
}: {
  left?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`absolute ${
        left ? "left-1 sm:left-2" : "right-1 sm:right-2"
      } top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center z-20`}
    >
      {left ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
    </button>
  );
}
