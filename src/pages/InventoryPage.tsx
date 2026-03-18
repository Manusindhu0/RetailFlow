import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, AlertTriangle, Package } from "lucide-react";
import { getProducts, createProduct, updateProduct, deleteProduct, getCategories } from "@/lib/tauri";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

export function InventoryPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "", barcode: "", sale_price: "", cost_price: "",
    stock: "", low_stock_alert: "5", tax_percent: "0", unit: "pcs", category_id: "",
  });

  const qc = useQueryClient();
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: getCategories });

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const resetForm = () => {
    setForm({ name: "", barcode: "", sale_price: "", cost_price: "", stock: "", low_stock_alert: "5", tax_percent: "0", unit: "pcs", category_id: "" });
    setShowForm(false);
    setEditing(null);
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, barcode: p.barcode || "", sale_price: String(p.sale_price),
      cost_price: String(p.cost_price), stock: String(p.stock),
      low_stock_alert: String(p.low_stock_alert), tax_percent: String(p.tax_percent),
      unit: p.unit, category_id: String(p.category_id || ""),
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      barcode: form.barcode || undefined,
      category_id: form.category_id ? parseInt(form.category_id) : undefined,
      sale_price: parseFloat(form.sale_price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      stock: parseInt(form.stock) || 0,
      low_stock_alert: parseInt(form.low_stock_alert) || 5,
      tax_percent: parseFloat(form.tax_percent) || 0,
      unit: form.unit || "pcs",
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_alert).length;

  return (
    <div className="p-5 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-yellow-400 font-medium">{lowStockCount} low stock</span>
            </div>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Product</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Category</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Sale Price</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Cost</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Stock</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No products found
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{p.name}</p>
                    {p.barcode && <p className="text-xs text-muted-foreground">{p.barcode}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category_name || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.sale_price)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(p.cost_price)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={p.stock <= p.low_stock_alert ? "text-yellow-400 font-semibold" : "text-foreground"}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.stock <= 0 ? (
                      <span className="badge-danger">Out of Stock</span>
                    ) : p.stock <= p.low_stock_alert ? (
                      <span className="badge-warning">Low Stock</span>
                    ) : (
                      <span className="badge-success">In Stock</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(p)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this product?")) deleteMut.mutate(p.id); }}
                        className="text-xs px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-lg font-bold mb-5">{editing ? "Edit Product" : "Add Product"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Product Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Barcode</label>
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Category</label>
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors">
                    <option value="">None</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Sale Price *</label>
                  <input required type="number" min="0" step="0.01" value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Cost Price</label>
                  <input type="number" min="0" step="0.01" value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Stock</label>
                  <input type="number" min="0" value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Low Stock Alert</label>
                  <input type="number" min="0" value={form.low_stock_alert}
                    onChange={(e) => setForm({ ...form, low_stock_alert: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Tax %</label>
                  <input type="number" min="0" step="0.1" value={form.tax_percent}
                    onChange={(e) => setForm({ ...form, tax_percent: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Unit</label>
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetForm}
                  className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all">
                  {editing ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
