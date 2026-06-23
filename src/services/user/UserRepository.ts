import { supabase, isSupabaseConfigured, handleSupabaseError } from '../../lib/supabase';
import { AppUser } from '../../types';
import { authService } from '../auth/AuthService';

export interface UserProfile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  onboarding_completed: boolean;
  blocked: boolean;
  public_settings?: any;
  created_at?: string;
  updated_at?: string;
}

export interface UserProgress {
  user_id: string;
  course_id: string;
  current_step: string | null;
  completed_steps: string[];
  updated_at?: string;
}

export interface UserRecord {
  id?: string;
  user_id: string;
  type: string;
  payload: any;
  created_at?: string;
  updated_at?: string;
}

export class UserRepository {
  /**
   * Retrieves the current user from auth state consolidated with profiles data.
   */
  async getUser(): Promise<AppUser | null> {
    const user = await authService.getCurrentUser();
    return user;
  }

  /**
   * Loads profile by userId
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      avatar_url: data.avatar_url,
      role: data.role || 'user',
      onboarding_completed: !!data.onboarding_completed,
      blocked: !!data.blocked,
      public_settings: data.public_settings,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  /**
   * Saves/Updates profile for the user
   */
  async saveProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    if (!isSupabaseConfigured) return;

    const cleanData = { ...profileData };
    delete (cleanData as any).id;
    delete (cleanData as any).created_at;

    const { error } = await supabase
      .from('profiles')
      .update(cleanData)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Loads progress for the user
   */
  async getProgress(userId: string): Promise<UserProgress | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      handleSupabaseError(error, 'getProgress');
      return null;
    }

    if (!data) {
      return null;
    }

    let completed_steps: string[] = [];
    if (typeof data.completed_steps === 'string') {
      try {
        completed_steps = JSON.parse(data.completed_steps);
      } catch {
        completed_steps = [];
      }
    } else if (Array.isArray(data.completed_steps)) {
      completed_steps = data.completed_steps;
    }

    return {
      user_id: data.user_id,
      course_id: data.course_id || 'main_course',
      current_step: data.current_step,
      completed_steps,
      updated_at: data.updated_at
    };
  }

  /**
   * Saves user progress (upserts current step and completed steps)
   */
  async saveProgress(userId: string, progress: { courseId?: string; currentStep?: string | null; completedSteps?: string[] }): Promise<void> {
    if (!isSupabaseConfigured) return;

    // "при создании записи всегда обязательно передавай course_id"
    // "нельзя создавать user_progress без курса"
    const courseId = progress.courseId || 'main_course';

    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        course_id: courseId,
        current_step: progress.currentStep || null,
        completed_steps: progress.completedSteps || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      handleSupabaseError(error, 'saveProgress');
      throw error;
    }
  }

  /**
   * Saves a generic record of a given type for user persistence
   */
  async saveRecord(userId: string, type: string, payload: any): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase
      .from('user_records')
      .insert({
        user_id: userId,
        type,
        payload
      });

    if (error) {
      console.error('Error saving user record:', error);
      throw error;
    }
  }

  /**
   * Loads records of a given type for user persistence
   */
  async loadRecords(userId: string, type?: string): Promise<UserRecord[]> {
    if (!isSupabaseConfigured) return [];

    let query = supabase
      .from('user_records')
      .select('*')
      .eq('user_id', userId);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading user records:', error);
      return [];
    }

    return (data || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      payload: r.payload,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  }

  /**
   * Set onboarding_completed parameter of profiles
   */
  async completeOnboarding(userId: string): Promise<void> {
    await this.saveProfile(userId, { onboarding_completed: true });
  }

  /**
   * Block or unblock a user profile
   */
  async setBlocked(userId: string, blocked: boolean): Promise<void> {
    await this.saveProfile(userId, { blocked });
  }

  /**
   * Modifies role column in profiles table
   */
  async setRole(userId: string, role: string): Promise<void> {
    await this.saveProfile(userId, { role });
  }
}

export const userRepository = new UserRepository();
