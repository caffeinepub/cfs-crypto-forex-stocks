import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Globe,
  Loader2,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const features = [
  {
    icon: Zap,
    title: "17-Day Free Trial",
    desc: "Trade with virtual funds, no risk",
  },
  {
    icon: TrendingUp,
    title: "7 Tax-Free Trades",
    desc: "First 7 trades with zero commission",
  },
  {
    icon: Shield,
    title: "KYC Verified",
    desc: "Aadhaar & PAN verified security",
  },
  { icon: Globe, title: "Multi-Currency", desc: "INR, USD & AED supported" },
];

const tickers = [
  { name: "BTC", price: "$43,500", change: "+2.5%", up: true },
  { name: "ETH", price: "$2,300", change: "-1.2%", up: false },
  { name: "NIFTY", price: "₹21,500", change: "+1.1%", up: true },
  { name: "EUR/USD", price: "1.0850", change: "+0.3%", up: true },
  { name: "XRP", price: "$0.62", change: "+5.8%", up: true },
  { name: "SENSEX", price: "₹71,200", change: "+1.3%", up: true },
  { name: "GBP/USD", price: "1.2650", change: "-0.5%", up: false },
  { name: "RELIANCE", price: "₹2,450", change: "-0.8%", up: false },
];

const doubleTickers = [...tickers, ...tickers];

export default function LandingPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Ticker strip */}
      <div className="border-b border-border bg-sidebar overflow-hidden">
        <div className="flex animate-[scroll_30s_linear_infinite] whitespace-nowrap py-2">
          {doubleTickers.map((t, i) => (
            <span
              key={`${t.name}-${i}`}
              className="inline-flex items-center gap-2 px-6 text-xs"
            >
              <span className="font-semibold text-foreground">{t.name}</span>
              <span className="font-data text-muted-foreground">{t.price}</span>
              <span className={t.up ? "text-gain" : "text-loss"}>
                {t.change}
              </span>
              <span className="text-border ml-4">|</span>
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <img
          src="/assets/uploads/image_9e2fa18e-1-1.png"
          alt="CFS"
          className="h-10 w-auto"
        />
        <Button
          data-ocid="nav.primary_button"
          onClick={login}
          disabled={isLoggingIn}
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          {isLoggingIn ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Login
        </Button>
      </header>

      {/* Hero */}
      <main className="relative">
        <div className="absolute inset-0 grid-bg opacity-60 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5 text-xs text-primary font-semibold mb-6">
              <Zap className="w-3 h-3" />
              17-Day Free Trial · No Credit Card Required
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6"
          >
            Trade <span className="text-primary">Crypto,</span>
            <br />
            <span className="text-gain">Forex</span> &amp;{" "}
            <span style={{ color: "oklch(var(--warning))" }}>Stocks</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Professional-grade trading platform with real-time market data, KYC
            compliance, and smart tax management. Trade BTC, NIFTY, EUR/USD and
            more.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              data-ocid="hero.primary_button"
              onClick={login}
              disabled={isLoggingIn}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold glow-cyan px-8 text-base"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-5 h-5 mr-2" />
              )}
              Start Trading Free
            </Button>
            <Button
              data-ocid="hero.secondary_button"
              variant="outline"
              size="lg"
              className="border-border text-muted-foreground hover:text-foreground text-base"
            >
              View Markets
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex flex-wrap justify-center gap-8 text-center"
          >
            {[
              { label: "Markets", value: "9+" },
              { label: "Free Trial", value: "17 days" },
              { label: "Free Trades", value: "7" },
              { label: "Tax (after)", value: "0.1%" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-primary font-data">
                  {s.value}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="max-w-5xl mx-auto px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {features.map((f) => (
              <div key={f.title} className="asset-card p-5 text-left">
                <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center mb-3">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="font-semibold text-sm mb-1">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        <p>
          Age 17+ only. Demo platform — not financial advice. SEBI/RBI compliant
          KYC required.
        </p>
        <p className="mt-1">
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
        <p className="mt-1">
          Contact:{" "}
          <a
            href="mailto:bhagansoren124@gmail.com"
            className="text-primary hover:underline"
          >
            bhagansoren124@gmail.com
          </a>
        </p>
      </footer>

      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
