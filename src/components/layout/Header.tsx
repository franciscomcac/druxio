import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import { Menu, Zap, User, LogOut, Settings, LayoutDashboard, Wallet, MessageSquare, Plus, Package, ShieldCheck } from "lucide-react";
import QuickAuthDialog from "@/components/auth/QuickAuthDialog";

const navLinks = [
  { label: "How It Works", href: "/how-it-works" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const navigate = useNavigate();

  useEffect(() => {
    // Set up listener FIRST - it handles INITIAL_SESSION event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignore TOKEN_REFRESHED with null session (transient state)
      if (event === 'TOKEN_REFRESHED' && !session) return;
      
      setUser(session?.user || null);
      if (session?.user) {
        setAuthOpen(false);
        // Use setTimeout to avoid Supabase auth deadlock
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

    // getSession as backup for initial load
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow transition-shadow duration-300 group-hover:shadow-glow-lg">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-foreground">Duxio</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href} className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to="/post-request">
                <Button size="sm" className="gap-2 shadow-glow hover:shadow-glow-lg transition-shadow"><Plus className="h-4 w-4" /> Post Request</Button>
              </Link>
              <Link to="/inbox">
                <Button variant="ghost" size="icon" className="relative hover:bg-primary/[0.06]"><MessageSquare className="h-5 w-5" /></Button>
              </Link>
              <NotificationsDropdown />
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
                  <DropdownMenuItem onClick={() => navigate("/inbox")} className="hover:bg-primary/[0.06]"><MessageSquare className="mr-2 h-4 w-4" /> Chats</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/wallet")} className="hover:bg-primary/[0.06]"><Wallet className="mr-2 h-4 w-4" /> Wallet</DropdownMenuItem>
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
              <Button variant="ghost" className="gap-2 hover:bg-primary/[0.06]" onClick={() => { setAuthTab("login"); setAuthOpen(true); }}><User className="h-4 w-4" /> Sign In</Button>
              <Button className="gap-2 shadow-glow hover:shadow-glow-lg transition-shadow" onClick={() => { setAuthTab("signup"); setAuthOpen(true); }}><Zap className="h-4 w-4" /> Get Started</Button>
            </>
          )}
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-card/95 backdrop-blur-xl border-border/30">
            <div className="flex flex-col gap-6 pt-8">
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href} className="text-lg font-medium text-foreground" onClick={() => setIsOpen(false)}>{link.label}</Link>
              ))}
              <hr className="border-border/30" />
              {user ? (
                <>
                  <Link to="/post-request" onClick={() => setIsOpen(false)}><Button className="w-full gap-2"><Plus className="h-4 w-4" /> Post Request</Button></Link>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}><Button variant="outline" className="w-full gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</Button></Link>
                  <Button variant="ghost" className="w-full gap-2" onClick={handleSignOut}><LogOut className="h-4 w-4" /> Sign Out</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setIsOpen(false); setAuthTab("login"); setAuthOpen(true); }}><User className="h-4 w-4" /> Sign In</Button>
                  <Button className="w-full gap-2" onClick={() => { setIsOpen(false); setAuthTab("signup"); setAuthOpen(true); }}><Zap className="h-4 w-4" /> Get Started</Button>
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
