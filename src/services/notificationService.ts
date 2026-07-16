import { queryDocuments, createDocument, updateDocument, listenToQuery, where, orderBy, limit } from './firestoreService';
import { Notification, NotificationTone } from '../types';

const COLLECTION = 'notifications';

// ─── Get Notifications (replaces GET /api/notifications) ─────────────────
export const getNotifications = async (userId: string, unreadOnly?: boolean): Promise<Notification[]> => {
  const constraints: any[] = [where('recipientId', '==', userId)];
  if (unreadOnly) constraints.push(where('read', '==', false));
  const notifications = await queryDocuments<Notification>(COLLECTION, constraints);
  return notifications
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 50);
};

// ─── Create Notification (used internally by other services) ─────────────
export const createNotification = async (
  recipientId: string,
  triggeredById: string | null,
  title: string,
  message: string,
  tone: NotificationTone = 'info',
  type: string = 'general',
  entityType?: string,
  entityId?: string
): Promise<string> => {
  return createDocument<Omit<Notification, 'id'>>(COLLECTION, {
    recipientId,
    triggeredById: triggeredById ?? undefined,
    title,
    message,
    tone,
    type,
    entityType,
    entityId,
    read: false,
  });
};

// ─── Mark Single Notification as Read ─────────────────────────────────────
export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await updateDocument(COLLECTION, notificationId, {
    read: true,
    readAt: new Date().toISOString(),
  });
};

// ─── Mark All as Read ─────────────────────────────────────────────────────
export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const unread = await getNotifications(userId, true);
  await Promise.all(
    unread.map(n => markNotificationRead(n.id))
  );
};

// ─── Real-time Listener ───────────────────────────────────────────────────
export const listenToNotifications = (
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): (() => void) => {
  return listenToQuery<Notification>(
    COLLECTION,
    [where('recipientId', '==', userId)],
    (notifications) => {
      const sorted = [...notifications]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 50);
      onUpdate(sorted);
    }
  );
};

// ─── Get Unread Count ─────────────────────────────────────────────────────
export const getUnreadCount = async (userId: string): Promise<number> => {
  const unread = await getNotifications(userId, true);
  return unread.length;
};
