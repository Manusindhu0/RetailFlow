import { CheckCircle2, X, Printer, Share2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/types";

interface InvoicePreviewModalProps {
  transaction: Transaction;
  onClose: () => void;
  onNewBill: () => void;
}

export function InvoicePreviewModal({ transaction, onClose, onNewBill }: InvoicePreviewModalProps) {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Success Header */}
        <div className="bg-green-500/10 border-b border-green-500/20 px-6 py-5 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-foreground">Bill Generated!</h2>
          <p className="text-sm text-muted-foreground mt-1">#{transaction.invoice_number}</p>
        </div>

        {/* Invoice Body */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Customer */}
          {transaction.customer_name && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{transaction.customer_name}</span>
            </div>
          )}

          {/* Items */}
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <div className="bg-secondary/30 px-3 py-2 text-xs font-semibold text-muted-foreground
                            grid grid-cols-[1fr_auto_auto] gap-2">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Amount</span>
            </div>
            {transaction.items.map((item, i) => (
              <div key={i} className="px-3 py-2 border-t border-border/30 grid grid-cols-[1fr_auto_auto] gap-2 text-sm">
                <span className="truncate text-foreground">{item.product_name}</span>
                <span className="text-right text-muted-foreground">×{item.quantity}</span>
                <span className="text-right font-medium">{formatCurrency(item.line_total)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST</span>
                <span className="text-amber-400">{formatCurrency(transaction.tax_amount)}</span>
              </div>
            )}
            {transaction.discount_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-400">-{formatCurrency(transaction.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="font-bold text-base">Total</span>
              <span className="font-bold text-xl text-primary">{formatCurrency(transaction.total_amount)}</span>
            </div>
            {transaction.change_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span className="text-green-400 font-semibold">{formatCurrency(transaction.change_amount)}</span>
              </div>
            )}
          </div>

          {/* Payment modes */}
          {transaction.payments.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Paid via {transaction.payments.map(p => `${p.payment_mode.toUpperCase()} ${formatCurrency(p.amount)}`).join(" + ")}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-border grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border
                       bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={onNewBill}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary
                       hover:bg-primary/90 text-white text-sm font-semibold transition-all
                       active:scale-[0.98] glow-primary"
          >
            <ShoppingBag className="w-4 h-4" />
            New Bill
          </button>
        </div>

        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80
                     flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
