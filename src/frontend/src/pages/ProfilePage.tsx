import { Button } from "@/components/ui/button";
import {
  Clock,
  CreditCard,
  Fingerprint,
  Gift,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import type { Page } from "../App";
import type { UserProfile } from "../backend";
import { KYCStatus } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useTradeHistory } from "../hooks/useQueries";

function trialInfo(profile: UserProfile): { days: number; active: boolean } {
  const nowNs = BigInt(Date.now()) * BigInt(1_000_000);
  const durationNs = BigInt(17 * 24 * 3600) * BigInt(1_000_000_000);
  const endNs = profile.trialEndTime ?? profile.registrationTime + durationNs;
  const remainMs = Number((endNs - nowNs) / BigInt(1_000_000));
  const days = Math.max(0, Math.ceil(remainMs / (1000 * 60 * 60 * 24)));
  return { days, active: days > 0 };
}

const KYC_CONFIG: Record<
  KYCStatus,
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  [KYCStatus.verified]: {
    label: "Verified",
    icon: ShieldCheck,
    color: "text-gain",
  },
  [KYCStatus.pending]: {
    label: "Pending Review",
    icon: Clock,
    color: "text-warning",
  },
  [KYCStatus.unverified]: {
    label: "Unverified",
    icon: ShieldAlert,
    color: "text-muted-foreground",
  },
  [KYCStatus.banned]: {
    label: "Banned",
    icon: ShieldAlert,
    color: "text-destructive",
  },
};

export default function ProfilePage({
  profile,
  setPage,
}: {
  profile: UserProfile;
  setPage: (p: Page) => void;
}) {
  const { clear, identity } = useInternetIdentity();
  const { data: tradeHistory = [] } = useTradeHistory();
  const trial = trialInfo(profile);
  const tradeCount = tradeHistory.length;
  const freeTradesLeft = Math.max(0, 7 - tradeCount);
  const kycCfg =
    KYC_CONFIG[profile.kycStatus] ?? KYC_CONFIG[KYCStatus.unverified];
  const KycIcon = kycCfg.icon;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Profile</h1>
          <p className="text-xs text-muted-foreground">
            Account &amp; KYC status
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
        data-ocid="profile.card"
      >
        <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5 border-b border-border relative">
          <div className="absolute bottom-0 left-6 translate-y-1/2 w-14 h-14 rounded-full bg-primary/15 border-2 border-border flex items-center justify-center">
            <span className="text-xl font-bold text-primary">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="pt-10 pb-5 px-6">
          <h2 className="text-xl font-bold">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">
            Age {Number(profile.age)} · Joined{" "}
            {new Date(
              Number(profile.registrationTime / BigInt(1_000_000)),
            ).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </p>
          <div className={`flex items-center gap-1.5 mt-3 ${kycCfg.color}`}>
            <KycIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">KYC {kycCfg.label}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { icon: Mail, label: "Email", value: profile.email },
          { icon: Phone, label: "Mobile", value: profile.mobile },
          {
            icon: Fingerprint,
            label: "Aadhaar",
            value: `XXXX XXXX ${profile.aadhaarMock.slice(-4)}`,
          },
          {
            icon: CreditCard,
            label: "PAN",
            value: `${profile.panMock.substring(0, 3)}XXXXX${profile.panMock.slice(-2)}`,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-card border border-border rounded-lg p-4 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-data font-medium truncate">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className={`bg-card border rounded-lg p-4 ${trial.active ? "border-primary/30" : "border-border"}`}
          data-ocid="profile.trial.card"
        >
          <div className="flex items-center gap-2 mb-2">
            <Clock
              className={`w-4 h-4 ${trial.active ? "text-primary" : "text-muted-foreground"}`}
            />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Free Trial
            </span>
          </div>
          {trial.active ? (
            <>
              <p className="text-2xl font-bold font-data text-primary">
                {trial.days}
              </p>
              <p className="text-xs text-muted-foreground">days remaining</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-muted-foreground">
                Expired
              </p>
              <p className="text-xs text-muted-foreground">
                17-day trial ended
              </p>
            </>
          )}
        </div>

        <div
          className={`bg-card border rounded-lg p-4 ${freeTradesLeft > 0 ? "border-gain/30" : "border-border"}`}
          data-ocid="profile.trades.card"
        >
          <div className="flex items-center gap-2 mb-2">
            <Gift
              className={`w-4 h-4 ${freeTradesLeft > 0 ? "text-gain" : "text-muted-foreground"}`}
            />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Free Trades
            </span>
          </div>
          <p
            className={`text-2xl font-bold font-data ${freeTradesLeft > 0 ? "text-gain" : "text-muted-foreground"}`}
          >
            {freeTradesLeft}
          </p>
          <p className="text-xs text-muted-foreground">of 7 remaining</p>
        </div>

        <div
          className="bg-card border border-border rounded-lg p-4"
          data-ocid="profile.stats.card"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Total Trades
            </span>
          </div>
          <p className="text-2xl font-bold font-data">{tradeCount}</p>
          <p className="text-xs text-muted-foreground">
            {profile.isTaxFree ? "Tax free" : "0.1% tax applies"}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-xs text-muted-foreground mb-1">
          Internet Identity Principal
        </p>
        <p className="font-data text-xs text-muted-foreground/70 break-all">
          {identity?.getPrincipal().toString() ?? "—"}
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          data-ocid="profile.dashboard.button"
          variant="outline"
          onClick={() => setPage("dashboard")}
          className="flex-1"
        >
          Go to Dashboard
        </Button>
        <Button
          data-ocid="profile.logout.button"
          variant="destructive"
          onClick={clear}
          className="flex-1"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
