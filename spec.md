# CFS - Crypto Forex Stocks

## Current State
App has KYC, trading, wallet, lock screen with PIN/fingerprint. No session tracking or admin analytics panel.

## Requested Changes (Diff)

### Add
- **Session tracking utility**: Log every user session with:
  - User ID (name)
  - Login timestamp (start time)
  - Logout/close timestamp (end time)
  - Duration in minutes/seconds
  - Device info (mobile/desktop)
- **Admin Panel page** (`/admin` accessible via hidden button in Profile page with admin PIN):
  - Admin PIN: `9999` (separate from user PIN)
  - Shows table of all sessions: User, Login Time, Logout Time, Duration, Device
  - Total users, total sessions, average session duration stats
  - Data stored in localStorage under key `cfs_session_logs`
  - User themselves cannot see this panel -- it's admin-only

### Modify
- `App.tsx`: Add `admin` to Page type, add session start tracking on unlock, session end tracking on logout/page unload
- `Layout.tsx`: Add hidden admin access in Profile section (small text link "Admin" visible only after triple-tap on logo)
- `AppLockScreen.tsx`: On successful unlock, record session start
- `ProfilePage.tsx`: Add hidden admin access trigger

### Remove
- Nothing

## Implementation Plan
1. Create `src/frontend/src/utils/sessionTracker.ts` -- session log read/write utilities
2. Create `src/frontend/src/pages/AdminPage.tsx` -- PIN-protected admin dashboard with session data table
3. Update `App.tsx` -- add `admin` page type, wire session start on unlock, session end on logout
4. Update `Layout.tsx` -- add triple-tap on logo to reveal admin link
5. Update `AppLockScreen.tsx` -- call `recordSessionStart()` on successful unlock
