import { useRef, useEffect, forwardRef } from "react";
import { Barcode, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeInputProps {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  className?: string;
}

export const BarcodeInput = forwardRef<HTMLInputElement, BarcodeInputProps>(
  ({ value, onChange, onEnter, className }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) ?? inputRef;

    // Re-focus after any click elsewhere
    useEffect(() => {
      const handleFocus = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          resolvedRef.current?.focus();
        }
      };
      window.addEventListener("click", handleFocus);
      return () => window.removeEventListener("click", handleFocus);
    }, [resolvedRef]);

    return (
      <div className={cn("relative group", className)}>
        {/* Scanner animation bar */}
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute h-0.5 w-full bg-primary/40 top-1/2 -translate-y-1/2 
                          opacity-0 group-focus-within:opacity-100 transition-opacity duration-300
                          animate-[scan_2s_ease-in-out_infinite]" />
        </div>

        <div className="relative flex items-center">
          <Barcode className="absolute left-4 w-5 h-5 text-primary/70 pointer-events-none z-10" />
          <Search className="absolute left-11 w-4 h-4 text-muted-foreground/50 pointer-events-none z-10" />
          <input
            ref={resolvedRef}
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter?.();
            }}
            placeholder="Scan barcode or search by name / SKU..."
            className="w-full pl-[4.5rem] pr-32 py-4 text-base bg-card border-2 border-border
                       rounded-xl placeholder:text-muted-foreground/50 text-foreground
                       focus:outline-none focus:border-primary/70 focus:ring-4 focus:ring-primary/10
                       transition-all duration-200 font-medium"
          />
          <div className="absolute right-4 flex items-center gap-2">
            <kbd className="kbd-badge">Enter</kbd>
            <span className="text-xs text-muted-foreground/50">to pick first</span>
          </div>
        </div>
      </div>
    );
  }
);

BarcodeInput.displayName = "BarcodeInput";
