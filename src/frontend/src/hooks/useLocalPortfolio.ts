import { useCallback, useEffect, useState } from "react";
import {
  type LocalHolding,
  loadPortfolio,
  updatePortfolioOnTrade,
} from "../utils/localData";

export function useLocalPortfolio() {
  const [holdings, setHoldings] = useState<LocalHolding[]>(() =>
    loadPortfolio(),
  );

  const refresh = useCallback(() => {
    setHoldings(loadPortfolio());
  }, []);

  useEffect(() => {
    window.addEventListener("cfs_data_updated", refresh);
    return () => window.removeEventListener("cfs_data_updated", refresh);
  }, [refresh]);

  const totalValueUSD = holdings.reduce(
    (sum, h) => sum + h.quantity * h.avgPrice,
    0,
  );

  const recordTrade = useCallback(
    (
      asset: string,
      assetType: string,
      side: "buy" | "sell",
      qty: number,
      price: number,
    ) => {
      updatePortfolioOnTrade(asset, assetType, side, qty, price);
      refresh();
    },
    [refresh],
  );

  return { holdings, totalValueUSD, recordTrade, refresh };
}
