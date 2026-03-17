# CFS - Crypto Forex Stocks

## Current State
App has a Dashboard page with asset cards (grid layout) for Crypto, Forex, Stocks, and Favorites tabs. No dedicated Markets overview page exists. Navigation includes: Dashboard, Portfolio, History, Wallet, Converter, Profile.

## Requested Changes (Diff)

### Add
- New `MarketPage` (`src/frontend/src/pages/MarketPage.tsx`) — a Binance-style full markets overview page
  - Top header with total assets count and live badge
  - Category tabs: All | Crypto | Forex | Stocks
  - Sub-filter pills: Hot | Gainers | Losers | New
  - Search input to filter by name/symbol
  - Table layout (like Binance) with columns: #, Name, Price, 24h Change, High/Low, Volume (simulated), sparkline trend arrow
  - Sortable columns: Price, 24h Change, Volume
  - Row click → opens AssetDetailSheet
  - Buy/Sell buttons in each row
  - Sticky header row
  - Color-coded 24h change (green/red)

- Add `market` to the `Page` type in `App.tsx`
- Add Market page route in `App.tsx`
- Add Markets nav item in `Layout.tsx` (BarChart2 icon)

### Modify
- `App.tsx`: add `"market"` to the Page union type, render `<MarketPage />` for that route
- `Layout.tsx`: add Markets nav item with `BarChart2` icon in both desktop sidebar and mobile bottom nav

### Remove
- Nothing removed

## Implementation Plan
1. Create `MarketPage.tsx` with Binance-style table layout using existing `useMarketData` hook and `AssetDetailSheet` + `TradeModal` components
2. Add sortable table columns (Name, Price, 24h Change, simulated Volume)
3. Add category tabs (All/Crypto/Forex/Stocks) and filter pills (Hot/Gainers/Losers)
4. Add search input
5. Update `App.tsx` Page type and routing
6. Update `Layout.tsx` nav items (desktop sidebar + mobile bottom nav)
7. Validate and fix any TypeScript/lint errors
