import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import PageTransition from "./PageTransition";

interface AppLayoutProps {
  showFooter?: boolean;
}

const AppLayout = ({ showFooter = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main id="main-content" className="flex-1 flex flex-col pt-14">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      {showFooter && <Footer />}
    </div>
  );
};

export default AppLayout;
