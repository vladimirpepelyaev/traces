import React, { useState, useEffect, useCallback } from 'react';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { NewConversationModal } from './NewConversationModal';
import { GroupSettingsModal } from './GroupSettingsModal';
import { messengerService } from '../../services/messenger/MessengerService';
import { ConversationItem, Message } from '../../services/messenger/MessengerTypes';
import { AppUser } from '../../types';

interface MessengerPageProps {
  currentUser: AppUser;
}

export const MessengerPage: React.FC<MessengerPageProps> = ({ currentUser }) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);

  // Modals
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);

  // Mobile navigation state
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Load conversations
  const refreshConversations = useCallback(async () => {
    try {
      const list = await messengerService.getConversations(currentUser.id);
      setConversations(list);

      // If active conversation set, update activeItem
      if (activeConvId) {
        const msgs = await messengerService.getMessages(activeConvId);
        setActiveMessages(msgs);
      }
    } catch (e) {
      console.error('Error refreshing conversations:', e);
    }
  }, [currentUser.id, activeConvId]);

  // Initial load & subscribe to realtime
  useEffect(() => {
    messengerService.initRealtime(currentUser.id);
    refreshConversations();

    const unsubscribe = messengerService.subscribe(() => {
      refreshConversations();
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser.id, refreshConversations]);

  // Handle active conversation select
  const handleSelectConversation = async (convId: string) => {
    setActiveConvId(convId);
    setShowMobileChat(true);

    try {
      const msgs = await messengerService.getMessages(convId);
      setActiveMessages(msgs);
      await messengerService.markConversationAsRead(convId, currentUser.id);
      refreshConversations();
    } catch (e) {
      console.error('Error fetching messages for conv:', e);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (text: string, attachments?: any[]) => {
    if (!activeConvId) return;

    // Optimistic message addition
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId,
      sender_id: currentUser.id,
      sender_name: currentUser.name,
      sender_avatar: currentUser.avatar,
      text: text,
      attachments: attachments || [],
      created_at: new Date().toISOString()
    };

    setActiveMessages(prev => [...prev, tempMsg]);

    try {
      await messengerService.sendMessage(
        activeConvId,
        currentUser.id,
        currentUser.name,
        currentUser.avatar,
        text,
        attachments
      );
      refreshConversations();
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  // Handle Edit Message
  const handleEditMessage = async (messageId: string, newText: string) => {
    try {
      await messengerService.editMessage(messageId, newText, currentUser.id);
      refreshConversations();
    } catch (e) {
      console.error('Failed to edit message:', e);
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messengerService.deleteMessage(messageId, currentUser.id);
      refreshConversations();
    } catch (e) {
      console.error('Failed to delete message:', e);
    }
  };

  // Handle Select Direct User from modal
  const handleSelectDirectUser = async (targetUserId: string) => {
    setIsNewChatModalOpen(false);
    try {
      const convItem = await messengerService.getOrCreateDirectConversation(currentUser.id, targetUserId);
      await handleSelectConversation(convItem.conversation.id);
    } catch (e) {
      console.error('Failed to open direct conversation:', e);
    }
  };

  // Handle Create Group Chat from modal
  const handleCreateGroup = async (name: string, memberUserIds: string[], avatarUrl?: string) => {
    setIsNewChatModalOpen(false);
    try {
      const convItem = await messengerService.createGroupConversation(
        currentUser.id,
        name,
        memberUserIds,
        avatarUrl
      );
      await handleSelectConversation(convItem.conversation.id);
    } catch (e) {
      console.error('Failed to create group:', e);
    }
  };

  // Toggle Pin / Mute
  const handleTogglePin = async () => {
    if (!activeConvId) return;
    const activeItem = conversations.find(c => c.conversation.id === activeConvId);
    if (!activeItem) return;

    const currentPinned = !!activeItem.settings?.is_pinned;
    await messengerService.updateSettings(activeConvId, currentUser.id, {
      is_pinned: !currentPinned
    });
    refreshConversations();
  };

  const handleToggleMute = async () => {
    if (!activeConvId) return;
    const activeItem = conversations.find(c => c.conversation.id === activeConvId);
    if (!activeItem) return;

    const currentMuted = !!activeItem.settings?.is_muted;
    await messengerService.updateSettings(activeConvId, currentUser.id, {
      is_muted: !currentMuted
    });
    refreshConversations();
  };

  const activeConvItem = conversations.find(c => c.conversation.id === activeConvId);

  return (
    <div className="h-[calc(100vh-64px)] w-full bg-[#f0f2f5] p-0 sm:p-4 flex items-center justify-center">
      <div className="w-full max-w-6xl h-full bg-white rounded-none sm:rounded-[12px] border border-[#e7e8ec] shadow-md overflow-hidden flex">
        {/* Left Column: Conversation List */}
        <div
          className={`w-full lg:w-[360px] shrink-0 h-full ${
            showMobileChat ? 'hidden lg:block' : 'block'
          }`}
        >
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConvId || undefined}
            onSelectConversation={handleSelectConversation}
            onOpenNewChatModal={() => setIsNewChatModalOpen(true)}
            currentUserId={currentUser.id}
          />
        </div>

        {/* Right Column: Active Conversation View */}
        <div
          className={`flex-1 h-full ${
            !showMobileChat ? 'hidden lg:block' : 'block'
          }`}
        >
          {activeConvItem ? (
            <ConversationView
              conversationItem={activeConvItem}
              messages={activeMessages}
              currentUserId={currentUser.id}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onOpenSettings={() => {
                if (activeConvItem.conversation.type === 'group') {
                  setIsGroupSettingsOpen(true);
                }
              }}
              onTogglePin={handleTogglePin}
              onToggleMute={handleToggleMute}
              onBackMobile={() => setShowMobileChat(false)}
            />
          ) : (
            <div className="h-full bg-[#edf0f3] flex flex-col items-center justify-center p-8 text-center text-[#818c99]">
              <div className="w-16 h-16 rounded-full bg-[#e5ebf1] flex items-center justify-center text-[#5181b8] mb-3 text-2xl font-bold">
                ✉️
              </div>
              <h3 className="text-[15px] font-bold text-[#222222] mb-1">
                Выберите диалог
              </h3>
              <p className="text-[13px] text-[#656565] max-w-xs">
                Выберите чат из списка слева или создайте новый, чтобы начать общение.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {isNewChatModalOpen && (
        <NewConversationModal
          currentUserId={currentUser.id}
          onClose={() => setIsNewChatModalOpen(false)}
          onSelectDirectUser={handleSelectDirectUser}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {/* Group Settings Modal */}
      {isGroupSettingsOpen && activeConvItem && (
        <GroupSettingsModal
          conversationItem={activeConvItem}
          currentUserId={currentUser.id}
          onClose={() => setIsGroupSettingsOpen(false)}
          onUpdateGroup={refreshConversations}
        />
      )}
    </div>
  );
};
