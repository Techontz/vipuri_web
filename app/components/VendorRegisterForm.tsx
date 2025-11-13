"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InputCardField from "./InputCardField";
import { AuthService } from "@/services/authService";
import MapPicker from "./MapPicker";

export default function VendorRegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    businessName: "",
    businessAddress: "",
    email: "",
    password: "",
    phone: "",
    nidaNumber: "",
  });

  const [avatar, setAvatar] = useState<File | null>(null);
  const [businessLicense, setBusinessLicense] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showMap, setShowMap] = useState(false);

  function pickFile(callback: (f: File) => void) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) callback(file);
    };
    input.click();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.firstName || !form.businessName || !avatar || !businessLicense || !form.nidaNumber) {
      setError("Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        avatar,
        businessLicense,
      };

      const res = await AuthService.registerVendor(payload);

      if (res.success) {
        setSuccess("Vendor registered successfully!");
        setTimeout(() => router.push("/auth/login"), 1500);
      } else {
        setError(res.message || "Registration failed.");
      }
    } catch (err) {
      setError("Vendor registration failed.");
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Profile Photo */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          {avatar ? (
            <img src={URL.createObjectURL(avatar)} className="object-cover w-full h-full" />
          ) : (
            <span className="text-gray-600">📷</span>
          )}
        </div>

        <button type="button" className="text-yellow-600 text-xs underline mt-2" onClick={() => pickFile(setAvatar)}>
          Upload Photo
        </button>
      </div>

      {/* Names */}
      <div className="grid grid-cols-2 gap-3">
        <InputCardField label="First Name *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
        <InputCardField label="Last Name *" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
      </div>

      {/* Business */}
      <InputCardField label="Business Name *" value={form.businessName} onChange={(v) => setForm({ ...form, businessName: v })} />

      {/* Address */}
      <div className="relative">
        <InputCardField
          label="Business Address *"
          readOnly
          value={form.businessAddress}
          placeholder="Select business location"
          onChange={(v) => setForm({ ...form, businessAddress: v })}
        />
        <button
          type="button"
          className="absolute right-3 top-8 text-yellow-600 text-sm underline"
          onClick={() => setShowMap(true)}
        >
          Pick on Map
        </button>
      </div>

      {/* Email & Password */}
      <InputCardField label="Email *" value={form.email} type="email" onChange={(v) => setForm({ ...form, email: v })} />
      <InputCardField label="Password *" value={form.password} type="password" onChange={(v) => setForm({ ...form, password: v })} />

      {/* Phone */}
      <InputCardField label="Phone *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />

      {/* Business License */}
      <div className="border p-3 rounded bg-white flex justify-between items-center mt-4">
        <span className="font-semibold text-sm">
          {businessLicense ? businessLicense.name : "Business License *"}
        </span>
        <button type="button" className="text-yellow-600 text-sm underline" onClick={() => pickFile(setBusinessLicense)}>
          Upload
        </button>
      </div>

      {/* NIDA NUMBER (COMPULSORY) */}
      <InputCardField
        label="NIDA Number (20 digits) *"
        value={form.nidaNumber}
        onChange={(v) => setForm({ ...form, nidaNumber: v })}
      />

      {/* Errors */}
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {success && <p className="text-green-600 text-sm mt-2">{success}</p>}

      {/* Submit */}
      <button type="submit" disabled={loading} className="w-full bg-yellow-400 py-3 rounded-lg mt-4 font-bold text-black">
        {loading ? "Submitting..." : "Sign Up as Vendor"}
      </button>

      {/* Map */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
          <div className="bg-white rounded-xl p-4 w-[90%]">
            <h3 className="font-bold mb-2">Select Business Location</h3>
            <MapPicker
              initialAddress={form.businessAddress}
              onSelect={(addr) => setForm({ ...form, businessAddress: addr })}
            />
            <button className="w-full bg-yellow-500 mt-3 py-2 rounded font-bold" onClick={() => setShowMap(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
