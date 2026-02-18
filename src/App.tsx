import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import HowItWorksPage from "./pages/HowItWorksPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PostRequest from "./pages/PostRequest";
import ActiveRequest from "./pages/ActiveRequest";
import Search from "./pages/Search";
import Session from "./pages/Session";
import Wallet from "./pages/Wallet";
import MentorProfile from "./pages/MentorProfile";
import Settings from "./pages/Settings";
import Inbox from "./pages/Inbox";
import Order from "./pages/Order";
import PurchasedOrders from "./pages/PurchasedOrders";
import SoldOrders from "./pages/SoldOrders";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import CategoryPage from "./pages/CategoryPage";
import SupportWidget from "./components/support/SupportWidget";
import FeedbackWidget from "./components/feedback/FeedbackWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark" disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/post-request" element={<PostRequest />} />
            <Route path="/request/:jobId" element={<ActiveRequest />} />
            <Route path="/search" element={<Search />} />
            <Route path="/session/:sessionId" element={<Session />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/mentor/:mentorId" element={<MentorProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/order/:jobId" element={<Order />} />
            <Route path="/orders/purchased" element={<PurchasedOrders />} />
            <Route path="/orders/sold" element={<SoldOrders />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SupportWidget />
          <FeedbackWidget />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
