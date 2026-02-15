

## Fix Light Mode Border Visibility

### Problem
Borders are invisible in light mode because of two compounding issues:
1. The `--border` CSS variable is too light (80% lightness against a 99% background)
2. 480+ instances across 20 files use opacity modifiers like `border-border/20`, `border-border/30`, `border-border/40` which further reduce already-faint borders to near-invisible

### Solution

**1. Darken the base border token in `src/index.css`**
- Change light mode `--border` from `220 13% 80%` to `220 13% 75%` (noticeably darker)
- Change light mode `--input` to match
- Change `--sidebar-border` from `220 13% 90%` to `220 13% 80%`
- Dark mode values stay unchanged (they already work fine)

**2. Replace all opacity-modified border classes across all files**
- `border-border/20` -> `border-border`
- `border-border/30` -> `border-border`
- `border-border/40` -> `border-border`
- `border-border/50` -> `border-border`

Files affected (20 files):
- `src/pages/PostRequest.tsx`
- `src/pages/ActiveRequest.tsx`
- `src/pages/MentorProfile.tsx`
- `src/pages/PurchasedOrders.tsx`
- `src/pages/SoldOrders.tsx`
- `src/pages/Session.tsx`
- `src/pages/Search.tsx`
- `src/pages/Inbox.tsx`
- `src/pages/Wallet.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Admin.tsx`
- `src/pages/Order.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/landing/HowItWorksDetailed.tsx`
- `src/components/landing/QuickHelpForm.tsx`
- `src/components/dashboard/ClientDashboard.tsx`
- `src/components/dashboard/ExpertDashboard.tsx`
- `src/components/wallet/WithdrawalDialog.tsx`
- `src/components/notifications/NotificationsDropdown.tsx`
- `src/components/ui/chart.tsx`

This is a global find-and-replace operation -- every `border-border/XX` becomes `border-border`, ensuring solid visible borders everywhere in light mode while keeping dark mode unaffected (dark mode border token is already well-contrasted).

