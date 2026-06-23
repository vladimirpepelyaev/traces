import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  MessageSquare, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  ChevronRight, 
  ChevronDown, 
  MessageCircle, 
  AlertCircle, 
  Lock, 
  X,
  User,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { FeedPost } from '../../types';
import { DiscussionComments } from './DiscussionComments';

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

export const DiscussedNow: React.FC<DiscussedNowProps> = ({
  feedPosts = [],
  currentUser,
  users = [],
  setFeedPosts,
  setCurrentUser,
  addNotification,
  onUserSelect,
}) => {
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [paywallModalOpen, setPaywallModalOpen] = useState(false);

  // --- 1. Dynamic Filtering & Algorithmic Selection of 5 Hot Discussions ---
  // A post is chosen if comments are present, and we score them based on attention & engagement.
  const topDiscussions = useMemo(() => {
    return feedPosts
      .map(post => {
        const comments = post.comments || [];
        const totalComments = comments.length;

        // Custom post attention score: defaulted to likes-based if not defined
        const attentionScore = post.attentionScore !== undefined ? post.attentionScore : ((post.likes || 0) * 2);

        // Algorithm Checks:
        // - percentage of positive signals in comments:
        const totalReactions = comments.reduce((sum, c) => sum + (c.firesCount || 0) + (c.negativeReactions || 0), 0);
        const positiveReactions = comments.reduce((sum, c) => sum + (c.firesCount || 0), 0);
        const positiveRatio = totalReactions > 0 ? (positiveReactions / totalReactions) * 100 : 100;

        // Score for ranking the top 5
        const rankingScore = (attentionScore * 15) + (totalComments * 10);

        return {
          ...post,
          attentionScore,
          positiveRatio,
          rankingScore,
          totalComments,
          totalReactions
        };
      })
      // Algorithmic Filter matching:
      // - is populated with comments
      // - has >=80% positive ratios or default to top ranked
      .filter(p => p.totalComments > 0)
      // Sort in descending order of ranking
      .sort((a, b) => b.rankingScore - a.rankingScore)
      // Take up to 5
      .slice(0, 5);
  }, [feedPosts]);

  // --- Helper to extract the 3 best comments per category ---
  const getBestComments = (post: FeedPost) => {
    const comments = post.comments || [];
    
    const selectBest = (type: 'continue_thought' | 'disagree' | 'share_experience') => {
      const typeComments = comments.filter(c => c.type === type);
      if (typeComments.length === 0) return null;

      // Scoring criteria: positive rating percentage >=80%, minimum number of ratings or high attention
      const scored = typeComments.map(c => {
        const up = c.firesCount || 0;
        const down = c.negativeReactions || 0;
        const total = up + down;
        const ratio = total > 0 ? (up / total) * 100 : 100;
        // high engagement score
        const strength = up * 1.5 - down + (c.fireUsers?.length || 0) * 0.5;
        const isStrong = total >= 1 && ratio >= 80;

        return {
          comment: c,
          strength,
          isStrong,
          ratio
        };
      });

      // Sort by strength descending
      scored.sort((a, b) => b.strength - a.strength);
      return scored[0]?.comment || null;
    };

    return {
      continue_thought: selectBest('continue_thought'),
      disagree: selectBest('disagree'),
      share_experience: selectBest('share_experience')
    };
  };

  // --- 4. Post Signal Mechanic ([🔥] Заслуживает внимания ) ---
  const handlePostAttentionSignal = (postId: string) => {
    if (!currentUser) {
      addNotification('Авторизация', 'Пожалуйста, войдите в аккаунт для оценки.');
      return;
    }

    // Determine signal counts from user state
    const signalsUsed = currentUser.postSignalsUsed || 0;
    
    // Find post in state to check if user already boosted it
    const targetPost = feedPosts.find(p => p.id === postId);
    if (!targetPost) return;

    const boostedUsers = targetPost.boostedUsers || [];
    const alreadyBoosted = boostedUsers.includes(currentUser.id || currentUser.name);

    if (alreadyBoosted) {
      addNotification('Голос учтен', 'Вы уже отправляли сигнал «Заслуживает внимания» для этого обсуждения.');
      return;
    }

    // If 3 signals used, 4th click triggers Paywall!
    if (signalsUsed >= 3) {
      setPaywallModalOpen(true);
      return;
    }

    // Process vote: update feedPosts and currentUser
    setFeedPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const currentAttention = p.attentionScore !== undefined ? p.attentionScore : ((p.likes || 0) * 2);
      return {
        ...p,
        attentionScore: currentAttention + 20,
        boostedUsers: [...(p.boostedUsers || []), currentUser.id || currentUser.name]
      };
    }));

    // Increment user's signal count
    setCurrentUser((curr: any) => {
      if (!curr) return null;
      return {
        ...curr,
        postSignalsUsed: (curr.postSignalsUsed || 0) + 1
      };
    });

    addNotification('Сигнал принят! 🔥', 'Добавлено +20 к уровню общественного внимания публикации.');
  };

  // --- 5. Comment Evaluation upvote / downvote logic ---
  const handleCommentUpvoteDownvote = (postId: string, commentId: string, type: 'up' | 'down') => {
    if (!currentUser) {
      addNotification('Авторизация', 'Пожалуйста, войдите в аккаунт, чтобы проголосовать.');
      return;
    }

    setFeedPosts(prev => {
      return prev.map(post => {
        if (post.id !== postId) return post;

        const updatedComments = (post.comments || []).map(c => {
          if (c.id !== commentId) return c;

          let fires = c.firesCount || 0;
          let negs = c.negativeReactions || 0;
          let upvoters = [...(c.fireUsers || [])];
          let downvoters = [...(c.negativeUsers || [])];

          const upIndex = upvoters.findIndex(u => u.userId === currentUser.id);
          const downIndex = downvoters.findIndex(u => u.userId === currentUser.id);

          if (type === 'up') {
            if (upIndex !== -1) {
              // Untoggle upvote
              fires = Math.max(0, fires - 1);
              upvoters.splice(upIndex, 1);
            } else {
              // Toggle upvote, remove downvote if any
              fires += 1;
              upvoters.push({
                userId: currentUser.id,
                userName: currentUser.name,
                userAvatar: currentUser.avatar,
                timestamp: new Date().toLocaleString('ru-RU')
              });
              if (downIndex !== -1) {
                negs = Math.max(0, negs - 1);
                downvoters.splice(downIndex, 1);
              }
            }
          } else if (type === 'down') {
            if (downIndex !== -1) {
              // Untoggle downvote
              negs = Math.max(0, negs - 1);
              downvoters.splice(downIndex, 1);
            } else {
              // Toggle downvote, remove upvote if any
              negs += 1;
              downvoters.push({
                userId: currentUser.id,
                userName: currentUser.name,
                userAvatar: currentUser.avatar,
                timestamp: new Date().toLocaleString('ru-RU')
              });
              if (upIndex !== -1) {
                fires = Math.max(0, fires - 1);
                upvoters.splice(upIndex, 1);
              }
            }
          }

          const total = fires + negs;
          const pct = total > 0 ? Math.round((fires / total) * 100) : 100;

          return {
            ...c,
            firesCount: fires,
            negativeReactions: negs,
            positiveAttentionPct: pct,
            fireUsers: upvoters,
            negativeUsers: downvoters
          };
        });

        return { ...post, comments: updatedComments };
      });
    });
  };

  const currentUsageLeft = 3 - (currentUser?.postSignalsUsed || 0);

  return (
    <div className="space-y-6 font-sans max-w-[720px] mx-auto pb-16 px-1" id="discussed-now-container">
      
      {/* 1. Header of the division */}
      <div className="bg-white border border-[#e7e8ec] rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-[#5181b8]/5 rounded-full blur-3xl -mr-12 -mt-12 select-none" />
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#f0f2f5] text-[#2a5885] rounded-xl font-bold shrink-0">
            <Flame size={28} className="fill-amber-500 text-amber-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Это обсуждают</h1>
            <p className="text-[#818c99] text-[13px] leading-relaxed font-sans font-medium">
              Собрали активные обсуждения, которые получили внимание сообщества. Читайте мнения и присоединяйтесь к разговору.
            </p>
          </div>
        </div>
        

      </div>

      {/* 2. Top publications (up to 5 popular posts) */}
      <div className="space-y-5">
        <h2 className="text-[14px] font-bold text-[#818c99] px-2 tracking-wide uppercase flex items-center justify-between select-none">
          <span>🔥 Горячие дискуссии</span>
          <span className="text-[11px] bg-zinc-100 text-[#55677d] px-2 py-0.5 rounded-full tracking-normal normal-case">
            Топ-{topDiscussions.length} публикаций
          </span>
        </h2>

        {topDiscussions.length === 0 ? (
          <div className="bg-white border border-[#e7e8ec] rounded-xl p-8 text-center text-[#818c99] font-medium leading-relaxed">
            <AlertCircle size={32} className="mx-auto mb-2 opacity-50 text-[#818c99]" />
            Пока нет постов, проходящих порог активности или имеющих комментарии. Оставьте первый комментарий к публикациям из Ленты!
          </div>
        ) : (
          topDiscussions.map((post, idx) => {
            const bestComments = getBestComments(post);
            const isBoostedByMe = post.boostedUsers?.includes(currentUser?.id || currentUser?.name) || false;
            const isCommentsExpanded = expandedCommentsPostId === post.id;

            return (
              <div 
                key={post.id} 
                className="bg-white border border-[#e7e8ec] hover:border-[#cbd0d9] transition-all rounded-xl p-5 shadow-xs space-y-4 font-sans"
              >
                {/* Author row & Attention level */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={post.authorAvatar || 'dog1.png'}
                      alt={post.authorName}
                      className="w-9 h-9 rounded-full object-cover border border-[#e7e8ec]"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'dog1.png'; }}
                    />
                    <div>
                      <h3 
                        onClick={() => onUserSelect?.(users.find(u => u.name === post.authorName) || users[0])}
                        className="text-[13.5px] font-bold text-[#2a5885] hover:underline cursor-pointer tracking-tight"
                      >
                        {post.authorName}
                      </h3>
                      <span className="text-[11px] text-[#818c99]">{post.timestamp}</span>
                    </div>
                  </div>

                  {/* Attention metric label */}
                  <div className="flex items-center gap-2 select-none">
                    <span className="text-[11px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-200/80 px-2 py-0.8 rounded-lg font-bold flex items-center gap-1">
                      <Flame size={12} className="text-amber-500 fill-amber-500" />
                      <span>{post.attentionScore} внимания</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.8 rounded-lg">
                      {Math.round(post.positiveRatio)}% Ряд
                    </span>
                  </div>
                </div>

                {/* Post body */}
                <div className="space-y-1">
                  <p className="text-[14px] text-zinc-800 leading-relaxed font-sans font-normal whitespace-pre-wrap select-text">
                    {post.text}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f2f3f5] select-none text-[12px] text-[#818c99]">
                  <div className="flex items-center gap-4">
                    {/* Attention trigger button */}
                    <button
                      onClick={() => handlePostAttentionSignal(post.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-bold transition-all cursor-pointer ${
                        isBoostedByMe 
                          ? 'bg-amber-50 border-amber-200 text-amber-700 font-extrabold shadow-sm' 
                          : 'bg-[#fafbfc] border-[#e7e8ec] text-zinc-650 hover:bg-[#f0f2f5] hover:text-[#2a5885]'
                      }`}
                      title="Поднять обсуждение в разделе «Это обсуждают» (+20 внимания)"
                    >
                      <Flame size={14} className={isBoostedByMe ? 'fill-amber-500 text-amber-500 animate-pulse' : 'text-zinc-500'} />
                      <span>{isBoostedByMe ? 'Учтено' : 'Заслуживает внимания'}</span>
                    </button>

                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={13} />
                      <span>{post.totalComments} комментариев</span>
                    </span>
                  </div>

                  {/* Toggle expand comments */}
                  <button
                    onClick={() => setExpandedCommentsPostId(isCommentsExpanded ? null : post.id)}
                    className="flex items-center gap-1 text-[#2a5885] hover:text-[#5181b8] cursor-pointer font-bold"
                  >
                    <span>{isCommentsExpanded ? 'Скрыть полный диалог' : 'Присоединиться к разговору'}</span>
                    {isCommentsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                </div>

                {/* Three Best Comments (Bento elements) */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-[#818c99] mb-3 md:mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen size={12} className="text-[#5181b8]" />
                    <span>Сильные тезисы ключевых точек зрения:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* Perspective A: Develop Thought */}
                    <div className="bg-[#fcfdfa]/50 border border-emerald-100 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow-3xs hover:border-emerald-200 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-emerald-50 pb-1.5 select-none text-[10.5px]">
                          <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            Развивает мысль
                          </span>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase font-mono bg-emerald-50 px-1 py-0.2 rounded">За</span>
                        </div>

                        {bestComments.continue_thought ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <img 
                                src={bestComments.continue_thought.authorAvatar || 'dog1.png'} 
                                className="w-4 h-4 rounded-full border border-zinc-100 shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'dog1.png'; }}
                              />
                              <span className="text-[11px] font-bold text-zinc-800 truncate">{bestComments.continue_thought.authorName}</span>
                            </div>
                            <p className="text-[12px] text-zinc-650 italic leading-relaxed select-text">
                              "{bestComments.continue_thought.text}"
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11.5px] italic text-zinc-400 py-2.5 text-center">Нет сильного довода</p>
                        )}
                      </div>

                      {bestComments.continue_thought && (
                        <div className="flex items-center justify-between border-t border-[#f2f3f5] pt-2 select-none">
                          <div className="flex items-center gap-1">
                            {/* Upvote */}
                            <button
                              onClick={() => handleCommentUpvoteDownvote(post.id, bestComments.continue_thought!.id, 'up')}
                              className={`p-1 rounded hover:bg-zinc-100 text-[11px] font-bold flex items-center gap-0.5 border ${
                                bestComments.continue_thought.fireUsers?.some((v: any) => v.userId === currentUser?.id)
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                  : 'bg-white border-zinc-200 text-zinc-500 hover:text-emerald-500'
                              }`}
                              title="Оценить положительно (поднять)"
                            >
                              <ThumbsUp size={11} className={bestComments.continue_thought.fireUsers?.some((v: any) => v.userId === currentUser?.id) ? 'fill-emerald-500 text-emerald-500' : ''} />
                              <span>{bestComments.continue_thought.firesCount || 0}</span>
                            </button>

                            {/* Downvote */}
                            <button
                              onClick={() => handleCommentUpvoteDownvote(post.id, bestComments.continue_thought!.id, 'down')}
                              className={`p-1 rounded hover:bg-zinc-100 text-[11px] font-bold flex items-center gap-0.5 border ${
                                bestComments.continue_thought.negativeUsers?.some((v: any) => v.userId === currentUser?.id)
                                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                                  : 'bg-white border-zinc-200 text-zinc-400 hover:text-rose-500'
                              }`}
                              title="Оценить отрицательно (снизить)"
                            >
                              <ThumbsDown size={11} className={bestComments.continue_thought.negativeUsers?.some((v: any) => v.userId === currentUser?.id) ? 'fill-rose-500 text-rose-500' : ''} />
                              <span>{bestComments.continue_thought.negativeReactions || 0}</span>
                            </button>
                          </div>

                          <span className="text-[10px] font-sans font-semibold text-[#818c99] bg-zinc-50 px-1.5 py-0.2 rounded border">
                            {bestComments.continue_thought.positiveAttentionPct || 100}% согл.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Perspective B: Objection */}
                    <div className="bg-[#fdfafb]/50 border border-rose-100 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow-3xs hover:border-rose-200 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-rose-50 pb-1.5 select-none text-[10.5px]">
                          <span className="font-extrabold text-rose-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            Возражение
                          </span>
                          <span className="text-[9px] font-bold text-rose-600 uppercase font-mono bg-rose-50 px-1 py-0.2 rounded">Против</span>
                        </div>

                        {bestComments.disagree ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <img 
                                src={bestComments.disagree.authorAvatar || 'dog1.png'} 
                                className="w-4 h-4 rounded-full border border-zinc-100 shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'dog1.png'; }}
                              />
                              <span className="text-[11px] font-bold text-zinc-800 truncate">{bestComments.disagree.authorName}</span>
                            </div>
                            <p className="text-[12px] text-zinc-650 italic leading-relaxed select-text">
                              "{bestComments.disagree.text}"
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11.5px] italic text-zinc-400 py-2.5 text-center">Нет сильного довода</p>
                        )}
                      </div>

                      {bestComments.disagree && (
                        <div className="flex items-center justify-between border-t border-[#f2f3f5] pt-2 select-none">
                          <div className="flex items-center gap-1">
                            {/* Upvote */}
                            <button
                              onClick={() => handleCommentUpvoteDownvote(post.id, bestComments.disagree!.id, 'up')}
                              className={`p-1 rounded hover:bg-zinc-100 text-[11px] font-bold flex items-center gap-0.5 border ${
                                bestComments.disagree.fireUsers?.some((v: any) => v.userId === currentUser?.id)
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                  : 'bg-white border-zinc-200 text-zinc-500 hover:text-emerald-500'
                              }`}
                              title="Оценить положительно (поднять)"
                            >
                              <ThumbsUp size={11} className={bestComments.disagree.fireUsers?.some((v: any) => v.userId === currentUser?.id) ? 'fill-emerald-500 text-emerald-500' : ''} />
                              <span>{bestComments.disagree.firesCount || 0}</span>
                            </button>

                            {/* Downvote */}
                            <button
                              onClick={() => handleCommentUpvoteDownvote(post.id, bestComments.disagree!.id, 'down')}
                              className={`p-1 rounded hover:bg-zinc-100 text-[11px] font-bold flex items-center gap-0.5 border ${
                                bestComments.disagree.negativeUsers?.some((v: any) => v.userId === currentUser?.id)
                                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                                  : 'bg-white border-zinc-200 text-zinc-400 hover:text-rose-500'
                              }`}
                              title="Оценить отрицательно (снизить)"
                            >
                              <ThumbsDown size={11} className={bestComments.disagree.negativeUsers?.some((v: any) => v.userId === currentUser?.id) ? 'fill-rose-500 text-rose-500' : ''} />
                              <span>{bestComments.disagree.negativeReactions || 0}</span>
                            </button>
                          </div>

                          <span className="text-[10px] font-sans font-semibold text-[#818c99] bg-zinc-50 px-1.5 py-0.2 rounded border">
                            {bestComments.disagree.positiveAttentionPct || 100}% согл.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Perspective C: Personal Experience */}
                    <div className="bg-[#fbfbfe]/50 border border-sky-100 rounded-lg p-3.5 flex flex-col justify-between gap-3 shadow-3xs hover:border-sky-200 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-sky-50 pb-1.5 select-none text-[10.5px]">
                          <span className="font-extrabold text-sky-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                            Личный опыт
                          </span>
                          <span className="text-[9px] font-bold text-sky-600 uppercase font-mono bg-sky-50 px-1 py-0.2 rounded">Опыт</span>
                        </div>

                        {bestComments.share_experience ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <img 
                                src={bestComments.share_experience.authorAvatar || 'dog1.png'} 
                                className="w-4 h-4 rounded-full border border-zinc-100 shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'dog1.png'; }}
                              />
                              <span className="text-[11px] font-bold text-zinc-800 truncate">{bestComments.share_experience.authorName}</span>
                            </div>
                            <p className="text-[12px] text-zinc-650 italic leading-relaxed select-text">
                              "{bestComments.share_experience.text}"
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11.5px] italic text-zinc-400 py-2.5 text-center">Нет сильного довода</p>
                        )}
                      </div>

                      {bestComments.share_experience && (
                        <div className="flex items-center justify-between border-t border-[#f2f3f5] pt-2 select-none">
                          <div className="flex items-center gap-1">
                            {/* Upvote */}
                            <button
                              onClick={() => handleCommentUpvoteDownvote(post.id, bestComments.share_experience!.id, 'up')}
                              className={`p-1 rounded hover:bg-zinc-100 text-[11px] font-bold flex items-center gap-0.5 border ${
                                bestComments.share_experience.fireUsers?.some((v: any) => v.userId === currentUser?.id)
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                  : 'bg-white border-zinc-200 text-zinc-500 hover:text-emerald-500'
                              }`}
                              title="Оценить положительно (поднять)"
                            >
                              <ThumbsUp size={11} className={bestComments.share_experience.fireUsers?.some((v: any) => v.userId === currentUser?.id) ? 'fill-emerald-500 text-emerald-500' : ''} />
                              <span>{bestComments.share_experience.firesCount || 0}</span>
                            </button>

                            {/* Downvote */}
                            <button
                              onClick={() => handleCommentUpvoteDownvote(post.id, bestComments.share_experience!.id, 'down')}
                              className={`p-1 rounded hover:bg-zinc-100 text-[11px] font-bold flex items-center gap-0.5 border ${
                                bestComments.share_experience.negativeUsers?.some((v: any) => v.userId === currentUser?.id)
                                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                                  : 'bg-white border-zinc-200 text-zinc-400 hover:text-rose-500'
                              }`}
                              title="Оценить отрицательно (снизить)"
                            >
                              <ThumbsDown size={11} className={bestComments.share_experience.negativeUsers?.some((v: any) => v.userId === currentUser?.id) ? 'fill-rose-500 text-rose-500' : ''} />
                              <span>{bestComments.share_experience.negativeReactions || 0}</span>
                            </button>
                          </div>

                          <span className="text-[10px] font-sans font-semibold text-[#818c99] bg-zinc-50 px-1.5 py-0.2 rounded border">
                            {bestComments.share_experience.positiveAttentionPct || 100}% согл.
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Expanded Interactive comments section underneath */}
                <AnimatePresence>
                  {isCommentsExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-[#f2f3f5] pt-4"
                    >
                      <div className="bg-zinc-50/60 p-4 rounded-xl border border-zinc-200/60">
                        <DiscussionComments
                          postId={post.id}
                          currentUser={currentUser}
                          users={users}
                          comments={(post.comments || []).map(c => ({
                            id: c.id,
                            authorId: c.authorId,
                            authorName: c.authorName,
                            authorAvatar: c.authorAvatar || '',
                            text: c.text,
                            timestamp: c.timestamp,
                            type: c.type,
                            parentCommentId: c.parentCommentId,
                            firesCount: c.firesCount,
                            negativeReactions: c.negativeReactions,
                            positiveAttentionPct: c.positiveAttentionPct,
                            fireUsers: c.fireUsers,
                            negativeUsers: c.negativeUsers,
                          }))}
                          onCommentReact={(commentId, rxType) => {
                            handleCommentUpvoteDownvote(post.id, commentId, rxType);
                          }}
                          onAddComment={(text, type, parentCountId) => {
                            const commentId = `comment-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
                            const newComment = {
                              id: commentId,
                              authorId: currentUser?.id,
                              authorName: currentUser?.name || 'Пользователь',
                              authorAvatar: currentUser?.avatar || 'images.png',
                              text: text,
                              timestamp: new Date().toISOString(),
                              type: type,
                              parentCommentId: parentCountId,
                              firesCount: 0,
                              negativeReactions: 0,
                              positiveAttentionPct: 100,
                              fireUsers: [],
                              negativeUsers: []
                            };
                            setFeedPosts(prev => prev.map(p => {
                              if (p.id !== post.id) return p;
                              return {
                                ...p,
                                comments: [...(p.comments || []), newComment]
                              };
                            }));
                            addNotification('Комментарий опубликован', 'Ваш тезис успешно добавлен в цепочку дискуссии!');
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })
        )}
      </div>

      {/* Premium Paywall Modal Popup */}
      <AnimatePresence>
        {paywallModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaywallModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Content card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-2xl p-6 md:p-8 max-w-[420px] w-full border border-zinc-200 relative shadow-2xl space-y-5 text-center z-10"
            >
              <button
                onClick={() => setPaywallModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse mb-4 border border-amber-300">
                  <Flame size={32} className="fill-amber-500 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 font-sans tracking-tight">Следы Premium</h3>
                <p className="text-[12.5px] text-[#818c99] leading-relaxed mt-2 font-sans font-medium">
                  Оформите подписку Следы Premium, чтобы получить возможность дополнительной отправки сигналов «Заслуживает внимания» и поддерживать лучшие обсуждения!
                </p>
              </div>

              {/* Styled Следы premium pricing */}
              <div className="bg-[#5181b8]/5 border border-[#5181b8]/15 rounded-xl p-4 text-[12.5px] select-none text-zinc-700">
                <div className="flex justify-between items-center font-bold font-sans">
                  <span>Следы Premium</span>
                  <span className="text-[#2a5885]">149 ₽ / месяц</span>
                </div>
                <p className="text-[11px] text-[#818c99] text-left mt-1.5 leading-relaxed">
                  • Дополнительный бейдж «Активный критик»<br />
                  • Внимание алгоритма к вашим аргументам<br />
                  • Неограниченная поддержка понравившихся постов
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaywallModalOpen(false);
                    addNotification('Подписка Следы Premium', 'Сервис оплаты временно недоступен. Вернитесь позже!');
                  }}
                  className="w-full bg-[#5181b8] text-white py-2.5 rounded-lg text-[13px] font-bold tracking-tight hover:bg-[#5b88bd] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Lock size={14} />
                  <span>Оформить подписку за 149 ₽</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaywallModalOpen(false)}
                  className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-2.5 rounded-lg text-[13px] font-bold tracking-tight transition-all cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
