import { useState } from "react";

const TAX_BALANCE_KEY = "cfs_tax_balance";
const TAX_BUY_COUNT_KEY = "cfs_tax_buy_count";
const TAX_SELL_COUNT_KEY = "cfs_tax_sell_count";
const TAX_WITHDRAW_COUNT_KEY = "cfs_tax_withdraw_count";
const TAX_HISTORY_KEY = "cfs_tax_history";

export interface TaxTransaction {
  id: string;
  type: "buy" | "sell" | "withdraw";
  asset: string;
  tradeAmount: number;
  taxAmount: number;
  date: string; // ISO string
}

function readNum(key: string): number {
  return Number(localStorage.getItem(key) ?? "0") || 0;
}

function readHistory(): TaxTransaction[] {
  try {
    const raw = localStorage.getItem(TAX_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useTaxBalance() {
  const [taxBalance, setTaxBalance] = useState<number>(() =>
    readNum(TAX_BALANCE_KEY),
  );
  const [buyCount, setBuyCount] = useState<number>(() =>
    readNum(TAX_BUY_COUNT_KEY),
  );
  const [sellCount, setSellCount] = useState<number>(() =>
    readNum(TAX_SELL_COUNT_KEY),
  );
  const [withdrawCount, setWithdrawCount] = useState<number>(() =>
    readNum(TAX_WITHDRAW_COUNT_KEY),
  );
  const [taxHistory, setTaxHistory] = useState<TaxTransaction[]>(() =>
    readHistory(),
  );

  const addTax = (
    amount: number,
    type: "buy" | "sell" | "withdraw",
    asset?: string,
    tradeAmount?: number,
  ) => {
    const newBalance = readNum(TAX_BALANCE_KEY) + amount;
    localStorage.setItem(TAX_BALANCE_KEY, String(newBalance));
    setTaxBalance(newBalance);

    const tx: TaxTransaction = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      type,
      asset: asset ?? (type === "withdraw" ? "Withdrawal" : "Unknown Asset"),
      tradeAmount: tradeAmount ?? 0,
      taxAmount: amount,
      date: new Date().toISOString(),
    };

    const history = readHistory();
    const updated = [tx, ...history].slice(0, 500);
    localStorage.setItem(TAX_HISTORY_KEY, JSON.stringify(updated));
    setTaxHistory(updated);

    if (type === "buy") {
      const c = readNum(TAX_BUY_COUNT_KEY) + 1;
      localStorage.setItem(TAX_BUY_COUNT_KEY, String(c));
      setBuyCount(c);
    } else if (type === "sell") {
      const c = readNum(TAX_SELL_COUNT_KEY) + 1;
      localStorage.setItem(TAX_SELL_COUNT_KEY, String(c));
      setSellCount(c);
    } else {
      const c = readNum(TAX_WITHDRAW_COUNT_KEY) + 1;
      localStorage.setItem(TAX_WITHDRAW_COUNT_KEY, String(c));
      setWithdrawCount(c);
    }
  };

  const clearTax = () => {
    localStorage.removeItem(TAX_BALANCE_KEY);
    localStorage.removeItem(TAX_BUY_COUNT_KEY);
    localStorage.removeItem(TAX_SELL_COUNT_KEY);
    localStorage.removeItem(TAX_WITHDRAW_COUNT_KEY);
    localStorage.removeItem(TAX_HISTORY_KEY);
    setTaxBalance(0);
    setBuyCount(0);
    setSellCount(0);
    setWithdrawCount(0);
    setTaxHistory([]);
  };

  return {
    taxBalance,
    buyCount,
    sellCount,
    withdrawCount,
    taxHistory,
    addTax,
    clearTax,
  };
}
