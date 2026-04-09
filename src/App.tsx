import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { lazy, Suspense, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "./components/layout/AppLayout";
import { usePresence } from "./hooks/use-presence";
import { useGlobalSound } from "./hooks/use-global-sound";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import CookieConsent from "./components/CookieConsent";

// Eagerly loaded (landing + auth — critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy-loaded pages
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PostRequest = lazy(() => import("./pages/PostRequest"));
const ActiveRequest = lazy(() => import("./pages/ActiveRequest"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Session = lazy(() => import("./pages/Session"));
const Wallet = lazy(() => import("./pages/Wallet"));
const MentorProfile = lazy(() => import("./pages/MentorProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Order = lazy(() => import("./pages/Order"));
const PurchasedOrders = lazy(() => import("./pages/PurchasedOrders"));
const SoldOrders = lazy(() => import("./pages/SoldOrders"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const FAQ = lazy(() => import("./pages/FAQ"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const Compare = lazy(() => import("./pages/Compare"));

// Lazy-loaded overlays
const SupportWidget = lazy(() => import("./components/support/SupportWidget"));
const FeedbackWidget = lazy(() => import("./components/feedback/FeedbackWidget"));
const SellerTutorial = lazy(() => import("./components/onboarding/SellerTutorial"));
const ClientTutorial = lazy(() => import("./components/onboarding/ClientTutorial"));

// Registers the presence heartbeat inside the Router context
const PresenceTracker = () => { usePresence(); return null; };

// Plays chime on any incoming notification, message, or quote — app-wide
const GlobalSoundListener = () => { useGlobalSound(); return null; };

// Redirects to home on sign-out (covers all tabs / session expiry)
const SignOutRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/", { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  return null;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min — avoid redundant refetches
      gcTime: 10 * 60 * 1000,     // 10 min garbage collection
      refetchOnWindowFocus: false, // don't refetch just because user tabs back
      retry: 1,                    // single retry on failure
    },
  },
});

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <ErrorBoundary>
  <CurrencyProvider>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark" disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SignOutRedirect />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/post-request" element={<PostRequest />} />
                <Route path="/session/:sessionId" element={<Session />} />
                <Route path="/wallet" element={<Wallet />} />
                <Route path="/mentor/:mentorId" element={<MentorProfile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route element={<AppLayout showFooter={false} />}>
                <Route path="/active-request/:jobId" element={<ActiveRequest />} />
                <Route path="/request/:jobId" element={<ActiveRequest />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/order/:jobId" element={<Order />} />
                <Route path="/orders/purchased" element={<PurchasedOrders />} />
                <Route path="/orders/sold" element={<SoldOrders />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/quotes" element={<ActiveRequest />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/coming-soon" element={<ComingSoon />} />
                <Route path="/compare" element={<Compare />} />
              </Route>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <PresenceTracker />
          <GlobalSoundListener />
          <Suspense fallback={null}>
            <SellerTutorial />
            <ClientTutorial />
            <SupportWidget />
            <FeedbackWidget />
          </Suspense>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </CurrencyProvider>
  </ErrorBoundary>
);

export default App;
