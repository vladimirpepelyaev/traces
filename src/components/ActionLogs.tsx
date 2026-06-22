import React from 'react';
import { motion } from 'motion/react';
import { 
  History, Download, Gavel, CheckCircle 
} from 'lucide-react';
import { ModeratorAction } from '../types';

interface ActionLogsProps {
  moderatorHistory: ModeratorAction[];
  undoAction: (id: string) => void;
}

export const ActionLogs: React.FC<ActionLogsProps> = ({
  moderatorHistory,
  undoAction,
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-left">
      <div className="bg-vk-white p-6 rounded-[4px] border border-vk-separator shadow-sm">
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-vk-separator bg-[#f0f2f5] flex items-center justify-center text-[#2a5885]">
              <History size={20} />
            </div>
            <div>
              <h1 className="text-[17px] font-medium text-vk-text">Логи действий</h1>
              <div className="text-[11px] text-vk-text-secondary mt-0.5">История модерации в реальном времени</div>
            </div>
          </div>
          <button className="text-[12.5px] text-[#2a5885] font-medium hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none">
             <Download size={14} /> Скачать отчет
          </button>
        </div>

        <div className="space-y-3">
          {moderatorHistory.length > 0 ? moderatorHistory.slice().reverse().map((log) => (
            <div key={log.id} className="p-4 bg-[#f5f7f8] border border-vk-separator rounded-[4px] hover:border-[#5181b8]/30 transition-all group text-left">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                   <div className="w-8 h-8 rounded-full bg-white border border-vk-separator flex items-center justify-center shrink-0">
                      {log.type === 'moderation' ? <Gavel size={14} className="text-[#ff3347]" /> : <CheckCircle size={14} className="text-[#4bb34b]" />}
                   </div>
                   <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-bold text-vk-text">{log.action}</span>
                        <span className="text-[11px] text-vk-text-secondary">•</span>
                        <span className="text-[11px] text-vk-text-secondary">{new Date(log.timestamp).toLocaleString('ru-RU')}</span>
                      </div>
                      <p className="text-[13px] text-vk-text-secondary mt-1 break-words">{log.message}</p>
                      {log.targetName && (
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[11px] text-vk-text-secondary">Объект:</span>
                           <span className="text-[11px] font-medium text-[#2a5885] underline cursor-pointer truncate max-w-[200px]">{log.targetName}</span>
                        </div>
                      )}
                   </div>
                </div>
                <div className="text-right flex flex-col items-end shrink-0">
                   <div className="text-[11px] font-medium text-vk-text">{log.operatorName}</div>
                   <div className="text-[10px] text-vk-text-secondary mt-0.5">ID: {log.operatorId}</div>
                   <button 
                     onClick={() => undoAction(log.id)}
                     className="mt-2 text-[11px] text-[#2a5885] opacity-0 group-hover:opacity-100 font-medium hover:underline transition-opacity cursor-pointer bg-transparent border-none"
                    >
                      Отменить действие
                    </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
               <History size={48} strokeWidth={1} />
               <div className="text-[14px]">История действий пока пуста</div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
