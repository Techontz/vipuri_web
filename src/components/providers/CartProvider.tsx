'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { ApiError, api, apiWithMessage } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useMounted } from '@/lib/useMounted';
import type { CartItem, CartSummary, ProductCard } from '@/types';

const EMPTY_SUMMARY: CartSummary = {
  cart_count: 0,
  total_items: 0,
  subtotal: 0,
  total_tax: 0,
  total_offer_discount: 0,
  discount: 0,
  coupon: null,
  shipping_rate_id: null,
  shipping_method_id: null,
  shipping_charge: 0,
  branch_id: null,
  payable: 0,
};

type CartState = {
  items: CartItem[];
  summary: CartSummary;
  wishlist: { id: number; product: ProductCard }[];
  wishlistCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  addToCart: (
    slug: string,
    options?: { quantity?: number; attributeValues?: number[]; single?: boolean },
  ) => Promise<{ requiresOptions: boolean; productSlug?: string }>;
  updateQuantity: (id: number, quantity: number) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => Promise<void>;
  chooseShippingRate: (rateId: number) => Promise<void>;
  chooseBranch: (branchId: number | null) => Promise<void>;
  toggleWishlist: (productId: number) => Promise<void>;
  isWishlisted: (productId: number) => boolean;
};

const CartContext = createContext<CartState | null>(null);

export function useCart(): CartState {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>(EMPTY_SUMMARY);
  const [wishlist, setWishlist] = useState<{ id: number; product: ProductCard }[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useMounted();

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ items: CartItem[]; summary: CartSummary }>('/cart', {
        cart: true,
        auth: 'user',
      });

      if (!mounted()) return;

      setItems(data.items ?? []);
      setSummary(data.summary ?? EMPTY_SUMMARY);
    } catch {
      if (!mounted()) return;

      setItems([]);
      setSummary(EMPTY_SUMMARY);
    } finally {
      if (mounted()) setLoading(false);
    }
  }, [mounted]);

  const refreshWishlist = useCallback(async () => {
    try {
      const data = await api<{ items: { id: number; product: ProductCard }[]; count: number }>('/wishlist', {
        cart: true,
        auth: 'user',
      });

      if (mounted()) setWishlist(data.items ?? []);
    } catch {
      if (mounted()) setWishlist([]);
    }
  }, [mounted]);

  // Reload after the auth state settles so a fresh login picks up the merged cart.
  useEffect(() => {
    if (authLoading) return;
    void refresh();
    void refreshWishlist();
  }, [authLoading, isAuthenticated, refresh, refreshWishlist]);

  const addToCart = useCallback<CartState['addToCart']>(
    async (slug, options = {}) => {
      try {
        const { data, message } = await apiWithMessage<{
          requires_options?: boolean;
          product_slug?: string;
          cart_count?: number;
          summary?: CartSummary;
        }>(`/cart/add/${encodeURIComponent(slug)}`, {
          method: 'POST',
          cart: true,
          auth: 'user',
          body: {
            quantity: options.quantity ?? 1,
            attribute_values: options.attributeValues ?? [],
            single: options.single ?? false,
          },
        });

        if (data.requires_options) {
          return { requiresOptions: true, productSlug: data.product_slug };
        }

        toastSuccess(message);
        await refresh();

        return { requiresOptions: false };
      } catch (error) {
        toastError(error instanceof ApiError ? error.message : 'Could not add this product to your cart');
        return { requiresOptions: false };
      }
    },
    [refresh],
  );

  const updateQuantity = useCallback<CartState['updateQuantity']>(
    async (id, quantity) => {
      try {
        const data = await api<{ items: CartItem[]; summary: CartSummary }>('/cart/update', {
          method: 'POST',
          cart: true,
          auth: 'user',
          body: { id, quantity },
        });
        setItems(data.items ?? []);
        setSummary(data.summary ?? EMPTY_SUMMARY);
      } catch (error) {
        toastError(error instanceof ApiError ? error.message : 'Could not update the quantity');
        await refresh();
      }
    },
    [refresh],
  );

  const removeItem = useCallback<CartState['removeItem']>(
    async (id) => {
      try {
        const { data, message } = await apiWithMessage<{ items: CartItem[]; summary: CartSummary }>(
          '/cart/remove',
          { method: 'POST', cart: true, auth: 'user', body: { id } },
        );
        setItems(data.items ?? []);
        setSummary(data.summary ?? EMPTY_SUMMARY);
        toastSuccess(message);
      } catch (error) {
        toastError(error instanceof ApiError ? error.message : 'Could not remove this item');
      }
    },
    [],
  );

  const applyCoupon = useCallback<CartState['applyCoupon']>(async (code) => {
    try {
      const { data, message } = await apiWithMessage<{ summary: CartSummary }>('/cart/coupon', {
        method: 'POST',
        cart: true,
        auth: 'user',
        body: { code },
      });
      setSummary(data.summary ?? EMPTY_SUMMARY);
      toastSuccess(message);
      return true;
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'This coupon could not be applied');
      return false;
    }
  }, []);

  const removeCoupon = useCallback<CartState['removeCoupon']>(async () => {
    try {
      const { data, message } = await apiWithMessage<{ summary: CartSummary }>('/cart/coupon', {
        method: 'DELETE',
        cart: true,
        auth: 'user',
      });
      setSummary(data.summary ?? EMPTY_SUMMARY);
      toastSuccess(message);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not remove the coupon');
    }
  }, []);

  const chooseShippingRate = useCallback<CartState['chooseShippingRate']>(async (rateId) => {
    try {
      const data = await api<{ summary: CartSummary }>('/cart/shipping-rate', {
        method: 'POST',
        cart: true,
        auth: 'user',
        body: { shipping_rate_id: rateId },
      });
      setSummary(data.summary ?? EMPTY_SUMMARY);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not select that delivery option');
    }
  }, []);

  const chooseBranch = useCallback<CartState['chooseBranch']>(async (branchId) => {
    try {
      const data = await api<{ summary: CartSummary }>('/cart/branch', {
        method: 'POST',
        cart: true,
        auth: 'user',
        body: { branch_id: branchId },
      });
      setSummary(data.summary ?? EMPTY_SUMMARY);
    } catch (error) {
      toastError(error instanceof ApiError ? error.message : 'Could not select that branch');
    }
  }, []);

  const isWishlisted = useCallback(
    (productId: number) => wishlist.some((row) => row.product?.id === productId),
    [wishlist],
  );

  const toggleWishlist = useCallback<CartState['toggleWishlist']>(
    async (productId) => {
      const existing = wishlist.find((row) => row.product?.id === productId);

      try {
        if (existing) {
          const { message } = await apiWithMessage('/wishlist/remove', {
            method: 'POST',
            cart: true,
            auth: 'user',
            body: { product_id: productId },
          });
          toastSuccess(message);
        } else {
          const { message } = await apiWithMessage(`/wishlist/add/${productId}`, {
            method: 'POST',
            cart: true,
            auth: 'user',
          });
          toastSuccess(message);
        }

        await refreshWishlist();
      } catch (error) {
        toastError(error instanceof ApiError ? error.message : 'Could not update your wishlist');
      }
    },
    [wishlist, refreshWishlist],
  );

  const value = useMemo<CartState>(
    () => ({
      items,
      summary,
      wishlist,
      wishlistCount: wishlist.length,
      loading,
      refresh,
      refreshWishlist,
      addToCart,
      updateQuantity,
      removeItem,
      applyCoupon,
      removeCoupon,
      chooseShippingRate,
      chooseBranch,
      toggleWishlist,
      isWishlisted,
    }),
    [
      items,
      summary,
      wishlist,
      loading,
      refresh,
      refreshWishlist,
      addToCart,
      updateQuantity,
      removeItem,
      applyCoupon,
      removeCoupon,
      chooseShippingRate,
      chooseBranch,
      toggleWishlist,
      isWishlisted,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
