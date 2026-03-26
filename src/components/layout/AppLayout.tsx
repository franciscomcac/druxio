import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import PageTransition from "./PageTransition";

interface AppLayoutProps {
  showFooter?: boolean;
}

const AppLayout = ({ showFooter = true }: AppLayoutProps) => {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main id="main-content" className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default AppLayout;
