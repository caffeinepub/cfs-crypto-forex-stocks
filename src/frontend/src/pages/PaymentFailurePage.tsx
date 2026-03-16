import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

interface PaymentFailurePageProps {
  onNavigate: (page: string) => void;
}

export default function PaymentFailurePage({
  onNavigate,
}: PaymentFailurePageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Glow ring */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full bg-destructive/10 blur-2xl" />
          <div className="w-20 h-20 rounded-full bg-destructive/15 border border-destructive/40 flex items-center justify-center relative">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Payment Cancelled
          </h1>
          <p className="text-muted-foreground text-sm">
            Aapka payment complete nahi hua. Koi amount deduct nahi kiya gaya.
          </p>
        </div>

        <div className="bg-card border border-destructive/20 rounded-xl p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-destructive font-semibold">CANCELLED</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wallet Balance</span>
            <span className="font-medium">Unchanged</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onNavigate("wallet")}
          data-ocid="payment_failure.primary_button"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
