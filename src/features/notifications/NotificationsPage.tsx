import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bell } from 'lucide-react';
import {
  NOTIFICATION_FILTER_LABELS,
  NotificationFilter,
  PlatformNotification,
} from './notificationTypes';
import { NotificationList } from './NotificationList';
import { NotificationService } from './NotificationService';
import { AppUser } from '../../types';

interface NotificationsPageProps {
  notifications: PlatformNotification[];
  users?: AppUser[];
  userId: string;
  unreadCount: number;
  onNotificationClick: (notification: PlatformNotification) => void;
  onMarkAllRead: () => void;
}

const FILTERS: NotificationFilter[] = [
  'all',
  'replies',
  'mentions',
  'messages',
  'discussions',
  'subscriptions',
];

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  users = [],
  userId,
  unreadCount,
  onNotificationClick,
  onMarkAllRead,
}) => {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const filteredNotifications = NotificationService.getUserNotifications(
    notifications,
    userId,
    activeFilter
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="bg-white rounded-[2px] border border-[#dce1e6] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#eef3f8] flex items-center justify-center">
            <Bell size={20} className="text-[#5181b8]" />
          </div>
          <div>
            <h1 className="text-[17px] font-medium text-[#2c2d2e]">Уведомления</h1>
            <p className="text-[12px] text-[#818c99] mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} непрочитанных`
                : 'Все уведомления прочитаны'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-[12px] text-[#2a5885] hover:underline font-medium shrink-0"
          >
            Отметить все как прочитанные
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2px] border border-[#dce1e6] overflow-hidden">
        <div className="flex flex-wrap gap-1 p-2 border-b border-[#f0f2f5] bg-[#fafbfc]">
          {FILTERS.map(filter => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-[2px] text-[11.5px] font-medium transition-all ${
                activeFilter === filter
                  ? 'bg-[#5181b8] text-white'
                  : 'text-[#55677d] hover:bg-[#eef3f8]'
              }`}
            >
              {NOTIFICATION_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>

        <NotificationList
          notifications={filteredNotifications}
          users={users}
          onNotificationClick={onNotificationClick}
          emptyMessage={
            activeFilter === 'all'
              ? 'У вас пока нет уведомлений'
              : `Нет уведомлений в разделе «${NOTIFICATION_FILTER_LABELS[activeFilter]}»`
          }
        />
      </div>
    </motion.div>
  );
};
