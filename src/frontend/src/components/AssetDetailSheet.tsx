import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BarChart2, Star, TrendingDown, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AssetType } from "../backend";
import { useCurrency } from "../hooks/useCurrency";
import { useFavorites } from "../hooks/useFavorites";
import type { MarketAsset } from "../hooks/useMarketData";
import CandlestickChart from "./CandlestickChart";

const typeLabel: Record<string, string> = {
  [AssetType.crypto as unknown as string]: "Cryptocurrency",
  [AssetType.forex as unknown as string]: "Forex Pair",
  [AssetType.stock as unknown as string]: "Stock / Equity",
};

const typeColor: Record<string, string> = {
  [AssetType.crypto as unknown as string]: "text-[oklch(0.78_0.14_198)]",
  [AssetType.forex as unknown as string]: "text-[oklch(0.8_0.17_75)]",
  [AssetType.stock as unknown as string]: "text-[oklch(0.72_0.22_145)]",
};

interface Props {
  asset: MarketAsset | null;
  liveAsset: MarketAsset | null;
  onClose: () => void;
  onTrade: (asset: MarketAsset, side: "buy" | "sell") => void;
}

export default function AssetDetailSheet({
  asset,
  liveAsset,
  onClose,
  onTrade,
}: Props) {
  const { format } = useCurrency();
  const { isFavorite, toggleFavorite } = useFavorites();
  const open = !!asset;
  const display = liveAsset ?? asset;

  if (!display) return null;

  const isUp = display.change24h >= 0;
  const isFlash = liveAsset && asset && liveAsset.price !== asset.price;
  const typeKey = String(display.type);
  const favorited = isFavorite(display.name);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        data-ocid="asset_detail.sheet"
        className="p-0 rounded-t-2xl border-border bg-card max-h-[92vh] overflow-auto"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-base leading-tight">
                {display.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {display.displayLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-ocid="asset_detail.toggle"
              onClick={() => toggleFavorite(display.name)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors"
              aria-label={
                favorited ? "Remove from favorites" : "Add to favorites"
              }
            >
              <Star
                className={`w-4 h-4 transition-colors ${
                  favorited
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
            <button
              type="button"
              data-ocid="asset_detail.close_button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat bubble – price */}
        <div className="px-5 pt-5 pb-2">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gain inline-block animate-pulse" />
            Live Market Price
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={display.price.toFixed(4)}
              initial={{ scale: 0.96, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`relative rounded-2xl rounded-tl-sm p-5 ${
                isFlash
                  ? isUp
                    ? "bg-gain/10 border border-gain/30"
                    : "bg-loss/10 border border-loss/30"
                  : "bg-secondary border border-border"
              }`}
            >
              <p
                className={`text-4xl font-bold font-mono tracking-tight ${
                  isFlash
                    ? isUp
                      ? "text-gain"
                      : "text-loss"
                    : "text-foreground"
                }`}
              >
                {format(display.price)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {isUp ? (
                  <TrendingUp className="w-4 h-4 text-gain" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-loss" />
                )}
                <span
                  className={
                    isUp
                      ? "text-gain text-sm font-semibold"
                      : "text-loss text-sm font-semibold"
                  }
                >
                  {isUp ? "+" : ""}
                  {display.change24h.toFixed(2)}% (24h)
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Candlestick Chart */}
        <CandlestickChart asset={display} />

        {/* Info cards */}
        <div className="px-5 py-3 grid grid-cols-3 gap-2">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Type
            </p>
            <p
              className={`text-xs font-semibold ${typeColor[typeKey] ?? "text-foreground"}`}
            >
              {typeLabel[typeKey] ?? "Asset"}
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              24h Change
            </p>
            <p
              className={`text-xs font-semibold ${isUp ? "text-gain" : "text-loss"}`}
            >
              {isUp ? "+" : ""}
              {display.change24h.toFixed(2)}%
            </p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
              Trend
            </p>
            <p
              className={`text-xs font-semibold ${isUp ? "text-gain" : "text-loss"}`}
            >
              {isUp ? "↑ Bullish" : "↓ Bearish"}
            </p>
          </div>
        </div>

        {/* Previous price */}
        <div className="px-5 pb-2">
          <div className="bg-secondary/50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Previous Price
            </span>
            <span className="text-xs font-mono text-foreground">
              {format(display.prevPrice)}
            </span>
          </div>
        </div>

        {/* BUY / SELL */}
        <div className="px-5 py-4 grid grid-cols-2 gap-3 sticky bottom-0 bg-card border-t border-border">
          <button
            type="button"
            data-ocid="asset_detail.primary_button"
            onClick={() => {
              onTrade(display, "buy");
              onClose();
            }}
            className="py-4 rounded-xl text-sm font-bold tracking-wide bg-gain text-background hover:brightness-110 active:scale-95 transition-all"
          >
            BUY
          </button>
          <button
            type="button"
            data-ocid="asset_detail.secondary_button"
            onClick={() => {
              onTrade(display, "sell");
              onClose();
            }}
            className="py-4 rounded-xl text-sm font-bold tracking-wide bg-loss text-background hover:brightness-110 active:scale-95 transition-all"
          >
            SELL
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
