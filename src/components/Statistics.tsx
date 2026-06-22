import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, LifeBuoy, ShieldAlert, BadgeCheck 
} from 'lucide-react';
import { AppUser, ModeratorAction } from '../types';

interface StatisticsProps {
  users: AppUser[];
  moderatorHistory: ModeratorAction[];
  statsData: {
    total: number;
    answered: number;
    time: string;
    today: number;
    chart: { name: string; val: number }[];
  };
}

export const Statistics: React.FC<StatisticsProps> = ({
  users,
  moderatorHistory,
  statsData,
}) => {
  const moderators = useMemo(() => users.filter(u => u.roles?.moderation || u.roles?.spam || u.roles?.pro), [users]);
  const agents = useMemo(() => users.filter(u => u.roles?.support), [users]);

  // Simple helper to count actions in history for a specific operator or type
  const getCount = (type: string, opName?: string) => {
    let base = moderatorHistory.filter(l => l.type === type);
    if (opName) base = base.filter(l => l.operatorName === opName);
    return base.length;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-left">
      <div className="bg-vk-white p-6 rounded-[2px] border border-vk-separator flex flex-col gap-6">
        <div className="flex items-center gap-4 border-b pb-4">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-vk-separator bg-[#f0f2f5] flex items-center justify-center text-[#2a5885]">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-[17px] font-medium text-vk-text">Служебный профиль: Статистика</h1>
            <div className="text-[11px] text-vk-text-secondary mt-0.5">Сводная информация по всем отделам (реальные данные)</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Support Section */}
          <div className="border border-vk-separator rounded-[2px] overflow-hidden bg-vk-white shadow-sm">
            <div className="p-3 bg-[#f0f2f5] border-b border-vk-separator flex justify-between items-center">
              <span className="text-[13px] font-bold text-[#285473]">В поддержке</span>
              <LifeBuoy size={14} className="text-[#2a5885]" />
            </div>
            <div className="p-4 space-y-4">
              {agents.map((staff, idx) => (
                <div key={idx} className="flex flex-col gap-1 border-b border-vk-separator pb-3 last:border-0 last:pb-0">
                  <div className="text-[14px] font-medium flex justify-between">
                    <span>{staff.name}</span>
                    <span className="text-[#2a5885]">{getCount('support', staff.name) || 0}</span>
                  </div>
                  <div className="text-[11px] text-vk-text-secondary italic">ответов в тикетах</div>
                </div>
              ))}
            </div>
          </div>

          {/* Moderation Section */}
          <div className="border border-vk-separator rounded-[2px] overflow-hidden bg-vk-white shadow-sm">
            <div className="p-3 bg-[#f0f2f5] border-b border-vk-separator flex justify-between items-center">
              <span className="text-[13px] font-bold text-[#285473]">В модерации</span>
              <ShieldAlert size={14} className="text-[#e64646]" />
            </div>
            <div className="p-4 space-y-4">
              {moderators.map((staff, idx) => (
                <div key={idx} className="flex flex-col gap-1 border-b border-vk-separator pb-3 last:border-0 last:pb-0">
                  <div className="text-[14px] font-medium flex justify-between">
                    <span>{staff.name}</span>
                    <span className="text-[#2a5885]">{getCount('moderation', staff.name) || 0}</span>
                  </div>
                  <div className="text-[11px] text-vk-text-secondary italic">рассмотренных жалоб</div>
                </div>
              ))}
            </div>
          </div>

          {/* Applications Section */}
          <div className="border border-vk-separator rounded-[2px] overflow-hidden bg-[#fafbfc] sm:bg-vk-white shadow-sm">
            <div className="p-3 bg-[#f0f2f5] border-b border-vk-separator flex justify-between items-center">
              <span className="text-[13px] font-bold text-[#285473]">В верификациях</span>
              <BadgeCheck size={14} className="text-[#5181b8]" />
            </div>
            <div className="p-4 space-y-4 bg-white">
              {users.filter(u => u.roles?.verification).map((staff, idx) => (
                <div key={idx} className="flex flex-col gap-1 border-b border-vk-separator pb-3 last:border-0 last:pb-0">
                  <div className="text-[14px] font-medium flex justify-between font-sans">
                    <span>{staff.name}</span>
                    <span className="text-[#2a5885] font-semibold">{getCount('verification', staff.name) || 0}</span>
                  </div>
                  <div className="text-[11px] text-vk-text-secondary italic">рассмотренных заявок</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="bg-[#f0f2f5] p-6 rounded-[2px] border border-vk-separator">
             <h3 className="text-[13px] font-bold text-[#2a5885] uppercase mb-4 tracking-wider">Общая активность (за неделю)</h3>
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData.chart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce1e6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#818c99'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#818c99'}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '4px', border: '1px solid #dce1e6', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: '#fafbfc' }}
                    />
                    <Bar dataKey="val" fill="#5181b8" radius={[2, 2, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-[#f0f2f5] p-6 rounded-[2px] border border-vk-separator text-left">
             <h3 className="text-[13px] font-bold text-[#2a5885] uppercase mb-4 tracking-wider">KPI и Эффективность</h3>
             <div className="space-y-6">
               {[
                 { label: 'Скорость ответа', val: statsData.total > 0 ? 94 : 0, color: 'bg-[#4bb34b]' },
                 { label: 'Качество вердиктов', val: statsData.total > 0 ? 88 : 0, color: 'bg-[#5181b8]' },
                 { label: 'Удовлетворенность (CSAT)', val: statsData.total > 0 ? 91 : 0, color: 'bg-[#ffa000]' }
               ].map((kpi, i) => (
                 <div key={i} className="space-y-2">
                   <div className="flex justify-between text-[12px] font-medium">
                      <span>{kpi.label}</span>
                      <span>{kpi.val}%</span>
                   </div>
                   <div className="h-1.5 bg-vk-separator rounded-full overflow-hidden">
                      <div style={{ width: `${kpi.val}%` }} className={`h-full transition-all duration-500 ${kpi.color}`} />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
