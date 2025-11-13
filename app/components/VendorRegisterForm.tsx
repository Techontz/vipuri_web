"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InputCardField from "./InputCardField";
import { AuthService } from "@/services/authService";
import MapPicker from "./MapPicker";

export default function VendorRegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();

  // ------------------- STATE -------------------
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
  const [leseni, setLeseni] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // ------------------- FILE PICKER -------------------
  function pickFile(callback: (f: File) => void, useCamera = false) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf";
    if (useCamera) input.capture = "environment";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) callback(file);
    };
    input.click();
  }

  // ------------------- SUBMIT -------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.firstName ||
      !form.businessName ||
      !avatar ||
      !leseni ||
      !form.nidaNumber
    ) {
      setError("Please fill all required fields and upload required files.");
      return;
    }

    setLoading(true);
    try {
      // BUILD FORM DATA FOR LARAVEL
      const fd = new FormData();
      fd.append("name", `${form.firstName} ${form.lastName}`);
      fd.append("email", form.email);
      fd.append("password", form.password);
      fd.append("password_confirmation", form.password);
      fd.append("phone", form.phone);
      fd.append("role", "vendor");

      // Vendor fields
      fd.append("business_name", form.businessName);
      fd.append("business_address", form.businessAddress);

      // Files
      fd.append("avatar", avatar);
      fd.append("business_license", leseni);

      // NIDA
      fd.append("nida_number", form.nidaNumber);

      // Optional coordinates
      if (coordinates) {
        fd.append("latitude", String(coordinates.lat));
        fd.append("longitude", String(coordinates.lng));
      }

      const res = await AuthService.registerVendor(fd);
      console.log("✅ Vendor registered:", res);

      setSuccess("Vendor registered successfully!");
      setTimeout(() => router.push("/auth/login"), 1500);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setError(JSON.stringify(err.response.data.errors));
      } else {
        setError(err.response?.data?.message || "Vendor registration failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ------------------- UI -------------------
  return (
    <form onSubmit={handleSubmit}>
      {/* Profile Photo */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer overflow-hidden">
          {avatar ? (
            <img
              src={URL.createObjectURL(avatar)}
              alt="avatar"
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-gray-600 text-sm">📷</span>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => pickFile((f) => setAvatar(f))}
            className="text-yellow-600 text-xs underline"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={() => pickFile((f) => setAvatar(f), true)}
            className="text-green-600 text-xs underline"
          >
            Scan
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-1">Profile photo</p>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-3">
        <InputCardField
          label="First Name *"
          value={form.firstName}
          onChange={(v) => setForm({ ...form, firstName: v })}
        />
        <InputCardField
          label="Last Name *"
          value={form.lastName}
          onChange={(v) => setForm({ ...form, lastName: v })}
        />
      </div>

      <InputCardField
        label="Business Name *"
        value={form.businessName}
        onChange={(v) => setForm({ ...form, businessName: v })}
      />

      {/* Map Picker Trigger */}
      <div className="relative">
        <InputCardField
          label="Business Address *"
          placeholder="Select your business location"
          readOnly
          value={form.businessAddress}
          onChange={(v) => setForm({ ...form, businessAddress: v })}
        />
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="absolute right-3 top-8 text-yellow-600 text-sm underline"
        >
          Pick on Map
        </button>
      </div>

      <InputCardField
        label="Email *"
        type="email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
      />

      <InputCardField
        label="Password *"
        type="password"
        value={form.password}
        onChange={(v) => setForm({ ...form, password: v })}
      />

      <InputCardField
        label="Phone"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
      />

      {/* Documents */}
      <div className="mt-3 space-y-3">
        {/* Business License */}
        <div className="border rounded-lg p-3 flex justify-between items-center bg-white">
          <span className="font-semibold text-sm">
            {leseni ? leseni.name : "Leseni ya Biashara"}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => pickFile((f) => setLeseni(f))}
              className="text-yellow-600 text-sm underline"
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => pickFile((f) => setLeseni(f), true)}
              className="text-green-600 text-sm underline"
            >
              Scan
            </button>
          </div>
        </div>

        <InputCardField
          label="NIDA Number (20 digits) *"
          value={form.nidaNumber}
          onChange={(v) => setForm({ ...form, nidaNumber: v })}
        />
      </div>

      {/* Error & Success */}
      {error && <p className="text-red-600 text-sm mt-2 break-words">{error}</p>}
      {success && <p className="text-green-600 text-sm mt-2">{success}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl mt-4 shadow"
      >
        {loading ? "Submitting..." : "Sign Up as Vendor"}
      </button>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-[90%] max-w-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Select Business Location</h3>

            <MapPicker
              onSelect={(addr, lat, lng) => {
                setForm({ ...form, businessAddress: addr });
                setCoordinates({ lat, lng });
              }}
              initialAddress={form.businessAddress}
            />

            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => setShowMap(false)}
                className="bg-yellow-500 px-4 py-2 rounded text-black font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
