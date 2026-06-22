import { AppUser } from '../../types';

// Supported system roles
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
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

export interface PermissionService {
  hasRole(user: AppUser | null, role: string): boolean;
  canModerate(user: AppUser | null): boolean;
  isAdmin(user: AppUser | null): boolean;
}

class PermissionServiceImpl implements PermissionService {
  /**
   * Has system role check.
   * If role is unknown or not supported, we must deny access (Если роль неизвестна → отказ).
   */
  hasRole(user: AppUser | null, role: string): boolean {
    if (!user) return false;

    // Check if queried role is in known system roles
    const knownRoles = Object.values(SYSTEM_ROLES);
    if (!knownRoles.includes(role)) {
      console.warn(`PermissionService: Unknown role queried: "${role}" - access denied.`);
      return false; // Если роль неизвестна → отказ.
    }

    const profileRole = user.role || 'user';

    // Rule 7 computed permissions mapping
    let permissions: string[] = [];
    if (profileRole === 'super_admin') {
      permissions = ['admin', 'moderation', 'support'];
    } else if (profileRole === 'admin') {
      permissions = ['admin', 'moderation'];
    } else if (profileRole === 'moderator' || profileRole === 'moderation') {
      permissions = ['moderation'];
    } else if (profileRole === 'support') {
      permissions = ['support'];
    } else {
      permissions = [];
    }

    const isEmployee = ['super_admin', 'admin', 'moderator', 'moderation', 'support'].includes(profileRole);

    if (role === SYSTEM_ROLES.ADMIN) {
      return permissions.includes('admin');
    }

    if (role === SYSTEM_ROLES.MODERATOR || role === SYSTEM_ROLES.MODERATION) {
      return permissions.includes('moderation');
    }

    if (role === SYSTEM_ROLES.SUPPORT) {
      return permissions.includes('support');
    }

    if (role === SYSTEM_ROLES.SPAM) {
      return permissions.includes('moderation');
    }

    if (role === SYSTEM_ROLES.FEED_MODERATOR) {
      return permissions.includes('moderation');
    }

    if (role === SYSTEM_ROLES.VERIFICATION) {
      return permissions.includes('admin');
    }

    if (role === SYSTEM_ROLES.REQUESTS) {
      return permissions.includes('admin');
    }

    if (role === SYSTEM_ROLES.PRO) {
      return isEmployee;
    }

    if (role === SYSTEM_ROLES.USER) {
      return true; // Everyone has at least user role
    }

    return false;
  }

  /**
   * Checks if the user is permitted to moderate content or actions.
   */
  canModerate(user: AppUser | null): boolean {
    if (!user) return false;
    const profileRole = user.role || 'user';
    return ['super_admin', 'admin', 'moderator', 'moderation'].includes(profileRole);
  }

  /**
   * Checks if the user is an administrator.
   */
  isAdmin(user: AppUser | null): boolean {
    if (!user) return false;
    const profileRole = user.role || 'user';
    return ['super_admin', 'admin'].includes(profileRole);
  }
}

export const permissionService: PermissionService = new PermissionServiceImpl();
