import { useState, useRef } from "react";
import {
  CheckCircle2, X, Printer, ShoppingBag,
  MessageCircle, FileText, Smartphone, Phone
} from "lucide-react";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import type { Transaction } from "@/types";
import "@/styles/print.css";

interface InvoicePreviewModalProps {
  transaction: Transaction;
  onClose: () => void;
  onNewBill: () => void;
}

type PrintMode = "thermal" | "a4";

// Build plain-text invoice for WhatsApp
function buildWhatsAppText(txn: Transaction): string {
  const shopName = "RetailFlow POS";
  const lines = [
    `🧾 *${shopName}*`,
    `Invoice: #${txn.invoice_number}`,
    `Date: ${new Date().toLocaleDateString("en-IN")}`,
    "",
    "*Items:*",
    ...txn.items.map(
      (i) => `• ${i.product_name} ×${i.quantity} = ${formatCurrency(i.line_total)}`
    ),
    "",
    `Subtotal: ${formatCurrency(txn.subtotal)}`,
    txn.tax_amount > 0 ? `GST: ${formatCurrency(txn.tax_amount)}` : "",
    txn.discount_amount > 0 ? `Discount: -${formatCurrency(txn.discount_amount)}` : "",
    `*Total: ${formatCurrency(txn.total_amount)}*`,
    txn.paid_amount > 0
      ? `Paid via: ${txn.payments.map((p) => `${p.payment_mode.toUpperCase()} ${formatCurrency(p.amount)}`).join(" + ")}`
      : "",
    txn.balance_due > 0 ? `*Outstanding (Udhar): ${formatCurrency(txn.balance_due)}*` : "",
    txn.change_amount > 0 ? `Change: ${formatCurrency(txn.change_amount)}` : "",
    "",
    "Thank you for shopping with us! 🙏",
  ].filter((l) => l !== null && l !== undefined && l !== "");

  return lines.join("\n");
}

function buildReceiptHTML(txn: Transaction, mode: PrintMode): string {
  const items = txn.items.map(
    (i) =>
      `<tr>
        <td>${i.product_name}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">${formatCurrency(i.line_total)}</td>
      </tr>`
  ).join("");

  return `
    <div class="receipt-wrapper">
      <div class="receipt-logo">RETAILFLOW</div>
      <div class="receipt-shop-info">
        Tax Invoice · #${txn.invoice_number}<br/>
        ${new Date().toLocaleString("en-IN")}
        ${txn.customer_name ? `<br/>Customer: ${txn.customer_name}` : ""}
      </div>
      <hr class="receipt-divider"/>
      <table>
        <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Amt</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
      <hr class="receipt-divider"/>
      <div class="receipt-row"><span>Subtotal</span><span>${formatCurrency(txn.subtotal)}</span></div>
      ${txn.tax_amount > 0 ? `<div class="receipt-row"><span>GST</span><span>${formatCurrency(txn.tax_amount)}</span></div>` : ""}
      ${txn.discount_amount > 0 ? `<div class="receipt-row"><span>Discount</span><span>-${formatCurrency(txn.discount_amount)}</span></div>` : ""}
      <div class="receipt-row total"><span>TOTAL</span><span>${formatCurrency(txn.total_amount)}</span></div>
      ${txn.change_amount > 0 ? `<div class="receipt-row"><span>Change</span><span>${formatCurrency(txn.change_amount)}</span></div>` : ""}
      ${txn.balance_due > 0 ? `<hr class="receipt-divider"/><div style="text-align:center;font-weight:bold;margin-top:4px;font-size:12px">Outstanding (Udhar): <br/>${formatCurrency(txn.balance_due)}</div>` : ""}
      ${txn.paid_amount > 0 ? `<hr class="receipt-divider"/><div style="text-align:center;font-size:9px">Paid: ${txn.payments.map((p) => `${p.payment_mode.toUpperCase()} ${formatCurrency(p.amount)}`).join(" + ")}</div>` : ""}
      <hr class="receipt-divider"/>
      <div class="receipt-footer">Thank you for your purchase!<br/>RetailFlow POS</div>
    </div>
  `;
}

export function InvoicePreviewModal({ transaction, onClose, onNewBill }: InvoicePreviewModalProps) {
  const [printMode, setPrintMode] = useState<PrintMode>("thermal");
  const printRootRef = useRef<HTMLDivElement | null>(null);

  // WhatsApp specific state
  const [waPrompt, setWaPrompt] = useState(false);
  const [waPhone, setWaPhone] = useState("");

  const handlePrint = (mode: PrintMode) => {
    setPrintMode(mode);

    // Create / update hidden print root
    let root = document.getElementById("print-root") as HTMLDivElement | null;
    if (!root) {
      root = document.createElement("div");
      root.id = "print-root";
      document.body.appendChild(root);
    }
    root.className = `mode-${mode}`;
    root.innerHTML = buildReceiptHTML(transaction, mode);

    window.print();

    // Clean up after printing
    setTimeout(() => { root!.innerHTML = ""; }, 1000);
  };

  const handleWhatsApp = async () => {
    const defaultPhone = useCartStore.getState().customerPhone;
    const phoneToUse = waPrompt ? waPhone : defaultPhone;
    const cleanPhone = phoneToUse ? phoneToUse.replace(/\D/g, '') : '';

    if (!cleanPhone) {
      // Require phone input
      setWaPrompt(true);
      return;
    }

    const text = encodeURIComponent(buildWhatsAppText(transaction));
    const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${text}`;
    const webUrl = `https://wa.me/${cleanPhone}?text=${text}`;
    
    try {
      // Try native Desktop app first
      await openUrl(appUrl);
      setWaPrompt(false);
    } catch (err) {
      console.log("Native WhatsApp app not found or failed, falling back to web:", err);
      try {
        // Fallback to web link via Tauri shell
        await openUrl(webUrl);
        setWaPrompt(false);
      } catch (fallbackErr) {
        // Ultimate fallback via browser window
        window.open(webUrl, "_blank");
      }
    }
  };

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
        <div className="px-6 py-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {transaction.customer_name && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{transaction.customer_name}</span>
            </div>
          )}

          {/* Items */}
          <div className="border border-border/50 rounded-xl overflow-hidden">
            <div className="bg-secondary/30 px-3 py-2 text-xs font-semibold text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-2">
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
            {transaction.balance_due > 0 && (
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="font-bold text-base text-red-500">Outstanding (Udhar)</span>
                <span className="font-bold text-xl text-red-500">{formatCurrency(transaction.balance_due)}</span>
              </div>
            )}
            {transaction.change_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Change</span>
                <span className="text-green-400 font-semibold">{formatCurrency(transaction.change_amount)}</span>
              </div>
            )}
          </div>

          {transaction.paid_amount > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Paid via {transaction.payments.map((p) => `${p.payment_mode.toUpperCase()} ${formatCurrency(p.amount)}`).join(" + ")}
            </div>
          )}
        </div>

        {/* Print mode selector */}
        <div className="px-6 pt-3">
          <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Print Format</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPrintMode("thermal")}
              className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                printMode === "thermal" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Thermal (80mm)
            </button>
            <button
              onClick={() => setPrintMode("a4")}
              className={`flex items-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                printMode === "a4" ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              A4 Invoice
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 space-y-3">
          {waPrompt ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 animate-fade-in space-y-2 relative">
              <button 
                onClick={() => setWaPrompt(false)}
                className="absolute right-2 top-2 p-1 hover:bg-green-500/20 rounded-full text-green-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <label className="text-xs font-semibold text-green-700 block uppercase tracking-wide">
                WhatsApp Number
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  autoFocus
                  placeholder="e.g. 9876543210"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleWhatsApp()}
                  className="flex-1 px-3 py-2 bg-background border border-green-500/30 rounded-lg text-sm
                             focus:outline-none focus:border-green-500/60"
                />
                <button
                  onClick={handleWhatsApp}
                  disabled={!waPhone.trim()}
                  className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handlePrint(printMode)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 text-green-600 text-xs font-medium transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={onNewBill}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all active:scale-[0.98] glow-primary"
              >
                <ShoppingBag className="w-4 h-4" />
                New Bill
              </button>
            </div>
          )}
        </div>

        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Hidden print root (populated just before window.print()) */}
      <div ref={printRootRef} />
    </div>
  );
}
