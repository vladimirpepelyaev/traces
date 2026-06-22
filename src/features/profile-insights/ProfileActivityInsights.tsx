import React from 'react';
import { Compass, PenTool, BookOpen, MessageSquare, Info } from 'lucide-react';

interface ProfileActivityInsightsProps {
  activity?: {
    writing: number;
    reading: number;
    discussing: number;
  };
  userName: string;
  profileMode?: 'open' | 'minimal' | 'anonymous';
}

export const ProfileActivityInsights: React.FC<ProfileActivityInsightsProps> = ({
  activity = { writing: 35, reading: 45, discussing: 20 },
  userName,
  profileMode = 'open'
}) => {
  // Normalize to sum up to exactly 100% just in case
  const total = activity.writing + activity.reading + activity.discussing;
  const writingPct = total > 0 ? Math.round((activity.writing / total) * 100) : 35;
  const readingPct = total > 0 ? Math.round((activity.reading / total) * 100) : 45;
  const discussingPct = total > 0 ? 100 - writingPct - readingPct : 20;

  const isMinimal = profileMode === 'minimal';

  return (
    <div className="bg-vk-white p-5 border border-[#e1e5eb] rounded-[2px] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-[#285473] uppercase tracking-wider flex items-center gap-1.5 select-none">
          <Compass size={15} className="text-teal-600" />
          Метрики внимания
        </h3>
        <span className="text-[10px] text-[#818c99] font-mono">Активность: {userName}</span>
      </div>

      <p className="text-[12px] text-[#656565] leading-relaxed">
        Баланс ментальной энергии пользователя на платформе. Измеряется локально на основе ваших действий (создание мыслей, вдумчивое чтение, участие в диалогах).
      </p>

      {/* Allocation Segment Bar */}
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden flex">
        <div 
          style={{ width: `${writingPct}%` }} 
          className="bg-teal-500 h-full transition-all duration-500" 
          title={`Создание мыслей: ${writingPct}%`}
        />
        <div 
          style={{ width: `${readingPct}%` }} 
          className="bg-amber-500 h-full transition-all duration-500" 
          title={`Глубокое чтение: ${readingPct}%`}
        />
        <div 
          style={{ width: `${discussingPct}%` }} 
          className="bg-sky-500 h-full transition-all duration-500" 
          title={`Дискуссии: ${discussingPct}%`}
        />
      </div>

      {/* Numerical Data Board - Minimal, high contrast typographic representation */}
      {!isMinimal && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Writing Column */}
          <div className="space-y-1 bg-teal-50/20 p-2.5 border border-teal-100/50 rounded-[2px]">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-800">
              <PenTool size={13} />
              <span>Мысли</span>
            </div>
            <div className="text-2xl font-bold font-mono text-teal-900 leading-none">
              {writingPct}%
            </div>
            <p className="text-[10.5px] text-[#656565] leading-tight">
              Создание постов и фиксация наблюдений.
            </p>
          </div>

          {/* Reading Column */}
          <div className="space-y-1 bg-amber-50/20 p-2.5 border border-amber-100/50 rounded-[2px]">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
              <BookOpen size={13} />
              <span>Вдумчивость</span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-900 leading-none">
              {readingPct}%
            </div>
            <p className="text-[10.5px] text-[#656565] leading-tight">
              Чтение постов в фокус-режимах без спешки.
            </p>
          </div>

          {/* Discussing Column */}
          <div className="space-y-1 bg-sky-50/20 p-2.5 border border-sky-100/50 rounded-[2px]">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-800">
              <MessageSquare size={13} />
              <span>Дискуссии</span>
            </div>
            <div className="text-2xl font-bold font-mono text-sky-900 leading-none">
              {discussingPct}%
            </div>
            <p className="text-[10.5px] text-[#656565] leading-tight">
              Развитие суждений в ветвях общения.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10px] text-[#818c99] leading-tight select-none">
        <Info size={11.5} className="text-[#5181b8]" />
        <span>Чем детальнее вы погружаетесь в текст, тем сбалансированнее профиль.</span>
      </div>
    </div>
  );
};
