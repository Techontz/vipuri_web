"use client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white text-center p-6">
      <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.png`} alt="Logo" className="w-28 h-28 mb-6" />
      <h1 className="text-2xl font-bold text-gray-900">Welcome to Vipuri</h1>
      <p className="text-gray-500 mt-2 max-w-md">
        Shop smart, fast & direct from Kariakoo vendors.
      </p>
      <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => router.push("/auth/login")}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl shadow hover:brightness-105"
        >
          Sign In
        </button>
        <button
          onClick={() => router.push("/auth/register")}
          className="w-full bg-black text-white font-semibold py-3 rounded-xl shadow hover:bg-gray-900"
        >
          Create Account
        </button>
      </div>
    </main>
  );
}
