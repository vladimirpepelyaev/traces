import { experimentRepository } from './ExperimentRepository';
import { TestpoolExperiment, TestpoolAssignment, TestpoolEvent, ExperimentStatus } from '../../types';

// Deterministic hashing for percentage-based rollouts
function getUserRolloutBucket(userId: string, experimentKey: string): number {
  if (!userId) return 999; // Won't match any percentage
  const str = userId + experimentKey;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100;
}

export class TestpoolService {
  private experimentsCache: Map<string, TestpoolExperiment> = new Map();
  private assignmentsCache: Map<string, TestpoolAssignment[]> = new Map(); // key is experiment_id
  private isInitialized = false;
  private listeners: (() => void)[] = [];

  constructor() {
    this.preload();
  }

  /**
   * Preloads all experiments and assignments from the repository to make `isEnabled` synchronous.
   */
  async preload(notify = true): Promise<void> {
    try {
      const experiments = await experimentRepository.getExperiments();
      this.experimentsCache.clear();
      experiments.forEach(exp => {
        this.experimentsCache.set(exp.key, exp);
      });

      this.assignmentsCache.clear();
      for (const exp of experiments) {
        const assignments = await experimentRepository.getAssignments(exp.id);
        this.assignmentsCache.set(exp.id, assignments);
      }

      this.isInitialized = true;
      if (notify) {
        this.notifyListeners();
      }
    } catch (err) {
      console.error('[TestpoolService] Preload failed:', err);
    }
  }

  /**
   * Subscribes to changes in the feature flag configs.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (err) {
        console.error('[TestpoolService] Listener error:', err);
      }
    });
  }

  /**
   * Core mandatory function: isEnabled(featureKey, userId)
   * Evaluates feature availability based on experiment status, rollout percentage, and user assignments.
   */
  isEnabled(featureKey: string, userId: string | null | undefined): boolean {
    if (!featureKey) return false;
    
    const experiment = this.experimentsCache.get(featureKey);
    if (!experiment) {
      return false;
    }

    // If completely disabled or inactive
    if (!experiment.enabled || experiment.status === 'disabled') {
      return false;
    }

    // If fully released
    if (experiment.status === 'released') {
      return true;
    }

    if (!userId) {
      return false;
    }

    // Check manual override assignments first
    const assignments = this.assignmentsCache.get(experiment.id) || [];
    const manualAssignment = assignments.find(a => a.user_id === userId && !a.removed_at);
    
    if (manualAssignment) {
      return manualAssignment.enabled;
    }

    // Draft mode: Only manual overrides allowed
    if (experiment.status === 'draft') {
      return false;
    }

    // Partial rollout: Deterministic bucket + manual assignments
    if (experiment.status === 'partial') {
      const bucket = getUserRolloutBucket(userId, featureKey);
      return bucket < experiment.rollout_percent;
    }

    // Rollout to new users only: user registered after experiment update
    if (experiment.status === 'new_users') {
      // We check if we have the user registration date. If we don't, we can fallback to false.
      // Standard new user logic compares user creation timestamp vs experiment state update timestamp.
      return false; // Default fallback for existing, but new_users checks reg dates on profiles
    }

    return false;
  }

  /**
   * Extended new-user evaluation that takes the user profile creation date into account.
   */
  isEnabledWithProfile(featureKey: string, userProfile: any): boolean {
    if (!featureKey || !userProfile) return false;

    const experiment = this.experimentsCache.get(featureKey);
    if (!experiment) return false;

    if (!experiment.enabled || experiment.status === 'disabled') return false;
    if (experiment.status === 'released') return true;

    const userId = userProfile.id;
    if (!userId) return false;

    // Check manual overrides
    const assignments = this.assignmentsCache.get(experiment.id) || [];
    const manualAssignment = assignments.find(a => a.user_id === userId && !a.removed_at);
    if (manualAssignment) {
      return manualAssignment.enabled;
    }

    if (experiment.status === 'draft') return false;

    if (experiment.status === 'partial') {
      const bucket = getUserRolloutBucket(userId, featureKey);
      return bucket < experiment.rollout_percent;
    }

    if (experiment.status === 'new_users') {
      // Check if user's registration date is after the experiment's release/rollout/update date
      try {
        const userRegDate = userProfile.created_at ? new Date(userProfile.created_at) : null;
        const expUpdateDate = experiment.updated_at ? new Date(experiment.updated_at) : new Date(experiment.created_at);
        
        if (userRegDate && userRegDate.getTime() > expUpdateDate.getTime()) {
          return true;
        }
      } catch (e) {
        console.error('[TestpoolService] Error evaluating reg dates:', e);
      }
      return false;
    }

    return false;
  }

  async loadExperiment(key: string): Promise<TestpoolExperiment | null> {
    try {
      const exp = await experimentRepository.getExperimentByKey(key);
      if (exp) {
        this.experimentsCache.set(exp.key, exp);
        const assignments = await experimentRepository.getAssignments(exp.id);
        this.assignmentsCache.set(exp.id, assignments);
        return exp;
      }
    } catch (err) {
      console.error('[TestpoolService] loadExperiment failed:', err);
    }
    return null;
  }

  isEnabledForUser(userId: string | null | undefined): boolean {
    return this.isEnabled('profile_custom_colors_v1', userId);
  }

  // --- WRITE API & CHANGE EVENTS ---

  async registerExperiment(key: string, title: string, description: string, operatorId: string): Promise<TestpoolExperiment> {
    const exp = await experimentRepository.createExperiment({
      key,
      title,
      description,
      status: 'draft',
      enabled: false,
      created_by: operatorId,
      updated_by: operatorId
    });

    await experimentRepository.addEvent({
      experiment_id: exp.id,
      operator_id: operatorId,
      action: 'create',
      payload: { title, key, description }
    });

    await this.preload();
    return exp;
  }

  async editExperimentMeta(id: string, title: string, description: string, operatorId: string): Promise<TestpoolExperiment> {
    const exp = await experimentRepository.updateExperiment(id, {
      title,
      description,
      updated_by: operatorId
    });

    await experimentRepository.addEvent({
      experiment_id: id,
      operator_id: operatorId,
      action: 'edit_metadata',
      payload: { title, description }
    });

    await this.preload();
    return exp;
  }

  async updateStatus(id: string, status: ExperimentStatus, operatorId: string): Promise<TestpoolExperiment> {
    const updates: Partial<TestpoolExperiment> = {
      status,
      updated_by: operatorId
    };

    if (status === 'released') {
      updates.enabled = true;
      updates.rollout_percent = 100;
      updates.include_new_users = true;
      updates.released_at = new Date().toISOString();
    } else if (status === 'disabled') {
      updates.enabled = false;
      updates.rollout_percent = 0;
    }

    const exp = await experimentRepository.updateExperiment(id, updates);

    await experimentRepository.addEvent({
      experiment_id: id,
      operator_id: operatorId,
      action: `status_change_to_${status}`,
      payload: { status, enabled: updates.enabled }
    });

    await this.preload();
    return exp;
  }

  async rolloutToAllExisting(id: string, operatorId: string): Promise<TestpoolExperiment> {
    // "Раскатить на 100%" (enable for all existing, new registrations not automatically included)
    const exp = await experimentRepository.updateExperiment(id, {
      status: 'partial',
      enabled: true,
      rollout_percent: 100,
      include_new_users: false,
      updated_by: operatorId
    });

    await experimentRepository.addEvent({
      experiment_id: id,
      operator_id: operatorId,
      action: 'rollout_100_percent',
      payload: { rollout_percent: 100, include_new_users: false }
    });

    await this.preload();
    return exp;
  }

  async rolloutToNewOnly(id: string, operatorId: string): Promise<TestpoolExperiment> {
    // "Раскатить только на новые регистрации" (existing users unchanged, new get access automatically)
    const exp = await experimentRepository.updateExperiment(id, {
      status: 'new_users',
      enabled: true,
      rollout_percent: 0,
      include_new_users: true,
      updated_by: operatorId
    });

    await experimentRepository.addEvent({
      experiment_id: id,
      operator_id: operatorId,
      action: 'rollout_new_users_only',
      payload: { rollout_percent: 0, include_new_users: true }
    });

    await this.preload();
    return exp;
  }

  async setRolloutPercent(id: string, percent: number, operatorId: string): Promise<TestpoolExperiment> {
    const exp = await experimentRepository.updateExperiment(id, {
      rollout_percent: percent,
      status: 'partial',
      enabled: true,
      updated_by: operatorId
    });

    await experimentRepository.addEvent({
      experiment_id: id,
      operator_id: operatorId,
      action: 'update_rollout_percent',
      payload: { rollout_percent: percent }
    });

    await this.preload();
    return exp;
  }

  async addParticipant(experimentId: string, userId: string, operatorId: string, source = 'manual'): Promise<TestpoolAssignment> {
    const assignment = await experimentRepository.addAssignment({
      experiment_id: experimentId,
      user_id: userId,
      source,
      enabled: true
    });

    await experimentRepository.addEvent({
      experiment_id: experimentId,
      operator_id: operatorId,
      action: 'add_user',
      payload: { target_user_id: userId, source }
    });

    await this.preload();
    return assignment;
  }

  async removeParticipant(experimentId: string, userId: string, operatorId: string): Promise<boolean> {
    const success = await experimentRepository.removeAssignment(experimentId, userId);
    
    if (success) {
      await experimentRepository.addEvent({
        experiment_id: experimentId,
        operator_id: operatorId,
        action: 'remove_user',
        payload: { target_user_id: userId }
      });
    }

    await this.preload();
    return success;
  }

  async deleteExperiment(id: string, operatorId: string): Promise<boolean> {
    const success = await experimentRepository.deleteExperiment(id);
    await this.preload();
    return success;
  }

  async getEvents(experimentId: string): Promise<TestpoolEvent[]> {
    return experimentRepository.getEvents(experimentId);
  }

  /**
   * Get all active experiments for a user (visible on their public profile).
   * Does not expose internal keys. Only returns title, description, and status.
   */
  getActiveUserExperiments(userId: string, userProfile: any): { title: string; description: string }[] {
    const list: { title: string; description: string }[] = [];
    
    this.experimentsCache.forEach((exp) => {
      // "Показывать только активные эксперименты."
      // "Не показывать внутренние ключи."
      if (this.isEnabledWithProfile(exp.key, userProfile)) {
        list.push({
          title: exp.title,
          description: exp.description || ''
        });
      }
    });

    return list;
  }
}

export const testpoolService = new TestpoolService();
export const isEnabled = (featureKey: string, userId: string | null | undefined): boolean => {
  return testpoolService.isEnabled(featureKey, userId);
};
