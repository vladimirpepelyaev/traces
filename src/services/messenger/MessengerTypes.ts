export type ConversationType = 'direct' | 'group';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string | null;
  avatar_url?: string | null;
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  last_read_message_id?: string | null;
  user?: {
    id: string;
    public_id?: number;
    name: string;
    username?: string;
    avatar?: string;
    isOnline?: boolean;
  };
}

export interface MessageAttachment {
  id: string;
  url: string;
  name?: string;
  type?: string;
  size?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  text: string;
  attachments?: MessageAttachment[];
  support_ticket_id?: string | null;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  read_receipts_count?: number;
  read_by_user_ids?: string[];
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  conversation_id: string;
  user_id: string;
  read_at: string;
}

export interface ConversationSettings {
  id?: string;
  conversation_id: string;
  user_id: string;
  is_muted: boolean;
  is_pinned: boolean;
  is_archived: boolean;
}

export interface ConversationItem {
  conversation: Conversation;
  members: ConversationMember[];
  settings?: ConversationSettings;
  last_message?: Message;
  unread_count: number;
  other_user?: {
    id: string;
    public_id?: number;
    name: string;
    username?: string;
    avatar?: string;
    isOnline?: boolean;
  };
}

export interface MessengerSearchUser {
  id: string;
  public_id?: number;
  name: string;
  username?: string;
  avatar?: string;
}
