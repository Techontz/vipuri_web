"use client";

import { useState } from "react";
import { X } from "lucide-react";
import LoginPage from "@/app/auth/login/page";
import RegisterPage from "@/app/auth/register/page";

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export default function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-[92%] max-w-md rounded-2xl shadow-2xl z-10 overflow-hidden">
        {/* Close */}
        <button onClick={onClose} className="absolute right-4 top-4">
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-4">
        Hala! Let’s get started
        </h2>

        {/* Tabs Container */}
        <div className="auth-tabs bg-[#3f4451] rounded-[10px] p-1 flex mb-6 mx-6">

        {/* Login */}
        <button
            onClick={() => setTab("login")}
            className={`flex-1 py-3 rounded-[10px] font-semibold text-[16px] transition ${
            tab === "login"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-300"
            }`}
        >
            Log in
        </button>

        {/* Sign up */}
        <button
            onClick={() => setTab("register")}
            className={`flex-1 py-3 rounded-[10px] font-semibold text-[16px] transition ${
            tab === "register"
                ? "bg-white text-gray-900 shadow"
                : "text-gray-300"
            }`}
        >
            Sign up
        </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[85vh] overflow-y-auto">
          {tab === "login" ? (
            <LoginPage
              onLoginSuccess={() => {
                onLoginSuccess?.();
                setTimeout(onClose, 50);
              }}
            />
          ) : (
            <RegisterPage />
          )}
        </div>
      </div>
    </div>
  );
}
