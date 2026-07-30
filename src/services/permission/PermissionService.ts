import { AppUser } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

// Supported system roles
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  USER: 'user',
  MODERATION: 'moderation',
  SPAM: 'spam',
  PRO: 'pro',
  VERIFICATION: 'verification',
  FEED_MODERATOR: 'feed_moderator',
  REQUESTS: 'requests'
};

export const EMPLOYEE_PERMISSIONS = {
  MODERATION: 'moderation',
  SUPPORT: 'support',
  STATISTICS: 'statistics',
  VERIFICATION: 'verification',
  APPEALS: 'appeals',
  REQUESTS: 'requests',
  USERS: 'users',
  MANAGEMENT: 'management',
  ANNOUNCEMENTS: 'announcements',
  WIKI: 'wiki',
  PERSONNEL: 'personnel',
  QUALITY_CONTROL: 'quality-control',
  SECURITY: 'security',
  ACTION_LOGS: 'action-logs',
  MONITORING: 'monitoring',
  TESTPOOL: 'testpool',
  ADMIN: 'admin'
};

export interface PermissionService {
  hasRole(user: AppUser | null, role: string): boolean;
  canModerate(user: AppUser | null): boolean;
  isAdmin(user: AppUser | null): boolean;
  isSuperAdmin(user: AppUser | null): boolean;

  // Unified employee permission methods
  hasPermission(user: AppUser | null, permissionKey: string): boolean;
  canAccessSection(user: AppUser | null, permissionKey: string): boolean;
  getAvailableEmployeeSections(user: AppUser | null): string[];

  // Supabase Database Sync Operations
  fetchEmployeePermissions(userId: string): Promise<Record<string, boolean>>;
  fetchAllEmployeePermissions(): Promise<Record<string, Record<string, boolean>>>;
  setEmployeePermission(userId: string, permissionKey: string, enabled: boolean): Promise<void>;
  updateUserRole(userId: string, role: string): Promise<void>;
}

class PermissionServiceImpl implements PermissionService {
  private permissionsCache: Record<string, Record<string, boolean>> = {};

  /**
   * Has system role check.
   */
  hasRole(user: AppUser | null, role: string): boolean {
    if (!user) return false;

    const profileRole = user.role || 'user';
    if (profileRole === 'super_admin' || profileRole === 'superadmin') {
      return true;
    }

    if (role === SYSTEM_ROLES.USER) {
      return true;
    }

    if (role === SYSTEM_ROLES.ADMIN) {
      return this.isAdmin(user);
    }

    if (role === SYSTEM_ROLES.SUPPORT || role === EMPLOYEE_PERMISSIONS.SUPPORT) {
      return this.canAccessSection(user, 'support');
    }

    if (role === EMPLOYEE_PERMISSIONS.STATISTICS) {
      return this.canAccessSection(user, 'statistics');
    }

    if (role === EMPLOYEE_PERMISSIONS.TESTPOOL) {
      return this.canAccessSection(user, 'testpool');
    }

    if (profileRole === 'admin') {
      return this.hasPermission(user, role);
    }

    return false;
  }

  /**
   * Checks if the user is permitted to moderate content or actions.
   */
  canModerate(user: AppUser | null): boolean {
    if (!user) return false;
    const profileRole = user.role || 'user';
    return ['super_admin', 'superadmin', 'admin', 'moderator', 'moderation'].includes(profileRole);
  }

  /**
   * Checks if the user is an administrator.
   */
  isAdmin(user: AppUser | null): boolean {
    if (!user) return false;
    const profileRole = user.role || 'user';
    return ['super_admin', 'superadmin', 'admin'].includes(profileRole);
  }

  /**
   * Checks if the user is a superadmin.
   */
  isSuperAdmin(user: AppUser | null): boolean {
    if (!user) return false;
    const profileRole = user.role || 'user';
    return ['super_admin', 'superadmin'].includes(profileRole) || user.isSuperAdmin === true;
  }

  /**
   * Check if a user has a specific permission key.
   */
  hasPermission(user: AppUser | null, permissionKey: string): boolean {
    if (!user) return false;
    const profileRole = user.role || 'user';

    if (profileRole === 'user') {
      return false;
    }

    if (this.isSuperAdmin(user)) {
      return true;
    }

    if (['admin', 'administrator', 'moderator', 'support'].includes(profileRole) || user.isEmployee) {
      if (user.employeePermissions && user.employeePermissions[permissionKey] !== undefined) {
        return !!user.employeePermissions[permissionKey];
      }
      if (this.permissionsCache[user.id] && this.permissionsCache[user.id][permissionKey] !== undefined) {
        return !!this.permissionsCache[user.id][permissionKey];
      }
      if (user.roles && typeof user.roles === 'object' && user.roles[permissionKey] !== undefined) {
        return !!user.roles[permissionKey];
      }
      if (profileRole === 'moderator' && ['moderation', 'spam', 'appeals'].includes(permissionKey)) {
        return true;
      }
      if (profileRole === 'support' && permissionKey === 'support') {
        return true;
      }
    }

    return false;
  }

  /**
   * Unified check if a user can access a specific section.
   */
  canAccessSection(user: AppUser | null, permissionKey: string): boolean {
    if (!user) return false;
    const profileRole = user.role || 'user';

    if (profileRole === 'user' && !user.isEmployee) {
      return false;
    }

    if (this.isSuperAdmin(user)) {
      return true;
    }

    if (['admin', 'administrator', 'moderator', 'support'].includes(profileRole) || user.isEmployee) {
      return this.hasPermission(user, permissionKey);
    }

    return false;
  }

  /**
   * Returns list of section keys available for the employee.
   */
  getAvailableEmployeeSections(user: AppUser | null): string[] {
    if (!user) return [];
    const sections = Object.values(EMPLOYEE_PERMISSIONS);
    return sections.filter(sec => this.canAccessSection(user, sec));
  }

  /**
   * Loads employee permissions for a single user from Supabase.
   */
  async fetchEmployeePermissions(userId: string): Promise<Record<string, boolean>> {
    if (!isSupabaseConfigured || !userId) return {};

    try {
      const { data, error } = await supabase
        .from('employee_permissions')
        .select('permission_key, enabled')
        .eq('user_id', userId);

      if (error) {
        console.error('[PermissionService] Error fetching permissions for user:', userId, error);
        return {};
      }

      const permissions: Record<string, boolean> = {};
      if (data) {
        for (const row of data) {
          permissions[row.permission_key] = !!row.enabled;
        }
      }

      this.permissionsCache[userId] = permissions;
      return permissions;
    } catch (err) {
      console.error('[PermissionService] Exception in fetchEmployeePermissions:', err);
      return {};
    }
  }

  /**
   * Loads all employee permissions from Supabase for all users.
   */
  async fetchAllEmployeePermissions(): Promise<Record<string, Record<string, boolean>>> {
    if (!isSupabaseConfigured) return {};

    try {
      const { data, error } = await supabase
        .from('employee_permissions')
        .select('user_id, permission_key, enabled');

      if (error) {
        console.error('[PermissionService] Error fetching all employee permissions:', error);
        return {};
      }

      const result: Record<string, Record<string, boolean>> = {};
      if (data) {
        for (const row of data) {
          if (!result[row.user_id]) {
            result[row.user_id] = {};
          }
          result[row.user_id][row.permission_key] = !!row.enabled;
        }
      }

      this.permissionsCache = result;
      return result;
    } catch (err) {
      console.error('[PermissionService] Exception in fetchAllEmployeePermissions:', err);
      return {};
    }
  }

  /**
   * Sets (upserts) employee permission in Supabase.
   */
  async setEmployeePermission(userId: string, permissionKey: string, enabled: boolean): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;

    try {
      const { data: existing } = await supabase
        .from('employee_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('permission_key', permissionKey)
        .maybeSingle();

      const now = new Date().toISOString();

      if (existing?.id) {
        const { error } = await supabase
          .from('employee_permissions')
          .update({
            enabled: enabled,
            updated_at: now
          })
          .eq('id', existing.id);

        if (error) {
          console.error('[PermissionService] Error updating employee_permissions:', error);
        }
      } else {
        const { error } = await supabase
          .from('employee_permissions')
          .insert({
            user_id: userId,
            permission_key: permissionKey,
            enabled: enabled,
            created_at: now,
            updated_at: now
          });

        if (error) {
          console.error('[PermissionService] Error inserting employee_permissions:', error);
        }
      }

      if (!this.permissionsCache[userId]) {
        this.permissionsCache[userId] = {};
      }
      this.permissionsCache[userId][permissionKey] = enabled;
    } catch (err) {
      console.error('[PermissionService] Exception in setEmployeePermission:', err);
    }
  }

  /**
   * Updates base user role in Supabase profiles table.
   */
  async updateUserRole(userId: string, role: string): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[PermissionService] Error updating profiles role:', error);
      }
    } catch (err) {
      console.error('[PermissionService] Exception in updateUserRole:', err);
    }
  }
}

export const permissionService: PermissionService = new PermissionServiceImpl();

