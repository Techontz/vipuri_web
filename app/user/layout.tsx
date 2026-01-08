"use client";

import Header from "./components/Header";
import Footer from "./components/Footer";
import BottomNavBar from "./components/BottomNavBar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* HEADER */}
      <Header />

      {/* PAGE CONTENT */}
      <main className="pb-24">{children}</main>

      {/* BOTTOM NAV — MOBILE ONLY */}
      <BottomNavBar activeTab="home" setActiveTab={() => {}} />

      {/* FOOTER — ALL SCREENS */}
      <Footer />
    </div>
  );
}
