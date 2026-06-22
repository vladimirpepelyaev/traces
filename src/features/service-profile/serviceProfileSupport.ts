import { AppUser, Ticket } from '../../types';

export function shouldShowServiceMessageButton(user?: AppUser | null): boolean {
  return !!user?.isServiceProfile && !!user?.showServiceMessageButton;
}

export function findServiceProfileChatTicket(
  tickets: Ticket[],
  userId: string,
  serviceProfileId: string
): Ticket | undefined {
  return tickets.find(
    t =>
      t.source === 'service_profile_chat' &&
      t.userId === userId &&
      t.serviceProfileId === serviceProfileId
  );
}

function formatTicketTime(): string {
  const now = new Date();
  const HHMM = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `сегодня в ${HHMM}`;
}

export function createServiceProfileChatTicket(
  user: AppUser,
  serviceProfile: AppUser,
  firstMessage: string
): Ticket {
  return {
    id: `support-chat-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar || '',
    title: `Обращение к ${serviceProfile.name}`,
    status: 'new',
    source: 'service_profile_chat',
    serviceProfileId: serviceProfile.id,
    serviceProfileName: serviceProfile.name,
    serviceProfileAvatar: serviceProfile.avatar,
    category: serviceProfile.serviceSupportCategory || 'Поддержка',
    urgency: 'medium',
    description: 'Создано через чат служебного профиля',
    messages: [{ sender: 'user', text: firstMessage, time: formatTicketTime() }],
  };
}

export function appendUserMessageToServiceTicket(ticket: Ticket, text: string): Ticket {
  return {
    ...ticket,
    status: 'new',
    messages: [...ticket.messages, { sender: 'user', text, time: formatTicketTime() }],
  };
}

export function appendStaffMessageToServiceTicket(
  ticket: Ticket,
  text: string,
  serviceProfileName: string
): Ticket {
  return {
    ...ticket,
    status: 'answered',
    messages: [
      ...ticket.messages,
      {
        sender: 'staff',
        text,
        time: formatTicketTime(),
        operatorName: serviceProfileName,
      },
    ],
  };
}

export interface ServiceChatMessengerMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  text: string;
  timestamp: string;
  unread: boolean;
  supportTicketId?: string;
}

export function buildStaffChatReplyMessage(
  ticket: Ticket,
  text: string,
  serviceProfile: AppUser
): ServiceChatMessengerMessage {
  const now = new Date();
  return {
    id: `mm-support-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    senderId: serviceProfile.id,
    senderName: serviceProfile.name,
    senderAvatar: serviceProfile.avatar || '',
    receiverId: ticket.userId,
    text,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    unread: true,
    supportTicketId: ticket.id,
  };
}
