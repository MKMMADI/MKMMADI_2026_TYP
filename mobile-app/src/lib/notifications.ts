import { BookingStatus, ConversationSummary } from '../types';

export interface NotificationBooking {
  id: number | string;
  employeeId?: number | string;
  employee?: { id?: number | string } | null;
  purpose: string;
  status: BookingStatus;
  startAt: string;
  updatedAt?: string;
  suggestedStartAt?: string | null;
}

export interface MobileNotification {
  id: string;
  type: 'BOOKING_CONFIRMED' | 'BOOKING_RESCHEDULED' | 'MESSAGE';
  title: string;
  detail: string;
  createdAt: string;
  bookingId?: number | string;
  conversationId?: number;
}

export function buildNotificationFeed(
  bookings: NotificationBooking[],
  conversations: ConversationSummary[],
  userId: string | number,
): MobileNotification[] {
  const notifications: MobileNotification[] = [];
  const currentUserId = String(userId);

  bookings.forEach((booking) => {
    const ownerId = booking.employee?.id ?? booking.employeeId;
    if (ownerId === undefined || String(ownerId) !== currentUserId) return;

    if (booking.status === 'CONFIRMED') {
      notifications.push({
        id: `booking-confirmed-${booking.id}`,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking confirmed',
        detail: `${booking.purpose} · ${new Date(booking.startAt).toLocaleString()}`,
        createdAt: booking.updatedAt ?? booking.startAt,
        bookingId: booking.id,
      });
    } else if (booking.status === 'RESCHEDULE_REQUIRED') {
      const proposedTime = booking.suggestedStartAt
        ? ` Proposed time: ${new Date(booking.suggestedStartAt).toLocaleString()}.`
        : '';
      notifications.push({
        id: `booking-rescheduled-${booking.id}`,
        type: 'BOOKING_RESCHEDULED',
        title: 'Schedule changed',
        detail: `${booking.purpose} needs a new time.${proposedTime}`,
        createdAt: booking.updatedAt ?? booking.startAt,
        bookingId: booking.id,
      });
    }
  });

  conversations.forEach((conversation) => {
    if (conversation.unreadCount <= 0 || !conversation.lastMessage) return;
    notifications.push({
      id: `message-${conversation.id}-${conversation.lastMessage.id}`,
      type: 'MESSAGE',
      title: `Message from ${conversation.participant.name}`,
      detail: conversation.lastMessage.body,
      createdAt: conversation.lastMessage.createdAt,
      conversationId: conversation.id,
    });
  });

  return notifications.sort((first, second) =>
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}
