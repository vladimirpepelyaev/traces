import { AppUser, Complaint, ModeratorAction } from '../../types';
import { permissionService } from '../../services/permission/PermissionService';

/**
 * Moderation Badge Threshold Constants
 */
export const PASSWORD_CHANGED_BADGE_DAYS = 7;
export const NEW_USER_BADGE_DAYS = 7;

export interface ModerationBadgeContext {
  users: AppUser[];
  moderatorHistory: ModeratorAction[];
  securityLogs: any[];
  complaints?: Complaint[];
  dialogComplaints?: any[];
  pageComplaints?: Complaint[];
}

export interface UserBadges {
  passwordChanged: boolean;
  isStaff: boolean;
  isVerified: boolean;
  hasBlockHistory: boolean;
  isNewUser: boolean;
}

export interface BadgeDefinition {
  id: keyof UserBadges;
  label: string;
  tooltip: string;
  ariaLabel: string;
  iconType: 'lock' | 'wrench' | 'check' | 'ban' | 'horse';
  badgeStyle: {
    bg: string;
    border: string;
    text: string;
  };
}

export const BADGE_DEFINITIONS: Record<keyof UserBadges, BadgeDefinition> = {
  passwordChanged: {
    id: 'passwordChanged',
    label: 'Пароль изменён',
    tooltip: '🔒 Пароль изменён недавно',
    ariaLabel: 'Пароль изменён недавно (менее 7 дней)',
    iconType: 'lock',
    badgeStyle: {
      bg: 'bg-[#fffbeb]',
      border: 'border-[#fde68a]',
      text: 'text-[#d97706]'
    }
  },
  isStaff: {
    id: 'isStaff',
    label: 'Сотрудник',
    tooltip: '🔑 Сотрудник платформы',
    ariaLabel: 'Автор — сотрудник с правами на сайте',
    iconType: 'wrench',
    badgeStyle: {
      bg: 'bg-[#eff6ff]',
      border: 'border-[#bfdbfe]',
      text: 'text-[#3b82f6]'
    }
  },
  isVerified: {
    id: 'isVerified',
    label: 'Верифицирован',
    tooltip: '✓ Пользователь верифицирован',
    ariaLabel: 'Подтверждённый статус верификации',
    iconType: 'check',
    badgeStyle: {
      bg: 'bg-[#f0fdf4]',
      border: 'border-[#bbf7d0]',
      text: 'text-[#16a34a]'
    }
  },
  hasBlockHistory: {
    id: 'hasBlockHistory',
    label: 'Блокировки в истории',
    tooltip: '⊘ Ранее была блокировка',
    ariaLabel: 'В истории жалоб уже есть завершённые блокировки',
    iconType: 'ban',
    badgeStyle: {
      bg: 'bg-[#fef2f2]',
      border: 'border-[#fecaca]',
      text: 'text-[#dc2626]'
    }
  },
  isNewUser: {
    id: 'isNewUser',
    label: 'Новый аккаунт',
    tooltip: '♞ Пользователь зарегистрирован менее недели назад',
    ariaLabel: 'Свежая регистрация (менее 7 дней)',
    iconType: 'horse',
    badgeStyle: {
      bg: 'bg-[#faf5ff]',
      border: 'border-[#e9d5ff]',
      text: 'text-[#9333ea]'
    }
  }
};

/**
 * Parses various date formats (ISO string, DD.MM.YYYY, timestamp) safely
 */
function parseDateSafely(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    // Try standard parse
    const standardDate = new Date(val);
    if (!isNaN(standardDate.getTime())) return standardDate;

    // Try DD.MM.YYYY or DD/MM/YYYY
    const parts = val.trim().split(/[./-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }
  return null;
}

/**
 * Pure calculation of dynamic moderation risk badges for a user.
 * Avoids N+1 queries by operating on in-memory / pre-fetched context.
 */
export function calculateUserBadges(
  userId: string,
  userName: string,
  context: ModerationBadgeContext
): UserBadges {
  const targetUser = context.users?.find(
    u => u.id === userId || u.name === userName || (u.login && u.login === userName)
  );

  const nowMs = Date.now();
  const msInDay = 24 * 60 * 60 * 1000;

  // 1. Password Changed Badge (< 7 days)
  let passwordChanged = false;
  const userPasswordChangeDate = parseDateSafely(
    (targetUser as any)?.passwordChangedAt ||
    (targetUser as any)?.password_changed_at ||
    (targetUser?.publicSettings as any)?.password_changed_at
  );

  if (userPasswordChangeDate) {
    const diffDays = (nowMs - userPasswordChangeDate.getTime()) / msInDay;
    if (diffDays >= 0 && diffDays < PASSWORD_CHANGED_BADGE_DAYS) {
      passwordChanged = true;
    }
  }

  // Also check security logs for password change events
  if (!passwordChanged && context.securityLogs && context.securityLogs.length > 0) {
    const hasRecentPasswordLog = context.securityLogs.some(log => {
      const logUser = log.user || log.userName || '';
      const matchesUser =
        logUser.includes(userName) ||
        logUser.includes(userId) ||
        (targetUser?.login && logUser.includes(targetUser.login));

      if (!matchesUser) return false;

      const eventText = (log.event || '').toLowerCase();
      const isPasswordEvent =
        eventText.includes('парол') ||
        eventText.includes('password') ||
        eventText.includes('сброс');

      if (!isPasswordEvent) return false;

      const logDate = parseDateSafely(log.created_at || log.timestamp || log.date);
      if (logDate) {
        const diffDays = (nowMs - logDate.getTime()) / msInDay;
        return diffDays >= 0 && diffDays < PASSWORD_CHANGED_BADGE_DAYS;
      }
      // If log has no timestamp, default to recent if status is success/active
      return true;
    });

    if (hasRecentPasswordLog) {
      passwordChanged = true;
    }
  }

  // 2. Staff Member Badge
  // Use platform's existing role/permission system without arbitrary crutches
  const isStaff = !!(
    targetUser && (
      targetUser.isEmployee === true ||
      targetUser.isSuperAdmin === true ||
      permissionService.isSuperAdmin(targetUser) ||
      permissionService.isAdmin(targetUser) ||
      permissionService.canModerate(targetUser) ||
      ['super_admin', 'superadmin', 'admin', 'moderator', 'moderation', 'support', 'staff'].includes(targetUser.role || '') ||
      (targetUser.roleList && targetUser.roleList.some(r => ['super_admin', 'admin', 'moderator', 'support', 'staff'].includes(r))) ||
      (targetUser.employeePermissions && Object.values(targetUser.employeePermissions).some(Boolean)) ||
      (targetUser.roles && typeof targetUser.roles === 'object' && (
        targetUser.roles.moderation ||
        targetUser.roles.support ||
        targetUser.roles.pro ||
        targetUser.roles.spam
      ))
    )
  );

  // 3. Verified Status Badge
  // Check verified status of account specifically; do not treat staff as verified by default
  const isVerified = !!(
    targetUser && (
      targetUser.isVerified === true ||
      (targetUser.publicSettings && (targetUser.publicSettings as any).is_verified === true) ||
      (targetUser as any).verified === true
    )
  );

  // 4. History of Blocks Badge
  // Check history of moderation decisions/complaints, not just current blocked state
  const hasHistoryInLogs = (context.moderatorHistory || []).some(m => {
    const isTarget =
      m.targetId === userId ||
      m.targetName === userName ||
      (targetUser && m.targetId === targetUser.id);
    if (!isTarget) return false;

    const actionText = ((m.action || '') + ' ' + (m.message || '') + ' ' + ((m as any).details || '') + ' ' + (m.result || '')).toLowerCase();
    return (
      actionText.includes('блок') ||
      actionText.includes('ban') ||
      m.result === 'blocked'
    );
  });

  const hasDialogBlockHistory = (context.dialogComplaints || []).some(d => {
    const isTarget = d.offenderId === userId || d.offenderName === userName;
    return isTarget && ((d.violationHistory?.blocksCount || 0) > 0 || (d.violationHistory?.bansCount || 0) > 0);
  });

  const hasUserBlockRecord = !!(
    targetUser?.profileBlockInfo ||
    targetUser?.blockReason ||
    (targetUser as any)?.banHistory?.length > 0 ||
    (targetUser as any)?.bans?.length > 0 ||
    targetUser?.complaintHistory?.some(h =>
      (h.decision && h.decision.toLowerCase().includes('блок')) ||
      (h as any).result === 'blocked'
    )
  );

  const hasBlockHistory = hasHistoryInLogs || hasDialogBlockHistory || hasUserBlockRecord;

  // 5. New User Badge (< 7 days)
  let isNewUser = false;
  const regDate = parseDateSafely(
    (targetUser as any)?.created_at ||
    (targetUser as any)?.createdAt ||
    targetUser?.regDate
  );

  if (regDate) {
    const diffDays = (nowMs - regDate.getTime()) / msInDay;
    if (diffDays >= 0 && diffDays < NEW_USER_BADGE_DAYS) {
      isNewUser = true;
    }
  }

  return {
    passwordChanged,
    isStaff,
    isVerified,
    hasBlockHistory,
    isNewUser
  };
}
