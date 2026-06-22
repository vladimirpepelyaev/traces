import {
  CreateNotificationParams,
  FILTER_TO_TYPES,
  NotificationFilter,
  PlatformNotification,
} from './notificationTypes';

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `notif-${Date.now()}-${idCounter}`;
}

export class NotificationService {
  static createNotification(params: CreateNotificationParams): PlatformNotification {
    return {
      id: nextId(),
      userId: params.userId,
      type: params.type,
      actorId: params.actorId,
      actorName: params.actorName,
      actorAvatar: params.actorAvatar,
      entityType: params.entityType,
      entityId: params.entityId,
      title: params.title,
      message: params.message,
      isRead: false,
      createdAt: new Date(),
      link: params.link,
    };
  }

  static markAsRead(
    notifications: PlatformNotification[],
    notificationId: string
  ): PlatformNotification[] {
    return notifications.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    );
  }

  static markAllAsRead(
    notifications: PlatformNotification[],
    userId: string
  ): PlatformNotification[] {
    return notifications.map(n =>
      n.userId === userId ? { ...n, isRead: true } : n
    );
  }

  static getUserNotifications(
    notifications: PlatformNotification[],
    userId: string,
    filter: NotificationFilter = 'all'
  ): PlatformNotification[] {
    const userItems = notifications.filter(n => n.userId === userId);
    const types = FILTER_TO_TYPES[filter];
    const filtered = types ? userItems.filter(n => types.includes(n.type)) : userItems;
    return [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  static getUnreadCount(
    notifications: PlatformNotification[],
    userId: string
  ): number {
    return notifications.filter(n => n.userId === userId && !n.isRead).length;
  }
}
