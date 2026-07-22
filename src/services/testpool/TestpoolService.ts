import { ExperimentRepository, Experiment, Assignment, TestpoolEvent } from './ExperimentRepository';
import { AppUser } from '../../types';

function getUserIdHashPercent(userId: string, experimentId: string): number {
  const str = userId + experimentId;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 100);
}

export class TestpoolService {
  private repository = new ExperimentRepository();
  private experiments: Experiment[] = [];
  private assignments: Assignment[] = [];
  private users: AppUser[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.refresh();
  }

  // Subscribe to changes in the service
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // Refresh cache
  async refresh(usersList?: AppUser[]) {
    try {
      if (usersList) {
        this.users = usersList;
      }
      this.experiments = await this.repository.getAllExperiments();
      
      // Ensure profile_palette experiment exists in experiments list
      if (!this.experiments.some(e => e.key === 'profile_palette')) {
        this.experiments.unshift({
          id: 'exp-profile-palette',
          key: 'profile_palette',
          title: 'Кастомизация палитры профиля',
          description: 'Позволяет пользователям изменять пастельный цвет фона своих постов',
          status: 'released',
          enabled: true,
          rollout_percent: 100,
          include_new_users: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      // Load assignments for all experiments
      const allAssignments: Assignment[] = [];
      for (const exp of this.experiments) {
        const assigns = await this.repository.getAssignments(exp.id);
        allAssignments.push(...assigns);
      }
      this.assignments = allAssignments;
      this.notify();
    } catch (err) {
      console.error('[TestpoolService] Error refreshing data:', err);
    }
  }

  setUsers(usersList: AppUser[]) {
    this.users = usersList;
  }

  getExperiments(): Experiment[] {
    return this.experiments;
  }

  getAssignmentsForExperiment(experimentId: string): Assignment[] {
    return this.assignments.filter(a => a.experiment_id === experimentId && !a.removed_at);
  }

  getManualOverridesForExperiment(experimentId: string): { user: AppUser; assignment: Assignment; type: 'manual_enable' | 'manual_exclude' }[] {
    const expAssigns = this.assignments.filter(a => a.experiment_id === experimentId && !a.removed_at);
    const result: { user: AppUser; assignment: Assignment; type: 'manual_enable' | 'manual_exclude' }[] = [];

    for (const assign of expAssigns) {
      const user = this.users.find(u => u.id === assign.user_id);
      if (!user) continue;
      const type = (assign.enabled === false || assign.source === 'manual_exclude') ? 'manual_exclude' : 'manual_enable';
      result.push({ user, assignment: assign, type });
    }

    return result;
  }

  getEffectiveAudienceForExperiment(experimentId: string): AppUser[] {
    const exp = this.experiments.find(e => e.id === experimentId);
    if (!exp) return [];
    return this.users.filter(u => this.isEnabled(exp.key, u.id));
  }

  getExperimentStats(experimentId: string) {
    const exp = this.experiments.find(e => e.id === experimentId);
    if (!exp) {
      return {
        totalUsers: this.users.length,
        effectiveAudienceCount: 0,
        manualEnabledCount: 0,
        manualExcludedCount: 0,
        rolloutPercent: 0
      };
    }

    const overrides = this.getManualOverridesForExperiment(experimentId);
    const manualEnabledCount = overrides.filter(o => o.type === 'manual_enable').length;
    const manualExcludedCount = overrides.filter(o => o.type === 'manual_exclude').length;
    const effectiveAudience = this.getEffectiveAudienceForExperiment(experimentId);

    return {
      totalUsers: this.users.length,
      effectiveAudienceCount: effectiveAudience.length,
      manualEnabledCount,
      manualExcludedCount,
      rolloutPercent: exp.rollout_percent
    };
  }

  getUsersInExperiment(experimentId: string): AppUser[] {
    return this.getEffectiveAudienceForExperiment(experimentId);
  }

  async createExperiment(key: string, title: string, description: string, operatorId: string): Promise<Experiment> {
    const exp = await this.repository.saveExperiment({
      key,
      title,
      description,
      status: 'draft',
      enabled: false,
      created_by: operatorId,
      updated_by: operatorId
    });
    
    await this.repository.addEvent(exp.id, operatorId, 'create', { key, title });
    await this.refresh();
    return exp;
  }

  async updateExperiment(experimentId: string, updates: Partial<Experiment>, operatorId: string): Promise<Experiment> {
    const existing = this.experiments.find(e => e.id === experimentId);
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const updated = await this.repository.saveExperiment({
      ...existing,
      ...updates,
      updated_by: operatorId,
      updated_at: new Date().toISOString()
    });

    await this.repository.addEvent(experimentId, operatorId, 'update', {
      changed_fields: Object.keys(updates),
      updates
    });

    await this.refresh();
    return updated;
  }

  async addAssignment(experimentId: string, userId: string, operatorId: string, source: string = 'manual'): Promise<Assignment> {
    const assign = await this.repository.addAssignment(experimentId, userId, source);
    await this.repository.addEvent(experimentId, operatorId, 'add_user', { user_id: userId, source });
    await this.refresh();
    return assign;
  }

  async excludeUserFromExperiment(experimentId: string, userId: string, operatorId: string): Promise<Assignment> {
    const assign = await this.repository.addExcludeAssignment(experimentId, userId, 'manual_exclude');
    await this.repository.addEvent(experimentId, operatorId, 'exclude_user', { user_id: userId, source: 'manual_exclude' });
    await this.refresh();
    return assign;
  }

  async removeAssignment(experimentId: string, userId: string, operatorId: string): Promise<void> {
    await this.repository.removeAssignment(experimentId, userId);
    await this.repository.addEvent(experimentId, operatorId, 'remove_user', { user_id: userId });
    await this.refresh();
  }

  async rolloutTo100Percent(experimentId: string, operatorId: string): Promise<Experiment> {
    const exp = await this.updateExperiment(experimentId, {
      status: 'partial',
      enabled: true,
      rollout_percent: 100,
      include_new_users: false
    }, operatorId);

    await this.repository.addEvent(experimentId, operatorId, 'rollout_100', {});
    return exp;
  }

  async rolloutToNewUsersOnly(experimentId: string, operatorId: string): Promise<Experiment> {
    const exp = await this.updateExperiment(experimentId, {
      status: 'new_users',
      enabled: true,
      include_new_users: true
    }, operatorId);

    await this.repository.addEvent(experimentId, operatorId, 'rollout_new_users', {});
    return exp;
  }

  async releaseExperiment(experimentId: string, operatorId: string): Promise<Experiment> {
    const exp = await this.updateExperiment(experimentId, {
      status: 'released',
      enabled: true,
      rollout_percent: 100,
      include_new_users: true,
      released_at: new Date().toISOString()
    }, operatorId);

    await this.repository.addEvent(experimentId, operatorId, 'release', {});
    return exp;
  }

  /**
   * Synchronous Feature Gate evaluation
   * Strictly adheres to priority order:
   * 1. Experiment disabled / draft / archived -> FALSE
   * 2. Explicit manual exclusion -> FALSE
   * 3. Explicit manual inclusion -> TRUE
   * 4. Released -> TRUE
   * 5. Partial hash rollout -> TRUE if hash < rollout_percent
   * 6. New users -> TRUE if registered after exp launch
   */
  isEnabled(featureKey: string, userId: string): boolean {
    const exp = this.experiments.find(e => e.key === featureKey);
    if (!exp) return false;
    if (!exp.enabled || exp.status === 'draft' || exp.status === 'disabled') return false;

    // Check explicit manual override assignments
    const override = this.assignments.find(
      a => a.experiment_id === exp.id && a.user_id === userId && !a.removed_at
    );

    if (override) {
      if (override.enabled === false || override.source === 'manual_exclude') {
        return false; // Explicit exclusion has highest priority
      }
      if (override.enabled === true || override.source === 'manual') {
        return true; // Explicit manual inclusion
      }
    }

    if (exp.status === 'released') return true;

    if (exp.status === 'partial') {
      if (exp.rollout_percent > 0) {
        return getUserIdHashPercent(userId, exp.id) < exp.rollout_percent;
      }
      return false;
    }

    if (exp.status === 'new_users') {
      if (!exp.include_new_users) return false;

      const user = this.users.find(u => u.id === userId);
      if (!user) return false;

      try {
        const expDate = new Date(exp.created_at).getTime();
        let userRegTime = 0;

        if (user.regDate === 'сегодня') {
          userRegTime = Date.now();
        } else if (user.regDate) {
          const parts = user.regDate.split('.');
          if (parts.length === 3) {
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const y = parseInt(parts[2]);
            userRegTime = new Date(y, m, d).getTime();
          } else {
            userRegTime = new Date(user.regDate).getTime();
          }
        }

        if (isNaN(userRegTime)) return false;
        return userRegTime >= expDate;
      } catch (e) {
        return false;
      }
    }

    return false;
  }

  // Get active experiments for a user
  getActiveExperimentsForUser(userId: string): Experiment[] {
    return this.experiments.filter(exp => {
      // Don't show inactive or completed/released/disabled experiments to standard users
      if (!exp.enabled || exp.status === 'disabled' || exp.status === 'released') return false;
      return this.isEnabled(exp.key, userId);
    });
  }

  async getEventsLog(experimentId?: string): Promise<TestpoolEvent[]> {
    return this.repository.getEvents(experimentId);
  }
}

export const testpoolService = new TestpoolService();

export function isFeatureEnabled(featureKey: string, userId?: string | null): boolean {
  if (!userId) return false;
  return testpoolService.isEnabled(featureKey, userId);
}
