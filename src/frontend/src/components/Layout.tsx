import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeftRight,
  BarChart2,
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  PieChart,
  ShieldAlert,
  User,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Page } from "../App";
import type { UserProfile } from "../backend";
import { type Currency, useCurrency } from "../hooks/useCurrency";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const NAV_ITEMS: {
  page: Page;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { page: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { page: "market", label: "Markets", icon: BarChart2 },
  { page: "portfolio", label: "Portfolio", icon: PieChart },
  { page: "history", label: "History", icon: History },
  { page: "wallet", label: "Wallet", icon: Wallet },
  { page: "converter", label: "Converter", icon: ArrowLeftRight },
  { page: "profile", label: "Profile", icon: User },
];

const CURRENCIES: Currency[] = ["USD", "INR", "AED"];

interface LayoutProps {
  page: Page;
  setPage: (p: Page) => void;
  profile: UserProfile;
  children: ReactNode;
  onLogout?: () => void;
}

export default function Layout({
  page,
  setPage,
  children,
  onLogout,
}: LayoutProps) {
  const { clear } = useInternetIdentity();
  const { currency, setCurrency } = useCurrency();

  // Triple-tap on logo to show admin link
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [adminVisible, setAdminVisible] = useState(false);

  function handleLogoTap() {
    const now = Date.now();
    const newCount = now - lastTapTime < 1000 ? tapCount + 1 : 1;
    setTapCount(newCount);
    setLastTapTime(now);
    if (newCount >= 3) {
      setAdminVisible(true);
      setTapCount(0);
    }
  }

  function handleLogout() {
    onLogout?.();
    clear();
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30">
        {/* Logo -- triple tap to reveal admin */}
        <button
          type="button"
          className="px-4 py-5 border-b border-sidebar-border cursor-pointer select-none text-left"
          onClick={handleLogoTap}
        >
          <img
            src="/assets/uploads/image_9e2fa18e-1-1.png"
            alt="CFS"
            className="h-10 w-auto"
          />
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.page}
              type="button"
              data-ocid={`nav.${item.page}.link`}
              onClick={() => setPage(item.page)}
              className={`sidebar-link ${page === item.page ? "active" : ""}`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
          {adminVisible && (
            <button
              type="button"
              data-ocid="nav.admin.link"
              onClick={() => setPage("admin")}
              className={`sidebar-link text-amber-500/60 hover:text-amber-500 ${
                page === "admin" ? "active" : ""
              }`}
            >
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span className="text-xs">Admin</span>
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              data-ocid="nav.currency.select"
              className="sidebar-link w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold w-4 h-4 flex items-center justify-center">
                  {currency === "USD" ? "$" : currency === "INR" ? "₹" : "د"}
                </span>
                {currency}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              data-ocid="nav.currency.dropdown_menu"
              align="start"
              className="w-40"
            >
              {CURRENCIES.map((c) => (
                <DropdownMenuItem
                  key={c}
                  data-ocid={`nav.${c.toLowerCase()}.toggle`}
                  onClick={() => setCurrency(c)}
                  className={currency === c ? "text-primary" : ""}
                >
                  {c === "USD"
                    ? "$ USD — Dollar"
                    : c === "INR"
                      ? "₹ INR — Rupee"
                      : "د.إ AED — Dirham"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            data-ocid="nav.logout.button"
            onClick={handleLogout}
            className="sidebar-link text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar sticky top-0 z-20">
          <button
            type="button"
            onClick={handleLogoTap}
            className="p-0 bg-transparent border-none"
          >
            <img
              src="/assets/uploads/image_9e2fa18e-1-1.png"
              alt="CFS"
              className="h-9 w-auto"
            />
          </button>
          <div className="flex items-center gap-2">
            {adminVisible && (
              <button
                type="button"
                data-ocid="nav.admin.link"
                onClick={() => setPage("admin")}
                className="text-amber-500/60 hover:text-amber-500 p-1"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                data-ocid="mobile.currency.select"
                className="text-xs border border-border rounded px-2 py-1 flex items-center gap-1 text-muted-foreground"
              >
                {currency} <ChevronDown className="w-3 h-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent data-ocid="mobile.currency.dropdown_menu">
                {CURRENCIES.map((c) => (
                  <DropdownMenuItem
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={currency === c ? "text-primary" : ""}
                  >
                    {c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-border bg-sidebar z-20 flex">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.page}
            type="button"
            data-ocid={`mobile.nav.${item.page}.link`}
            onClick={() => setPage(item.page)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              page === item.page
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
