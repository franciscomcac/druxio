import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";

interface PayPalCheckoutButtonsProps {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: () => void;
}

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

const PayPalCheckoutButtons = ({ createOrder, onApprove, onError }: PayPalCheckoutButtonsProps) => {
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

  return (
    <PayPalScriptProvider options={{
      clientId: PAYPAL_CLIENT_ID,
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
