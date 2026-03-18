import { create } from "zustand";
import type { CartItem, Product, PaymentMode } from "@/types";

export interface PaymentSplit {
  mode: PaymentMode;
  amount: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  customerId?: number;
  customerName?: string;
  paymentSplits: PaymentSplit[];
  activePaymentMode: PaymentMode;

  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  updateItemDiscount: (productId: number, discount: number) => void;
  setDiscount: (discount: number) => void;
  setCustomer: (id?: number, name?: string) => void;
  setActivePaymentMode: (mode: PaymentMode) => void;
  setPaymentSplit: (mode: PaymentMode, amount: number) => void;
  clearPaymentSplits: () => void;
  clearCart: () => void;

  // Derived
  subtotal: () => number;
  taxBreakdown: () => { rate: number; taxable: number; tax: number }[];
  totalTax: () => number;
  total: () => number;
  balanceDue: () => number;
  totalPaid: () => number;
  changeAmount: () => number;
}

function calcLineTotal(price: number, qty: number, discount: number): number {
  return Math.max(0, (price - discount) * qty);
}

function calcTax(price: number, qty: number, discount: number, gstRate: number): number {
  const base = Math.max(0, (price - discount) * qty);
  return base * (gstRate / 100);
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  customerId: undefined,
  customerName: undefined,
  paymentSplits: [],
  activePaymentMode: "cash",

  addItem: (product: Product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  discount_amount: i.discount_value * (i.quantity + 1),
                  tax_amount: calcTax(product.sale_price, i.quantity + 1, i.discount_value, product.gst_rate),
                  line_total: calcLineTotal(product.sale_price, i.quantity + 1, i.discount_value),
                }
              : i
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            product,
            quantity: 1,
            discount_type: "flat" as const,
            discount_value: 0,
            discount_amount: 0,
            tax_amount: 0,
            line_total: product.sale_price,
          },
        ],
      };
    });
  },

  removeItem: (productId: number) =>
    set((state) => ({ items: state.items.filter((i) => i.product.id !== productId) })),

  updateQuantity: (productId: number, quantity: number) => {
    if (quantity < 0) return;
    set((state) => ({
      items: state.items
        .map((i) => {
          if (i.product.id !== productId) return i;
          const qty = Math.max(1, quantity);
          return {
            ...i,
            quantity: qty,
            discount_amount: i.discount_value * qty,
            tax_amount: calcTax(i.product.sale_price, qty, i.discount_value, i.product.gst_rate),
            line_total: calcLineTotal(i.product.sale_price, qty, i.discount_value),
          };
        })
        .filter((i) => i.quantity > 0),
    }));
  },

  updateItemDiscount: (productId: number, discount: number) =>
    set((state) => ({
      items: state.items.map((i) => {
        if (i.product.id !== productId) return i;
        const dv = Math.max(0, Math.min(discount, i.product.sale_price));
        return {
          ...i,
          discount_value: dv,
          discount_amount: dv * i.quantity,
          tax_amount: calcTax(i.product.sale_price, i.quantity, dv, i.product.gst_rate),
          line_total: calcLineTotal(i.product.sale_price, i.quantity, dv),
        };
      }),
    })),

  setDiscount: (discount: number) => set({ discount }),
  setCustomer: (id, name) => set({ customerId: id, customerName: name }),

  setActivePaymentMode: (mode: PaymentMode) => set({ activePaymentMode: mode }),

  setPaymentSplit: (mode: PaymentMode, amount: number) =>
    set((state) => {
      const existing = state.paymentSplits.find((p) => p.mode === mode);
      if (existing) {
        return {
          paymentSplits: state.paymentSplits.map((p) =>
            p.mode === mode ? { ...p, amount } : p
          ),
        };
      }
      return { paymentSplits: [...state.paymentSplits, { mode, amount }] };
    }),

  clearPaymentSplits: () => set({ paymentSplits: [] }),

  clearCart: () =>
    set({
      items: [],
      discount: 0,
      customerId: undefined,
      customerName: undefined,
      paymentSplits: [],
      activePaymentMode: "cash",
    }),

  subtotal: () => get().items.reduce((acc, i) => acc + i.line_total, 0),

  taxBreakdown: () => {
    const byRate = new Map<number, { taxable: number; tax: number }>();
    for (const item of get().items) {
      const rate = item.product.gst_rate ?? 0;
      const taxable = item.line_total;
      const tax = item.tax_amount;
      const existing = byRate.get(rate) ?? { taxable: 0, tax: 0 };
      byRate.set(rate, { taxable: existing.taxable + taxable, tax: existing.tax + tax });
    }
    return Array.from(byRate.entries())
      .map(([rate, val]) => ({ rate, ...val }))
      .filter((r) => r.rate > 0)
      .sort((a, b) => a.rate - b.rate);
  },

  totalTax: () => get().items.reduce((acc, i) => acc + i.tax_amount, 0),

  total: () => {
    const s = get().subtotal();
    const t = get().totalTax();
    return Math.max(0, s + t - get().discount);
  },

  totalPaid: () => get().paymentSplits.reduce((acc, p) => acc + p.amount, 0),

  balanceDue: () => Math.max(0, get().total() - get().totalPaid()),

  changeAmount: () => Math.max(0, get().totalPaid() - get().total()),
}));
