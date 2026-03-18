import { Printer, Wifi, WifiOff, HardDrive, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

type Status = "ok" | "error" | "warn";

interface StatusPill {
  label: string;
  status: Status;
  icon: React.ReactNode;
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
      status === "ok" ? "bg-green-400" :
      status === "warn" ? "bg-yellow-400 animate-pulse" :
      "bg-red-400 animate-pulse"
    }`} />
  );
}

export function SystemStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [backupStatus] = useState<Status>("ok");
  const [printerStatus] = useState<Status>("warn");

  useEffect(() => {
    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const pills: StatusPill[] = [
    {
      label: "Printer",
      status: printerStatus,
      icon: <Printer className="w-3 h-3" />,
    },
    {
      label: "Backup",
      status: backupStatus,
      icon: <HardDrive className="w-3 h-3" />,
    },
    {
      label: online ? "Online" : "Offline",
      status: online ? "ok" : "error",
      icon: online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {pills.map((pill) => (
        <div
          key={pill.label}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium
            transition-colors ${
            pill.status === "ok"   ? "bg-green-500/10  border-green-500/25  text-green-400"  :
            pill.status === "warn" ? "bg-yellow-500/10 border-yellow-500/25 text-yellow-400" :
            "bg-red-500/10 border-red-500/25 text-red-400"
          }`}
        >
          <StatusDot status={pill.status} />
          {pill.icon}
          <span className="hidden sm:inline">{pill.label}</span>
        </div>
      ))}
    </div>
  );
}
