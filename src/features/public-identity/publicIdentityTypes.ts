export type AvatarMode = 'default' | 'custom' | 'hidden';
export type ProfileMode = 'open' | 'minimal' | 'anonymous';

export interface PublicProfileSettings {
  displayName?: string;
  bio?: string;
  avatarMode: AvatarMode;
  showAvatar: boolean;
  showName: boolean;
  showActivity: boolean;
  showJoinedDate: boolean;
  showFollowing: boolean;
  showDiscussions: boolean;
  showProfilePhotoInFeed: boolean;
  profileMode: ProfileMode;
  identityHint?: string;
}

export const DEFAULT_PUBLIC_SETTINGS: PublicProfileSettings = {
  avatarMode: 'default',
  showAvatar: true,
  showName: true,
  showActivity: true,
  showJoinedDate: true,
  showFollowing: true,
  showDiscussions: true,
  showProfilePhotoInFeed: true,
  profileMode: 'open'
};

/**
 * Projects a system user through their public profile settings to create a rendered public view.
 */
export function getRenderedUser(user: any, settings?: PublicProfileSettings) {
  if (!user) return null;
  if (!settings) return user;

  const isAnonymous = settings.profileMode === 'anonymous';
  const isMinimal = settings.profileMode === 'minimal';
  const showName = !isAnonymous && settings.showName !== false;
  const showAvatar = !isAnonymous && settings.showAvatar !== false && settings.avatarMode !== 'hidden';

  return {
    ...user,
    publicSettings: settings,
    name: showName ? (settings.displayName || user.name) : 'Автор скрыт',
    avatar: showAvatar ? (settings.avatarMode === 'custom' && settings.identityHint ? settings.identityHint : user.avatar) : '',
    status: isAnonymous ? 'Профиль скрыт настройками приватности' : (settings.bio || user.status),
    regDate: (settings.showJoinedDate === false || isAnonymous || isMinimal) ? 'Скрыта' : user.regDate
  };
}
