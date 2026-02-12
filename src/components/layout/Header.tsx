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
import { Menu, Zap, User, LogOut, Settings, LayoutDashboard, Wallet, MessageSquare, Plus } from "lucide-react";

const navLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Categories", href: "/#categories" },
  { label: "Pricing", href: "/#pricing" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", session.user.id).single();
        setProfile(data);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-foreground">Duxio</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} to={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to="/post-request">
                <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Post Request</Button>
              </Link>
              <Link to="/inbox">
                <Button variant="ghost" size="icon" className="relative"><MessageSquare className="h-5 w-5" /></Button>
              </Link>
              <NotificationsDropdown />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile?.display_name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.display_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/wallet")}><Wallet className="mr-2 h-4 w-4" /> Wallet</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="mr-2 h-4 w-4" /> Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}><LogOut className="mr-2 h-4 w-4" /> Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="outline" className="gap-2"><User className="h-4 w-4" /> Sign In</Button></Link>
              <Link to="/post-request"><Button className="gap-2"><Zap className="h-4 w-4" /> Post Request</Button></Link>
            </>
          )}
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon"><Menu className="h-6 w-6" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80">
            <div className="flex flex-col gap-6 pt-8">
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href} className="text-lg font-medium text-foreground" onClick={() => setIsOpen(false)}>{link.label}</Link>
              ))}
              <hr className="border-border" />
              {user ? (
                <>
                  <Link to="/post-request" onClick={() => setIsOpen(false)}><Button className="w-full gap-2"><Plus className="h-4 w-4" /> Post Request</Button></Link>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}><Button variant="outline" className="w-full gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</Button></Link>
                  <Button variant="ghost" className="w-full gap-2" onClick={handleSignOut}><LogOut className="h-4 w-4" /> Sign Out</Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsOpen(false)}><Button variant="outline" className="w-full gap-2"><User className="h-4 w-4" /> Sign In</Button></Link>
                  <Link to="/post-request" onClick={() => setIsOpen(false)}><Button className="w-full gap-2"><Zap className="h-4 w-4" /> Post Request</Button></Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
