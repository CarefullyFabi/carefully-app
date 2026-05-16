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

  const updateMessageState = useCallback(
    (messageCount: number, limitReached: boolean) => {
      setState((s) => ({ ...s, messageCount, limitReached }));
    },
    [],
  );

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

  return {
    ...state,
    updateMessageState,
    manageSubscription,
    refresh,
    remainingMessages: state.isPremium
      ? Infinity
      : Math.max(0, (state.purchasedMessages > 0 ? state.purchasedMessages : FREE_MESSAGE_LIMIT) - state.messageCount),
  };
}
