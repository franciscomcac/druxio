import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { CreditCard } from "lucide-react";
import { useState, useRef } from "react";

interface PayPalCheckoutButtonsProps {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: () => void;
}

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

const PayPalCheckoutButtons = ({ createOrder, onApprove, onError }: PayPalCheckoutButtonsProps) => {
  const [ready, setReady] = useState({ paypal: false, card: false });
  const paypalRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!PAYPAL_CLIENT_ID) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        PayPal is not configured. Please contact support.
      </div>
    );
  }

  const commonProps = {
    createOrder: async () => await createOrder(),
    onApprove: async (data: any) => await onApprove({ orderID: data.orderID }),
    onError: (err: any) => { console.error("PayPal error:", err); onError(); },
    onCancel: () => {},
  };

  const clickHidden = (ref: React.RefObject<HTMLDivElement>) => {
    const iframe = ref.current?.querySelector("iframe");
    if (iframe) {
      // Briefly make visible, click, hide again
      const container = ref.current!;
      container.style.opacity = "1";
      container.style.pointerEvents = "auto";
      iframe.click();
      // The PayPal SDK handles the popup via its own click handler on the iframe
    }
  };

  return (
    <PayPalScriptProvider options={{
      clientId: PAYPAL_CLIENT_ID,
      currency: "EUR",
      intent: "capture",
    }}>
      <div className="space-y-2">
        {/* Custom PayPal Button */}
        <div className="relative">
          {/* Hidden real PayPal button */}
          <div
            ref={paypalRef}
            className="absolute inset-0 z-10 opacity-[0.011] overflow-hidden"
            style={{ height: 48 }}
          >
            <PayPalButtons
              fundingSource={FUNDING.PAYPAL}
              style={{ layout: "horizontal", color: "blue", shape: "rect", label: "pay", height: 48 }}
              onInit={() => setReady(r => ({ ...r, paypal: true }))}
              {...commonProps}
            />
          </div>
          {/* Our custom styled button (visual only, clicks pass through) */}
          <button
            type="button"
            className="relative w-full h-12 rounded-lg bg-[#0070ba] hover:bg-[#005ea6] transition-colors flex items-center justify-center gap-2 text-white font-semibold text-sm pointer-events-none"
          >
            Pay with
            <svg viewBox="0 0 101 32" className="h-5 w-auto" fill="none">
              <path d="M12.237 4.1H6.897a.92.92 0 00-.909.78L3.635 19.895a.554.554 0 00.547.64h2.556a.92.92 0 00.909-.78l.637-4.037a.92.92 0 01.909-.78h2.096c4.365 0 6.885-2.113 7.541-6.3.296-1.832.012-3.27-.843-4.278C17.04 3.2 14.95 4.1 12.237 4.1z" fill="#fff"/>
              <path d="M12.237 4.1H6.897a.92.92 0 00-.909.78L3.635 19.895a.554.554 0 00.547.64h2.556a.92.92 0 00.909-.78l.637-4.037a.92.92 0 01.909-.78h2.096c4.365 0 6.885-2.113 7.541-6.3.296-1.832.012-3.27-.843-4.278C17.04 3.2 14.95 4.1 12.237 4.1zm.767 6.206c-.362 2.382-2.181 2.382-3.94 2.382h-1l.702-4.447a.553.553 0 01.546-.467h.459c1.197 0 2.327 0 2.91.682.348.407.455 1.013.323 1.85z" fill="#fff"/>
              <path d="M35.091 10.245h-2.566a.553.553 0 00-.546.467l-.113.716-.18-.26c-.556-.807-1.794-1.076-3.03-1.076-2.834 0-5.254 2.147-5.727 5.158-.246 1.502.103 2.938.96 3.94.786.92 1.91 1.303 3.247 1.303 2.296 0 3.57-1.476 3.57-1.476l-.114.712a.554.554 0 00.548.64h2.31a.92.92 0 00.909-.78l1.386-8.783a.554.554 0 00-.547-.64h-.107zm-3.595 4.991c-.249 1.473-1.42 2.462-2.912 2.462-.748 0-1.348-.241-1.735-.696-.384-.452-.529-1.094-.408-1.808.232-1.46 1.42-2.483 2.889-2.483.731 0 1.327.243 1.722.702.397.463.554 1.109.444 1.823z" fill="#fff"/>
              <path d="M55.636 10.245h-2.578a.923.923 0 00-.763.404l-4.404 6.488-1.866-6.235a.922.922 0 00-.884-.657h-2.533a.555.555 0 00-.525.737l3.516 10.32-3.308 4.668a.555.555 0 00.453.872h2.575a.921.921 0 00.758-.397l10.625-15.343a.554.554 0 00-.452-.857h-.014z" fill="#fff"/>
              <path d="M65.172 4.1h-5.34a.92.92 0 00-.909.78l-2.353 14.915a.554.554 0 00.547.64h2.748a.644.644 0 00.636-.546l.668-4.27a.92.92 0 01.909-.78h2.096c4.365 0 6.884-2.113 7.541-6.3.296-1.832.012-3.27-.843-4.278C69.975 3.2 67.884 4.1 65.172 4.1zm.766 6.206c-.362 2.382-2.181 2.382-3.94 2.382h-1l.702-4.447a.553.553 0 01.546-.467h.459c1.197 0 2.327 0 2.91.682.349.407.455 1.013.323 1.85z" fill="#fff"/>
              <path d="M88.027 10.245h-2.567a.553.553 0 00-.546.467l-.113.716-.179-.26c-.557-.807-1.795-1.076-3.03-1.076-2.835 0-5.255 2.147-5.728 5.158-.246 1.502.103 2.938.96 3.94.786.92 1.91 1.303 3.247 1.303 2.296 0 3.57-1.476 3.57-1.476l-.114.712a.554.554 0 00.548.64h2.311a.92.92 0 00.908-.78l1.387-8.783a.554.554 0 00-.547-.64h-.107zm-3.595 4.991c-.249 1.473-1.42 2.462-2.912 2.462-.748 0-1.348-.241-1.735-.696-.384-.452-.529-1.094-.408-1.808.232-1.46 1.42-2.483 2.889-2.483.731 0 1.327.243 1.722.702.397.463.554 1.109.444 1.823z" fill="#fff"/>
              <path d="M91.887 4.489l-2.391 15.207a.554.554 0 00.547.64h2.21a.92.92 0 00.909-.78L95.516 4.64a.554.554 0 00-.547-.64h-2.535a.555.555 0 00-.547.489z" fill="#fff"/>
            </svg>
          </button>
        </div>

        {/* Custom Card Button */}
        <div className="relative">
          {/* Hidden real PayPal card button */}
          <div
            ref={cardRef}
            className="absolute inset-0 z-10 opacity-[0.011] overflow-hidden"
            style={{ height: 48 }}
          >
            <PayPalButtons
              fundingSource={FUNDING.CARD}
              style={{ layout: "horizontal", color: "black", shape: "rect", label: "pay", height: 48 }}
              onInit={() => setReady(r => ({ ...r, card: true }))}
              {...commonProps}
            />
          </div>
          {/* Our custom styled button */}
          <button
            type="button"
            className="relative w-full h-12 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-foreground font-medium text-sm pointer-events-none"
          >
            <CreditCard className="h-4 w-4" />
            Debit or Credit Card
          </button>
        </div>

        {/* Powered by PayPal */}
        <div className="flex items-center justify-center gap-1.5 pt-1 opacity-30">
          <span className="text-[10px] text-muted-foreground">Powered by</span>
          <svg viewBox="0 0 101 32" className="h-3 w-auto" fill="none">
            <path d="M12.237 4.1H6.897a.92.92 0 00-.909.78L3.635 19.895a.554.554 0 00.547.64h2.556a.92.92 0 00.909-.78l.637-4.037a.92.92 0 01.909-.78h2.096c4.365 0 6.885-2.113 7.541-6.3.296-1.832.012-3.27-.843-4.278C17.04 3.2 14.95 4.1 12.237 4.1zm.767 6.206c-.362 2.382-2.181 2.382-3.94 2.382h-1l.702-4.447a.553.553 0 01.546-.467h.459c1.197 0 2.327 0 2.91.682.348.407.455 1.013.323 1.85z" fill="currentColor"/>
            <path d="M35.091 10.245h-2.566a.553.553 0 00-.546.467l-.113.716-.18-.26c-.556-.807-1.794-1.076-3.03-1.076-2.834 0-5.254 2.147-5.727 5.158-.246 1.502.103 2.938.96 3.94.786.92 1.91 1.303 3.247 1.303 2.296 0 3.57-1.476 3.57-1.476l-.114.712a.554.554 0 00.548.64h2.31a.92.92 0 00.909-.78l1.386-8.783a.554.554 0 00-.547-.64h-.107zm-3.595 4.991c-.249 1.473-1.42 2.462-2.912 2.462-.748 0-1.348-.241-1.735-.696-.384-.452-.529-1.094-.408-1.808.232-1.46 1.42-2.483 2.889-2.483.731 0 1.327.243 1.722.702.397.463.554 1.109.444 1.823z" fill="currentColor"/>
            <path d="M55.636 10.245h-2.578a.923.923 0 00-.763.404l-4.404 6.488-1.866-6.235a.922.922 0 00-.884-.657h-2.533a.555.555 0 00-.525.737l3.516 10.32-3.308 4.668a.555.555 0 00.453.872h2.575a.921.921 0 00.758-.397l10.625-15.343a.554.554 0 00-.452-.857h-.014z" fill="currentColor"/>
            <path d="M65.172 4.1h-5.34a.92.92 0 00-.909.78l-2.353 14.915a.554.554 0 00.547.64h2.748a.644.644 0 00.636-.546l.668-4.27a.92.92 0 01.909-.78h2.096c4.365 0 6.884-2.113 7.541-6.3.296-1.832.012-3.27-.843-4.278C69.975 3.2 67.884 4.1 65.172 4.1zm.766 6.206c-.362 2.382-2.181 2.382-3.94 2.382h-1l.702-4.447a.553.553 0 01.546-.467h.459c1.197 0 2.327 0 2.91.682.349.407.455 1.013.323 1.85z" fill="currentColor"/>
            <path d="M88.027 10.245h-2.567a.553.553 0 00-.546.467l-.113.716-.179-.26c-.557-.807-1.795-1.076-3.03-1.076-2.835 0-5.255 2.147-5.728 5.158-.246 1.502.103 2.938.96 3.94.786.92 1.91 1.303 3.247 1.303 2.296 0 3.57-1.476 3.57-1.476l-.114.712a.554.554 0 00.548.64h2.311a.92.92 0 00.908-.78l1.387-8.783a.554.554 0 00-.547-.64h-.107zm-3.595 4.991c-.249 1.473-1.42 2.462-2.912 2.462-.748 0-1.348-.241-1.735-.696-.384-.452-.529-1.094-.408-1.808.232-1.46 1.42-2.483 2.889-2.483.731 0 1.327.243 1.722.702.397.463.554 1.109.444 1.823z" fill="currentColor"/>
            <path d="M91.887 4.489l-2.391 15.207a.554.554 0 00.547.64h2.21a.92.92 0 00.909-.78L95.516 4.64a.554.554 0 00-.547-.64h-2.535a.555.555 0 00-.547.489z" fill="currentColor"/>
          </svg>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default PayPalCheckoutButtons;
