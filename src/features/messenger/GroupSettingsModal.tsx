import React, { useState } from 'react';
import { X, UserPlus, UserMinus, Shield, Edit2, LogOut, Check } from 'lucide-react';
import { ConversationItem, MessengerSearchUser } from '../../services/messenger/MessengerTypes';
import { messengerService } from '../../services/messenger/MessengerService';

interface GroupSettingsModalProps {
  conversationItem: ConversationItem;
  currentUserId: string;
  onClose: () => void;
  onUpdateGroup: () => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  conversationItem,
  currentUserId,
  onClose,
  onUpdateGroup
}) => {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [groupName, setGroupName] = useState(conversationItem.conversation.name || '');
  const [groupAvatar, setGroupAvatar] = useState(conversationItem.conversation.avatar_url || '');

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessengerSearchUser[]>([]);

  const currentMember = conversationItem.members.find(m => m.user_id === currentUserId);
  const isOwnerOrAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      await messengerService.updateGroupInfo(
        conversationItem.conversation.id,
        groupName.trim(),
        groupAvatar.trim() || undefined
      );
      setIsEditingInfo(false);
      onUpdateGroup();
    } catch (err) {
      console.error('Failed to update group info:', err);
    }
  };

  const handleSearchUsersToAdd = async (q: string) => {
    setAddSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await messengerService.searchUsers(q, currentUserId);
      // Filter out existing members
      const existingIds = new Set(conversationItem.members.map(m => m.user_id));
      setSearchResults(res.filter(u => !existingIds.has(u.id)));
    } catch (e) {
      console.error('Search error:', e);
    }
  };

  const handleAddUser = async (targetUserId: string) => {
    try {
      await messengerService.addGroupMembers(conversationItem.conversation.id, [targetUserId]);
      setSearchResults(searchResults.filter(u => u.id !== targetUserId));
      onUpdateGroup();
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm('Удалить участника из группы?')) return;
    try {
      await messengerService.removeGroupMember(conversationItem.conversation.id, targetUserId);
      onUpdateGroup();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Вы уверены, что хотите покинуть группу?')) return;
    try {
      await messengerService.removeGroupMember(conversationItem.conversation.id, currentUserId);
      onClose();
      onUpdateGroup();
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-[10px] border border-[#e7e8ec] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#e7e8ec] flex items-center justify-between bg-[#f5f7fa]">
          <h3 className="text-[15px] font-bold text-[#222222]">Управление группой</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#818c99] hover:text-[#222222] rounded-full hover:bg-[#e7e8eb] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Info Edit or Display */}
          {isEditingInfo ? (
            <form onSubmit={handleSaveInfo} className="space-y-3 bg-[#f5f7fa] p-3 rounded-[8px] border border-[#e7e8ec]">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#656565] mb-1">
                  Название
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-white px-3 py-1.5 rounded-[4px] border border-[#d3d9de] text-[13px] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-[#656565] mb-1">
                  Аватар URL
                </label>
                <input
                  type="text"
                  value={groupAvatar}
                  onChange={(e) => setGroupAvatar(e.target.value)}
                  className="w-full bg-white px-3 py-1.5 rounded-[4px] border border-[#d3d9de] text-[13px] outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  className="px-3 py-1 bg-[#e5ebf1] text-[#222222] rounded-[4px] text-[12px]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#5181b8] text-white rounded-[4px] text-[12px] font-medium"
                >
                  Сохранить
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between bg-[#f5f7fa] p-3 rounded-[8px] border border-[#e7e8ec]">
              <div className="flex items-center gap-3">
                <img
                  src={conversationItem.conversation.avatar_url || 'https://vk.com/images/camera_200.png'}
                  alt="Group"
                  className="w-12 h-12 rounded-full object-cover border border-[#e7e8ec]"
                />
                <div>
                  <h4 className="text-[14px] font-bold text-[#222222]">
                    {conversationItem.conversation.name}
                  </h4>
                  <p className="text-[12px] text-[#818c99]">
                    {conversationItem.members.length} участников
                  </p>
                </div>
              </div>

              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsEditingInfo(true)}
                  className="p-2 text-[#5181b8] hover:bg-[#e5ebf1] rounded-full transition-colors cursor-pointer"
                  title="Редактировать группу"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h5 className="text-[13px] font-bold text-[#222222]">Участники</h5>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
                  className="text-[12px] font-medium text-[#5181b8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Добавить</span>
                </button>
              )}
            </div>

            {/* Add Member Search Dropdown */}
            {isAddMemberOpen && (
              <div className="bg-[#f0f2f5] p-3 rounded-[6px] space-y-2 border border-[#e7e8ec]">
                <input
                  type="text"
                  placeholder="Поиск нового участника..."
                  value={addSearchQuery}
                  onChange={(e) => handleSearchUsersToAdd(e.target.value)}
                  className="w-full bg-white px-3 py-1.5 rounded-[4px] border border-[#d3d9de] text-[12.5px] outline-none"
                />
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-1.5 bg-white rounded-[4px] text-[12px]"
                    >
                      <span className="font-medium">{user.name}</span>
                      <button
                        onClick={() => handleAddUser(user.id)}
                        className="px-2 py-0.5 bg-[#5181b8] text-white rounded-[3px] text-[11px]"
                      >
                        Добавить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Members list */}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {conversationItem.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 hover:bg-[#f5f7fa] rounded-[6px] text-[13px]"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={member.user?.avatar || 'https://vk.com/images/camera_200.png'}
                      alt={member.user?.name || 'Member'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-[#222222]">
                        {member.user?.name || 'Участник'}
                      </div>
                      {member.user?.public_id && (
                        <div className="text-[11px] text-[#818c99]">ID: {member.user.public_id}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.role === 'owner' && (
                      <span className="text-[11px] bg-[#e5ebf1] text-[#2a5885] px-2 py-0.5 rounded-[3px] font-semibold flex items-center gap-1">
                        <Shield size={12} />
                        Создатель
                      </span>
                    )}

                    {isOwnerOrAdmin && member.user_id !== currentUserId && member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-1 text-[#818c99] hover:text-[#e64646] rounded-full hover:bg-[#f0f2f5] transition-colors cursor-pointer"
                        title="Удалить из группы"
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leave group button */}
          <div className="pt-2 border-t border-[#e7e8ec]">
            <button
              onClick={handleLeaveGroup}
              className="w-full py-2 bg-[#f0f2f5] hover:bg-[#ffeaea] text-[#e64646] font-medium text-[12.5px] rounded-[6px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={16} />
              <span>Покинуть группу</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
