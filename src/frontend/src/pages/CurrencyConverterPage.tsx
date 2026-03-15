import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, Search, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  country: string;
  flag: string;
  rateToUSD: number; // how many of this currency = 1 USD
}

const CURRENCIES: CurrencyInfo[] = [
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    country: "United States",
    flag: "🇺🇸",
    rateToUSD: 1,
  },
  {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    country: "India",
    flag: "🇮🇳",
    rateToUSD: 83.45,
  },
  {
    code: "AED",
    symbol: "د.إ",
    name: "UAE Dirham",
    country: "UAE",
    flag: "🇦🇪",
    rateToUSD: 3.6725,
  },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    country: "Eurozone",
    flag: "🇪🇺",
    rateToUSD: 0.9215,
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    country: "United Kingdom",
    flag: "🇬🇧",
    rateToUSD: 0.7892,
  },
  {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    country: "Japan",
    flag: "🇯🇵",
    rateToUSD: 149.82,
  },
  {
    code: "CNY",
    symbol: "¥",
    name: "Chinese Yuan",
    country: "China",
    flag: "🇨🇳",
    rateToUSD: 7.2341,
  },
  {
    code: "CAD",
    symbol: "CA$",
    name: "Canadian Dollar",
    country: "Canada",
    flag: "🇨🇦",
    rateToUSD: 1.3652,
  },
  {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    country: "Australia",
    flag: "🇦🇺",
    rateToUSD: 1.5423,
  },
  {
    code: "CHF",
    symbol: "CHF",
    name: "Swiss Franc",
    country: "Switzerland",
    flag: "🇨🇭",
    rateToUSD: 0.8991,
  },
  {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    country: "Singapore",
    flag: "🇸🇬",
    rateToUSD: 1.3478,
  },
  {
    code: "HKD",
    symbol: "HK$",
    name: "Hong Kong Dollar",
    country: "Hong Kong",
    flag: "🇭🇰",
    rateToUSD: 7.8234,
  },
  {
    code: "MYR",
    symbol: "RM",
    name: "Malaysian Ringgit",
    country: "Malaysia",
    flag: "🇲🇾",
    rateToUSD: 4.7123,
  },
  {
    code: "THB",
    symbol: "฿",
    name: "Thai Baht",
    country: "Thailand",
    flag: "🇹🇭",
    rateToUSD: 35.412,
  },
  {
    code: "IDR",
    symbol: "Rp",
    name: "Indonesian Rupiah",
    country: "Indonesia",
    flag: "🇮🇩",
    rateToUSD: 15832,
  },
  {
    code: "PHP",
    symbol: "₱",
    name: "Philippine Peso",
    country: "Philippines",
    flag: "🇵🇭",
    rateToUSD: 56.234,
  },
  {
    code: "KRW",
    symbol: "₩",
    name: "South Korean Won",
    country: "South Korea",
    flag: "🇰🇷",
    rateToUSD: 1325.4,
  },
  {
    code: "BDT",
    symbol: "৳",
    name: "Bangladeshi Taka",
    country: "Bangladesh",
    flag: "🇧🇩",
    rateToUSD: 109.85,
  },
  {
    code: "PKR",
    symbol: "₨",
    name: "Pakistani Rupee",
    country: "Pakistan",
    flag: "🇵🇰",
    rateToUSD: 278.32,
  },
  {
    code: "LKR",
    symbol: "Rs",
    name: "Sri Lankan Rupee",
    country: "Sri Lanka",
    flag: "🇱🇰",
    rateToUSD: 322.45,
  },
  {
    code: "NPR",
    symbol: "Rs",
    name: "Nepalese Rupee",
    country: "Nepal",
    flag: "🇳🇵",
    rateToUSD: 133.52,
  },
  {
    code: "SAR",
    symbol: "﷼",
    name: "Saudi Riyal",
    country: "Saudi Arabia",
    flag: "🇸🇦",
    rateToUSD: 3.7501,
  },
  {
    code: "QAR",
    symbol: "﷼",
    name: "Qatari Riyal",
    country: "Qatar",
    flag: "🇶🇦",
    rateToUSD: 3.641,
  },
  {
    code: "KWD",
    symbol: "KD",
    name: "Kuwaiti Dinar",
    country: "Kuwait",
    flag: "🇰🇼",
    rateToUSD: 0.3078,
  },
  {
    code: "BHD",
    symbol: "BD",
    name: "Bahraini Dinar",
    country: "Bahrain",
    flag: "🇧🇭",
    rateToUSD: 0.377,
  },
  {
    code: "OMR",
    symbol: "OMR",
    name: "Omani Rial",
    country: "Oman",
    flag: "🇴🇲",
    rateToUSD: 0.385,
  },
  {
    code: "ZAR",
    symbol: "R",
    name: "South African Rand",
    country: "South Africa",
    flag: "🇿🇦",
    rateToUSD: 18.923,
  },
  {
    code: "BRL",
    symbol: "R$",
    name: "Brazilian Real",
    country: "Brazil",
    flag: "🇧🇷",
    rateToUSD: 4.9723,
  },
  {
    code: "MXN",
    symbol: "MX$",
    name: "Mexican Peso",
    country: "Mexico",
    flag: "🇲🇽",
    rateToUSD: 17.234,
  },
  {
    code: "RUB",
    symbol: "₽",
    name: "Russian Ruble",
    country: "Russia",
    flag: "🇷🇺",
    rateToUSD: 91.23,
  },
  {
    code: "TRY",
    symbol: "₺",
    name: "Turkish Lira",
    country: "Turkey",
    flag: "🇹🇷",
    rateToUSD: 32.145,
  },
  {
    code: "EGP",
    symbol: "E£",
    name: "Egyptian Pound",
    country: "Egypt",
    flag: "🇪🇬",
    rateToUSD: 48.923,
  },
  {
    code: "NGN",
    symbol: "₦",
    name: "Nigerian Naira",
    country: "Nigeria",
    flag: "🇳🇬",
    rateToUSD: 1523.4,
  },
];

const POPULAR_PAIRS = [
  { from: "USD", to: "INR" },
  { from: "INR", to: "USD" },
  { from: "USD", to: "EUR" },
  { from: "GBP", to: "INR" },
  { from: "AED", to: "INR" },
  { from: "EUR", to: "INR" },
  { from: "JPY", to: "INR" },
  { from: "USD", to: "AED" },
  { from: "SAR", to: "INR" },
  { from: "USD", to: "GBP" },
  { from: "KWD", to: "INR" },
  { from: "USD", to: "SGD" },
];

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

function getCurrency(code: string): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  const fromRate = rates[from] ?? getCurrency(from).rateToUSD;
  const toRate = rates[to] ?? getCurrency(to).rateToUSD;
  // amount in `from` -> USD -> `to`
  const usd = amount / fromRate;
  return usd * toRate;
}

function formatAmount(val: number, code: string): string {
  if (val === 0) return "0";
  // For currencies like IDR, KRW, NGN use no decimal
  const noDecimal = ["IDR", "KRW", "NGN", "JPY"];
  if (noDecimal.includes(code)) {
    return val.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  if (val >= 1) {
    return val.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
  }
  return val.toLocaleString("en-IN", { maximumFractionDigits: 6 });
}

interface CurrencyPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  selected: string;
}

function CurrencyPicker({
  open,
  onClose,
  onSelect,
  selected,
}: CurrencyPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      data-ocid="converter.currency.modal"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div className="relative bg-card border-t border-border rounded-t-2xl flex flex-col max-h-[85vh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h3 className="text-lg font-bold">Select Currency</h3>
          <button
            type="button"
            data-ocid="converter.currency.close_button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="converter.currency.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search currency or country..."
              className="pl-9 bg-background border-border"
              autoFocus
            />
          </div>
        </div>
        {/* List */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-2 pb-6">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                data-ocid={`converter.currency.item.${CURRENCIES.indexOf(c) + 1}`}
                onClick={() => {
                  onSelect(c.code);
                  onClose();
                  setSearch("");
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                  selected === c.code
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-muted/50 text-foreground"
                }`}
              >
                <span className="text-2xl leading-none">{c.flag}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{c.code}</span>
                    <span className="text-muted-foreground text-xs">
                      {c.symbol}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.name} · {c.country}
                  </div>
                </div>
                {selected === c.code && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div
                className="text-center text-muted-foreground py-12 text-sm"
                data-ocid="converter.currency.empty_state"
              >
                No currencies found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default function CurrencyConverterPage() {
  const [fromCode, setFromCode] = useState("USD");
  const [toCode, setToCode] = useState("INR");
  const [inputAmount, setInputAmount] = useState("1");
  const [pickerFor, setPickerFor] = useState<"from" | "to" | null>(null);
  const [rates, setRates] = useState<Record<string, number>>(() =>
    Object.fromEntries(CURRENCIES.map((c) => [c.code, c.rateToUSD])),
  );
  // Fluctuate rates every 5s
  useEffect(() => {
    const id = setInterval(() => {
      setRates((prev) => {
        const next = { ...prev };
        for (const code of Object.keys(next)) {
          if (code === "USD") continue;
          const change = 1 + (Math.random() - 0.5) * 0.004;
          next[code] = next[code] * change;
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const amount = Number.parseFloat(inputAmount) || 0;
  const converted = convert(amount, fromCode, toCode, rates);
  const fromInfo = getCurrency(fromCode);
  const toInfo = getCurrency(toCode);

  // Rate display: 1 FROM = X TO
  const oneUnit = convert(1, fromCode, toCode, rates);

  const handleSwap = useCallback(() => {
    setFromCode(toCode);
    setToCode(fromCode);
  }, [fromCode, toCode]);

  const handleQuickAmount = (val: number) => setInputAmount(String(val));

  const handlePopularPair = (from: string, to: string) => {
    setFromCode(from);
    setToCode(to);
    setInputAmount("1");
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <ArrowUpDown className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-display">Currency Converter</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-10">
          Real-time exchange rates · Updates every 5s
        </p>
      </div>

      <div className="px-4 space-y-3">
        {/* FROM card */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
            From
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="converter.from.select"
              onClick={() => setPickerFor("from")}
              className="flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-xl px-3 py-2 transition-colors shrink-0"
            >
              <span className="text-2xl">{fromInfo.flag}</span>
              <div className="text-left">
                <div className="font-bold text-sm">{fromCode}</div>
                <div className="text-xs text-muted-foreground">
                  {fromInfo.name}
                </div>
              </div>
              <span className="text-muted-foreground ml-1">▾</span>
            </button>
            <div className="flex-1">
              <Input
                data-ocid="converter.from.input"
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className="text-right text-2xl font-bold h-14 bg-transparent border-none focus-visible:ring-0 p-0 text-foreground"
                placeholder="0"
              />
              <div className="text-right text-xs text-muted-foreground mt-1">
                {fromInfo.symbol} {fromInfo.country}
              </div>
            </div>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center relative z-10 -my-1">
          <button
            type="button"
            data-ocid="converter.swap.button"
            onClick={handleSwap}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
          >
            <ArrowUpDown className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>

        {/* TO card */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">
            To
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-ocid="converter.to.select"
              onClick={() => setPickerFor("to")}
              className="flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-xl px-3 py-2 transition-colors shrink-0"
            >
              <span className="text-2xl">{toInfo.flag}</span>
              <div className="text-left">
                <div className="font-bold text-sm">{toCode}</div>
                <div className="text-xs text-muted-foreground">
                  {toInfo.name}
                </div>
              </div>
              <span className="text-muted-foreground ml-1">▾</span>
            </button>
            <div className="flex-1">
              <div className="text-right text-2xl font-bold py-3 text-primary">
                {formatAmount(converted, toCode)}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                {toInfo.symbol} {toInfo.country}
              </div>
            </div>
          </div>
        </div>

        {/* Rate display */}
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Live Rate</span>
          </div>
          <div className="text-sm font-semibold">
            <span className="text-muted-foreground">1 {fromCode} = </span>
            <span className="text-primary">
              {formatAmount(oneUnit, toCode)} {toCode}
            </span>
          </div>
        </div>

        {/* Quick amounts */}
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Quick Amount
          </div>
          <div className="flex gap-2 flex-wrap">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                data-ocid="converter.quick.button"
                onClick={() => handleQuickAmount(amt)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  Number(inputAmount) === amt
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {fromInfo.symbol}
                {amt.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Pairs */}
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Popular Pairs
          </div>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR_PAIRS.map((pair, i) => {
              const fromC = getCurrency(pair.from);
              const toC = getCurrency(pair.to);
              const rate = convert(1, pair.from, pair.to, rates);
              const isActive = fromCode === pair.from && toCode === pair.to;
              return (
                <button
                  key={`${pair.from}-${pair.to}`}
                  type="button"
                  data-ocid={`converter.pair.item.${i + 1}`}
                  onClick={() => handlePopularPair(pair.from, pair.to)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${
                    isActive
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex -space-x-1">
                    <span className="text-base">{fromC.flag}</span>
                    <span className="text-base">{toC.flag}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold">
                      {pair.from}/{pair.to}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      1 {pair.from} = {formatAmount(rate, pair.to)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-xs text-muted-foreground/60 pt-2 pb-4">
          Rates are simulated for demo purposes only. Not for financial use.
        </div>
      </div>

      {/* Currency Picker Bottom Sheet */}
      <CurrencyPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        selected={pickerFor === "from" ? fromCode : toCode}
        onSelect={(code) => {
          if (pickerFor === "from") setFromCode(code);
          else setToCode(code);
        }}
      />
    </div>
  );
}
