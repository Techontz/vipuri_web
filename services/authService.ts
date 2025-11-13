import { api } from "@/lib/api";

export const AuthService = {
  // -------------------- CUSTOMER REGISTRATION --------------------
  async registerCustomer(form: any) {
    try {
      const payload = {
        name: `${form.firstName} ${form.lastName}`,
        email: form.email,
        phone: form.phone,
        password: form.password,
        password_confirmation: form.password,
        role: "user",
        address: form.address,
      };

      const { data } = await api.post("/register", payload);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      return { success: true, user: data.user, token: data.token };
    } catch (error: any) {
      return handleError(error);
    }
  },

  // -------------------- VENDOR REGISTRATION --------------------
  async registerVendor(form: any) {
    try {
      const fd = new FormData();

      // BASIC DETAILS
      fd.append("name", `${form.firstName} ${form.lastName}`);
      fd.append("email", form.email);
      fd.append("phone", form.phone);
      fd.append("password", form.password);
      fd.append("password_confirmation", form.password);
      fd.append("role", "vendor");

      // BUSINESS DETAILS
      fd.append("business_name", form.businessName);
      fd.append("business_address", form.businessAddress);

      // FILES
      if (form.avatar) {
        fd.append("avatar", form.avatar);
      }

      if (form.businessLicense) {
        fd.append("business_license", form.businessLicense);
      }

      if (form.nidaDocument) {
        fd.append("nida_document", form.nidaDocument);
      }

      // NIDA NUMBER
      if (form.nidaNumber) {
        fd.append("nida_number", form.nidaNumber);
      }

      const response = await api.post("/register", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return {
        success: true,
        message: response.data.message,
        vendor: response.data.user.vendor,
      };
    } catch (error: any) {
      return handleError(error);
    }
  },

  // -------------------- LOGIN --------------------
  async login(email: string, password: string) {
    try {
      const { data } = await api.post("/login", { email, password });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      return { success: true, user: data.user, token: data.token };
    } catch (error: any) {
      return handleError(error);
    }
  },

  // -------------------- LOGOUT --------------------
  async logout() {
    try {
      await api.post("/logout");
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    return { success: true, message: "Logged out" };
  },

  // -------------------- GET CURRENT USER --------------------
  getCurrentUser() {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    }
    return null;
  },
};

// -------------------- ERROR HANDLER --------------------
function handleError(error: any) {
  if (error.response) {
    return {
      success: false,
      status: error.response.status,
      message:
        error.response.data?.message || "Something went wrong. Try again.",
    };
  }

  if (error.request) {
    return {
      success: false,
      status: 0,
      message: "Server unreachable. Check your internet.",
    };
  }

  return {
    success: false,
    status: 0,
    message: "Unexpected error occurred.",
  };
}
