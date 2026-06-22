import React from 'react';
import { motion } from 'motion/react';
import { Eye, ShieldAlert, ArrowLeft, Sparkles } from 'lucide-react';

interface ProfilePreviewStatusProps {
  isActive: boolean;
  onExit: () => void;
  userName: string;
}

export const ProfilePreviewStatus: React.FC<ProfilePreviewStatusProps> = ({
  isActive,
  onExit,
  userName
}) => {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-r from-teal-600 via-teal-700 to-[#5181b8] text-white p-3 px-4 rounded-[3px] shadow-md border border-teal-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 select-none"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1 px-1.5 bg-white/20 text-white rounded font-mono text-[9.5px] uppercase font-bold flex items-center gap-1 animate-pulse">
          <Eye size={11} />
          РЕЖИМ ПРЕДПРОСМОТРА
        </div>
        <div className="text-[12.5px] leading-tight text-teal-50">
          Вы видите свой профиль {` `}
          <span className="font-semibold text-white">«{userName}»</span> так, как его видят другие участники сети с учётом параметров приватности и публичной идентичности ( overlay ).
        </div>
      </div>

      <button
        onClick={onExit}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white text-teal-800 hover:bg-teal-50 rounded-[3px] text-[11.5px] font-bold transition-all shadow-sm cursor-pointer"
      >
        <ArrowLeft size={13} />
        Выйти из предпросмотра
      </button>
    </motion.div>
  );
};
