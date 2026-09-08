import React, { useState } from 'react';
import {
  Icon16LockOutline,
  Icon16WrenchOutline,
  Icon16CheckCircleOutline,
  Icon16CancelCircleOutline,
  Icon20HorseToyOutline
} from '@vkontakte/icons';
import { UserBadges, BADGE_DEFINITIONS } from '../../features/moderation/moderationBadges';

interface ModerationBadgesProps {
  badges: UserBadges;
  size?: 'sm' | 'md';
}

export const ModerationBadges: React.FC<ModerationBadgesProps> = ({ badges, size = 'md' }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const badgeItems = [
    {
      id: 'passwordChanged',
      active: badges.passwordChanged,
      def: BADGE_DEFINITIONS.passwordChanged,
      icon: <Icon16LockOutline width={16} height={16} />
    },
    {
      id: 'isStaff',
      active: badges.isStaff,
      def: BADGE_DEFINITIONS.isStaff,
      icon: <Icon16WrenchOutline width={16} height={16} />
    },
    {
      id: 'isVerified',
      active: badges.isVerified,
      def: BADGE_DEFINITIONS.isVerified,
      icon: <Icon16CheckCircleOutline width={16} height={16} />
    },
    {
      id: 'hasBlockHistory',
      active: badges.hasBlockHistory,
      def: BADGE_DEFINITIONS.hasBlockHistory,
      icon: <Icon16CancelCircleOutline width={16} height={16} />
    },
    {
      id: 'isNewUser',
      active: badges.isNewUser,
      def: BADGE_DEFINITIONS.isNewUser,
      icon: <Icon20HorseToyOutline width={17} height={17} />
    }
  ];

  // Filter to active badges according to requirements
  const visibleBadges = badgeItems.filter(item => item.active);

  if (visibleBadges.length === 0) {
    return null;
  }

  const boxSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visibleBadges.map(({ id, def, icon }) => (
        <div
          key={id}
          className="relative inline-flex items-center"
          onMouseEnter={() => setActiveTooltip(id)}
          onMouseLeave={() => setActiveTooltip(null)}
          tabIndex={0}
          role="img"
          aria-label={def.ariaLabel}
        >
          <div
            className={`${boxSize} rounded-[5px] border flex items-center justify-center cursor-help transition-transform hover:scale-105 select-none ${def.badgeStyle.bg} ${def.badgeStyle.border} ${def.badgeStyle.text}`}
          >
            {icon}
          </div>

          {/* Floating Tooltip with Smooth Transition */}
          {activeTooltip === id && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-[#2c2d2e] text-white text-[11.5px] font-medium px-2.5 py-1 rounded-[5px] shadow-lg whitespace-nowrap text-center leading-tight flex items-center gap-1">
                <span>{def.tooltip}</span>
              </div>
              {/* Arrow */}
              <div className="w-2 h-2 bg-[#2c2d2e] rotate-45 mx-auto -mt-1" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
