import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export interface Experiment {
  id: string;
  key: string;
  title: string;
  description: string;
  status: 'draft' | 'partial' | 'new_users' | 'released' | 'disabled';
  enabled: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  rollout_percent: number;
  include_new_users: boolean;
  released_at?: string;
  expires_at?: string;
}

export interface Assignment {
  id: string;
  experiment_id: string;
  user_id: string;
  source?: string;
  enabled: boolean;
  created_at: string;
  removed_at?: string | null;
}

export interface TestpoolEvent {
  id: string;
  experiment_id: string;
  operator_id?: string;
  action: string;
  payload?: any;
  created_at: string;
}

// No default mock experiments - Testpool uses real DB data only
const DEFAULT_EXPERIMENTS: Experiment[] = [];

export class ExperimentRepository {
  private useLocalStorage = !isSupabaseConfigured;

  constructor() {
    this.initLocalStorageIfNeeded();
  }

  private initLocalStorageIfNeeded() {
    // Clear any stale mock experiments if present in localStorage
    const existing = localStorage.getItem('testpool_experiments_local');
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed) && parsed.some((e: any) => e.key === 'special_badge' || e.key === 'unreleased_game')) {
          localStorage.removeItem('testpool_experiments_local');
        }
      } catch (e) {
        localStorage.removeItem('testpool_experiments_local');
      }
    }

    if (!localStorage.getItem('testpool_experiments_local')) {
      localStorage.setItem('testpool_experiments_local', JSON.stringify([]));
    }
    if (!localStorage.getItem('testpool_assignments_local')) {
      localStorage.setItem('testpool_assignments_local', JSON.stringify([]));
    }
    if (!localStorage.getItem('testpool_events_local')) {
      localStorage.setItem('testpool_events_local', JSON.stringify([]));
    }
  }

  async getAllExperiments(): Promise<Experiment[]> {
    if (isSupabaseConfigured && !this.useLocalStorage) {
      try {
        const { data, error } = await supabase
          .from('testpool_experiments')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[ExperimentRepository] Supabase error, falling back to localStorage:', error);
          this.useLocalStorage = true;
          return this.getLocalExperiments();
        }
        return data as Experiment[];
      } catch (err) {
        console.warn('[ExperimentRepository] Connection failed, falling back to localStorage:', err);
        this.useLocalStorage = true;
        return this.getLocalExperiments();
      }
    }
    return this.getLocalExperiments();
  }

  private getLocalExperiments(): Experiment[] {
    const raw = localStorage.getItem('testpool_experiments_local');
    return raw ? JSON.parse(raw) : [];
  }

  async saveExperiment(exp: Partial<Experiment> & { key: string; title: string }): Promise<Experiment> {
    const id = exp.id || `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fullExp: Experiment = {
      id,
      key: exp.key,
      title: exp.title,
      description: exp.description || '',
      status: exp.status || 'draft',
      enabled: exp.enabled !== undefined ? exp.enabled : false,
      created_by: exp.created_by,
      updated_by: exp.updated_by,
      created_at: exp.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rollout_percent: exp.rollout_percent || 0,
      include_new_users: exp.include_new_users !== undefined ? exp.include_new_users : false,
      released_at: exp.released_at,
      expires_at: exp.expires_at
    };

    if (isSupabaseConfigured && !this.useLocalStorage) {
      try {
        const { data, error } = await supabase
          .from('testpool_experiments')
          .upsert(fullExp)
          .select()
          .single();

        if (error) {
          console.warn('[ExperimentRepository] Supabase upsert error, falling back to localStorage:', error);
          this.useLocalStorage = true;
          this.saveLocalExperiment(fullExp);
          return fullExp;
        }
        return data as Experiment;
      } catch (err) {
        console.warn('[ExperimentRepository] Supabase connection failed, falling back to localStorage:', err);
        this.useLocalStorage = true;
        this.saveLocalExperiment(fullExp);
        return fullExp;
      }
    } else {
      this.saveLocalExperiment(fullExp);
      return fullExp;
    }
  }

  private saveLocalExperiment(exp: Experiment) {
    const list = this.getLocalExperiments();
    const idx = list.findIndex(e => e.id === exp.id || e.key === exp.key);
    if (idx >= 0) {
      list[idx] = exp;
    } else {
      list.push(exp);
    }
    localStorage.setItem('testpool_experiments_local', JSON.stringify(list));
  }

  async getAssignments(experimentId: string): Promise<Assignment[]> {
    if (isSupabaseConfigured && !this.useLocalStorage) {
      try {
        const { data, error } = await supabase
          .from('testpool_assignments')
          .select('*')
          .eq('experiment_id', experimentId);

        if (error) {
          console.warn('[ExperimentRepository] Supabase select assignments error, falling back to localStorage:', error);
          return this.getLocalAssignments(experimentId);
        }
        return data as Assignment[];
      } catch (err) {
        console.warn('[ExperimentRepository] Connection failed while fetching assignments, falling back:', err);
        return this.getLocalAssignments(experimentId);
      }
    }
    return this.getLocalAssignments(experimentId);
  }

  private getLocalAssignments(experimentId?: string): Assignment[] {
    const raw = localStorage.getItem('testpool_assignments_local');
    const all: Assignment[] = raw ? JSON.parse(raw) : [];
    if (experimentId) {
      return all.filter(a => a.experiment_id === experimentId && !a.removed_at);
    }
    return all.filter(a => !a.removed_at);
  }

  async addAssignment(experimentId: string, userId: string, source: string = 'manual'): Promise<Assignment> {
    const newAssign: Assignment = {
      id: `assign-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      experiment_id: experimentId,
      user_id: userId,
      source,
      enabled: true,
      created_at: new Date().toISOString(),
      removed_at: null
    };

    if (isSupabaseConfigured && !this.useLocalStorage) {
      try {
        const { data, error } = await supabase
          .from('testpool_assignments')
          .upsert({
            experiment_id: experimentId,
            user_id: userId,
            source,
            enabled: true,
            created_at: new Date().toISOString(),
            removed_at: null
          }, { onConflict: 'experiment_id,user_id' })
          .select()
          .single();

        if (error) {
          console.warn('[ExperimentRepository] Supabase assignment error, falling back to localStorage:', error);
          this.useLocalStorage = true;
          this.saveLocalAssignment(newAssign);
          return newAssign;
        }
        return data as Assignment;
      } catch (err) {
        console.warn('[ExperimentRepository] Connection failed while adding assignment, falling back:', err);
        this.useLocalStorage = true;
        this.saveLocalAssignment(newAssign);
        return newAssign;
      }
    } else {
      this.saveLocalAssignment(newAssign);
      return newAssign;
    }
  }

  async addExcludeAssignment(experimentId: string, userId: string, source: string = 'manual_exclude'): Promise<Assignment> {
    const excludeAssign: Assignment = {
      id: `assign-ex-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      experiment_id: experimentId,
      user_id: userId,
      source,
      enabled: false,
      created_at: new Date().toISOString(),
      removed_at: null
    };

    if (isSupabaseConfigured && !this.useLocalStorage) {
      try {
        const { data, error } = await supabase
          .from('testpool_assignments')
          .upsert({
            experiment_id: experimentId,
            user_id: userId,
            source,
            enabled: false,
            created_at: new Date().toISOString(),
            removed_at: null
          }, { onConflict: 'experiment_id,user_id' })
          .select()
          .single();

        if (error) {
          console.warn('[ExperimentRepository] Supabase exclude assignment error, falling back to localStorage:', error);
          this.saveLocalAssignment(excludeAssign);
          return excludeAssign;
        }
        return data as Assignment;
      } catch (err) {
        console.warn('[ExperimentRepository] Connection failed while adding exclude assignment:', err);
        this.saveLocalAssignment(excludeAssign);
        return excludeAssign;
      }
    } else {
      this.saveLocalAssignment(excludeAssign);
      return excludeAssign;
    }
  }

  private saveLocalAssignment(assign: Assignment) {
    const raw = localStorage.getItem('testpool_assignments_local');
    const all: Assignment[] = raw ? JSON.parse(raw) : [];
    
    // Check if duplicate
    const idx = all.findIndex(a => a.experiment_id === assign.experiment_id && a.user_id === assign.user_id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], enabled: true, removed_at: null, source: assign.source };
    } else {
      all.push(assign);
    }
    localStorage.setItem('testpool_assignments_local', JSON.stringify(all));
  }

  async removeAssignment(experimentId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured && !this.useLocalStorage) {
      try {
        const { error } = await supabase
          .from('testpool_assignments')
          .delete()
          .eq('experiment_id', experimentId)
          .eq('user_id', userId);

        if (error) {
          console.warn('[ExperimentRepository] Supabase delete assignment error, falling back to localStorage:', error);
          this.useLocalStorage = true;
          this.removeLocalAssignment(experimentId, userId);
        }
      } catch (err) {
        console.warn('[ExperimentRepository] Connection failed while deleting assignment, falling back:', err);
        this.useLocalStorage = true;
        this.removeLocalAssignment(experimentId, userId);
      }
    } else {
      this.removeLocalAssignment(experimentId, userId);
    }
  }

  private removeLocalAssignment(experimentId: string, userId: string) {
    const raw = localStorage.getItem('testpool_assignments_local');
    let all: Assignment[] = raw ? JSON.parse(raw) : [];
    all = all.filter(a => !(a.experiment_id === experimentId && a.user_id === userId));
    localStorage.setItem('testpool_assignments_local', JSON.stringify(all));
  }

  async addEvent(experimentId: string, operatorId: string, action: string, payload?: any): Promise<TestpoolEvent> {
    const newEvent: TestpoolEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      experiment_id: experimentId,
      operator_id: operatorId,
      action,
      payload: payload || {},
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && !this.useLocalStorage) {
      try {
        const { data, error } = await supabase
          .from('testpool_events')
          .insert({
            experiment_id: experimentId,
            operator_id: operatorId,
            action,
            payload: payload || {}
          })
          .select()
          .single();

        if (error) {
          console.warn('[ExperimentRepository] Supabase insert event error, falling back:', error);
          this.saveLocalEvent(newEvent);
          return newEvent;
        }
        return data as TestpoolEvent;
      } catch (err) {
        console.warn('[ExperimentRepository] Connection failed while logging event, falling back:', err);
        this.saveLocalEvent(newEvent);
        return newEvent;
      }
    } else {
      this.saveLocalEvent(newEvent);
      return newEvent;
    }
  }

  private saveLocalEvent(evt: TestpoolEvent) {
    const raw = localStorage.getItem('testpool_events_local');
    const all: TestpoolEvent[] = raw ? JSON.parse(raw) : [];
    all.push(evt);
    localStorage.setItem('testpool_events_local', JSON.stringify(all));
  }

  async getEvents(experimentId?: string): Promise<TestpoolEvent[]> {
    if (isSupabaseConfigured && !this.useLocalStorage) {
      try {
        let query = supabase.from('testpool_events').select('*');
        if (experimentId) {
          query = query.eq('experiment_id', experimentId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          return this.getLocalEvents(experimentId);
        }
        return data as TestpoolEvent[];
      } catch (err) {
        return this.getLocalEvents(experimentId);
      }
    }
    return this.getLocalEvents(experimentId);
  }

  private getLocalEvents(experimentId?: string): TestpoolEvent[] {
    const raw = localStorage.getItem('testpool_events_local');
    const all: TestpoolEvent[] = raw ? JSON.parse(raw) : [];
    if (experimentId) {
      return all.filter(e => e.experiment_id === experimentId).reverse();
    }
    return all.slice().reverse();
  }
}
