import { Minus, Plus, Trash2, Package, ChevronDown } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";

export function CartTable() {
  const cart = useCartStore();

  if (cart.items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center">
          <Package className="w-8 h-8 opacity-40" />
        </div>
        <div className="text-center">
          <p className="font-medium text-sm">Cart is empty</p>
          <p className="text-xs mt-1 opacity-60">Scan a barcode or search above to add products</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <kbd className="kbd-badge">F1</kbd><span className="text-xs">Cash</span>
          <kbd className="kbd-badge">F2</kbd><span className="text-xs">UPI</span>
          <kbd className="kbd-badge">F3</kbd><span className="text-xs">Card</span>
          <kbd className="kbd-badge">ESC</kbd><span className="text-xs">Clear</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Table Header */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2 px-3 py-2 text-xs font-semibold
                      text-muted-foreground uppercase tracking-wide border-b border-border/50 sticky top-0
                      bg-background/95 backdrop-blur-sm z-10">
        <span>Product</span>
        <span className="text-center">Qty</span>
        <span className="text-right">Price</span>
        <span className="text-right">GST</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      {/* Table Body */}
      <div className="flex-1 overflow-y-auto space-y-1 pt-1 pr-0.5">
        {cart.items.map((item, idx) => {
          const itemGst = item.tax_amount;
          const isLowStock = item.product.stock_quantity <= item.product.low_stock_alert;
          const isOutOfStock = item.product.stock_quantity <= 0;

          return (
            <div
              key={item.product.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2 items-center
                         px-3 py-2.5 rounded-xl border border-border/50 bg-card
                         hover:border-primary/30 hover:bg-card/80 transition-all duration-150
                         animate-fade-in group"
            >
              {/* Product Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-xs
                                   flex items-center justify-center font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.product.barcode && (
                        <span className="text-xs font-mono text-muted-foreground/60">{item.product.barcode}</span>
                      )}
                      {item.product.gst_rate > 0 && (
                        <span className="badge-warning !text-[10px] !px-1.5 !py-0">
                          GST {item.product.gst_rate}%
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="badge-danger !text-[10px] !px-1.5 !py-0">Out of Stock</span>
                      )}
                      {!isOutOfStock && isLowStock && (
                        <span className="badge-warning !text-[10px] !px-1.5 !py-0">Low Stock</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline discount field */}
                <div className="mt-1.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <span className="text-xs text-muted-foreground">Disc ₹</span>
                  <input
                    type="number"
                    min="0"
                    max={item.product.sale_price}
                    step="0.5"
                    value={item.discount_value || ""}
                    onChange={(e) =>
                      cart.updateItemDiscount(item.product.id, parseFloat(e.target.value) || 0)
                    }
                    className="w-16 px-2 py-0.5 text-xs bg-secondary border border-border rounded-md
                               focus:outline-none focus:border-primary/60 transition-colors"
                    placeholder="0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {/* Qty Controls */}
              <div className="flex items-center justify-center gap-1">
                <button
                  onClick={() => cart.updateQuantity(item.product.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-lg bg-secondary hover:bg-red-500/20 hover:text-red-400
                             flex items-center justify-center transition-all duration-150 active:scale-90"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    cart.updateQuantity(item.product.id, parseInt(e.target.value) || 1)
                  }
                  className="w-10 text-center text-sm font-bold bg-transparent border border-border rounded-lg
                             focus:outline-none focus:border-primary/60 py-1 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => cart.updateQuantity(item.product.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-secondary hover:bg-primary/20 hover:text-primary
                             flex items-center justify-center transition-all duration-150 active:scale-90"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Price */}
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {formatCurrency(item.product.sale_price)}
                </p>
                {item.discount_value > 0 && (
                  <p className="text-xs text-green-400">-{formatCurrency(item.discount_value)}</p>
                )}
              </div>

              {/* GST */}
              <div className="text-right">
                {itemGst > 0 ? (
                  <p className="text-xs text-amber-400">{formatCurrency(itemGst)}</p>
                ) : (
                  <p className="text-xs text-muted-foreground/40">—</p>
                )}
              </div>

              {/* Line Total */}
              <div className="text-right">
                <p className="text-sm font-bold text-primary">
                  {formatCurrency(item.line_total + itemGst)}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={() => cart.removeItem(item.product.id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                           text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10
                           transition-all duration-150 active:scale-90"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer totals row */}
      <div className="border-t border-border/50 mt-2 pt-2 px-3 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          {cart.items.length} item{cart.items.length !== 1 ? "s" : ""}
        </span>
        <span />
        <span className="text-right text-xs text-muted-foreground">
          {formatCurrency(cart.subtotal())}
        </span>
        <span className="text-right text-xs text-amber-400">
          {formatCurrency(cart.totalTax())}
        </span>
        <span className="text-right text-sm font-bold text-primary">
          {formatCurrency(cart.total())}
        </span>
        <span />
      </div>
    </div>
  );
}
