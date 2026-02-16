import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useBalance } from "@/hooks/use-balance";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import { Menu, Zap, User, LogOut, Settings, LayoutDashboard, Wallet, MessageSquare, Plus, Package, ShieldCheck, Search, Bell } from "lucide-react";
import QuickAuthDialog from "@/components/auth/QuickAuthDialog";
import ThemeToggle from "@/components/ThemeToggle";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const { balance } = useBalance();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) return;
      
      setUser(session?.user || null);
      if (session?.user) {
        setAuthOpen(false);
        setTimeout(async () => {
          const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", session.user.id).single();
          setProfile(data);
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
          setIsAdminUser(roles?.some(r => r.role === "admin") || false);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        supabase.from("profiles").select("display_name, avatar_url").eq("id", session.user.id).single().then(({ data }) => setProfile(data));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center group">
          <span className="text-lg font-bold text-foreground">Dux<Zap className="inline h-4 w-4 text-primary fill-primary -mx-0.5" />o</span>
        </Link>

        {/* Right actions */}
        <div className="hidden items-center gap-1.5 md:flex">
          {/* Nav links */}
          <Link to="/how-it-works">
            <Button variant="ghost" size="sm" className={`text-sm font-medium ${isActive("/how-it-works") ? "text-foreground bg-primary/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
              How It Works
            </Button>
          </Link>
          {user && (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className={`text-sm font-medium ${isActive("/dashboard") ? "text-foreground bg-primary/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
                  Dashboard
                </Button>
              </Link>
              <Link to="/orders/purchased">
                <Button variant="ghost" size="sm" className={`text-sm font-medium ${location.pathname.startsWith("/orders") ? "text-foreground bg-primary/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
                  My Orders
                </Button>
              </Link>
            </>
          )}
          {/* ThemeToggle disabled — dark mode only */}
          {user ? (
            <>
              {/* Post Request - primary CTA */}
              <Link to="/post-request">
                <Button size="sm" className="gap-2 shadow-glow hover:shadow-glow-lg transition-shadow">
                  <Plus className="h-4 w-4" /> Post Request
                </Button>
              </Link>

              {/* Balance */}
              <Button variant="ghost" size="sm" className="gap-1.5 hover:bg-primary/[0.06] text-sm font-medium" onClick={() => navigate("/wallet")}>
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-foreground">€{(balance ?? 0).toFixed(2)}</span>
              </Button>

              {/* Messages */}
              <Link to="/inbox">
                <Button variant="ghost" size="icon" className={`relative hover:bg-primary/[0.06] ${isActive("/inbox") ? "bg-primary/[0.06]" : ""}`}>
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>

              {/* Notifications */}
              <NotificationsDropdown />

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border border-border/40">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {profile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border/40">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold text-foreground">{profile?.display_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="hover:bg-primary/[0.06]"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/orders/purchased")} className="hover:bg-primary/[0.06]"><Package className="mr-2 h-4 w-4" /> Purchased Orders</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/orders/sold")} className="hover:bg-primary/[0.06]"><Wallet className="mr-2 h-4 w-4" /> Sold Orders</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/inbox")} className="hover:bg-primary/[0.06]"><MessageSquare className="mr-2 h-4 w-4" /> Messages</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem onClick={() => navigate("/wallet")} className="hover:bg-primary/[0.06]"><Wallet className="mr-2 h-4 w-4" /> Balance & Wallet</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="hover:bg-primary/[0.06]"><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                  {isAdminUser && (
                    <>
                      <DropdownMenuSeparator className="bg-border/30" />
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="hover:bg-primary/[0.06]"><ShieldCheck className="mr-2 h-4 w-4" /> Admin</DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem onClick={handleSignOut} className="hover:bg-destructive/10"><LogOut className="mr-2 h-4 w-4" /> Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" className="gap-2 hover:bg-primary/[0.06]" onClick={() => { setAuthTab("login"); setAuthOpen(true); }}>
                <User className="h-4 w-4" /> Sign In
              </Button>
              <Button className="gap-2 shadow-glow hover:shadow-glow-lg transition-shadow" onClick={() => { setAuthTab("signup"); setAuthOpen(true); }}>
                <Zap className="h-4 w-4" /> Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-card/95 backdrop-blur-xl border-border/30">
            <div className="flex flex-col gap-2 pt-8">
              <Link to="/how-it-works" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2 text-base">How It Works</Button>
              </Link>
              <hr className="border-border/30 my-2" />
              {user ? (
                <>
                  <Link to="/post-request" onClick={() => setIsOpen(false)}>
                    <Button className="w-full gap-2 mb-2"><Plus className="h-4 w-4" /> Post Request</Button>
                  </Link>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</Button>
                  </Link>
                  <Link to="/orders/purchased" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2"><Package className="h-4 w-4" /> Purchased Orders</Button>
                  </Link>
                  <Link to="/orders/sold" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2"><Wallet className="h-4 w-4" /> Sold Orders</Button>
                  </Link>
                  <Link to="/inbox" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2"><MessageSquare className="h-4 w-4" /> Messages</Button>
                  </Link>
                  <Link to="/wallet" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2"><Wallet className="h-4 w-4" /> Balance: €{(balance ?? 0).toFixed(2)}</Button>
                  </Link>
                  <Link to="/settings" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2"><Settings className="h-4 w-4" /> Settings</Button>
                  </Link>
                  <hr className="border-border/30 my-2" />
                  <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10" onClick={() => { setIsOpen(false); handleSignOut(); }}>
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setIsOpen(false); setAuthTab("login"); setAuthOpen(true); }}>
                    <User className="h-4 w-4" /> Sign In
                  </Button>
                  <Button className="w-full gap-2" onClick={() => { setIsOpen(false); setAuthTab("signup"); setAuthOpen(true); }}>
                    <Zap className="h-4 w-4" /> Get Started
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <QuickAuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
    </header>
  );
};

export default Header;
