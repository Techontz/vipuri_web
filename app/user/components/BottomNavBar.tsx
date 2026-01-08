"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  Grid,
  Package,
  MessageSquare,
  User,
} from "lucide-react";
import AuthModal from "@/app/auth/AuthModal";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNavBar({ activeTab, setActiveTab }: Props) {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      setIsLoggedIn(false);
      return;
    }

    try {
      const parsed = JSON.parse(user);
      setIsLoggedIn(!!parsed && Object.keys(parsed).length > 0);
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  const tabs = [
    {
      key: "home",
      label: "Home",
      icon: Home,
      path: "/user",
      requiresAuth: false,
    },
    {
      key: "category",
      label: "Category",
      icon: Grid,
      path: "/user/categories",
      requiresAuth: false,
    },
    {
      key: "orders",
      label: "Orders",
      icon: Package,
      path: "/user/orders",
      requiresAuth: true,
    },
    {
      key: "messages",
      label: "Messages",
      icon: MessageSquare,
      path: "/user/messages",
      requiresAuth: true,
    },
    {
      key: "profile",
      label: "Profile",
      icon: User,
      path: "/user/profile",
      requiresAuth: true,
    },
  ];

  const handleTap = (tab: typeof tabs[number]) => {
    if (tab.requiresAuth && !isLoggedIn) {
      setShowLogin(true);
      return;
    }

    setActiveTab(tab.key);
    router.push(tab.path);
  };

  return (
    <>
      {/* ================= BOTTOM NAV ================= */}
      <div
        className="
          md:flex
          fixed bottom-0 left-0
          w-full
          bg-white
          border-t border-gray-200
          flex justify-around py-2
          shadow-md
          z-[9999]
          pb-[env(safe-area-inset-bottom)]
        "
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => handleTap(tab)}
              className={`flex flex-col items-center text-[13px] font-medium transition-all ${
                isActive ? "text-teal-600" : "text-gray-500"
              }`}
            >
              <Icon
                size={22}
                className={`transition-transform duration-200 ${
                  isActive ? "scale-110" : "scale-100"
                }`}
              />
              <span className="mt-1">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= AUTH MODAL ================= */}
      {showLogin && (
        <AuthModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={() => {
            setShowLogin(false);
            setIsLoggedIn(true);
          }}
        />
      )}
    </>
  );
}
