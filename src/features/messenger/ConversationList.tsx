import React, { useState, useEffect } from 'react';
import { Search, Plus, Pin, Users, MessageSquare } from 'lucide-react';
import { ConversationItem } from '../../services/messenger/MessengerTypes';

interface ConversationListProps {
  conversations: ConversationItem[];
  activeConversationId?: string;
  onSelectConversation: (convId: string) => void;
  onOpenNewChatModal: () => void;
  currentUserId: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChatModal,
  currentUserId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredConversations = React.useMemo(() => {
    if (!debouncedQuery) return conversations;
    return conversations.filter((item) => {
      if (item.conversation.type === 'group') {
        return item.conversation.name?.toLowerCase().includes(debouncedQuery);
      }
      const other = item.other_user;
      if (!other) return false;
      const nameMatch = other.name.toLowerCase().includes(debouncedQuery);
      const usernameMatch = other.username?.toLowerCase().includes(debouncedQuery);
      const publicIdMatch = other.public_id ? `#${other.public_id}`.includes(debouncedQuery) || `id:${other.public_id}`.includes(debouncedQuery) : false;
      return nameMatch || usernameMatch || publicIdMatch;
    });
  }, [conversations, debouncedQuery]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-[#e7e8ec]">
      {/* Header & Controls */}
      <div className="p-3 border-b border-[#e7e8ec] space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-[#222222]">Сообщения</h2>
          <button
            onClick={onOpenNewChatModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5181b8] hover:bg-[#4a76a8] text-white rounded-[6px] text-[12.5px] font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus size={15} />
            <span>Новый чат</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#818c99]" />
          <input
            type="text"
            placeholder="Поиск по диалогам и сотрудникам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#f0f2f5] hover:bg-[#e7e8eb] focus:bg-white pl-8 pr-3 py-1.5 rounded-[6px] border border-transparent focus:border-[#5181b8] text-[12.5px] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5]">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-[#818c99] text-[13px] flex flex-col items-center gap-2">
            <MessageSquare size={36} className="text-[#d3d9de]" />
            <p>{conversations.length === 0 ? 'Чатов пока нет' : 'Чаты не найдены'}</p>
          </div>
        ) : (
          filteredConversations.map((item) => {
            const isGroup = item.conversation.type === 'group';
            const isSelected = item.conversation.id === activeConversationId;
            const isPinned = !!item.settings?.is_pinned;

            let title = 'Диалог';
            let avatar = 'https://vk.com/images/camera_200.png';
            let subtitle = '';

            if (isGroup) {
              title = item.conversation.name || 'Групповой чат';
              avatar = item.conversation.avatar_url || 'https://vk.com/images/camera_200.png';
              subtitle = `${item.members.length} участн.`;
            } else if (item.other_user) {
              title = item.other_user.name;
              avatar = item.other_user.avatar || 'https://vk.com/images/camera_200.png';
              subtitle = item.other_user.public_id ? `ID: ${item.other_user.public_id}` : (item.other_user.username ? `@${item.other_user.username}` : '');
            }

            // Last message preview & time
            const lastMsg = item.last_message;
            let lastMsgText = 'Нет сообщений';
            let lastMsgTime = '';

            if (lastMsg) {
              if (lastMsg.deleted_at) {
                lastMsgText = 'Сообщение удалено';
              } else {
                lastMsgText = lastMsg.text;
              }

              try {
                const msgDate = new Date(lastMsg.created_at);
                const isToday = new Date().toDateString() === msgDate.toDateString();
                lastMsgTime = isToday
                  ? msgDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                  : msgDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
              } catch {
                lastMsgTime = '';
              }
            }

            return (
              <div
                key={item.conversation.id}
                onClick={() => onSelectConversation(item.conversation.id)}
                className={`flex items-center gap-3 p-3 transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#e5ebf1] border-l-4 border-[#5181b8]'
                    : 'hover:bg-[#f5f7fa] bg-white'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={avatar}
                    alt={title}
                    className="w-11 h-11 rounded-full object-cover border border-[#e7e8ec]"
                  />
                  {isGroup && (
                    <div className="absolute -bottom-1 -right-1 bg-[#5181b8] text-white p-0.5 rounded-full border border-white">
                      <Users size={10} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[13.5px] font-semibold text-[#222222] truncate">
                      {title}
                    </span>
                    <span className="text-[11px] text-[#818c99] shrink-0 font-medium">
                      {lastMsgTime}
                    </span>
                  </div>

                  {/* Subtitle / Last message preview */}
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-[12px] text-[#656565] truncate">
                      {lastMsg ? (
                        <span>
                          {lastMsg.sender_id === currentUserId && (
                            <span className="text-[#2a5885] font-medium mr-1">Вы:</span>
                          )}
                          {lastMsgText}
                        </span>
                      ) : (
                        <span className="italic text-[#818c99]">{subtitle || 'Нажмите, чтобы открыть'}</span>
                      )}
                    </p>

                    <div className="flex items-center gap-1 shrink-0">
                      {isPinned && <Pin size={12} className="text-[#818c99]" />}
                      {item.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-[#5181b8] text-white font-bold text-[11px] rounded-full min-w-[18px] text-center">
                          {item.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
