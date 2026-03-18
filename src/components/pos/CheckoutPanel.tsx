import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, X, ChevronRight, TriangleAlert, IndianRupee,
  User
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { createTransaction } from "@/lib/tauri";
import { formatCurrency } from "@/lib/utils";
import { PaymentButtons } from "./PaymentButtons";
import type { PaymentMode, Transaction, CreateTransactionInput } from "@/types";

interface CheckoutPanelProps {
  onSuccess: (txn: Transaction) => void;
}

export function CheckoutPanel({ onSuccess }: CheckoutPanelProps) {
  const cart = useCartStore();
  const qc = useQueryClient();
  const [cashReceived, setCashReceived] = useState("");
  const [splitAmounts, setSplitAmounts] = useState<Partial<Record<PaymentMode, string>>>({});

  const subtotal = cart.subtotal();
  const totalTax = cart.totalTax();
  const discount = cart.discount;
  const total = cart.total();
  const taxBreakdown = cart.taxBreakdown();
  const change = cart.activePaymentMode === "cash"
    ? Math.max(0, parseFloat(cashReceived || "0") - total)
    : 0;

  const mutation = useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: (txn) => {
      qc.invalidateQueries({ queryKey: ["today-summary"] });
      qc.invalidateQueries({ queryKey: ["recent-transactions"] });
      onSuccess(txn as Transaction);
    },
  });

  const handleCharge = () => {
    if (cart.items.length === 0) return;

    const payments: CreateTransactionInput["payments"] = [];

    if (cart.activePaymentMode === "cash") {
      payments.push({ payment_mode: "cash", amount: parseFloat(cashReceived || String(total)) });
    } else {
      // Build splits from splitAmounts — any mode with an amount > 0
      const modes: PaymentMode[] = ["cash", "upi", "card", "credit"];
      for (const m of modes) {
        const amt = parseFloat(splitAmounts[m] || "0");
        if (amt > 0) payments.push({ payment_mode: m, amount: amt });
      }
      if (payments.length === 0) {
        payments.push({ payment_mode: cart.activePaymentMode, amount: total });
      }
    }

    const input: CreateTransactionInput = {
      transaction_type: "sale",
      customer_id: cart.customerId,
      discount_amount: discount,
      payments,
      items: cart.items.map((i) => ({
        product_id: i.product.id,
        product_name: i.product.name,
        barcode: i.product.barcode,
        quantity: i.quantity,
        unit: i.product.unit,
        sale_price: i.product.sale_price,
        cost_price: i.product.cost_price,
        mrp: i.product.mrp,
        discount_type: i.discount_type,
        discount_value: i.discount_value,
        gst_rate: i.product.gst_rate,
      })),
    };

    mutation.mutate(input);
  };

  return (
    <div className="w-80 flex flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary" />
          Bill Summary
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-5">
        {/* Customer row */}
        <div className="flex items-center gap-2 p-2.5 bg-secondary/30 rounded-xl border border-border/50">
          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground font-medium flex-1 truncate">
            {cart.customerName || "Walk-in Customer"}
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </div>

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({cart.items.length} items)</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          {/* GST breakdown per rate */}
          {taxBreakdown.map((row) => (
            <div key={row.rate} className="flex justify-between text-xs">
              <span className="text-amber-400/80">GST @ {row.rate}%</span>
              <span className="text-amber-400">{formatCurrency(row.tax)}</span>
            </div>
          ))}

          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-400">Discount</span>
              <span className="text-green-400">-{formatCurrency(discount)}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">TOTAL AMOUNT</p>
          <p className="text-4xl font-black text-primary tracking-tight">
            {formatCurrency(total)}
          </p>
          {totalTax > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Incl. GST {formatCurrency(totalTax)}
            </p>
          )}
        </div>

        {/* Bill-level discount */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground  mb-1.5 block uppercase tracking-wide">
            Bill Discount (₹)
          </label>
          <input
            type="number"
            min="0"
            max={subtotal}
            value={cart.discount || ""}
            onChange={(e) => cart.setDiscount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm
                       focus:outline-none focus:border-primary/60 transition-colors"
            placeholder="0.00"
          />
        </div>

        {/* Payment Buttons */}
        <PaymentButtons onModeSelect={(mode) => {
          cart.setActivePaymentMode(mode);
        }} />

        {/* Cash received input */}
        {cart.activePaymentMode === "cash" && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">
              Cash Received (₹)
            </label>
            <input
              type="number"
              min={total}
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm
                         focus:outline-none focus:border-primary/60 transition-colors"
              placeholder={formatCurrency(total)}
            />
            {/* Quick cash amounts */}
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50,
                Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCashReceived(String(amt))}
                  className="py-1.5 rounded-lg bg-secondary/70 hover:bg-primary/20 hover:text-primary
                             text-xs font-medium transition-colors border border-border/50"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            {change > 0 && (
              <div className="mt-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-sm font-bold text-green-400 text-center">
                  Change: {formatCurrency(change)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Checkout Button Area */}
      <div className="p-5 border-t border-border space-y-2">
        {mutation.isError && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
            <TriangleAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{String(mutation.error)}</p>
          </div>
        )}

        <button
          disabled={cart.items.length === 0 || mutation.isPending}
          onClick={handleCharge}
          className="w-full py-4 bg-primary hover:bg-primary/90 disabled:opacity-40
                     disabled:cursor-not-allowed text-white font-bold text-base rounded-xl
                     flex items-center justify-center gap-2 transition-all active:scale-[0.98] glow-primary"
        >
          {mutation.isPending ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          {mutation.isPending ? "Processing..." : `Charge ${formatCurrency(total)}`}
        </button>

        {cart.items.length > 0 && (
          <button
            onClick={() => cart.clearCart()}
            className="w-full py-2.5 text-xs text-muted-foreground hover:text-red-400
                       flex items-center justify-center gap-1.5 rounded-xl border border-transparent
                       hover:border-red-500/20 hover:bg-red-500/5 transition-all"
          >
            <X className="w-3.5 h-3.5" /> Clear Cart
            <kbd className="kbd-badge ml-1">ESC</kbd>
          </button>
        )}
      </div>
    </div>
  );
}
