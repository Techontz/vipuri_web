"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Image from "next/image";
import { Loader2, Upload, Trash2, X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 🌐 Simple in-memory + session cache */
const cacheStore: Record<string, any> = {};
const cacheTTL = 5 * 60 * 1000; // 5 minutes
function getCached(key: string) {
  const mem = cacheStore[key];
  const ses = sessionStorage.getItem(key);
  if (mem && Date.now() - mem.t < cacheTTL) return mem.v;
  if (ses) {
    const obj = JSON.parse(ses);
    if (Date.now() - obj.t < cacheTTL) return obj.v;
  }
  return null;
}
function setCached(key: string, value: any) {
  cacheStore[key] = { v: value, t: Date.now() };
  sessionStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() }));
}

/* -------------------------------------------------------------------------- */
/* 🌈 Shimmer Loader Components */
const ShimmerBox = ({ className }: { className?: string }) => (
  <div className={`bg-gray-200/60 animate-pulse rounded-md ${className}`} />
);

const ShimmerForm = () => (
  <div className="max-w-3xl mx-auto bg-white mt-6 rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
    <div className="space-y-3">
      <ShimmerBox className="w-32 h-5" />
      <div className="flex flex-wrap gap-3">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <ShimmerBox key={i} className="w-24 h-24 rounded-lg" />
          ))}
      </div>
    </div>

    <div className="space-y-3">
      <ShimmerBox className="w-40 h-5" />
      <ShimmerBox className="w-full h-10" />
      <div className="grid sm:grid-cols-2 gap-4">
        <ShimmerBox className="h-10" />
        <ShimmerBox className="h-10" />
      </div>
      <ShimmerBox className="h-10" />
      <ShimmerBox className="h-24" />
    </div>

    <div className="space-y-3">
      <ShimmerBox className="w-52 h-5" />
      <div className="grid sm:grid-cols-2 gap-4">
        <ShimmerBox className="h-10" />
        <ShimmerBox className="h-10" />
      </div>
    </div>

    <ShimmerBox className="w-full h-12" />
  </div>
);

/* -------------------------------------------------------------------------- */
/* 🧩 Inner Component */
function EditProductInner() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("id");
  const router = useRouter();

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [attributeValues, setAttributeValues] = useState<{ [key: string]: string }>({});
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    new_price: "",
    old_price: "",
    description: "",
    stock: "",
    category_id: "",
    subcategory_id: "",
  });

  /* -------------------------------------------------------------------------- */
  /* 🔄 Fetch product + categories */
  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);

        const cached = getCached(`product-${productId}`);
        if (cached) {
          populateProduct(cached);
          setLoading(false);
          return;
        }

        const [pRes, cRes] = await Promise.all([
          api.get(`/products/${productId}`),
          api.get("/categories"),
        ]);

        const product = pRes.data?.product || pRes.data;
        const cats = cRes.data || [];
        setCategories(cats);
        populateProduct(product);
        setCached(`product-${productId}`, product);
      } catch (err) {
        console.error("❌ Product load error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [productId]);

  const populateProduct = async (p: any) => {
    setForm({
      name: p.name || "",
      new_price: p.new_price?.toString() || "",
      old_price: p.old_price?.toString() || "",
      description: p.description || "",
      stock: p.stock?.toString() || "",
      category_id: p.category?.id?.toString() || "",
      subcategory_id: p.subcategory?.id?.toString() || "",
    });

    setExistingImages(
      Array.isArray(p.images)
        ? p.images.map((img: any) =>
            typeof img === "string"
              ? { image: img }
              : { image: img.image || img.image_url || img.url || img.path }
          )
        : []
    );

    if (p.attribute_values) {
      const attrs: { [key: string]: string } = {};
      p.attribute_values.forEach((av: any) => {
        attrs[av.attribute.id] = av.value;
      });
      setAttributeValues(attrs);
    }

    if (p.category?.id) {
      const [subRes, attrRes] = await Promise.all([
        api.get(`/categories/${p.category.id}/subcategories`),
        api.get(`/categories/${p.category.id}`),
      ]);
      setSubcategories(subRes.data || []);
      setAttributes(attrRes.data?.attributes || []);
    }
  };

  /* -------------------------------------------------------------------------- */
  async function handleCategoryChange(categoryId: string) {
    try {
      const [subRes, attrRes] = await Promise.all([
        api.get(`/categories/${categoryId}/subcategories`),
        api.get(`/categories/${categoryId}`),
      ]);
      setSubcategories(subRes.data || []);
      setAttributes(attrRes.data?.attributes || []);
      setForm((prev) => ({ ...prev, category_id: categoryId, subcategory_id: "" }));
    } catch (err) {
      console.error("Failed to fetch subcategories:", err);
    }
  }

  /* -------------------------------------------------------------------------- */
  const handleNewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) {
      const previews = files.map((f) => URL.createObjectURL(f));
      setNewImages((prev) => [...prev, ...files]);
      setPreviewUrls((prev) => [...prev, ...previews]);
    }
  };
  const removeExistingImage = (i: number) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== i));
  };
  const removeNewImage = (i: number) => {
    setNewImages((prev) => prev.filter((_, idx) => idx !== i));
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== i));
  };
  const normalizeImageUrl = (path: string) => {
    if (!path) return "/placeholder.png";
    if (path.startsWith("http")) return path;
    const base = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "";
    const clean = path.replace(/^\/?storage\//, "");
    return `${base}/storage/${clean}`;
  };

  /* -------------------------------------------------------------------------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setSubmitting(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("_method", "PATCH");
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      Object.entries(attributeValues).forEach(([k, v]) =>
        formData.append(`attributes[${k}]`, v)
      );
      if (existingImages.length === 0 && newImages.length === 0)
        formData.append("remove_images", "true");
      newImages.forEach((img) => formData.append("images[]", img));
      const res = await api.post(`/products/${productId}`, formData);

      setMessage({ type: "success", text: res.data?.message || "✅ Product updated successfully!" });
      setCached(`product-${productId}`, null);
      setTimeout(() => router.push(`/vendor/products?id=${productId}`), 1500);    } catch (err: any) {
      console.error("Update error:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update product.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this product?")) return;
    if (!productId) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${productId}`);
      alert("Product deleted successfully!");
      router.push("/vendor/dashboard");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err.response?.data?.message || "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  if (loading)
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="sticky top-0 bg-white px-5 py-4 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
            <span className="font-semibold text-gray-700">Loading Product...</span>
          </div>
        </div>
        <ShimmerForm />
      </main>
    );

  /* -------------------------------------------------------------------------- */
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white shadow-sm px-5 py-4 flex justify-between items-center sticky top-0 z-30">
        <h1 className="font-semibold text-gray-800 text-lg">Edit Product</h1>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-2 text-red-600 font-semibold"
        >
          {deleting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4" /> Delete
            </>
          )}
        </button>
      </header>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto bg-white mt-6 rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6"
      >
        {message && (
          <div
            className={`p-3 text-sm rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* IMAGES */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Product Images</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {existingImages.map((img, i) => {
              const url = normalizeImageUrl(img.image);
              return (
                <div key={i} className="relative w-24 h-24">
                  <Image
                    src={url}
                    alt="Existing"
                    fill
                    unoptimized
                    loader={({ src }) => src}
                    className="object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(i)}
                    className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {previewUrls.map((url, i) => (
              <div key={i} className="relative w-24 h-24">
                <Image
                  src={url}
                  alt="Preview"
                  fill
                  className="object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            <label className="w-24 h-24 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-500 cursor-pointer bg-gray-50 transition">
              <Upload className="w-5 h-5 text-gray-500" />
              <span className="text-xs mt-1 text-gray-500">Upload</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleNewImageSelect}
              />
            </label>
          </div>
        </section>

        {/* BASIC INFO */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Basic Info</h2>
          <input
            name="name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Enter product name"
            required
            className="w-full mb-4 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
          />

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <input
              name="new_price"
              type="number"
              value={form.new_price}
              onChange={(e) => setForm((p) => ({ ...p, new_price: e.target.value }))}
              required
              placeholder="New Price"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
            />
            <input
              name="old_price"
              type="number"
              value={form.old_price}
              onChange={(e) => setForm((p) => ({ ...p, old_price: e.target.value }))}
              placeholder="Old Price (optional)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <input
            name="stock"
            type="number"
            value={form.stock}
            onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
            required
            placeholder="Stock Quantity"
            className="w-full mb-4 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
          />

          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Write product description..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
          ></textarea>
        </section>

        {/* CATEGORY & SUBCATEGORY */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Category & Subcategory</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <select
              name="category_id"
              value={form.category_id}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              name="subcategory_id"
              value={form.subcategory_id}
              onChange={(e) => setForm((p) => ({ ...p, subcategory_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="">Select subcategory</option>
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* ATTRIBUTES */}
        {attributes.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Attributes</h2>
            <div className="space-y-4">
              {attributes.map((attr) => (
                <div key={attr.id}>
                  <label className="block text-gray-700 mb-1 font-medium">{attr.name}</label>
                  <input
                    type="text"
                    value={attributeValues[attr.id] || ""}
                    onChange={(e) =>
                      setAttributeValues((prev) => ({ ...prev, [attr.id]: e.target.value }))
                    }
                    placeholder={`Enter ${attr.name}`}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg shadow transition disabled:opacity-60"
        >
          {submitting ? (
            <div className="flex justify-center items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </div>
          ) : (
            "Save Changes"
          )}
        </button>
      </form>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ Export with Suspense wrapper */
export default function EditProductPage() {
  return (
    <Suspense fallback={<ShimmerForm />}>
      <EditProductInner />
    </Suspense>
  );
}
