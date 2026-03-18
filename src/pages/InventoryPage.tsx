import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, AlertTriangle, Package, Edit2, Trash2,
  RefreshCw, Filter, BarChart2
} from "lucide-react";
import { getProducts, deleteProduct, getLowStockProducts } from "@/lib/tauri";
import { formatCurrency } from "@/lib/utils";
import { ProductFormModal } from "@/components/inventory/ProductFormModal";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import type { Product } from "@/types";

type ViewMode = "all" | "low";

export function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("all");
  const [editProduct, setEditProduct] = useState<Product | null | undefined>(undefined);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  const { data: allData, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts(1, 200),
  });
  const { data: lowStock = [] } = useQuery({
    queryKey: ["low-stock"],
    queryFn: getLowStockProducts,
  });

  const del = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
    },
  });

  const products = view === "low"
    ? lowStock
    : (allData?.items ?? []).filter(p =>
        !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? "").includes(search)
      );

  const stockBadge = (p: Product) => {
    if (p.stock_quantity <= 0)
      return <span className="badge-danger text-[10px]">Out of Stock</span>;
    if (p.stock_quantity <= p.low_stock_alert)
      return <span className="badge-warning text-[10px]">Low Stock</span>;
    return <span className="badge-success text-[10px]">In Stock</span>;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg">Inventory</h1>
            <p className="text-xs text-muted-foreground">
              {allData?.total ?? 0} products · {lowStock.length} low stock
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditProduct(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all active:scale-95 glow-primary"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50 flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setView("all"); }}
            placeholder="Search by name or barcode..."
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1 border border-border/50">
          {(["all", "low"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => { setView(v); setSearch(""); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "low"
                ? <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-yellow-400" />Low Stock ({lowStock.length})</span>
                : "All Products"}
            </button>
          ))}
        </div>

        <button
          onClick={() => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["low-stock"] }); }}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary border border-border/50 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Package className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">{view === "low" ? "No low stock items 🎉" : "No products found"}</p>
            {view === "all" && !search && (
              <button onClick={() => setEditProduct(null)} className="text-xs text-primary hover:underline">+ Add your first product</button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Barcode</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sale Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-t border-border/50 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/5"}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category_name ?? "No category"} · {p.unit}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{p.barcode ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.cost_price)}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">{formatCurrency(p.sale_price)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setAdjustProduct(p)}
                        className="font-bold hover:text-primary transition-colors cursor-pointer"
                        title="Click to adjust stock"
                      >
                        {p.stock_quantity} <span className="text-xs text-muted-foreground font-normal">{p.unit}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">{stockBadge(p)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setAdjustProduct(p)}
                          className="w-7 h-7 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors"
                          title="Adjust stock"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditProduct(p)}
                          className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${p.name}"? This cannot be undone.`))
                              del.mutate(p.id);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {editProduct !== undefined && (
        <ProductFormModal
          product={editProduct}
          onClose={() => setEditProduct(undefined)}
        />
      )}
      {adjustProduct && (
        <StockAdjustmentModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
        />
      )}
    </div>
  );
}
