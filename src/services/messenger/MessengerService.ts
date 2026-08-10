import { messengerRepository } from './MessengerRepository';
import { ConversationItem, Message, MessengerSearchUser, ConversationSettings } from './MessengerTypes';
import { RealtimeService } from '../realtime/RealtimeService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

type MessengerListener = () => void;

export class MessengerService {
  private listeners: Set<MessengerListener> = new Set();
  private activeRealtimeChannel: any = null;

  subscribe(listener: MessengerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  /**
   * Initialize Realtime subscriptions for messenger
   */
  initRealtime(userId: string) {
    if (!isSupabaseConfigured || !userId) return;

    if (this.activeRealtimeChannel) {
      supabase.removeChannel(this.activeRealtimeChannel);
      this.activeRealtimeChannel = null;
    }

    try {
      this.activeRealtimeChannel = supabase
        .channel('public:messenger_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            console.log('[MessengerService] Realtime message event:', payload);
            this.notify();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          (payload) => {
            console.log('[MessengerService] Realtime conversation event:', payload);
            this.notify();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversation_members' },
          (payload) => {
            console.log('[MessengerService] Realtime member event:', payload);
            this.notify();
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[MessengerService] Failed to set up realtime subscription:', e);
    }
  }

  async getConversations(userId: string): Promise<ConversationItem[]> {
    return messengerRepository.getConversations(userId);
  }

  async getOrCreateDirectConversation(userId: string, targetUserId: string): Promise<ConversationItem> {
    const conv = await messengerRepository.getOrCreateDirectConversation(userId, targetUserId);
    this.notify();
    return conv;
  }

  async createGroupConversation(ownerId: string, name: string, memberUserIds: string[], avatarUrl?: string): Promise<ConversationItem> {
    const conv = await messengerRepository.createGroupConversation(ownerId, name, memberUserIds, avatarUrl);
    this.notify();
    return conv;
  }

  async getMessages(conversationId: string, limit?: number, beforeCreatedAt?: string): Promise<Message[]> {
    return messengerRepository.getMessages(conversationId, limit, beforeCreatedAt);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    text: string,
    attachments?: any[],
    supportTicketId?: string
  ): Promise<Message> {
    const msg = await messengerRepository.sendMessage(
      conversationId,
      senderId,
      senderName,
      senderAvatar,
      text,
      attachments,
      supportTicketId
    );
    this.notify();
    return msg;
  }

  async editMessage(messageId: string, newText: string, userId: string): Promise<Message> {
    const msg = await messengerRepository.editMessage(messageId, newText, userId);
    this.notify();
    return msg;
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    await messengerRepository.deleteMessage(messageId, userId);
    this.notify();
  }

  async markConversationAsRead(conversationId: string, userId: string, lastMessageId?: string): Promise<void> {
    await messengerRepository.markConversationAsRead(conversationId, userId, lastMessageId);
    this.notify();
  }

  async searchUsers(query: string, currentUserId: string): Promise<MessengerSearchUser[]> {
    return messengerRepository.searchUsers(query, currentUserId);
  }

  async updateGroupInfo(conversationId: string, name?: string, avatarUrl?: string): Promise<void> {
    await messengerRepository.updateGroupInfo(conversationId, name, avatarUrl);
    this.notify();
  }

  async addGroupMembers(conversationId: string, userIds: string[]): Promise<void> {
    await messengerRepository.addGroupMembers(conversationId, userIds);
    this.notify();
  }

  async removeGroupMember(conversationId: string, userId: string): Promise<void> {
    await messengerRepository.removeGroupMember(conversationId, userId);
    this.notify();
  }

  async updateSettings(conversationId: string, userId: string, settings: Partial<ConversationSettings>): Promise<ConversationSettings> {
    const res = await messengerRepository.updateSettings(conversationId, userId, settings);
    this.notify();
    return res;
  }
}

export const messengerService = new MessengerService();
