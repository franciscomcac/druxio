import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Zap, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

interface QuickAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "signup";
  onSuccess?: () => void;
}

const QuickAuthDialog = ({ open, onOpenChange, defaultTab = "login", onSuccess }: QuickAuthDialogProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [view, setView] = useState<"auth" | "forgot">("auth");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sync activeTab when defaultTab or open changes
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      setLoading(false);
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setView("auth");
      setForgotSent(false);
      setForgotEmail("");
    }
  }, [open, defaultTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Welcome back!", description: "You've successfully logged in." });
      setLoading(false);
      onOpenChange(false);
      if (onSuccess) onSuccess();
      else navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast({ title: "Account created!", description: "Check your email to verify your account." });
      setLoading(false);
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (error: any) {
      toast({ title: "Failed to send reset email", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">

        {/* Forgot Password View */}
        {view === "forgot" ? (
          <>
            <DialogHeader className="text-center items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-2">
                <Zap className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl">Reset password</DialogTitle>
              <DialogDescription>
                {forgotSent ? "Check your inbox for a reset link." : "We'll send a reset link to your email."}
              </DialogDescription>
            </DialogHeader>

            {forgotSent ? (
              <div className="text-center space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  A password reset link has been sent to <span className="font-medium text-foreground">{forgotEmail}</span>.
                </p>
                <Button variant="outline" className="w-full" onClick={() => setView("auth")}>
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dialog-forgot-email">Email</Label>
                  <Input
                    id="dialog-forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2"
                  onClick={() => setView("auth")}
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </Button>
              </form>
            )}
          </>
        ) : (
          /* Auth View */
          <>
            <DialogHeader className="text-center items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-2">
                <Zap className="h-6 w-6" />
              </div>
              <DialogTitle className="text-2xl">
                {activeTab === "login" ? "Welcome back" : "Create an account"}
              </DialogTitle>
              <DialogDescription>
                {activeTab === "login" ? "Sign in to continue" : "Join as a buyer or expert"}
              </DialogDescription>
            </DialogHeader>

            {/* Google Sign In */}
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={googleLoading}
              onClick={async () => {
                setGoogleLoading(true);
                localStorage.setItem("auth_redirect", window.location.pathname + window.location.search);
                const { error } = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (error) {
                  toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });
                }
                setGoogleLoading(false);
              }}
            >
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><Separator /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "login" | "signup"); setShowPassword(false); }}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-login-email">Email</Label>
                    <Input id="dialog-login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="dialog-login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setView("forgot"); setForgotEmail(email); }}
                      className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-signup-email">Email</Label>
                    <Input id="dialog-signup-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="dialog-signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickAuthDialog;
