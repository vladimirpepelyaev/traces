import React, { useState } from 'react';
import { Send, CornerDownRight, Bell, BellOff, Reply, Flame, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '../notifications/notificationHelpers';

function getCommentDisplayTime(timestamp: string | undefined): string {
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

interface LocalAvatarProps {
  name: string;
  avatarUrl?: string;
  className?: string;
}

const LocalAvatar: React.FC<LocalAvatarProps> = ({ name, avatarUrl, className = "w-6 h-6" }) => {
  const seed = React.useMemo(() => {
    const key = name || "default";
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 5000;
  }, [name]);

  return (
    <div className={`bg-gray-200 flex items-center justify-center overflow-hidden shrink-0 rounded-full border border-gray-200 ${className}`}>
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

export interface DiscussionComment {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
  type?: 'continue_thought' | 'disagree' | 'share_experience';
  parentCommentId?: string;
  firesCount?: number;
  negativeReactions?: number;
  positiveAttentionPct?: number;
  fireUsers?: { userId: string; userName: string; userAvatar?: string; timestamp?: string }[];
  negativeUsers?: { userId: string; userName: string; userAvatar?: string; timestamp?: string }[];
}

interface DiscussionCommentsProps {
  postId: string;
  comments: DiscussionComment[];
  onAddComment: (text: string, type?: 'continue_thought' | 'disagree' | 'share_experience', parentCommentId?: string) => void;
  isSubscribed?: boolean;
  onToggleSubscribe?: () => void;
  currentUser: any;
  users: any[];
  onUserSelect?: (user: any) => void;
  commentsDisabled?: boolean;
  commentsDisabledMessage?: string;
  onCommentReact?: (commentId: string, reactionType: 'up' | 'down') => void;
}

export const DiscussionComments: React.FC<DiscussionCommentsProps> = ({
  postId,
  comments = [],
  onAddComment,
  isSubscribed = false,
  onToggleSubscribe,
  currentUser,
  users = [],
  onUserSelect,
  commentsDisabled = false,
  commentsDisabledMessage = 'Служебные профили не могут участвовать в обсуждениях',
  onCommentReact,
}) => {
  const [commentText, setCommentText] = useState('');
  const [commentType, setCommentType] = useState<'continue_thought' | 'disagree' | 'share_experience'>('continue_thought');
  const [showAll, setShowAll] = useState(false);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);

  interface CommentNode {
    comment: typeof comments[0];
    depth: number;
  }

  const buildTree = (list: typeof comments): CommentNode[] => {
    const uniqueList: typeof list = [];
    const seenCommentIds = new Set<string>();
    list.forEach(c => {
      if (c && c.id && !seenCommentIds.has(c.id)) {
        seenCommentIds.add(c.id);
        uniqueList.push(c);
      }
    });

    const result: CommentNode[] = [];
    const map = new Map<string, typeof comments[0]>();
    uniqueList.forEach(c => map.set(c.id, c));

    const childrenMap = new Map<string, typeof comments[0][]>();
    uniqueList.forEach(c => {
      if (c.parentCommentId) {
        const arr = childrenMap.get(c.parentCommentId) || [];
        arr.push(c);
        childrenMap.set(c.parentCommentId, arr);
      }
    });

    const roots = uniqueList.filter(c => !c.parentCommentId || !map.has(c.parentCommentId));

    const traverse = (node: typeof comments[0], depth: number) => {
      result.push({ comment: node, depth });
      const children = childrenMap.get(node.id) || [];
      children.forEach(child => traverse(child, depth + 1));
    };

    roots.forEach(root => traverse(root, 0));
    return result;
  };

  const flatNodes = buildTree(comments);
  const displayedNodes = showAll ? flatNodes : flatNodes.slice(-4);
  const replyTarget = replyToCommentId ? comments.find(c => c.id === replyToCommentId) : null;

  const handleSend = () => {
    if (commentsDisabled || !commentText.trim()) return;
    onAddComment(commentText.trim(), commentType, replyToCommentId || undefined);
    setCommentText('');
    setReplyToCommentId(null);
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
    <div className="px-4 pb-4 border-t border-[#f2f3f5] mt-1 pt-3.5 space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11.5px] font-medium text-zinc-500 flex items-center gap-1 select-none leading-none">
          <CornerDownRight size={13} className="text-zinc-400" />
          Комментарии и ветки ({comments.length})
        </h3>
        <div className="flex items-center gap-2">
          {onToggleSubscribe && (
            <button
              type="button"
              onClick={onToggleSubscribe}
              className={`flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-[3px] border transition-all ${
                isSubscribed
                  ? 'bg-[#eef3f8] text-[#2a5885] border-[#c5d3e0]'
                  : 'bg-white text-[#818c99] border-[#dce1e6] hover:bg-[#fafbfc]'
              }`}
            >
              {isSubscribed ? <Bell size={11} /> : <BellOff size={11} />}
              {isSubscribed ? 'Подписаны' : 'Подписаться'}
            </button>
          )}
          {comments.length > 4 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[11px] text-[#2a5885] hover:underline font-semibold"
            >
              {showAll ? 'Скрыть лишнее' : `Показать все (${comments.length})`}
            </button>
          )}
        </div>
      </div>
      


      {comments.length === 0 ? (
        <p className="text-[11.5px] italic text-[#818c99] pl-3">Диалог еще не начат. Поделитесь вашим ходом мысли...</p>
      ) : (
        <div className="space-y-2.5">
          {displayedNodes.map(node => {
            const comment = node.comment;
            const depth = node.depth;
            const commentUser = users.find(u => u.name === comment.authorName);
            const parentComment = comment.parentCommentId
               ? comments.find(c => c.id === comment.parentCommentId)
               : null;
            return (
              <div 
                key={comment.id} 
                id={`comment-${comment.id}`} 
                className={`flex gap-2.5 items-start scroll-mt-24 ${
                  depth > 0 ? 'border-l-2 border-zinc-200/50 pl-3 md:pl-4 mt-1.5' : ''
                }`}
                style={{ marginLeft: `${Math.min(depth, 4) * 16}px` }}
              >
                <div onClick={() => commentUser && onUserSelect?.(commentUser)} className="cursor-pointer shrink-0">
                  <LocalAvatar name={comment.authorName} avatarUrl={comment.authorAvatar} className="w-6.5 h-6.5" />
                </div>
                <div className={`grow text-[12.5px] flex flex-col gap-0.5 ${getCommentStyle(comment.type)}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      onClick={() => commentUser && onUserSelect?.(commentUser)}
                      className="font-bold text-[#2a5885] cursor-pointer hover:underline"
                    >
                      {comment.authorName}
                    </span>
                    {getTypeBadge(comment.type)}
                    <span className="text-[10px] text-[#818c99]">{getCommentDisplayTime(comment.timestamp)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyToCommentId(comment.id);
                        setCommentText(`@${comment.authorName.split(' ')[0]} `);
                      }}
                      className="text-[10px] text-[#818c99] hover:text-[#2a5885] flex items-center gap-0.5"
                    >
                      <Reply size={10} />
                      Ответить
                    </button>
                  </div>
                  {parentComment && (
                    <div className="text-[10.5px] text-[#818c99] italic">
                      в ответ {parentComment.authorName}
                    </div>
                  )}
                  <p className="text-[#2c2d2e] leading-relaxed select-text font-normal">{comment.text}</p>

                  {/* Comment Reactions Block */}
                  <div className="mt-2 flex items-center gap-2 select-none font-sans">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCommentReact) {
                          onCommentReact(comment.id, 'up');
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-tight transition-all cursor-pointer border ${
                        currentUser && comment.fireUsers?.some((u: any) => u.userId === currentUser.id)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                          : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-emerald-500'
                      }`}
                      title="Поднять вверх"
                    >
                      <span className="align-middle">⬆️</span>
                      <span className="align-middle">{comment.firesCount || 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onCommentReact) {
                          onCommentReact(comment.id, 'down');
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-tight transition-all cursor-pointer border ${
                        currentUser && comment.negativeUsers?.some((u: any) => u.userId === currentUser.id)
                          ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                          : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-rose-500'
                      }`}
                      title="Снизить вниз"
                    >
                      <span className="align-middle">⬇️</span>
                      <span className="align-middle">{comment.negativeReactions || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2 pt-2.5 border-t border-[#f2f3f5]">
        {commentsDisabled ? (
          <p className="text-[11.5px] text-[#818c99] italic">{commentsDisabledMessage}</p>
        ) : (
          <div className="space-y-2.5">
            {replyTarget && (
              <div className="flex items-center justify-between text-[10.5px] text-[#55677d] bg-[#f0f2f5] px-2.5 py-1.5 rounded-[3px]">
                <span>Ответ для {replyTarget.authorName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyToCommentId(null);
                    setCommentText('');
                  }}
                  className="text-[10px] text-[#2a5885] hover:underline cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            )}

            {/* Comment type switcher buttons */}
            <div className="flex flex-wrap items-center gap-1.5 py-1 select-none">
              <span className="text-[10.5px] text-[#818c99] mr-1">Тип:</span>
              <button
                type="button"
                onClick={() => setCommentType('continue_thought')}
                className={`px-2 py-0.5 text-[10px] rounded-full border transition-all cursor-pointer ${
                  commentType === 'continue_thought'
                    ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold'
                    : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                }`}
              >
                🌿 Продолжение мысли
              </button>
              <button
                type="button"
                onClick={() => setCommentType('disagree')}
                className={`px-2 py-0.5 text-[10px] rounded-full border transition-all cursor-pointer ${
                  commentType === 'disagree'
                    ? 'bg-rose-50 border-rose-200 text-rose-800 font-semibold'
                    : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                }`}
              >
                ⚖️ Другая точка зрения
              </button>
              <button
                type="button"
                onClick={() => setCommentType('share_experience')}
                className={`px-2 py-0.5 text-[10px] rounded-full border transition-all cursor-pointer ${
                  commentType === 'share_experience'
                    ? 'bg-sky-50 border-sky-200 text-sky-800 font-semibold'
                    : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                }`}
              >
                💬 Опыт из жизни
              </button>
            </div>

            <div className="flex gap-2.5 items-center">
              <LocalAvatar name={currentUser?.name || "Гость"} avatarUrl={currentUser?.avatar} className="w-6.5 h-6.5" />
              <div className="grow relative flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    replyTarget
                      ? `Ответ для ${replyTarget.authorName}...`
                      : 'Напишите содержательный комментарий...'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSend();
                    }
                  }}
                  className="grow bg-[#f0f2f5] rounded-[16px] py-1.5 px-3 text-[12.5px] focus:outline-none focus:bg-white border border-transparent focus:border-[#dce1e6] placeholder:text-[#818c99] transition-all"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="text-teal-600 p-1.5 hover:bg-teal-50 rounded-full transition-colors shrink-0 cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
