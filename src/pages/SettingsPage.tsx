import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Database, Store, Bell } from "lucide-react";
import { getAllSettings, setSetting, createBackup, listBackups } from "@/lib/tauri";
import { formatCurrency } from "@/lib/utils";

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [backupDir, setBackupDir] = useState("./backups");
  const [backupMsg, setBackupMsg] = useState("");

  const { data: allSettings } = useQuery({ queryKey: ["settings"], queryFn: getAllSettings });
  const { data: backups = [], refetch: refetchBackups } = useQuery({
    queryKey: ["backups"],
    queryFn: () => listBackups(backupDir),
  });

  useEffect(() => {
    if (allSettings) setSettings(allSettings);
  }, [allSettings]);

  const saveMut = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      for (const [key, value] of Object.entries(data)) {
        await setSetting(key, value);
      }
    },
  });

  const backupMut = useMutation({
    mutationFn: () => createBackup(backupDir),
    onSuccess: (filename) => {
      setBackupMsg(`✓ Backup created: ${filename}`);
      refetchBackups();
      setTimeout(() => setBackupMsg(""), 4000);
    },
  });

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => saveMut.mutate(settings);

  const bytesToMB = (b: number) => (b / 1024 / 1024).toFixed(1) + " MB";

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your store information</p>
      </div>

      {/* Shop Info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Store Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "shop_name", label: "Shop Name" },
            { key: "shop_phone", label: "Phone Number" },
            { key: "shop_gstin", label: "GSTIN" },
            { key: "currency_symbol", label: "Currency Symbol" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground block mb-1">{label}</label>
              <input
                value={settings[key] || ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Shop Address</label>
            <textarea
              value={settings["shop_address"] || ""}
              onChange={(e) => handleChange("shop_address", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Invoice Settings</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Invoice Prefix</label>
            <input
              value={settings["invoice_prefix"] || "INV"}
              onChange={(e) => handleChange("invoice_prefix", e.target.value)}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Next Invoice Number</label>
            <input
              value={settings["invoice_counter"] || "1"}
              onChange={(e) => handleChange("invoice_counter", e.target.value)}
              type="number"
              min="1"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => handleChange("low_stock_notifications", settings["low_stock_notifications"] === "true" ? "false" : "true")}
            className={`w-10 h-6 rounded-full transition-colors relative ${settings["low_stock_notifications"] === "true" ? "bg-primary" : "bg-secondary"}`}
          >
            <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${settings["low_stock_notifications"] === "true" ? "left-5" : "left-1"}`} />
          </div>
          <span className="text-sm text-foreground">Low stock alerts</span>
        </label>
      </div>

      {/* Backup */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Backup & Restore</h2>
        </div>
        <div className="flex gap-2">
          <input
            value={backupDir}
            onChange={(e) => setBackupDir(e.target.value)}
            placeholder="Backup folder path"
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
          <button
            onClick={() => backupMut.mutate()}
            disabled={backupMut.isPending}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
          >
            {backupMut.isPending ? "Creating..." : "Backup Now"}
          </button>
        </div>
        {backupMsg && <p className="text-xs text-green-400 font-medium">{backupMsg}</p>}
        {backups.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {backups.map((b) => (
              <div key={b.filename} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/50">
                <span className="text-muted-foreground font-mono">{b.filename}</span>
                <span className="text-muted-foreground">{bytesToMB(b.size)} · {b.created_at}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saveMut.isPending}
        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all disabled:opacity-50 glow-primary"
      >
        <Save className="w-4 h-4" />
        {saveMut.isPending ? "Saving..." : "Save Settings"}
      </button>
      {saveMut.isSuccess && <p className="text-xs text-green-400 font-medium">✓ Settings saved!</p>}
    </div>
  );
}
