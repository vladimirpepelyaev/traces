import React from 'react';
import { POST_FORMATS, PostFormat } from './postFormatTypes';

interface PostFormatBadgeProps {
  format?: PostFormat;
  className?: string;
}

export const PostFormatBadge: React.FC<PostFormatBadgeProps> = ({ format = 'OPINION', className = '' }) => {
  const formatInfo = POST_FORMATS.find(f => f.id === format) || POST_FORMATS[1]; // default to OPINION
  
  return (
    <span className={`inline-flex items-center justify-center rounded-[5px] text-[10px] font-bold uppercase tracking-tight border bg-zinc-50/80 border-zinc-200 text-zinc-500 whitespace-nowrap px-1.5 py-0.5 select-none align-middle ${className}`}>
      {formatInfo.label}
    </span>
  );
};
