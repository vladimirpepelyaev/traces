import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeCallback = (payload: any) => void;

class RealtimeServiceProvider {
  private channels: RealtimeChannel[] = [];
  private fallbackChannel: BroadcastChannel | null = null;
  private postCallbacks: RealtimeCallback[] = [];
  private alertCallbacks: RealtimeCallback[] = [];

  constructor() {
    // Implement standard BroadcastChannel for local development cross-tab sync when Supabase is not configured
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.fallbackChannel = new BroadcastChannel('sledy-realtime');
        this.fallbackChannel.onmessage = (event) => {
          const { type, data } = event.data;
          console.log(`[RealtimeService Fallback] Received event ${type}:`, data);
          if (type === 'POST_INSERT') {
            this.postCallbacks.forEach(cb => cb(data));
          } else if (type === 'ALERT_INSERT') {
            this.alertCallbacks.forEach(cb => cb(data));
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel is not supported in this frame environment:', e);
    }
  }

  /**
   * Subscribes to new post insertions.
   * Uses real Supabase Realtime with automatic reconnection if configured, or BroadcastChannel fallback.
   */
  subscribePosts(onInsert: (post: any) => void): RealtimeChannel | null {
    this.postCallbacks.push(onInsert);

    if (isSupabaseConfigured) {
      console.log('[RealtimeService] Subscribing to postgres_changes for table "posts"');
      
      const channel = supabase
        .channel('public:posts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'posts' },
          (payload) => {
            console.log('[RealtimeService] New post via Supabase:', payload.new);
            onInsert(payload.new);
          }
        )
        .subscribe((status, err) => {
          console.log(`[RealtimeService] post channel status: ${status}`);
          if (err) {
            console.error('[RealtimeService] post channel error:', err);
          }
          // Handle reconnection if channel drops / re-subscribes
          if (status === 'CLOSED') {
            setTimeout(() => {
              console.log('[RealtimeService] Reconnecting post channel...');
              channel.subscribe();
            }, 3000);
          }
        });

      this.channels.push(channel);
      return channel;
    }

    console.log('[RealtimeService] Supabase not active. Using BroadcastChannel fallback.');
    return null;
  }

  /**
   * Subscribes to new alerts/announcements insertions.
   * Uses real Supabase Realtime with automatic reconnection if configured, or BroadcastChannel fallback.
   */
  subscribeAlerts(onInsert: (alert: any) => void): RealtimeChannel | null {
    this.alertCallbacks.push(onInsert);

    if (isSupabaseConfigured) {
      console.log('[RealtimeService] Subscribing to postgres_changes for table "alerts" and "announcements"');

      // Listen to both tables just in case a user defines either 'alerts' or 'announcements'
      const channel = supabase
        .channel('public:alerts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload) => {
            console.log('[RealtimeService] New alert via Supabase:', payload.new);
            onInsert(payload.new);
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'announcements' },
          (payload) => {
            console.log('[RealtimeService] New announcement via Supabase:', payload.new);
            onInsert(payload.new);
          }
        )
        .subscribe((status, err) => {
          console.log(`[RealtimeService] alert channel status: ${status}`);
          if (err) {
            console.error('[RealtimeService] alert channel error:', err);
          }
          // Handle reconnection if channel drops / CLOSED
          if (status === 'CLOSED') {
            setTimeout(() => {
              console.log('[RealtimeService] Reconnecting alert channel...');
              channel.subscribe();
            }, 3000);
          }
        });

      this.channels.push(channel);
      return channel;
    }

    console.log('[RealtimeService] Supabase not active. Using BroadcastChannel fallback.');
    return null;
  }

  /**
   * Broadcasts a new post locally or to Supabase db.
   */
  async broadcastPost(post: any) {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('posts').insert([post]);
      } catch (err) {
        console.error('[RealtimeService] Failed to insert post to Supabase:', err);
      }
    }
    
    // Always trigger locally & broadcast for other clients
    if (this.fallbackChannel) {
      this.fallbackChannel.postMessage({ type: 'POST_INSERT', data: post });
    }
  }

  /**
   * Broadcasts a new alert locally or to Supabase db.
   */
  async broadcastAlert(alert: any) {
    if (isSupabaseConfigured) {
      try {
        // Try inserting to 'alerts' first
        const { error } = await supabase.from('alerts').insert([alert]);
        if (error) {
          // Fallback to 'announcements'
          await supabase.from('announcements').insert([alert]);
        }
      } catch (err) {
        console.error('[RealtimeService] Failed to insert alert to Supabase:', err);
      }
    }

    // Always trigger locally & broadcast for other clients
    if (this.fallbackChannel) {
      this.fallbackChannel.postMessage({ type: 'ALERT_INSERT', data: alert });
    }
  }

  /**
   * Unsubscribes from all active subscriptions.
   */
  unsubscribe() {
    console.log('[RealtimeService] Unsubscribing all channels...');
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels = [];
    this.postCallbacks = [];
    this.alertCallbacks = [];
  }
}

export const RealtimeService = new RealtimeServiceProvider();
