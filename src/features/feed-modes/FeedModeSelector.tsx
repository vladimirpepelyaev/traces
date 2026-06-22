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
    { id: 'all', label: 'Все следы' },
    { id: 'discussing', label: 'Что обсуждают' },
    { id: 'studying', label: 'Что изучают' },
    { id: 'recommending', label: 'Что рекомендуют' },
  ];

  return (
    <div className="bg-vk-white px-5 py-4 rounded-xl border border-zinc-200/60 shadow-xs flex flex-col gap-3 font-sans">
      <div className="flex flex-col gap-2.5">
        {/* iOS-style segmented switch */}
        <div className="p-0.5 bg-zinc-100/95 rounded-lg border border-zinc-200/50 flex flex-wrap items-center gap-0.5 select-none w-full">
          {options.map((opt) => {
            const isSelected = currentMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onModeChange(opt.id)}
                className={`flex-1 min-w-[120px] px-3 py-2 text-[12.5px] font-medium rounded-md transition-all duration-150 whitespace-nowrap text-center cursor-pointer ${
                  isSelected
                    ? 'bg-white text-zinc-900 font-semibold shadow-xs border border-zinc-200/20'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Humanized, elegant explanation text */}
        <p className="text-[12px] text-zinc-500 leading-relaxed text-left font-normal px-0.5">
          Следы сообщества помогают находить интересные мысли, вопросы и выводы других людей. Формат показывает, каким способом автор раскрывает свою мысль.
        </p>
      </div>
    </div>
  );
};
