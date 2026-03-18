# RetailFlow — Portable Desktop POS System

A production-grade, offline-first Point of Sale system built with **Tauri + React + SQLite**.

## Tech Stack
- **Desktop**: Tauri v2 (Rust backend)
- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: TailwindCSS v3 + shadcn/ui
- **Database**: SQLite (via rusqlite, bundled)
- **State**: Zustand + TanStack Query

## Prerequisites

### 1. Install Rust (Required for Tauri)
```powershell
# Run in PowerShell as Administrator
winget install Rustlang.Rustup
# Or download from: https://rustup.rs/
rustup default stable
```

### 2. Install WebView2 (Already on Windows 11, required for Win10)
Download from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### 3. Install Node.js (Already installed ✓)

## Getting Started

```powershell
# 1. Navigate to project
cd retailflow

# 2. Install frontend dependencies
npm install

# 3. Run in development mode (Tauri + Vite HMR)
npm run tauri:dev

# 4. Build portable .exe
npm run tauri:build
```

## Project Structure

```
retailflow/
├── src/                    # React frontend
│   ├── pages/              # All screen pages
│   ├── components/         # UI components
│   ├── store/              # Zustand stores
│   ├── lib/                # Tauri bridge + utils
│   └── types/              # TypeScript types
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri IPC commands
│   │   ├── db/             # SQLite connection + schema
│   │   └── models/         # Rust data models
│   └── Cargo.toml
├── package.json
└── vite.config.ts
```

## Modules

| Module | Status |
|--------|--------|
| POS Billing (search, cart, checkout) | ✅ |
| Inventory Management | ✅ |
| Customer Credit Ledger | ✅ |
| Reports & Analytics | ✅ |
| Settings & Backup | ✅ |
| Invoice PDF Generation | 🔜 Step 2 |
| WhatsApp Invoice Sharing | 🔜 Step 2 |
| Barcode Scanner | 🔜 Step 3 |
| Auto Cloud Backup | 🔜 Step 4 |

## Database Location
On first run, `retailflow.db` is created at:
```
Windows: C:\Users\<user>\AppData\Roaming\com.retailflow.pos\retailflow.db
```
