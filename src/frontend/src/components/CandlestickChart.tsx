import { useEffect, useRef, useState } from "react";
import type { MarketAsset } from "../hooks/useMarketData";

type Timeframe = "1m" | "15m" | "1h" | "4h" | "1D";

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

function generateCandles(
  basePrice: number,
  _assetName: string,
  _timeframe: string,
  count = 60,
): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    const open = price;
    const change = (Math.random() - 0.48) * price * 0.02;
    const close = Math.max(open + change, 0.0001);
    const wick = price * 0.01;
    const high = Math.max(open, close) + Math.random() * wick;
    const low = Math.min(open, close) - Math.random() * wick;
    const volume = Math.random() * 1000000 + 100000;
    candles.unshift({ open, high, low, close, volume, time: now - i * 60000 });
    price = close;
  }
  return candles;
}

function calcMA(candles: Candle[], period: number): (number | null)[] {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    const slice = candles.slice(i - period + 1, i + 1);
    return slice.reduce((s, c) => s + c.close, 0) / period;
  });
}

const TIMEFRAMES: Timeframe[] = ["1m", "15m", "1h", "4h", "1D"];
const GREEN = "#0ecb81";
const RED = "#f6465d";
const GREEN_DIM = "rgba(14,203,129,0.25)";
const RED_DIM = "rgba(246,70,93,0.25)";
const MA7_COLOR = "#f0b90b";
const MA25_COLOR = "#e040fb";
const MA99_COLOR = "#7c4dff";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const CHART_BG = "#0b0e11";

interface Props {
  asset: MarketAsset;
}

export default function CandlestickChart({ asset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [indicator, setIndicator] = useState<"MA" | "EMA" | "BOLL" | "VOL">(
    "MA",
  );
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateCandles(asset.price, asset.name, "15m"),
  );
  const [vol24h] = useState(() => (Math.random() * 500 + 100).toFixed(2));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const assetName = asset.name;
  const assetPrice = asset.price;

  // Regenerate on timeframe/price change
  useEffect(() => {
    setCandles(generateCandles(assetPrice, assetName, timeframe));
  }, [assetPrice, assetName, timeframe]);

  // Live candle update every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.49) * last.close * 0.012;
        const newClose = Math.max(last.close + change, 0.0001);
        const newHigh = Math.max(last.high, newClose);
        const newLow = Math.min(last.low, newClose);
        const updated = [
          ...prev.slice(0, -1),
          { ...last, close: newClose, high: newHigh, low: newLow },
        ];
        return updated;
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const ma7 = calcMA(candles, 7);
  const ma25 = calcMA(candles, 25);
  const ma99 = calcMA(candles, 99);

  const high24h = asset.price * (1 + Math.abs(asset.change24h) / 100 + 0.005);
  const low24h = asset.price * (1 - Math.abs(asset.change24h) / 100 - 0.003);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (W === 0 || H === 0) return;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Backgrounds
    ctx.fillStyle = CHART_BG;
    ctx.fillRect(0, 0, W, H);

    const padLeft = 4;
    const padRight = 62;
    const padTop = 14;
    const volH = Math.floor(H * 0.18); // bottom volume area
    const padBottom = volH + 24;
    const chartH = H - padTop - padBottom;
    const chartW = W - padLeft - padRight;

    // Price range
    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    const minP = Math.min(...allPrices) * 0.997;
    const maxP = Math.max(...allPrices) * 1.003;
    const priceRange = maxP - minP || 1;
    const toY = (p: number) => padTop + ((maxP - p) / priceRange) * chartH;

    // Volume range
    const maxVol = Math.max(...candles.map((c) => c.volume));
    const volAreaY = padTop + chartH + 8;
    const toVolH = (v: number) => (v / maxVol) * volH;

    const totalCandles = candles.length;
    const step = chartW / totalCandles;
    const candleW = Math.max(2, step * 0.65);

    // ---- Grid ----
    const gridLines = 6;
    for (let g = 0; g <= gridLines; g++) {
      const y = padTop + (g / gridLines) * chartH;
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(W - padRight, y);
      ctx.stroke();

      const price = maxP - (g / gridLines) * priceRange;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `${10}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "left";
      const label =
        price >= 10000
          ? price.toFixed(0)
          : price >= 1000
            ? price.toFixed(1)
            : price >= 1
              ? price.toFixed(2)
              : price.toFixed(5);
      ctx.fillText(label, W - padRight + 5, y + 3.5);
    }

    // Separator line between candles and volume
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, volAreaY - 4);
    ctx.lineTo(W - padRight, volAreaY - 4);
    ctx.stroke();

    // ---- Volume bars ----
    for (const [i, c] of candles.entries()) {
      const x = padLeft + i * step + step / 2;
      const isGreen = c.close >= c.open;
      const bH = Math.max(1, toVolH(c.volume));
      ctx.fillStyle = isGreen ? GREEN_DIM : RED_DIM;
      ctx.fillRect(x - candleW / 2, volAreaY + volH - bH, candleW, bH);
    }

    // ---- Candle bodies + wicks ----
    for (const [i, c] of candles.entries()) {
      const x = padLeft + i * step + step / 2;
      const isGreen = c.close >= c.open;
      const color = isGreen ? GREEN : RED;
      const isHovered = hoverIdx === i;

      // Highlight column on hover
      if (isHovered) {
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(x - step / 2, padTop, step, chartH);
      }

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBottom = toY(Math.min(c.open, c.close));
      const bodyH = Math.max(1.5, bodyBottom - bodyTop);

      if (isGreen) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);

      // Hollow/solid: add a subtle border for green candles
      if (candleW > 4) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH);
      }
    }

    // ---- MA lines ----
    const drawLine = (data: (number | null)[], color: string, width = 1.3) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      let started = false;
      for (const [i, v] of data.entries()) {
        if (v === null) continue;
        const x = padLeft + i * step + step / 2;
        const y = toY(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };
    drawLine(ma7, MA7_COLOR, 1.5);
    drawLine(ma25, MA25_COLOR, 1.5);
    drawLine(ma99, MA99_COLOR, 1.5);

    // ---- Crosshair (hover) ----
    if (hoverIdx !== null && hoverIdx >= 0 && hoverIdx < candles.length) {
      const c = candles[hoverIdx];
      const x = padLeft + hoverIdx * step + step / 2;
      const closeY = toY(c.close);

      // Vertical dashed line
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + chartH);
      ctx.stroke();

      // Horizontal dashed line
      ctx.beginPath();
      ctx.moveTo(padLeft, closeY);
      ctx.lineTo(W - padRight, closeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label on right axis
      const priceLabel =
        c.close >= 1000
          ? c.close.toFixed(1)
          : c.close >= 1
            ? c.close.toFixed(2)
            : c.close.toFixed(5);
      const labelW = padRight - 3;
      ctx.fillStyle = "#f0b90b";
      ctx.fillRect(W - padRight + 2, closeY - 8, labelW, 16);
      ctx.fillStyle = "#0b0e11";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(priceLabel, W - padRight + 2 + labelW / 2, closeY + 3.5);

      // OHLC tooltip box
      const isGreen = c.close >= c.open;
      const boxX = x > W / 2 ? padLeft + 6 : x + 10;
      const boxY = padTop + 4;
      ctx.fillStyle = "rgba(20,24,32,0.92)";
      ctx.strokeStyle = isGreen ? GREEN : RED;
      ctx.lineWidth = 0.8;
      const boxW = 110;
      const boxH2 = 60;
      const radius = 6;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH2, radius);
      ctx.fill();
      ctx.stroke();

      const fmt = (n: number) =>
        n >= 1000 ? n.toFixed(1) : n >= 1 ? n.toFixed(3) : n.toFixed(6);
      const lines = [
        `O: ${fmt(c.open)}`,
        `H: ${fmt(c.high)}`,
        `L: ${fmt(c.low)}`,
        `C: ${fmt(c.close)}`,
      ];
      const colors = ["#d9d9d9", GREEN, RED, isGreen ? GREEN : RED];
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      for (const [li, line] of lines.entries()) {
        ctx.fillStyle = colors[li];
        ctx.fillText(line, boxX + 8, boxY + 14 + li * 13);
      }
    }

    // ---- X-axis time labels ----
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    const labelStep = Math.max(1, Math.floor(totalCandles / 6));
    for (const [i, c] of candles.entries()) {
      if (i % labelStep !== 0) continue;
      const x = padLeft + i * step + step / 2;
      const d = new Date(c.time);
      const label = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      ctx.fillText(label, x, H - 5);
    }

    // Last price line
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      const ly = toY(lastCandle.close);
      const isGreen2 = lastCandle.close >= lastCandle.open;
      ctx.strokeStyle = isGreen2 ? GREEN : RED;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, ly);
      ctx.lineTo(W - padRight, ly);
      ctx.stroke();
      ctx.setLineDash([]);

      // last price pill
      const lPriceLabel =
        lastCandle.close >= 1000
          ? lastCandle.close.toFixed(1)
          : lastCandle.close >= 1
            ? lastCandle.close.toFixed(2)
            : lastCandle.close.toFixed(5);
      const pillW = padRight - 3;
      ctx.fillStyle = isGreen2 ? GREEN : RED;
      ctx.fillRect(W - padRight + 2, ly - 8, pillW, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(lPriceLabel, W - padRight + 2 + pillW / 2, ly + 3.5);
    }
  }, [candles, ma7, ma25, ma99, hoverIdx]);

  // Mouse/touch hover handler
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const W = canvas.offsetWidth;
    const padLeft = 4;
    const padRight = 62;
    const chartW = W - padLeft - padRight;
    const step = chartW / candles.length;
    const idx = Math.floor((x - padLeft) / step);
    if (idx >= 0 && idx < candles.length) {
      setHoverIdx(idx);
    } else {
      setHoverIdx(null);
    }
  };

  const fmt = (n: number) =>
    n >= 10000
      ? n.toFixed(0)
      : n >= 1000
        ? n.toFixed(1)
        : n >= 1
          ? n.toFixed(3)
          : n.toFixed(6);

  const hoveredCandle = hoverIdx !== null ? candles[hoverIdx] : null;

  return (
    <div className="px-3 py-2">
      {/* Timeframe + Indicator row */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-0.5 bg-[#161a20] rounded-lg p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              data-ocid="chart.tab"
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                timeframe === tf
                  ? "bg-[#f0b90b] text-[#0b0e11] shadow"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 ml-auto">
          {(["MA", "EMA", "BOLL", "VOL"] as const).map((ind) => (
            <button
              key={ind}
              type="button"
              data-ocid="chart.toggle"
              onClick={() => setIndicator(ind)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                indicator === ind
                  ? "border-[#f0b90b]/60 text-[#f0b90b] bg-[#f0b90b]/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* MA Legend + 24h Stats */}
      <div className="flex items-center gap-3 mb-2 px-1">
        <span className="flex items-center gap-1 text-[9px] font-mono">
          <span
            className="w-3 h-0.5 inline-block rounded"
            style={{ background: MA7_COLOR }}
          />
          MA7
        </span>
        <span className="flex items-center gap-1 text-[9px] font-mono">
          <span
            className="w-3 h-0.5 inline-block rounded"
            style={{ background: MA25_COLOR }}
          />
          MA25
        </span>
        <span className="flex items-center gap-1 text-[9px] font-mono">
          <span
            className="w-3 h-0.5 inline-block rounded"
            style={{ background: MA99_COLOR }}
          />
          MA99
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider">
              24h H
            </span>
            <span className="text-[10px] font-mono font-semibold text-gain">
              {fmt(high24h)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider">
              24h L
            </span>
            <span className="text-[10px] font-mono font-semibold text-loss">
              {fmt(low24h)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider">
              Vol
            </span>
            <span className="text-[10px] font-mono font-semibold text-foreground">
              {vol24h}M
            </span>
          </div>
        </div>
      </div>

      {/* OHLC hover info strip */}
      <div className="h-5 mb-1 px-1">
        {hoveredCandle ? (
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-muted-foreground">
              O:{" "}
              <span className="text-foreground">{fmt(hoveredCandle.open)}</span>
            </span>
            <span className="text-muted-foreground">
              H: <span className="text-gain">{fmt(hoveredCandle.high)}</span>
            </span>
            <span className="text-muted-foreground">
              L: <span className="text-loss">{fmt(hoveredCandle.low)}</span>
            </span>
            <span className="text-muted-foreground">
              C:{" "}
              <span
                className={
                  hoveredCandle.close >= hoveredCandle.open
                    ? "text-gain"
                    : "text-loss"
                }
              >
                {fmt(hoveredCandle.close)}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gain inline-block animate-pulse" />
            <span className="text-[9px] text-muted-foreground">
              Live candles • hover for OHLC
            </span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        className="rounded-xl overflow-hidden border border-white/5"
        style={{ background: CHART_BG }}
      >
        <canvas
          ref={canvasRef}
          data-ocid="chart.canvas_target"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIdx(null)}
          style={{
            width: "100%",
            height: "280px",
            display: "block",
            cursor: "crosshair",
          }}
        />
      </div>
    </div>
  );
}
