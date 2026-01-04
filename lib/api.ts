// ============================================================
// 🌍 Resolve API Base URL
// ============================================================
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.vipuri.co.tz/api";

console.log("🌍 Using API Base URL:", API_BASE);

// ============================================================
// 🧠 Core fetch wrapper
// ============================================================
async function request(
  endpoint: string,
  options: RequestInit = {}
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: "omit", // 🔴 using Bearer token, not cookies
    });

    // ========================================================
    // 🚫 Handle Unauthorized globally
    // ========================================================
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/auth/login";
      throw new Error("Unauthorized");
    }

    // ========================================================
    // ❌ Handle API errors
    // ========================================================
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ API Error:", res.status, endpoint, errorText);
      throw new Error(errorText || "API request failed");
    }

    // ========================================================
    // ✅ Return JSON
    // ========================================================
    return await res.json();
  } catch (err: any) {
    console.error("❌ Network / Fetch Error:", err.message);
    throw err;
  }
}

// ============================================================
// ✅ API helpers (same ergonomics as Axios)
// ============================================================
export const api = {
  get: (url: string) =>
    request(url, { method: "GET" }),

  post: (url: string, data?: any) =>
    request(url, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: (url: string, data?: any) =>
    request(url, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  patch: (url: string, data?: any) =>
    request(url, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (url: string) =>
    request(url, { method: "DELETE" }),
};

export default api;
