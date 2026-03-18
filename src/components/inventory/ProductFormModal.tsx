import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Package, Save, Loader2 } from "lucide-react";
import { createProduct, updateProduct, getCategories } from "@/lib/tauri";
import type { Product, Category } from "@/types";

interface Props {
  product?: Product | null;
  onClose: () => void;
}

const EMPTY = {
  name: "", barcode: "", sku: "", category_id: "",
  cost_price: "", sale_price: "", mrp: "", gst_rate: "0",
  stock_quantity: "0", low_stock_alert: "5", unit: "pcs",
  batch_number: "", expiry_date: "", description: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const cls = "w-full px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors";

export function ProductFormModal({ product, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!product;
  const [form, setForm] = useState({ ...EMPTY });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name ?? "",
        barcode: product.barcode ?? "",
        sku: product.sku ?? "",
        category_id: String(product.category_id ?? ""),
        cost_price: String(product.cost_price ?? ""),
        sale_price: String(product.sale_price ?? ""),
        mrp: String(product.mrp ?? ""),
        gst_rate: String(product.gst_rate ?? "0"),
        stock_quantity: String(product.stock_quantity ?? "0"),
        low_stock_alert: String(product.low_stock_alert ?? "5"),
        unit: product.unit ?? "pcs",
        batch_number: product.batch_number ?? "",
        expiry_date: product.expiry_date ?? "",
        description: product.description ?? "",
      });
    }
  }, [product]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const num = (v: string) => v === "" ? null : parseFloat(v);
  const int = (v: string) => v === "" ? null : parseInt(v);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...(isEdit ? { id: product!.id } : {}),
        name: form.name,
        barcode: form.barcode || null,
        sku: form.sku || null,
        category_id: form.category_id ? int(form.category_id) : null,
        cost_price: num(form.cost_price) ?? 0,
        sale_price: num(form.sale_price) ?? 0,
        mrp: num(form.mrp),
        gst_rate: num(form.gst_rate) ?? 0,
        stock_quantity: int(form.stock_quantity) ?? 0,
        low_stock_alert: int(form.low_stock_alert) ?? 5,
        unit: form.unit || "pcs",
        batch_number: form.batch_number || null,
        expiry_date: form.expiry_date || null,
        description: form.description || null,
      };
      return isEdit ? updateProduct(payload) : createProduct(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">{isEdit ? "Edit Product" : "Add New Product"}</h2>
              <p className="text-xs text-muted-foreground">{isEdit ? "Update product details" : "Add a product to your inventory"}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {/* Basic Info */}
          <div>
            <p className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-3">Basic Information</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product Name *">
                <input className={cls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Surf Excel 1kg" />
              </Field>
              <Field label="Category">
                <select className={cls} value={form.category_id} onChange={e => set("category_id", e.target.value)}>
                  <option value="">— Select Category —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Barcode / SKU">
                <input className={cls} value={form.barcode} onChange={e => set("barcode", e.target.value)} placeholder="Scan or type barcode" />
              </Field>
              <Field label="Unit">
                <select className={cls} value={form.unit} onChange={e => set("unit", e.target.value)}>
                  {["pcs", "kg", "g", "ltr", "ml", "box", "dozen", "pack", "mtr"].map(u => <option key={u}>{u}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <p className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-3">Pricing</p>
            <div className="grid grid-cols-4 gap-4">
              <Field label="Cost Price ₹">
                <input type="number" min="0" className={cls} value={form.cost_price} onChange={e => set("cost_price", e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="Sale Price ₹ *">
                <input type="number" min="0" className={cls} value={form.sale_price} onChange={e => set("sale_price", e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="MRP ₹">
                <input type="number" min="0" className={cls} value={form.mrp} onChange={e => set("mrp", e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="GST Rate %">
                <select className={cls} value={form.gst_rate} onChange={e => set("gst_rate", e.target.value)}>
                  {["0","5","12","18","28"].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* Stock */}
          <div>
            <p className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-3">Stock</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Stock">
                <input type="number" min="0" className={cls} value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} />
              </Field>
              <Field label="Low Stock Alert at">
                <input type="number" min="0" className={cls} value={form.low_stock_alert} onChange={e => set("low_stock_alert", e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Batch & Expiry */}
          <div>
            <p className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-3">Batch & Expiry (Optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Batch Number">
                <input className={cls} value={form.batch_number} onChange={e => set("batch_number", e.target.value)} placeholder="e.g. B2024-01" />
              </Field>
              <Field label="Expiry Date">
                <input type="date" className={cls} value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          {mutation.isError && (
            <p className="text-xs text-red-400">{String(mutation.error)}</p>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors">
              Cancel
            </button>
            <button
              disabled={!form.name || !form.sale_price || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2 transition-all active:scale-95 glow-primary"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
