import { useCallback, useEffect, useRef, useState } from "react";
import type { MarketAsset } from "../hooks/useMarketData";

type Timeframe = "1m" | "15m" | "1h" | "4h" | "1D";
type IndicatorType = "MA" | "EMA" | "BOLL" | "VOL" | "RSI";

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

interface LiveAnim {
  fromClose: number;
  fromHigh: number;
  fromLow: number;
  fromVolume: number;
  toClose: number;
  toHigh: number;
  toLow: number;
  toVolume: number;
  startMs: number;
  durationMs: number;
}

interface EntryAnim {
  startMs: number;
  durationMs: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function generateCandles(
  basePrice: number,
  _assetName: string,
  _timeframe: string,
  count = 120,
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

function calcRSI(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period + 1) return result;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    if (delta > 0) avgGain += delta;
    else avgLoss += Math.abs(delta);
  }
  avgGain /= period;
  avgLoss /= period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);
  for (let i = period + 1; i < candles.length; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rs2);
  }
  return result;
}

const TIMEFRAMES: Timeframe[] = ["1m", "15m", "1h", "4h", "1D"];
const GREEN = "#0ecb81";
const RED = "#f6465d";
const GREEN_VOL = "rgba(14,203,129,0.35)";
const RED_VOL = "rgba(246,70,93,0.35)";
const MA7_COLOR = "#f0b90b";
const MA25_COLOR = "#c77dff";
const MA99_COLOR = "#4fc3f7";
const BOLL_COLOR = "rgba(240,185,11,0.7)";
const GRID_COLOR = "rgba(255,255,255,0.055)";
const CHART_BG = "#0b0e11";
const AXIS_COLOR = "rgba(255,255,255,0.22)";
const RSI_COLOR = "#f0b90b";
const RSI_OB_COLOR = "rgba(246,70,93,0.7)";
const RSI_OS_COLOR = "rgba(14,203,129,0.7)";
const MIN_VISIBLE = 10;
const MAX_VISIBLE = 120;

interface Props {
  asset: MarketAsset;
}

export default function CandlestickChart({ asset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("15m");
  const [indicator, setIndicator] = useState<IndicatorType>("MA");
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateCandles(asset.price, asset.name, "15m"),
  );
  const [vol24h] = useState(() => (Math.random() * 500 + 100).toFixed(2));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(MAX_VISIBLE);

  // Refs for RAF loop (avoid stale closures)
  const candlesRef = useRef<Candle[]>(candles);
  const viewStartRef = useRef(0);
  const viewEndRef = useRef(MAX_VISIBLE);
  const hoverIdxRef = useRef<number | null>(null);
  const indicatorRef = useRef<IndicatorType>("MA");

  // Animation refs
  const liveAnimRef = useRef<LiveAnim | null>(null);
  const entryAnimRef = useRef<EntryAnim | null>(null);
  const rafRef = useRef<number | null>(null);

  // Drag/pan state
  const dragRef = useRef<{
    startX: number;
    startViewStart: number;
    startViewEnd: number;
  } | null>(null);
  const touchRef = useRef<{ dist: number; midIdx: number } | null>(null);

  // Sync refs
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);
  useEffect(() => {
    viewStartRef.current = viewStart;
  }, [viewStart]);
  useEffect(() => {
    viewEndRef.current = viewEnd;
  }, [viewEnd]);
  useEffect(() => {
    hoverIdxRef.current = hoverIdx;
  }, [hoverIdx]);
  useEffect(() => {
    indicatorRef.current = indicator;
  }, [indicator]);

  // Timeframe/asset change
  useEffect(() => {
    const newCandles = generateCandles(asset.price, asset.name, timeframe);
    setCandles(newCandles);
    candlesRef.current = newCandles;
    setViewStart(0);
    setViewEnd(newCandles.length);
    viewStartRef.current = 0;
    viewEndRef.current = newCandles.length;
    liveAnimRef.current = null;
    entryAnimRef.current = { startMs: performance.now(), durationMs: 500 };
  }, [asset.price, asset.name, timeframe]);

  // Live update every 3s with smooth lerp target
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
        const existing = liveAnimRef.current;
        const nowMs = performance.now();
        const fromClose = existing
          ? lerp(
              existing.fromClose,
              existing.toClose,
              Math.min(1, (nowMs - existing.startMs) / existing.durationMs),
            )
          : last.close;
        const fromHigh = existing
          ? lerp(
              existing.fromHigh,
              existing.toHigh,
              Math.min(1, (nowMs - existing.startMs) / existing.durationMs),
            )
          : last.high;
        const fromLow = existing
          ? lerp(
              existing.fromLow,
              existing.toLow,
              Math.min(1, (nowMs - existing.startMs) / existing.durationMs),
            )
          : last.low;
        const fromVol = existing
          ? lerp(
              existing.fromVolume,
              existing.toVolume,
              Math.min(1, (nowMs - existing.startMs) / existing.durationMs),
            )
          : last.volume;
        liveAnimRef.current = {
          fromClose,
          fromHigh,
          fromLow,
          fromVolume: fromVol,
          toClose: newClose,
          toHigh: newHigh,
          toLow: newLow,
          toVolume: newVol,
          startMs: nowMs,
          durationMs: 900,
        };
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

  useEffect(() => {
    setViewEnd((ve) => Math.min(ve, candles.length));
    setViewStart((vs) =>
      Math.max(0, Math.min(vs, candles.length - MIN_VISIBLE)),
    );
  }, [candles.length]);

  const clampView = useCallback(
    (start: number, end: number, totalLen: number): [number, number] => {
      const visible = end - start;
      const clampedVisible = Math.max(
        MIN_VISIBLE,
        Math.min(MAX_VISIBLE, visible),
      );
      let s = Math.round(start);
      let e = s + clampedVisible;
      if (e > totalLen) {
        e = totalLen;
        s = e - clampedVisible;
      }
      s = Math.max(0, s);
      e = Math.min(totalLen, s + clampedVisible);
      return [s, e];
    },
    [],
  );

  // RAF draw loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (W === 0 || H === 0) return;
    if (
      canvas.width !== Math.round(W * dpr) ||
      canvas.height !== Math.round(H * dpr)
    ) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.scale(dpr, dpr);
    }

    const now = performance.now();
    const allCandles = candlesRef.current;
    const vStart = viewStartRef.current;
    const vEnd = viewEndRef.current;
    const hovIdx = hoverIdxRef.current;
    const ind = indicatorRef.current;

    let entryT = 1;
    if (entryAnimRef.current) {
      const elapsed = now - entryAnimRef.current.startMs;
      entryT = easeOutCubic(
        Math.min(1, elapsed / entryAnimRef.current.durationMs),
      );
      if (entryT >= 1) entryAnimRef.current = null;
    }

    const rawVisible = allCandles.slice(vStart, vEnd);
    const isLastVisible = vEnd >= allCandles.length;

    const visibleCandles: Candle[] = rawVisible.map((c, i) => {
      const globalIdx = vStart + i;
      const isLast = globalIdx === allCandles.length - 1;
      if (isLast && isLastVisible && liveAnimRef.current) {
        const la = liveAnimRef.current;
        const t = easeOutCubic(Math.min(1, (now - la.startMs) / la.durationMs));
        return {
          ...c,
          close: lerp(la.fromClose, la.toClose, t),
          high: lerp(la.fromHigh, la.toHigh, t),
          low: lerp(la.fromLow, la.toLow, t),
          volume: lerp(la.fromVolume, la.toVolume, t),
        };
      }
      return c;
    });

    ctx.fillStyle = CHART_BG;
    ctx.fillRect(0, 0, W, H);

    const padLeft = 0;
    const padRight = 68;
    const padTop = 10;
    const showRSI = ind === "RSI";
    const rsiPanelH = showRSI ? 65 : 0;
    const volH = Math.floor(H * 0.15);
    const padBottom = volH + rsiPanelH + 22;
    const chartH = H - padTop - padBottom;
    const chartW = W - padLeft - padRight;

    const vc = visibleCandles;
    if (vc.length === 0) return;

    const allPrices = vc.flatMap((c) => [c.high, c.low]);
    const minP = Math.min(...allPrices) * 0.996;
    const maxP = Math.max(...allPrices) * 1.004;
    const priceRange = maxP - minP || 1;

    const toY = (p: number) => {
      const base = padTop + ((maxP - p) / priceRange) * chartH;
      if (entryT >= 1) return base;
      const midY = padTop + chartH / 2;
      return lerp(midY, base, entryT);
    };

    const maxVol = Math.max(...vc.map((c) => c.volume));
    const volAreaY = padTop + chartH + 4;
    const toVolH = (v: number) =>
      Math.max(1, (v / maxVol) * (volH - 4)) * (entryT < 1 ? entryT : 1);

    const totalVisible = vc.length;
    const step = chartW / totalVisible;
    const rawCandleW = step * 0.72;
    const candleW = Math.max(1.5, Math.min(rawCandleW, 12));
    const toX = (localIdx: number) => padLeft + localIdx * step + step / 2;
    const toLocalIdx = (globalIdx: number) => globalIdx - vStart;

    const ma7 = calcMA(allCandles, 7);
    const ma25 = calcMA(allCandles, 25);
    const ma99 = calcMA(allCandles, 99);
    const ema12 = calcEMA(allCandles, 12);
    const ema26 = calcEMA(allCandles, 26);
    const boll = calcBollinger(allCandles, 20);
    const rsi14 = calcRSI(allCandles, 14);

    // Grid
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
      ctx.fillStyle = AXIS_COLOR;
      ctx.font = "10px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(formatPrice(price), W - padRight + 6, y + 3.5);
    }

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W - padRight, padTop);
    ctx.lineTo(W - padRight, padTop + chartH + volH + 4 + rsiPanelH);
    ctx.stroke();

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(padLeft, volAreaY);
    ctx.lineTo(W - padRight, volAreaY);
    ctx.stroke();

    // Volume bars
    for (const [i, c] of vc.entries()) {
      const x = toX(i);
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

    // RSI panel
    if (showRSI) {
      const rsiAreaY = volAreaY + volH + 4;
      const rsiH = rsiPanelH - 8;
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(padLeft, rsiAreaY);
      ctx.lineTo(W - padRight, rsiAreaY);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "8px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("RSI(14)", 4, rsiAreaY + 10);
      const toRsiY = (v: number) => rsiAreaY + ((100 - v) / 100) * rsiH;
      ctx.strokeStyle = RSI_OB_COLOR;
      ctx.lineWidth = 0.7;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padLeft, toRsiY(70));
      ctx.lineTo(W - padRight, toRsiY(70));
      ctx.stroke();
      ctx.strokeStyle = RSI_OS_COLOR;
      ctx.beginPath();
      ctx.moveTo(padLeft, toRsiY(30));
      ctx.lineTo(W - padRight, toRsiY(30));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = RSI_OB_COLOR;
      ctx.font = "8px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("70", W - padRight + 4, toRsiY(70) + 3);
      ctx.fillStyle = RSI_OS_COLOR;
      ctx.fillText("30", W - padRight + 4, toRsiY(30) + 3);
      ctx.strokeStyle = RSI_COLOR;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([]);
      ctx.beginPath();
      let rsiStarted = false;
      for (let i = 0; i < vc.length; i++) {
        const rsiVal = rsi14[vStart + i];
        if (rsiVal === null) continue;
        const x = toX(i);
        const y = toRsiY(rsiVal);
        if (!rsiStarted) {
          ctx.moveTo(x, y);
          rsiStarted = true;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Bollinger fill
    if (ind === "BOLL") {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < vc.length; i++) {
        const gi = vStart + i;
        if (boll.upper[gi] === null) continue;
        const x = toX(i);
        if (!started) {
          ctx.moveTo(x, toY(boll.upper[gi]!));
          started = true;
        } else ctx.lineTo(x, toY(boll.upper[gi]!));
      }
      for (let i = vc.length - 1; i >= 0; i--) {
        const gi = vStart + i;
        if (boll.lower[gi] === null) continue;
        ctx.lineTo(toX(i), toY(boll.lower[gi]!));
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(240,185,11,0.05)";
      ctx.fill();
    }

    // Candles
    for (const [i, c] of vc.entries()) {
      const x = toX(i);
      const isGreen = c.close >= c.open;
      const bodyColor = isGreen ? GREEN : RED;
      const globalIdx = vStart + i;
      const isHovered = hovIdx === globalIdx;
      const isLast = globalIdx === allCandles.length - 1;

      let alphaScale = 1;
      if (entryT < 1) {
        const staggerT = Math.max(0, entryT * 1.4 - (i / vc.length) * 0.4);
        alphaScale = Math.min(1, staggerT);
      }
      ctx.globalAlpha = alphaScale;

      if (isHovered) {
        ctx.fillStyle = "rgba(255,255,255,0.035)";
        ctx.fillRect(x - step / 2, padTop, step, chartH + volH + 4);
      }

      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = Math.max(0.8, candleW < 4 ? 0.8 : 1);
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

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
        if (isLast && isLastVisible) {
          ctx.strokeStyle = isGreen
            ? "rgba(14,203,129,0.8)"
            : "rgba(246,70,93,0.8)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Indicator lines
    const drawLineVisible = (
      data: (number | null)[],
      color: string,
      width = 1.2,
      dash?: number[],
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash ?? []);
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < vc.length; i++) {
        const v = data[vStart + i];
        if (v === null) continue;
        const x = toX(i);
        const y = toY(v);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (entryT > 0.3) {
      ctx.globalAlpha = Math.min(1, (entryT - 0.3) / 0.4);
      if (ind === "MA") {
        drawLineVisible(ma7, MA7_COLOR, 1.4);
        drawLineVisible(ma25, MA25_COLOR, 1.4);
        drawLineVisible(ma99, MA99_COLOR, 1.4);
      } else if (ind === "EMA") {
        drawLineVisible(ema12, MA7_COLOR, 1.4);
        drawLineVisible(ema26, MA25_COLOR, 1.4);
      } else if (ind === "BOLL") {
        drawLineVisible(boll.upper, BOLL_COLOR, 1.2);
        drawLineVisible(boll.mid, "rgba(240,185,11,0.5)", 1, [4, 3]);
        drawLineVisible(boll.lower, BOLL_COLOR, 1.2);
      }
      ctx.globalAlpha = 1;
    }

    // Crosshair
    if (hovIdx !== null && hovIdx >= vStart && hovIdx < vEnd) {
      const c = allCandles[hovIdx];
      const localI = toLocalIdx(hovIdx);
      const x = toX(localI);
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

    // X-axis labels
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "9px 'Inter', sans-serif";
    ctx.textAlign = "center";
    const labelStep = Math.max(1, Math.floor(totalVisible / 7));
    for (const [i, c] of vc.entries()) {
      const gi = vStart + i;
      if (i % labelStep !== 0 || (hovIdx !== null && Math.abs(hovIdx - gi) < 3))
        continue;
      const x = toX(i);
      const d = new Date(c.time);
      const label = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      ctx.fillText(label, x, H - 6);
    }

    // Last price line + pill
    const lastGlobalCandle = allCandles[allCandles.length - 1];
    if (lastGlobalCandle && isLastVisible) {
      let animClose = lastGlobalCandle.close;
      if (liveAnimRef.current) {
        const la = liveAnimRef.current;
        const t = easeOutCubic(Math.min(1, (now - la.startMs) / la.durationMs));
        animClose = lerp(la.fromClose, la.toClose, t);
      }
      const ly = toY(animClose);
      const isGreen2 = animClose >= lastGlobalCandle.open;
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
      const lPriceLabel = formatPrice(animClose);
      const pillW = padRight - 4;
      ctx.fillStyle = isGreen2 ? GREEN : RED;
      roundRect(ctx, W - padRight + 2, ly - 9, pillW, 18, 3);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9.5px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lPriceLabel, W - padRight + 2 + pillW / 2, ly + 3.8);
    }
  }, []);

  // Start RAF loop
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [drawFrame]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const frac = mouseX / rect.width;
      const vs = viewStartRef.current;
      const ve = viewEndRef.current;
      const totalLen = candlesRef.current.length;
      const visible = ve - vs;
      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88;
      const newVisible = Math.round(visible * zoomFactor);
      const clampedVisible = Math.max(
        MIN_VISIBLE,
        Math.min(totalLen, newVisible),
      );
      const anchorIdx = vs + frac * visible;
      const newStart = Math.round(anchorIdx - frac * clampedVisible);
      const [cs, ce] = clampView(newStart, newStart + clampedVisible, totalLen);
      setViewStart(cs);
      setViewEnd(ce);
      viewStartRef.current = cs;
      viewEndRef.current = ce;
    },
    [clampView],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch") return;
    dragRef.current = {
      startX: e.clientX,
      startViewStart: viewStartRef.current,
      startViewEnd: viewEndRef.current,
    };
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current && e.pointerType !== "touch") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dx = e.clientX - dragRef.current.startX;
      const W = canvas.offsetWidth;
      const visible =
        dragRef.current.startViewEnd - dragRef.current.startViewStart;
      const step = W / visible;
      const candleShift = Math.round(-dx / step);
      const [cs, ce] = clampView(
        dragRef.current.startViewStart + candleShift,
        dragRef.current.startViewEnd + candleShift,
        candlesRef.current.length,
      );
      setViewStart(cs);
      setViewEnd(ce);
      viewStartRef.current = cs;
      viewEndRef.current = ce;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const W = canvas.offsetWidth;
    const padRight = 68;
    const chartW = W - padRight;
    const vs = viewStartRef.current;
    const ve = viewEndRef.current;
    const visibleCount = ve - vs;
    const step = chartW / visibleCount;
    const idx = vs + Math.floor(x / step);
    const newHover = idx >= vs && idx < ve ? idx : null;
    setHoverIdx(newHover);
    hoverIdxRef.current = newHover;
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const midX =
        ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) /
        rect.width;
      const vs = viewStartRef.current;
      const ve = viewEndRef.current;
      touchRef.current = { dist, midIdx: vs + midX * (ve - vs) };
    } else if (e.touches.length === 1) {
      dragRef.current = {
        startX: e.touches[0].clientX,
        startViewStart: viewStartRef.current,
        startViewEnd: viewEndRef.current,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const totalLen = candlesRef.current.length;
    if (e.touches.length === 2 && touchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const ratio = touchRef.current.dist / newDist;
      const vs = viewStartRef.current;
      const ve = viewEndRef.current;
      const visible = ve - vs;
      const newVisible = Math.max(
        MIN_VISIBLE,
        Math.min(totalLen, Math.round(visible * ratio)),
      );
      const frac = (touchRef.current.midIdx - vs) / visible;
      const newStart = Math.round(touchRef.current.midIdx - frac * newVisible);
      const [cs, ce] = clampView(newStart, newStart + newVisible, totalLen);
      setViewStart(cs);
      setViewEnd(ce);
      viewStartRef.current = cs;
      viewEndRef.current = ce;
      touchRef.current.dist = newDist;
    } else if (e.touches.length === 1 && dragRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const W = canvas.offsetWidth;
      const visible =
        dragRef.current.startViewEnd - dragRef.current.startViewStart;
      const step = W / visible;
      const candleShift = Math.round(-dx / step);
      const [cs, ce] = clampView(
        dragRef.current.startViewStart + candleShift,
        dragRef.current.startViewEnd + candleShift,
        totalLen,
      );
      setViewStart(cs);
      setViewEnd(ce);
      viewStartRef.current = cs;
      viewEndRef.current = ce;
    }
  };

  const handleTouchEnd = () => {
    touchRef.current = null;
    dragRef.current = null;
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
  const rsiDisplayIdx = hoverIdx ?? candles.length - 1;
  const rsi14Display = calcRSI(candles, 14);
  const rsiDisplayVal = rsi14Display[rsiDisplayIdx];
  const visibleCount = viewEnd - viewStart;
  const isZoomed = visibleCount < candles.length;
  const high24h = asset.price * (1 + Math.abs(asset.change24h) / 100 + 0.005);
  const low24h = asset.price * (1 - Math.abs(asset.change24h) / 100 - 0.003);

  return (
    <div className="px-2 py-2">
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
              {indicator === "RSI" && rsiDisplayVal !== null && (
                <span className="text-muted-foreground/70">
                  RSI{" "}
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        rsiDisplayVal > 70
                          ? "#f6465d"
                          : rsiDisplayVal < 30
                            ? "#0ecb81"
                            : "#f0b90b",
                    }}
                  >
                    {rsiDisplayVal.toFixed(1)}
                  </span>
                </span>
              )}
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

      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="flex items-center gap-0.5 bg-[#161a20] rounded-lg p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              data-ocid="chart.tab"
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${timeframe === tf ? "bg-[#f0b90b] text-[#0b0e11]" : "text-muted-foreground hover:text-white"}`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 bg-[#161a20] rounded-lg p-0.5 ml-auto">
          {(["MA", "EMA", "BOLL", "VOL", "RSI"] as IndicatorType[]).map(
            (ind) => (
              <button
                key={ind}
                type="button"
                data-ocid="chart.toggle"
                onClick={() => setIndicator(ind)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all ${indicator === ind ? "bg-[#2b2f36] text-[#f0b90b]" : "text-muted-foreground hover:text-foreground"}`}
              >
                {ind}
              </button>
            ),
          )}
        </div>
      </div>

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
      {indicator === "RSI" && (
        <div className="flex items-center gap-3 mb-1.5 px-1">
          <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
            <span
              className="w-4 h-[2px] inline-block rounded"
              style={{ background: RSI_COLOR }}
            />
            RSI(14)
          </span>
          <span
            className="flex items-center gap-1 text-[9px] font-mono"
            style={{ color: RSI_OB_COLOR }}
          >
            — 70 OB
          </span>
          <span
            className="flex items-center gap-1 text-[9px] font-mono"
            style={{ color: RSI_OS_COLOR }}
          >
            — 30 OS
          </span>
        </div>
      )}

      {isZoomed && (
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <span className="text-[9px] text-muted-foreground/50 font-mono">
            Showing {visibleCount} of {candles.length} candles
          </span>
          <button
            type="button"
            data-ocid="chart.button"
            onClick={() => {
              setViewStart(0);
              setViewEnd(candles.length);
              viewStartRef.current = 0;
              viewEndRef.current = candles.length;
            }}
            className="text-[9px] text-[#f0b90b] hover:text-[#f0b90b]/80 font-mono ml-1 underline underline-offset-2"
          >
            Reset
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden"
        style={{
          background: CHART_BG,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <canvas
          ref={canvasRef}
          data-ocid="chart.canvas_target"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            setHoverIdx(null);
            hoverIdxRef.current = null;
            dragRef.current = null;
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            width: "100%",
            height: indicator === "RSI" ? "380px" : "320px",
            display: "block",
            cursor: "crosshair",
            touchAction: "none",
          }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0ecb81] inline-block animate-pulse" />
          <span className="text-[9px] text-muted-foreground/60">
            Live • updates every 3s
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground/40 font-mono">
          Scroll to zoom • Drag to pan
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
