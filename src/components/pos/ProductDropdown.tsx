import { Package, ImageOff } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductDropdownProps {
  results: Product[];
  onSelect: (product: Product) => void;
  query: string;
}

export function ProductDropdown({ results, onSelect, query }: ProductDropdownProps) {
  if (results.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border
                    rounded-xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border/50 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {results.length} product{results.length !== 1 ? "s" : ""} found
        </span>
        <kbd className="kbd-badge text-xs">↑↓ Navigate</kbd>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {results.map((product, idx) => (
          <button
            key={product.id}
            onMouseDown={(e) => { e.preventDefault(); onSelect(product); }}
            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-secondary/70
                       text-left transition-colors duration-100 group border-b border-border/20 last:border-0"
          >
            {/* Product icon */}
            <div className="w-10 h-10 rounded-lg bg-secondary flex-shrink-0 flex items-center justify-center
                            group-hover:bg-primary/20 transition-colors">
              <Package className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {product.category_name && (
                  <span className="text-xs text-muted-foreground">{product.category_name}</span>
                )}
                {product.barcode && (
                  <span className="text-xs text-muted-foreground/60 font-mono">{product.barcode}</span>
                )}
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-base font-bold text-primary">{formatCurrency(product.sale_price)}</p>
              <p className={`text-xs mt-0.5 ${
                product.stock_quantity <= 0 ? "text-red-400" :
                product.stock_quantity <= product.low_stock_alert ? "text-yellow-400" :
                "text-green-400"
              }`}>
                Stock: {product.stock_quantity} {product.unit}
              </p>
            </div>

            {idx === 0 && (
              <kbd className="kbd-badge ml-2 opacity-60">Enter</kbd>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
