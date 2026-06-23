import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, User } from 'lucide-react';
import { FeedPost } from '../../types';

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
  users = [],
  onUserSelect,
}) => {

  const activeDiscussionUsers = useMemo(() => {
    const counts: Record<string, number> = {};
    
    feedPosts.forEach(post => {
      // Post author
      const postAuthor = users.find(u => u.name === post.authorName);
      if (postAuthor) {
        counts[postAuthor.id] = (counts[postAuthor.id] || 0) + 1;
      }
      // Commenters
      const comments = post.comments || [];
      comments.forEach(c => {
        const commenter = users.find(u => u.name === c.authorName || u.id === (c as any).userId);
        if (commenter) {
          counts[commenter.id] = (counts[commenter.id] || 0) + 1;
        }
      });
    });

    return users
      .filter(u => !u.isServiceProfile) // final users only
      .map(user => ({
        ...user,
        discussionCount: counts[user.id] || 0
      }))
      .sort((a, b) => b.discussionCount - a.discussionCount);
  }, [users, feedPosts]);

  return (
    <div className="space-y-6 font-sans max-w-[720px] mx-auto pb-16 px-1" id="discussed-now-container">
      {/* Header section */}
      <div className="bg-white border border-[#e7e8ec] rounded-[2px] p-6 shadow-none relative overflow-hidden">
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight font-sans">Это обсуждают</h1>
        <p className="text-[#818c99] text-[13px] leading-relaxed font-sans font-medium mt-1">
          Пользователи сообщества, активно участвующие в дискуссиях, аргументациях и обсуждениях.
        </p>
      </div>

      {/* Grid of final users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeDiscussionUsers.map(user => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#e7e8ec] hover:border-[#cbd3da] transition-all rounded-[2px] p-4 flex items-center justify-between shadow-none"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {/* Avatar */}
              <div 
                onClick={() => onUserSelect && onUserSelect(user)}
                className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-zinc-100 hover:opacity-90 transition-opacity cursor-pointer border border-[#e7e8ec] overflow-hidden"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-zinc-400" />
                )}
              </div>
              {/* User text */}
              <div className="overflow-hidden space-y-0.5">
                <span 
                  onClick={() => onUserSelect && onUserSelect(user)}
                  className="font-bold text-[14.5px] text-[#2a5885] hover:underline cursor-pointer block truncate font-sans"
                >
                  {user.name}
                </span>
                <p className="text-[11.5px] text-[#818c99] italic truncate block pr-2 font-sans">
                  {user.status || 'Нет статуса'}
                </p>
              </div>
            </div>

            {/* Discussion count */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-[2px] shrink-0 text-zinc-650">
              <MessageSquare size={13} className="text-zinc-450 shrink-0" />
              <span className="text-[12px] font-bold font-mono">
                {user.discussionCount}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
