import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PayPalCheckout } from './PayPalCheckout';

interface PaywallModalProps {
  visible: boolean;
  userId: string;
  onPaymentSuccess: () => void;
  onClose: () => void;
}

export function PaywallModal({ visible, userId, onPaymentSuccess, onClose }: PaywallModalProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="paywall-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            key="paywall-content"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                Weitere Nachrichten kaufen
              </h2>
              <p className="text-sm text-slate-500 mb-1">
                Du hast dein Limit erreicht.
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Kaufe Dir weitere 50 Nachrichten, um weiterhin mit Carefully zu sprechen.
              </p>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-6">
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-3xl font-bold text-slate-800">3,99€</span>
                  <span className="text-sm text-slate-500">einmalig</span>
                </div>
                <p className="text-xs text-blue-600 font-medium">
                  50 zusätzliche Nachrichten
                </p>
              </div>

              <PayPalCheckout
                userId={userId}
                onSuccess={onPaymentSuccess}
                onError={(msg) => setError(msg)}
              />

              {error && (
                <p className="text-xs text-red-500 mt-3 leading-relaxed">
                  {error}
                </p>
              )}

              <p className="text-[0.625rem] text-slate-400 mt-3">
                Sichere Zahlung über PayPal
              </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
