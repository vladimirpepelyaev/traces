import React, { useMemo } from 'react';
import { ContributionMetricsService } from './ContributionMetricsService';
import { ContributionDataSources } from './contributionTypes';
import { PublicProfileSettings } from '../public-identity/publicIdentityTypes';
import { Lock } from 'lucide-react';

interface AboutUserBlockProps {
  profileDescription?: string;
  regDate?: string;
  isBlocked?: boolean;
  sources: ContributionDataSources;
  showJoinedDate?: boolean;
  publicSettings?: PublicProfileSettings;
}

function formatActivityDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  if (hours < 48) return 'вчера';
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AboutUserBlock: React.FC<AboutUserBlockProps> = ({
  profileDescription,
  regDate,
  isBlocked,
  sources,
  showJoinedDate = true,
  publicSettings,
}) => {
  const metrics = useMemo(
    () => ContributionMetricsService.calculateAll(sources),
    [sources]
  );

  const likesReceived = useMemo(() => {
    return sources.posts.reduce((sum, post) => sum + (post.likes || 0), 0);
  }, [sources.posts]);

  const commentsCountOnPosts = useMemo(() => {
    return sources.posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
  }, [sources.posts]);

  // "Полезность" (Utility): Count of reactions ▲ and comments on author's posts
  const utilityCount = useMemo(() => {
    return likesReceived + commentsCountOnPosts;
  }, [likesReceived, commentsCountOnPosts]);

  // "Внимание" (Attention): Profile views showing community interest
  const profileVisitsCount = useMemo(() => {
    return metrics.details?.attention?.profileVisits || 0;
  }, [metrics.details?.attention?.profileVisits]);

  // "Вовлеченность" (Engagement): Comments & replies by the author in discussions
  const engagementCount = useMemo(() => {
    const authorCommentsCount = sources.commentsByUser?.length || 0;
    const statsReplies = metrics.details?.engagement?.repliesReceived || 0;
    return authorCommentsCount + statsReplies;
  }, [sources.commentsByUser, metrics.details?.engagement?.repliesReceived]);

  const isAnyPrivateFieldHidden = useMemo(() => {
    if (!publicSettings) return false;
    return (
      publicSettings.profileMode !== 'open' ||
      publicSettings.showAvatar === false ||
      publicSettings.showName === false ||
      publicSettings.showActivity === false ||
      publicSettings.showJoinedDate === false ||
      publicSettings.showFollowing === false ||
      publicSettings.showDiscussions === false ||
      publicSettings.avatarMode === 'hidden'
    );
  }, [publicSettings]);

  const description =
    profileDescription?.trim() ||
    (isBlocked ? 'Профиль ограничен модерацией платформы' : 'Участник сообщества Следы');

  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <p className="text-[13px] text-[#111827] leading-relaxed font-normal">{description}</p>
      </div>

      {/* Timestamps */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6B7280]">
        {showJoinedDate && regDate && (
          <div className="flex items-center gap-1">
            <span>Участник с:</span>
            <span className="font-semibold text-zinc-800">{regDate}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span>Последняя активность:</span>
          <span className="font-semibold text-zinc-800">{formatActivityDate(metrics.lastActivityAt)}</span>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-zinc-100" />

      {/* Instagram-style Stats Row for Mobile */}
      <div className="grid grid-cols-3 gap-2 py-3.5 border-y border-zinc-100 md:hidden text-center select-none bg-zinc-50/40 rounded-xl px-1">
        <div className="flex flex-col items-center justify-center">
          <span className="text-[17px] font-black text-zinc-950 leading-tight">{sources.posts.length}</span>
          <span className="text-[9.5px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Публикации</span>
        </div>
        <div className="flex flex-col items-center justify-center border-x border-zinc-200/50">
          <span className="text-[17px] font-black text-zinc-950 leading-tight">{sources.subscriberCount}</span>
          <span className="text-[9.5px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Подписчики</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[17px] font-black text-zinc-950 leading-tight">{utilityCount}</span>
          <span className="text-[9.5px] text-zinc-500 font-bold uppercase tracking-wider mt-1">Полезность</span>
        </div>
      </div>

      {/* Compact Narrative Metrics Cards in modern style for Desktop */}
      <div className="hidden md:grid grid-cols-3 gap-3 pt-1">
        {/* 1. Utility Card */}
        <div className="rounded-xl p-3 bg-[#F7F8FA]/60 border border-zinc-200/50 hover:border-zinc-300 transition-colors select-none text-left flex flex-col justify-between min-h-[82px]">
          <div className="text-[11px] text-[#6B7280] font-medium leading-tight">
            След оказался полезным
          </div>
          <div className="text-[18px] font-bold text-zinc-950 mt-1.5 flex items-baseline gap-1">
            <span>{utilityCount}</span>
            <span className="text-[11.5px] font-medium text-zinc-400">раз</span>
          </div>
        </div>

        {/* 2. Attention Card */}
        <div className="rounded-xl p-3 bg-[#F7F8FA]/60 border border-zinc-200/50 hover:border-zinc-300 transition-colors select-none text-left flex flex-col justify-between min-h-[82px]">
          <div className="text-[11px] text-[#6B7280] font-medium leading-tight">
            Профиль просмотрели
          </div>
          <div className="text-[18px] font-bold text-zinc-950 mt-1.5 flex items-baseline gap-1">
            <span>{profileVisitsCount}</span>
            <span className="text-[11.5px] font-medium text-zinc-400">раз</span>
          </div>
        </div>

        {/* 3. Engagement Card */}
        <div className="rounded-xl p-3 bg-[#F7F8FA]/60 border border-zinc-200/50 hover:border-zinc-300 transition-colors select-none text-left flex flex-col justify-between min-h-[82px]">
          <div className="text-[11px] text-[#6B7280] font-medium leading-tight">
            Участвовал в обсуждениях
          </div>
          <div className="text-[18px] font-bold text-zinc-950 mt-1.5 flex items-baseline gap-1">
            <span>{engagementCount}</span>
            <span className="text-[11.5px] font-medium text-zinc-400">раз</span>
          </div>
        </div>
      </div>

      {/* Compact modern privacy plate at the bottom of the block (supplementary info) */}
      {isAnyPrivateFieldHidden && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F7F8FA]/80 border border-zinc-150 rounded-xl text-[11px] text-zinc-500 select-none mt-2">
          <Lock size={12} className="text-zinc-400 shrink-0" />
          <span>Некоторая информация из профиля скрыта для других пользователей</span>
        </div>
      )}
    </div>
  );
};

