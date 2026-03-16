import { Button } from "@/components/ui/button";
import { CheckCircle2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

interface PaymentSuccessPageProps {
  onNavigate: (page: string) => void;
}

export default function PaymentSuccessPage({
  onNavigate,
}: PaymentSuccessPageProps) {
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("amount");
    if (raw) {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed) && parsed > 0) {
        setAmount(parsed);
        // Add to wallet balance
        const prev = Number(localStorage.getItem("cfs_wallet_balance") ?? "0");
        localStorage.setItem("cfs_wallet_balance", String(prev + parsed));
        // Also update the legacy walletBalance key
        const prevLegacy = Number(localStorage.getItem("walletBalance") ?? "0");
        localStorage.setItem("walletBalance", String(prevLegacy + parsed));
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Glow ring */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full bg-green-500/10 blur-2xl" />
          <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center relative">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground text-sm">
            Aapka deposit process ho gaya hai.
          </p>
        </div>

        {amount !== null && (
          <div className="bg-card border border-green-500/30 rounded-xl p-6 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
              Amount Deposited
            </p>
            <p className="text-4xl font-bold text-green-400 font-mono">
              ₹{amount.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">
              Wallet balance updated
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-green-400 font-semibold">CONFIRMED</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment Method</span>
            <span className="font-medium">Card (Stripe)</span>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => onNavigate("wallet")}
          data-ocid="payment_success.primary_button"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Return to Wallet
        </Button>

        <p className="text-xs text-muted-foreground">
          Demo app only. No real transactions involved.
        </p>
      </div>
    </div>
  );
}
