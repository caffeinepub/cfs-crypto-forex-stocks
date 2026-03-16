import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { AssetType } from "../backend";
import { useCurrency } from "../hooks/useCurrency";
import { useTradeHistory } from "../hooks/useQueries";
import { type LocalTrade, loadTradeHistory } from "../utils/localData";

export default function HistoryPage() {
  const { data: backendHistory = [], isLoading } = useTradeHistory();
  const { format } = useCurrency();
  const [tab, setTab] = useState<"all" | string>("all");

  const [localHistory, setLocalHistory] = useState<LocalTrade[]>(() =>
    loadTradeHistory(),
  );

  useEffect(() => {
    const refresh = () => setLocalHistory(loadTradeHistory());
    window.addEventListener("cfs_data_updated", refresh);
    return () => window.removeEventListener("cfs_data_updated", refresh);
  }, []);

  // Use local history as primary; fall back to backend
  const displayHistory: LocalTrade[] =
    localHistory.length > 0
      ? localHistory
      : backendHistory.map((t) => ({
          id: `${t.asset}-${t.timestamp}`,
          asset: t.asset,
          assetType: String(t.assetType),
          side: t.tradeType === "buy" ? "buy" : "sell",
          amountUSD: t.amount,
          quantity: 0,
          priceAtTrade: t.price,
          taxAmount: 0,
          timestamp: Number(t.timestamp / BigInt(1_000_000)),
        }));

  const filtered =
    tab === "all"
      ? displayHistory
      : displayHistory.filter((t) => {
          const typeStr = String(t.assetType).toLowerCase();
          return typeStr === tab.toLowerCase();
        });

  const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const cryptoTab = String(AssetType.crypto);
  const forexTab = String(AssetType.forex);
  const stockTab = String(AssetType.stock);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
          <History className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Trade History</h1>
          <p className="text-xs text-muted-foreground">
            {displayHistory.length} total trade
            {displayHistory.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v)}>
        <TabsList
          data-ocid="history.filter.tab"
          className="bg-card border border-border"
        >
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value={cryptoTab}>Crypto</TabsTrigger>
          <TabsTrigger value={forexTab}>Forex</TabsTrigger>
          <TabsTrigger value={stockTab}>Stocks</TabsTrigger>
        </TabsList>

        <TabsContent value={tab}>
          {isLoading && localHistory.length === 0 ? (
            <div className="space-y-2 mt-4" data-ocid="history.loading_state">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div
              data-ocid="history.empty_state"
              className="text-center py-16 text-muted-foreground"
            >
              <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No trades yet</p>
              <p className="text-sm mt-1">
                Place your first trade in the Dashboard
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border border-border rounded-xl overflow-hidden mt-4"
            >
              <Table data-ocid="history.table">
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount (USD)</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((trade, i) => {
                    const isBuy = trade.side === "buy";
                    return (
                      <TableRow
                        key={`${trade.id}-${i}`}
                        data-ocid={`history.row.item.${i + 1}`}
                        className="border-border"
                      >
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{formatDate(trade.timestamp)}</div>
                          <div className="text-muted-foreground/60">
                            {formatTime(trade.timestamp)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm">
                            {trade.asset}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {trade.assetType}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={isBuy ? "badge-gain" : "badge-loss"}
                          >
                            {isBuy ? "BUY" : "SELL"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-data">
                          ${trade.amountUSD.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-data text-muted-foreground">
                          {format(trade.priceAtTrade)}
                        </TableCell>
                        <TableCell className="text-right">
                          {trade.taxAmount > 0 ? (
                            <span className="font-data text-xs text-warning">
                              ${trade.taxAmount.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-xs text-gain font-semibold">
                              FREE
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
