import { Banknote, Smartphone, CreditCard, BookUser, ReceiptText } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMode } from "@/types";

const MODES: { mode: PaymentMode; label: string; icon: React.ReactNode; key: string; color: string }[] = [
  {
    mode: "cash",
    label: "Cash",
    icon: <Banknote className="w-5 h-5" />,
    key: "F1",
    color: "hover:border-green-500/60 hover:bg-green-500/10 data-[active=true]:border-green-500 data-[active=true]:bg-green-500/15 data-[active=true]:text-green-400",
  },
  {
    mode: "upi",
    label: "UPI",
    icon: <Smartphone className="w-5 h-5" />,
    key: "F2",
    color: "hover:border-violet-500/60 hover:bg-violet-500/10 data-[active=true]:border-violet-500 data-[active=true]:bg-violet-500/15 data-[active=true]:text-violet-400",
  },
  {
    mode: "card",
    label: "Card",
    icon: <CreditCard className="w-5 h-5" />,
    key: "F3",
    color: "hover:border-blue-500/60 hover:bg-blue-500/10 data-[active=true]:border-blue-500 data-[active=true]:bg-blue-500/15 data-[active=true]:text-blue-400",
  },
  {
    mode: "credit",
    label: "Credit",
    icon: <BookUser className="w-5 h-5" />,
    key: "F4",
    color: "hover:border-amber-500/60 hover:bg-amber-500/10 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-500/15 data-[active=true]:text-amber-400",
  },
];

interface PaymentButtonsProps {
  onModeSelect: (mode: PaymentMode) => void;
}

export function PaymentButtons({ onModeSelect }: PaymentButtonsProps) {
  const cart = useCartStore();

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <ReceiptText className="w-3.5 h-3.5" /> Payment Method
      </label>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map(({ mode, label, icon, key, color }) => (
          <button
            key={mode}
            data-active={cart.activePaymentMode === mode}
            onClick={() => {
              cart.setActivePaymentMode(mode);
              onModeSelect(mode);
            }}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-border
                        bg-secondary/40 text-muted-foreground transition-all duration-150 
                        active:scale-95 relative group ${color}`}
          >
            {icon}
            <span className="text-xs font-semibold">{label}</span>
            <kbd className="absolute top-1.5 right-1.5 kbd-badge text-[9px] opacity-50 group-hover:opacity-80 transition-opacity">
              {key}
            </kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
