import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';
import { PlatformNotification } from './notificationTypes';
import { NotificationList } from './NotificationList';
import { AppUser } from '../../types';

interface NotificationCenterProps {
  notifications: PlatformNotification[];
  users?: AppUser[];
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onNotificationClick: (notification: PlatformNotification) => void;
  onMarkAllRead: () => void;
  onOpenFullPage: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  users = [],
  unreadCount,
  isOpen,
  onToggle,
  onClose,
  onNotificationClick,
  onMarkAllRead,
  onOpenFullPage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const previewItems = notifications.slice(0, 8);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={onToggle}
        className="relative p-1.5 rounded-full hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-all"
        aria-label="Уведомления"
      >
        <Bell
          size={20}
          className={`text-zinc-600 hover:text-zinc-900 cursor-pointer transition-colors ${
            unreadCount > 0 ? 'text-zinc-900 font-semibold' : ''
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-[#EF4444] text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center leading-none shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-[360px] bg-white rounded-2xl shadow-xl border border-zinc-100 z-[100] overflow-hidden"
          >
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center gap-2">
              <span className="text-xs font-bold text-zinc-900">Уведомления</span>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-[11px] text-[#4F7DF3] hover:underline font-bold transition-colors cursor-pointer"
                  >
                    Прочитать все
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullPage();
                  }}
                  className="text-[11px] text-[#4F7DF3] hover:underline font-bold transition-colors cursor-pointer"
                >
                  Все уведомления
                </button>
              </div>
            </div>

            <NotificationList
              notifications={previewItems}
              users={users}
              onNotificationClick={onNotificationClick}
              compact
              maxHeight="360px"
              emptyMessage="Новых уведомлений нет"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
