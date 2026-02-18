import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Currency = "EUR" | "USD" | "GBP";

// Approximate rates relative to EUR (base)
const RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
};

const SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
};

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  symbol: string;
  format: (amountInEur: number) => string;
  convertFromEur: (amountInEur: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "EUR",
  setCurrency: () => {},
  symbol: "€",
  format: (n) => `€${n.toFixed(2)}`,
  convertFromEur: (n) => n,
});

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    return (localStorage.getItem("preferred_currency") as Currency) || "EUR";
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("preferred_currency", c);
  };

  const convertFromEur = (amountInEur: number) => amountInEur * RATES[currency];

  const format = (amountInEur: number) => {
    const converted = convertFromEur(amountInEur);
    return `${SYMBOLS[currency]}${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, symbol: SYMBOLS[currency], format, convertFromEur }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
export { SYMBOLS };
