import React from 'react';
import { PlatformNotification } from './notificationTypes';
import { NotificationListItem } from './NotificationListItem';

interface NotificationListProps {
  notifications: PlatformNotification[];
  onNotificationClick: (notification: PlatformNotification) => void;
  emptyMessage?: string;
  compact?: boolean;
  maxHeight?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onNotificationClick,
  emptyMessage = 'Уведомлений пока нет',
  compact = false,
  maxHeight,
}) => {
  if (notifications.length === 0) {
    return (
      <div className="p-10 text-center text-[#818c99] text-[12.5px]">{emptyMessage}</div>
    );
  }

  return (
    <div
      className="overflow-y-auto"
      style={maxHeight ? { maxHeight } : undefined}
    >
      {notifications.map(notification => (
        <NotificationListItem
          key={notification.id}
          notification={notification}
          onClick={onNotificationClick}
          compact={compact}
        />
      ))}
    </div>
  );
};
