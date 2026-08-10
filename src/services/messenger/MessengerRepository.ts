import { supabase, isSupabaseConfigured, isUuid } from '../../lib/supabase';
import {
  Conversation,
  ConversationMember,
  ConversationItem,
  Message,
  ConversationSettings,
  MessengerSearchUser,
  MemberRole
} from './MessengerTypes';

const MIGRATION_DONE_KEY = 'messenger_migration_v2_completed';
const LOCAL_CONVERSATIONS_KEY = 'messenger_local_conversations';
const LOCAL_MESSAGES_KEY = 'messenger_local_messages';

export class MessengerRepository {
  private localConversations: ConversationItem[] = [];
  private localMessages: Record<string, Message[]> = {};

  constructor() {
    this.loadLocalData();
  }

  private loadLocalData() {
    try {
      const convs = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
      if (convs) this.localConversations = JSON.parse(convs);
      const msgs = localStorage.getItem(LOCAL_MESSAGES_KEY);
      if (msgs) this.localMessages = JSON.parse(msgs);
    } catch (e) {
      console.warn('[MessengerRepository] Error loading local storage:', e);
    }
  }

  private saveLocalData() {
    try {
      localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(this.localConversations));
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(this.localMessages));
    } catch (e) {
      console.warn('[MessengerRepository] Error saving local storage:', e);
    }
  }

  /**
   * Migrate legacy messenger_messages to new conversations architecture once
   */
  async migrateLegacyMessagesIfNeeded(currentUserId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

    try {
      // Fetch legacy messenger_messages
      const { data: legacyMsgs, error } = await supabase
        .from('messenger_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !legacyMsgs || legacyMsgs.length === 0) {
        localStorage.setItem(MIGRATION_DONE_KEY, 'true');
        return;
      }

      console.log(`[MessengerMigration] Found ${legacyMsgs.length} legacy messages to migrate.`);

      // Group messages by pair of users (sorted so (A, B) is same as (B, A))
      const pairMap = new Map<string, { u1: string; u2: string; msgs: any[] }>();

      for (const msg of legacyMsgs) {
        const sender = msg.sender_id;
        const receiver = msg.receiver_id;
        if (!sender || !receiver) continue;

        const key = [sender, receiver].sort().join('___');
        if (!pairMap.has(key)) {
          pairMap.set(key, { u1: sender, u2: receiver, msgs: [] });
        }
        pairMap.get(key)!.msgs.push(msg);
      }

      // For each pair, ensure direct conversation exists
      for (const [key, { u1, u2, msgs }] of pairMap.entries()) {
        if (!isUuid(u1) || !isUuid(u2)) continue;

        // Check if direct conversation already exists in DB
        const { data: existingMembers } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .in('user_id', [u1, u2]);

        let convId: string | null = null;

        if (existingMembers && existingMembers.length > 0) {
          const counts = new Map<string, number>();
          for (const m of existingMembers) {
            counts.set(m.conversation_id, (counts.get(m.conversation_id) || 0) + 1);
          }
          for (const [cId, count] of counts.entries()) {
            if (count >= 2) {
              convId = cId;
              break;
            }
          }
        }

        if (!convId) {
          // Create conversation
          const { data: newConv, error: createErr } = await supabase
            .from('conversations')
            .insert({ type: 'direct', owner_id: u1 })
            .select('*')
            .single();

          if (createErr || !newConv) {
            console.error('[MessengerMigration] Error creating conversation:', createErr);
            continue;
          }
          convId = newConv.id;

          // Add members
          await supabase.from('conversation_members').insert([
            { conversation_id: convId, user_id: u1, role: 'member' },
            { conversation_id: convId, user_id: u2, role: 'member' }
          ]);
        }

        // Transfer messages
        for (const msg of msgs) {
          const msgSender = isUuid(msg.sender_id) ? msg.sender_id : u1;
          await supabase.from('messages').insert({
            id: isUuid(msg.id) ? msg.id : undefined,
            conversation_id: convId,
            sender_id: msgSender,
            sender_name: msg.sender_name || 'Пользователь',
            sender_avatar: msg.sender_avatar || '',
            text: msg.text || '',
            support_ticket_id: msg.support_ticket_id || null,
            created_at: msg.created_at || new Date().toISOString()
          }).select('id');
        }
      }

      localStorage.setItem(MIGRATION_DONE_KEY, 'true');
      console.log('[MessengerMigration] Migration completed successfully.');
    } catch (e) {
      console.error('[MessengerMigration] Failed:', e);
    }
  }

  /**
   * Search users by display name, username or public_id
   */
  async searchUsers(query: string, currentUserId: string): Promise<MessengerSearchUser[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    if (isSupabaseConfigured) {
      try {
        let queryBuilder = supabase
          .from('profiles')
          .select('id, public_id, username, display_name, avatar_url')
          .neq('id', currentUserId)
          .limit(20);

        // If numeric, check public_id equality or string search
        const numericVal = parseInt(q.replace('#', '').replace('id:', ''), 10);
        if (!isNaN(numericVal)) {
          queryBuilder = queryBuilder.or(`public_id.eq.${numericVal},username.ilike.%${q}%,display_name.ilike.%${q}%`);
        } else {
          queryBuilder = queryBuilder.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
        }

        const { data, error } = await queryBuilder;
        if (!error && data) {
          return data.map(p => ({
            id: p.id,
            public_id: p.public_id ? Number(p.public_id) : undefined,
            name: p.display_name?.trim() || p.username || 'Пользователь',
            username: p.username,
            avatar: p.avatar_url || ''
          }));
        }
      } catch (e) {
        console.warn('[MessengerRepository] searchUsers failed, fallback:', e);
      }
    }

    // Local fallback
    return [];
  }

  /**
   * Fetch all conversations for the user with members, settings, last message and unread count
   */
  async getConversations(userId: string): Promise<ConversationItem[]> {
    if (isSupabaseConfigured && isUuid(userId)) {
      try {
        await this.migrateLegacyMessagesIfNeeded(userId);

        // 1. Get member rows for current user
        const { data: memberRows, error: memberErr } = await supabase
          .from('conversation_members')
          .select('conversation_id, last_read_message_id, role, joined_at')
          .eq('user_id', userId);

        if (memberErr || !memberRows || memberRows.length === 0) {
          return [];
        }

        const convIds = memberRows.map(m => m.conversation_id);

        // 2. Fetch conversations
        const { data: convData, error: convErr } = await supabase
          .from('conversations')
          .select('*')
          .in('id', convIds)
          .order('updated_at', { ascending: false });

        if (convErr || !convData) {
          return [];
        }

        // 3. Fetch members of these conversations
        const { data: allMembers, error: membersErr } = await supabase
          .from('conversation_members')
          .select('id, conversation_id, user_id, role, joined_at, last_read_message_id')
          .in('conversation_id', convIds);

        // 4. Fetch settings for current user
        const { data: userSettings } = await supabase
          .from('conversation_settings')
          .select('*')
          .eq('user_id', userId)
          .in('conversation_id', convIds);

        const settingsMap = new Map<string, ConversationSettings>();
        (userSettings || []).forEach(s => settingsMap.set(s.conversation_id, s));

        // Get profiles for all member user_ids
        const allUserIds = Array.from(new Set((allMembers || []).map(m => m.user_id)));
        let profileMap = new Map<string, MessengerSearchUser>();

        if (allUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, public_id, username, display_name, avatar_url')
            .in('id', allUserIds);

          (profiles || []).forEach(p => {
            profileMap.set(p.id, {
              id: p.id,
              public_id: p.public_id ? Number(p.public_id) : undefined,
              name: p.display_name?.trim() || p.username || 'Пользователь',
              username: p.username,
              avatar: p.avatar_url || ''
            });
          });
        }

        // 5. Build conversation items
        const results: ConversationItem[] = [];

        for (const conv of convData) {
          const membersOfConv = (allMembers || []).filter(m => m.conversation_id === conv.id).map(m => {
            const p = profileMap.get(m.user_id);
            return {
              id: m.id,
              conversation_id: m.conversation_id,
              user_id: m.user_id,
              role: m.role as MemberRole,
              joined_at: m.joined_at,
              last_read_message_id: m.last_read_message_id,
              user: p
            };
          });

          // Fetch last message for this conv
          const { data: lastMsgData } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          let lastMsg: Message | undefined = undefined;
          if (lastMsgData) {
            lastMsg = {
              id: lastMsgData.id,
              conversation_id: lastMsgData.conversation_id,
              sender_id: lastMsgData.sender_id,
              sender_name: lastMsgData.sender_name || 'Пользователь',
              sender_avatar: lastMsgData.sender_avatar || '',
              text: lastMsgData.text || '',
              attachments: lastMsgData.attachments || [],
              support_ticket_id: lastMsgData.support_ticket_id,
              created_at: lastMsgData.created_at,
              edited_at: lastMsgData.edited_at,
              deleted_at: lastMsgData.deleted_at
            };
          }

          // Calculate unread count for current user
          const currentUserMemberRow = memberRows.find(m => m.conversation_id === conv.id);
          let unreadCount = 0;

          if (lastMsg && lastMsg.sender_id !== userId) {
            if (currentUserMemberRow?.last_read_message_id) {
              // Get count of messages after last_read_message_id
              const { data: readRef } = await supabase
                .from('messages')
                .select('created_at')
                .eq('id', currentUserMemberRow.last_read_message_id)
                .single();

              if (readRef) {
                const { count } = await supabase
                  .from('messages')
                  .select('id', { count: 'exact', head: true })
                  .eq('conversation_id', conv.id)
                  .neq('sender_id', userId)
                  .gt('created_at', readRef.created_at);

                unreadCount = count || 0;
              } else {
                unreadCount = 1;
              }
            } else {
              // Unread count is all messages not sent by userId
              const { count } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', userId);

              unreadCount = count || 0;
            }
          }

          const otherMember = membersOfConv.find(m => m.user_id !== userId);

          results.push({
            conversation: conv,
            members: membersOfConv,
            settings: settingsMap.get(conv.id),
            last_message: lastMsg,
            unread_count: unreadCount,
            other_user: otherMember?.user
          });
        }

        // Sort by pinned first, then by last_message timestamp
        results.sort((a, b) => {
          const pinnedA = a.settings?.is_pinned ? 1 : 0;
          const pinnedB = b.settings?.is_pinned ? 1 : 0;
          if (pinnedA !== pinnedB) return pinnedB - pinnedA;

          const timeA = a.last_message?.created_at || a.conversation.created_at;
          const timeB = b.last_message?.created_at || b.conversation.created_at;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });

        return results;
      } catch (e) {
        console.error('[MessengerRepository] getConversations error:', e);
      }
    }

    // Return local conversations fallback
    return this.localConversations;
  }

  /**
   * Get or create a direct conversation with target user
   */
  async getOrCreateDirectConversation(userId: string, targetUserId: string): Promise<ConversationItem> {
    if (isSupabaseConfigured && isUuid(userId) && isUuid(targetUserId)) {
      // Find existing direct conversation between userId and targetUserId
      const { data: memberRows } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .in('user_id', [userId, targetUserId]);

      let existingConvId: string | null = null;
      if (memberRows && memberRows.length > 0) {
        const counts = new Map<string, number>();
        for (const m of memberRows) {
          counts.set(m.conversation_id, (counts.get(m.conversation_id) || 0) + 1);
        }
        for (const [cId, count] of counts.entries()) {
          if (count >= 2) {
            // Check if conversation type is 'direct'
            const { data: conv } = await supabase
              .from('conversations')
              .select('id, type')
              .eq('id', cId)
              .single();

            if (conv && conv.type === 'direct') {
              existingConvId = cId;
              break;
            }
          }
        }
      }

      if (existingConvId) {
        const convs = await this.getConversations(userId);
        const match = convs.find(c => c.conversation.id === existingConvId);
        if (match) return match;
      }

      // Create new direct conversation
      const { data: newConv, error: createErr } = await supabase
        .from('conversations')
        .insert({
          type: 'direct',
          owner_id: userId
        })
        .select('*')
        .single();

      if (createErr || !newConv) {
        throw new Error(`Failed to create conversation: ${createErr?.message || 'Unknown'}`);
      }

      // Add members
      await supabase.from('conversation_members').insert([
        { conversation_id: newConv.id, user_id: userId, role: 'member' },
        { conversation_id: newConv.id, user_id: targetUserId, role: 'member' }
      ]);

      const convs = await this.getConversations(userId);
      const createdItem = convs.find(c => c.conversation.id === newConv.id);
      if (createdItem) return createdItem;
    }

    // Local fallback creation
    let existing = this.localConversations.find(
      c => c.conversation.type === 'direct' && c.members.some(m => m.user_id === targetUserId)
    );
    if (existing) return existing;

    const newId = `conv-${Date.now()}`;
    const newItem: ConversationItem = {
      conversation: {
        id: newId,
        type: 'direct',
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      members: [
        { id: `m1-${newId}`, conversation_id: newId, user_id: userId, role: 'member', joined_at: new Date().toISOString() },
        { id: `m2-${newId}`, conversation_id: newId, user_id: targetUserId, role: 'member', joined_at: new Date().toISOString() }
      ],
      unread_count: 0
    };
    this.localConversations.unshift(newItem);
    this.saveLocalData();
    return newItem;
  }

  /**
   * Create a group conversation
   */
  async createGroupConversation(ownerId: string, name: string, memberUserIds: string[], avatarUrl?: string): Promise<ConversationItem> {
    const allMemberIds = Array.from(new Set([ownerId, ...memberUserIds]));

    if (isSupabaseConfigured && isUuid(ownerId)) {
      const { data: newConv, error: createErr } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name: name.trim(),
          avatar_url: avatarUrl || null,
          owner_id: ownerId
        })
        .select('*')
        .single();

      if (createErr || !newConv) {
        throw new Error(`Failed to create group: ${createErr?.message || 'Unknown'}`);
      }

      const membersPayload = allMemberIds.map(uId => ({
        conversation_id: newConv.id,
        user_id: uId,
        role: uId === ownerId ? ('owner' as MemberRole) : ('member' as MemberRole)
      }));

      await supabase.from('conversation_members').insert(membersPayload);

      const convs = await this.getConversations(ownerId);
      const createdItem = convs.find(c => c.conversation.id === newConv.id);
      if (createdItem) return createdItem;
    }

    // Local fallback
    const newId = `group-${Date.now()}`;
    const newItem: ConversationItem = {
      conversation: {
        id: newId,
        type: 'group',
        name: name,
        avatar_url: avatarUrl || null,
        owner_id: ownerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      members: allMemberIds.map((uId, idx) => ({
        id: `m-${idx}-${newId}`,
        conversation_id: newId,
        user_id: uId,
        role: uId === ownerId ? 'owner' : 'member',
        joined_at: new Date().toISOString()
      })),
      unread_count: 0
    };
    this.localConversations.unshift(newItem);
    this.saveLocalData();
    return newItem;
  }

  /**
   * Fetch messages for a conversation with pagination
   */
  async getMessages(conversationId: string, limit: number = 50, beforeCreatedAt?: string): Promise<Message[]> {
    if (isSupabaseConfigured && isUuid(conversationId)) {
      try {
        let q = supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (beforeCreatedAt) {
          q = q.lt('created_at', beforeCreatedAt);
        }

        const { data, error } = await q;

        if (!error && data) {
          const msgIds = data.map(m => m.id);

          // Get read receipts
          let receiptMap = new Map<string, string[]>();
          if (msgIds.length > 0) {
            const { data: receipts } = await supabase
              .from('message_read_receipts')
              .select('message_id, user_id')
              .in('message_id', msgIds);

            (receipts || []).forEach(r => {
              if (!receiptMap.has(r.message_id)) receiptMap.set(r.message_id, []);
              receiptMap.get(r.message_id)!.push(r.user_id);
            });
          }

          const msgs: Message[] = data.map(m => ({
            id: m.id,
            conversation_id: m.conversation_id,
            sender_id: m.sender_id,
            sender_name: m.sender_name || 'Пользователь',
            sender_avatar: m.sender_avatar || '',
            text: m.text || '',
            attachments: m.attachments || [],
            support_ticket_id: m.support_ticket_id,
            created_at: m.created_at,
            edited_at: m.edited_at,
            deleted_at: m.deleted_at,
            read_by_user_ids: receiptMap.get(m.id) || []
          }));

          // Return in ascending chronological order for chat rendering
          return msgs.reverse();
        }
      } catch (e) {
        console.error('[MessengerRepository] getMessages error:', e);
      }
    }

    // Local fallback
    const msgs = this.localMessages[conversationId] || [];
    return msgs;
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    text: string,
    attachments?: any[],
    supportTicketId?: string
  ): Promise<Message> {
    const createdAt = new Date().toISOString();

    if (isSupabaseConfigured && isUuid(conversationId) && isUuid(senderId)) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          text: text,
          attachments: attachments || [],
          support_ticket_id: supportTicketId || null,
          created_at: createdAt
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(`Failed to send message: ${error?.message || 'Unknown'}`);
      }

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: createdAt })
        .eq('id', conversationId);

      // Auto-mark as read by sender
      await supabase
        .from('conversation_members')
        .update({ last_read_message_id: data.id })
        .eq('conversation_id', conversationId)
        .eq('user_id', senderId);

      return {
        id: data.id,
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        sender_avatar: data.sender_avatar,
        text: data.text,
        attachments: data.attachments || [],
        support_ticket_id: data.support_ticket_id,
        created_at: data.created_at,
        edited_at: data.edited_at,
        deleted_at: data.deleted_at,
        read_by_user_ids: [senderId]
      };
    }

    // Local fallback
    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversation_id: conversationId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      text: text,
      attachments: attachments || [],
      support_ticket_id: supportTicketId || null,
      created_at: createdAt,
      read_by_user_ids: [senderId]
    };

    if (!this.localMessages[conversationId]) {
      this.localMessages[conversationId] = [];
    }
    this.localMessages[conversationId].push(newMsg);

    const conv = this.localConversations.find(c => c.conversation.id === conversationId);
    if (conv) {
      conv.last_message = newMsg;
      conv.conversation.updated_at = createdAt;
    }
    this.saveLocalData();

    return newMsg;
  }

  /**
   * Edit message text
   */
  async editMessage(messageId: string, newText: string, userId: string): Promise<Message> {
    const editedAt = new Date().toISOString();

    if (isSupabaseConfigured && isUuid(messageId)) {
      const { data, error } = await supabase
        .from('messages')
        .update({
          text: newText,
          edited_at: editedAt
        })
        .eq('id', messageId)
        .eq('sender_id', userId)
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(`Failed to edit message: ${error?.message || 'Unauthorized or not found'}`);
      }

      return {
        id: data.id,
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        sender_avatar: data.sender_avatar,
        text: data.text,
        attachments: data.attachments || [],
        support_ticket_id: data.support_ticket_id,
        created_at: data.created_at,
        edited_at: data.edited_at,
        deleted_at: data.deleted_at
      };
    }

    // Local fallback
    for (const cId in this.localMessages) {
      const msgs = this.localMessages[cId];
      const match = msgs.find(m => m.id === messageId);
      if (match && match.sender_id === userId) {
        match.text = newText;
        match.edited_at = editedAt;
        this.saveLocalData();
        return match;
      }
    }
    throw new Error('Message not found locally');
  }

  /**
   * Soft-delete message (sets deleted_at timestamp)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const deletedAt = new Date().toISOString();

    if (isSupabaseConfigured && isUuid(messageId)) {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: deletedAt })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) {
        throw new Error(`Failed to delete message: ${error.message}`);
      }
      return;
    }

    // Local fallback
    for (const cId in this.localMessages) {
      const msgs = this.localMessages[cId];
      const match = msgs.find(m => m.id === messageId);
      if (match && match.sender_id === userId) {
        match.deleted_at = deletedAt;
        this.saveLocalData();
        return;
      }
    }
  }

  /**
   * Mark conversation as read up to lastMessageId for userId
   */
  async markConversationAsRead(conversationId: string, userId: string, lastMessageId?: string): Promise<void> {
    if (isSupabaseConfigured && isUuid(conversationId) && isUuid(userId)) {
      try {
        let msgIdToSet = lastMessageId;

        if (!msgIdToSet) {
          const { data: latest } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (latest) msgIdToSet = latest.id;
        }

        if (msgIdToSet) {
          await supabase
            .from('conversation_members')
            .update({ last_read_message_id: msgIdToSet })
            .eq('conversation_id', conversationId)
            .eq('user_id', userId);

          // Add receipt
          await supabase.from('message_read_receipts').upsert(
            {
              message_id: msgIdToSet,
              conversation_id: conversationId,
              user_id: userId,
              read_at: new Date().toISOString()
            },
            { onConflict: 'message_id,user_id' }
          );
        }
      } catch (e) {
        console.warn('[MessengerRepository] markConversationAsRead error:', e);
      }
    }

    // Local fallback
    const conv = this.localConversations.find(c => c.conversation.id === conversationId);
    if (conv) {
      conv.unread_count = 0;
      this.saveLocalData();
    }
  }

  /**
   * Update Group Info
   */
  async updateGroupInfo(conversationId: string, name?: string, avatarUrl?: string): Promise<void> {
    if (isSupabaseConfigured && isUuid(conversationId)) {
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
      updates.updated_at = new Date().toISOString();

      await supabase.from('conversations').update(updates).eq('id', conversationId);
      return;
    }

    // Local
    const conv = this.localConversations.find(c => c.conversation.id === conversationId);
    if (conv) {
      if (name !== undefined) conv.conversation.name = name;
      if (avatarUrl !== undefined) conv.conversation.avatar_url = avatarUrl;
      this.saveLocalData();
    }
  }

  /**
   * Add Group Members
   */
  async addGroupMembers(conversationId: string, userIds: string[]): Promise<void> {
    if (isSupabaseConfigured && isUuid(conversationId)) {
      const payload = userIds.map(uId => ({
        conversation_id: conversationId,
        user_id: uId,
        role: 'member' as MemberRole
      }));
      await supabase.from('conversation_members').upsert(payload, { onConflict: 'conversation_id,user_id' });
      return;
    }

    // Local
    const conv = this.localConversations.find(c => c.conversation.id === conversationId);
    if (conv) {
      userIds.forEach(uId => {
        if (!conv.members.some(m => m.user_id === uId)) {
          conv.members.push({
            id: `m-${Date.now()}-${uId}`,
            conversation_id: conversationId,
            user_id: uId,
            role: 'member',
            joined_at: new Date().toISOString()
          });
        }
      });
      this.saveLocalData();
    }
  }

  /**
   * Remove Group Member
   */
  async removeGroupMember(conversationId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured && isUuid(conversationId) && isUuid(userId)) {
      await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
      return;
    }

    // Local
    const conv = this.localConversations.find(c => c.conversation.id === conversationId);
    if (conv) {
      conv.members = conv.members.filter(m => m.user_id !== userId);
      this.saveLocalData();
    }
  }

  /**
   * Update Conversation Settings (mute, pin, archive)
   */
  async updateSettings(
    conversationId: string,
    userId: string,
    settings: Partial<ConversationSettings>
  ): Promise<ConversationSettings> {
    if (isSupabaseConfigured && isUuid(conversationId) && isUuid(userId)) {
      const payload = {
        conversation_id: conversationId,
        user_id: userId,
        is_muted: settings.is_muted ?? false,
        is_pinned: settings.is_pinned ?? false,
        is_archived: settings.is_archived ?? false,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('conversation_settings')
        .upsert(payload, { onConflict: 'conversation_id,user_id' })
        .select('*')
        .single();

      if (!error && data) {
        return data;
      }
    }

    // Local
    const conv = this.localConversations.find(c => c.conversation.id === conversationId);
    if (conv) {
      conv.settings = {
        conversation_id: conversationId,
        user_id: userId,
        is_muted: settings.is_muted ?? conv.settings?.is_muted ?? false,
        is_pinned: settings.is_pinned ?? conv.settings?.is_pinned ?? false,
        is_archived: settings.is_archived ?? conv.settings?.is_archived ?? false
      };
      this.saveLocalData();
      return conv.settings;
    }

    return {
      conversation_id: conversationId,
      user_id: userId,
      is_muted: false,
      is_pinned: false,
      is_archived: false
    };
  }
}

export const messengerRepository = new MessengerRepository();
