import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { AppUser } from '../../types';
import { ServiceProfileBadge } from './ServiceProfileBadge';
import { SERVICE_PROFILE_DISCLAIMER, splitUserName } from './serviceProfileHelpers';

interface ServiceProfileViewProps {
  user: AppUser;
  isOwnProfile: boolean;
  renderAvatar: (user: AppUser, className: string) => React.ReactNode;
  onWriteMessage?: () => void;
}

export const ServiceProfileView: React.FC<ServiceProfileViewProps> = ({
  user,
  isOwnProfile,
  renderAvatar,
  onWriteMessage,
}) => {
  const { firstName, lastName } = splitUserName(user.name);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="bg-vk-white border border-vk-separator rounded-[2px] overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[#5181b8] via-[#4a76a8] to-[#2a5885]" />
        <div className="p-8 flex flex-col items-center text-center max-w-xl mx-auto">
          <div className="mb-4">
            <ServiceProfileBadge size="md" />
          </div>

          <div className="w-[140px] h-[140px] shrink-0 overflow-hidden rounded-full border-2 border-[#dce1e6] flex items-center justify-center bg-[#f2f3f5] mb-5">
            {renderAvatar(user, 'w-full h-full')}
          </div>

          <div className="space-y-1">
            {firstName && (
              <h1 className="text-[22px] font-semibold text-[#2c2d2e] leading-tight">{firstName}</h1>
            )}
            {lastName && (
              <p className="text-[18px] font-medium text-[#55677d] leading-tight">{lastName}</p>
            )}
            {!firstName && !lastName && (
              <h1 className="text-[22px] font-semibold text-[#2c2d2e]">Служебный профиль</h1>
            )}
          </div>

          <p className="mt-5 text-[13px] text-[#656565] leading-relaxed max-w-sm">
            {SERVICE_PROFILE_DISCLAIMER}
          </p>

          {!isOwnProfile && onWriteMessage && (
            <button
              type="button"
              onClick={onWriteMessage}
              className="mt-6 px-4 py-2 bg-[#5181b8] text-white hover:bg-[#5b88bd] rounded-[4px] text-[12.5px] font-medium transition-colors inline-flex items-center gap-2"
            >
              <MessageSquare size={14} />
              <span>Написать сообщение</span>
            </button>
          )}

          {isOwnProfile && (
            <p className="mt-6 text-[12px] text-[#818c99]">
              Это ваш служебный профиль. Публикации и социальные функции недоступны.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
