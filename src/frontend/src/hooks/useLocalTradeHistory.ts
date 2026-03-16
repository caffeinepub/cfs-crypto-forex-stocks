import { useCallback, useEffect, useState } from "react";
import {
  type LocalTrade,
  appendTrade,
  loadTradeHistory,
} from "../utils/localData";

export function useLocalTradeHistory() {
  const [history, setHistory] = useState<LocalTrade[]>(() =>
    loadTradeHistory(),
  );

  const refresh = useCallback(() => {
    setHistory(loadTradeHistory());
  }, []);

  useEffect(() => {
    window.addEventListener("cfs_data_updated", refresh);
    return () => window.removeEventListener("cfs_data_updated", refresh);
  }, [refresh]);

  const addTrade = useCallback(
    (trade: LocalTrade) => {
      appendTrade(trade);
      refresh();
    },
    [refresh],
  );

  return { history, addTrade, refresh };
}
