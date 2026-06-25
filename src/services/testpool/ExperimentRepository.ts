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
    return data || [];
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
    return data;
  }

  async createExperiment(experiment: Partial<TestpoolExperiment>): Promise<TestpoolExperiment> {
    await this.checkDatabaseAvailability();

    const newExperiment: TestpoolExperiment = {
      id: generateUUID(),
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
      ...experiment
    };

    if (this.useLocalStorage) {
      const list = await this.getExperiments();
      list.push(newExperiment);
      localStorage.setItem('testpool_experiments', JSON.stringify(list));
      return newExperiment;
    }

    const { data, error } = await supabase
      .from('testpool_experiments')
      .insert(newExperiment)
      .select()
      .single();

    if (error) {
      console.error('[ExperimentRepository] createExperiment error:', error);
      throw error;
    }
    return data;
  }

  async updateExperiment(id: string, updates: Partial<TestpoolExperiment>): Promise<TestpoolExperiment> {
    await this.checkDatabaseAvailability();

    const cleanUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    delete (cleanUpdates as any).id;
    delete (cleanUpdates as any).created_at;

    if (this.useLocalStorage) {
      const list = await this.getExperiments();
      const idx = list.findIndex(e => e.id === id);
      if (idx === -1) throw new Error('Experiment not found');
      
      const updated = { ...list[idx], ...cleanUpdates };
      list[idx] = updated;
      localStorage.setItem('testpool_experiments', JSON.stringify(list));
      return updated;
    }

    const { data, error } = await supabase
      .from('testpool_experiments')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ExperimentRepository] updateExperiment error:', error);
      throw error;
    }
    return data;
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
    return data || [];
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

    const { data, error } = await supabase
      .from('testpool_assignments')
      .upsert({
        experiment_id: assignment.experiment_id,
        user_id: assignment.user_id,
        source: assignment.source || 'manual',
        enabled: assignment.enabled ?? true,
        removed_at: null
      }, { onConflict: 'experiment_id,user_id' })
      .select()
      .single();

    if (error) {
      console.error('[ExperimentRepository] addAssignment error:', error);
      throw error;
    }
    return data;
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

  async addEvent(event: Omit<TestpoolEvent, 'id' | 'created_at'>): Promise<TestpoolEvent> {
    await this.checkDatabaseAvailability();

    const newEvent: TestpoolEvent = {
      id: generateUUID(),
      experiment_id: event.experiment_id,
      operator_id: event.operator_id,
      action: event.action,
      payload: event.payload || {},
      created_at: new Date().toISOString()
    };

    if (this.useLocalStorage) {
      const data = localStorage.getItem('testpool_events');
      const list: TestpoolEvent[] = data ? JSON.parse(data) : [];
      list.push(newEvent);
      localStorage.setItem('testpool_events', JSON.stringify(list));
      return newEvent;
    }

    const { data, error } = await supabase
      .from('testpool_events')
      .insert(newEvent)
      .select()
      .single();

    if (error) {
      console.error('[ExperimentRepository] addEvent error:', error);
      throw error;
    }
    return data;
  }
}

export const experimentRepository = new ExperimentRepository();
