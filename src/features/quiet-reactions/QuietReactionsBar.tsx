import React, { useState } from 'react';
import { Bookmark, RotateCcw, GitCommit, Check, Info } from 'lucide-react';

interface QuietReactionsBarProps {
  postId: string;
  onReact: (type: 'saved' | 'returned' | 'continued') => void;
  currentReaction?: 'saved' | 'returned' | 'continued' | null;
}

export const QuietReactionsBar: React.FC<QuietReactionsBarProps> = ({
  postId,
  onReact,
  currentReaction = null
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [notifText, setNotifText] = useState<string | null>(null);

  const handleAction = (type: 'saved' | 'returned' | 'continued') => {
    onReact(type);
    
    let text = '';
    if (type === 'saved') text = 'Мысль сохранена в ваш личный архив 🔖';
    if (type === 'returned') text = 'Вы отметили вернуться к этой теме позже ⏳';
    if (type === 'continued') text = 'Ветвь рассуждений взята под фокус 🔗';
    
    setNotifText(text);
    setTimeout(() => {
      setNotifText(null);
    }, 2500);
  };

  return (
    <div className="px-4 py-2 border-t border-b border-[#f0f2f5] bg-[#fafbfc] flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-[#55677d]">
          <span className="font-semibold select-none flex items-center gap-1">
            🌿 Тихий отзыв <span className="font-normal opacity-70">(приватно для алгоритма)</span>
          </span>
          <button 
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-gray-400 hover:text-teal-600 transition-colors cursor-help"
          >
            <Info size={13} />
          </button>
        </div>

        {notifText && (
          <span className="text-[10px] text-teal-600 font-medium animate-pulse">
            {notifText}
          </span>
        )}
      </div>

      {showTooltip && (
        <p className="text-[10.5px] text-[#656565] leading-normal bg-white p-2 border border-gray-200 rounded animate-fade-in select-none">
          Тихие реакции не видны публично (никаких лайков или счетчиков). Они используются исключительно локальной системой, чтобы настроить индивидуальную ленту под ваши ценности и глубокие интересы.
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-0.5">
        <button
          onClick={() => handleAction('saved')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] text-[11px] font-medium transition-all cursor-pointer ${
            currentReaction === 'saved'
              ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-sm'
              : 'bg-white border border-[#dce1e6] text-[#55677d] hover:bg-[#f5f7f9]'
          }`}
          title="Скрытно сохранить для себя"
        >
          <Bookmark size={13} className={currentReaction === 'saved' ? 'fill-amber-600 text-amber-700' : 'opacity-70'} />
          <span>Сохранить мысль</span>
          {currentReaction === 'saved' && <Check size={10} className="text-amber-800 shrink-0" />}
        </button>

        <button
          onClick={() => handleAction('returned')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] text-[11px] font-medium transition-all cursor-pointer ${
            currentReaction === 'returned'
              ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-sm'
              : 'bg-white border border-[#dce1e6] text-[#55677d] hover:bg-[#f5f7f9]'
          }`}
          title="Вернуться к чтению позже"
        >
          <RotateCcw size={13} className={currentReaction === 'returned' ? 'text-teal-600' : 'opacity-70'} />
          <span>Вернуться позже</span>
          {currentReaction === 'returned' && <Check size={10} className="text-teal-800 shrink-0" />}
        </button>

        <button
          onClick={() => handleAction('continued')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] text-[11px] font-medium transition-all cursor-pointer ${
            currentReaction === 'continued'
              ? 'bg-sky-50 text-sky-800 border border-sky-200 shadow-sm'
              : 'bg-white border border-[#dce1e6] text-[#55677d] hover:bg-[#f5f7f9]'
          }`}
          title="Планирую продолжить рассуждение"
        >
          <GitCommit size={13} className={currentReaction === 'continued' ? 'text-sky-600' : 'opacity-70'} />
          <span>Продолжить рассуждение</span>
          {currentReaction === 'continued' && <Check size={10} className="text-sky-800 shrink-0" />}
        </button>
      </div>
    </div>
  );
};
