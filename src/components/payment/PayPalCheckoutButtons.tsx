import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

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

  return (
    <PayPalScriptProvider options={{
      clientId: PAYPAL_CLIENT_ID,
      currency: "EUR",
      intent: "capture",
    }}>
      <PayPalButtons
        style={{
          layout: "vertical",
          color: "blue",
          shape: "rect",
          label: "pay",
          height: 45,
        }}
        createOrder={async () => {
          return await createOrder();
        }}
        onApprove={async (data) => {
          await onApprove({ orderID: data.orderID });
        }}
        onError={(err) => {
          console.error("PayPal error:", err);
          onError();
        }}
        onCancel={() => {
          // User closed PayPal popup — do nothing
        }}
      />
    </PayPalScriptProvider>
  );
};

export default PayPalCheckoutButtons;
