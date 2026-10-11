import React from 'react';

export type FeedMode = 'all' | 'discussing' | 'studying' | 'recommending';

interface FeedModeSelectorProps {
  currentMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

export const FeedModeSelector: React.FC<FeedModeSelectorProps> = ({
  currentMode,
  onModeChange,
  isEnabled,
  onToggleEnabled
}) => {
  const options: { id: FeedMode; label: string }[] = [
    { id: 'all', label: 'Лента' },
    { id: 'discussing', label: 'Обсуждают' },
    { id: 'studying', label: 'Изучают' },
    { id: 'recommending', label: 'Рекомендуют' },
  ];

  return (
    <div className="bg-white px-5 py-4 rounded-2xl border border-black/10 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-3 font-sans">
      <div className="flex flex-col gap-2.5">
        {/* itd.com pill segmented tab bar */}
        <div className="p-1 bg-[#ebebeb] rounded-full flex flex-wrap items-center gap-1 select-none w-full">
          {options.map((opt) => {
            const isSelected = currentMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onModeChange(opt.id)}
                className={`flex-1 min-w-[120px] px-3.5 py-2 text-[13px] font-medium rounded-full transition-all duration-200 whitespace-nowrap text-center cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#1a1a1a] font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'text-[#7a7a7a] hover:text-[#1a1a1a] hover:bg-white/40'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Humanized, elegant explanation text */}
        <p className="text-[12px] text-zinc-500 leading-relaxed text-left font-normal px-0.5">
          Публикации сообщества Следы помогают находить интересные мысли, новости и обсуждения других людей.
        </p>
      </div>
    </div>
  );
};
