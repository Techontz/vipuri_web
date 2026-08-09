/**
 * Shared API types. These mirror the Laravel resources one-for-one so a change
 * on either side shows up as a type error rather than a runtime surprise.
 */

export type ApiEnvelope<T> = {
  remark: string;
  status: 'success' | 'error';
  message: { success?: string[]; error?: string[] };
  data: T;
  errors?: Record<string, string[]>;
};

export type Pagination = {
  current_page: number;
  last_page: number;
  per_page?: number;
  total: number;
  from?: number;
  to?: number;
  has_more?: boolean;
};

/* ------------------------------- Catalogue ------------------------------- */

export type BrandSummary = {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  is_popular?: boolean;
  products_count?: number;
};

export type CategoryNode = {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  show_in_navbar: boolean;
  is_top: boolean;
  is_popular: boolean;
  products_count: number | null;
  meta: { title: string | null; description: string | null; keywords: string | null };
  subcategories: CategoryNode[];
};

export type VehicleFitment = {
  year: number | string | null;
  model: string | null;
  engine: string | null;
  engine_type: string | null;
};

export type ProductCard = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  product_type: 'simple' | 'variable' | 'grouped' | 'external';
  short_description: string | null;
  image: string | null;
  image_full: string | null;
  brand?: BrandSummary | null;
  categories?: { id: number; name: string; slug: string }[];
  regular_price: number;
  price: number;
  discount_percent: number;
  is_on_sale: boolean;
  is_featured: boolean;
  show_deals: boolean;
  limited_stock: boolean;
  avg_rating: number;
  total_reviews: number;
  stock_quantity: number;
  display_stock_quantity: boolean;
  display_available: boolean;
  track_inventory: boolean;
  is_buyable: boolean;
  stock_unit?: string | null;
  min_cart_quantity: number;
  max_cart_quantity: number;
  product_url: string | null;
  button_text: string | null;
  vehicle: VehicleFitment;
};

export type ProductAttributeValue = {
  id: number;
  name: string;
  color_code: string | null;
  image: string | null;
  is_pre_selected: boolean;
};

export type ProductAttribute = {
  id: number;
  name: string;
  control_type: string | null;
  is_visible: boolean;
  values: ProductAttributeValue[];
};

export type ProductVariation = {
  id: number;
  attribute_values: number[];
  name: string;
  sku: string | null;
  regular_price: number;
  sale_price: number;
  price: number;
  is_on_sale: boolean;
  stock_quantity: number;
  display_stock_quantity: boolean;
  display_available: boolean;
  track_inventory: boolean;
  allow_backorder: boolean;
  is_buyable: boolean;
  min_cart_quantity: number;
  max_cart_quantity: number;
  images: { url: string | null; thumb: string | null }[];
};

export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  gtin: string | null;
  product_type: ProductCard['product_type'];
  description: string | null;
  short_description: string | null;
  specifications: { key: string; value: string }[];
  sample_pdf: string | null;
  regular_price: number;
  sale_price: number;
  price: number;
  discount_percent: number;
  is_on_sale: boolean;
  sale_is_scheduled: boolean;
  schedule_sale_start: string | null;
  schedule_sale_end: string | null;
  tax: { name: string; rate: number; status: string | null; show: boolean } | null;
  inventory: {
    track_inventory: boolean;
    stock_quantity: number;
    display_available: boolean;
    display_stock_quantity: boolean;
    min_stock_quantity: number;
    threshold_quantity: number;
    low_stock_activity: number;
    allow_backorder: boolean;
    is_buyable: boolean;
    unit: string | null;
  };
  min_cart_quantity: number;
  max_cart_quantity: number;
  shipping: { weight: number; length: number; width: number; height: number; class: string | null };
  vehicle: VehicleFitment;
  product_url: string | null;
  button_text: string | null;
  brand: BrandSummary | null;
  categories: { id: number; name: string; slug: string }[];
  gallery: { id: number; url: string | null; thumb: string | null; is_main: boolean; variation_id: number; video_link: string | null }[];
  attributes: ProductAttribute[];
  variations: ProductVariation[];
  grouped_products: ProductCard[];
  up_sells: ProductCard[];
  cross_sells: ProductCard[];
  avg_rating: number;
  total_reviews: number;
  rating_breakdown: { rating: number; count: number }[];
  branch_availability?: {
    branch_id: number;
    branch_name: string;
    city: string | null;
    variation_id: number;
    in_stock: boolean;
    quantity: number;
  }[];
  meta: { title: string | null; description: string | null; keywords: string | null };
};

export type ProductReview = {
  id: number;
  rating: number;
  review: string | null;
  images: string[];
  user: { name: string; username: string | null; image: string | null };
  reply: { comment: string; created_at: string } | null;
  created_at: string;
};

/* ---------------------------------- Cart --------------------------------- */

export type CartItem = {
  id: number;
  product_id: number;
  product_name: string | null;
  product_slug: string | null;
  product_image: string | null;
  variation_id: number | null;
  variation_attributes: string | null;
  variations: Record<string, string>;
  category_ids: number[];
  is_on_sale: boolean;
  quantity: number;
  price: number;
  original_price: number;
  offer_discount: number;
  offer_id: number | null;
  tax_name: string | null;
  tax_rate: number;
  tax_amount: number;
  after_tax: number;
  subtotal: number;
  stock_quantity: number;
  max_cart_quantity: number;
  min_cart_quantity: number;
  created_at: string | null;
};

export type CartSummary = {
  cart_count: number;
  total_items: number;
  subtotal: number;
  total_tax: number;
  total_offer_discount: number;
  discount: number;
  coupon: { id: number; code: string; name: string | null; discount_amount: number } | null;
  shipping_rate_id: number | null;
  shipping_method_id: number | null;
  shipping_charge: number;
  branch_id: number | null;
  payable: number;
};

export type ShippingRate = {
  id: number;
  amount: number;
  expected_delivery_days: number;
  is_cod: boolean;
  method: { id: number; name: string; description: string | null; image: string | null };
  zone: { id: number; name: string };
};

/* --------------------------------- Orders -------------------------------- */

export type OrderItem = {
  id: number;
  product_id: number;
  product_name: string | null;
  product_slug: string | null;
  image: string | null;
  sku: string | null;
  variation_id: number;
  variation_label: string | null;
  quantity: number;
  price: number;
  subtotal: number;
  total_tax: number;
};

export type Order = {
  id: number;
  order_number: string;
  status: number;
  status_label: string;
  payment_status: number;
  payment_status_label: string;
  cod: boolean;
  subtotal: number;
  shipping_charge: number;
  total_tax: number;
  discount: number;
  total: number;
  note: string | null;
  cancel_reason: string | null;
  shipping_address: Record<string, string> | null;
  shipping_method?: string | null;
  branch?: { id: number; name: string; code: string; city: string | null; phone: string | null } | null;
  customer?: { id: number; name: string; email: string; mobile: string | null; username: string } | null;
  guest?: { id: number; name: string; email: string; mobile: string | null } | null;
  processed_by?: string | null;
  items?: OrderItem[];
  status_logs?: { id: number; to_status: number; to_status_label: string; actor_name: string | null; remark: string | null; created_at: string }[];
  deposits?: { id: number; trx: string; amount: number; charge: number; final_amount: number; method: string | null; status: number; created_at: string }[];
  created_at: string;
  dispatched_at: string | null;
  delivered_at: string | null;
};

/* ------------------------------- Identity -------------------------------- */

export type Customer = {
  id: number;
  firstname: string | null;
  lastname: string | null;
  fullname: string;
  username: string;
  email: string;
  dial_code: string | null;
  mobile: string | null;
  image: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country_name: string | null;
  country_code: string | null;
  preferred_branch_id: number | null;
  status: boolean;
  ban_reason: string | null;
  email_verified: boolean;
  mobile_verified: boolean;
  profile_complete: boolean;
  orders_count?: number;
  created_at: string;
};

export type StaffMember = {
  id: number;
  name: string;
  email: string;
  username: string;
  dial_code: string | null;
  mobile: string | null;
  image: string | null;
  status: boolean;
  ban_reason: string | null;
  branch: { id: number; name: string; code: string; city: string | null } | null;
  branch_id: number | null;
  role: string | null;
  permissions: string[];
  is_super_admin: boolean;
  last_login_at: string | null;
  created_at: string;
};

export type Branch = {
  id: number;
  name: string;
  code: string;
  slug: string;
  email: string | null;
  dial_code: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  is_default: boolean;
  is_pickup_point: boolean;
  status: boolean;
  opening_hours: Record<string, string> | null;
  staff_count?: number;
  orders_count?: number;
  created_at: string;
};

/* -------------------------------- Site ----------------------------------- */

/**
 * The captcha challenges an administrator has switched on.
 *
 * `recaptcha` carries the public site key so the browser can load Google's
 * widget. `custom` is a freshly drawn six-digit challenge: the SVG is shown to
 * the visitor and `secret` is submitted back alongside whatever they typed.
 */
export type CaptchaConfig = {
  recaptcha: { site_key: string } | null;
  custom: { svg: string; secret: string } | null;
};

export type SiteSettings = {
  site: {
    name: string;
    currency: string;
    currency_symbol: string;
    currency_format: number;
    base_color: string | null;
    secondary_color: string | null;
    registration_enabled: boolean;
    email_verification: boolean;
    mobile_verification: boolean;
    maintenance_mode: boolean;
    has_cod: boolean;
    ai_review_summary: boolean;
    ai_product_chat: boolean;
    paginate_number: number;
    logo: string | null;
    logo_dark: string | null;
    favicon: string | null;
  };
  company: {
    name: string;
    legal_name: string | null;
    email: string | null;
    phone: string | null;
    tin: string | null;
    address: string | null;
    city: string | null;
    region: string | null;
    country_name: string | null;
  } | null;
  contact: Record<string, string> | null;
  footer: Record<string, string> | null;
  footer_payments: { id: number; image: string | null }[];
  page_banner: Record<string, string> | null;
  captcha: CaptchaConfig;
  /** GDPR notice; null when an administrator has switched it off. */
  cookie: { short_desc: string; description: string } | null;
  /** Only present while the shop is closed. */
  maintenance: { description: string; image: string | null } | null;
  /** Provider names an administrator has configured and switched on. */
  social_logins: string[];
  languages: { code: string; name: string; is_default: boolean }[];
  socials: { title?: string; social_icon?: string; url?: string }[];
  pages: { id: number; name: string; slug: string }[];
  policy_pages: { slug: string; title: string }[];
};

export type CmsBlock = Record<string, unknown>;

export type HomePayload = {
  sections: Record<string, CmsBlock | CmsBlock[]>;
  section_order: string[];
  seo: Record<string, unknown> | null;
  popular_categories: { id: number; name: string; slug: string; icon: string | null; image: string | null }[];
  top_categories: { id: number; name: string; slug: string; icon: string | null; image: string | null }[];
  popular_brands: BrandSummary[];
  latest_products: ProductCard[];
  top_deals: ProductCard[];
  limited_stock: ProductCard[];
  featured_products: ProductCard[];
  top_selling: ProductCard[];
};
