import React, { useState } from 'react';
import { Check, CheckCheck, Edit2, Trash2, MoreVertical, Info, FileText } from 'lucide-react';
import { Message } from '../../services/messenger/MessengerTypes';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  isGroup: boolean;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onShowReadReceipts?: (message: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  isGroup,
  onEdit,
  onDelete,
  onShowReadReceipts
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isOwn = message.sender_id === currentUserId;
  const isDeleted = !!message.deleted_at;
  const isEdited = !!message.edited_at && !isDeleted;

  // Format time
  const timeStr = React.useMemo(() => {
    try {
      const date = new Date(message.created_at);
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [message.created_at]);

  // Read status: if read_by_user_ids contains someone other than sender -> read
  const isRead = React.useMemo(() => {
    if (!message.read_by_user_ids) return false;
    return message.read_by_user_ids.some(id => id !== message.sender_id);
  }, [message.read_by_user_ids, message.sender_id]);

  return (
    <div
      className={`flex flex-col my-1 group relative ${
        isOwn ? 'items-end' : 'items-start'
      }`}
    >
      <div
        className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] ${
          isOwn ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar in group chat for non-own messages */}
        {!isOwn && isGroup && (
          <img
            src={message.sender_avatar || 'https://vk.com/images/camera_200.png'}
            alt={message.sender_name}
            className="w-7 h-7 rounded-full object-cover shrink-0 mb-1"
          />
        )}

        {/* Message Card */}
        <div
          className={`relative px-3.5 py-2 rounded-[14px] text-[13.5px] leading-relaxed shadow-sm transition-all ${
            isOwn
              ? 'bg-[#5181b8] text-white rounded-br-[2px]'
              : 'bg-white text-[#222222] border border-[#e7e8ec] rounded-bl-[2px]'
          }`}
        >
          {/* Sender name in group chat for non-own */}
          {!isOwn && isGroup && (
            <div className="text-[11.5px] font-semibold text-[#2a5885] mb-0.5">
              {message.sender_name}
            </div>
          )}

          {/* Deleted content */}
          {isDeleted ? (
            <div className="italic text-[12.5px] opacity-75 py-0.5">
              Сообщение удалено
            </div>
          ) : (
            <>
              {/* Attachments if any */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-1.5 mb-1.5">
                  {message.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-[8px] text-[12px] font-medium transition-colors ${
                        isOwn
                          ? 'bg-white/15 hover:bg-white/25 text-white'
                          : 'bg-[#f0f2f5] hover:bg-[#e4e7eb] text-[#2a5885]'
                      }`}
                    >
                      <FileText size={16} />
                      <span className="truncate max-w-[180px]">{att.name || 'Вложение'}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Message Text */}
              <div className="whitespace-pre-wrap break-words">{message.text}</div>
            </>
          )}

          {/* Time & Read Status Footer */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[10.5px] font-medium select-none ${
              isOwn ? 'text-white/80' : 'text-[#818c99]'
            }`}
          >
            {isEdited && <span className="italic mr-1">изменено</span>}
            <span>{timeStr}</span>

            {/* Read status ticks for own messages */}
            {isOwn && !isDeleted && (
              <span className="ml-0.5 inline-flex items-center" title={isRead ? 'Прочитано' : 'Отправлено'}>
                {isRead ? (
                  <CheckCheck size={14} className="text-white" />
                ) : (
                  <Check size={14} className="text-white/80" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Action button menu trigger */}
        {!isDeleted && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-[#818c99] hover:text-[#2a5885] rounded-full hover:bg-[#f0f2f5] transition-colors"
              title="Опции"
            >
              <MoreVertical size={15} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-[#e7e8ec] rounded-[8px] shadow-lg py-1 z-30 text-[12px] text-[#222222]"
                onMouseLeave={() => setShowMenu(false)}
              >
                {isOwn && (
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(message);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#f0f2f5] flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 size={13} className="text-[#2a5885]" />
                      <span>Редактировать</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(message.id);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#f0f2f5] text-[#e64646] flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Удалить</span>
                    </button>
                  </>
                )}

                {isGroup && onShowReadReceipts && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onShowReadReceipts(message);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#f0f2f5] flex items-center gap-2 cursor-pointer"
                  >
                    <Info size={13} className="text-[#818c99]" />
                    <span>Кто прочитал</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
