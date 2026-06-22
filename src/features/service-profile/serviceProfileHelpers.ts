import { AppUser } from '../../types';

export const SERVICE_PROFILE_DISCLAIMER =
  'Эта страница используется в служебных целях.';

export function isServiceProfileUser(user?: AppUser | null): boolean {
  return !!user?.isServiceProfile;
}

export function shouldShowServiceMessageButton(user?: AppUser | null): boolean {
  return !!user?.isServiceProfile && !!user?.showServiceMessageButton;
}

export function splitUserName(name?: string): { firstName: string; lastName: string } {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function toggleServiceProfile(user: AppUser): AppUser {
  return { ...user, isServiceProfile: !user.isServiceProfile };
}
