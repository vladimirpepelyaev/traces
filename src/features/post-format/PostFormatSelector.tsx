import React from 'react';
import { POST_FORMATS, PostFormat } from './postFormatTypes';

interface PostFormatSelectorProps {
  value: PostFormat;
  onChange: (value: PostFormat) => void;
  className?: string;
}

export const PostFormatSelector: React.FC<PostFormatSelectorProps> = ({ value, onChange, className = '' }) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-bold text-[#818c99] tracking-widest uppercase">Формат публикации</span>
      <div className="flex flex-wrap gap-1 p-0.5 bg-[#f0f2f5] rounded-[4px] border border-[#dce1e6] w-fit">
        {POST_FORMATS.map((format) => {
          const isSelected = value === format.id;
          return (
            <button
              key={format.id}
              type="button"
              onClick={() => onChange(format.id)}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? 'bg-white text-vk-text shadow-sm border border-[#dce1e6] font-semibold'
                  : 'text-vk-text-secondary hover:bg-white/40 border border-transparent'
              }`}
            >
              <span>{format.icon}</span>
              <span className={isSelected ? format.textClass : ''}>{format.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
