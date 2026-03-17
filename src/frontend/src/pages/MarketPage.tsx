import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { UserProfile } from "../backend";
import { AssetType } from "../backend";
import AssetDetailSheet from "../components/AssetDetailSheet";
import TradeModal from "../components/TradeModal";
import { useCurrency } from "../hooks/useCurrency";
import { type MarketAsset, useMarketData } from "../hooks/useMarketData";

type CategoryTab = "all" | "crypto" | "forex" | "stocks";
type FilterPill = "all" | "hot" | "gainers" | "losers";
type SortCol = "price" | "change" | "volume" | "none";
type SortDir = "asc" | "desc";

function getVolumeSeed(name: string): number {
  let seed = 0;
  for (let i = 0; i < name.length; i++) {
    seed += name.charCodeAt(i);
  }
  return seed * 1_000_000;
}

function formatPrice(price: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : currency === "AED" ? "د.إ" : "$";
  const multiplier = currency === "INR" ? 83.5 : currency === "AED" ? 3.67 : 1;
  const converted = price * multiplier;
  if (converted >= 1_000_000)
    return `${symbol}${(converted / 1_000_000).toFixed(2)}M`;
  if (converted >= 1_000) return `${symbol}${(converted / 1_000).toFixed(2)}K`;
  if (converted >= 1) return `${symbol}${converted.toFixed(2)}`;
  return `${symbol}${converted.toFixed(6)}`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(2)}K`;
  return vol.toFixed(0);
}

interface MarketPageProps {
  profile: UserProfile;
}

export default function MarketPage({ profile }: MarketPageProps) {
  const { assets, isLive } = useMarketData();
  const { currency } = useCurrency();

  const [categoryTab, setCategoryTab] = useState<CategoryTab>("all");
  const [filterPill, setFilterPill] = useState<FilterPill>("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<SortCol>("volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [tradeAsset, setTradeAsset] = useState<MarketAsset | null>(null);
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");

  const cryptoAssets = useMemo(
    () => assets.filter((a) => a.type === AssetType.crypto),
    [assets],
  );
  const forexAssets = useMemo(
    () => assets.filter((a) => a.type === AssetType.forex),
    [assets],
  );
  const stockAssets = useMemo(
    () => assets.filter((a) => a.type === AssetType.stock),
    [assets],
  );

  const categorized = useMemo(() => {
    if (categoryTab === "crypto") return cryptoAssets;
    if (categoryTab === "forex") return forexAssets;
    if (categoryTab === "stocks") return stockAssets;
    return assets;
  }, [assets, categoryTab, cryptoAssets, forexAssets, stockAssets]);

  const enriched = useMemo(() => {
    return categorized.map((a) => ({
      ...a,
      high24h: a.price * 1.02,
      low24h: a.price * 0.98,
      volume: getVolumeSeed(a.name) * (a.price > 1 ? a.price * 0.001 : 1),
    }));
  }, [categorized]);

  const filtered = useMemo(() => {
    let list = enriched;
    // Apply filter pill
    if (filterPill === "hot") {
      list = [...list].sort((a, b) => b.volume - a.volume).slice(0, 20);
    } else if (filterPill === "gainers") {
      list = [...list].sort((a, b) => b.change24h - a.change24h);
    } else if (filterPill === "losers") {
      list = [...list].sort((a, b) => a.change24h - b.change24h);
    }
    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.displayLabel.toLowerCase().includes(q),
      );
    }
    // Apply sort
    if (sortCol !== "none") {
      list = [...list].sort((a, b) => {
        let va = 0;
        let vb = 0;
        if (sortCol === "price") {
          va = a.price;
          vb = b.price;
        }
        if (sortCol === "change") {
          va = a.change24h;
          vb = b.change24h;
        }
        if (sortCol === "volume") {
          va = a.volume;
          vb = b.volume;
        }
        return sortDir === "asc" ? va - vb : vb - va;
      });
    }
    return list;
  }, [enriched, filterPill, search, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col)
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "desc" ? (
      <ArrowDown className="w-3 h-3 ml-1 text-primary" />
    ) : (
      <ArrowUp className="w-3 h-3 ml-1 text-primary" />
    );
  }

  const FILTER_PILLS: {
    id: FilterPill;
    label: string;
    icon?: React.ReactNode;
  }[] = [
    { id: "hot", label: "Hot", icon: <Zap className="w-3 h-3" /> },
    {
      id: "gainers",
      label: "Gainers",
      icon: <TrendingUp className="w-3 h-3" />,
    },
    {
      id: "losers",
      label: "Losers",
      icon: <TrendingDown className="w-3 h-3" />,
    },
    { id: "all", label: "All" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Markets</h1>
            <p className="text-xs text-muted-foreground">
              {assets.length} assets
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-mono px-2 py-0.5 ${
              isLive
                ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                : "border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                isLive ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            {isLive ? "LIVE" : "SIM"}
          </Badge>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-ocid="market.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="pl-9 h-9 bg-card border-border text-sm"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 pb-2">
          <Tabs
            value={categoryTab}
            onValueChange={(v) => setCategoryTab(v as CategoryTab)}
          >
            <TabsList className="bg-card border border-border h-8 p-0.5 gap-0.5">
              {(
                [
                  { id: "all", label: `All (${assets.length})` },
                  { id: "crypto", label: `Crypto (${cryptoAssets.length})` },
                  { id: "forex", label: `Forex (${forexAssets.length})` },
                  { id: "stocks", label: `Stocks (${stockAssets.length})` },
                ] as { id: CategoryTab; label: string }[]
              ).map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  data-ocid="market.tab"
                  className="text-xs h-7 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Filter Pills */}
        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              data-ocid="market.filter.tab"
              onClick={() => setFilterPill(pill.id)}
              className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap ${
                filterPill === pill.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {pill.icon}
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[600px]">
          {/* Table Header */}
          <div
            className="grid market-grid sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-border px-4 py-2"
            style={{
              gridTemplateColumns: "2rem 1fr 8rem 8rem 7rem 7rem 8rem 7rem",
            }}
          >
            <span className="text-xs uppercase text-muted-foreground">#</span>
            <span className="text-xs uppercase text-muted-foreground">
              Name
            </span>
            <button
              type="button"
              data-ocid="market.sort.price_button"
              onClick={() => handleSort("price")}
              className="text-xs uppercase text-muted-foreground text-right flex items-center justify-end cursor-pointer hover:text-foreground transition-colors"
            >
              Price <SortIcon col="price" />
            </button>
            <button
              type="button"
              data-ocid="market.sort.change_button"
              onClick={() => handleSort("change")}
              className="text-xs uppercase text-muted-foreground text-right flex items-center justify-end cursor-pointer hover:text-foreground transition-colors"
            >
              24h % <SortIcon col="change" />
            </button>
            <span className="text-xs uppercase text-muted-foreground text-right hidden lg:block">
              24h High
            </span>
            <span className="text-xs uppercase text-muted-foreground text-right hidden lg:block">
              24h Low
            </span>
            <button
              type="button"
              data-ocid="market.sort.volume_button"
              onClick={() => handleSort("volume")}
              className="text-xs uppercase text-muted-foreground text-right hidden md:flex items-center justify-end cursor-pointer hover:text-foreground transition-colors"
            >
              Volume <SortIcon col="volume" />
            </button>
            <span className="text-xs uppercase text-muted-foreground text-right">
              Action
            </span>
          </div>

          {/* Rows */}
          <div data-ocid="market.table">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                No assets found
              </div>
            ) : (
              filtered.map((asset, i) => (
                <div
                  key={asset.name}
                  data-ocid={`market.row.${i + 1}`}
                  className="grid border-b border-border/40 px-4 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer"
                  style={{
                    gridTemplateColumns:
                      "2rem 1fr 8rem 8rem 7rem 7rem 8rem 7rem",
                  }}
                  onClick={() => setSelectedAsset(asset)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && setSelectedAsset(asset)
                  }
                >
                  {/* # */}
                  <span className="text-xs text-muted-foreground self-center">
                    {i + 1}
                  </span>

                  {/* Name */}
                  <div className="flex items-center gap-2 self-center min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-primary">
                        {asset.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate leading-tight">
                        {asset.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate leading-tight">
                        {asset.displayLabel}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right self-center">
                    <span className="text-sm font-mono text-foreground">
                      {formatPrice(asset.price, currency)}
                    </span>
                  </div>

                  {/* 24h Change */}
                  <div className="text-right self-center">
                    <span
                      className={`text-sm font-mono font-medium ${
                        asset.change24h >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {asset.change24h >= 0 ? "+" : ""}
                      {asset.change24h.toFixed(2)}%
                    </span>
                  </div>

                  {/* 24h High */}
                  <div className="text-right self-center hidden lg:block">
                    <span className="text-xs font-mono text-emerald-400/70">
                      {formatPrice(asset.high24h, currency)}
                    </span>
                  </div>

                  {/* 24h Low */}
                  <div className="text-right self-center hidden lg:block">
                    <span className="text-xs font-mono text-red-400/70">
                      {formatPrice(asset.low24h, currency)}
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="text-right self-center hidden md:block">
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatVolume(asset.volume)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center justify-end gap-1"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Button
                      data-ocid="market.asset.primary_button"
                      size="sm"
                      className="h-6 px-2 text-[10px] bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 rounded"
                      variant="ghost"
                      onClick={() => {
                        setTradeAsset(asset);
                        setTradeSide("buy");
                      }}
                    >
                      Buy
                    </Button>
                    <Button
                      data-ocid="market.asset.secondary_button"
                      size="sm"
                      className="h-6 px-2 text-[10px] bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 hover:border-red-500/60 rounded"
                      variant="ghost"
                      onClick={() => {
                        setTradeAsset(asset);
                        setTradeSide("sell");
                      }}
                    >
                      Sell
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-border bg-card/50 text-xs text-muted-foreground">
        Showing {filtered.length} of {assets.length} assets
      </div>

      {/* Asset detail sheet */}
      <AssetDetailSheet
        asset={selectedAsset}
        liveAsset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onTrade={(a, side) => {
          setSelectedAsset(null);
          setTradeAsset(a);
          setTradeSide(side);
        }}
      />

      {/* Trade modal */}
      <TradeModal
        asset={tradeAsset}
        side={tradeSide}
        open={!!tradeAsset}
        profile={profile}
        tradeCount={0}
        onClose={() => setTradeAsset(null)}
      />
    </div>
  );
}
