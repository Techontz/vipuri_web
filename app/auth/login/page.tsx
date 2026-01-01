"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InputCardField from "@/app/components/InputCardField";
import { AuthService } from "@/services/authService";

// -------------------- TYPES --------------------
type LoginResponse =
  | { success: true; user: any; token: string }
  | { success: false; status?: number; message?: string };

// -------------------- COMPONENT --------------------
interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // -------------------- HANDLE LOGIN --------------------
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Cast so TS understands this structure
    const res = (await AuthService.login(email, password)) as LoginResponse;

    // ✅ If login failed (error object)
    if (!res.success) {
      if (res.status === 403) {
        setError("Your account is pending approval. Please wait for confirmation.");
      } else if (res.status === 401) {
        setError("Incorrect email or password. Try again.");
      } else {
        setError(res.message || "Login failed. Please try again later.");
      }
      setLoading(false);
      return;
    }

      // ✅ On success
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      // 🔴 TELL HEADER LOGIN IS DONE
      onLoginSuccess?.();

      const role = res.user?.role;
      if (role === "vendor") {
        router.push("/vendor/dashboard");
      } else {
        router.push("/");
      }

      setLoading(false);

  }

  // -------------------- UI --------------------
  return (
    <div className="bg-white">
      <div className="w-full max-w-md">
        {/* Logo + Header */}
        <div className="flex flex-col items-center mb-6">
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo b.png`}
          alt="Vipuri Logo"
          className="w-20 h-20 mb-3 object-contain"
        />
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <InputCardField
            label="Email Address"
            placeholder="Type your email"
            value={email}
            onChange={setEmail}
          />
          <InputCardField
            label="Password"
            type="password"
            placeholder="Type your password"
            value={password}
            onChange={setPassword}
          />

          {/* Error Message */}
          {error && (
            <p className="text-red-600 text-sm font-medium mt-1 text-center">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-black font-bold text-[16px] py-3 rounded-xl shadow hover:brightness-105 transition-all mt-4"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center mt-6 text-gray-600 text-[15px]">
          Don’t have an account?{" "}
          <span
            onClick={() => router.push("/auth/register")}
            className="text-yellow-500 font-semibold cursor-pointer"
          >
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
}
