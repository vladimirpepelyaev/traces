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
    <div className={`p-1 bg-[#ebebeb] rounded-full flex items-center gap-1 select-none overflow-x-auto scrollbar-none max-w-full shrink-0 ${className}`}>
      {options.map((opt) => {
        const isSelected = selectedFormat === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-all duration-200 whitespace-nowrap cursor-pointer ${
              isSelected
                ? 'bg-white text-[#1a1a1a] font-semibold shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                : 'text-[#7a7a7a] hover:text-[#1a1a1a] hover:bg-white/40'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};


