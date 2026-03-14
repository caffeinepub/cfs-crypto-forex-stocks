import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  History,
  LayoutDashboard,
  LogOut,
  PieChart,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
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
  { page: "portfolio", label: "Portfolio", icon: PieChart },
  { page: "history", label: "History", icon: History },
  { page: "profile", label: "Profile", icon: User },
];

const CURRENCIES: Currency[] = ["USD", "INR", "AED"];

interface LayoutProps {
  page: Page;
  setPage: (p: Page) => void;
  profile: UserProfile;
  children: ReactNode;
}

export default function Layout({ page, setPage, children }: LayoutProps) {
  const { clear } = useInternetIdentity();
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          <img
            src="/assets/generated/cfs-logo-transparent.dim_320x120.png"
            alt="CFS"
            className="h-8 w-auto"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
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
            onClick={clear}
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
          <img
            src="/assets/generated/cfs-logo-transparent.dim_320x120.png"
            alt="CFS"
            className="h-7"
          />
          <div className="flex items-center gap-2">
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
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
