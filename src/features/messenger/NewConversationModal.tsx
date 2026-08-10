import React, { useState, useEffect } from 'react';
import { X, Search, Users, User, Check, Plus } from 'lucide-react';
import { messengerService } from '../../services/messenger/MessengerService';
import { MessengerSearchUser } from '../../services/messenger/MessengerTypes';

interface NewConversationModalProps {
  currentUserId: string;
  onClose: () => void;
  onSelectDirectUser: (targetUserId: string) => void;
  onCreateGroup: (name: string, selectedUserIds: string[], avatarUrl?: string) => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  currentUserId,
  onClose,
  onSelectDirectUser,
  onCreateGroup
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');

  // Direct user search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MessengerSearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await messengerService.searchUsers(searchQuery, currentUserId);
        setSearchResults(users);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId]);

  const toggleSelectUserForGroup = (uId: string) => {
    if (selectedUserIds.includes(uId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== uId));
    } else {
      setSelectedUserIds([...selectedUserIds, uId]);
    }
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    onCreateGroup(groupName.trim(), selectedUserIds, groupAvatar.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-[10px] border border-[#e7e8ec] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#e7e8ec] flex items-center justify-between bg-[#f5f7fa]">
          <h3 className="text-[15px] font-bold text-[#222222]">Новый чат</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#818c99] hover:text-[#222222] rounded-full hover:bg-[#e7e8eb] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-[#e7e8ec] bg-white text-[13px] font-medium">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-2 cursor-pointer transition-colors border-b-2 ${
              activeTab === 'direct'
                ? 'border-[#5181b8] text-[#2a5885] font-semibold'
                : 'border-transparent text-[#656565] hover:bg-[#f5f7fa]'
            }`}
          >
            <User size={16} />
            <span>Личное сообщение</span>
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`flex-1 py-2.5 text-center flex items-center justify-center gap-2 cursor-pointer transition-colors border-b-2 ${
              activeTab === 'group'
                ? 'border-[#5181b8] text-[#2a5885] font-semibold'
                : 'border-transparent text-[#656565] hover:bg-[#f5f7fa]'
            }`}
          >
            <Users size={16} />
            <span>Создать группу</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          {activeTab === 'direct' ? (
            /* Direct Chat Search */
            <div className="space-y-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#818c99]" />
                <input
                  type="text"
                  placeholder="Поиск по имени, @username или ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f0f2f5] focus:bg-white pl-9 pr-3 py-2 rounded-[6px] border border-transparent focus:border-[#5181b8] text-[13px] outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                {isSearching ? (
                  <div className="p-6 text-center text-[12.5px] text-[#818c99]">
                    Поиск сотрудников...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-[12.5px] text-[#818c99]">
                    {searchQuery.trim() ? 'Никого не найдено' : 'Введите имя или ID для поиска'}
                  </div>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => onSelectDirectUser(user.id)}
                      className="flex items-center justify-between p-2.5 rounded-[6px] hover:bg-[#f0f2f5] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || 'https://vk.com/images/camera_200.png'}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-[#e7e8ec]"
                        />
                        <div>
                          <div className="text-[13px] font-semibold text-[#222222]">
                            {user.name}
                          </div>
                          <div className="text-[11.5px] text-[#818c99]">
                            {user.public_id ? `ID: ${user.public_id}` : (user.username ? `@${user.username}` : '')}
                          </div>
                        </div>
                      </div>
                      <Plus size={16} className="text-[#5181b8]" />
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Group Chat Form */
            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#656565] mb-1">
                  Название группы *
                </label>
                <input
                  type="text"
                  placeholder="Например: Рабочая группа / Отдел продаж"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-[#f0f2f5] focus:bg-white px-3 py-2 rounded-[6px] border border-transparent focus:border-[#5181b8] text-[13px] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#656565] mb-1">
                  Аватар группы (URL картинки)
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/avatar.png (опционально)"
                  value={groupAvatar}
                  onChange={(e) => setGroupAvatar(e.target.value)}
                  className="w-full bg-[#f0f2f5] focus:bg-white px-3 py-2 rounded-[6px] border border-transparent focus:border-[#5181b8] text-[13px] outline-none"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#656565] mb-1">
                  Поиск участников
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#818c99]" />
                  <input
                    type="text"
                    placeholder="Поиск по имени или ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#f0f2f5] focus:bg-white pl-8 pr-3 py-1.5 rounded-[6px] border border-transparent focus:border-[#5181b8] text-[12.5px] outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 border border-[#e7e8ec] rounded-[6px] p-2">
                  {searchResults.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleSelectUserForGroup(user.id)}
                        className={`flex items-center justify-between p-2 rounded-[4px] cursor-pointer text-[12.5px] ${
                          isSelected ? 'bg-[#e5ebf1]' : 'hover:bg-[#f5f7fa]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={user.avatar || 'https://vk.com/images/camera_200.png'}
                            alt={user.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <span className="font-medium text-[#222222]">{user.name}</span>
                          {user.public_id && <span className="text-[11px] text-[#818c99]">ID: {user.public_id}</span>}
                        </div>
                        {isSelected && <Check size={16} className="text-[#5181b8]" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!groupName.trim()}
                className="w-full py-2.5 bg-[#5181b8] hover:bg-[#4a76a8] disabled:bg-[#d3d9de] text-white font-medium text-[13px] rounded-[6px] transition-colors cursor-pointer"
              >
                Создать группу ({selectedUserIds.length + 1} участн.)
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
