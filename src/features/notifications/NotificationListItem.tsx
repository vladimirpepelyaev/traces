import React from 'react';
import { PlatformNotification } from './notificationTypes';
import { formatRelativeTime } from './notificationHelpers';

interface NotificationAvatarProps {
  name: string;
  avatarUrl?: string;
  className?: string;
}

const NotificationAvatar: React.FC<NotificationAvatarProps> = ({
  name,
  avatarUrl,
  className = 'w-9 h-9',
}) => {
  const seed = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 5000;
  }, [name]);

  return (
    <div
      className={`bg-[#e1e5eb] flex items-center justify-center overflow-hidden shrink-0 rounded-full border border-[#dce1e6] ${className}`}
    >
      <img
        src={avatarUrl || `https://picsum.photos/seed/${seed}/150/150`}
        alt=""
        className="w-full h-full object-cover rounded-full"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

interface NotificationListItemProps {
  notification: PlatformNotification;
  onClick: (notification: PlatformNotification) => void;
  compact?: boolean;
}

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
  notification,
  onClick,
  compact = false,
}) => (
  <button
    type="button"
    onClick={() => onClick(notification)}
    className={`w-full text-left flex gap-3 transition-all hover:bg-[#fafbfc] border-b border-[#f0f2f5] last:border-0 ${
      compact ? 'p-2.5' : 'p-3.5'
    } ${!notification.isRead ? 'bg-[#eef3f8]/70' : 'bg-white'}`}
  >
    <div className="relative shrink-0">
      <NotificationAvatar
        name={notification.actorName}
        avatarUrl={notification.actorAvatar}
        className={compact ? 'w-8 h-8' : 'w-9 h-9'}
      />
      {!notification.isRead && (
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#5181b8] rounded-full border-2 border-white" />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div
        className={`text-[12.5px] leading-snug ${
          !notification.isRead ? 'font-semibold text-[#2c2d2e]' : 'font-medium text-[#2c2d2e]'
        }`}
      >
        {notification.title}
      </div>
      <div className="text-[11.5px] text-[#818c99] mt-0.5 line-clamp-2">{notification.message}</div>
      <div className="text-[10.5px] text-[#99a2ad] mt-1">
        {formatRelativeTime(notification.createdAt)}
      </div>
    </div>
  </button>
);
