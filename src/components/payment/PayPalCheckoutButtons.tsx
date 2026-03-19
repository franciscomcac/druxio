import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { supabase } from "@/integrations/supabase/client";

interface PayPalCheckoutButtonsProps {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: () => void;
}

const initialClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

const PayPalCheckoutButtons = ({ createOrder, onApprove, onError }: PayPalCheckoutButtonsProps) => {
  const [clientId, setClientId] = useState(initialClientId);
  const [isLoadingClientId, setIsLoadingClientId] = useState(!initialClientId);

  useEffect(() => {
    if (clientId) return;

    let isMounted = true;

    const loadClientId = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paypal-client-config");
        if (error) throw error;

        if (isMounted) {
          setClientId(typeof data?.clientId === "string" ? data.clientId : "");
        }
      } catch (err) {
        console.error("Failed to load PayPal client ID:", err);
      } finally {
        if (isMounted) setIsLoadingClientId(false);
      }
    };

    void loadClientId();

    return () => {
      isMounted = false;
    };
  }, [clientId]);

  if (isLoadingClientId) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Loading PayPal...
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        PayPal is temporarily unavailable. Please try again.
      </div>
    );
  }

  const commonProps = {
    createOrder: async () => await createOrder(),
    onApprove: async (data: any) => await onApprove({ orderID: data.orderID }),
    onError: (err: any) => {
      console.error("PayPal error:", err);
      onError();
    },
    onCancel: () => {},
  };

  return (
    <PayPalScriptProvider options={{
      clientId,
      currency: "EUR",
      intent: "capture",
    }}>
      <div className="paypal-buttons-wrapper space-y-2">
        <PayPalButtons
          fundingSource={FUNDING.PAYPAL}
          style={{ layout: "horizontal", color: "blue", shape: "rect", label: "pay", height: 48 }}
          {...commonProps}
        />
        <PayPalButtons
          fundingSource={FUNDING.CARD}
          style={{ layout: "horizontal", color: "black", shape: "rect", label: "pay", height: 48 }}
          {...commonProps}
        />
        <div className="flex items-center justify-center gap-1.5 pt-1 opacity-25">
          <span className="text-[10px] text-muted-foreground">Secured by PayPal · Buyer Protection</span>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default PayPalCheckoutButtons;
