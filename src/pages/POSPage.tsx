import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RotateCcw, ShoppingBag, TrendingUp, Receipt, Wallet,
  Plus, Keyboard
} from "lucide-react";

import { useCartStore } from "@/store/cartStore";
import { searchProducts, getTodaySummary } from "@/lib/tauri";
import { formatCurrency, debounce } from "@/lib/utils";

import { BarcodeInput } from "@/components/pos/BarcodeInput";
import { ProductDropdown } from "@/components/pos/ProductDropdown";
import { CartTable } from "@/components/pos/CartTable";
import { CheckoutPanel } from "@/components/pos/CheckoutPanel";
import { RecentTransactions } from "@/components/pos/RecentTransactions";
import { InvoicePreviewModal } from "@/components/pos/InvoicePreviewModal";
import { SystemStatus } from "@/components/pos/SystemStatus";

import type { Product, Transaction, PaymentMode } from "@/types";

export function POSPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [completedTxn, setCompletedTxn] = useState<Transaction | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cart = useCartStore();
  const qc = useQueryClient();
  const now = new Date();

  // Today's summary
  const { data: summary } = useQuery({
    queryKey: ["today-summary"],
    queryFn: getTodaySummary,
    refetchInterval: 30_000,
  });

  // Debounced product search
  const debouncedSearch = useCallback(
    debounce(async (q: string) => {
      if (q.length < 1) { setResults([]); return; }
      const res = await searchProducts(q, 8);
      setResults(res);
    }, 180),
    []
  );

  const handleSearch = (v: string) => {
    setQuery(v);
    debouncedSearch(v);
  };

  const handleProductSelect = (product: Product) => {
    cart.addItem(product);
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const handleFirstResult = () => {
    if (results.length > 0) handleProductSelect(results[0]);
  };

  const handleNewBill = () => {
    cart.clearCart();
    setCompletedTxn(null);
    qc.invalidateQueries({ queryKey: ["today-summary"] });
    qc.invalidateQueries({ queryKey: ["recent-transactions"] });
    inputRef.current?.focus();
  };

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      if ((e.target as HTMLElement).tagName === "INPUT") {
        if (e.key === "Escape") {
          cart.clearCart();
          setQuery("");
          setResults([]);
        }
        return;
      }
      switch (e.key) {
        case "F1":
          e.preventDefault();
          cart.setActivePaymentMode("cash");
          break;
        case "F2":
          e.preventDefault();
          cart.setActivePaymentMode("upi");
          break;
        case "F3":
          e.preventDefault();
          cart.setActivePaymentMode("card");
          break;
        case "F4":
          e.preventDefault();
          cart.setActivePaymentMode("credit");
          break;
        case "Escape":
          cart.clearCart();
          break;
        case "F5":
          e.preventDefault();
          handleNewBill();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart]);

  const total = cart.total();
  const itemCount = cart.items.length;

  return (
    <div className="flex h-full overflow-hidden bg-background">

      {/* ── LEFT PANEL: Stats + Search + Cart ──────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* Top bar: Date + Status + New Bill */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                Point of Sale
              </p>
            </div>
          </div>

          <SystemStatus />

          <button
            onClick={handleNewBill}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20
                       border border-primary/25 text-primary rounded-xl text-sm font-semibold
                       transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            New Bill
            <kbd className="kbd-badge ml-1 opacity-70">F5</kbd>
          </button>
        </div>

        {/* Daily Stats */}
        {summary && (
          <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today's Sales</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(summary.total_sales)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bills</p>
                <p className="text-sm font-bold text-foreground">{summary.invoice_count}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">UPI</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(summary.upi_sales)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-card border border-border/60 rounded-xl px-4 py-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cash</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(summary.cash_sales)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Barcode / Search */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0 relative">
          <BarcodeInput
            ref={inputRef}
            value={query}
            onChange={handleSearch}
            onEnter={handleFirstResult}
          />
          {results.length > 0 && (
            <ProductDropdown
              results={results}
              query={query}
              onSelect={handleProductSelect}
            />
          )}
        </div>

        {/* Cart Controls toolbar */}
        {itemCount > 0 && (
          <div className="px-5 pb-2 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{itemCount}</span> item{itemCount !== 1 ? "s" : ""} in cart
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3 h-3" />
                <kbd className="kbd-badge">F1</kbd>Cash
                <kbd className="kbd-badge">F2</kbd>UPI
                <kbd className="kbd-badge">F3</kbd>Card
                <kbd className="kbd-badge">ESC</kbd>Clear
              </div>
            </div>
          </div>
        )}

        {/* Cart Table */}
        <div className="flex-1 overflow-hidden px-5 pb-4 flex flex-col min-h-0">
          <CartTable />
        </div>
      </div>

      {/* ── RIGHT PANEL: Recent + Checkout ─────────────────────────────── */}
      <div className="flex flex-col w-80 flex-shrink-0 h-full overflow-hidden border-l border-border">
        {/* Recent Transactions — collapsible top section */}
        <div className="flex-shrink-0 p-3 border-b border-border/50">
          <RecentTransactions />
        </div>

        {/* Checkout Panel — fills remaining space */}
        <CheckoutPanel onSuccess={(txn) => setCompletedTxn(txn)} />
      </div>

      {/* Invoice Preview Modal */}
      {completedTxn && (
        <InvoicePreviewModal
          transaction={completedTxn}
          onClose={() => setCompletedTxn(null)}
          onNewBill={handleNewBill}
        />
      )}
    </div>
  );
}
