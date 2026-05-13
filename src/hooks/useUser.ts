import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const USER_ID_KEY = 'carefully_user_id';
const FREE_MESSAGE_LIMIT = 20;

function generateId(): string {
  return crypto.randomUUID();
}

function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = generateId();
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
}

export function useUser() {
  const [state, setState] = useState<UserState>({
    userId: '',
    messageCount: 0,
    isPremium: false,
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
        setState({
          userId: data.userId,
          messageCount: data.messageCount,
          isPremium: data.isPremium,
          limitReached: data.limitReached,
          loading: false,
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

    if (paymentSuccess === 'true' && sessionId && state.userId) {
      verifyPayment(state.userId, sessionId);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [state.userId]);

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
    } catch {}
  };

  const trackMessage = useCallback(async (): Promise<boolean> => {
    if (state.isPremium) return true;
    if (state.limitReached) return false;

    try {
      const res = await fetch('/api/user-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setState((s) => ({
          ...s,
          messageCount: data.messageCount,
          isPremium: data.isPremium,
          limitReached: data.limitReached,
        }));
        return data.allowed;
      }
    } catch {}
    return true;
  }, [state.userId, state.isPremium, state.limitReached]);

  const startCheckout = useCallback(async () => {
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessionId) {
          const stripe = await stripePromise;
          if (stripe) {
            await stripe.redirectToCheckout({ sessionId: data.sessionId });
          }
        }
      }
    } catch {}
  }, [state.userId]);

  return {
    ...state,
    trackMessage,
    startCheckout,
    remainingMessages: state.isPremium
      ? Infinity
      : Math.max(0, FREE_MESSAGE_LIMIT - state.messageCount),
  };
}
