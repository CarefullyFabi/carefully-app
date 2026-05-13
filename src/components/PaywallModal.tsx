import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PaywallModalProps {
  visible: boolean;
  loading: boolean;
  onUpgrade: () => void;
  onClose: () => void;
}

export function PaywallModal({ visible, loading, onUpgrade, onClose }: PaywallModalProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
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
              Carefully Premium
            </h2>
            <p className="text-sm text-slate-500 mb-1">
              Du hast dein Limit von 20 Nachrichten erreicht.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Schalte unbegrenzten Zugang frei, um weiterhin mit Carefully zu sprechen.
            </p>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="flex items-baseline justify-center gap-1 mb-1">
                <span className="text-3xl font-bold text-slate-800">4,99€</span>
                <span className="text-sm text-slate-500">einmalig</span>
              </div>
              <p className="text-xs text-blue-600 font-medium">
                Unbegrenzter Zugang – für immer
              </p>
            </div>

            <button
              onClick={onUpgrade}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors shadow-sm shadow-blue-200/50 text-sm"
            >
              {loading ? 'Weiterleitung...' : 'Jetzt upgraden'}
            </button>

            <p className="text-[0.625rem] text-slate-400 mt-3">
              Sichere Zahlung über Stripe
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
