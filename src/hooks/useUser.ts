import { useState, useEffect, useCallback } from 'react';

const USER_ID_KEY = 'carefully_user_id';
const FREE_MESSAGE_LIMIT = 20;

function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

interface UserState {
  userId: string;
  messageCount: number;
  isPremium: boolean;
  purchasedMessages: number;
  limitReached: boolean;
  loading: boolean;
}

export function useUser() {
  const [state, setState] = useState<UserState>({
    userId: '',
    messageCount: 0,
    isPremium: false,
    purchasedMessages: 0,
    limitReached: false,
    loading: true,
  });

  const initUser = useCallback(async () => {
    const userId = getUserId();
    try {
      const res = await fetch('/api/user-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setState((s) => ({
          ...s,
          userId: data.userId,
          messageCount: data.messageCount,
          isPremium: data.isPremium,
          purchasedMessages: data.purchasedMessages ?? 0,
          limitReached: data.limitReached,
          loading: false,
        }));
      } else {
        setState((s) => ({ ...s, userId, loading: false }));
      }
    } catch {
      setState((s) => ({ ...s, userId, loading: false }));
    }
  }, []);

  useEffect(() => {
    initUser();
  }, [initUser]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalSuccess = params.get('paypal_success');
    const subscriptionId = params.get('subscription_id');
    const paypalCancelled = params.get('paypal_cancelled');

    if (paypalSuccess === 'true' && subscriptionId && state.userId) {
      verifyPayment(state.userId, subscriptionId).then(() => initUser());
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paypalCancelled === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [state.userId, initUser]);

  const verifyPayment = async (userId: string, subscriptionId: string) => {
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscriptionId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setState((s) => ({
            ...s,
            isPremium: true,
            limitReached: false,
          }));
        }
      }
    } catch (err) {
      console.error('Payment verification failed:', err);
    }
  };

  const updateMessageState = useCallback(
    (messageCount: number, limitReached: boolean) => {
      setState((s) => ({ ...s, messageCount, limitReached }));
    },
    [],
  );

  const startCheckout = useCallback(async () => {
    // Kept for backward compatibility — inline PayPal buttons now handle checkout
  }, []);

  const refresh = useCallback(() => {
    initUser();
  }, [initUser]);

  const manageSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: getUserId() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setState((s) => ({ ...s, isPremium: false }));
        }
      }
    } catch {}
  }, []);

  const clearCheckoutError = useCallback(() => {
    // No-op — inline PayPal buttons now handle errors
  }, []);

  return {
    ...state,
    updateMessageState,
    startCheckout,
    manageSubscription,
    clearCheckoutError,
    refresh,
    remainingMessages: state.isPremium
      ? Infinity
      : Math.max(0, (state.purchasedMessages > 0 ? state.purchasedMessages : FREE_MESSAGE_LIMIT) - state.messageCount),
  };
}
