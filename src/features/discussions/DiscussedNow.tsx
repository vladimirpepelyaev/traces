import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, MoreHorizontal, User } from 'lucide-react';
import { FeedPost } from '../../types';
import { POST_FORMATS } from '../post-format/postFormatTypes';
import { formatRelativeTime } from '../notifications/notificationHelpers';
import { getProfileTheme } from '../../constants/themes';

interface DiscussedNowProps {
  feedPosts: FeedPost[];
  currentUser: any;
  users: any[];
  setFeedPosts: React.Dispatch<React.SetStateAction<FeedPost[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
  addNotification: (title: string, message: string) => void;
  onUserSelect?: (user: any) => void;
  onPostSelect?: (postId: string) => void;
}

const VerifiedBadge = ({ size = 15, className = "" }: { size?: number; className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`shrink-0 inline-block align-middle select-none text-[#5181b8] ${className}`}
      title="Верифицированный аккаунт"
      style={{ verticalAlign: 'middle', display: 'inline-block' }}
    >
      <path 
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" 
        fill="currentColor"
      />
      <path 
        d="M9 12.5l2 2 4.5-4.5" 
        stroke="white" 
        strokeWidth="3.2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

const LocalAvatar = ({ name, avatarUrl, className = "w-6 h-6" }: { name: string; avatarUrl?: string; className?: string }) => {
  const seed = useMemo(() => {
    const key = name || "default";
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 5000;
  }, [name]);

  return (
    <div className={`bg-gray-200 flex items-center justify-center overflow-hidden shrink-0 rounded-full border border-gray-200 ${className}`} style={{ borderRadius: '50%' }}>
      <img
        src={avatarUrl || `https://picsum.photos/seed/${seed}/150/150`}
        alt="avatar"
        className="w-full h-full object-cover rounded-full"
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${seed}/150/150`;
        }}
      />
    </div>
  );
};

function getPostDisplayTime(timestamp: string | undefined): string {
  if (!timestamp) return 'только что';
  if (timestamp === 'только что') return 'только что';
  
  if (
    timestamp.includes('минут') || 
    timestamp.includes('секунд') || 
    timestamp.includes('назад') || 
    timestamp.includes('вчера') || 
    timestamp.includes('только что') ||
    timestamp.includes('мин.') ||
    timestamp.includes('ч.') ||
    timestamp.includes('дн.')
  ) {
    return timestamp;
  }

  try {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return formatRelativeTime(d);
    }
  } catch (e) {}

  return timestamp;
}

function getCommentDisplayTime(timestamp: string | undefined): string {
  return getPostDisplayTime(timestamp);
}

const isWithinLast7Days = (timestamp: string): boolean => {
  if (!timestamp) return false;
  if (
    timestamp.includes('минут') ||
    timestamp.includes('секунд') ||
    timestamp.includes('назад') ||
    timestamp.includes('вчера') ||
    timestamp.includes('только что') ||
    timestamp.includes('мин.') ||
    timestamp.includes('ч.') ||
    timestamp.includes('дн.')
  ) {
    return true;
  }
  try {
    const postDate = new Date(timestamp);
    if (!isNaN(postDate.getTime())) {
      const diffMs = Date.now() - postDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }
  } catch (e) {}
  return false;
};

const getPostRating = (post: FeedPost): number => {
  return (post.likes || 0) + (post.boostedUsers?.length || 0) * 20;
};

export const DiscussedNow: React.FC<DiscussedNowProps> = ({
  feedPosts = [],
  users = [],
  onUserSelect,
}) => {

  const topPosts = useMemo(() => {
    // Sort posts by rating descending
    const sortedPosts = [...feedPosts].sort((a, b) => getPostRating(b) - getPostRating(a));
    
    // Filter by last 7 days
    const recentPosts = sortedPosts.filter(p => isWithinLast7Days(p.timestamp));
    
    // If we have at least 5 recent posts, return top 5
    if (recentPosts.length >= 5) {
      return recentPosts.slice(0, 5);
    }
    
    // Otherwise, fallback: take all recent ones, and fill the rest from other top sorted posts
    const result = [...recentPosts];
    const recentIds = new Set(recentPosts.map(p => p.id));
    
    for (const p of sortedPosts) {
      if (result.length >= 5) break;
      if (!recentIds.has(p.id)) {
        result.push(p);
      }
    }
    
    return result.slice(0, 5);
  }, [feedPosts]);

  const getTopComments = (post: FeedPost) => {
    const comments = post.comments || [];
    
    const types: ('continue_thought' | 'disagree' | 'share_experience')[] = [
      'continue_thought',
      'disagree',
      'share_experience'
    ];
    
    const result: typeof comments = [];
    
    types.forEach(type => {
      const filtered = comments.filter(c => c.type === type);
      if (filtered.length > 0) {
        const sorted = [...filtered].sort((a, b) => {
          const upvotesA = a.firesCount || 0;
          const upvotesB = b.firesCount || 0;
          if (upvotesA !== upvotesB) {
            return upvotesB - upvotesA;
          }
          const lenA = a.text?.length || 0;
          const lenB = b.text?.length || 0;
          return lenB - lenA;
        });
        result.push(sorted[0]);
      }
    });
    
    return result;
  };

  const getTypeBadge = (type?: 'continue_thought' | 'disagree' | 'share_experience') => {
    if (type === 'continue_thought') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-[3px] border border-teal-100">
          🌿 Продолжение мысли
        </span>
      );
    }
    if (type === 'disagree') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-[3px] border border-rose-100">
          ⚖️ Другая точка зрения
        </span>
      );
    }
    if (type === 'share_experience') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-[3px] border border-sky-100">
          💬 Опыт из жизни
        </span>
      );
    }
    return null;
  };

  const getCommentStyle = (type?: 'continue_thought' | 'disagree' | 'share_experience') => {
    if (type === 'continue_thought') return 'border-l-2 border-teal-500 bg-teal-50/20 pl-2.5 py-1 rounded-r';
    if (type === 'disagree') return 'border-l-2 border-rose-400 bg-rose-50/20 pl-2.5 py-1 rounded-r';
    if (type === 'share_experience') return 'border-l-2 border-sky-400 bg-sky-50/20 pl-2.5 py-1 rounded-r';
    return 'pl-1';
  };

  return (
    <div className="space-y-6 font-sans max-w-[720px] mx-auto pb-16 px-1" id="discussed-now-container">
      {/* Header section */}
      <div className="bg-white border border-[#e7e8ec] rounded-[2px] p-6 shadow-none relative overflow-hidden">
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight font-sans">Это обсуждают</h1>
        <p className="text-[#818c99] text-[13px] leading-relaxed font-sans font-medium mt-1">
          Подборка пяти лучших публикаций из ленты за последнюю неделю с наиболее активным обсуждением и высокой оценкой.
        </p>
      </div>

      {/* List of top 5 posts */}
      <div className="flex flex-col gap-4">
        {topPosts.length === 0 ? (
          <p className="text-[14px] italic text-[#818c99] text-center bg-white border border-[#e7e8ec] rounded-[2px] p-8">
            Нет активных обсуждений за последнюю неделю.
          </p>
        ) : (
          topPosts.map(post => {
            const authorUser = users.find(u => u.name === post.authorName);
            const resolvedAuthor = authorUser 
              ? { name: authorUser.name, avatar: authorUser.avatar, isVerified: authorUser.isVerified } 
              : { name: post.authorName, avatar: post.authorAvatar, isVerified: false };

            const isFeedAnonymous = authorUser?.publicSettings?.profileMode === 'anonymous';
            const isPhotoInFeedHidden = authorUser?.publicSettings?.showProfilePhotoInFeed === false;

            const displayAuthorName = resolvedAuthor?.name || post.authorName;
            const renderedAvatarUrl = (isFeedAnonymous || isPhotoInFeedHidden || !resolvedAuthor?.avatar) ? '' : resolvedAuthor.avatar;

            const textStr = post.text?.trim() || '';
            const hasHtml = /<[a-z][\s\S]*>/i.test(textStr);
            const textClass = 'text-[14.5px] text-[#2c2d30] font-normal leading-relaxed';

            const formatInfo = POST_FORMATS.find(f => f.id === (post.postFormat || 'OPINION')) || POST_FORMATS[1];
            const formatBadgeEl = (
              <span className="inline-flex items-center justify-center rounded-[5px] text-[9.5px] font-bold uppercase tracking-tight border bg-zinc-50 border-zinc-200/80 text-zinc-500 whitespace-nowrap px-1.5 py-0.5 select-none align-middle mr-1.5 leading-none font-sans select-none">
                {formatInfo.label}
              </span>
            );

            const bestComments = getTopComments(post);
            const cardBgColor = getProfileTheme(authorUser);

            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: cardBgColor }}
                className="bg-white border border-[#e7e8ec] rounded-[12px] p-4 flex flex-col gap-3.5 shadow-none overflow-hidden"
              >
                {/* Author row */}
                <div className="flex items-center justify-between font-sans select-none">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      onClick={() => {
                        if (authorUser && onUserSelect) onUserSelect(authorUser);
                      }} 
                      className="w-10 h-10 rounded-full overflow-hidden border border-zinc-150 cursor-pointer shrink-0"
                    >
                      {renderedAvatarUrl ? (
                        <img 
                          src={renderedAvatarUrl} 
                          alt={displayAuthorName} 
                          className="w-full h-full object-cover rounded-full grayscale-[12%] opacity-90" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-[10px]">👤</div>
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 leading-tight">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                          onClick={() => {
                            if (authorUser && onUserSelect) onUserSelect(authorUser);
                          }} 
                          className="text-[13.5px] font-bold text-zinc-800 hover:text-blue-500 cursor-pointer transition-colors truncate max-w-[150px]"
                        >
                          {displayAuthorName}
                        </span>
                        {!isFeedAnonymous && resolvedAuthor.isVerified && <VerifiedBadge size={13.5} className="text-[#5181b8] shrink-0" />}
                        {isFeedAnonymous && (
                          <span className="text-[8.5px] bg-[#f4f4f5]/5 ml-0.5 text-zinc-400 font-normal px-1 rounded border border-zinc-150/40">анонимно</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                        <span>{getPostDisplayTime(post.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-center shrink-0">
                    <button className="p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-650 rounded transition-colors">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* Text section */}
                <div className="text-left select-text font-sans flex flex-col gap-2">
                  <div className="text-left select-text leading-relaxed">
                    {hasHtml ? (
                      <div 
                        className={`rich-text-content leading-relaxed transition-all prose prose-slate max-w-none text-left select-text ${textClass}`}
                        dangerouslySetInnerHTML={{ __html: textStr }}
                      />
                    ) : (
                      <p className={`whitespace-pre-line leading-relaxed transition-all select-text ${textClass}`}>
                        {formatBadgeEl}
                        <span className="align-middle select-text">{textStr}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Attachments if any */}
                {post.image && (
                  <div className="border-y border-zinc-150 bg-[#fafafa] overflow-hidden max-h-[300px] flex items-center justify-center select-none">
                    {post.image.startsWith('http') ? (
                      <img 
                        src={post.image} 
                        className="w-full object-cover max-h-[300px]" 
                        alt="Вложение" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="bg-zinc-100 flex items-center justify-center overflow-hidden relative w-full aspect-video">
                        <img 
                          src={`https://picsum.photos/seed/${post.id}/600/400`} 
                          alt="placeholder" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Best Opinions Section */}
                <div className="px-4 pb-2 border-t border-[#f2f3f5] mt-2 pt-4 space-y-4">
                  <h4 className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider select-none font-sans flex items-center gap-1.5">
                    <span>Лучшие мнения</span>
                  </h4>

                  {bestComments.length === 0 ? (
                    <p className="text-[11.5px] italic text-[#818c99] pl-1">Мнения по данной публикации еще не опубликованы.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {bestComments.map(comment => {
                        const commentUser = users.find(u => u.name === comment.authorName);
                        return (
                          <div 
                            key={comment.id} 
                            className="flex gap-2.5 items-start"
                          >
                            <div 
                              onClick={() => {
                                if (commentUser && onUserSelect) onUserSelect(commentUser);
                              }} 
                              className="cursor-pointer shrink-0"
                            >
                              <LocalAvatar name={comment.authorName} avatarUrl={comment.authorAvatar} className="w-6.5 h-6.5" />
                            </div>
                            <div className={`grow text-[12.5px] flex flex-col gap-0.5 ${getCommentStyle(comment.type)}`}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  onClick={() => {
                                    if (commentUser && onUserSelect) onUserSelect(commentUser);
                                  }}
                                  className="font-bold text-[#2a5885] cursor-pointer hover:underline"
                                >
                                  {comment.authorName}
                                </span>
                                {getTypeBadge(comment.type)}
                                <span className="text-[10px] text-[#818c99]">{getCommentDisplayTime(comment.timestamp)}</span>
                              </div>
                              <p className="text-[#2c2d2e] leading-relaxed select-text font-normal">{comment.text}</p>

                              {/* Static Read-only reactions */}
                              {(comment.firesCount && comment.firesCount > 0) ? (
                                <div className="mt-1.5 flex items-center gap-2 select-none font-sans">
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-zinc-50 border border-zinc-200 text-zinc-500">
                                    <span className="align-middle">⬆️</span>
                                    <span className="align-middle">{comment.firesCount}</span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
