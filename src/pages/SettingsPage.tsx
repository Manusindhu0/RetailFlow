import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Save, Database, Store, Bell, HardDrive,
  Clock, FolderOpen, RefreshCw
} from "lucide-react";
import { getAllSettings, setSetting, createBackup, listBackups } from "@/lib/tauri";
import { UpdateChecker } from "@/components/settings/UpdateChecker";

const inp =
  "w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary/60 transition-colors";

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [backupDir, setBackupDir] = useState("./backups");
  const [backupMsg, setBackupMsg] = useState("");
  const [backupErr, setBackupErr] = useState("");

  const { data: allSettings } = useQuery({ queryKey: ["settings"], queryFn: getAllSettings });
  const { data: backups = [], refetch: refetchBackups } = useQuery({
    queryKey: ["backups", backupDir],
    queryFn: () => listBackups(backupDir),
  });

  useEffect(() => {
    if (allSettings) {
      setSettings(allSettings);
      if (allSettings["backup_dir"]) setBackupDir(allSettings["backup_dir"]);
    }
  }, [allSettings]);

  // Auto-backup on load: check if overdue
  useEffect(() => {
    const checkAutoBackup = async () => {
      const lastBackupAt = allSettings?.["last_backup_at"];
      const intervalHours = parseInt(allSettings?.["backup_interval_hours"] ?? "24");
      if (!lastBackupAt) return;
      const lastMs = new Date(lastBackupAt).getTime();
      const diffHours = (Date.now() - lastMs) / 3_600_000;
      if (diffHours >= intervalHours) {
        try {
          await createBackup(backupDir);
          await setSetting("last_backup_at", new Date().toISOString());
          refetchBackups();
        } catch { /* silent */ }
      }
    };
    if (allSettings) checkAutoBackup();
  }, [allSettings]);

  const saveMut = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      for (const [key, value] of Object.entries(data)) {
        await setSetting(key, value);
      }
    },
  });

  const backupMut = useMutation({
    mutationFn: (dir: string) => createBackup(dir),
    onSuccess: async (filename) => {
      setBackupMsg(`✓ Backup saved: ${filename}`);
      setBackupErr("");
      await setSetting("last_backup_at", new Date().toISOString());
      refetchBackups();
      setTimeout(() => setBackupMsg(""), 5000);
    },
    onError: (e) => {
      setBackupErr(`Failed: ${String(e)}`);
    },
  });

  const set = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    saveMut.mutate({ ...settings, backup_dir: backupDir });
  };

  const bytesToMB = (b: number) => (b / 1024 / 1024).toFixed(2) + " MB";
  const formatDate = (s: string) =>
    new Date(s).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="p-5 max-w-3xl mx-auto space-y-6 overflow-y-auto h-full pb-8">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure store, backup and system preferences</p>
      </div>

      {/* ── Store Information ── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Store Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "shop_name",       label: "Shop Name" },
            { key: "shop_phone",      label: "Phone Number" },
            { key: "shop_gstin",      label: "GSTIN" },
            { key: "currency_symbol", label: "Currency Symbol" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wide font-semibold">{label}</label>
              <input value={settings[key] ?? ""} onChange={(e) => set(key, e.target.value)} className={inp} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wide font-semibold">Shop Address</label>
            <textarea
              value={settings["shop_address"] ?? ""}
              onChange={(e) => set("shop_address", e.target.value)}
              rows={2}
              className={inp + " resize-none"}
            />
          </div>
        </div>
      </section>

      {/* ── Invoice Settings ── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Invoice Settings</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wide font-semibold">Invoice Prefix</label>
            <input value={settings["invoice_prefix"] ?? "INV"} onChange={(e) => set("invoice_prefix", e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wide font-semibold">Next Invoice #</label>
            <input type="number" min="1" value={settings["invoice_counter"] ?? "1"} onChange={(e) => set("invoice_counter", e.target.value)} className={inp} />
          </div>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Notifications</h2>
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() =>
              set("low_stock_notifications",
                settings["low_stock_notifications"] === "true" ? "false" : "true"
              )
            }
            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
              settings["low_stock_notifications"] === "true" ? "bg-primary" : "bg-secondary"
            }`}
          >
            <div
              className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-all ${
                settings["low_stock_notifications"] === "true" ? "left-5" : "left-1"
              }`}
            />
          </div>
          <span className="text-sm text-foreground">Low stock alerts</span>
        </label>
      </section>

      {/* ── Backup & Restore ── */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">Backup & Restore</h2>
        </div>

        {/* Backup folder + auto interval */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wide font-semibold">Backup Folder Path</label>
            <div className="flex gap-2">
              <input
                value={backupDir}
                onChange={(e) => setBackupDir(e.target.value)}
                placeholder="e.g. ./backups or D:\Backups"
                className={inp + " flex-1"}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Enter a relative or absolute folder path to store backups</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1 uppercase tracking-wide font-semibold flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Auto-Backup Every
            </label>
            <select
              value={settings["backup_interval_hours"] ?? "24"}
              onChange={(e) => set("backup_interval_hours", e.target.value)}
              className={inp}
            >
              {[
                { label: "Off (manual only)", value: "0" },
                { label: "Every 6 hours", value: "6" },
                { label: "Every 12 hours", value: "12" },
                { label: "Daily (every 24 hours)", value: "24" },
                { label: "Every 48 hours", value: "48" },
              ].map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Backup Now buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => backupMut.mutate(backupDir)}
              disabled={backupMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-all active:scale-95"
            >
              {backupMut.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
              Backup Now
            </button>
            <button
              onClick={() => backupMut.mutate("~/Desktop/RetailFlow-Backups")}
              disabled={backupMut.isPending}
              className="flex items-center gap-2 px-4 py-2 border border-border bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium disabled:opacity-50 transition-all"
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              Backup to Desktop
            </button>
          </div>

          {backupMsg && <p className="text-xs text-green-400 font-medium">{backupMsg}</p>}
          {backupErr && <p className="text-xs text-red-400 font-medium">{backupErr}</p>}
        </div>

        {/* Backup list */}
        {backups.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Recent Backups</p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {backups.map((b) => (
                <div key={b.filename} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-mono text-foreground">{b.filename}</p>
                    <p className="text-muted-foreground">{formatDate(b.created_at)}</p>
                  </div>
                  <span className="text-muted-foreground">{bytesToMB(b.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Auto-Update Checker ── */}
      <UpdateChecker />

      {/* ── Save ── */}
      <button
        onClick={handleSave}
        disabled={saveMut.isPending}
        className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all disabled:opacity-50 glow-primary active:scale-95"
      >
        <Save className="w-4 h-4" />
        {saveMut.isPending ? "Saving…" : "Save Settings"}
      </button>
      {saveMut.isSuccess && <p className="text-xs text-green-400 font-medium">✓ Settings saved!</p>}
    </div>
  );
}
