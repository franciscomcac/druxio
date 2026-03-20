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
import { Menu, Zap, User, LogOut, Settings, LayoutDashboard, Wallet, MessageSquare, Plus, Package, ShieldCheck, Eye, EyeOff, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import QuickAuthDialog from "@/components/auth/QuickAuthDialog";
import { useCurrency, Currency } from "@/contexts/CurrencyContext";

const CURRENCIES: Currency[] = ["EUR", "USD", "GBP"];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isMentorUser, setIsMentorUser] = useState(false);
  const [appearOffline, setAppearOffline] = useState(() => localStorage.getItem("appear_offline_override") === "true");
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const { balance } = useBalance();
  const { currency, setCurrency, format } = useCurrency();
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
          setIsMentorUser(roles?.some(r => r.role === "mentor") || false);
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

  const handleToggleAppearOffline = async (offline: boolean) => {
    setAppearOffline(offline);
    localStorage.setItem("appear_offline_override", offline ? "true" : "false");
    if (user) {
      await supabase.from("profiles").update({ is_online: !offline }).eq("id", user.id);
    }
    window.dispatchEvent(new CustomEvent("presence-override-changed", { detail: { offline } }));
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center shrink-0">
          <span className="text-lg font-bold text-foreground">Drux<Zap className="inline h-4 w-4 -mx-0.5" style={{ color: 'hsl(188 100% 48%)', fill: 'hsl(188 100% 48%)' }} />o</span>
        </Link>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-1.5 md:flex">
          <Link to="/how-it-works">
            <Button variant="ghost" size="sm" className={`text-sm font-medium ${isActive("/how-it-works") ? "text-foreground bg-primary/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
              How It Works
            </Button>
          </Link>
          <Link to="/blog">
            <Button variant="ghost" size="sm" className={`text-sm font-medium ${location.pathname.startsWith("/blog") ? "text-foreground bg-primary/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
              Blog
            </Button>
          </Link>
          {user && (
            <>
              <Link to="/dashboard" id="tour-dashboard-link">
                <Button variant="ghost" size="sm" className={`text-sm font-medium ${isActive("/dashboard") ? "text-foreground bg-primary/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
                  Dashboard
                </Button>
              </Link>
              <Link to="/orders/purchased">
                <Button variant="ghost" size="sm" className={`text-sm font-medium ${location.pathname.startsWith("/orders") ? "text-foreground bg-primary/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
                  My Orders
                </Button>
              </Link>
              {isMentorUser && (
                <Link to="/quotes" id="tour-quotes-link">
                  <Button variant="ghost" size="sm" className={`text-sm font-medium ${(isActive("/quotes") || location.pathname.startsWith("/request/")) ? "text-foreground bg-primary/[0.06]" : "text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]"}`}>
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Active Quotes
                  </Button>
                </Link>
              )}
            </>
          )}
          {user ? (
            <>
              <Link to="/post-request">
                <Button size="sm" className="gap-2 shadow-glow hover:shadow-glow-lg transition-shadow">
                  <Plus className="h-4 w-4" /> Post a Task
                </Button>
              </Link>
              <Button id="tour-wallet-link" variant="ghost" size="sm" className="gap-1.5 hover:bg-primary/[0.06] text-sm font-medium" onClick={() => navigate("/wallet")}>
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-foreground">{format(balance ?? 0)}</span>
              </Button>
              <Link to="/inbox" id="tour-inbox-link">
                <Button variant="ghost" size="icon" className={`relative hover:bg-primary/[0.06] ${isActive("/inbox") ? "bg-primary/[0.06]" : ""}`}>
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
              <NotificationsDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button id="tour-profile-menu" variant="ghost" className="relative h-9 w-9 rounded-full">
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
                  <DropdownMenuItem id="tour-sold-orders-link" onClick={() => navigate("/orders/sold")} className="hover:bg-primary/[0.06]"><Wallet className="mr-2 h-4 w-4" /> Sold Orders</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/inbox")} className="hover:bg-primary/[0.06]"><MessageSquare className="mr-2 h-4 w-4" /> Messages</DropdownMenuItem>
                  {isMentorUser && (
                    <DropdownMenuItem onClick={() => navigate("/quotes")} className="hover:bg-primary/[0.06]"><FileText className="mr-2 h-4 w-4" /> Active Quotes</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border/30" />
                  <DropdownMenuItem onClick={() => navigate("/wallet")} className="hover:bg-primary/[0.06]"><Wallet className="mr-2 h-4 w-4" /> Balance & Wallet</DropdownMenuItem>
                  <DropdownMenuItem id="tour-settings-link" onClick={() => navigate("/settings")} className="hover:bg-primary/[0.06]"><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                  {isAdminUser && (
                    <>
                      <DropdownMenuSeparator className="bg-border/30" />
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="hover:bg-primary/[0.06]"><ShieldCheck className="mr-2 h-4 w-4" /> Admin</DropdownMenuItem>
                    </>
                  )}
                  {isMentorUser && (
                    <>
                      <DropdownMenuSeparator className="bg-border/30" />
                      <div className="px-2 py-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {appearOffline ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-chart-2" />}
                            <span className="text-sm">{appearOffline ? "Appear Offline" : "Online"}</span>
                          </div>
                          <Switch
                            checked={!appearOffline}
                            onCheckedChange={(checked) => handleToggleAppearOffline(!checked)}
                            className="scale-90"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-border/30" />
                  {/* Currency selector */}
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground mb-1.5">Currency</p>
                    <div className="flex items-center rounded-full border border-border/50 bg-muted/30 overflow-hidden text-xs font-medium w-full">
                      {CURRENCIES.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCurrency(c)}
                          className={`flex-1 py-1 transition-colors ${
                            currency === c
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
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

        {/* Mobile right: icon shortcuts + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          {user ? (
            <>
              <Link to="/post-request">
                <Button size="sm" className="h-8 w-8 p-0 shadow-glow">
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
              <NotificationsDropdown />
              <Link to="/inbox">
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/[0.06]">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
            </>
          ) : null}

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-card/95 backdrop-blur-xl border-border/30">
              <div className="flex flex-col gap-1 pt-6">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg bg-primary/[0.04] border border-border/30">
                      <Avatar className="h-10 w-10 border border-border/40 shrink-0">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {profile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{profile?.display_name || "User"}</p>
                        <button
                          className="text-xs text-primary font-medium"
                          onClick={() => { setIsOpen(false); navigate("/wallet"); }}
                        >
                          {format(balance ?? 0)} balance
                        </button>
                      </div>
                    </div>

                    <Link to="/post-request" onClick={() => setIsOpen(false)}>
                      <Button className="w-full gap-2 mb-2 shadow-glow"><Plus className="h-4 w-4" /> Post a Task</Button>
                    </Link>
                    <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11"><LayoutDashboard className="h-4 w-4" /> Dashboard</Button>
                    </Link>
                    <Link to="/orders/purchased" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11"><Package className="h-4 w-4" /> Purchased Orders</Button>
                    </Link>
                    <Link to="/orders/sold" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11"><Wallet className="h-4 w-4" /> Sold Orders</Button>
                    </Link>
                    <Link to="/inbox" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11"><MessageSquare className="h-4 w-4" /> Messages</Button>
                    </Link>
                    {isMentorUser && (
                      <Link to="/quotes" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-11"><FileText className="h-4 w-4" /> Active Quotes</Button>
                      </Link>
                    )}
                    <Link to="/wallet" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11"><Wallet className="h-4 w-4" /> Wallet</Button>
                    </Link>
                    <Link to="/settings" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11"><Settings className="h-4 w-4" /> Settings</Button>
                    </Link>
                    {isAdminUser && (
                      <Link to="/admin" onClick={() => setIsOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start gap-2 h-11"><ShieldCheck className="h-4 w-4" /> Admin</Button>
                      </Link>
                    )}
                    <hr className="border-border/30 my-2" />
                    <div className="px-1 pb-1">
                      <p className="text-xs text-muted-foreground mb-1.5 px-2">Currency</p>
                      <div className="flex items-center rounded-full border border-border/50 bg-muted/30 overflow-hidden text-xs font-medium">
                        {CURRENCIES.map((c) => (
                          <button
                            key={c}
                            onClick={() => setCurrency(c)}
                            className={`flex-1 py-1.5 transition-colors ${
                              currency === c
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <hr className="border-border/30 my-2" />
                    <Link to="/how-it-works" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11">How It Works</Button>
                    </Link>
                    <Link to="/blog" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11">Blog</Button>
                    </Link>
                    <hr className="border-border/30 my-2" />
                    <Button variant="ghost" className="w-full justify-start gap-2 h-11 text-destructive" onClick={() => { setIsOpen(false); handleSignOut(); }}>
                      <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/how-it-works" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11">How It Works</Button>
                    </Link>
                    <Link to="/blog" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2 h-11">Blog</Button>
                    </Link>
                    <hr className="border-border/30 my-2" />
                    <Button variant="ghost" className="w-full justify-start gap-2 h-11" onClick={() => { setIsOpen(false); setAuthTab("login"); setAuthOpen(true); }}>
                      <User className="h-4 w-4" /> Sign In
                    </Button>
                    <Button className="w-full gap-2 shadow-glow" onClick={() => { setIsOpen(false); setAuthTab("signup"); setAuthOpen(true); }}>
                      <Zap className="h-4 w-4" /> Get Started
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <QuickAuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
    </header>
  );
};

export default Header;
