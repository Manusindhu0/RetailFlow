import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { adjustInventory } from "@/lib/tauri";
import type { Product } from "@/types";

interface Props {
  product: Product;
  onClose: () => void;
}

type AdjType = "add" | "remove" | "count";

export function StockAdjustmentModal({ product, onClose }: Props) {
  const qc = useQueryClient();
  const [adjType, setAdjType] = useState<AdjType>("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adjustInventory({
        product_id: product.id,
        adjustment_type: adjType === "add" ? "purchase" : adjType === "remove" ? "damage" : "count",
        quantity_change: parseInt(qty),
        notes: reason || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      onClose();
    },
  });

  const afterQty = (() => {
    const q = parseInt(qty) || 0;
    if (adjType === "add") return product.stock_quantity + q;
    if (adjType === "remove") return Math.max(0, product.stock_quantity - q);
    return q;
  })();

  const typeConfig = {
    add:    { label: "Add Stock",       color: "text-green-400",  icon: <ArrowUpCircle   className="w-4 h-4" /> },
    remove: { label: "Remove Stock",    color: "text-red-400",    icon: <ArrowDownCircle className="w-4 h-4" /> },
    count:  { label: "Set Stock Count", color: "text-blue-400",   icon: <ArrowUpCircle   className="w-4 h-4" /> },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground">Adjust Stock</h2>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Current stock badge */}
          <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3">
            <span className="text-sm text-muted-foreground">Current Stock</span>
            <span className="text-lg font-bold text-foreground">{product.stock_quantity} <span className="text-xs text-muted-foreground">{product.unit}</span></span>
          </div>

          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {(["add", "remove", "count"] as AdjType[]).map(t => (
              <button
                key={t}
                onClick={() => setAdjType(t)}
                className={`py-2 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1
                  ${adjType === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary/40 text-muted-foreground hover:border-border/80"}`}
              >
                {typeConfig[t].icon}
                {typeConfig[t].label}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
              {adjType === "count" ? "New Stock Count" : "Quantity"}
            </label>
            <input
              type="number"
              min="0"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full px-3 py-3 bg-secondary border border-border rounded-xl text-lg font-bold text-center focus:outline-none focus:border-primary/60 transition-colors"
              placeholder="0"
            />
          </div>

          {/* After adjustment preview */}
          {qty && (
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
              <span className="text-sm text-muted-foreground">Stock after adjustment</span>
              <span className={`text-lg font-bold ${typeConfig[adjType].color}`}>{afterQty} <span className="text-xs text-muted-foreground">{product.unit}</span></span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Reason (Optional)</label>
            <input
              className="w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Received new shipment"
            />
          </div>

          {mutation.isError && <p className="text-xs text-red-400">{String(mutation.error)}</p>}

          <button
            disabled={!qty || parseInt(qty) <= 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : typeConfig[adjType].icon}
            {typeConfig[adjType].label}
          </button>
        </div>
      </div>
    </div>
  );
}
