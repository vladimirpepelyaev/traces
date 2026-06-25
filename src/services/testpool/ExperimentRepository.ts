import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { TestpoolExperiment, TestpoolAssignment, TestpoolEvent, ExperimentStatus } from '../../types';

// Ensure the UUID generator is robust
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Resilient helper to perform write operations (insert, update, upsert) with retry-upon-column-missing logic.
 */
async function safeSupabaseWrite(
  table: string,
  operation: 'insert' | 'update' | 'upsert',
  payload: any,
  queryModifier?: (query: any) => any
): Promise<any> {
  let currentPayload = { ...payload };
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    attempts++;
    let query = supabase.from(table);
    let opQuery: any;
    if (operation === 'insert') {
      opQuery = query.insert(currentPayload);
    } else if (operation === 'update') {
      opQuery = query.update(currentPayload);
    } else if (operation === 'upsert') {
      opQuery = query.upsert(currentPayload, { onConflict: 'experiment_id,user_id' });
    }

    if (queryModifier) {
      opQuery = queryModifier(opQuery);
    }

    const { data, error } = await opQuery.select().maybeSingle();

    if (!error) {
      return data;
    }

    console.error(`[safeSupabaseWrite] Error in table "${table}" attempt ${attempts}:`, error);

    const msg = error.message || '';
    const code = error.code || '';
    const status = error.status || 0;

    // Check if error is column does not exist (PGRST204 or containing "does not exist")
    if (code === 'PGRST204' || msg.includes('does not exist') || status === 204 || status === 400 || code === '42703') {
      // Try to find the column name from the message
      const match = msg.match(/column "?(\w+)"?/i) || msg.match(/column (?:.*?\.)?(\w+) does not exist/i);
      if (match && match[1]) {
        const col = match[1];
        console.warn(`[safeSupabaseWrite] Stripping missing column "${col}" from table "${table}"`);
        
        // Special mapping: if column is "title" on "testpool_experiments", copy to "name"
        if (col === 'title' && table === 'testpool_experiments') {
          currentPayload.name = currentPayload.title;
        }

        delete currentPayload[col];
        continue; // Retry with cleaned payload
      } else {
        // Fallback: strip common troublesome columns if they are in the payload
        if (table === 'testpool_assignments' && 'source' in currentPayload) {
          console.warn('[safeSupabaseWrite] Retrying assignments without "source"');
          delete currentPayload.source;
          continue;
        }
        if (table === 'testpool_experiments' && 'title' in currentPayload) {
          console.warn('[safeSupabaseWrite] Retrying experiments with "name" instead of "title"');
          currentPayload.name = currentPayload.title;
          delete currentPayload.title;
          continue;
        }
      }
    }

    // If it's a different error, throw it
    throw error;
  }

  throw new Error(`Failed after ${maxAttempts} attempts due to schema issues`);
}

const INITIAL_EXPERIMENTS_SEED: TestpoolExperiment[] = [
  {
    id: 'e16b9d62-7bfb-4fc7-bf94-bca54f0a2ba1',
    key: 'new_payment_flow',
    title: 'Новый платежный шлюз (СБП)',
    description: 'Тестирование интеграции с новым платежным эквайрингом СБП для снижения комиссий за транзакции.',
    status: 'partial',
    enabled: true,
    created_by: 'system',
    updated_by: 'system',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    rollout_percent: 15,
    include_new_users: false,
    released_at: null,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'e2a8c3d9-9f7a-42a1-bdc2-6c3e9a7e6b05',
    key: 'ai_comment_summarizer',
    title: 'Суммаризатор комментариев с AI',
    description: 'Автоматическая выжимка обсуждений и выделение ключевых мнений под популярными публикациями.',
    status: 'draft',
    enabled: false,
    created_by: 'system',
    updated_by: 'system',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    rollout_percent: 0,
    include_new_users: false,
    released_at: null,
    expires_at: null
  },
  {
    id: 'e3f0e8d5-1c3b-468a-bf9b-3e74b5c71d20',
    key: 'dark_theme_v2',
    title: 'Обновленная темная тема',
    description: 'Релиз новой контрастной темной темы с улучшенной разметкой для OLED дисплеев.',
    status: 'released',
    enabled: true,
    created_by: 'system',
    updated_by: 'system',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    rollout_percent: 100,
    include_new_users: true,
    released_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: null
  },
  {
    id: 'e4d8f5c1-2a6b-4cf7-8d9e-1b3c5a7e9f02',
    key: 'voice_messages_chat',
    title: 'Голосовые сообщения в чатах',
    description: 'Запись и отправка голосовых сообщений внутри приватных диалогов.',
    status: 'new_users',
    enabled: true,
    created_by: 'system',
    updated_by: 'system',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    rollout_percent: 0,
    include_new_users: true,
    released_at: null,
    expires_at: null
  },
  {
    id: 'e5e9d5f2-4b6a-4cf7-8d9e-1b3c5a7e9f05',
    key: 'profile_custom_colors_v1',
    title: 'Кастомные цвета профиля (v1)',
    description: 'Возможность настройки индивидуального цветового оформления профиля и постов.',
    status: 'draft',
    enabled: false,
    created_by: 'system',
    updated_by: 'system',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    rollout_percent: 0,
    include_new_users: false,
    released_at: null,
    expires_at: null,
    rollout_all: false,
    rollout_new_users: false
  }
];

export class ExperimentRepository {
  private useLocalStorage = false;
  private checkPromise: Promise<boolean> | null = null;

  constructor() {
    this.checkDatabaseAvailability();
  }

  /**
   * Safe check if Supabase tables exist and are accessible.
   */
  async checkDatabaseAvailability(): Promise<boolean> {
    if (this.checkPromise) return this.checkPromise;

    this.checkPromise = (async () => {
      if (!isSupabaseConfigured) {
        console.log('[Testpool Repository] Supabase is not configured. Falling back to LocalStorage.');
        this.useLocalStorage = true;
        this.initLocalStorage();
        return false;
      }

      try {
        const { error } = await supabase
          .from('testpool_experiments')
          .select('id')
          .limit(1);

        if (error) {
          // Code 42P01 means table does not exist
          if (error.code === '42P01' || (error as any).status === 404) {
            console.warn(
              '[Testpool Repository] Database tables do not exist in Supabase yet. ' +
              'Falling back to LocalStorage. Please apply `/supabase_migration_testpool.sql` to your Supabase SQL editor to enable database persistence.'
            );
          } else {
            console.error('[Testpool Repository] Supabase check returned error:', error);
          }
          this.useLocalStorage = true;
          this.initLocalStorage();
          return false;
        }

        console.log('[Testpool Repository] Supabase tables connected successfully.');
        this.useLocalStorage = false;
        return true;
      } catch (err) {
        console.error('[Testpool Repository] Failed connection to Supabase table:', err);
        this.useLocalStorage = true;
        this.initLocalStorage();
        return false;
      }
    })();

    return this.checkPromise;
  }

  private initLocalStorage() {
    if (!localStorage.getItem('testpool_experiments')) {
      localStorage.setItem('testpool_experiments', JSON.stringify(INITIAL_EXPERIMENTS_SEED));
    }
    if (!localStorage.getItem('testpool_assignments')) {
      localStorage.setItem('testpool_assignments', JSON.stringify([]));
    }
    if (!localStorage.getItem('testpool_events')) {
      localStorage.setItem('testpool_events', JSON.stringify([]));
    }
  }

  // --- EXPERIMENTS CRUD ---

  async getExperiments(): Promise<TestpoolExperiment[]> {
    await this.checkDatabaseAvailability();

    if (this.useLocalStorage) {
      const data = localStorage.getItem('testpool_experiments');
      return data ? JSON.parse(data) : [];
    }

    const { data, error } = await supabase
      .from('testpool_experiments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ExperimentRepository] getExperiments error:', error);
      return [];
    }

    return (data || []).map(row => ({
      ...row,
      title: row.title ?? (row as any).name ?? '',
      rollout_mode: row.rollout_mode ?? (row.rollout_percent === 100 ? 'released' : row.status),
      users_count: row.users_count ?? 0
    }));
  }

  async getExperimentByKey(key: string): Promise<TestpoolExperiment | null> {
    await this.checkDatabaseAvailability();

    if (this.useLocalStorage) {
      const experiments = await this.getExperiments();
      return experiments.find(e => e.key === key) || null;
    }

    const { data, error } = await supabase
      .from('testpool_experiments')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('[ExperimentRepository] getExperimentByKey error:', error);
      return null;
    }
    if (!data) return null;
    return {
      ...data,
      title: data.title ?? (data as any).name ?? '',
      rollout_mode: data.rollout_mode ?? (data.rollout_percent === 100 ? 'released' : data.status),
      users_count: data.users_count ?? 0
    };
  }

  async createExperiment(experiment: Partial<TestpoolExperiment>): Promise<TestpoolExperiment> {
    await this.checkDatabaseAvailability();

    const id = generateUUID();
    const newExperiment: any = {
      id,
      key: experiment.key || '',
      title: experiment.title || 'Новая функция',
      description: experiment.description || '',
      status: experiment.status || 'draft',
      enabled: experiment.enabled ?? false,
      created_by: experiment.created_by || 'unknown',
      updated_by: experiment.created_by || 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rollout_percent: experiment.rollout_percent ?? 0,
      include_new_users: experiment.include_new_users ?? false,
      released_at: experiment.released_at || null,
      expires_at: experiment.expires_at || null,
    };

    if (this.useLocalStorage) {
      const list = await this.getExperiments();
      list.push({ ...newExperiment, title: newExperiment.title });
      localStorage.setItem('testpool_experiments', JSON.stringify(list));
      return { ...newExperiment, title: newExperiment.title };
    }

    const data = await safeSupabaseWrite('testpool_experiments', 'insert', newExperiment);
    return {
      ...data,
      title: data.title ?? (data as any).name ?? '',
    };
  }

  async updateExperiment(id: string, updates: Partial<TestpoolExperiment>): Promise<TestpoolExperiment> {
    await this.checkDatabaseAvailability();

    // Strict PATCH-style updates: only update fields that were actually passed
    const cleanUpdates: any = {};
    if ('title' in updates) cleanUpdates.title = updates.title;
    if ('description' in updates) cleanUpdates.description = updates.description;
    if ('status' in updates) cleanUpdates.status = updates.status;
    if ('enabled' in updates) cleanUpdates.enabled = updates.enabled;
    if ('rollout_percent' in updates) cleanUpdates.rollout_percent = updates.rollout_percent;
    if ('include_new_users' in updates) cleanUpdates.include_new_users = updates.include_new_users;
    if ('released_at' in updates) cleanUpdates.released_at = updates.released_at;
    if ('expires_at' in updates) cleanUpdates.expires_at = updates.expires_at;
    if ('updated_by' in updates) cleanUpdates.updated_by = updates.updated_by;
    
    cleanUpdates.updated_at = new Date().toISOString();

    if (this.useLocalStorage) {
      const list = await this.getExperiments();
      const idx = list.findIndex(e => e.id === id);
      if (idx === -1) throw new Error('Experiment not found');
      
      const updated = { ...list[idx], ...cleanUpdates };
      list[idx] = updated;
      localStorage.setItem('testpool_experiments', JSON.stringify(list));
      return updated;
    }

    const data = await safeSupabaseWrite('testpool_experiments', 'update', cleanUpdates, (q) => q.eq('id', id));
    return {
      ...data,
      title: data.title ?? (data as any).name ?? '',
    };
  }

  async deleteExperiment(id: string): Promise<boolean> {
    await this.checkDatabaseAvailability();

    if (this.useLocalStorage) {
      const list = await this.getExperiments();
      const filtered = list.filter(e => e.id !== id);
      localStorage.setItem('testpool_experiments', JSON.stringify(filtered));

      // Cascade remove assignments
      const assignments = await this.getAllAssignments();
      const filteredAssignments = assignments.filter(a => a.experiment_id !== id);
      localStorage.setItem('testpool_assignments', JSON.stringify(filteredAssignments));
      return true;
    }

    const { error } = await supabase
      .from('testpool_experiments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ExperimentRepository] deleteExperiment error:', error);
      return false;
    }
    return true;
  }

  // --- ASSIGNMENTS CRUD ---

  private async getAllAssignments(): Promise<TestpoolAssignment[]> {
    if (this.useLocalStorage) {
      const data = localStorage.getItem('testpool_assignments');
      return data ? JSON.parse(data) : [];
    }
    const { data, error } = await supabase
      .from('testpool_assignments')
      .select('*');
    if (error) {
      console.error('[ExperimentRepository] getAllAssignments error:', error);
      return [];
    }
    return data || [];
  }

  async getAssignments(experimentId: string): Promise<TestpoolAssignment[]> {
    await this.checkDatabaseAvailability();

    if (this.useLocalStorage) {
      const list = await this.getAllAssignments();
      return list.filter(a => a.experiment_id === experimentId && !a.removed_at);
    }

    const { data, error } = await supabase
      .from('testpool_assignments')
      .select('*')
      .eq('experiment_id', experimentId)
      .is('removed_at', null);

    if (error) {
      console.error('[ExperimentRepository] getAssignments error:', error);
      return [];
    }
    
    return (data || []).map(row => ({
      ...row,
      source: row.source ?? 'manual',
      assigned_at: row.assigned_at ?? row.created_at ?? new Date().toISOString()
    }));
  }

  async addAssignment(assignment: Omit<TestpoolAssignment, 'id' | 'created_at'>): Promise<TestpoolAssignment> {
    await this.checkDatabaseAvailability();

    const newAssignment: TestpoolAssignment = {
      id: generateUUID(),
      experiment_id: assignment.experiment_id,
      user_id: assignment.user_id,
      source: assignment.source || 'manual',
      enabled: assignment.enabled ?? true,
      created_at: new Date().toISOString(),
      removed_at: null
    };

    if (this.useLocalStorage) {
      const list = await this.getAllAssignments();
      // Enforce unique (experiment_id, user_id)
      const filtered = list.filter(a => !(a.experiment_id === assignment.experiment_id && a.user_id === assignment.user_id));
      filtered.push(newAssignment);
      localStorage.setItem('testpool_assignments', JSON.stringify(filtered));
      return newAssignment;
    }

    const payload = {
      experiment_id: assignment.experiment_id,
      user_id: assignment.user_id,
      source: assignment.source || 'manual',
      enabled: assignment.enabled ?? true,
      removed_at: null
    };

    const data = await safeSupabaseWrite('testpool_assignments', 'upsert', payload);
    return {
      ...data,
      source: data.source ?? 'manual',
      assigned_at: data.assigned_at ?? data.created_at ?? new Date().toISOString()
    };
  }

  async removeAssignment(experimentId: string, userId: string): Promise<boolean> {
    await this.checkDatabaseAvailability();

    if (this.useLocalStorage) {
      const list = await this.getAllAssignments();
      const idx = list.findIndex(a => a.experiment_id === experimentId && a.user_id === userId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          removed_at: new Date().toISOString()
        };
        localStorage.setItem('testpool_assignments', JSON.stringify(list));
        return true;
      }
      return false;
    }

    // Instead of deleting, soft delete or remove
    const { error } = await supabase
      .from('testpool_assignments')
      .delete()
      .eq('experiment_id', experimentId)
      .eq('user_id', userId);

    if (error) {
      console.error('[ExperimentRepository] removeAssignment error:', error);
      return false;
    }
    return true;
  }

  // --- EVENTS LOGGING ---

  async getEvents(experimentId: string): Promise<TestpoolEvent[]> {
    await this.checkDatabaseAvailability();

    if (this.useLocalStorage) {
      const data = localStorage.getItem('testpool_events');
      const list: TestpoolEvent[] = data ? JSON.parse(data) : [];
      return list.filter(e => e.experiment_id === experimentId).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const { data, error } = await supabase
      .from('testpool_events')
      .select('*')
      .eq('experiment_id', experimentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ExperimentRepository] getEvents error:', error);
      return [];
    }
    return data || [];
  }

  async addEvent(event: any): Promise<any> {
    await this.checkDatabaseAvailability();

    const isUUID = (val: any): boolean => {
      return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    };

    const cleanUUID = (val: any): string | null => {
      return isUUID(val) ? val : null;
    };

    // Construct the full potential DB payload matching user's testpool_events schema
    const newEvent: any = {
      id: generateUUID(),
      experiment_id: cleanUUID(event.experiment_id),
      user_id: cleanUUID(event.user_id || event.operator_id),
      operator_id: cleanUUID(event.operator_id),
      target_id: cleanUUID(event.target_id),
      event: event.event || event.action || null,
      event_key: event.event_key || event.action || null,
      action: event.action || event.event || '',
      metadata: event.metadata || null,
      payload: event.payload || {},
      result: event.result || null,
      created_at: event.created_at || new Date().toISOString(),
      updated_at: event.updated_at || null
    };

    if (this.useLocalStorage) {
      const data = localStorage.getItem('testpool_events');
      const list: any[] = data ? JSON.parse(data) : [];
      list.push(newEvent);
      localStorage.setItem('testpool_events', JSON.stringify(list));
      return newEvent;
    }

    // Use safeSupabaseWrite to handle dynamic database schema changes seamlessly
    const data = await safeSupabaseWrite('testpool_events', 'insert', newEvent);
    return data;
  }

  async isEnabled(experimentKey: string, userId: string, userProfile?: any): Promise<boolean> {
    if (!experimentKey || !userId) return false;

    const experiment = await this.getExperimentByKey(experimentKey);
    if (!experiment) return false;

    // Must be enabled
    if (!experiment.enabled) return false;

    // 1. либо пользователь присутствует в testpool_assignments
    const assignments = await this.getAssignments(experiment.id);
    const isAssigned = assignments.some(a => a.user_id === userId && !a.removed_at && a.enabled);
    if (isAssigned) return true;

    // 2. либо experiment.rollout_all=true
    const rolloutAll = (experiment as any).rollout_all === true || experiment.rollout_percent === 100 || experiment.status === 'released';
    if (rolloutAll) return true;

    // 3. либо experiment.rollout_new_users=true и профиль создан после запуска
    const rolloutNewUsers = (experiment as any).rollout_new_users === true || experiment.status === 'new_users' || experiment.include_new_users === true;
    if (rolloutNewUsers) {
      try {
        let profile = userProfile;
        if (!profile && userId) {
          const { data, error } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', userId)
            .maybeSingle();
          if (!error && data) {
            profile = data;
          }
        }
        if (profile && profile.created_at) {
          const userRegDate = new Date(profile.created_at).getTime();
          const launchTime = experiment.released_at 
            ? new Date(experiment.released_at).getTime() 
            : new Date(experiment.created_at).getTime();
          if (userRegDate > launchTime) {
            return true;
          }
        }
      } catch (e) {
        console.error('[ExperimentRepository] Error checking rollout_new_users dates:', e);
      }
    }

    return false;
  }

  async assignUser(experimentId: string, userId: string, source: string = 'manual'): Promise<any> {
    return this.addAssignment({
      experiment_id: experimentId,
      user_id: userId,
      source,
      enabled: true
    });
  }

  async removeUser(experimentId: string, userId: string): Promise<boolean> {
    return this.removeAssignment(experimentId, userId);
  }

  async trackEvent(experimentIdOrAction: string, operatorIdOrUserId?: string, action?: string, payload?: any): Promise<any> {
    const isUUID = (val: any): boolean => {
      return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    };

    let experimentId = '';
    let operatorId = operatorIdOrUserId || '';
    let finalAction = experimentIdOrAction;
    let finalPayload = payload || {};

    if (action) {
      if (isUUID(experimentIdOrAction)) {
        experimentId = experimentIdOrAction;
        finalAction = action;
      } else {
        // First parameter is NOT a UUID (it's the event name/key). Let's resolve the actual experiment's UUID.
        const experiment = await this.getExperimentByKey('profile_custom_colors_v1');
        if (experiment) {
          experimentId = experiment.id;
        }
        finalAction = experimentIdOrAction;
      }
    } else {
      if (isUUID(experimentIdOrAction)) {
        experimentId = experimentIdOrAction;
        finalAction = 'action';
      } else {
        const experiment = await this.getExperimentByKey('profile_custom_colors_v1');
        if (experiment) {
          experimentId = experiment.id;
        }
        finalAction = experimentIdOrAction;
      }
    }

    return this.addEvent({
      experiment_id: experimentId,
      operator_id: operatorId,
      user_id: operatorId,
      action: finalAction,
      event: finalAction,
      event_key: finalAction,
      target_id: null,
      payload: finalPayload,
      created_at: new Date().toISOString()
    });
  }
}

export const experimentRepository = new ExperimentRepository();
