import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  Fingerprint,
  Gift,
  LogOut,
  Mail,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Page } from "../App";
import type { UserProfile } from "../backend";
import { KYCStatus } from "../backend";
import { usePWAInstall } from "../components/PWAInstallBanner";
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

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [installMsg, setInstallMsg] = useState("");

  const { canInstall, isInstalled, triggerInstall } = usePWAInstall();

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    const encodedSubject = encodeURIComponent(subject || "CFS App Support");
    const encodedBody = encodeURIComponent(message);
    window.location.href = `mailto:bhagansoren124@gmail.com?subject=${encodedSubject}&body=${encodedBody}`;
    setSent(true);
    setSubject("");
    setMessage("");
    setTimeout(() => setSent(false), 3000);
  }

  async function handleInstallClick() {
    if (isInstalled) {
      setInstallMsg("App is already installed on your device.");
      setTimeout(() => setInstallMsg(""), 3000);
      return;
    }
    if (!canInstall) {
      setInstallMsg("Open Chrome menu > Add to Home Screen");
      setTimeout(() => setInstallMsg(""), 4000);
      return;
    }
    const accepted = await triggerInstall();
    if (accepted) {
      setInstallMsg("App installed successfully!");
      setTimeout(() => setInstallMsg(""), 3000);
    }
  }

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

      {/* App Install Section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card border border-gain/20 rounded-xl p-5"
        data-ocid="profile.app.card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gain/10 border border-gain/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-gain" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Install CFS App</h3>
            <p className="text-xs text-muted-foreground">
              Add to Home Screen for a native app experience
            </p>
          </div>
        </div>

        <Button
          onClick={handleInstallClick}
          data-ocid="profile.app.primary_button"
          className="w-full gap-2 bg-gain hover:bg-gain/90 text-black font-semibold"
        >
          <Download className="w-4 h-4" />
          {isInstalled ? "Already Installed" : "Install App"}
        </Button>

        <AnimatePresence>
          {installMsg && (
            <motion.p
              key="install-msg"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-xs text-muted-foreground mt-3 text-center"
              data-ocid="profile.app.success_state"
            >
              {installMsg}
            </motion.p>
          )}
        </AnimatePresence>

        <p className="text-xs text-muted-foreground/60 mt-3 text-center">
          Works on Android Chrome, Samsung Internet & Edge
        </p>
      </motion.div>

      <div
        className="bg-card border border-primary/20 rounded-lg p-4 flex items-center gap-3"
        data-ocid="profile.contact.card"
      >
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Contact Support</p>
          <a
            href="mailto:bhagansoren124@gmail.com"
            className="text-sm font-medium text-primary hover:underline truncate block"
          >
            bhagansoren124@gmail.com
          </a>
        </div>
      </div>

      {/* Contact Form */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl p-5 space-y-4"
        data-ocid="profile.contact.panel"
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Send a Message</h3>
            <p className="text-xs text-muted-foreground">
              We'll respond to your email
            </p>
          </div>
        </div>

        <form onSubmit={handleContactSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="contact-subject"
              className="text-xs text-muted-foreground"
            >
              Subject
            </Label>
            <Input
              id="contact-subject"
              data-ocid="contact.subject.input"
              placeholder="e.g. Trade issue, Account query..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="bg-background border-border text-sm h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="contact-message"
              className="text-xs text-muted-foreground"
            >
              Message
            </Label>
            <Textarea
              id="contact-message"
              data-ocid="contact.message.textarea"
              placeholder="Describe your issue or question in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="bg-background border-border text-sm resize-none"
            />
          </div>

          <AnimatePresence>
            {sent && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 text-gain text-sm py-1"
                data-ocid="contact.success_state"
              >
                <CheckCircle className="w-4 h-4" />
                Message sent via email app
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            data-ocid="contact.submit_button"
            className="w-full gap-2"
            disabled={sent}
          >
            <Send className="w-4 h-4" />
            Send Message
          </Button>
        </form>
      </motion.div>

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
