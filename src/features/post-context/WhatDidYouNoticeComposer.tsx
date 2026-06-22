import React, { useState } from 'react';
import { Eye, Image, HelpCircle, FileText, Compass, Sparkles } from 'lucide-react';

interface WhatDidYouNoticeComposerProps {
  onPublish: (thought: string, context?: string, media?: string, visualPriority?: 'text' | 'media' | 'discussion') => void;
  currentUser: any;
}

export const WhatDidYouNoticeComposer: React.FC<WhatDidYouNoticeComposerProps> = ({
  onPublish,
  currentUser
}) => {
  const [thought, setThought] = useState('');
  const [context, setContext] = useState('');
  const [media, setMedia] = useState('');
  const [showFields, setShowFields] = useState(false);
  const [visualPriority, setVisualPriority] = useState<'text' | 'media' | 'discussion'>('text');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thought.trim()) return;
    
    onPublish(thought, context.trim() || undefined, media.trim() || undefined, visualPriority);
    
    // Reset composer
    setThought('');
    setContext('');
    setMedia('');
    setShowFields(false);
  };

  return (
    <div className="bg-vk-white p-4 border border-[#e1e5eb] rounded-[2px] shadow-sm space-y-3">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#dce1e6]">
          <img 
            src={currentUser?.avatar || 'https://picsum.photos/seed/user/200/200'} 
            className="w-full h-full object-cover rounded-full" 
            alt="avatar" 
          />
        </div>
        <div className="grow">
          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            onFocus={() => setShowFields(true)}
            placeholder="Что вы заметили сегодня? Поделитесь чистой мыслью..."
            rows={showFields ? 3 : 1}
            className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] focus:outline-none focus:bg-white focus:border-teal-500 placeholder:text-[#818c99] transition-all resize-none"
          />
        </div>
      </div>

      {showFields && (
        <div className="animate-fade-in pl-11 space-y-3 pt-1">
          {/* Optional Trigger Context Field */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#55677d]">
              <Compass size={12} className="text-teal-600" />
              <span>Контекст возникновения мысли (где, когда, при каких обстоятельствах возникла):</span>
            </div>
            <input
              type="text"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Например: По дороге в парк, слушая старую кассету..."
              className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] focus:outline-none focus:bg-white focus:border-teal-500 transition-all"
            />
          </div>

          {/* Optional Media Field */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#55677d]">
                <Image size={12} />
                <span>Ссылка на изображение / медиа (необязательно):</span>
              </div>
              <input
                type="text"
                value={media}
                onChange={(e) => setMedia(e.target.value)}
                placeholder="Вставьте ссылку на картинку..."
                className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] focus:outline-none focus:bg-white focus:border-teal-500 transition-all"
              />
            </div>

            {/* Visual Priority Selector */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#55677d]">
                <Eye size={12} className="text-purple-600" />
                <span>Приоритет отображения:</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setVisualPriority('text')}
                  className={`py-1 px-1.5 text-[10.5px] font-medium rounded border transition-all truncate flex items-center justify-center gap-1 ${
                    visualPriority === 'text'
                      ? 'bg-[#5181b8]/10 text-[#2a5885] border-[#5181b8]'
                      : 'bg-white text-[#656565] border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Фокус на содержание текста, медиа скрыто за кнопкой"
                >
                  ✍️ Текст
                </button>
                <button
                  type="button"
                  onClick={() => setVisualPriority('media')}
                  className={`py-1 px-1.5 text-[10.5px] font-medium rounded border transition-all truncate flex items-center justify-center gap-1 ${
                    visualPriority === 'media'
                      ? 'bg-[#5181b8]/10 text-[#2a5885] border-[#5181b8]'
                      : 'bg-white text-[#656565] border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Стандартный вид"
                >
                  🖼️ Медиа
                </button>
                <button
                  type="button"
                  onClick={() => setVisualPriority('discussion')}
                  className={`py-1 px-1.5 text-[10.5px] font-medium rounded border transition-all truncate flex items-center justify-center gap-1 ${
                    visualPriority === 'discussion'
                      ? 'bg-[#5181b8]/10 text-[#2a5885] border-[#5181b8]'
                      : 'bg-white text-[#656565] border-gray-200 hover:bg-gray-50'
                  }`}
                  title="Подсветка и авто-развертывание ветви ответов"
                >
                  💬 Дискуссия
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <span className="text-[10px] text-[#818c99] flex items-center gap-1">
              <Sparkles size={11} className="text-teal-600" /> Начните искренний диалог без фальши
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setThought('');
                  setContext('');
                  setMedia('');
                  setShowFields(false);
                }}
                className="px-3 py-1.5 rounded-[2px] text-[11px] font-medium text-[#55677d] hover:bg-[#e1e5eb] transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!thought.trim()}
                className={`px-4 py-1.5 rounded-[2px] text-[11px] font-medium text-white transition-colors ${
                  thought.trim() ? 'bg-teal-600 hover:bg-teal-700' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Опубликовать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
