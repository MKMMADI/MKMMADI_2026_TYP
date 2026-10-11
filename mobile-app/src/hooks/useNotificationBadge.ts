import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import api from '../api';
import { buildNotificationFeed, NotificationBooking } from '../lib/notifications';
import { ConversationSummary } from '../types';

export function useNotificationBadge(userId: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const [bookings, conversations] = await Promise.all([
          api.getBookings(),
          api.getConversations(),
        ]);
        if (!active) return;
        const feed = buildNotificationFeed(
          Array.isArray(bookings) ? bookings as NotificationBooking[] : [],
          Array.isArray(conversations) ? conversations as ConversationSummary[] : [],
          userId,
        );
        setCount(feed.length);
      } catch (error) {
        console.warn('Failed to refresh mobile notification badge', error);
      }
    };

    void refresh();
    const intervalId = setInterval(() => void refresh(), 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => {
      active = false;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [userId]);

  return count;
}
