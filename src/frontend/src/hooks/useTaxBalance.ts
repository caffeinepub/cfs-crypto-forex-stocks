import { useState } from "react";

const TAX_BALANCE_KEY = "cfs_tax_balance";
const TAX_BUY_COUNT_KEY = "cfs_tax_buy_count";
const TAX_SELL_COUNT_KEY = "cfs_tax_sell_count";
const TAX_WITHDRAW_COUNT_KEY = "cfs_tax_withdraw_count";

function readNum(key: string): number {
  return Number(localStorage.getItem(key) ?? "0") || 0;
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

  const addTax = (amount: number, type: "buy" | "sell" | "withdraw") => {
    const newBalance = readNum(TAX_BALANCE_KEY) + amount;
    localStorage.setItem(TAX_BALANCE_KEY, String(newBalance));
    setTaxBalance(newBalance);

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
    setTaxBalance(0);
    setBuyCount(0);
    setSellCount(0);
    setWithdrawCount(0);
  };

  return { taxBalance, buyCount, sellCount, withdrawCount, addTax, clearTax };
}
