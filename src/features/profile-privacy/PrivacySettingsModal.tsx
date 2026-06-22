import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, Shield, EyeOff, Layout, User, MoreHorizontal, Settings, Sparkles } from 'lucide-react';
import { PublicProfileSettings, AvatarMode, ProfileMode } from '../public-identity/publicIdentityTypes';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PublicProfileSettings;
  onSave: (updated: PublicProfileSettings) => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave
}) => {
  const [displayName, setDisplayName] = useState(settings.displayName || '');
  const [bio, setBio] = useState(settings.bio || '');
  const [avatarMode, setAvatarMode] = useState<AvatarMode>(settings.avatarMode || 'default');
  const [showAvatar, setShowAvatar] = useState(settings.showAvatar !== false);
  const [showName, setShowName] = useState(settings.showName !== false);
  const [showActivity, setShowActivity] = useState(settings.showActivity !== false);
  const [showJoinedDate, setShowJoinedDate] = useState(settings.showJoinedDate !== false);
  const [showFollowing, setShowFollowing] = useState(settings.showFollowing !== false);
  const [showDiscussions, setShowDiscussions] = useState(settings.showDiscussions !== false);
  const [showProfilePhotoInFeed, setShowProfilePhotoInFeed] = useState(settings.showProfilePhotoInFeed !== false);
  const [profileMode, setProfileMode] = useState<ProfileMode>(settings.profileMode || 'open');
  const [identityHint, setIdentityHint] = useState(settings.identityHint || '');

  useEffect(() => {
    if (isOpen) {
      setDisplayName(settings.displayName || '');
      setBio(settings.bio || '');
      setAvatarMode(settings.avatarMode || 'default');
      setShowAvatar(settings.showAvatar !== false);
      setShowName(settings.showName !== false);
      setShowActivity(settings.showActivity !== false);
      setShowJoinedDate(settings.showJoinedDate !== false);
      setShowFollowing(settings.showFollowing !== false);
      setShowDiscussions(settings.showDiscussions !== false);
      setShowProfilePhotoInFeed(settings.showProfilePhotoInFeed !== false);
      setProfileMode(settings.profileMode || 'open');
      setIdentityHint(settings.identityHint || '');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      avatarMode,
      showAvatar,
      showName,
      showActivity,
      showJoinedDate,
      showFollowing,
      showDiscussions,
      showProfilePhotoInFeed,
      profileMode,
      identityHint: identityHint.trim() || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-[#ffffff] w-full max-w-lg rounded-[6px] shadow-2xl border border-vk-separator flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e1e5eb] bg-[#fafbfc]">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-teal-600 animate-pulse" />
            <h2 className="text-[15px] font-bold text-[#2c2d2e] select-none">видимость профиля & приватность</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 cursor-pointer text-[#818c99] hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto grow p-5 space-y-5">
          <div className="bg-teal-50/50 p-3 rounded-[3px] border border-teal-100 text-[12px] text-[#55677d] leading-normal">
            ⚙️ <span className="font-semibold text-teal-900">Публичный слой идентификации</span> позволяет настроить то, как другие пользователи увидят ваш профиль на платформе, не изменяя при этом ваши оригинальные регистрационные данные.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-[12.5px]">
            {/* Profile Mode Selector */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-vk-text-secondary uppercase select-none">
                Режим профиля
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMode('open');
                    setShowName(true);
                    setShowAvatar(true);
                  }}
                  className={`py-2 px-3 border rounded-[4px] font-semibold text-center transition-all ${
                    profileMode === 'open'
                      ? 'bg-gradient-to-r from-teal-50 to-white border-teal-500 text-teal-800 shadow-sm'
                      : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                  }`}
                >
                  👐 Открытый
                </button>
                <button
                  type="button"
                  onClick={() => setProfileMode('minimal')}
                  className={`py-2 px-3 border rounded-[4px] font-semibold text-center transition-all ${
                    profileMode === 'minimal'
                      ? 'bg-gradient-to-r from-teal-50 to-white border-teal-500 text-teal-800 shadow-sm'
                      : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                  }`}
                >
                  🌿 Минимализм
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMode('anonymous');
                    setShowName(false);
                    setShowAvatar(false);
                  }}
                  className={`py-2 px-3 border rounded-[4px] font-semibold text-center transition-all ${
                    profileMode === 'anonymous'
                      ? 'bg-gradient-to-r from-rose-50 to-white border-rose-400 text-rose-800 shadow-sm'
                      : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                  }`}
                >
                  👤 Анонимный
                </button>
              </div>
              <p className="text-[11px] text-[#818c99] leading-tight select-none">
                {profileMode === 'open' && 'Показывается вся информация и активности в стандартном виде.'}
                {profileMode === 'minimal' && 'Скрывает второстепенные блоки (активности, подписки, лишние счетчики).'}
                {profileMode === 'anonymous' && 'Полностью скрывает ваше имя и аватар в постах, мыслях и ленте событий.'}
              </p>
            </div>

            {/* If profile mode is not fully anonymous, allow customization */}
            {profileMode !== 'anonymous' && (
              <div className="space-y-4 animate-fade-in border-t border-gray-100 pt-3">
                {/* Public Display Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-vk-text-secondary">
                    Публичный псевдоним (оставьте пустым для реального имени)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Например: Анонимный Мыслитель..."
                    className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-1.5 focus:outline-none focus:bg-white focus:border-teal-500 transition-all text-[12.5px]"
                  />
                </div>

                {/* Public Bio */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-vk-text-secondary">
                    Публичное описание / Статус
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Пара слов о ваших взглядах..."
                    className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-1.5 focus:outline-none focus:bg-white focus:border-teal-500 transition-all text-[12.5px] resize-none h-16"
                  />
                </div>

                {/* Avatar Overrides */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-vk-text-secondary">Режим аватара</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAvatarMode('default')}
                      className={`py-1.5 px-2 border rounded text-center font-medium ${
                        avatarMode === 'default'
                          ? 'bg-[#5181b8]/10 text-[#2a5885] border-[#5181b8]'
                          : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                      }`}
                    >
                      Стандартный
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('custom')}
                      className={`py-1.5 px-2 border rounded text-center font-medium ${
                        avatarMode === 'custom'
                          ? 'bg-[#5181b8]/10 text-[#2a5885] border-[#5181b8]'
                          : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                      }`}
                    >
                      Кастомный URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('hidden')}
                      className={`py-1.5 px-2 border rounded text-center font-medium ${
                        avatarMode === 'hidden'
                          ? 'bg-[#5181b8]/10 text-[#2a5885] border-[#5181b8]'
                          : 'bg-white border-gray-200 text-[#55677d] hover:bg-gray-50'
                      }`}
                    >
                      Скрытый
                    </button>
                  </div>

                  {avatarMode === 'custom' && (
                    <input
                      type="text"
                      value={identityHint}
                      onChange={(e) => setIdentityHint(e.target.value)}
                      placeholder="Вставьте ссылку на картинку аватара..."
                      className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-1.5 focus:outline-none focus:bg-white focus:border-teal-500 transition-all text-[12px] mt-1.5 animate-slide-up"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Visibility checkboxes */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <label className="block text-[11px] font-bold text-vk-text-secondary uppercase select-none">
                Настройки видимости элементов
              </label>

              <div className="space-y-1.5">
                {profileMode !== 'anonymous' && (
                  <>
                    <label className="flex items-center gap-2 py-1 px-1.5 bg-gray-50/50 hover:bg-gray-50 rounded select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showName}
                        onChange={(e) => setShowName(e.target.checked)}
                        className="rounded border-[#dce1e6] text-teal-600 focus:ring-teal-500"
                      />
                      <span>Показывать имя в профиле</span>
                    </label>

                    <label className="flex items-center gap-2 py-1 px-1.5 bg-gray-50/50 hover:bg-gray-50 rounded select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAvatar}
                        onChange={(e) => setShowAvatar(e.target.checked)}
                        className="rounded border-[#dce1e6] text-teal-600 focus:ring-teal-500"
                      />
                      <span>Показывать фото в профиле</span>
                    </label>
                  </>
                )}

                <label className="flex items-center gap-2 py-1 px-1.5 bg-gray-50/50 hover:bg-gray-50 rounded select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showActivity}
                    onChange={(e) => setShowActivity(e.target.checked)}
                    className="rounded border-[#dce1e6] text-teal-600 focus:ring-teal-500"
                  />
                  <span>Показывать блок активности (Метрики внимания)</span>
                </label>

                <label className="flex items-center gap-2 py-1 px-1.5 bg-gray-50/50 hover:bg-gray-50 rounded select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showJoinedDate}
                    onChange={(e) => setShowJoinedDate(e.target.checked)}
                    className="rounded border-[#dce1e6] text-teal-600 focus:ring-teal-500"
                  />
                  <span>Показывать дату регистрации</span>
                </label>

                <label className="flex items-center gap-2 py-1 px-1.5 bg-gray-50/50 hover:bg-gray-50 rounded select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFollowing}
                    onChange={(e) => setShowFollowing(e.target.checked)}
                    className="rounded border-[#dce1e6] text-teal-600 focus:ring-teal-500"
                  />
                  <span>Показывать блок подписок</span>
                </label>

                <label className="flex items-center gap-2 py-1 px-1.5 bg-gray-50/50 hover:bg-gray-50 rounded select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProfilePhotoInFeed}
                    onChange={(e) => setShowProfilePhotoInFeed(e.target.checked)}
                    className="rounded border-[#dce1e6] text-teal-600 focus:ring-teal-500"
                  />
                  <span>Отображать аватар автора в общей Ленте Новостей</span>
                </label>
              </div>
            </div>

            {/* Footer buttons inside content to handle form values */}
            <div className="flex gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="grow py-2 bg-[#f0f2f5] hover:bg-[#e5ebf1] text-[#55677d] rounded-[3px] font-medium transition-colors cursor-pointer text-center"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="grow py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-[3px] font-semibold transition-colors cursor-pointer text-center shadow-sm"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
