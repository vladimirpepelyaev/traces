import { AppUser } from '../../types';

// Supported system roles
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  USER: 'user',
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

    // Role-based resolution
    const userRole = user.role || (user.login === 'admin' ? 'admin' : 'user');

    if (role === SYSTEM_ROLES.ADMIN) {
      return userRole === SYSTEM_ROLES.ADMIN;
    }

    if (role === SYSTEM_ROLES.MODERATOR) {
      return userRole === SYSTEM_ROLES.ADMIN || userRole === SYSTEM_ROLES.MODERATOR;
    }

    if (role === SYSTEM_ROLES.SUPPORT) {
      return userRole === SYSTEM_ROLES.ADMIN || userRole === SYSTEM_ROLES.MODERATOR || userRole === SYSTEM_ROLES.SUPPORT;
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
    const userRole = user.role || (user.login === 'admin' ? 'admin' : 'user');
    return userRole === SYSTEM_ROLES.ADMIN || userRole === SYSTEM_ROLES.MODERATOR;
  }

  /**
   * Checks if the user is an administrator.
   */
  isAdmin(user: AppUser | null): boolean {
    if (!user) return false;
    const userRole = user.role || (user.login === 'admin' ? 'admin' : 'user');
    return userRole === SYSTEM_ROLES.ADMIN;
  }
}

export const permissionService: PermissionService = new PermissionServiceImpl();
