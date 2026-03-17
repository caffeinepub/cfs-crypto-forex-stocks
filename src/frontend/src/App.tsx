import { Toaster } from "@/components/ui/sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { KYCStatus } from "./backend";
import type { UserProfile } from "./backend";
import AppLockScreen from "./components/AppLockScreen";
import Layout from "./components/Layout";
import { useActor } from "./hooks/useActor";
import { CurrencyProvider } from "./hooks/useCurrency";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { MarketDataProvider } from "./hooks/useMarketData";
import { useCallerProfile } from "./hooks/useQueries";
import AdminPage from "./pages/AdminPage";
import CurrencyConverterPage from "./pages/CurrencyConverterPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import LandingPage from "./pages/LandingPage";
import MarketPage from "./pages/MarketPage";
import PaymentFailurePage from "./pages/PaymentFailurePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PortfolioPage from "./pages/PortfolioPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import WalletPage from "./pages/WalletPage";
import { recordSessionEnd, recordSessionStart } from "./utils/sessionTracker";

export type Page =
  | "dashboard"
  | "market"
  | "portfolio"
  | "history"
  | "profile"
  | "wallet"
  | "converter"
  | "admin";

function LoadingScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20" />
          <Loader2 className="w-12 h-12 animate-spin text-primary absolute inset-0" />
        </div>
        <p className="text-muted-foreground text-sm font-mono">
          {message ?? "Loading..."}
        </p>
      </div>
    </div>
  );
}

function BanScreen({ profile }: { profile: UserProfile }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
        <p className="text-muted-foreground mb-4">
          Your account has been temporarily suspended for 48 hours due to a
          verification violation.
        </p>
        <div className="bg-card border border-border rounded-lg p-4 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account</span>
            <span className="font-medium truncate ml-4">{profile.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-destructive font-semibold">BANNED</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">KYC</span>
            <span className="text-warning">
              {profile.kycStatus.toUpperCase()}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Contact support if you believe this is an error.
        </p>
      </div>
    </div>
  );
}

function AppInner() {
  const { identity, isInitializing } = useInternetIdentity();
  const { isFetching: actorFetching } = useActor();
  const { data: profile, isPending: profilePending } = useCallerProfile();
  const [page, setPage] = useState<Page>("dashboard");
  const [unlocked, setUnlocked] = useState(false);

  // Record session end when user closes the tab
  useEffect(() => {
    if (!unlocked || !profile) return;
    const handleUnload = () => {
      recordSessionEnd(profile.name);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [unlocked, profile]);

  if (isInitializing) return <LoadingScreen message="Initializing CFS..." />;
  if (!identity) return <LandingPage />;
  if (actorFetching || profilePending)
    return <LoadingScreen message="Connecting to chain..." />;
  if (!profile) return <RegisterPage />;
  if (profile.kycStatus === KYCStatus.banned)
    return <BanScreen profile={profile} />;

  // Security lock screen -- shown after login until PIN/fingerprint verified
  if (!unlocked) {
    return (
      <AppLockScreen
        userId={profile.name}
        onUnlocked={() => {
          recordSessionStart(profile.name);
          setUnlocked(true);
        }}
      />
    );
  }

  function handleLogout() {
    recordSessionEnd(profile!.name);
  }

  return (
    <Layout
      page={page}
      setPage={setPage}
      profile={profile}
      onLogout={handleLogout}
    >
      {page === "dashboard" && <DashboardPage profile={profile} />}
      {page === "market" && <MarketPage profile={profile} />}
      {page === "portfolio" && <PortfolioPage profile={profile} />}
      {page === "history" && <HistoryPage />}
      {page === "profile" && (
        <ProfilePage profile={profile} setPage={setPage} />
      )}
      {page === "wallet" && <WalletPage />}
      {page === "converter" && <CurrencyConverterPage />}
      {page === "admin" && <AdminPage />}
    </Layout>
  );
}

export default function App() {
  const path = window.location.pathname;

  if (path === "/payment-success") {
    return (
      <PaymentSuccessPage
        onNavigate={(_pg) => {
          window.history.pushState({}, "", "/");
          window.location.reload();
        }}
      />
    );
  }

  if (path === "/payment-failure") {
    return (
      <PaymentFailurePage
        onNavigate={(_pg) => {
          window.history.pushState({}, "", "/");
          window.location.reload();
        }}
      />
    );
  }

  return (
    <CurrencyProvider>
      <MarketDataProvider>
        <AppInner />
        <Toaster position="top-right" />
      </MarketDataProvider>
    </CurrencyProvider>
  );
}
