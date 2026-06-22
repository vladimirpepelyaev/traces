import React from 'react';
import { POST_FORMATS, PostFormat } from './postFormatTypes';

interface PostFormatFilterProps {
  selectedFormat: PostFormat | 'ALL';
  onChange: (format: PostFormat | 'ALL') => void;
  className?: string;
}

export const PostFormatFilter: React.FC<PostFormatFilterProps> = ({
  selectedFormat,
  onChange,
  className = '',
}) => {
  const options: { id: PostFormat | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'Все' },
    { id: 'QUESTION', label: 'Вопросы' },
    { id: 'OPINION', label: 'Мнения' },
    { id: 'ANALYSIS', label: 'Разборы' },
    { id: 'RESEARCH', label: 'Исследования' },
    { id: 'SOLUTION', label: 'Решения' },
  ];

  return (
    <div className={`p-0.5 bg-zinc-100/90 rounded-lg border border-zinc-200/50 flex items-center gap-0.5 select-none overflow-x-auto scrollbar-none max-w-full shrink-0 ${className}`}>
      {options.map((opt) => {
        const isSelected = selectedFormat === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1 text-[11.5px] font-medium rounded-md transition-all duration-150 whitespace-nowrap cursor-pointer ${
              isSelected
                ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};


