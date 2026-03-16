import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type TaxTransaction, useTaxBalance } from "@/hooks/useTaxBalance";
import {
  AlertCircle,
  ArrowRightLeft,
  Bitcoin,
  Building,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Globe,
  History,
  Loader2,
  Lock,
  Receipt,
  Repeat,
  ShieldAlert,
  Smartphone,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { AssetType, Variant_buy_sell } from "../backend";
import { useCreateCheckoutSession } from "../hooks/useCheckout";
import { useCurrency } from "../hooks/useCurrency";
import { useMarketData } from "../hooks/useMarketData";
import { usePlaceTrade, usePortfolio } from "../hooks/useQueries";

function generateRef() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ── Market Convert ────────────────────────────────────────────────────────────
function MarketConvert() {
  const { data: portfolio } = usePortfolio();
  const { assets, getPrice } = useMarketData();
  const { format } = useCurrency();
  const placeTrade = usePlaceTrade();

  const [fromAsset, setFromAsset] = useState("");
  const [toAsset, setToAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const holdings = portfolio?.holdings ?? [];
  const fromHolding = holdings.find(([name]) => name === fromAsset);
  const fromQty = fromHolding ? fromHolding[1] : 0;

  const fromAssetData = assets.find((a) => a.name === fromAsset);
  const toAssetData = assets.find((a) => a.name === toAsset);

  const fromPrice = fromAsset ? getPrice(fromAsset) : 0;
  const toPrice = toAsset ? getPrice(toAsset) : 0;

  const receiveAmount = useMemo(() => {
    const amt = Number(amount);
    if (!amt || !fromAsset || !toAsset) return null;
    if (!toPrice) return null;
    return (amt * fromPrice) / toPrice;
  }, [amount, fromAsset, toAsset, fromPrice, toPrice]);

  const feeAmount = useMemo(() => {
    const amt = Number(amount);
    if (!amt || !fromPrice) return null;
    return amt * fromPrice * 0.001;
  }, [amount, fromPrice]);

  const handleSwap = () => {
    const prev = fromAsset;
    setFromAsset(toAsset);
    setToAsset(prev);
    setAmount("");
  };

  const applyPct = (pct: number) => {
    if (!fromQty) return;
    setAmount(((fromQty * pct) / 100).toFixed(6));
  };

  const handleConvert = async () => {
    setError("");
    const amt = Number(amount);
    if (!fromAsset || !toAsset || !amt || amt <= 0) {
      setError("Please fill all fields.");
      return;
    }
    if (amt > fromQty) {
      setError("Amount exceeds holding.");
      return;
    }
    if (!fromAssetData || !toAssetData || !receiveAmount) {
      setError("Invalid assets selected.");
      return;
    }
    try {
      await Promise.all([
        placeTrade.mutateAsync({
          asset: fromAsset,
          assetType: fromAssetData.type,
          tradeType: Variant_buy_sell.sell,
          amount: amt,
        }),
        placeTrade.mutateAsync({
          asset: toAsset,
          assetType: toAssetData.type,
          tradeType: Variant_buy_sell.buy,
          amount: receiveAmount,
        }),
      ]);
      setSuccess(true);
      setAmount("");
    } catch (_e) {
      setError("Conversion failed. Please try again.");
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 py-8"
        data-ocid="convert.success_state"
      >
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            Conversion Successful
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your assets have been converted.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setSuccess(false);
            setFromAsset("");
            setToAsset("");
            setAmount("");
          }}
          data-ocid="convert.secondary_button"
        >
          Convert Again
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* From */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          From
        </Label>
        <Select value={fromAsset} onValueChange={setFromAsset}>
          <SelectTrigger
            data-ocid="convert.from.select"
            className="bg-card border-border"
          >
            <SelectValue placeholder="Select asset to sell" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {holdings.length === 0 && (
              <SelectItem value="__empty" disabled>
                No holdings yet
              </SelectItem>
            )}
            {holdings.map(([name, qty]) => (
              <SelectItem key={name} value={name}>
                {name} — {qty.toFixed(4)} units
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            Amount
          </Label>
          {fromAsset && (
            <span className="text-xs text-muted-foreground">
              Available: {fromQty.toFixed(4)}
            </span>
          )}
        </div>
        <Input
          data-ocid="convert.amount.input"
          type="number"
          placeholder="0.00"
          min={0}
          max={fromQty}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-card border-border font-mono"
        />
        {/* Quick % buttons */}
        <div className="flex gap-2">
          {[25, 50, 75].map((pct) => (
            <button
              key={pct}
              type="button"
              data-ocid={`convert.quick_pct_${pct}.button`}
              onClick={() => applyPct(pct)}
              className="flex-1 text-xs py-1.5 rounded-md bg-muted/60 border border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors font-medium"
            >
              {pct}%
            </button>
          ))}
          <button
            type="button"
            data-ocid="convert.quick_pct_max.button"
            onClick={() => applyPct(100)}
            className="flex-1 text-xs py-1.5 rounded-md bg-muted/60 border border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors font-medium"
          >
            Max
          </button>
        </div>
      </div>

      {/* Swap button */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          data-ocid="convert.swap.button"
          onClick={handleSwap}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-border rounded-full px-3 py-1.5 bg-card hover:border-primary/40"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Swap
        </button>
      </div>

      {/* Live rate */}
      {fromAsset && toAsset && fromPrice > 0 && toPrice > 0 && (
        <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Live Rate</span>
          <span className="text-xs font-mono font-medium text-foreground">
            1 {fromAsset} = {(fromPrice / toPrice).toFixed(6)} {toAsset}
          </span>
        </div>
      )}

      {/* To */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          To
        </Label>
        <Select value={toAsset} onValueChange={setToAsset}>
          <SelectTrigger
            data-ocid="convert.to.select"
            className="bg-card border-border"
          >
            <SelectValue placeholder="Select asset to receive" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {assets
              .filter((a) => a.name !== fromAsset)
              .map((a) => (
                <SelectItem key={a.name} value={a.name}>
                  {a.name} — {a.displayLabel}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Slippage tolerance */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Slippage Tolerance
        </Label>
        <div className="flex gap-2">
          {["0.1", "0.5", "1.0"].map((s) => (
            <button
              key={s}
              type="button"
              data-ocid={`convert.slippage_${s.replace(".", "")}.toggle`}
              onClick={() => setSlippage(s)}
              className={`flex-1 text-xs py-1.5 rounded-md border transition-colors font-medium ${
                slippage === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/60 border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              }`}
            >
              {s}%
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <AnimatePresence>
        {receiveAmount !== null && toAsset && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                You receive ~
              </span>
              <span className="text-sm font-bold text-primary font-mono">
                {receiveAmount.toFixed(6)} {toAsset}
              </span>
            </div>
            {feeAmount !== null && (
              <div className="flex items-center justify-between border-t border-primary/10 pt-2">
                <span className="text-xs text-muted-foreground">
                  Estimated Fee (0.1%)
                </span>
                <span className="text-xs font-mono text-yellow-400">
                  {format(feeAmount)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div
          data-ocid="convert.error_state"
          className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        data-ocid="convert.primary_button"
        onClick={handleConvert}
        disabled={placeTrade.isPending || !fromAsset || !toAsset || !amount}
        className="w-full"
      >
        {placeTrade.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Converting...
          </>
        ) : (
          "Convert Now"
        )}
      </Button>
    </div>
  );
}

// ── Limit Order Tab ───────────────────────────────────────────────────────────
interface LimitOrder {
  id: string;
  fromAsset: string;
  amount: number;
  toAsset: string;
  limitPrice: number;
  expiry: string;
  createdAt: string;
}

function LimitOrderTab() {
  const { assets, getPrice } = useMarketData();
  const { data: portfolio } = usePortfolio();
  const { format, currency } = useCurrency();

  const holdings = portfolio?.holdings ?? [];

  const [fromAsset, setFromAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [toAsset, setToAsset] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [expiry, setExpiry] = useState("1 Day");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<LimitOrder[]>([]);

  const fromQty = holdings.find(([n]) => n === fromAsset)?.[1] ?? 0;
  const currentPrice = fromAsset ? getPrice(fromAsset) : 0;

  const applyPct = (pct: number) => {
    if (!fromQty) return;
    setAmount(((fromQty * pct) / 100).toFixed(6));
  };

  const handleSubmit = () => {
    setError("");
    const amt = Number(amount);
    const price = Number(limitPrice);
    if (!fromAsset || !toAsset || !amt || !price) {
      setError("Please fill all fields.");
      return;
    }
    if (amt > fromQty) {
      setError("Amount exceeds available holding.");
      return;
    }
    const order: LimitOrder = {
      id: generateRef(),
      fromAsset,
      amount: amt,
      toAsset,
      limitPrice: price,
      expiry,
      createdAt: new Date().toLocaleString(),
    };
    setOrders((prev) => [order, ...prev]);
    setAmount("");
    setLimitPrice("");
  };

  const cancelOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* From */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          From
        </Label>
        <Select value={fromAsset} onValueChange={setFromAsset}>
          <SelectTrigger
            data-ocid="convert.limit_from.select"
            className="bg-card border-border"
          >
            <SelectValue placeholder="Select asset to sell" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {holdings.length === 0 && (
              <SelectItem value="__empty" disabled>
                No holdings yet
              </SelectItem>
            )}
            {holdings.map(([name, qty]) => (
              <SelectItem key={name} value={name}>
                {name} — {qty.toFixed(4)} units
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            Amount
          </Label>
          {fromAsset && (
            <span className="text-xs text-muted-foreground">
              Available: {fromQty.toFixed(4)}
            </span>
          )}
        </div>
        <Input
          data-ocid="convert.amount.input"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-card border-border font-mono"
        />
        <div className="flex gap-2">
          {[25, 50, 75].map((pct) => (
            <button
              key={pct}
              type="button"
              data-ocid={`convert.quick_pct_${pct}.button`}
              onClick={() => applyPct(pct)}
              className="flex-1 text-xs py-1.5 rounded-md bg-muted/60 border border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors font-medium"
            >
              {pct}%
            </button>
          ))}
          <button
            type="button"
            data-ocid="convert.quick_pct_max.button"
            onClick={() => applyPct(100)}
            className="flex-1 text-xs py-1.5 rounded-md bg-muted/60 border border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors font-medium"
          >
            Max
          </button>
        </div>
      </div>

      {/* To */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          To
        </Label>
        <Select value={toAsset} onValueChange={setToAsset}>
          <SelectTrigger
            data-ocid="convert.limit_to.select"
            className="bg-card border-border"
          >
            <SelectValue placeholder="Select asset to receive" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {assets
              .filter((a) => a.name !== fromAsset)
              .map((a) => (
                <SelectItem key={a.name} value={a.name}>
                  {a.name} — {a.displayLabel}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Current price reference */}
      {fromAsset && currentPrice > 0 && (
        <div className="bg-muted/30 border border-border rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Current Price</span>
          <span className="text-xs font-mono font-medium text-foreground">
            {format(currentPrice)} / {fromAsset}
          </span>
        </div>
      )}

      {/* Limit Price */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Limit Price ({currency})
        </Label>
        <Input
          data-ocid="convert.limit_price.input"
          type="number"
          placeholder="Target price to trigger conversion"
          value={limitPrice}
          onChange={(e) => setLimitPrice(e.target.value)}
          className="bg-card border-border font-mono"
        />
      </div>

      {/* Expiry */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Expiry
        </Label>
        <Select value={expiry} onValueChange={setExpiry}>
          <SelectTrigger
            data-ocid="convert.expiry.select"
            className="bg-card border-border"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1 Day">1 Day</SelectItem>
            <SelectItem value="1 Week">1 Week</SelectItem>
            <SelectItem value="1 Month">1 Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        data-ocid="convert.limit_order.submit_button"
        onClick={handleSubmit}
        disabled={!fromAsset || !toAsset || !amount || !limitPrice}
        className="w-full"
      >
        <Clock className="w-4 h-4 mr-2" />
        Place Limit Order
      </Button>

      {/* Pending orders */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            Pending Limit Orders
          </Label>
          {orders.length > 0 && (
            <Badge
              variant="outline"
              className="text-xs border-yellow-500/30 text-yellow-400"
            >
              {orders.length} pending
            </Badge>
          )}
        </div>

        {orders.length === 0 ? (
          <div
            data-ocid="convert.limit_orders.empty_state"
            className="border border-dashed border-border rounded-lg py-8 flex flex-col items-center gap-2 text-center"
          >
            <Clock className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No pending limit orders
            </p>
            <p className="text-xs text-muted-foreground/60">
              Set a target price above to place an order
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                data-ocid={`convert.limit_order.row.${idx + 1}`}
                className="bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {order.fromAsset} → {order.toAsset}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs border-yellow-500/30 text-yellow-400 bg-yellow-500/5 py-0"
                      >
                        Pending
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="text-xs text-muted-foreground">
                        Amount:{" "}
                        <span className="font-mono text-foreground">
                          {order.amount}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Limit:{" "}
                        <span className="font-mono text-primary">
                          {format(order.limitPrice)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Expiry: {order.expiry}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60">
                      {order.createdAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid={`convert.limit_order.cancel_button.${idx + 1}`}
                    onClick={() => cancelOrder(order.id)}
                    className="shrink-0 w-6 h-6 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recurring Buy Tab ─────────────────────────────────────────────────────────
interface RecurringPlan {
  id: string;
  asset: string;
  amount: number;
  frequency: string;
  startDate: string;
  currency: string;
}

function RecurringBuyTab() {
  const { assets } = useMarketData();
  const { currency } = useCurrency();

  const [buyAsset, setBuyAsset] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [frequency, setFrequency] = useState("Weekly");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [lastCreated, setLastCreated] = useState<RecurringPlan | null>(null);

  const handleSubmit = () => {
    setError("");
    setLastCreated(null);
    const amt = Number(spendAmount);
    if (!buyAsset || !amt || !startDate) {
      setError("Please fill all fields.");
      return;
    }
    const plan: RecurringPlan = {
      id: generateRef(),
      asset: buyAsset,
      amount: amt,
      frequency,
      startDate,
      currency,
    };
    setPlans((prev) => [plan, ...prev]);
    setLastCreated(plan);
    setSpendAmount("");
    setStartDate("");
  };

  const cancelPlan = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    if (lastCreated?.id === id) setLastCreated(null);
  };

  const currencySymbol =
    currency === "INR" ? "₹" : currency === "USD" ? "$" : "AED ";

  return (
    <div className="space-y-4">
      {/* Asset */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Asset to Buy
        </Label>
        <Select value={buyAsset} onValueChange={setBuyAsset}>
          <SelectTrigger
            data-ocid="convert.recurring_asset.select"
            className="bg-card border-border"
          >
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {assets.map((a) => (
              <SelectItem key={a.name} value={a.name}>
                {a.name} — {a.displayLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Spend Amount */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Spend Amount ({currency})
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
            {currencySymbol}
          </span>
          <Input
            data-ocid="convert.recurring_amount.input"
            type="number"
            placeholder="0.00"
            value={spendAmount}
            onChange={(e) => setSpendAmount(e.target.value)}
            className="bg-card border-border font-mono pl-8"
          />
        </div>
      </div>

      {/* Frequency */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Frequency
        </Label>
        <Select value={frequency} onValueChange={setFrequency}>
          <SelectTrigger
            data-ocid="convert.recurring_freq.select"
            className="bg-card border-border"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Daily">Daily</SelectItem>
            <SelectItem value="Weekly">Weekly</SelectItem>
            <SelectItem value="Monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Start Date */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Start Date
        </Label>
        <Input
          data-ocid="convert.recurring_start.input"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-card border-border"
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        data-ocid="convert.recurring.submit_button"
        onClick={handleSubmit}
        disabled={!buyAsset || !spendAmount || !startDate}
        className="w-full"
      >
        <Repeat className="w-4 h-4 mr-2" />
        Create Auto-Invest Plan
      </Button>

      {/* Success flash */}
      <AnimatePresence>
        {lastCreated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-3"
          >
            <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-400">
                Auto-invest plan created!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currencySymbol}
                {lastCreated.amount} in {lastCreated.asset} —{" "}
                {lastCreated.frequency} from {lastCreated.startDate}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active plans */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            Active Plans
          </Label>
          {plans.length > 0 && (
            <Badge
              variant="outline"
              className="text-xs border-green-500/30 text-green-400"
            >
              {plans.length} active
            </Badge>
          )}
        </div>

        {plans.length === 0 ? (
          <div
            data-ocid="convert.active_plans.empty_state"
            className="border border-dashed border-border rounded-lg py-8 flex flex-col items-center gap-2 text-center"
          >
            <Repeat className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No active auto-invest plans
            </p>
            <p className="text-xs text-muted-foreground/60">
              Create a plan above to start investing automatically
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                data-ocid={`convert.active_plan.row.${idx + 1}`}
                className="bg-card border border-border rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {plan.asset}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs border-green-500/30 text-green-400 bg-green-500/5 py-0"
                      >
                        {plan.frequency}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="text-xs text-muted-foreground">
                        Amount:{" "}
                        <span className="font-mono text-foreground">
                          {currencySymbol}
                          {plan.amount}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Starts: {plan.startDate}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-ocid={`convert.active_plan.cancel_button.${idx + 1}`}
                    onClick={() => cancelPlan(plan.id)}
                    className="shrink-0 w-6 h-6 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Withdraw Tab — Country-Specific ───────────────────────────────────────────

interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  symbol: string;
  bankFields: BankFieldDef[];
}

interface BankFieldDef {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  maxLength?: number;
  pattern?: RegExp;
  patternMsg?: string;
  transform?: (v: string) => string;
  autoFormat?: (v: string) => string;
}

const COUNTRIES: CountryConfig[] = [
  {
    code: "IN",
    name: "India",
    flag: "🇮🇳",
    currency: "INR",
    symbol: "₹",
    bankFields: [
      {
        key: "bankName",
        label: "Bank Name",
        placeholder: "e.g. State Bank of India",
      },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
        type: "text",
      },
      {
        key: "ifsc",
        label: "IFSC Code",
        placeholder: "e.g. SBIN0001234",
        maxLength: 11,
        pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/i,
        patternMsg: "Enter valid IFSC (e.g. SBIN0001234)",
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "US",
    name: "USA",
    flag: "🇺🇸",
    currency: "USD",
    symbol: "$",
    bankFields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Chase Bank" },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
        type: "text",
      },
      {
        key: "routingNo",
        label: "Routing Number",
        placeholder: "9-digit routing number",
        maxLength: 9,
        pattern: /^\d{9}$/,
        patternMsg: "Routing number must be exactly 9 digits",
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full legal name",
      },
    ],
  },
  {
    code: "AE",
    name: "UAE",
    flag: "🇦🇪",
    currency: "AED",
    symbol: "د.إ",
    bankFields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Emirates NBD" },
      {
        key: "iban",
        label: "IBAN",
        placeholder: "AExx xxxx xxxx xxxx xxxx xxx",
        maxLength: 27,
        pattern: /^AE\d{21}$/i,
        patternMsg: "Enter valid UAE IBAN (AExx + 21 digits)",
        transform: (v) => v.toUpperCase().replace(/\s/g, ""),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "GB",
    name: "UK",
    flag: "🇬🇧",
    currency: "GBP",
    symbol: "£",
    bankFields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Barclays" },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "8-digit account number",
        maxLength: 8,
      },
      {
        key: "sortCode",
        label: "Sort Code",
        placeholder: "XX-XX-XX",
        maxLength: 8,
        pattern: /^\d{2}-\d{2}-\d{2}$/,
        patternMsg: "Enter sort code in XX-XX-XX format",
        autoFormat: (v: string) => {
          const digits = v.replace(/\D/g, "").slice(0, 6);
          if (digits.length <= 2) return digits;
          if (digits.length <= 4)
            return `${digits.slice(0, 2)}-${digits.slice(2)}`;
          return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
        },
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "EU",
    name: "Europe",
    flag: "🇪🇺",
    currency: "EUR",
    symbol: "€",
    bankFields: [
      {
        key: "bankName",
        label: "Bank Name",
        placeholder: "e.g. Deutsche Bank",
      },
      {
        key: "iban",
        label: "IBAN",
        placeholder: "e.g. DE89 3704 0044 0532 0130 00",
        maxLength: 34,
        pattern: /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/,
        patternMsg: "Enter valid IBAN",
        transform: (v) => v.toUpperCase().replace(/\s/g, ""),
      },
      {
        key: "bic",
        label: "BIC / SWIFT",
        placeholder: "e.g. DEUTDEDB",
        maxLength: 11,
        pattern: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
        patternMsg: "Enter valid BIC/SWIFT code",
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "🇸🇬",
    currency: "SGD",
    symbol: "S$",
    bankFields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. DBS Bank" },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
      },
      {
        key: "swift",
        label: "SWIFT / BIC Code",
        placeholder: "e.g. DBSSSGSG",
        maxLength: 11,
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    flag: "🇦🇺",
    currency: "AUD",
    symbol: "A$",
    bankFields: [
      {
        key: "bankName",
        label: "Bank Name",
        placeholder: "e.g. Commonwealth Bank",
      },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
      },
      {
        key: "swift",
        label: "SWIFT / BIC Code",
        placeholder: "e.g. CTBAAU2S",
        maxLength: 11,
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    symbol: "C$",
    bankFields: [
      {
        key: "bankName",
        label: "Bank Name",
        placeholder: "e.g. Royal Bank of Canada",
      },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
      },
      {
        key: "swift",
        label: "SWIFT / BIC Code",
        placeholder: "e.g. ROYCCAT2",
        maxLength: 11,
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "JP",
    name: "Japan",
    flag: "🇯🇵",
    currency: "JPY",
    symbol: "¥",
    bankFields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Mizuho Bank" },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
      },
      {
        key: "swift",
        label: "SWIFT / BIC Code",
        placeholder: "e.g. MHCBJPJT",
        maxLength: 11,
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "BD",
    name: "Bangladesh",
    flag: "🇧🇩",
    currency: "BDT",
    symbol: "৳",
    bankFields: [
      {
        key: "bankName",
        label: "Bank Name",
        placeholder: "e.g. Dutch-Bangla Bank",
      },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
      },
      {
        key: "swift",
        label: "SWIFT / BIC Code",
        placeholder: "e.g. DBBLBDDH",
        maxLength: 11,
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "PK",
    name: "Pakistan",
    flag: "🇵🇰",
    currency: "PKR",
    symbol: "₨",
    bankFields: [
      { key: "bankName", label: "Bank Name", placeholder: "e.g. HBL Bank" },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
      },
      {
        key: "swift",
        label: "SWIFT / BIC Code",
        placeholder: "e.g. HABBPKKA",
        maxLength: 11,
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
  {
    code: "NP",
    name: "Nepal",
    flag: "🇳🇵",
    currency: "NPR",
    symbol: "रू",
    bankFields: [
      {
        key: "bankName",
        label: "Bank Name",
        placeholder: "e.g. Nepal Bank Limited",
      },
      {
        key: "accountNo",
        label: "Account Number",
        placeholder: "Enter account number",
      },
      {
        key: "swift",
        label: "SWIFT / BIC Code",
        placeholder: "e.g. NEBLNPKA",
        maxLength: 11,
        transform: (v) => v.toUpperCase(),
      },
      {
        key: "holderName",
        label: "Account Holder Name",
        placeholder: "Full name as per bank",
      },
    ],
  },
];

const MOCK_BALANCE = 10000;

function detectCardType(cardNumber: string): "visa" | "mastercard" | "unknown" {
  const first = cardNumber.replace(/\s/g, "")[0];
  if (first === "4") return "visa";
  if (first === "5") return "mastercard";
  return "unknown";
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function WithdrawTab() {
  const { addTax } = useTaxBalance();
  const [selectedCountry, setSelectedCountry] = useState("IN");
  const [withdrawMethod, setWithdrawMethod] = useState<"bank" | "card">("bank");
  const [bankFields, setBankFields] = useState<Record<string, string>>({});
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [refNo, setRefNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const country =
    COUNTRIES.find((c) => c.code === selectedCountry) ?? COUNTRIES[0];

  const setField = (key: string, value: string) => {
    setBankFields((prev) => ({ ...prev, [key]: value }));
  };

  const applyAmountPct = (pct: number) => {
    setWithdrawAmount(((MOCK_BALANCE * pct) / 100).toFixed(2));
  };

  const resetForm = () => {
    setBankFields({});
    setWithdrawAmount("");
    setCardHolder("");
    setCardNumber("");
    setCardExpiry("");
    setError("");
    setSubmitted(false);
  };

  // When country changes, reset bank fields
  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    setBankFields({});
    setError("");
  };

  const validateAndSubmit = () => {
    setError("");
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (amt > MOCK_BALANCE) {
      setError(
        `Amount cannot exceed ${country.symbol}${MOCK_BALANCE.toLocaleString()}.`,
      );
      return;
    }

    if (withdrawMethod === "bank") {
      for (const field of country.bankFields) {
        const val = (bankFields[field.key] ?? "").trim();
        if (!val) {
          setError(`${field.label} is required.`);
          return;
        }
        if (field.pattern && !field.pattern.test(val)) {
          setError(field.patternMsg ?? `Invalid ${field.label}.`);
          return;
        }
      }
    } else {
      if (!cardHolder.trim()) {
        setError("Cardholder name is required.");
        return;
      }
      const rawCard = cardNumber.replace(/\s/g, "");
      if (rawCard.length !== 16) {
        setError("Card number must be 16 digits.");
        return;
      }
      const [mm, yy] = cardExpiry.split("/");
      const now = new Date();
      const expMonth = Number.parseInt(mm ?? "0", 10);
      const expYear = Number.parseInt(`20${yy ?? "00"}`, 10);
      if (!expMonth || expMonth < 1 || expMonth > 12) {
        setError("Enter a valid expiry month.");
        return;
      }
      if (
        expYear < now.getFullYear() ||
        (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)
      ) {
        setError("Card has expired.");
        return;
      }
    }

    const withdrawTaxAmt = Number(withdrawAmount) * 0.01;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setRefNo(generateRef());
      addTax(
        withdrawTaxAmt,
        "withdraw",
        "Bank Withdrawal",
        Number(withdrawAmount),
      );
      setSubmitted(true);
    }, 1400);
  };

  const cardType = detectCardType(cardNumber);
  const maskedCard =
    cardNumber.replace(/\s/g, "").length >= 4
      ? `**** **** **** ${cardNumber.replace(/\s/g, "").slice(-4)}`
      : "";
  const maskedAccount =
    (bankFields.accountNo ?? bankFields.iban ?? "").length >= 4
      ? `****${(bankFields.accountNo ?? bankFields.iban).slice(-4)}`
      : "";

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        data-ocid="withdraw.success_state"
        className="space-y-4"
      >
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">Withdrawal Requested</p>
            <p className="text-sm text-muted-foreground">
              Your request has been submitted successfully.
            </p>
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Reference No.</span>
              <span className="font-mono font-bold text-primary">{refNo}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Country</span>
              <span className="font-medium">
                {country.flag} {country.name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Method</span>
              <span className="font-medium capitalize">
                {withdrawMethod === "bank" ? "Bank Account" : "Debit Card"}
              </span>
            </div>
            {withdrawMethod === "bank" ? (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Account</span>
                <span className="font-mono">
                  {maskedAccount || bankFields.iban
                    ? `****${(bankFields.iban ?? "").slice(-4)}`
                    : "—"}
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Card</span>
                <span className="font-mono">{maskedCard}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tax (1%)</span>
              <span className="font-data text-yellow-400">
                {country.symbol}
                {(Number(withdrawAmount) * 0.01).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-2">
              <span className="text-muted-foreground">You Receive</span>
              <span className="font-bold text-green-400">
                {country.symbol}
                {(Number(withdrawAmount) * 0.99).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                {country.currency}
              </span>
            </div>
          </CardContent>
        </Card>

        <Badge
          variant="outline"
          className="w-full justify-center py-2 text-xs border-yellow-500/30 text-yellow-400 bg-yellow-500/5"
          data-ocid="withdraw.disclaimer.card"
        >
          <ShieldAlert className="w-3 h-3 mr-1" />
          Demo only — no real transactions processed
        </Badge>

        <Button
          variant="outline"
          className="w-full"
          onClick={resetForm}
          data-ocid="withdraw.secondary_button"
        >
          New Withdrawal
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Country selector */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-3 h-3" />
          Select Country & Currency
        </Label>
        <Select value={selectedCountry} onValueChange={handleCountryChange}>
          <SelectTrigger
            data-ocid="withdraw.country.select"
            className="bg-card border-border"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span>{c.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({c.currency} {c.symbol})
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Country badge */}
      <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
        <span className="text-xl">{country.flag}</span>
        <div>
          <p className="text-sm font-semibold">{country.name}</p>
          <p className="text-xs text-muted-foreground">
            {country.currency} — {country.symbol}
          </p>
        </div>
      </div>

      {/* Method toggle */}
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
          Withdrawal Method
        </Label>
        <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
          {(["bank", "card"] as const).map((method) => (
            <button
              key={method}
              type="button"
              data-ocid={`withdraw.method_${method}.toggle`}
              onClick={() => {
                setWithdrawMethod(method);
                setError("");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md font-medium transition-all ${
                withdrawMethod === method
                  ? "bg-background shadow-sm text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {method === "bank" ? (
                <Building2 className="w-3 h-3" />
              ) : (
                <CreditCard className="w-3 h-3" />
              )}
              {method === "bank" ? "Bank Account" : "Debit Card"}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {withdrawMethod === "bank" ? (
          <motion.div
            key="bank"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {country.bankFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  {field.label}
                </Label>
                <Input
                  data-ocid={`withdraw.bank_${field.key}.input`}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  value={bankFields[field.key] ?? ""}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (field.autoFormat) {
                      val = field.autoFormat(val);
                    } else if (field.transform) {
                      val = field.transform(val);
                    }
                    setField(field.key, val);
                  }}
                  className="bg-card border-border font-mono"
                />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {/* Cardholder */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Cardholder Name
              </Label>
              <Input
                data-ocid="withdraw.card_holder.input"
                placeholder="Full name as on card"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                className="bg-card border-border"
              />
            </div>

            {/* Card number */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Card Number
              </Label>
              <div className="relative">
                <Input
                  data-ocid="withdraw.card_number.input"
                  placeholder="**** **** **** ****"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(formatCardNumber(e.target.value))
                  }
                  maxLength={19}
                  className="bg-card border-border font-mono pr-20"
                />
                {cardType !== "unknown" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Badge
                      variant="outline"
                      className={`text-xs py-0 ${
                        cardType === "visa"
                          ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                          : "border-orange-500/40 text-orange-400 bg-orange-500/10"
                      }`}
                    >
                      {cardType === "visa" ? "VISA" : "MC"}
                    </Badge>
                  </div>
                )}
              </div>
              {cardNumber.replace(/\s/g, "").length >= 4 && (
                <p className="text-xs text-muted-foreground font-mono">
                  {maskedCard}
                </p>
              )}
            </div>

            {/* Expiry */}
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                Expiry Date
              </Label>
              <Input
                data-ocid="withdraw.card_expiry.input"
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                maxLength={5}
                className="bg-card border-border font-mono"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Amount */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">
            Amount
          </Label>
          <span className="text-xs text-muted-foreground">
            Balance: {country.symbol}
            {MOCK_BALANCE.toLocaleString()}
          </span>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold">
            {country.symbol}
          </span>
          <Input
            data-ocid="withdraw.amount.input"
            type="number"
            placeholder="0.00"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            className="bg-card border-border font-mono pl-10"
          />
        </div>
        <div className="flex gap-2">
          {[25, 50, 75].map((pct) => (
            <button
              key={pct}
              type="button"
              data-ocid={`withdraw.quick_pct_${pct}.button`}
              onClick={() => applyAmountPct(pct)}
              className="flex-1 text-xs py-1.5 rounded-md bg-muted/60 border border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors font-medium"
            >
              {pct}%
            </button>
          ))}
          <button
            type="button"
            data-ocid="withdraw.quick_pct_max.button"
            onClick={() => applyAmountPct(100)}
            className="flex-1 text-xs py-1.5 rounded-md bg-muted/60 border border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors font-medium"
          >
            Max
          </button>
        </div>
      </div>

      {error && (
        <div
          data-ocid="withdraw.error_state"
          className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg p-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {Number(withdrawAmount) > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Tax (1%)</span>
            <span className="text-yellow-400 font-data">
              {country.symbol}
              {(Number(withdrawAmount) * 0.01).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>You Receive</span>
            <span className="text-green-400 font-data">
              {country.symbol}
              {(Number(withdrawAmount) * 0.99).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <Badge
        variant="outline"
        className="w-full justify-center py-2 text-xs border-yellow-500/30 text-yellow-400 bg-yellow-500/5"
      >
        <ShieldAlert className="w-3 h-3 mr-1" />
        Demo only — no real money transactions
      </Badge>

      <Button
        data-ocid="withdraw.submit_button"
        onClick={validateAndSubmit}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Withdraw ${withdrawAmount ? `${country.symbol}${Number(withdrawAmount).toLocaleString()}` : ""}`
        )}
      </Button>
    </div>
  );
}

// ── Main Wallet Page ──────────────────────────────────────────────────────────
function WalletTaxBadge() {
  const { taxBalance } = useTaxBalance();
  if (taxBalance <= 0) return null;
  return (
    <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-xs">
      <Receipt className="w-3 h-3 mr-1" />
      Tax: ₹{taxBalance.toFixed(2)}
    </Badge>
  );
}

function TaxAccountTab() {
  const {
    taxBalance,
    buyCount,
    sellCount,
    withdrawCount,
    taxHistory,
    clearTax,
  } = useTaxBalance();
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<
    "all" | "buy" | "sell" | "withdraw"
  >("all");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  if (!pinUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4 py-8">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>
        <div className="text-center">
          <p className="text-amber-400 font-bold text-lg">Admin Only</p>
          <p className="text-muted-foreground text-sm mt-1">
            Yeh section sirf app owner ke liye hai
          </p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          <Input
            data-ocid="wallet.tax_pin.input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="Enter 4-digit PIN"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4));
              setPinError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (pinInput === "1234") {
                  setPinUnlocked(true);
                } else {
                  setPinError(true);
                }
              }
            }}
            className="text-center tracking-[0.5em] text-lg bg-card border-amber-500/30 focus:border-amber-500"
          />
          {pinError && (
            <p className="text-red-400 text-sm text-center">
              Wrong PIN. Try again.
            </p>
          )}
          <Button
            data-ocid="wallet.tax_unlock.button"
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={() => {
              if (pinInput === "1234") {
                setPinUnlocked(true);
              } else {
                setPinError(true);
              }
            }}
          >
            <Lock className="w-4 h-4 mr-2" />
            Unlock
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          data-ocid="wallet.tax_lock.button"
          onClick={() => {
            setPinUnlocked(false);
            setPinInput("");
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 transition-colors"
        >
          <Lock className="w-3 h-3" />
          Lock
        </button>
      </div>
      {/* Total Tax Card */}
      <Card
        data-ocid="wallet.tax_balance.card"
        className="bg-card border-border bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border-yellow-500/20"
      >
        <CardContent className="pt-5 pb-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            Total Tax Collected
          </p>
          <p className="text-3xl font-bold font-data text-yellow-400">
            ₹
            {taxBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Accumulated across all trades & withdrawals
          </p>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Tax Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Buy Tax (1%)</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">
                {buyCount} trade{buyCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span>Sell Tax (3%)</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">
                {sellCount} trade{sellCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>Withdrawal Tax (1%)</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground">
                {withdrawCount} withdrawal{withdrawCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filter Pills */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "buy", "sell", "withdraw"] as const).map((f) => (
              <button
                key={f}
                type="button"
                data-ocid="wallet.tax_history_filter.tab"
                onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  historyFilter === f
                    ? "bg-amber-500 text-black"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f === "all"
                  ? "All"
                  : f === "buy"
                    ? "Buy"
                    : f === "sell"
                      ? "Sell"
                      : "Withdraw"}
              </button>
            ))}
          </div>
          {/* History List */}
          {(() => {
            const filtered: TaxTransaction[] =
              historyFilter === "all"
                ? taxHistory
                : taxHistory.filter((tx) => tx.type === historyFilter);
            if (filtered.length === 0) {
              return (
                <div
                  data-ocid="wallet.tax_history.list"
                  className="py-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2"
                >
                  <History className="w-6 h-6 opacity-40" />
                  <span>Koi transactions nahi hain abhi</span>
                </div>
              );
            }
            return (
              <div
                data-ocid="wallet.tax_history.list"
                className="max-h-72 overflow-y-auto space-y-2 pr-1"
              >
                {filtered.map((tx) => {
                  const d = new Date(tx.date);
                  const dateStr = d.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const timeStr = d.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });
                  const dotColor =
                    tx.type === "buy"
                      ? "bg-green-400"
                      : tx.type === "sell"
                        ? "bg-red-400"
                        : "bg-yellow-400";
                  const badge =
                    tx.type === "buy"
                      ? "BUY 1%"
                      : tx.type === "sell"
                        ? "SELL 3%"
                        : "WITHDRAW 1%";
                  const badgeColor =
                    tx.type === "buy"
                      ? "text-green-400 bg-green-400/10"
                      : tx.type === "sell"
                        ? "text-red-400 bg-red-400/10"
                        : "text-yellow-400 bg-yellow-400/10";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {tx.asset}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dateStr}, {timeStr}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs text-muted-foreground">
                          ₹{tx.tradeAmount.toFixed(2)}
                        </p>
                        <p className="text-xs text-amber-400 font-medium">
                          Tax: ₹{tx.taxAmount.toFixed(2)}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeColor}`}
                        >
                          {badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Badge
        variant="outline"
        className="w-full justify-center py-2 text-xs border-yellow-500/30 text-yellow-400 bg-yellow-500/5 whitespace-normal text-center"
      >
        <ShieldAlert className="w-3 h-3 mr-1 shrink-0" />
        Taxes are mock/demo values. Real taxes depend on your country's
        regulations.
      </Badge>

      {/* Reset Button */}
      <Button
        data-ocid="wallet.tax_reset.button"
        variant="outline"
        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
        onClick={clearTax}
      >
        Reset Tax Balance (Demo)
      </Button>
    </div>
  );
}

// ── Deposit Tab ───────────────────────────────────────────────────────────────
function DepositTab() {
  const [method, setMethod] = useState<"upi" | "bank" | "crypto">("upi");

  // UPI state
  const [upiId, setUpiId] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [upiSuccess, setUpiSuccess] = useState("");
  const [upiError, setUpiError] = useState("");

  // Bank state
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [bankSuccess, setBankSuccess] = useState("");
  const [bankError, setBankError] = useState("");

  // Crypto state
  const [cryptoAsset, setCryptoAsset] = useState("BTC");
  const [cryptoNetwork, setCryptoNetwork] = useState("BEP20");
  const [copied, setCopied] = useState(false);

  // Stripe state
  const [stripeAmount, setStripeAmount] = useState("1000");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const { mutateAsync: createCheckoutSession } = useCreateCheckoutSession();

  const handleStripeDeposit = async () => {
    const amt = Number(stripeAmount);
    if (!amt || amt <= 0) {
      setStripeError("Valid amount daalo.");
      return;
    }
    setStripeError("");
    setStripeLoading(true);
    try {
      const session = await createCheckoutSession({
        items: [
          {
            productName: "CFS Wallet Deposit",
            productDescription: "Add funds to your CFS trading wallet",
            currency: "inr",
            priceInCents: BigInt(amt * 100),
            quantity: BigInt(1),
          },
        ],
        amount: amt,
      });
      window.location.href = session.url;
    } catch (err) {
      setStripeError("Payment initiate nahi ho saka. Try again.");
      console.error(err);
    } finally {
      setStripeLoading(false);
    }
  };

  const cryptoAssets = [
    "BTC",
    "ETH",
    "BNB",
    "USDT",
    "SOL",
    "XRP",
    "ADA",
    "DOGE",
    "TRX",
    "MATIC",
  ];
  const networks: Record<string, string[]> = {
    BTC: ["Bitcoin", "BEP20"],
    ETH: ["ERC20", "BEP20"],
    BNB: ["BEP20"],
    USDT: ["ERC20", "TRC20", "BEP20"],
    SOL: ["Solana", "BEP20"],
    XRP: ["XRPL", "BEP20"],
    ADA: ["Cardano", "BEP20"],
    DOGE: ["Dogecoin", "BEP20"],
    TRX: ["TRC20", "BEP20"],
    MATIC: ["Polygon", "BEP20"],
  };

  const mockAddress: Record<string, Record<string, string>> = {
    BTC: {
      Bitcoin: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf",
      BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
    },
    ETH: {
      ERC20: "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",
      BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
    },
    BNB: { BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3" },
    USDT: {
      ERC20: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      TRC20: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9",
      BEP20: "0x55d398326f99059fF775485246999027B3197955",
    },
    SOL: {
      Solana: "7EqQdEULxWcraVx3mXKFjc84LhCkMGZzBc7TTnf7YZ7C",
      BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
    },
    XRP: {
      XRPL: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
    },
    ADA: {
      Cardano:
        "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp",
      BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
    },
    DOGE: {
      Dogecoin: "DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L",
      BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
    },
    TRX: {
      TRC20: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9",
      BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
    },
    MATIC: {
      Polygon: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
      BEP20: "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3",
    },
  };

  const availableNetworks = networks[cryptoAsset] || ["BEP20"];
  const walletAddress =
    mockAddress[cryptoAsset]?.[cryptoNetwork] ??
    mockAddress[cryptoAsset]?.[availableNetworks[0]] ??
    "0x742d35Cc6634C0532925a3b8D4C9E3B7e2F1a2b3";

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpiDeposit = () => {
    setUpiError("");
    if (!upiId.trim() || !upiAmount || Number(upiAmount) <= 0) {
      setUpiError("UPI ID aur valid amount daalo.");
      return;
    }
    const ref = generateRef();
    const prev = JSON.parse(localStorage.getItem("depositHistory") ?? "[]");
    prev.push({
      type: "UPI",
      upiId,
      amount: Number(upiAmount),
      ref,
      date: new Date().toISOString(),
    });
    localStorage.setItem("depositHistory", JSON.stringify(prev));
    const bal = Number(localStorage.getItem("walletBalance") ?? "10000");
    localStorage.setItem("walletBalance", String(bal + Number(upiAmount)));
    setUpiSuccess(ref);
    setUpiId("");
    setUpiAmount("");
  };

  const handleBankDeposit = () => {
    setBankError("");
    if (
      !bankAccount.trim() ||
      !ifsc.trim() ||
      !bankName.trim() ||
      !bankAmount ||
      Number(bankAmount) <= 0
    ) {
      setBankError("Sare fields sahi se bharo.");
      return;
    }
    const ref = generateRef();
    const prev = JSON.parse(localStorage.getItem("depositHistory") ?? "[]");
    prev.push({
      type: "Bank",
      bankAccount,
      ifsc,
      bankName,
      amount: Number(bankAmount),
      ref,
      date: new Date().toISOString(),
    });
    localStorage.setItem("depositHistory", JSON.stringify(prev));
    const bal = Number(localStorage.getItem("walletBalance") ?? "10000");
    localStorage.setItem("walletBalance", String(bal + Number(bankAmount)));
    setBankSuccess(ref);
    setBankAccount("");
    setIfsc("");
    setBankName("");
    setBankAmount("");
  };

  const methodBtns = [
    {
      id: "upi" as const,
      label: "UPI",
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      id: "bank" as const,
      label: "Bank Transfer",
      icon: <Building className="w-4 h-4" />,
    },
    {
      id: "crypto" as const,
      label: "Crypto",
      icon: <Bitcoin className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Method selector */}
      <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
        {methodBtns.map((btn) => (
          <button
            key={btn.id}
            type="button"
            data-ocid={`deposit.${btn.id}.tab`}
            onClick={() => {
              setMethod(btn.id);
              setUpiSuccess("");
              setBankSuccess("");
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-md font-medium transition-all ${
              method === btn.id
                ? "bg-background shadow-sm text-foreground border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {btn.icon}
            <span className="hidden sm:inline">{btn.label}</span>
            <span className="sm:hidden">{btn.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {method === "upi" && (
          <motion.div
            key="upi"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {upiSuccess ? (
              <div
                data-ocid="deposit.upi.success_state"
                className="flex flex-col items-center gap-3 py-6"
              >
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>
                <p className="text-green-400 font-semibold">
                  Deposit Request Sent!
                </p>
                <div className="bg-muted/30 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Reference Number
                  </p>
                  <p className="font-mono font-bold tracking-widest text-primary">
                    {upiSuccess}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUpiSuccess("")}
                >
                  New Deposit
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    UPI ID
                  </Label>
                  <Input
                    data-ocid="deposit.upi.input"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="bg-muted/30 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Amount (₹)
                  </Label>
                  <Input
                    data-ocid="deposit.upi_amount.input"
                    type="number"
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="bg-muted/30 border-border"
                  />
                  <div className="flex gap-2">
                    {[100, 500, 1000, 5000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setUpiAmount(String(v))}
                        className="flex-1 text-xs py-1.5 rounded bg-muted/40 hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border transition-colors"
                      >
                        ₹{v}
                      </button>
                    ))}
                  </div>
                </div>
                {upiError && (
                  <p
                    data-ocid="deposit.upi.error_state"
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {upiError}
                  </p>
                )}
                <Button
                  data-ocid="deposit.upi.primary_button"
                  onClick={handleUpiDeposit}
                  className="w-full"
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Deposit via UPI
                </Button>
              </>
            )}
          </motion.div>
        )}

        {method === "bank" && (
          <motion.div
            key="bank"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            {bankSuccess ? (
              <div
                data-ocid="deposit.bank.success_state"
                className="flex flex-col items-center gap-3 py-6"
              >
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-green-400" />
                </div>
                <p className="text-green-400 font-semibold">
                  Transfer Initiated!
                </p>
                <div className="bg-muted/30 rounded-lg px-4 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    Reference Number
                  </p>
                  <p className="font-mono font-bold tracking-widest text-primary">
                    {bankSuccess}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBankSuccess("")}
                >
                  New Deposit
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Bank Name
                  </Label>
                  <Input
                    data-ocid="deposit.bank_name.input"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. SBI, HDFC, ICICI"
                    className="bg-muted/30 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Account Number
                  </Label>
                  <Input
                    data-ocid="deposit.bank_account.input"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Enter account number"
                    className="bg-muted/30 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    IFSC Code
                  </Label>
                  <Input
                    data-ocid="deposit.ifsc.input"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    placeholder="e.g. SBIN0001234"
                    className="bg-muted/30 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Amount (₹)
                  </Label>
                  <Input
                    data-ocid="deposit.bank_amount.input"
                    type="number"
                    value={bankAmount}
                    onChange={(e) => setBankAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="bg-muted/30 border-border"
                  />
                  <div className="flex gap-2">
                    {[500, 1000, 5000, 10000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setBankAmount(String(v))}
                        className="flex-1 text-xs py-1.5 rounded bg-muted/40 hover:bg-primary/20 text-muted-foreground hover:text-primary border border-border transition-colors"
                      >
                        ₹{v}
                      </button>
                    ))}
                  </div>
                </div>
                {bankError && (
                  <p
                    data-ocid="deposit.bank.error_state"
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {bankError}
                  </p>
                )}
                <Button
                  data-ocid="deposit.bank.primary_button"
                  onClick={handleBankDeposit}
                  className="w-full"
                >
                  <Building className="w-4 h-4 mr-2" />
                  Initiate Bank Transfer
                </Button>
              </>
            )}
          </motion.div>
        )}

        {method === "crypto" && (
          <motion.div
            key="crypto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Asset</Label>
                <Select
                  value={cryptoAsset}
                  onValueChange={(v) => {
                    setCryptoAsset(v);
                    setCryptoNetwork(networks[v]?.[0] ?? "BEP20");
                  }}
                >
                  <SelectTrigger
                    data-ocid="deposit.crypto_asset.select"
                    className="bg-muted/30 border-border"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cryptoAssets.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Network</Label>
                <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                  <SelectTrigger
                    data-ocid="deposit.crypto_network.select"
                    className="bg-muted/30 border-border"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNetworks.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Deposit Address
              </Label>
              <div className="relative bg-muted/20 border border-border rounded-lg p-3">
                <p className="font-mono text-xs break-all text-foreground/80 pr-8">
                  {walletAddress}
                </p>
                <button
                  type="button"
                  data-ocid="deposit.crypto_copy.button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 p-1.5 rounded hover:bg-muted/60 transition-colors"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-green-400 text-center">
                  Address copied!
                </p>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                Sirf <span className="font-bold">{cryptoAsset}</span> bhejo is
                address par ({cryptoNetwork} network). Galat coin ya network se
                coins permanently lost ho sakte hain.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stripe Card Deposit */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Pay with Card (Stripe)</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[500, 1000, 2000, 5000].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setStripeAmount(String(amt))}
              className={`py-2 rounded-lg text-sm font-mono font-medium border transition-colors ${
                stripeAmount === String(amt)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 border-border hover:bg-muted/50 text-foreground"
              }`}
            >
              ₹{amt.toLocaleString()}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Custom Amount (₹)
          </Label>
          <Input
            data-ocid="wallet.stripe_amount.input"
            type="number"
            min="1"
            placeholder="Enter amount"
            value={stripeAmount}
            onChange={(e) => setStripeAmount(e.target.value)}
            className="bg-muted/30 border-border font-mono"
          />
        </div>
        {stripeError && (
          <p className="text-xs text-destructive">{stripeError}</p>
        )}
        <Button
          data-ocid="wallet.stripe_deposit.button"
          className="w-full"
          disabled={stripeLoading || !stripeAmount || Number(stripeAmount) <= 0}
          onClick={handleStripeDeposit}
        >
          {stripeLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ₹
              {Number(stripeAmount) > 0
                ? Number(stripeAmount).toLocaleString("en-IN")
                : "---"}{" "}
              with Card
            </>
          )}
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="bg-muted/20 border border-border rounded-lg p-3 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          ⚠️ Yeh ek demo app hai. Koi bhi real transaction nahi hoti. Sirf mock
          data use hota hai.
        </p>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const [convertOrderType, setConvertOrderType] = useState("market");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Wallet</h1>
          </div>
          <WalletTaxBadge />
        </div>
      </div>

      <div className="px-4 py-4">
        <Tabs defaultValue="convert">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="convert" data-ocid="wallet.convert.tab">
              <ArrowRightLeft className="w-4 h-4 mr-1.5" />
              Convert
            </TabsTrigger>
            <TabsTrigger value="withdraw" data-ocid="wallet.withdraw.tab">
              <Globe className="w-4 h-4 mr-1.5" />
              Withdraw
            </TabsTrigger>
            <TabsTrigger value="tax" data-ocid="wallet.tax_account.tab">
              <Receipt className="w-4 h-4 mr-1.5" />
              Tax
            </TabsTrigger>
            <TabsTrigger value="deposit" data-ocid="wallet.deposit.tab">
              <CreditCard className="w-4 h-4 mr-1.5" />
              Deposit
            </TabsTrigger>
          </TabsList>

          {/* Convert Tab */}
          <TabsContent value="convert">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-primary" />
                  Convert Assets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Order type tabs */}
                <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
                  {[
                    {
                      id: "market",
                      label: "Market",
                      icon: <TrendingUp className="w-3 h-3" />,
                    },
                    {
                      id: "limit",
                      label: "Limit",
                      icon: <Clock className="w-3 h-3" />,
                    },
                    {
                      id: "recurring",
                      label: "Auto-Invest",
                      icon: <Repeat className="w-3 h-3" />,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      data-ocid="convert.order_type.tab"
                      onClick={() => setConvertOrderType(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md font-medium transition-all ${
                        convertOrderType === tab.id
                          ? "bg-background shadow-sm text-foreground border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {convertOrderType === "market" && (
                    <motion.div
                      key="market"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <MarketConvert />
                    </motion.div>
                  )}
                  {convertOrderType === "limit" && (
                    <motion.div
                      key="limit"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <LimitOrderTab />
                    </motion.div>
                  )}
                  {convertOrderType === "recurring" && (
                    <motion.div
                      key="recurring"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <RecurringBuyTab />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Withdraw to Bank / Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WithdrawTab />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Account Tab */}
          <TabsContent value="tax">
            <TaxAccountTab />
          </TabsContent>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Deposit Funds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DepositTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
