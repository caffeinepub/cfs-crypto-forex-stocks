import { useCallback, useEffect, useState } from "react";
import {
  loadWalletBalance,
  saveWalletBalance,
  updateWalletOnTrade,
  updateWalletOnWithdraw,
} from "../utils/localData";

export function useLocalWalletBalance() {
  const [balanceUSD, setBalanceUSD] = useState<number>(() =>
    loadWalletBalance(),
  );

  const refresh = useCallback(() => {
    setBalanceUSD(loadWalletBalance());
  }, []);

  useEffect(() => {
    window.addEventListener("cfs_data_updated", refresh);
    return () => window.removeEventListener("cfs_data_updated", refresh);
  }, [refresh]);

  const applyTrade = useCallback(
    (side: "buy" | "sell", amountUSD: number, taxAmountUSD: number) => {
      updateWalletOnTrade(side, amountUSD, taxAmountUSD);
      refresh();
    },
    [refresh],
  );

  const applyWithdraw = useCallback(
    (amountUSD: number, taxAmountUSD: number) => {
      updateWalletOnWithdraw(amountUSD, taxAmountUSD);
      refresh();
    },
    [refresh],
  );

  const setBalance = useCallback(
    (usd: number) => {
      saveWalletBalance(usd);
      refresh();
    },
    [refresh],
  );

  return { balanceUSD, applyTrade, applyWithdraw, setBalance, refresh };
}
