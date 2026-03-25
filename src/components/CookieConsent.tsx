import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router-dom";

const CONSENT_KEY = "cookie_consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function updateConsent(granted: boolean) {
  window.gtag?.("consent", "update", {
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
    analytics_storage: granted ? "granted" : "denied",
  });
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === null) {
      // Show banner after a short delay so it doesn't flash on load
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
    // Apply stored preference
    updateConsent(stored === "accepted");
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    updateConsent(true);
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    updateConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 animate-slide-up" role="dialog" aria-label="Cookie consent">
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card/95 backdrop-blur-lg p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-muted-foreground flex-1">
          We use cookies to measure ad performance and improve your experience.{" "}
          <Link to="/cookies" className="underline text-foreground hover:text-primary transition-colors">
            Learn more
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="ghost" onClick={decline} className="text-xs">
            Decline
          </Button>
          <Button size="sm" onClick={accept} className="text-xs">
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
