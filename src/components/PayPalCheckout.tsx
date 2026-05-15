import React, { useEffect, useState, useRef } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

interface PayPalCheckoutProps {
  userId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function PayPalCheckout({ userId, onSuccess, onError }: PayPalCheckoutProps) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    fetch('/api/paypal-config')
      .then((res) => res.json())
      .then((data) => {
        if (data.clientId) {
          setClientId(data.clientId);
        } else {
          onErrorRef.current('PayPal ist nicht konfiguriert.');
        }
        setLoading(false);
      })
      .catch(() => {
        onErrorRef.current('PayPal konnte nicht geladen werden.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!clientId) return null;

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'EUR',
        intent: 'capture',
        components: 'buttons',
        'enable-funding': 'venmo,paylater,card',
      }}
    >
      <PayPalButtons
        style={{
          shape: 'rect',
          layout: 'vertical',
          color: 'white',
          label: 'checkout',
        }}
        message={{ amount: 3.99 }}
        createOrder={async () => {
          try {
            const response = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cart: [
                  {
                    id: 'YOUR_PRODUCT_ID',
                    quantity: 'YOUR_PRODUCT_QUANTITY',
                  },
                ],
              }),
            });

            const orderData = await response.json();

            if (orderData.id) {
              return orderData.id;
            }
            const errorDetail = orderData?.details?.[0];
            const errorMessage = errorDetail
              ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
              : JSON.stringify(orderData);

            throw new Error(errorMessage);
          } catch (error) {
            console.error(error);
            throw error;
          }
        }}
        onApprove={async (data, actions) => {
          try {
            const response = await fetch(
              `/api/orders/${data.orderID}/capture`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
              },
            );

            const orderData = await response.json();
            const errorDetail = orderData?.details?.[0];

            if (errorDetail?.issue === 'INSTRUMENT_DECLINED') {
              return actions.restart();
            } else if (errorDetail) {
              throw new Error(
                `${errorDetail.description} (${orderData.debug_id})`,
              );
            } else if (!orderData.purchase_units) {
              throw new Error(JSON.stringify(orderData));
            } else {
              const transaction =
                orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
                orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
              setResultMessage(
                `Transaction ${transaction.status}: ${transaction.id}`,
              );
              console.log(
                'Capture result',
                orderData,
                JSON.stringify(orderData, null, 2),
              );
              onSuccess();
            }
          } catch (error) {
            console.error(error);
            onError(
              `Transaktion konnte nicht verarbeitet werden: ${error}`,
            );
          }
        }}
        onError={() => {
          onError('PayPal-Zahlung fehlgeschlagen. Bitte versuche es erneut.');
        }}
      />
      {resultMessage && (
        <p className="text-xs text-green-600 mt-2">{resultMessage}</p>
      )}
    </PayPalScriptProvider>
  );
}
