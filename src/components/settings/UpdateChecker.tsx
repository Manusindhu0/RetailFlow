import { useState, useEffect } from "react";
import {
  RefreshCw, CheckCircle2, AlertTriangle, Download, CloudOff
} from "lucide-react";

const CURRENT_VERSION = "1.0.0";
const VERSION_URL =
  "https://raw.githubusercontent.com/Manusindhu0/RetailFlow/main/version.json";

type Status = "checking" | "latest" | "update-available" | "error";

interface RemoteVersion {
  version: string;
  notes: string;
  url: string;
}

function semverGt(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}

export function UpdateChecker() {
  const [status, setStatus] = useState<Status>("checking");
  const [remote, setRemote] = useState<RemoteVersion | null>(null);

  const check = async () => {
    setStatus("checking");
    try {
      const res = await fetch(VERSION_URL + "?t=" + Date.now(), {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Network error");
      const data: RemoteVersion = await res.json();
      setRemote(data);
      setStatus(semverGt(data.version, CURRENT_VERSION) ? "update-available" : "latest");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => { check(); }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Software Updates</h2>
        <button
          onClick={check}
          disabled={status === "checking"}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === "checking" ? "animate-spin" : ""}`} />
          Check now
        </button>
      </div>

      <div className="flex items-start gap-3">
        {status === "checking" && (
          <>
            <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin mt-0.5" />
            <div>
              <p className="text-sm font-medium">Checking for updates…</p>
              <p className="text-xs text-muted-foreground">Current version: v{CURRENT_VERSION}</p>
            </div>
          </>
        )}

        {status === "latest" && (
          <>
            <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">You're up to date!</p>
              <p className="text-xs text-muted-foreground">RetailFlow v{CURRENT_VERSION} is the latest version</p>
            </div>
          </>
        )}

        {status === "update-available" && remote && (
          <>
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-bold text-foreground">
                New version available — v{remote.version}
              </p>
              {remote.notes && (
                <p className="text-xs text-muted-foreground">{remote.notes}</p>
              )}
              {remote.url && (
                <a
                  href={remote.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download v{remote.version}
                </a>
              )}
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <CloudOff className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Couldn't check for updates</p>
              <p className="text-xs text-muted-foreground">Make sure you're connected to the internet</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
