"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AccountTypeSwitch from "@/app/components/AccountTypeSwitch";
import CustomerRegisterForm from "@/app/components/CustomerRegisterForm";
import VendorRegisterForm from "@/app/components/VendorRegisterForm";

export default function RegisterPage() {
  const router = useRouter();
  const [isCustomer, setIsCustomer] = useState(true);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="text-green-500 text-5xl mb-2">👤</div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm">Choose your account type</p>
        </div>

        <AccountTypeSwitch isCustomer={isCustomer} setIsCustomer={setIsCustomer} />

        <div className="mt-4">
          {isCustomer ? (
            <CustomerRegisterForm onSuccess={() => router.push("/user")} />
          ) : (
            <VendorRegisterForm onSuccess={() => router.push("/vendor/dashboard")} />
          )}
        </div>

        <p className="text-center mt-6 text-gray-600 text-[15px]">
          Already have an account?{" "}
          <span
            onClick={() => router.push("/auth/login")}
            className="text-yellow-500 font-semibold cursor-pointer"
          >
            Sign In
          </span>
        </p>
      </div>
    </main>
  );
}
