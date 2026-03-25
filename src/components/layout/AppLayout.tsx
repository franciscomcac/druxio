import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

interface AppLayoutProps {
  showFooter?: boolean;
}

const AppLayout = ({ showFooter = true }: AppLayoutProps) => (
  <div className="min-h-screen bg-background flex flex-col">
    <Header />
    <main id="main-content" className="flex-1 flex flex-col">
      <Outlet />
    </main>
    {showFooter && <Footer />}
  </div>
);

export default AppLayout;
