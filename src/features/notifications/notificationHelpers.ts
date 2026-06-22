import { AppUser } from '../../types';
import {
  CreateNotificationParams,
  NotificationEntityType,
  NotificationLink,
  NotificationType,
} from './notificationTypes';
import { NotificationService } from './NotificationService';

const MENTION_REGEX = /@([a-zA-Zа-яА-ЯёЁ0-9_]+)/g;

export function parseMentions(text: string): string[] {
  const matches = text.matchAll(MENTION_REGEX);
  const usernames = new Set<string>();
  for (const match of matches) {
    if (match[1]) usernames.add(match[1].toLowerCase());
  }
  return [...usernames];
}

export function findUserByMention(users: AppUser[], mention: string): AppUser | undefined {
  const normalized = mention.toLowerCase();
  return users.find(u => {
    if (u.login?.toLowerCase() === normalized) return true;
    const nameParts = u.name.toLowerCase().split(/\s+/);
    return nameParts.some(part => part === normalized || part.startsWith(normalized));
  });
}

export function resolveUserId(
  users: AppUser[],
  authorId?: string,
  authorName?: string
): string | undefined {
  if (authorId) return authorId;
  if (!authorName) return undefined;
  return users.find(u => u.name === authorName)?.id;
}

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн. назад`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

interface ActorInfo {
  id: string;
  name: string;
  avatar: string;
}

function shouldSkipSelf(actorId: string, recipientId: string): boolean {
  return actorId === recipientId;
}

export function buildCommentReplyNotification(
  recipientId: string,
  actor: ActorInfo,
  postId: string,
  replyCommentId: string,
  postPreview?: string
): CreateNotificationParams | null {
  if (shouldSkipSelf(actor.id, recipientId)) return null;
  const preview = postPreview ? ` «${truncate(postPreview, 40)}»` : '';
  return {
    userId: recipientId,
    type: NotificationType.COMMENT_REPLY,
    actorId: actor.id,
    actorName: actor.name,
    actorAvatar: actor.avatar,
    entityType: NotificationEntityType.COMMENT,
    entityId: replyCommentId,
    title: `${actor.name} ответил на ваш комментарий`,
    message: `Новый ответ в обсуждении${preview}`,
    link: { tab: 'feed', postId, commentId: replyCommentId },
  };
}

export function buildMentionNotifications(
  text: string,
  users: AppUser[],
  actor: ActorInfo,
  postId: string,
  commentId: string
): CreateNotificationParams[] {
  const mentions = parseMentions(text);
  const result: CreateNotificationParams[] = [];

  mentions.forEach(mention => {
    const mentioned = findUserByMention(users, mention);
    if (!mentioned || shouldSkipSelf(actor.id, mentioned.id)) return;
    result.push({
      userId: mentioned.id,
      type: NotificationType.MENTION,
      actorId: actor.id,
      actorName: actor.name,
      actorAvatar: actor.avatar,
      entityType: NotificationEntityType.COMMENT,
      entityId: commentId,
      title: `${actor.name} упомянул вас в обсуждении`,
      message: truncate(text, 80),
      link: { tab: 'feed', postId, commentId },
    });
  });

  return result;
}

export function buildDirectMessageNotification(
  recipientId: string,
  actor: ActorInfo,
  messageId: string,
  preview: string
): CreateNotificationParams | null {
  if (shouldSkipSelf(actor.id, recipientId)) return null;
  return {
    userId: recipientId,
    type: NotificationType.DIRECT_MESSAGE,
    actorId: actor.id,
    actorName: actor.name,
    actorAvatar: actor.avatar,
    entityType: NotificationEntityType.MESSAGE,
    entityId: messageId,
    title: 'У вас новое сообщение',
    message: `${actor.name}: ${truncate(preview, 60)}`,
    link: { tab: 'internal-mail', partnerId: actor.id, messageId },
  };
}

export function buildDiscussionActivityNotification(
  recipientId: string,
  actor: ActorInfo,
  postId: string,
  commentId: string,
  postPreview?: string
): CreateNotificationParams | null {
  if (shouldSkipSelf(actor.id, recipientId)) return null;
  const preview = postPreview ? truncate(postPreview, 50) : 'обсуждении';
  return {
    userId: recipientId,
    type: NotificationType.DISCUSSION_ACTIVITY,
    actorId: actor.id,
    actorName: actor.name,
    actorAvatar: actor.avatar,
    entityType: NotificationEntityType.DISCUSSION,
    entityId: postId,
    title: 'В обсуждении появились новые ответы',
    message: `${actor.name} прокомментировал: ${preview}`,
    link: { tab: 'feed', postId, commentId },
  };
}

export function buildAuthorPostNotification(
  recipientId: string,
  actor: ActorInfo,
  postId: string,
  postPreview?: string
): CreateNotificationParams | null {
  if (shouldSkipSelf(actor.id, recipientId)) return null;
  return {
    userId: recipientId,
    type: NotificationType.AUTHOR_POST,
    actorId: actor.id,
    actorName: actor.name,
    actorAvatar: actor.avatar,
    entityType: NotificationEntityType.POST,
    entityId: postId,
    title: `${actor.name} опубликовал новую запись`,
    message: postPreview ? truncate(postPreview, 80) : 'Новая публикация в вашей ленте подписок',
    link: { tab: 'feed', postId },
  };
}

export function buildSupportReplyNotification(
  recipientId: string,
  ticketId: string,
  ticketTitle: string
): CreateNotificationParams {
  return {
    userId: recipientId,
    type: NotificationType.DIRECT_MESSAGE,
    actorId: 'support',
    actorName: 'Поддержка',
    actorAvatar: 'dog2.jpeg',
    entityType: NotificationEntityType.TICKET,
    entityId: ticketId,
    title: 'Поддержка: новый ответ',
    message: `Специалист ответил на ваш вопрос: «${truncate(ticketTitle, 50)}»`,
    link: { tab: 'support', ticketId },
  };
}

export function buildVerificationDeniedNotification(recipientId: string): CreateNotificationParams {
  return {
    userId: recipientId,
    type: NotificationType.DIRECT_MESSAGE,
    actorId: 'system',
    actorName: 'Платформа',
    actorAvatar: 'images.png',
    entityType: NotificationEntityType.USER,
    entityId: recipientId,
    title: 'Верификация отклонена',
    message: 'Ваша заявка на верификацию отклонена',
    link: { tab: 'profile' },
  };
}

export function buildAccessRestrictedNotification(
  recipientId: string,
  reason: string
): CreateNotificationParams {
  return {
    userId: recipientId,
    type: NotificationType.DIRECT_MESSAGE,
    actorId: 'system',
    actorName: 'Модерация',
    actorAvatar: 'images.png',
    entityType: NotificationEntityType.USER,
    entityId: recipientId,
    title: 'Доступ ограничен',
    message: `Ваш доступ в систему был ограничен. Причина: ${truncate(reason, 80)}`,
    link: { tab: 'profile' },
  };
}

export function buildRecoveryApprovedNotification(
  recipientId: string
): CreateNotificationParams {
  return {
    userId: recipientId,
    type: NotificationType.DIRECT_MESSAGE,
    actorId: 'system',
    actorName: 'Поддержка',
    actorAvatar: 'dog2.jpeg',
    entityType: NotificationEntityType.USER,
    entityId: recipientId,
    title: 'Доступ восстановлен',
    message: `Заявка одобрена. Выигрышный доступ на восстановление предоставлен, пароль не требуется.`,
    link: { tab: 'profile' },
  };
}

export function buildVerificationTempNotification(
  recipientId: string,
  duration: string
): CreateNotificationParams {
  return {
    userId: recipientId,
    type: NotificationType.DIRECT_MESSAGE,
    actorId: 'system',
    actorName: 'Платформа',
    actorAvatar: 'images.png',
    entityType: NotificationEntityType.USER,
    entityId: recipientId,
    title: 'Временная верификация выдана',
    message: `Вам выдана временная галочка (${duration})`,
    link: { tab: 'profile' },
  };
}

export function dispatchNotifications(
  current: import('./notificationTypes').PlatformNotification[],
  params: (CreateNotificationParams | null)[]
): import('./notificationTypes').PlatformNotification[] {
  const created = params
    .filter((p): p is CreateNotificationParams => p !== null)
    .map(p => NotificationService.createNotification(p));
  if (created.length === 0) return current;
  return [...created, ...current];
}

function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1)}…`;
}

export interface NotificationNavigationHandlers {
  setActiveTab: (tab: string) => void;
  setActiveChatPartnerId: (id: string | null) => void;
  setSupportTab: (tab: string) => void;
  setViewingTicketFromNotification: (ticket: import('../../types').Ticket | null) => void;
  setNotificationScrollTarget: (target: { postId: string; commentId?: string } | null) => void;
  tickets: import('../../types').Ticket[];
}

export function navigateFromNotification(
  notification: import('./notificationTypes').PlatformNotification,
  handlers: NotificationNavigationHandlers
): void {
  const { link } = notification;

  switch (notification.type) {
    case NotificationType.COMMENT_REPLY:
    case NotificationType.MENTION:
    case NotificationType.DISCUSSION_ACTIVITY:
      handlers.setActiveTab('feed');
      if (link.postId) {
        handlers.setNotificationScrollTarget({
          postId: link.postId,
          commentId: link.commentId,
        });
      }
      break;
    case NotificationType.DIRECT_MESSAGE:
      if (link.tab === 'support' && link.ticketId) {
        const ticket = handlers.tickets.find(t => t.id === link.ticketId);
        if (ticket) {
          handlers.setViewingTicketFromNotification(ticket);
          handlers.setSupportTab('my-questions');
          handlers.setActiveTab('support');
        }
      } else if (link.partnerId && link.partnerId !== 'support' && link.partnerId !== 'system') {
        handlers.setActiveTab('internal-mail');
        handlers.setActiveChatPartnerId(link.partnerId);
      } else if (link.tab === 'profile') {
        handlers.setActiveTab('profile');
      }
      break;
    case NotificationType.AUTHOR_POST:
      handlers.setActiveTab('feed');
      if (link.postId) {
        handlers.setNotificationScrollTarget({ postId: link.postId });
      }
      break;
    default:
      handlers.setActiveTab(link.tab);
  }
}
