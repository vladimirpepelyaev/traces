export enum NotificationType {
  COMMENT_REPLY = 'COMMENT_REPLY',
  DISCUSSION_ACTIVITY = 'DISCUSSION_ACTIVITY',
  MENTION = 'MENTION',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE',
  AUTHOR_POST = 'AUTHOR_POST',
}

export enum NotificationEntityType {
  COMMENT = 'comment',
  POST = 'post',
  DISCUSSION = 'discussion',
  MESSAGE = 'message',
  USER = 'user',
  TICKET = 'ticket',
}

export interface NotificationLink {
  tab: string;
  postId?: string;
  commentId?: string;
  partnerId?: string;
  messageId?: string;
  ticketId?: string;
}

export interface PlatformNotification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  entityType: NotificationEntityType;
  entityId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  link: NotificationLink;
}

export type NotificationFilter =
  | 'all'
  | 'replies'
  | 'mentions'
  | 'messages'
  | 'discussions'
  | 'subscriptions';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  entityType: NotificationEntityType;
  entityId: string;
  title: string;
  message: string;
  link: NotificationLink;
}

export const NOTIFICATION_FILTER_LABELS: Record<NotificationFilter, string> = {
  all: 'Все',
  replies: 'Ответы',
  mentions: 'Упоминания',
  messages: 'Сообщения',
  discussions: 'Обсуждения',
  subscriptions: 'Подписки',
};

export const FILTER_TO_TYPES: Partial<Record<NotificationFilter, NotificationType[]>> = {
  replies: [NotificationType.COMMENT_REPLY],
  mentions: [NotificationType.MENTION],
  messages: [NotificationType.DIRECT_MESSAGE],
  discussions: [NotificationType.DISCUSSION_ACTIVITY],
  subscriptions: [NotificationType.AUTHOR_POST],
};
