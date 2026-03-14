import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Gift, Search, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AssetType, type UserProfile } from "../backend";
import TradeModal from "../components/TradeModal";
import { useCurrency } from "../hooks/useCurrency";
import { type MarketAsset, useMarketData } from "../hooks/useMarketData";
import { usePortfolio, useTradeHistory } from "../hooks/useQueries";

function trialDaysLeft(profile: UserProfile): number {
  const nowNs = BigInt(Date.now()) * BigInt(1_000_000);
  const durationNs = BigInt(17 * 24 * 3600) * BigInt(1_000_000_000);
  const endNs = profile.trialEndTime ?? profile.registrationTime + durationNs;
  const remainMs = Number((endNs - nowNs) / BigInt(1_000_000));
  return Math.max(0, Math.ceil(remainMs / (1000 * 60 * 60 * 24)));
}

function AssetCard({
  asset,
  onTrade,
}: {
  asset: MarketAsset;
  onTrade: (asset: MarketAsset, side: "buy" | "sell") => void;
}) {
  const { format } = useCurrency();
  const isUp = asset.price >= asset.prevPrice;
  const changed = asset.price !== asset.prevPrice;

  return (
    <motion.div
      layout
      className={`asset-card p-4 cursor-default ${
        changed ? (isUp ? "asset-card-up" : "asset-card-down") : ""
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-sm leading-tight">{asset.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {asset.displayLabel}
          </p>
        </div>
        <span className={asset.change24h >= 0 ? "badge-gain" : "badge-loss"}>
          {asset.change24h >= 0 ? "▲" : "▼"}
          {Math.abs(asset.change24h).toFixed(2)}%
        </span>
      </div>

      <p className="text-lg font-bold font-data mb-3">{format(asset.price)}</p>

      <div className="flex gap-2">
        <button
          type="button"
          data-ocid="dashboard.asset.primary_button"
          className="trade-btn-buy flex-1 py-1.5 text-xs font-semibold rounded"
          onClick={() => onTrade(asset, "buy")}
        >
          BUY
        </button>
        <button
          type="button"
          data-ocid="dashboard.asset.secondary_button"
          className="trade-btn-sell flex-1 py-1.5 text-xs font-semibold rounded"
          onClick={() => onTrade(asset, "sell")}
        >
          SELL
        </button>
      </div>
    </motion.div>
  );
}

function AssetGrid({
  assets,
  total,
  onTrade,
}: {
  assets: MarketAsset[];
  total: number;
  onTrade: (a: MarketAsset, s: "buy" | "sell") => void;
}) {
  if (assets.length === 0) {
    return (
      <div
        data-ocid="dashboard.empty_state"
        className="py-16 text-center text-muted-foreground"
      >
        <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No assets found.</p>
        <p className="text-xs mt-1">Try a different search term.</p>
      </div>
    );
  }
  return (
    <>
      {assets.length < total && (
        <p className="px-4 pt-2 pb-1 text-xs text-muted-foreground">
          Showing{" "}
          <span className="text-primary font-semibold">{assets.length}</span> of{" "}
          <span className="font-semibold">{total}</span> results
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {assets.map((a, i) => (
          <motion.div
            key={a.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
          >
            <AssetCard asset={a} onTrade={onTrade} />
          </motion.div>
        ))}
      </div>
    </>
  );
}

export default function DashboardPage({ profile }: { profile: UserProfile }) {
  const { assets } = useMarketData();
  const { format } = useCurrency();
  const { data: tradeHistory = [] } = useTradeHistory();
  const { data: portfolio } = usePortfolio();

  const [tradeTarget, setTradeTarget] = useState<{
    asset: MarketAsset;
    side: "buy" | "sell";
  } | null>(null);
  const [activeTab, setActiveTab] = useState("crypto");
  const [searchQuery, setSearchQuery] = useState("");

  const days = trialDaysLeft(profile);
  const tradeCount = tradeHistory.length;
  const freeTradesLeft = Math.max(0, 7 - tradeCount);
  const portfolioUSD = portfolio?.totalValue ?? 0;

  const crypto = assets.filter((a) => a.type === AssetType.crypto);
  const forex = assets.filter((a) => a.type === AssetType.forex);
  const stocks = assets.filter((a) => a.type === AssetType.stock);

  const q = searchQuery.toLowerCase().trim();
  const filter = (list: MarketAsset[]) =>
    q
      ? list.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.displayLabel.toLowerCase().includes(q),
        )
      : list;

  const filteredCrypto = filter(crypto);
  const filteredForex = filter(forex);
  const filteredStocks = filter(stocks);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  const handleTrade = (asset: MarketAsset, side: "buy" | "sell") => {
    setTradeTarget({ asset, side });
  };

  const currentCount =
    activeTab === "crypto"
      ? filteredCrypto.length
      : activeTab === "forex"
        ? filteredForex.length
        : filteredStocks.length;

  const currentTotal =
    activeTab === "crypto"
      ? crypto.length
      : activeTab === "forex"
        ? forex.length
        : stocks.length;

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Portfolio Value</p>
          <p className="text-xl font-bold font-data text-primary">
            {portfolioUSD > 0 ? format(portfolioUSD) : "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {days > 0 ? (
            <Badge
              data-ocid="dashboard.trial.toggle"
              className="bg-primary/10 text-primary border-primary/25 gap-1"
            >
              <Clock className="w-3 h-3" />
              {days}d trial left
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Trial ended
            </Badge>
          )}
          {freeTradesLeft > 0 && (
            <Badge
              data-ocid="dashboard.free_trades.toggle"
              className="bg-gain/10 text-gain border-gain/25 gap-1"
            >
              <Gift className="w-3 h-3" />
              {freeTradesLeft} free trades
            </Badge>
          )}
          {profile.isTaxFree ? (
            <Badge className="bg-gain/10 text-gain border-gain/25">
              Tax Free
            </Badge>
          ) : (
            <Badge variant="outline" className="text-warning border-warning/30">
              0.1% Tax
            </Badge>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="px-4 pt-4 space-y-3">
          <TabsList
            data-ocid="dashboard.market.tab"
            className="bg-card border border-border"
          >
            <TabsTrigger value="crypto" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Crypto
              <span className="ml-1 text-[10px] opacity-60">
                ({crypto.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="forex" className="gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Forex
              <span className="ml-1 text-[10px] opacity-60">
                ({forex.length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="stocks" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Stocks
              <span className="ml-1 text-[10px] opacity-60">
                ({stocks.length})
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              data-ocid="dashboard.search_input"
              type="text"
              placeholder={`Search ${activeTab === "crypto" ? "coins" : activeTab === "forex" ? "forex pairs" : "stocks"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border text-sm h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="text-xs text-muted-foreground pb-1">
              Showing{" "}
              <span className="text-primary font-semibold">{currentCount}</span>{" "}
              of <span className="font-semibold">{currentTotal}</span>{" "}
              {activeTab === "crypto"
                ? "coins"
                : activeTab === "forex"
                  ? "forex pairs"
                  : "stocks"}
            </p>
          )}
        </div>

        <TabsContent value="crypto">
          <AssetGrid
            assets={filteredCrypto}
            total={crypto.length}
            onTrade={handleTrade}
          />
        </TabsContent>
        <TabsContent value="forex">
          <AssetGrid
            assets={filteredForex}
            total={forex.length}
            onTrade={handleTrade}
          />
        </TabsContent>
        <TabsContent value="stocks">
          <AssetGrid
            assets={filteredStocks}
            total={stocks.length}
            onTrade={handleTrade}
          />
        </TabsContent>
      </Tabs>

      <TradeModal
        asset={tradeTarget?.asset ?? null}
        side={tradeTarget?.side ?? "buy"}
        open={!!tradeTarget}
        onClose={() => setTradeTarget(null)}
        profile={profile}
        tradeCount={tradeCount}
      />
    </div>
  );
}
