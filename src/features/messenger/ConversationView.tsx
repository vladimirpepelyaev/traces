import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Settings, Pin, Bell, BellOff, Paperclip, Smile } from 'lucide-react';
import { ConversationItem, Message } from '../../services/messenger/MessengerTypes';
import { MessageBubble } from './MessageBubble';

interface ConversationViewProps {
  conversationItem: ConversationItem;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (text: string, attachments?: any[]) => void;
  onEditMessage: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onOpenSettings: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onBackMobile?: () => void;
  onLoadMoreMessages?: () => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversationItem,
  messages,
  currentUserId,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onOpenSettings,
  onTogglePin,
  onToggleMute,
  onBackMobile,
  onLoadMoreMessages
}) => {
  const [inputText, setInputText] = useState('');
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [receiptModalMessage, setReceiptModalMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isGroup = conversationItem.conversation.type === 'group';
  const isPinned = !!conversationItem.settings?.is_pinned;
  const isMuted = !!conversationItem.settings?.is_muted;

  // Header Title & Avatar & Subtitle
  let headerTitle = 'Чат';
  let headerAvatar = 'https://vk.com/images/camera_200.png';
  let headerSubtitle = '';

  if (isGroup) {
    headerTitle = conversationItem.conversation.name || 'Групповой чат';
    headerAvatar = conversationItem.conversation.avatar_url || 'https://vk.com/images/camera_200.png';
    headerSubtitle = `${conversationItem.members.length} участников`;
  } else if (conversationItem.other_user) {
    headerTitle = conversationItem.other_user.name;
    headerAvatar = conversationItem.other_user.avatar || 'https://vk.com/images/camera_200.png';
    headerSubtitle = conversationItem.other_user.public_id
      ? `ID: ${conversationItem.other_user.public_id}`
      : (conversationItem.other_user.username ? `@${conversationItem.other_user.username}` : '');
  }

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (editingMessage) {
      onEditMessage(editingMessage.id, text);
      setEditingMessage(null);
    } else {
      onSendMessage(text);
    }
    setInputText('');
  };

  const handleStartEdit = (msg: Message) => {
    setEditingMessage(msg);
    setInputText(msg.text);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  // Scroll to top pagination trigger
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      if (scrollContainerRef.current.scrollTop === 0 && onLoadMoreMessages) {
        onLoadMoreMessages();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#edf0f3] relative">
      {/* Header */}
      <div className="px-4 py-2.5 bg-white border-b border-[#e7e8ec] flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="p-1.5 text-[#818c99] hover:text-[#222222] rounded-full hover:bg-[#f0f2f5] lg:hidden cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <img
            src={headerAvatar}
            alt={headerTitle}
            className="w-10 h-10 rounded-full object-cover border border-[#e7e8ec]"
          />

          <div>
            <h3 className="text-[14px] font-bold text-[#222222] leading-tight">
              {headerTitle}
            </h3>
            <p className="text-[11.5px] text-[#818c99] font-medium">
              {headerSubtitle}
            </p>
          </div>
        </div>

        {/* Header Options */}
        <div className="flex items-center gap-1 text-[#818c99]">
          <button
            onClick={onTogglePin}
            className={`p-2 rounded-full hover:bg-[#f0f2f5] transition-colors cursor-pointer ${
              isPinned ? 'text-[#5181b8]' : 'hover:text-[#222222]'
            }`}
            title={isPinned ? 'Открепить чат' : 'Закрепить чат'}
          >
            <Pin size={17} />
          </button>

          <button
            onClick={onToggleMute}
            className={`p-2 rounded-full hover:bg-[#f0f2f5] transition-colors cursor-pointer ${
              isMuted ? 'text-[#e64646]' : 'hover:text-[#222222]'
            }`}
            title={isMuted ? 'Включить уведомления' : 'Отключить уведомления'}
          >
            {isMuted ? <BellOff size={17} /> : <Bell size={17} />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 hover:text-[#222222] rounded-full hover:bg-[#f0f2f5] transition-colors cursor-pointer"
            title="Настройки чата"
          >
            <Settings size={17} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#818c99] text-[13px] italic">
            Начните общение...
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              isGroup={isGroup}
              onEdit={handleStartEdit}
              onDelete={onDeleteMessage}
              onShowReadReceipts={(m) => setReceiptModalMessage(m)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Editing Banner */}
      {editingMessage && (
        <div className="px-4 py-2 bg-[#e5ebf1] border-t border-[#d3d9de] flex justify-between items-center text-[12.5px]">
          <div>
            <span className="font-semibold text-[#2a5885]">Редактирование сообщения:</span>{' '}
            <span className="text-[#656565] truncate max-w-[250px] inline-block align-bottom">
              {editingMessage.text}
            </span>
          </div>
          <button
            onClick={handleCancelEdit}
            className="text-[12px] font-medium text-[#e64646] hover:underline cursor-pointer"
          >
            Отмена
          </button>
        </div>
      )}

      {/* Input Composer */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-[#e7e8ec] flex items-center gap-2"
      >
        <button
          type="button"
          className="p-2 text-[#818c99] hover:text-[#222222] hover:bg-[#f0f2f5] rounded-full transition-colors cursor-pointer"
          title="Прикрепить файл"
        >
          <Paperclip size={18} />
        </button>

        <input
          type="text"
          placeholder="Напишите сообщение..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-[#f0f2f5] hover:bg-[#e7e8eb] focus:bg-white px-3.5 py-2 rounded-[18px] border border-transparent focus:border-[#5181b8] text-[13px] outline-none transition-colors"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-[#5181b8] hover:bg-[#4a76a8] disabled:bg-[#d3d9de] text-white rounded-full transition-colors cursor-pointer shrink-0"
          title="Отправить"
        >
          <Send size={16} />
        </button>
      </form>

      {/* Group Read Receipts Modal */}
      {receiptModalMessage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[8px] border border-[#e7e8ec] w-full max-w-sm p-4 space-y-3 shadow-xl">
            <h4 className="text-[14px] font-bold text-[#222222]">Кто прочитал сообщение</h4>
            <div className="text-[12.5px] text-[#656565] bg-[#f0f2f5] p-2.5 rounded-[6px]">
              "{receiptModalMessage.text}"
            </div>
            <div className="text-[12px] text-[#818c99]">
              Прочитавших: {receiptModalMessage.read_by_user_ids?.length || 0}
            </div>
            <button
              onClick={() => setReceiptModalMessage(null)}
              className="w-full py-2 bg-[#5181b8] text-white text-[12.5px] font-medium rounded-[6px] hover:bg-[#4a76a8] transition-colors cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
