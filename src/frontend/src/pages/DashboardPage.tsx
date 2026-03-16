import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Gift,
  IndianRupee,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { AssetType, type UserProfile } from "../backend";
import AssetDetailSheet from "../components/AssetDetailSheet";
import TradeModal from "../components/TradeModal";
import { useCurrency } from "../hooks/useCurrency";
import { useFavorites } from "../hooks/useFavorites";
import { type MarketAsset, useMarketData } from "../hooks/useMarketData";
import { usePortfolio, useTradeHistory } from "../hooks/useQueries";
import { loadPortfolio } from "../utils/localData";

const INR_RATE = 83;

const typeShortLabel: Record<string, string> = {
  [AssetType.crypto as unknown as string]: "Crypto",
  [AssetType.forex as unknown as string]: "Forex",
  [AssetType.stock as unknown as string]: "Stock",
};

const typeBadgeStyle: Record<string, string> = {
  [AssetType.crypto as unknown as string]:
    "bg-[oklch(0.78_0.14_198)]/15 text-[oklch(0.78_0.14_198)]",
  [AssetType.forex as unknown as string]:
    "bg-[oklch(0.8_0.17_75)]/15 text-[oklch(0.8_0.17_75)]",
  [AssetType.stock as unknown as string]:
    "bg-[oklch(0.72_0.22_145)]/15 text-[oklch(0.72_0.22_145)]",
};

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
  onChat,
  showTypeBadge,
}: {
  asset: MarketAsset;
  onTrade: (asset: MarketAsset, side: "buy" | "sell") => void;
  onChat: (asset: MarketAsset) => void;
  showTypeBadge?: boolean;
}) {
  const { format } = useCurrency();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isUp = asset.price >= asset.prevPrice;
  const changed = asset.price !== asset.prevPrice;
  const favorited = isFavorite(asset.name);
  const typeKey = String(asset.type);

  return (
    <motion.div
      layout
      onClick={() => onChat(asset)}
      className={`asset-card p-4 cursor-pointer hover:border-primary/40 transition-colors relative ${
        changed ? (isUp ? "asset-card-up" : "asset-card-down") : ""
      }`}
    >
      {showTypeBadge && (
        <span
          className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            typeBadgeStyle[typeKey] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {typeShortLabel[typeKey] ?? "Asset"}
        </span>
      )}
      <div className="flex items-start justify-between mb-3">
        <div className={showTypeBadge ? "mt-4" : ""}>
          <p className="font-bold text-sm leading-tight">{asset.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {asset.displayLabel}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className={asset.change24h >= 0 ? "badge-gain" : "badge-loss"}>
            {asset.change24h >= 0 ? "▲" : "▼"}
            {Math.abs(asset.change24h).toFixed(2)}%
          </span>
          <button
            type="button"
            data-ocid="dashboard.asset.toggle"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(asset.name);
            }}
            className="ml-1 p-1 rounded-full hover:bg-muted/50 transition-colors"
            aria-label={
              favorited ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Star
              className={`w-3.5 h-3.5 transition-colors ${
                favorited
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        </div>
      </div>

      <p className="text-lg font-bold font-data mb-3">{format(asset.price)}</p>

      <div className="flex gap-2">
        <button
          type="button"
          data-ocid="dashboard.asset.primary_button"
          className="trade-btn-buy flex-1 py-1.5 text-xs font-semibold rounded"
          onClick={(e) => {
            e.stopPropagation();
            onTrade(asset, "buy");
          }}
        >
          BUY
        </button>
        <button
          type="button"
          data-ocid="dashboard.asset.secondary_button"
          className="trade-btn-sell flex-1 py-1.5 text-xs font-semibold rounded"
          onClick={(e) => {
            e.stopPropagation();
            onTrade(asset, "sell");
          }}
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
  onChat,
  showTypeBadge,
  emptyMessage,
}: {
  assets: MarketAsset[];
  total: number;
  onTrade: (a: MarketAsset, s: "buy" | "sell") => void;
  onChat: (a: MarketAsset) => void;
  showTypeBadge?: boolean;
  emptyMessage?: { icon: React.ReactNode; title: string; subtitle: string };
}) {
  if (assets.length === 0) {
    if (emptyMessage) {
      return (
        <div
          data-ocid="dashboard.empty_state"
          className="py-16 text-center text-muted-foreground"
        >
          <div className="flex justify-center mb-3 opacity-30">
            {emptyMessage.icon}
          </div>
          <p className="font-medium">{emptyMessage.title}</p>
          <p className="text-xs mt-1">{emptyMessage.subtitle}</p>
        </div>
      );
    }
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
            <AssetCard
              asset={a}
              onTrade={onTrade}
              onChat={onChat}
              showTypeBadge={showTypeBadge}
            />
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
  const { isFavorite, favoritesCount } = useFavorites();

  const [localPortfolioTotal, setLocalPortfolioTotal] = useState(() => {
    const holdings = loadPortfolio();
    return holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0);
  });

  useEffect(() => {
    const refresh = () => {
      const holdings = loadPortfolio();
      setLocalPortfolioTotal(
        holdings.reduce((s, h) => s + h.quantity * h.avgPrice, 0),
      );
    };
    window.addEventListener("cfs_data_updated", refresh);
    return () => window.removeEventListener("cfs_data_updated", refresh);
  }, []);

  const [tradeTarget, setTradeTarget] = useState<{
    asset: MarketAsset;
    side: "buy" | "sell";
  } | null>(null);
  const [activeTab, setActiveTab] = useState("crypto");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatAsset, setChatAsset] = useState<MarketAsset | null>(null);
  const [showRangeFilter, setShowRangeFilter] = useState(false);

  const days = trialDaysLeft(profile);
  const tradeCount = tradeHistory.length;
  const freeTradesLeft = Math.max(0, 7 - tradeCount);
  const backendPortfolioUSD = portfolio?.totalValue ?? 0;
  const portfolioUSD =
    localPortfolioTotal > 0 ? localPortfolioTotal : backendPortfolioUSD;

  const crypto = assets.filter((a) => a.type === AssetType.crypto);
  const forex = assets.filter((a) => a.type === AssetType.forex);
  const stocks = assets.filter((a) => a.type === AssetType.stock);
  const favoriteAssets = assets.filter((a) => isFavorite(a.name));

  const q = searchQuery.toLowerCase().trim();

  const inRange = (a: MarketAsset) => {
    const inrPrice = a.type === AssetType.stock ? a.price : a.price * INR_RATE;
    return inrPrice >= 10 && inrPrice <= 50;
  };

  const filter = (list: MarketAsset[]) => {
    let result = list;
    if (q) {
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.displayLabel.toLowerCase().includes(q),
      );
    }
    if (showRangeFilter) {
      result = result.filter(inRange);
    }
    return result;
  };

  const filteredCrypto = filter(crypto);
  const filteredForex = filter(forex);
  const filteredStocks = filter(stocks);
  const filteredFavorites =
    activeTab === "favorites" ? filter(favoriteAssets) : favoriteAssets;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  const handleTrade = (asset: MarketAsset, side: "buy" | "sell") => {
    setTradeTarget({ asset, side });
  };

  const liveAsset = chatAsset
    ? (assets.find((a) => a.name === chatAsset.name) ?? chatAsset)
    : null;

  const currentCount =
    activeTab === "crypto"
      ? filteredCrypto.length
      : activeTab === "forex"
        ? filteredForex.length
        : activeTab === "stocks"
          ? filteredStocks.length
          : filteredFavorites.length;

  const currentTotal =
    activeTab === "crypto"
      ? crypto.length
      : activeTab === "forex"
        ? forex.length
        : activeTab === "stocks"
          ? stocks.length
          : favoriteAssets.length;

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
            <TabsTrigger value="favorites" className="gap-1.5">
              <Star className="w-3.5 h-3.5" /> Favorites
              {favoritesCount > 0 && (
                <span className="ml-1 text-[10px] opacity-60">
                  ({favoritesCount})
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab !== "favorites" && (
            <>
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

              {/* ₹10–₹50 Range Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  data-ocid="dashboard.under50.toggle"
                  onClick={() => setShowRangeFilter((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    showRangeFilter
                      ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  <IndianRupee className="w-3 h-3" />
                  ₹10 – ₹50 Range
                  {showRangeFilter && (
                    <span className="ml-0.5 bg-primary-foreground/20 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-[9px]">
                      ✓
                    </span>
                  )}
                </button>
                {showRangeFilter && (
                  <span className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="text-primary font-semibold">
                      {currentCount}
                    </span>{" "}
                    assets in ₹10–₹50 range
                  </span>
                )}
              </div>

              {!showRangeFilter && searchQuery && (
                <p className="text-xs text-muted-foreground pb-1">
                  Showing{" "}
                  <span className="text-primary font-semibold">
                    {currentCount}
                  </span>{" "}
                  of <span className="font-semibold">{currentTotal}</span>{" "}
                  {activeTab === "crypto"
                    ? "coins"
                    : activeTab === "forex"
                      ? "forex pairs"
                      : "stocks"}
                </p>
              )}
            </>
          )}
        </div>

        <TabsContent value="crypto">
          <AssetGrid
            assets={filteredCrypto}
            total={crypto.length}
            onTrade={handleTrade}
            onChat={setChatAsset}
          />
        </TabsContent>
        <TabsContent value="forex">
          <AssetGrid
            assets={filteredForex}
            total={forex.length}
            onTrade={handleTrade}
            onChat={setChatAsset}
          />
        </TabsContent>
        <TabsContent value="stocks">
          <AssetGrid
            assets={filteredStocks}
            total={stocks.length}
            onTrade={handleTrade}
            onChat={setChatAsset}
          />
        </TabsContent>
        <TabsContent value="favorites">
          <AssetGrid
            assets={filteredFavorites}
            total={favoriteAssets.length}
            onTrade={handleTrade}
            onChat={setChatAsset}
            showTypeBadge
            emptyMessage={{
              icon: <Star className="w-10 h-10" />,
              title: "No favorites yet",
              subtitle: "Tap the ★ on any asset to save it here",
            }}
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

      <AssetDetailSheet
        asset={chatAsset}
        liveAsset={liveAsset}
        onClose={() => setChatAsset(null)}
        onTrade={(asset, side) => {
          setChatAsset(null);
          handleTrade(asset, side);
        }}
      />
    </div>
  );
}
