// CFS Local Data Persistence — all data survives page reloads & backend resets

export interface LocalTrade {
  id: string;
  asset: string;
  assetType: string;
  side: "buy" | "sell";
  amountUSD: number;
  quantity: number;
  priceAtTrade: number;
  taxAmount: number;
  timestamp: number; // ms
}

export interface LocalHolding {
  asset: string;
  assetType: string;
  quantity: number;
  avgPrice: number;
}

const PORTFOLIO_KEY = "cfs_local_portfolio";
const HISTORY_KEY = "cfs_local_trade_history";
const WALLET_BALANCE_KEY = "cfs_wallet_balance_usd";
const DEFAULT_BALANCE_USD = 10000;

// ---- Portfolio ----

export function loadPortfolio(): LocalHolding[] {
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalHolding[];
  } catch {
    return [];
  }
}

export function savePortfolio(holdings: LocalHolding[]): void {
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(holdings));
  } catch {}
}

export function updatePortfolioOnTrade(
  asset: string,
  assetType: string,
  side: "buy" | "sell",
  quantity: number,
  price: number,
): void {
  try {
    const holdings = loadPortfolio();
    const idx = holdings.findIndex((h) => h.asset === asset);
    if (side === "buy") {
      if (idx >= 0) {
        const existing = holdings[idx];
        const totalQty = existing.quantity + quantity;
        const totalCost =
          existing.quantity * existing.avgPrice + quantity * price;
        holdings[idx] = {
          ...existing,
          quantity: totalQty,
          avgPrice: totalCost / totalQty,
        };
      } else {
        holdings.push({ asset, assetType, quantity, avgPrice: price });
      }
    } else {
      if (idx >= 0) {
        const newQty = holdings[idx].quantity - quantity;
        if (newQty <= 0.000001) {
          holdings.splice(idx, 1);
        } else {
          holdings[idx] = { ...holdings[idx], quantity: newQty };
        }
      }
    }
    savePortfolio(holdings);
  } catch {}
}

// ---- Trade History ----

export function loadTradeHistory(): LocalTrade[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalTrade[];
  } catch {
    return [];
  }
}

export function appendTrade(trade: LocalTrade): void {
  try {
    const history = loadTradeHistory();
    history.unshift(trade);
    const trimmed = history.slice(0, 500);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ---- Wallet Balance ----

export function loadWalletBalance(): number {
  try {
    const raw = localStorage.getItem(WALLET_BALANCE_KEY);
    if (raw === null) return DEFAULT_BALANCE_USD;
    const val = Number.parseFloat(raw);
    return Number.isNaN(val) ? DEFAULT_BALANCE_USD : val;
  } catch {
    return DEFAULT_BALANCE_USD;
  }
}

export function saveWalletBalance(usd: number): void {
  try {
    localStorage.setItem(WALLET_BALANCE_KEY, String(usd));
  } catch {}
}

export function updateWalletOnTrade(
  side: "buy" | "sell",
  amountUSD: number,
  taxAmountUSD: number,
): void {
  try {
    const current = loadWalletBalance();
    let next: number;
    if (side === "buy") {
      next = current - (amountUSD + taxAmountUSD);
    } else {
      next = current + (amountUSD - taxAmountUSD);
    }
    saveWalletBalance(Math.max(0, next));
  } catch {}
}

export function updateWalletOnWithdraw(
  amountUSD: number,
  taxAmountUSD: number,
): void {
  try {
    const current = loadWalletBalance();
    saveWalletBalance(Math.max(0, current - amountUSD - taxAmountUSD));
  } catch {}
}
