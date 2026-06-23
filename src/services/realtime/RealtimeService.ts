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
   * Helper that checks for existing channels in our registry or on the Supabase client,
   * removes duplicates to prevent "cannot add postgres_changes callbacks after subscribe()",
   * and creates a clean channel.
   */
  private safeCreateChannel(name: string): RealtimeChannel | null {
    if (!isSupabaseConfigured) return null;
    try {
      // Clean up from our channels array
      const idx = this.channels.findIndex(ch => ch.topic === name || ch.topic === `realtime:${name}` || (ch as any).name === name);
      if (idx !== -1) {
        const oldChannel = this.channels[idx];
        this.channels.splice(idx, 1);
        try {
          supabase.removeChannel(oldChannel);
        } catch (_) {}
      }
      
      // Clean up matching channel directly from the active Supabase client list
      const dup = supabase.getChannels().find(ch => ch.topic === name || (ch as any).name === name);
      if (dup) {
        try {
          supabase.removeChannel(dup);
        } catch (_) {}
      }
    } catch (err) {
      console.warn(`[RealtimeService] safeCreateChannel cleanup warning:`, err);
    }
    return supabase.channel(name);
  }

  /**
   * Subscribes to posts inserts and updates (likes, comments, etc.).
   */
  subscribePosts(onChanges: (post: any) => void): RealtimeChannel | null {
    if (!this.postCallbacks.includes(onChanges)) {
      this.postCallbacks.push(onChanges);
    }

    if (isSupabaseConfigured) {
      try {
        console.log('[RealtimeService] Subscribing to postgres_changes for table "posts"');
        
        const channel = this.safeCreateChannel('public:posts');
        if (!channel) return null;

        channel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'posts' },
            (payload) => {
              try {
                if (payload.new) {
                  console.log('[RealtimeService] Post change via Supabase:', payload.eventType, payload.new);
                  onChanges(payload.new);
                }
              } catch (cbErr) {
                console.error('[RealtimeService] Error executing post callback:', cbErr);
              }
            }
          )
          .subscribe((status, err) => {
            if (err) {
              console.warn('[RealtimeService] post channel error:', err);
            }
          });

        this.channels.push(channel);
        return channel;
      } catch (err) {
        console.warn('[RealtimeService] Failed to subscribe to posts stream:', err);
      }
    }

    return null;
  }

  /**
   * Subscribes to alert/announcements insertions.
   */
  subscribeAlerts(onInsert: (alert: any) => void): RealtimeChannel | null {
    if (!this.alertCallbacks.includes(onInsert)) {
      this.alertCallbacks.push(onInsert);
    }

    if (isSupabaseConfigured) {
      try {
        const channel = this.safeCreateChannel('public:alerts');
        if (!channel) return null;

        channel
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'alerts' },
            (payload) => {
              try {
                if (payload.new) {
                  onInsert(payload.new);
                }
              } catch (cbErr) {
                console.error('[RealtimeService] Error executing alerts callback:', cbErr);
              }
            }
          )
          .subscribe((_status, err) => {
            if (err) {
              console.warn('[RealtimeService] Alerts subscribe warning:', err);
            }
          });

        this.channels.push(channel);
        return channel;
      } catch (err) {
        console.warn('[RealtimeService] Failed to subscribe to alerts stream:', err);
      }
    }

    return null;
  }

  /**
   * Subscribes to ticketing updates.
   */
  subscribeTickets(onChanges: (ticket: any) => void): RealtimeChannel | null {
    if (!this.ticketCallbacks.includes(onChanges)) {
      this.ticketCallbacks.push(onChanges);
    }

    if (isSupabaseConfigured) {
      try {
        const channel = this.safeCreateChannel('public:support_tickets');
        if (!channel) return null;

        channel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'support_tickets' },
            (payload) => {
              try {
                if (payload.new) {
                  onChanges(payload.new);
                }
              } catch (cbErr) {
                console.error('[RealtimeService] Error executing tickets callback:', cbErr);
              }
            }
          )
          .subscribe((_status, err) => {
            if (err) {
              console.warn('[RealtimeService] Tickets subscribe warning:', err);
            }
          });

        this.channels.push(channel);
        return channel;
      } catch (err) {
        console.warn('[RealtimeService] Failed to subscribe to tickets stream:', err);
      }
    }

    return null;
  }

  /**
   * Subscribes to user notifications.
   */
  subscribeNotifications(onInsert: (notification: any) => void): RealtimeChannel | null {
    if (!this.notificationCallbacks.includes(onInsert)) {
      this.notificationCallbacks.push(onInsert);
    }

    if (isSupabaseConfigured) {
      try {
        const channel = this.safeCreateChannel('public:notifications');
        if (!channel) return null;

        channel
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications' },
            (payload) => {
              try {
                if (payload.new) {
                  onInsert(payload.new);
                }
              } catch (cbErr) {
                console.error('[RealtimeService] Error executing notifications callback:', cbErr);
              }
            }
          )
          .subscribe((_status, err) => {
            if (err) {
              console.warn('[RealtimeService] Notifications subscribe warning:', err);
            }
          });

        this.channels.push(channel);
        return channel;
      } catch (err) {
        console.warn('[RealtimeService] Failed to subscribe to notifications stream:', err);
      }
    }

    return null;
  }

  /**
   * Subscribes to messenger messages.
   */
  subscribeMessengerMessages(onInsert: (message: any) => void): RealtimeChannel | null {
    if (isSupabaseConfigured) {
      try {
        const channel = this.safeCreateChannel('public:messenger_messages');
        if (!channel) return null;

        channel
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messenger_messages' },
            (payload) => {
              try {
                if (payload.new) {
                  onInsert(payload.new);
                }
              } catch (cbErr) {
                console.error('[RealtimeService] Error executing messenger callback:', cbErr);
              }
            }
          )
          .subscribe((_status, err) => {
            if (err) {
              console.warn('[RealtimeService] Messenger messages subscribe warning:', err);
            }
          });

        this.channels.push(channel);
        return channel;
      } catch (err) {
        console.warn('[RealtimeService] Failed to subscribe to messenger_messages stream:', err);
      }
    }
    return null;
  }

  /**
   * Subscribes to reactions changes (likes, dislikes).
   */
  subscribeReactions(onChanges: (reaction: any) => void): RealtimeChannel | null {
    if (isSupabaseConfigured) {
      try {
        const channel = this.safeCreateChannel('public:reactions');
        if (!channel) return null;

        channel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reactions' },
            (payload) => {
              try {
                if (payload.new) {
                  onChanges(payload.new);
                }
              } catch (cbErr) {
                console.error('[RealtimeService] Error executing reactions callback:', cbErr);
              }
            }
          )
          .subscribe((_status, err) => {
            if (err) {
              console.warn('[RealtimeService] Reactions subscribe warning:', err);
            }
          });

        this.channels.push(channel);
        return channel;
      } catch (err) {
        console.warn('[RealtimeService] Failed to subscribe to reactions stream:', err);
      }
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
