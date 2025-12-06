import { create } from "zustand";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

export const useCartStore = create((set, get) => ({
  cart: [],
  coupon: null,
  total: 0,
  subtotal: 0,
  isCouponApplied: false,

  setCart: (items) => set({ cart: Array.isArray(items) ? items : [] }),

  getMyCoupon: async () => {
    try {
      const response = await axios.get("/coupons");
      set({ coupon: response?.data ?? null });
    } catch (error) {
      console.error("Error fetching coupon:", error);
    }
  },

  applyCoupon: async (code) => {
    try {
      const response = await axios.post("/coupons/validate", { code });
      set({ coupon: response?.data ?? null, isCouponApplied: true });
      get().calculateTotals();
      toast.success("Coupon applied successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to apply coupon");
    }
  },

  removeCoupon: () => {
    set({ coupon: null, isCouponApplied: false });
    get().calculateTotals();
    toast.success("Coupon removed");
  },

  getCartItems: async () => {
    try {
      const res = await axios.get("/cart/products");
      const payload = res?.data ?? res ?? [];
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.items)
        ? payload.items
        : [];

      const normalized = items.map((it) => ({
        _id: it._id ?? it.id ?? null,
        name: it.name ?? it.title ?? "",
        description: it.description ?? "",
        image: it.image ?? (it.images && it.images[0]) ?? "",
        price: Number(it.price) || Number(it.cost) || 0,
        quantity: Number(it.quantity) || 1,
        raw: it,
      }));

      set({ cart: normalized });
      get().calculateTotals();
      return normalized;
    } catch (error) {
      set({ cart: [] });
      toast.error(error?.response?.data?.message || "Failed to load cart");
      return [];
    }
  },

  clearCart: async () => {
    set({ cart: [], coupon: null, total: 0, subtotal: 0 });
  },

  addToCart: async (product) => {
    try {
      await axios.post("/cart/add", { productId: product._id });
      toast.success("Product added to cart");

      set((prev) => {
        const existing = prev.cart.find((i) => i._id === product._id);
        const newCart = existing
          ? prev.cart.map((i) => (i._id === product._id ? { ...i, quantity: Number(i.quantity || 0) + 1 } : i))
          : [...prev.cart, { ...product, quantity: 1 }];
        return { cart: newCart };
      });

      get().calculateTotals();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add to cart");
    }
  },

  removeFromCart: async (productId) => {
    try {
      await axios.post("/cart/remove", { productId });
    } catch (err) {
      // fallback: still update local state
      console.error("removeFromCart request failed:", err);
    } finally {
      set((prev) => ({ cart: prev.cart.filter((item) => String(item._id) !== String(productId)) }));
      get().calculateTotals();
    }
  },

  updateQuantity: async (productId, quantity) => {
    try {
      const q = Number(quantity);
      if (q <= 0) {
        await get().removeFromCart(productId);
        return;
      }
      await axios.patch(`/cart/${productId}/quantity`, { quantity: q });
      set((prev) => ({
        cart: prev.cart.map((item) => (String(item._id) === String(productId) ? { ...item, quantity: q } : item)),
      }));
      get().calculateTotals();
    } catch (error) {
      console.error("updateQuantity error:", error);
      toast.error(error?.response?.data?.message || "Failed to update quantity");
    }
  },

  calculateTotals: () => {
    const { cart, coupon } = get();
    const subtotal = (Array.isArray(cart) ? cart : []).reduce((sum, item) => {
      const price = Number(item?.price) || 0;
      const qty = Number(item?.quantity) || 0;
      return sum + price * qty;
    }, 0);

    let total = subtotal;
    if (coupon && typeof coupon.discountPercentage === "number") {
      const discount = subtotal * (coupon.discountPercentage / 100);
      total = subtotal - discount;
    }

    set({ subtotal: Number(subtotal.toFixed(2)), total: Number(total.toFixed(2)) });
  },
}));

// DEBUG - remove after use
(function () {
  const origMap = Array.prototype.map;
  Array.prototype.map = function (...args) {
    if (!Array.isArray(this)) {
      // show the value and a stack trace to map the error to your source file
      // eslint-disable-next-line no-console
      console.error("DEBUG: map called on non-array:", this, new Error().stack);
      return [];
    }
    return origMap.apply(this, args);
  };
})();


export default useCartStore;
