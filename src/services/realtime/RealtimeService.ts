import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeCallback = (payload: any) => void;

class RealtimeServiceProvider {
  private channels: RealtimeChannel[] = [];
  private fallbackChannel: BroadcastChannel | null = null;
  private postCallbacks: RealtimeCallback[] = [];
  private alertCallbacks: RealtimeCallback[] = [];
  private ticketCallbacks: RealtimeCallback[] = [];
  private notificationCallbacks: RealtimeCallback[] = [];

  constructor() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.fallbackChannel = new BroadcastChannel('sledy-realtime');
        this.fallbackChannel.onmessage = (event) => {
          const { type, data } = event.data;
          console.log(`[RealtimeService Fallback] Received event ${type}:`, data);
          if (type === 'POST_CHANGE') {
            this.postCallbacks.forEach(cb => cb(data));
          } else if (type === 'ALERT_INSERT') {
            this.alertCallbacks.forEach(cb => cb(data));
          } else if (type === 'TICKET_CHANGE') {
            this.ticketCallbacks.forEach(cb => cb(data));
          } else if (type === 'NOTIFICATION_INSERT') {
            this.notificationCallbacks.forEach(cb => cb(data));
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel is not supported in this frame environment:', e);
    }
  }

  /**
   * Subscribes to posts inserts and updates (likes, comments, etc.).
   */
  subscribePosts(onChanges: (post: any) => void): RealtimeChannel | null {
    this.postCallbacks.push(onChanges);

    if (isSupabaseConfigured) {
      console.log('[RealtimeService] Subscribing to postgres_changes for table "posts"');
      
      const channel = supabase
        .channel('public:posts')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'posts' },
          (payload) => {
            console.log('[RealtimeService] Post change via Supabase:', payload.eventType, payload.new);
            onChanges(payload.new);
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error('[RealtimeService] post channel error:', err);
          }
        });

      this.channels.push(channel);
      return channel;
    }

    return null;
  }

  /**
   * Subscribes to alert/announcements insertions.
   */
  subscribeAlerts(onInsert: (alert: any) => void): RealtimeChannel | null {
    this.alertCallbacks.push(onInsert);

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('public:alerts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload) => {
            onInsert(payload.new);
          }
        )
        .subscribe();

      this.channels.push(channel);
      return channel;
    }

    return null;
  }

  /**
   * Subscribes to ticketing updates.
   */
  subscribeTickets(onChanges: (ticket: any) => void): RealtimeChannel | null {
    this.ticketCallbacks.push(onChanges);

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('public:support_tickets')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'support_tickets' },
          (payload) => {
            onChanges(payload.new);
          }
        )
        .subscribe();

      this.channels.push(channel);
      return channel;
    }

    return null;
  }

  /**
   * Subscribes to user notifications.
   */
  subscribeNotifications(onInsert: (notification: any) => void): RealtimeChannel | null {
    this.notificationCallbacks.push(onInsert);

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            onInsert(payload.new);
          }
        )
        .subscribe();

      this.channels.push(channel);
      return channel;
    }

    return null;
  }

  /**
   * Broadcasts a post change locally and on DB.
   */
  async broadcastPost(post: any) {
    if (this.fallbackChannel) {
      this.fallbackChannel.postMessage({ type: 'POST_CHANGE', data: post });
    }
  }

  /**
   * Broadcasts a new alert/announcement.
   */
  async broadcastAlert(alert: any) {
    if (this.fallbackChannel) {
      this.fallbackChannel.postMessage({ type: 'ALERT_INSERT', data: alert });
    }
  }

  /**
   * Broadcasts support ticket changes.
   */
  async broadcastTicket(ticket: any) {
    if (this.fallbackChannel) {
      this.fallbackChannel.postMessage({ type: 'TICKET_CHANGE', data: ticket });
    }
  }

  /**
   * Broadcasts a notification.
   */
  async broadcastNotification(notification: any) {
    if (this.fallbackChannel) {
      this.fallbackChannel.postMessage({ type: 'NOTIFICATION_INSERT', data: notification });
    }
  }

  /**
   * Unsubscribes from all active subscriptions.
   */
  unsubscribe() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels = [];
    this.postCallbacks = [];
    this.alertCallbacks = [];
    this.ticketCallbacks = [];
    this.notificationCallbacks = [];
  }
}

export const RealtimeService = new RealtimeServiceProvider();
