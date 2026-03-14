import {
  type ReactNode,
  createContext,
  createElement,
  useContext,
  useState,
} from "react";

export type Currency = "USD" | "INR" | "AED";

const RATES: Record<Currency, number> = { USD: 1, INR: 83, AED: 3.67 };
const SYMBOLS: Record<Currency, string> = { USD: "$", INR: "₹", AED: "د.إ" };

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convert: (usdAmount: number) => number;
  format: (usdAmount: number) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(
  undefined,
);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("USD");

  const convert = (usdAmount: number): number => usdAmount * RATES[currency];

  const format = (usdAmount: number): string => {
    const amount = convert(usdAmount);
    const sym = SYMBOLS[currency];
    if (currency === "INR" && amount >= 10_000_000)
      return `${sym}${(amount / 10_000_000).toFixed(2)}Cr`;
    if (currency === "INR" && amount >= 100_000)
      return `${sym}${(amount / 100_000).toFixed(2)}L`;
    if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(3)}M`;
    if (amount >= 1_000)
      return `${sym}${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    return `${sym}${amount.toFixed(amount < 1 ? 6 : 2)}`;
  };

  const value: CurrencyContextValue = {
    currency,
    setCurrency,
    convert,
    format,
    symbol: SYMBOLS[currency],
  };

  return createElement(CurrencyContext.Provider, { value, children });
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("CurrencyProvider not found");
  return ctx;
}
