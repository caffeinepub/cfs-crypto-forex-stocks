import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PieChart, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { UserProfile } from "../backend";
import { useCurrency } from "../hooks/useCurrency";
import { useMarketData } from "../hooks/useMarketData";
import { usePortfolio } from "../hooks/useQueries";
import { type LocalHolding, loadPortfolio } from "../utils/localData";

export default function PortfolioPage({
  profile: _,
}: { profile: UserProfile }) {
  const { data: portfolio, isLoading } = usePortfolio();
  const { getPrice } = useMarketData();
  const { format } = useCurrency();

  const [localHoldings, setLocalHoldings] = useState<LocalHolding[]>(() =>
    loadPortfolio(),
  );

  useEffect(() => {
    const refresh = () => setLocalHoldings(loadPortfolio());
    window.addEventListener("cfs_data_updated", refresh);
    return () => window.removeEventListener("cfs_data_updated", refresh);
  }, []);

  const holdings = portfolio?.holdings ?? [];
  const backendTotal = portfolio?.totalValue ?? 0;

  const backendEnriched = holdings
    .map(([asset, qty]) => {
      const currentPrice = getPrice(asset);
      const currentValue = currentPrice > 0 ? qty * currentPrice : 0;
      return { asset, qty, currentPrice, currentValue };
    })
    .filter((h) => h.qty > 0);

  // Local holdings enriched with live prices
  const localEnriched = localHoldings.map((h) => {
    const livePrice = getPrice(h.asset);
    const currentPrice = livePrice > 0 ? livePrice : h.avgPrice;
    const currentValue = currentPrice * h.quantity;
    return {
      asset: h.asset,
      qty: h.quantity,
      currentPrice,
      currentValue,
      avgPrice: h.avgPrice,
    };
  });

  // Use local holdings as primary source of truth
  const displayHoldings =
    localEnriched.length > 0 ? localEnriched : backendEnriched;

  const totalValue =
    displayHoldings.length > 0
      ? displayHoldings.reduce((s, h) => s + h.currentValue, 0)
      : backendTotal;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
          <PieChart className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Portfolio</h1>
          <p className="text-xs text-muted-foreground">
            Live holdings overview
          </p>
        </div>
      </div>

      {/* Total value card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-5"
        data-ocid="portfolio.card"
      >
        <p className="text-sm text-muted-foreground mb-1">
          Total Portfolio Value
        </p>
        {isLoading && localEnriched.length === 0 ? (
          <Skeleton className="h-9 w-40" data-ocid="portfolio.loading_state" />
        ) : (
          <p className="text-4xl font-bold font-data text-primary">
            {format(totalValue)}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-gain" />
          Prices update every 3 seconds
        </p>
      </motion.div>

      {/* Holdings table */}
      {isLoading && localEnriched.length === 0 ? (
        <div className="space-y-2" data-ocid="portfolio.loading_state">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : displayHoldings.length === 0 ? (
        <div
          data-ocid="portfolio.empty_state"
          className="text-center py-16 text-muted-foreground"
        >
          <PieChart className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No holdings yet</p>
          <p className="text-sm mt-1">Start trading to build your portfolio</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table data-ocid="portfolio.table">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Alloc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayHoldings.map((h, i) => {
                const pct =
                  totalValue > 0
                    ? ((h.currentValue / totalValue) * 100).toFixed(1)
                    : "0.0";
                return (
                  <TableRow
                    key={h.asset}
                    data-ocid={`portfolio.row.item.${i + 1}`}
                    className="border-border"
                  >
                    <TableCell className="font-semibold">{h.asset}</TableCell>
                    <TableCell className="text-right font-data text-muted-foreground">
                      {h.qty.toFixed(h.qty < 0.01 ? 6 : 4)}
                    </TableCell>
                    <TableCell className="text-right font-data">
                      {format(h.currentPrice)}
                    </TableCell>
                    <TableCell className="text-right font-data font-semibold">
                      {format(h.currentValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs text-primary font-data">
                        {pct}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
