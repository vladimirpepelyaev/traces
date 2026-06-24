import { supabase, isSupabaseConfigured, handleSupabaseError, ensureProfileExists } from '../../lib/supabase';
import { FeedPost, Ticket, ModeratorAction, AppUser, Complaint, DialogComplaint, DialogMessage } from '../../types';

export interface PlatformNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  timestamp: string;
  payload?: any;
}

export interface SecurityEventLog {
  id: string;
  event: string;
  ip: string;
  userName: string;
  status: 'success' | 'warning' | 'error' | 'critical';
  device: string;
  time?: string;
  created_at?: string;
}

export interface CoinsTransfer {
  id?: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  message?: string;
  timestamp?: string;
}

// ==========================================
// RESILIENCE UTILITIES (Retry, Rollback, Deduplication)
// ==========================================

export class ResilienceService {
  private static activeOperations = new Map<string, Promise<any>>();

  /**
   * Deduplicates active promises based on a signature key
   */
  static deduplicate<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (this.activeOperations.has(key)) {
      console.log(`[Resilience] Action de-duplicated for key: ${key}`);
      return this.activeOperations.get(key) as Promise<T>;
    }
    const promise = operation().finally(() => {
      this.activeOperations.delete(key);
    });
    this.activeOperations.set(key, promise);
    return promise;
  }

  /**
   * Retries an async function with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delayMs = 500
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retries <= 1) throw error;
      console.warn(`[Resilience] Operation failed. Retrying in ${delayMs}ms... (${retries - 1} left). Error:`, error);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return this.retry(operation, retries - 1, delayMs * 2);
    }
  }

  /**
   * Wraps an operation with optimistic update, instant UI refresh, rollback capability, and database push
   */
  static async executeOptimistic<T>(options: {
    applyUI: () => void;
    rollbackUI: () => void;
    dbOperation: () => Promise<T>;
    onError?: (err: any) => void;
  }): Promise<T | null> {
    try {
      options.applyUI();
      return await this.retry(() => options.dbOperation());
    } catch (error) {
      console.error('[Resilience] Optimistic action failed. Rolling back UI...', error);
      options.rollbackUI();
      if (options.onError) options.onError(error);
      return null;
    }
  }
}

// ==========================================
// 1. PROFILE REPOSITORY
// ==========================================
export class ProfileRepositoryProvider {
  async getProfile(userId: string): Promise<any | null> {
    if (!isSupabaseConfigured) return null;
    return ResilienceService.deduplicate(`get-profile-${userId}`, async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.error('[ProfileRepository] Error:', error);
        return null;
      }
      return data;
    });
  }

  async saveProfile(userId: string, updates: any): Promise<void> {
    if (!isSupabaseConfigured) return;
    await ResilienceService.retry(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select();

      console.log('[DB]', 'profiles', { id: userId, ...updates }, data, error);

      if (error) throw error;
    });
  }

  async setRole(userId: string, role: string): Promise<void> {
    await this.saveProfile(userId, { role });
  }

  async setBlocked(
    userId: string, 
    blocked: boolean, 
    blockReason?: string, 
    moderatorComment?: string, 
    blockInfo?: any
  ): Promise<void> {
    const profile = await this.getProfile(userId);
    const existingSettings = profile?.public_settings || {};
    
    const updatedSettings = {
      ...existingSettings,
      block_reason: blocked ? blockReason : undefined,
      moderator_comment: blocked ? moderatorComment : undefined,
      block_duration: blocked ? blockInfo?.duration : undefined,
      blocked_by: blocked ? blockInfo?.blockedBy : undefined,
      profile_block_info: blocked ? blockInfo : undefined,
      blocked_post_id: blocked ? blockInfo?.blocked_post_id : undefined
    };

    if (!blocked) {
      delete updatedSettings.block_reason;
      delete updatedSettings.moderator_comment;
      delete updatedSettings.block_duration;
      delete updatedSettings.blocked_by;
      delete updatedSettings.profile_block_info;
      delete updatedSettings.blocked_post_id;
    }

    await this.saveProfile(userId, { 
      blocked, 
      public_settings: updatedSettings 
    });
  }

  async uploadAvatar(userId: string, file: File | Blob): Promise<string> {
    if (!isSupabaseConfigured) throw new Error('Supabase not configured');
    
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.webp`;
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: true
      });
      
    if (error) {
      console.error('[ProfileRepository] uploadAvatar error:', error);
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
      
    await this.saveProfile(userId, {
      avatar_url: publicUrl,
      avatar_storage_path: fileName,
      avatar_updated_at: new Date().toISOString()
    });
    
    return publicUrl;
  }
}

// ==========================================
// 2. FEED REPOSITORY
// ==========================================
export class FeedRepositoryProvider {
  async getFeeds(): Promise<FeedPost[]> {
    return postRepository.getAll();
  }

  async saveFeedPost(post: FeedPost): Promise<FeedPost> {
    return postRepository.insert(post);
  }
}

// ==========================================
// 3. POST REPOSITORY
// ==========================================
export class PostRepositoryProvider {
  async getAll(): Promise<FeedPost[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PostRepository] Error loading posts:', error);
        handleSupabaseError(error, 'PostRepository.getAll');
        return [];
      }

      // Fetch all reactions to map ratings and user states in O(N) rather than triggering N SQL queries
      let reactions: any[] = [];
      try {
        const { data: rxData, error: rxErr } = await supabase
          .from('reactions')
          .select('*');
        if (!rxErr && rxData) {
          reactions = rxData;
        }
      } catch (e) {
        console.error('[PostRepository] Error fetching all reactions:', e);
      }

      let currentUserId = '';
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        currentUserId = sessionData?.user?.id || '';
      } catch (authErr) {
        // Ignored if unauthenticated
      }

      return (data || []).map(p => {
        const post = this.mapDbToPost(p);
        const postRx = reactions.filter((r: any) => r.post_id === post.id);

        const likesCount = postRx.filter((r: any) => r.type === 'like').length;
        const downvotesCount = postRx.filter((r: any) => r.type === 'downvote').length;
        const attentionUsers = postRx.filter((r: any) => r.type === 'attention').map((r: any) => r.user_id);

        // Final calculated rating
        post.likes = likesCount - downvotesCount;
        (post as any).dislikes = downvotesCount;
        post.boostedUsers = Array.from(new Set([...(post.boostedUsers || []), ...attentionUsers]));

        if (currentUserId) {
          post.isLiked = postRx.some((r: any) => r.user_id === currentUserId && r.type === 'like');
          post.isDownvoted = postRx.some((r: any) => r.user_id === currentUserId && r.type === 'downvote');
        } else {
          post.isLiked = false;
          post.isDownvoted = false;
        }

        return post;
      });
    } catch (e) {
      console.error('[PostRepository] getAll failed:', e);
      return [];
    }
  }

  async getById(postId: string): Promise<FeedPost | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('[PostRepository] Error loading post by id:', error);
        return null;
      }
      if (!data) return null;

      const post = this.mapDbToPost(data);

      // Fetch reactions for this specific post
      let reactions: any[] = [];
      try {
        const { data: rxData } = await supabase
          .from('reactions')
          .select('*')
          .eq('post_id', postId);
        if (rxData) {
          reactions = rxData;
        }
      } catch (e) {
        console.error('[PostRepository] Error fetching reactions for post:', e);
      }

      let currentUserId = '';
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        currentUserId = sessionData?.user?.id || '';
      } catch (authErr) {}

      const likesCount = reactions.filter((r: any) => r.type === 'like').length;
      const downvotesCount = reactions.filter((r: any) => r.type === 'downvote').length;
      const attentionUsers = reactions.filter((r: any) => r.type === 'attention').map((r: any) => r.user_id);

      post.likes = likesCount - downvotesCount;
      (post as any).dislikes = downvotesCount;
      post.boostedUsers = Array.from(new Set([...(post.boostedUsers || []), ...attentionUsers]));

      if (currentUserId) {
        post.isLiked = reactions.some((r: any) => r.user_id === currentUserId && r.type === 'like');
        post.isDownvoted = reactions.some((r: any) => r.user_id === currentUserId && r.type === 'downvote');
      } else {
        post.isLiked = false;
        post.isDownvoted = false;
      }

      return post;
    } catch (e) {
      console.error('[PostRepository] getById failed:', e);
      return null;
    }
  }

  async insert(post: FeedPost): Promise<FeedPost> {
    if (!isSupabaseConfigured) return post;
    try {
      await ensureProfileExists();
      const dbPost = this.mapPostToDb(post);
      delete dbPost.id; // delete payload.id
      const { data, error } = await supabase
        .from('posts')
        .insert(dbPost)
        .select()
        .single();

      if (error) {
        console.error('[PostRepository] Error inserting post:', error);
        handleSupabaseError(error, 'PostRepository.insert');
        throw error;
      }
      return this.mapDbToPost(data);
    } catch (e) {
      console.error('[PostRepository] insert failed:', e);
      return post;
    }
  }

  async update(postId: string, updates: Partial<FeedPost>): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const dbUpdates: any = {};
      if (updates.isApproved !== undefined) dbUpdates.is_approved = updates.isApproved;
      if (updates.moderatedBy !== undefined) dbUpdates.moderated_by = updates.moderatedBy;
      if (updates.boostedUsers !== undefined) dbUpdates.boosted_users = updates.boostedUsers;
      if (updates.comments !== undefined) dbUpdates.comments = updates.comments;

      const { error } = await supabase
        .from('posts')
        .update(dbUpdates)
        .eq('id', postId);

      if (error) {
        console.error('[PostRepository] Error updating post:', error);
        handleSupabaseError(error, 'PostRepository.update');
        throw error;
      }
    } catch (e) {
      console.error('[PostRepository] update failed:', e);
    }
  }

  async softDelete(postId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId);

      if (error) {
        console.error('[PostRepository] Error soft-deleting post:', error);
        handleSupabaseError(error, 'PostRepository.softDelete');
        throw error;
      }
    } catch (e) {
      console.error('[PostRepository] softDelete failed:', e);
    }
  }

  private mapDbToPost(db: any): FeedPost {
    const rawTime = db.created_at || db.timestamp;
    return {
      id: db.id,
      authorName: db.author_name,
      authorAvatar: db.author_avatar,
      title: undefined,
      text: db.text || undefined,
      image: db.image || undefined,
      likes: db.likes || 0,
      timestamp: rawTime,
      isLiked: db.is_liked || false,
      isDownvoted: db.is_downvoted || false,
      comments: db.comments || [],
      moderatedBy: db.moderated_by || undefined,
      isApproved: db.is_approved === null ? undefined : db.is_approved,
      postFormat: db.post_format || undefined,
      topicScores: [],
      attentionScore: db.attention_score || 0,
      boostedUsers: db.boosted_users || [],
      quietReactions: { saved: 0, returned: 0, continued: 0 }
    };
  }

  private mapPostToDb(post: FeedPost): any {
    let rawCreatedAt: string;
    if (post.timestamp && post.timestamp !== 'только что' && !isNaN(Date.parse(post.timestamp))) {
      rawCreatedAt = new Date(post.timestamp).toISOString();
    } else {
      rawCreatedAt = new Date().toISOString();
    }

    const sanitizedComments = (post.comments || []).map(c => {
      let cTime = c.timestamp;
      if (!cTime || cTime === 'только что' || isNaN(Date.parse(cTime))) {
        cTime = new Date().toISOString();
      } else {
        cTime = new Date(cTime).toISOString();
      }
      return {
        ...c,
        timestamp: cTime
      };
    });

    return {
      id: post.id,
      author_name: post.authorName,
      author_avatar: post.authorAvatar,
      text: post.text || null,
      image: post.image || null,
      likes: post.likes || 0,
      is_approved: post.isApproved !== undefined ? post.isApproved : true,
      moderated_by: post.moderatedBy || null,
      post_format: post.postFormat || null,
      attention_score: post.attentionScore || 0,
      boosted_users: post.boostedUsers || [],
      comments: sanitizedComments,
      created_at: rawCreatedAt
    };
  }
}

// ==========================================
// 4. COMMENT REPOSITORY
// ==========================================
export class CommentRepositoryProvider {
  async insertComment(postId: string, comment: any): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await ensureProfileExists();
      const { data, error } = await supabase
        .from('posts')
        .select('comments')
        .eq('id', postId)
        .single();

      if (error) {
        console.error('[CommentRepository] Error reading post comments:', error);
        return;
      }

      const existingComments = data?.comments || [];
      const updatedComments = [...existingComments, comment];

      const { error: updateError } = await supabase
        .from('posts')
        .update({ comments: updatedComments })
        .eq('id', postId);

      if (updateError) {
        console.error('[CommentRepository] Error appending comment:', updateError);
        throw updateError;
      }
    } catch (e) {
      console.error('[CommentRepository] insertComment failed:', e);
    }
  }
}

// ==========================================
// 5. MESSAGE REPOSITORY
// ==========================================
export class MessageRepositoryProvider {
  async getAll(): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('messenger_messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[MessageRepository] Error loading messages:', error);
      return [];
    }
    return (data || []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderAvatar: m.sender_avatar,
      receiverId: m.receiver_id,
      text: m.text,
      timestamp: new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      unread: m.unread,
      supportTicketId: m.support_ticket_id
    }));
  }

  async insert(message: any): Promise<void> {
    if (!isSupabaseConfigured) return;
    
    let realSenderId = message.senderId;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const isStaff = profile && ['support', 'moderator', 'super_admin', 'staff', 'moderation'].includes(profile.role);
        if (!isStaff) {
          realSenderId = user.id;
        }
      }
    } catch (e) {
      console.warn('[MessageRepository] Failed to resolve auth context on message insert:', e);
    }

    const { error } = await supabase
      .from('messenger_messages')
      .insert({
        id: message.id,
        sender_id: realSenderId,
        sender_name: message.senderName,
        sender_avatar: message.senderAvatar,
        receiver_id: message.receiverId,
        text: message.text,
        unread: message.unread || false,
        support_ticket_id: message.supportTicketId || null,
        created_at: new Date().toISOString()
      });
    if (error) {
      console.error('[MessageRepository] Error inserting message:', error);
      throw error;
    }
  }

  async delete(msgId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('messenger_messages')
      .delete()
      .eq('id', msgId);
    if (error) {
      console.error('[MessageRepository] Error deleting message:', error);
      throw error;
    }
  }
}

// ==========================================
// 6. DIALOG REPOSITORY
// ==========================================
export class DialogRepositoryProvider {
  async getAll(): Promise<DialogComplaint[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('dialog_complaints')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DialogRepository] Error select dialogs:', error);
      handleSupabaseError(error, 'DialogRepository.getAll');
      return [];
    }
    return (data || []).map(d => this.mapDbToDialog(d));
  }

  async insert(dialog: DialogComplaint): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('dialog_complaints')
      .insert(this.mapDialogToDb(dialog));
    if (error) {
      console.error('[DialogRepository] Error insert dialog:', error);
      handleSupabaseError(error, 'DialogRepository.insert');
      throw error;
    }
  }

  async update(dialogId: string, updates: Partial<DialogComplaint>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const dbUpdates: any = {};
    if (updates.fullDialogueMessages !== undefined) dbUpdates.full_dialogue = updates.fullDialogueMessages;
    if (updates.hasCounterComplaint !== undefined) dbUpdates.has_counter_complaint = updates.hasCounterComplaint;
    if (updates.counterComplaintText !== undefined) dbUpdates.counter_complaint_text = updates.counterComplaintText;
    if (updates.aiAnalysis !== undefined) dbUpdates.ai_analysis = updates.aiAnalysis;

    const { error } = await supabase
      .from('dialog_complaints')
      .update(dbUpdates)
      .eq('id', dialogId);
    if (error) {
      console.error('[DialogRepository] Error update dialog:', error);
      handleSupabaseError(error, 'DialogRepository.update');
      throw error;
    }
  }

  async softDelete(dialogId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('dialog_complaints')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', dialogId);
    if (error) {
      console.error('[DialogRepository] Error softDelete dialog:', error);
      handleSupabaseError(error, 'DialogRepository.softDelete');
      throw error;
    }
  }

  private mapDbToDialog(db: any): DialogComplaint {
    return {
      id: db.id,
      offenderId: undefined as any,
      offenderName: undefined as any,
      offenderAvatar: undefined as any,
      offenderTrust: 0,
      offenderRisk: 0,
      violationType: undefined as any,
      source: undefined as any,
      reporterId: undefined as any,
      reporterName: undefined as any,
      reporterAvatar: undefined as any,
      participants: {} as any,
      previewMessages: [],
      contextBeforeMessages: db.context_before || [],
      contextAfterMessages: db.context_after || [],
      fullDialogueMessages: db.full_dialogue || [],
      aiAnalysis: db.ai_analysis || {},
      violationHistory: {} as any,
      hasCounterComplaint: db.has_counter_complaint || false,
      counterComplaintText: db.counter_complaint_text
    };
  }

  private mapDialogToDb(d: DialogComplaint): any {
    return {
      id: d.id,
      context_before: d.contextBeforeMessages,
      context_after: d.contextAfterMessages,
      full_dialogue: d.fullDialogueMessages,
      ai_analysis: d.aiAnalysis,
      has_counter_complaint: d.hasCounterComplaint,
      counter_complaint_text: d.counterComplaintText,
      created_at: new Date().toISOString()
    };
  }
}

// ==========================================
// 7. MODERATION REPOSITORY
// ==========================================
export class ModerationRepositoryProvider {
  async getActions(): Promise<ModeratorAction[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('moderation_actions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ModerationRepository] Error loading logs:', error);
        return [];
      }

      return (data || []).map(a => ({
        id: a.id,
        type: a.type as any,
        action: a.action,
        targetId: a.target_id || undefined,
        targetName: a.target_name || undefined,
        message: a.message,
        operatorId: a.operator_id,
        operatorName: a.operator_name,
        timestamp: new Date(a.created_at)
      }));
    } catch (e) {
      console.error('[ModerationRepository] getActions failed:', e);
      return [];
    }
  }

  async insertAction(action: ModeratorAction | any): Promise<void> {
    if (!isSupabaseConfigured) return;
    const itemAction = action.action || 'block';
    const targetId = action.targetId || '';
    const targetName = action.targetName || '';
    const result = action.result || '';
    const complaintId = action.complaintId || '';
    
    // Formulate a clean description of the action being executed
    const message = action.message || `Действие: ${itemAction} по отношению к ${targetName} (${targetId}). ${result ? `Результат: ${result}.` : ''} ${complaintId ? `Связано с жалобой #${complaintId}` : ''}`;
    
    const payload = {
      id: action.id || `act-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      type: action.type || 'moderation',
      action: itemAction,
      target_id: targetId || null,
      target_name: targetName || null,
      message: message,
      operator_id: action.operatorId || 'system',
      operator_name: action.operatorName || 'Система',
      created_at: action.timestamp ? (action.timestamp instanceof Date ? action.timestamp.toISOString() : new Date(action.timestamp).toISOString()) : new Date().toISOString()
    };
    try {
      const { data, error } = await supabase
        .from('moderation_actions')
        .insert(payload)
        .select();

      console.log('[DB]', 'moderation_actions', payload, data, error);

      if (error) {
        console.error('[ModerationRepository] Error saving logged action:', error);
        throw error;
      }
    } catch (e) {
      console.error('[ModerationRepository] insertAction failed:', e);
      throw e;
    }
  }
}

// ==========================================
// 8. REPORT REPOSITORY
// ==========================================
export class ReportRepositoryProvider {
  async getAll(): Promise<Complaint[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[ReportRepository] Error fetching complaints:', error);
      return [];
    }
    return (data || []).map(c => this.mapDbToComplaint(c));
  }

  async insert(complaint: Complaint): Promise<Complaint> {
    if (!isSupabaseConfigured) return complaint;
    const payload = this.mapComplaintToDb(complaint);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .insert(payload)
        .select()
        .single();

      console.log('[DB]', 'complaints', payload, data, error);

      if (error) {
        if (error.code === '42703') {
          console.warn('[ReportRepository] Missing columns, retrying with fallback payload...');
          const fallbackPayload = { ...payload };
          delete fallbackPayload.target_id;
          delete fallbackPayload.target_type;
          delete fallbackPayload.target_status;
          delete fallbackPayload.resolution;
          delete fallbackPayload.resolution_comment;
          delete fallbackPayload.resolved_at;
          delete fallbackPayload.moderation_action_id;
          
          if (payload.target_id) {
            fallbackPayload.content = `${payload.content || ''} [TargetID: ${payload.target_id}]`.trim();
          }
          
          const { data: retryData, error: retryError } = await supabase
            .from('complaints')
            .insert(fallbackPayload)
            .select()
            .single();
            
          if (retryError) {
            console.error('[ReportRepository] Fallback insert failed:', retryError);
            throw retryError;
          }
          return this.mapDbToComplaint(retryData);
        }
        console.error('[ReportRepository] Error insert complaint:', error);
        throw error;
      }
      return this.mapDbToComplaint(data);
    } catch (err: any) {
      if (err.code === '42703') {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.target_id;
        delete fallbackPayload.target_type;
        delete fallbackPayload.target_status;
        delete fallbackPayload.resolution;
        delete fallbackPayload.resolution_comment;
        delete fallbackPayload.resolved_at;
        delete fallbackPayload.moderation_action_id;
        
        if (payload.target_id) {
          fallbackPayload.content = `${payload.content || ''} [TargetID: ${payload.target_id}]`.trim();
        }
        
        const { data: retryData, error: retryError } = await supabase
          .from('complaints')
          .insert(fallbackPayload)
          .select()
          .single();
          
        if (retryError) {
          throw retryError;
        }
        return this.mapDbToComplaint(retryData);
      }
      throw err;
    }
  }

  async update(complaintId: string, updates: Partial<Complaint>): Promise<void> {
    if (!isSupabaseConfigured) return;
    const dbUpdates: any = {};
    if (updates.moderatedBy !== undefined) dbUpdates.moderated_by = updates.moderatedBy;
    if (updates.reason !== undefined) dbUpdates.reason = updates.reason;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    // Added support for tracking / resolution fields in update
    if (updates.target_type !== undefined) dbUpdates.target_type = updates.target_type;
    if (updates.target_status !== undefined) dbUpdates.target_status = updates.target_status;
    if (updates.resolution !== undefined) dbUpdates.resolution = updates.resolution;
    if (updates.resolution_comment !== undefined) dbUpdates.resolution_comment = updates.resolution_comment;
    if (updates.resolved_at !== undefined) dbUpdates.resolved_at = updates.resolved_at;
    if (updates.moderation_action_id !== undefined) dbUpdates.moderation_action_id = updates.moderation_action_id;

    try {
      const { data, error } = await supabase
        .from('complaints')
        .update(dbUpdates)
        .eq('id', complaintId)
        .select();

      console.log('[DB]', 'complaints update', { complaintId, ...dbUpdates }, data, error);

      if (error) {
        if (error.code === '42703') {
          console.warn('[ReportRepository] Missing columns during update, retrying with fallback...');
          const fallbackUpdates = { ...dbUpdates };
          delete fallbackUpdates.target_type;
          delete fallbackUpdates.target_status;
          delete fallbackUpdates.resolution;
          delete fallbackUpdates.resolution_comment;
          delete fallbackUpdates.resolved_at;
          delete fallbackUpdates.moderation_action_id;
          
          const { error: retryError } = await supabase
            .from('complaints')
            .update(fallbackUpdates)
            .eq('id', complaintId);
            
          if (retryError) {
            console.error('[ReportRepository] Fallback update failed:', retryError);
            throw retryError;
          }
          return;
        }
        console.error('[ReportRepository] Error update complaint:', error);
        throw error;
      }
    } catch (err: any) {
      if (err.code === '42703') {
        const fallbackUpdates = { ...dbUpdates };
        delete fallbackUpdates.target_type;
        delete fallbackUpdates.target_status;
        delete fallbackUpdates.resolution;
        delete fallbackUpdates.resolution_comment;
        delete fallbackUpdates.resolved_at;
        delete fallbackUpdates.moderation_action_id;
        
        const { error: retryError } = await supabase
          .from('complaints')
          .update(fallbackUpdates)
          .eq('id', complaintId);
          
        if (retryError) {
          throw retryError;
        }
        return;
      }
      throw err;
    }
  }

  async softDelete(complaintId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from('complaints')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', complaintId)
      .select();

    console.log('[DB]', 'complaints', { complaintId, deleted_at: 'now()' }, data, error);

    if (error) {
      console.error('[ReportRepository] Error softDelete complaint:', error);
      throw error;
    }
  }

  private mapDbToComplaint(db: any): Complaint {
    let targetId = db.target_id || undefined;
    if (!targetId && db.content) {
      const match = db.content.match(/\[TargetID:\s*([a-zA-Z0-9_-]+)\]/);
      if (match) {
        targetId = match[1];
      }
    }

    return {
      id: db.id,
      userId: db.user_id,
      userName: db.user_name,
      userAvatar: db.user_avatar,
      type: db.type,
      content: db.content,
      rating: db.rating,
      image: db.image,
      reason: db.reason,
      dept: db.dept,
      timestamp: db.created_at ? new Date(db.created_at) : undefined,
      moderatedBy: db.moderated_by,
      targetId: targetId,
      targetName: db.target_name || undefined,
      status: db.status || 'pending',
      // Added fields mapping
      target_type: db.target_type || undefined,
      target_status: db.target_status || undefined,
      resolution: db.resolution || undefined,
      resolution_comment: db.resolution_comment || undefined,
      resolved_at: db.resolved_at || undefined,
      moderation_action_id: db.moderation_action_id || undefined,
      created_at: db.created_at || undefined
    };
  }

  private mapComplaintToDb(c: Complaint): any {
    return {
      id: c.id,
      user_id: c.userId,
      user_name: c.userName,
      user_avatar: c.userAvatar,
      type: c.type,
      content: c.content || '',
      rating: c.rating || '0.5',
      image: c.image || null,
      reason: c.reason || null,
      dept: c.dept || null,
      moderated_by: c.moderatedBy || null,
      target_id: c.targetId || null,
      target_name: c.targetName || null,
      status: c.status || 'pending',
      created_at: c.created_at || (c.timestamp ? c.timestamp.toISOString() : new Date().toISOString()),
      // Added fields mapping
      target_type: c.target_type || null,
      target_status: c.target_status || null,
      resolution: c.resolution || null,
      resolution_comment: c.resolution_comment || null,
      resolved_at: c.resolved_at || null,
      moderation_action_id: c.moderation_action_id || null
    };
  }
}

// ==========================================
// 9. NOTIFICATION REPOSITORY
// ==========================================
export class NotificationRepositoryProvider {
  async getAll(userId: string): Promise<PlatformNotification[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[NotificationRepository] Error loading notifications:', error);
        return [];
      }

      return (data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        timestamp: n.created_at,
        payload: n.payload || {}
      }));
    } catch (e) {
      console.error('[NotificationRepository] getAll failed:', e);
      return [];
    }
  }

  async insert(userId: string, targetId: string, notification: PlatformNotification): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await ensureProfileExists();
      const { error } = await supabase
        .from('notifications')
        .insert({
          id: notification.id,
          user_id: userId,
          title: notification.title,
          message: notification.message,
          payload: notification.payload || {},
          is_read: notification.isRead || false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('[NotificationRepository] Error inserting notification:', error);
        throw error;
      }
    } catch (e) {
      console.error('[NotificationRepository] insert failed:', e);
    }
  }

  async markRead(notificationId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('[NotificationRepository] Error marking read:', error);
        throw error;
      }
    } catch (e) {
      console.error('[NotificationRepository] markRead failed:', e);
    }
  }
}

// ==========================================
// 10. ALERT REPOSITORY
// ==========================================
export class AlertRepositoryProvider {
  async getAll(): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AlertRepository] Error loading alerts:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('[AlertRepository] getAll failed:', e);
      return [];
    }
  }

  async insert(alert: any): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('alerts')
        .insert({
          id: alert.id,
          title: alert.title,
          text: alert.text,
          tag: alert.tag || 'Инфо',
          created_at: alert.timestamp || new Date().toISOString()
        });

      if (error) {
        console.error('[AlertRepository] Error saving alert:', error);
        throw error;
      }
    } catch (e) {
      console.error('[AlertRepository] insert failed:', e);
    }
  }
}

// ==========================================
// 11. TICKET REPOSITORY
// ==========================================
export class TicketRepositoryProvider {
  async getAll(userId?: string, isAdmin?: boolean): Promise<Ticket[]> {
    if (!isSupabaseConfigured) return [];
    try {
      let query = supabase.from('support_tickets').select('*');
      if (userId && !isAdmin) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('[TicketRepository] Error loading tickets:', error);
        return [];
      }
      return (data || []).map(t => this.mapDbToTicket(t));
    } catch (e) {
      console.error('[TicketRepository] getAll failed:', e);
      return [];
    }
  }

  async insertTicket(ticket: Ticket): Promise<Ticket> {
    if (!isSupabaseConfigured) return ticket;
    try {
      const dbTicket = this.mapTicketToDb(ticket);
      const { data, error } = await supabase
        .from('support_tickets')
        .insert(dbTicket)
        .select()
        .single();

      if (error) {
        console.error('[TicketRepository] Error inserting ticket:', error);
        throw error;
      }
      return this.mapDbToTicket(data);
    } catch (e) {
      console.error('[TicketRepository] insertTicket failed:', e);
      return ticket;
    }
  }

  async updateTicket(ticketId: string, updates: Partial<Ticket>): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const dbUpdates: any = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.messages !== undefined) dbUpdates.messages = updates.messages;
      if (updates.urgency !== undefined) dbUpdates.urgency = updates.urgency;
      if (updates.category !== undefined) dbUpdates.category = updates.category;

      const { error } = await supabase
        .from('support_tickets')
        .update(dbUpdates)
        .eq('id', ticketId);

      if (error) {
        console.error('[TicketRepository] Error updating ticket:', error);
        throw error;
      }
    } catch (e) {
      console.error('[TicketRepository] updateTicket failed:', e);
    }
  }

  async addMessage(ticketId: string, message: any): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('messages')
        .eq('id', ticketId)
        .single();

      if (error) {
        console.error('[TicketRepository] Error reading ticket messages:', error);
        return;
      }

      const existingMessages = data?.messages || [];
      const updatedMessages = [...existingMessages, message];

      await this.updateTicket(ticketId, { messages: updatedMessages, status: 'answered' });
    } catch (e) {
      console.error('[TicketRepository] addMessage failed:', e);
    }
  }

  private mapDbToTicket(db: any): Ticket {
    return {
      id: db.id,
      userId: db.user_id,
      userName: db.user_name,
      userAvatar: db.user_avatar,
      title: db.title,
      status: db.status || 'new',
      messages: db.messages || [],
      urgency: db.urgency || 'low',
      category: db.category || 'Общие вопросы',
      source: db.source || 'form',
      serviceProfileId: db.service_profile_id || undefined,
      serviceProfileName: db.service_profile_name || undefined,
      serviceProfileAvatar: db.service_profile_avatar || undefined
    };
  }

  private mapTicketToDb(ticket: Ticket): any {
    return {
      id: ticket.id,
      user_id: ticket.userId,
      user_name: ticket.userName,
      user_avatar: ticket.userAvatar,
      title: ticket.title,
      status: ticket.status || 'new',
      messages: ticket.messages || [],
      urgency: ticket.urgency || 'low',
      category: ticket.category || 'Общие вопросы',
      source: ticket.source || 'form',
      service_profile_id: ticket.serviceProfileId || null,
      service_profile_name: ticket.serviceProfileName || null,
      service_profile_avatar: ticket.serviceProfileAvatar || null,
      created_at: new Date().toISOString()
    };
  }
}

// ==========================================
// 12. TRANSFER REPOSITORY
// ==========================================
export class TransferRepositoryProvider {
  async getAll(): Promise<CoinsTransfer[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[TransferRepository] select trans fails:', error);
      return [];
    }
    return (data || []).map(t => ({
      id: t.id,
      senderId: t.sender_id,
      senderName: t.sender_name,
      receiverId: t.receiver_id,
      receiverName: t.receiver_name,
      amount: Number(t.amount),
      message: t.message,
      timestamp: t.created_at
    }));
  }

  async insert(transfer: CoinsTransfer): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('transfers')
      .insert({
        sender_id: transfer.senderId,
        sender_name: transfer.senderName,
        receiver_id: transfer.receiverId,
        receiver_name: transfer.receiverName,
        amount: transfer.amount,
        message: transfer.message || '',
        created_at: new Date().toISOString()
      });
    if (error) {
      console.error('[TransferRepository] insert fails:', error);
      throw error;
    }
  }
}

// ==========================================
// 13. ONBOARDING REPOSITORY
// ==========================================
export class OnboardingRepositoryProvider {
  async completeOnboarding(userId: string, interests: string[]): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          public_settings: { interests }
        })
        .eq('id', userId);

      if (error) {
        console.error('[OnboardingRepository] Error completing onboarding:', error);
        throw error;
      }
    } catch (e) {
      console.error('[OnboardingRepository] completeOnboarding failed:', e);
    }
  }
}

// ==========================================
// 14. SETTINGS REPOSITORY
// ==========================================
export class SettingsRepositoryProvider {
  async getSettings(userId: string): Promise<any> {
    if (!isSupabaseConfigured) return {};
    const { data, error } = await supabase
      .from('profiles')
      .select('public_settings')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('[SettingsRepository] select fails:', error);
      return {};
    }
    return data?.public_settings || {};
  }

  async updateSettings(userId: string, settings: any): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('profiles')
      .update({ public_settings: settings })
      .eq('id', userId);
    if (error) {
      console.error('[SettingsRepository] update fails:', error);
      throw error;
    }
  }
}

// ==========================================
// 15. HISTORY REPOSITORY
// ==========================================
export class HistoryRepositoryProvider {
  async getLogs(): Promise<SecurityEventLog[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[HistoryRepository] select logs fails:', error);
      return [];
    }
    return (data || []).map(l => ({
      id: l.id,
      event: l.event,
      ip: l.ip,
      userName: l.user_name,
      status: l.status,
      device: l.device,
      time: new Date(l.created_at).toLocaleTimeString('ru-RU')
    }));
  }

  async insertLog(log: SecurityEventLog): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('security_logs')
      .insert({
        id: log.id || `security-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        event: log.event,
        ip: log.ip || '127.0.0.1',
        user_name: log.userName || 'Unknown',
        status: log.status || 'success',
        device: log.device || 'Admin Panel',
        created_at: new Date().toISOString()
      });
    if (error) {
      console.error('[HistoryRepository] insert log fails:', error);
      throw error;
    }
  }
}

// ==========================================
// 16. SEARCH REPOSITORY
// ==========================================
export class SearchRepositoryProvider {
  async getSearches(userId: string): Promise<string[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('search_history')
      .select('query')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[SearchRepository] select search fails:', error);
      return [];
    }
    return (data || []).map(s => s.query);
  }

  async insertSearch(userId: string, query: string, source: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        query: query,
        source: source,
        created_at: new Date().toISOString()
      });
    if (error) {
      console.error('[SearchRepository] insert search fails:', error);
      throw error;
    }
  }
}

// ==========================================
// 17. REACTION REPOSITORY
// ==========================================
export class ReactionRepositoryProvider {
  async getForPost(postId: string): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('reactions')
      .select('*')
      .eq('post_id', postId);
    if (error) {
      console.error('[ReactionRepository] getForPost failed:', error);
      return [];
    }
    return data || [];
  }

  async getAllReactions(): Promise<any[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase
      .from('reactions')
      .select('*');
    if (error) {
      console.error('[ReactionRepository] getAllReactions failed:', error);
      return [];
    }
    return data || [];
  }

  async toggle(postId: string, userId: string, type: 'like' | 'downvote'): Promise<void> {
    if (!isSupabaseConfigured) return;
    await ensureProfileExists();
    
    const id = `${userId}-${postId}`;
    const { data: existing, error: getError } = await supabase
      .from('reactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (existing) {
      if (existing.type === type) {
        await this.remove(postId, userId);
      } else {
        const { error } = await supabase
          .from('reactions')
          .upsert({
            id,
            post_id: postId,
            user_id: userId,
            type: type,
            created_at: new Date().toISOString()
          }, { onConflict: 'id' });
        if (error) {
          console.error('[ReactionRepository] toggle update failed:', error);
          throw error;
        }
      }
    } else {
      const { error } = await supabase
        .from('reactions')
        .upsert({
          id,
          post_id: postId,
          user_id: userId,
          type: type,
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });
      if (error) {
        console.error('[ReactionRepository] toggle insert failed:', error);
        throw error;
      }
    }
  }

  async remove(postId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const id = `${userId}-${postId}`;
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[ReactionRepository] remove failed:', error);
      throw error;
    }
  }
}

// Instantiations
export const profileRepository = new ProfileRepositoryProvider();
export const feedRepository = new FeedRepositoryProvider();
export const postRepository = new PostRepositoryProvider();
export const commentRepository = new CommentRepositoryProvider();
export const messageRepository = new MessageRepositoryProvider();
export const dialogRepository = new DialogRepositoryProvider();
export const moderationRepository = new ModerationRepositoryProvider();
export const reportRepository = new ReportRepositoryProvider();
export const notificationRepository = new NotificationRepositoryProvider();
export const alertRepository = new AlertRepositoryProvider();
export const ticketRepository = new TicketRepositoryProvider();
export const transferRepository = new TransferRepositoryProvider();
export const onboardingRepository = new OnboardingRepositoryProvider();
export const settingsRepository = new SettingsRepositoryProvider();
export const historyRepository = new HistoryRepositoryProvider();
export const searchRepository = new SearchRepositoryProvider();
export const reactionRepository = new ReactionRepositoryProvider();
