import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BarChart2, Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { AssetType } from "../backend";
import { useCurrency } from "../hooks/useCurrency";
import { useFavorites } from "../hooks/useFavorites";
import type { MarketAsset } from "../hooks/useMarketData";
import CandlestickChart from "./CandlestickChart";

const typeLabel: Record<string, string> = {
  [AssetType.crypto as unknown as string]: "Crypto",
  [AssetType.forex as unknown as string]: "Forex",
  [AssetType.stock as unknown as string]: "Stock",
};

const typeBadgeStyle: Record<string, string> = {
  [AssetType.crypto as unknown as string]: "bg-[#f0b90b22] text-[#f0b90b]",
  [AssetType.forex as unknown as string]: "bg-[#1677ff22] text-[#4096ff]",
  [AssetType.stock as unknown as string]: "bg-[#0ecb8122] text-[#0ecb81]",
};

type Tab = "Chart" | "Info" | "Trade";

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
  const [activeTab, setActiveTab] = useState<Tab>("Chart");
  const [tradeAmount, setTradeAmount] = useState("");

  const open = !!asset;
  const display = liveAsset ?? asset;

  if (!display) return null;

  const isUp = display.change24h >= 0;
  const isFlash = liveAsset && asset && liveAsset.price !== asset.price;
  const typeKey = String(display.type);
  const favorited = isFavorite(display.name);

  const high24h = display.price * 1.032;
  const low24h = display.price * 0.971;
  const vol = (display as MarketAsset & { volume?: number }).volume;

  const tabs: Tab[] = ["Chart", "Info", "Trade"];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        data-ocid="asset_detail.sheet"
        className="p-0 rounded-t-2xl max-h-[96vh] overflow-hidden flex flex-col"
        style={{ background: "#0b0e11", border: "1px solid #2b2f36" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div
            className="w-8 h-1 rounded-full"
            style={{ background: "#2b2f36" }}
          />
        </div>

        {/* Sticky header area */}
        <div
          className="flex-shrink-0"
          style={{ borderBottom: "1px solid #2b2f36" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "#1e2026" }}
              >
                <BarChart2 className="w-4 h-4" style={{ color: "#f0b90b" }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-base leading-tight"
                    style={{ color: "#eaecef" }}
                  >
                    {display.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      typeBadgeStyle[typeKey] ?? "bg-[#2b2f36] text-[#848e9c]"
                    }`}
                  >
                    {typeLabel[typeKey] ?? "Asset"}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "#848e9c" }}>
                  {display.displayLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-ocid="asset_detail.toggle"
                onClick={() => toggleFavorite(display.name)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#1e2026]"
                aria-label={
                  favorited ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Star
                  className="w-4 h-4"
                  style={{
                    color: favorited ? "#f0b90b" : "#848e9c",
                    fill: favorited ? "#f0b90b" : "none",
                  }}
                />
              </button>
              <button
                type="button"
                data-ocid="asset_detail.close_button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-[#1e2026]"
              >
                <X className="w-4 h-4" style={{ color: "#848e9c" }} />
              </button>
            </div>
          </div>

          {/* Price row */}
          <div className="px-4 pb-2 flex items-baseline gap-3">
            <AnimatePresence mode="wait">
              <motion.span
                key={display.price.toFixed(4)}
                initial={{ opacity: 0.5, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="text-3xl font-bold font-mono tracking-tight"
                style={{
                  color: isFlash ? (isUp ? "#0ecb81" : "#f6465d") : "#eaecef",
                }}
              >
                {format(display.price)}
              </motion.span>
            </AnimatePresence>
            <span
              className="text-sm font-semibold px-2 py-0.5 rounded"
              style={{
                background: isUp ? "#0ecb8122" : "#f6465d22",
                color: isUp ? "#0ecb81" : "#f6465d",
              }}
            >
              {isUp ? "+" : ""}
              {display.change24h.toFixed(2)}%
            </span>
          </div>

          {/* 24h stats */}
          <div className="px-4 pb-3 flex items-center gap-4">
            <span className="text-xs" style={{ color: "#848e9c" }}>
              24h High:{" "}
              <span style={{ color: "#0ecb81" }}>{format(high24h)}</span>
            </span>
            <span className="text-xs" style={{ color: "#848e9c" }}>
              24h Low:{" "}
              <span style={{ color: "#f6465d" }}>{format(low24h)}</span>
            </span>
            {vol !== undefined && (
              <span className="text-xs" style={{ color: "#848e9c" }}>
                Vol:{" "}
                <span style={{ color: "#eaecef" }}>{vol.toLocaleString()}</span>
              </span>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex" style={{ borderTop: "1px solid #2b2f36" }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 text-sm font-semibold relative transition-colors"
                style={{ color: activeTab === tab ? "#eaecef" : "#848e9c" }}
              >
                {tab}
                {activeTab === tab && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: "#f0b90b" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable tab content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "Chart" && (
            <div className="w-full">
              <CandlestickChart asset={display} />
            </div>
          )}

          {activeTab === "Info" && (
            <div className="px-4 py-4 grid grid-cols-2 gap-3">
              <div
                className="rounded-xl p-4"
                style={{ background: "#1e2026", border: "1px solid #2b2f36" }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "#848e9c" }}
                >
                  Type
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#eaecef" }}
                >
                  {typeLabel[typeKey] ?? "Asset"}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "#1e2026", border: "1px solid #2b2f36" }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "#848e9c" }}
                >
                  24h Change
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: isUp ? "#0ecb81" : "#f6465d" }}
                >
                  {isUp ? "+" : ""}
                  {display.change24h.toFixed(2)}%
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "#1e2026", border: "1px solid #2b2f36" }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "#848e9c" }}
                >
                  Trend
                </p>
                <p
                  className="text-sm font-semibold"
                  style={{ color: isUp ? "#0ecb81" : "#f6465d" }}
                >
                  {isUp ? "\u2191 Bullish" : "\u2193 Bearish"}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "#1e2026", border: "1px solid #2b2f36" }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "#848e9c" }}
                >
                  Prev Price
                </p>
                <p className="text-sm font-mono" style={{ color: "#eaecef" }}>
                  {format(display.prevPrice)}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "#1e2026", border: "1px solid #2b2f36" }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "#848e9c" }}
                >
                  24h High
                </p>
                <p className="text-sm font-mono" style={{ color: "#0ecb81" }}>
                  {format(high24h)}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "#1e2026", border: "1px solid #2b2f36" }}
              >
                <p
                  className="text-[10px] uppercase tracking-wider mb-1"
                  style={{ color: "#848e9c" }}
                >
                  24h Low
                </p>
                <p className="text-sm font-mono" style={{ color: "#f6465d" }}>
                  {format(low24h)}
                </p>
              </div>
            </div>
          )}

          {activeTab === "Trade" && (
            <div className="px-4 py-5 space-y-4">
              <label className="block">
                <span
                  className="text-xs mb-1.5 block"
                  style={{ color: "#848e9c" }}
                >
                  Amount
                </span>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none"
                  style={{
                    background: "#1e2026",
                    border: "1px solid #2b2f36",
                    color: "#eaecef",
                  }}
                />
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() =>
                      setTradeAmount(String((display.price * pct) / 100))
                    }
                    className="py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: "#1e2026",
                      border: "1px solid #2b2f36",
                      color: "#f0b90b",
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: "#1e2026", border: "1px solid #2b2f36" }}
              >
                <span className="text-xs" style={{ color: "#848e9c" }}>
                  Market Price
                </span>
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: isUp ? "#0ecb81" : "#f6465d" }}
                >
                  {format(display.price)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onTrade(display, "buy");
                    onClose();
                  }}
                  className="py-4 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-95 hover:brightness-110"
                  style={{ background: "#0ecb81", color: "#0b0e11" }}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTrade(display, "sell");
                    onClose();
                  }}
                  className="py-4 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-95 hover:brightness-110"
                  style={{ background: "#f6465d", color: "#fff" }}
                >
                  SELL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky bottom BUY / SELL bar */}
        <div
          className="flex-shrink-0 grid grid-cols-2"
          style={{ borderTop: "1px solid #2b2f36", background: "#0b0e11" }}
        >
          <button
            type="button"
            data-ocid="asset_detail.primary_button"
            onClick={() => {
              onTrade(display, "buy");
              onClose();
            }}
            className="py-3.5 text-sm font-bold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "#0ecb81", color: "#0b0e11" }}
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
            className="py-3.5 text-sm font-bold tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: "#f6465d", color: "#fff" }}
          >
            SELL
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
