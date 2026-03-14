import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { Variant_buy_sell } from "../backend";
import { type Currency, useCurrency } from "../hooks/useCurrency";
import type { MarketAsset } from "../hooks/useMarketData";
import { usePlaceTrade } from "../hooks/useQueries";

const RATES: Record<Currency, number> = { USD: 1, INR: 83, AED: 3.67 };
const SYMBOLS: Record<Currency, string> = { USD: "$", INR: "₹", AED: "د.إ" };

interface TradeModalProps {
  asset: MarketAsset | null;
  side: "buy" | "sell";
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  tradeCount: number;
}

function isTrialActive(profile: UserProfile): boolean {
  const nowNs = BigInt(Date.now()) * BigInt(1_000_000);
  const durationNs = BigInt(17 * 24 * 3600) * BigInt(1_000_000_000);
  if (profile.trialEndTime) return nowNs < profile.trialEndTime;
  return (
    profile.registrationTime > 0n &&
    nowNs - profile.registrationTime < durationNs
  );
}

export default function TradeModal({
  asset,
  side,
  open,
  onClose,
  profile,
  tradeCount,
}: TradeModalProps) {
  const { currency: appCurrency } = useCurrency();
  const [modalCurrency, setModalCurrency] = useState<Currency>(appCurrency);
  const [amountStr, setAmountStr] = useState("");
  const { mutate: placeTrade, isPending } = usePlaceTrade();

  if (!asset) return null;

  const rate = RATES[modalCurrency];
  const sym = SYMBOLS[modalCurrency];
  const displayPrice = asset.isForexRate ? asset.price : asset.price * rate;

  const amountNum = Number.parseFloat(amountStr) || 0;
  const amountUSD = amountNum / rate;
  const isTaxFree =
    profile.isTaxFree || tradeCount < 7 || isTrialActive(profile);
  const taxRate = isTaxFree ? 0 : 0.001;
  const taxAmount = amountNum * taxRate;
  const totalAmount = amountNum + taxAmount;
  const quantity = amountUSD / asset.price;

  const handleTrade = () => {
    if (amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    placeTrade(
      {
        asset: asset.name,
        assetType: asset.type,
        tradeType:
          side === "buy" ? Variant_buy_sell.buy : Variant_buy_sell.sell,
        amount: amountUSD,
      },
      {
        onSuccess: () => {
          toast.success(
            `${side === "buy" ? "Bought" : "Sold"} ${asset.name} — ${sym}${amountNum.toFixed(2)}`,
          );
          setAmountStr("");
          onClose();
        },
        onError: (e) => toast.error(`Trade failed: ${e.message}`),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="trade.dialog"
        className="bg-card border-border sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {side === "buy" ? (
              <TrendingUp className="w-5 h-5 text-gain" />
            ) : (
              <TrendingDown className="w-5 h-5 text-loss" />
            )}
            <span className={side === "buy" ? "text-gain" : "text-loss"}>
              {side === "buy" ? "Buy" : "Sell"}
            </span>{" "}
            {asset.name}
          </DialogTitle>
        </DialogHeader>

        {/* Asset info */}
        <div className="bg-background rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Market</span>
            <span className="font-semibold">{asset.displayLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-data font-semibold">
              {asset.isForexRate
                ? displayPrice.toFixed(asset.price < 10 ? 4 : 2)
                : `${sym}${displayPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">24h Change</span>
            <span className={asset.change24h >= 0 ? "text-gain" : "text-loss"}>
              {asset.change24h >= 0 ? "+" : ""}
              {asset.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Amount + currency */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="trade-amount">Amount ({modalCurrency})</Label>
              <Input
                id="trade-amount"
                data-ocid="trade.input"
                type="number"
                min={0}
                step="any"
                placeholder={`Min. ${sym}1`}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="mt-1 font-data"
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select
                value={modalCurrency}
                onValueChange={(v) => setModalCurrency(v as Currency)}
              >
                <SelectTrigger data-ocid="trade.select" className="mt-1 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calculation breakdown */}
          {amountNum > 0 && (
            <div className="bg-background rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity</span>
                <span className="font-data">
                  {asset.isForexRate
                    ? amountUSD.toFixed(2)
                    : quantity.toFixed(asset.price < 1 ? 0 : 6)}{" "}
                  {asset.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                {isTaxFree ? (
                  <span className="text-gain font-semibold text-xs">
                    FREE
                    {profile.isTaxFree
                      ? " (first 7 trades)"
                      : isTrialActive(profile)
                        ? " (trial active)"
                        : ""}
                  </span>
                ) : (
                  <span className="font-data text-warning">
                    {sym}
                    {taxAmount.toFixed(2)} (0.1%)
                  </span>
                )}
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-1.5 mt-1.5">
                <span>Total</span>
                <span className="font-data">
                  {sym}
                  {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="trade.cancel_button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            data-ocid="trade.confirm_button"
            onClick={handleTrade}
            disabled={isPending || amountNum <= 0}
            className={`flex-1 font-bold ${
              side === "buy"
                ? "bg-gain/80 text-white hover:bg-gain"
                : "bg-loss/80 text-white hover:bg-loss"
            }`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            {isPending
              ? "Processing..."
              : side === "buy"
                ? "Confirm Buy"
                : "Confirm Sell"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
