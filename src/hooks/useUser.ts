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
  limitReached: boolean;
  loading: boolean;
  checkoutError: string | null;
}

export function useUser() {
  const [state, setState] = useState<UserState>({
    userId: '',
    messageCount: 0,
    isPremium: false,
    limitReached: false,
    loading: true,
    checkoutError: null,
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
        setState({
          userId: data.userId,
          messageCount: data.messageCount,
          isPremium: data.isPremium,
          limitReached: data.limitReached,
          loading: false,
          checkoutError: null,
        });
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
    const paymentSuccess = params.get('payment_success');
    const sessionId = params.get('session_id');
    const paymentCancelled = params.get('payment_cancelled');

    if (paymentSuccess === 'true' && sessionId && state.userId) {
      verifyPayment(state.userId, sessionId).then(() => initUser());
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentCancelled === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [state.userId, initUser]);

  const verifyPayment = async (userId: string, sessionId: string) => {
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId }),
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
    const userId = getUserId();
    setState((s) => ({ ...s, checkoutError: null }));
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setState((s) => ({ ...s, checkoutError: 'Checkout konnte nicht gestartet werden.' }));
        }
      } else {
        setState((s) => ({ ...s, checkoutError: 'Checkout konnte nicht gestartet werden.' }));
      }
    } catch {
      setState((s) => ({ ...s, checkoutError: 'Checkout konnte nicht gestartet werden.' }));
    }
  }, []);

  const manageSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: getUserId() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch {}
  }, []);

  const clearCheckoutError = useCallback(() => {
    setState((s) => ({ ...s, checkoutError: null }));
  }, []);

  return {
    ...state,
    updateMessageState,
    startCheckout,
    manageSubscription,
    clearCheckoutError,
    remainingMessages: state.isPremium
      ? Infinity
      : Math.max(0, FREE_MESSAGE_LIMIT - state.messageCount),
  };
}
