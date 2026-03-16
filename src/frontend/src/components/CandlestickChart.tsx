import { useEffect, useRef, useState } from "react";
import type { MarketAsset } from "../hooks/useMarketData";

type Timeframe = "1m" | "15m" | "1h" | "4h" | "1D";
type IndicatorType = "MA" | "EMA" | "BOLL" | "VOL";

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
  count = 80,
): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Date.now();
  let trend = 0;
  for (let i = count - 1; i >= 0; i--) {
    trend += (Math.random() - 0.5) * 0.3;
    trend = Math.max(-1, Math.min(1, trend));
    const open = price;
    const change = (Math.random() - 0.5 + trend * 0.1) * price * 0.018;
    const close = Math.max(open + change, 0.0001);
    const wickUp = price * (0.003 + Math.random() * 0.008);
    const wickDown = price * (0.003 + Math.random() * 0.008);
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    const volume =
      (Math.random() * 0.8 + 0.2) *
      1000000 *
      (1 + Math.abs(change / price) * 20);
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

function calcEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const k = 2 / (period + 1);
  let ema: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue;
    if (ema === null) {
      ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
    } else {
      ema = candles[i].close * k + ema * (1 - k);
    }
    result[i] = ema;
  }
  return result;
}

function calcBollinger(
  candles: Candle[],
  period = 20,
): {
  mid: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
} {
  const mid = calcMA(candles, period);
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const m = mid[i]!;
    const variance = slice.reduce((s, c) => s + (c.close - m) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper[i] = m + 2 * std;
    lower[i] = m - 2 * std;
  }
  return { mid, upper, lower };
}

const TIMEFRAMES: Timeframe[] = ["1m", "15m", "1h", "4h", "1D"];
const GREEN = "#0ecb81";
const RED = "#f6465d";
const GREEN_BODY = "#0ecb81";
const RED_BODY = "#f6465d";
const GREEN_VOL = "rgba(14,203,129,0.35)";
const RED_VOL = "rgba(246,70,93,0.35)";
const MA7_COLOR = "#f0b90b";
const MA25_COLOR = "#c77dff";
const MA99_COLOR = "#4fc3f7";
const BOLL_COLOR = "rgba(240,185,11,0.7)";
const GRID_COLOR = "rgba(255,255,255,0.055)";
const CHART_BG = "#0b0e11";
const AXIS_COLOR = "rgba(255,255,255,0.22)";

interface Props {
  asset: MarketAsset;
}

export default function CandlestickChart({ asset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [indicator, setIndicator] = useState<IndicatorType>("MA");
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateCandles(asset.price, asset.name, "15m"),
  );
  const [vol24h] = useState(() => (Math.random() * 500 + 100).toFixed(2));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const assetName = asset.name;
  const assetPrice = asset.price;

  useEffect(() => {
    setCandles(generateCandles(assetPrice, assetName, timeframe));
  }, [assetPrice, assetName, timeframe]);

  // Live candle update every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setCandles((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.49) * last.close * 0.008;
        const newClose = Math.max(last.close + change, 0.0001);
        const newHigh = Math.max(last.high, newClose);
        const newLow = Math.min(last.low, newClose);
        const newVol = last.volume + Math.random() * 5000;
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            close: newClose,
            high: newHigh,
            low: newLow,
            volume: newVol,
          },
        ];
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const ma7 = calcMA(candles, 7);
  const ma25 = calcMA(candles, 25);
  const ma99 = calcMA(candles, 99);
  const ema12 = calcEMA(candles, 12);
  const ema26 = calcEMA(candles, 26);
  const boll = calcBollinger(candles, 20);

  const high24h = asset.price * (1 + Math.abs(asset.change24h) / 100 + 0.005);
  const low24h = asset.price * (1 - Math.abs(asset.change24h) / 100 - 0.003);

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

    ctx.fillStyle = CHART_BG;
    ctx.fillRect(0, 0, W, H);

    const padLeft = 0;
    const padRight = 68;
    const padTop = 10;
    const volH = Math.floor(H * 0.17);
    const padBottom = volH + 22;
    const chartH = H - padTop - padBottom;
    const chartW = W - padLeft - padRight;

    // Price range with 3% padding
    const allPrices = candles.flatMap((c) => [c.high, c.low]);
    const minP = Math.min(...allPrices) * 0.996;
    const maxP = Math.max(...allPrices) * 1.004;
    const priceRange = maxP - minP || 1;
    const toY = (p: number) => padTop + ((maxP - p) / priceRange) * chartH;

    const maxVol = Math.max(...candles.map((c) => c.volume));
    const volAreaY = padTop + chartH + 4;
    const toVolH = (v: number) => Math.max(1, (v / maxVol) * (volH - 4));

    const totalCandles = candles.length;
    const step = chartW / totalCandles;
    const rawCandleW = step * 0.72;
    const candleW = Math.max(1.5, Math.min(rawCandleW, 12));

    // ---- Horizontal Grid Lines ----
    const gridLines = 5;
    for (let g = 0; g <= gridLines; g++) {
      const y = padTop + (g / gridLines) * chartH;
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(W - padRight, y);
      ctx.stroke();

      const price = maxP - (g / gridLines) * priceRange;
      const label = formatPrice(price);
      ctx.fillStyle = AXIS_COLOR;
      ctx.font = `10px 'Inter', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(label, W - padRight + 6, y + 3.5);
    }

    // Right axis border line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W - padRight, padTop);
    ctx.lineTo(W - padRight, padTop + chartH + volH + 4);
    ctx.stroke();

    // Volume separator
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(padLeft, volAreaY);
    ctx.lineTo(W - padRight, volAreaY);
    ctx.stroke();

    // ---- Volume bars ----
    for (const [i, c] of candles.entries()) {
      const x = padLeft + i * step + step / 2;
      const isGreen = c.close >= c.open;
      const bH = toVolH(c.volume);
      ctx.fillStyle = isGreen ? GREEN_VOL : RED_VOL;
      ctx.fillRect(
        x - candleW / 2,
        volAreaY + (volH - 4) - bH + 2,
        candleW,
        bH,
      );
    }

    // ---- Bollinger Band fill ----
    if (indicator === "BOLL") {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < candles.length; i++) {
        if (boll.upper[i] === null) continue;
        const x = padLeft + i * step + step / 2;
        if (!started) {
          ctx.moveTo(x, toY(boll.upper[i]!));
          started = true;
        } else ctx.lineTo(x, toY(boll.upper[i]!));
      }
      for (let i = candles.length - 1; i >= 0; i--) {
        if (boll.lower[i] === null) continue;
        const x = padLeft + i * step + step / 2;
        ctx.lineTo(x, toY(boll.lower[i]!));
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(240,185,11,0.05)";
      ctx.fill();
    }

    // ---- Candle bodies + wicks ----
    for (const [i, c] of candles.entries()) {
      const x = padLeft + i * step + step / 2;
      const isGreen = c.close >= c.open;
      const bodyColor = isGreen ? GREEN_BODY : RED_BODY;
      const isHovered = hoverIdx === i;
      const isLast = i === candles.length - 1;

      if (isHovered) {
        ctx.fillStyle = "rgba(255,255,255,0.035)";
        ctx.fillRect(x - step / 2, padTop, step, chartH + volH + 4);
      }

      // Wick
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = Math.max(0.8, candleW < 4 ? 0.8 : 1);
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyBottom = toY(Math.min(c.open, c.close));
      const bodyH = Math.max(1, bodyBottom - bodyTop);

      if (candleW < 3) {
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = candleW;
        ctx.beginPath();
        ctx.moveTo(x, bodyTop);
        ctx.lineTo(x, bodyTop + bodyH);
        ctx.stroke();
      } else {
        ctx.fillStyle = bodyColor;
        ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
        // Slight inner highlight for last/active candle
        if (isLast) {
          ctx.strokeStyle = isGreen
            ? "rgba(14,203,129,0.8)"
            : "rgba(246,70,93,0.8)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH);
        }
      }
    }

    // ---- Indicator lines ----
    const drawLine = (
      data: (number | null)[],
      color: string,
      width = 1.2,
      dash?: number[],
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash);
      else ctx.setLineDash([]);
      ctx.beginPath();
      let started = false;
      for (const [i, v] of data.entries()) {
        if (v === null) continue;
        const x = padLeft + i * step + step / 2;
        const y = toY(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (indicator === "MA") {
      drawLine(ma7, MA7_COLOR, 1.4);
      drawLine(ma25, MA25_COLOR, 1.4);
      drawLine(ma99, MA99_COLOR, 1.4);
    } else if (indicator === "EMA") {
      drawLine(ema12, MA7_COLOR, 1.4);
      drawLine(ema26, MA25_COLOR, 1.4);
    } else if (indicator === "BOLL") {
      drawLine(boll.upper, BOLL_COLOR, 1.2);
      drawLine(boll.mid, "rgba(240,185,11,0.5)", 1, [4, 3]);
      drawLine(boll.lower, BOLL_COLOR, 1.2);
    }

    // ---- Crosshair ----
    if (hoverIdx !== null && hoverIdx >= 0 && hoverIdx < candles.length) {
      const c = candles[hoverIdx];
      const x = padLeft + hoverIdx * step + step / 2;
      const closeY = toY(c.close);

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 0.7;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + chartH + volH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padLeft, closeY);
      ctx.lineTo(W - padRight, closeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price pill on right axis
      const priceLabel = formatPrice(c.close);
      const pillW = padRight - 4;
      const isGreen = c.close >= c.open;
      ctx.fillStyle = isGreen ? GREEN : RED;
      roundRect(ctx, W - padRight + 2, closeY - 9, pillW, 18, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9.5px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(priceLabel, W - padRight + 2 + pillW / 2, closeY + 3.8);

      // Time pill at bottom
      const d = new Date(c.time);
      const timeLabel = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      const timePillW = 38;
      ctx.fillStyle = "rgba(50,55,65,0.92)";
      roundRect(ctx, x - timePillW / 2, H - 18, timePillW, 14, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "9px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(timeLabel, x, H - 7);
    }

    // ---- X-axis time labels ----
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "9px 'Inter', sans-serif";
    ctx.textAlign = "center";
    const labelStep = Math.max(1, Math.floor(totalCandles / 7));
    for (const [i, c] of candles.entries()) {
      if (
        i % labelStep !== 0 ||
        (hoverIdx !== null && Math.abs(hoverIdx - i) < 3)
      )
        continue;
      const x = padLeft + i * step + step / 2;
      const d = new Date(c.time);
      const label = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      ctx.fillText(label, x, H - 6);
    }

    // ---- Last price dashed line ----
    const lastCandle = candles[candles.length - 1];
    if (lastCandle) {
      const ly = toY(lastCandle.close);
      const isGreen2 = lastCandle.close >= lastCandle.open;
      ctx.strokeStyle = isGreen2
        ? "rgba(14,203,129,0.5)"
        : "rgba(246,70,93,0.5)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, ly);
      ctx.lineTo(W - padRight, ly);
      ctx.stroke();
      ctx.setLineDash([]);

      // Last price pill
      const lPriceLabel = formatPrice(lastCandle.close);
      const pillW = padRight - 4;
      ctx.fillStyle = isGreen2 ? GREEN : RED;
      roundRect(ctx, W - padRight + 2, ly - 9, pillW, 18, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9.5px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lPriceLabel, W - padRight + 2 + pillW / 2, ly + 3.8);
    }
  }, [candles, ma7, ma25, ma99, ema12, ema26, boll, hoverIdx, indicator]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const W = canvas.offsetWidth;
    const padRight = 68;
    const chartW = W - padRight;
    const step = chartW / candles.length;
    const idx = Math.floor(x / step);
    setHoverIdx(idx >= 0 && idx < candles.length ? idx : null);
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
  const displayCandle = hoveredCandle ?? candles[candles.length - 1];
  const isUp = displayCandle ? displayCandle.close >= displayCandle.open : true;

  return (
    <div className="px-2 py-2">
      {/* Header row: OHLC + 24h stats */}
      <div className="flex items-start justify-between mb-2 px-1">
        <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap">
          {displayCandle && (
            <>
              <span className="text-muted-foreground/70">
                O{" "}
                <span className={isUp ? "text-[#0ecb81]" : "text-[#f6465d]"}>
                  {fmt(displayCandle.open)}
                </span>
              </span>
              <span className="text-muted-foreground/70">
                H{" "}
                <span className="text-[#0ecb81]">
                  {fmt(displayCandle.high)}
                </span>
              </span>
              <span className="text-muted-foreground/70">
                L{" "}
                <span className="text-[#f6465d]">{fmt(displayCandle.low)}</span>
              </span>
              <span className="text-muted-foreground/70">
                C{" "}
                <span className={isUp ? "text-[#0ecb81]" : "text-[#f6465d]"}>
                  {fmt(displayCandle.close)}
                </span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono shrink-0">
          <span className="text-muted-foreground/60">
            H{" "}
            <span className="text-[#0ecb81] font-semibold">{fmt(high24h)}</span>
          </span>
          <span className="text-muted-foreground/60">
            L{" "}
            <span className="text-[#f6465d] font-semibold">{fmt(low24h)}</span>
          </span>
          <span className="text-muted-foreground/60">
            V <span className="text-foreground/70">{vol24h}M</span>
          </span>
        </div>
      </div>

      {/* Timeframe + Indicator row */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="flex items-center gap-0.5 bg-[#161a20] rounded-lg p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              data-ocid="chart.tab"
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                timeframe === tf
                  ? "bg-[#f0b90b] text-[#0b0e11]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator tabs */}
        <div className="flex items-center gap-0.5 bg-[#161a20] rounded-lg p-0.5 ml-auto">
          {(["MA", "EMA", "BOLL", "VOL"] as IndicatorType[]).map((ind) => (
            <button
              key={ind}
              type="button"
              data-ocid="chart.toggle"
              onClick={() => setIndicator(ind)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                indicator === ind
                  ? "bg-[#2b2f36] text-[#f0b90b]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* MA Legend */}
      {indicator === "MA" && (
        <div className="flex items-center gap-3 mb-1.5 px-1">
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <span
              className="w-4 h-[2px] inline-block rounded"
              style={{ background: MA7_COLOR }}
            />
            MA(7)
          </span>
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <span
              className="w-4 h-[2px] inline-block rounded"
              style={{ background: MA25_COLOR }}
            />
            MA(25)
          </span>
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <span
              className="w-4 h-[2px] inline-block rounded"
              style={{ background: MA99_COLOR }}
            />
            MA(99)
          </span>
        </div>
      )}
      {indicator === "EMA" && (
        <div className="flex items-center gap-3 mb-1.5 px-1">
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <span
              className="w-4 h-[2px] inline-block rounded"
              style={{ background: MA7_COLOR }}
            />
            EMA(12)
          </span>
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <span
              className="w-4 h-[2px] inline-block rounded"
              style={{ background: MA25_COLOR }}
            />
            EMA(26)
          </span>
        </div>
      )}
      {indicator === "BOLL" && (
        <div className="flex items-center gap-3 mb-1.5 px-1">
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <span
              className="w-4 h-[2px] inline-block rounded"
              style={{ background: BOLL_COLOR }}
            />
            BOLL(20,2)
          </span>
        </div>
      )}

      {/* Canvas */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: CHART_BG,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <canvas
          ref={canvasRef}
          data-ocid="chart.canvas_target"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIdx(null)}
          style={{
            width: "100%",
            height: "320px",
            display: "block",
            cursor: "crosshair",
          }}
        />
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 mt-1.5 px-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] inline-block animate-pulse" />
        <span className="text-[9px] text-muted-foreground/60">
          Live • updates every 3s
        </span>
      </div>
    </div>
  );
}

function formatPrice(n: number): string {
  if (n >= 100000) return n.toFixed(0);
  if (n >= 10000) return n.toFixed(1);
  if (n >= 1000) return n.toFixed(2);
  if (n >= 100) return n.toFixed(2);
  if (n >= 10) return n.toFixed(3);
  if (n >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
