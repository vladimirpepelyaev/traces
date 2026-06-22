import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Activity, LogOut, LogIn, Cpu, Database, Zap, Clock, RefreshCcw 
} from 'lucide-react';
import { AppUser } from '../types';

interface MonitoringProps {
  monitoringStats: { cpu: number; ram: number; dbLoad: number; queueSize: number; uptime: string };
  isShiftActive: boolean;
  setIsShiftActive: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser: AppUser | null;
  staffShifts: any[];
  setStaffShifts: React.Dispatch<React.SetStateAction<any[]>>;
  addNotification: (title: string, message: string) => void;
  logModeratorAction: (type: string, msg: string) => void;
  isSimulating: boolean;
  setIsSimulating: React.Dispatch<React.SetStateAction<boolean>>;
  simulationCounter: number;
  simulationSpeed: 'slow' | 'normal' | 'fast';
  setSimulationSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
}

export const Monitoring: React.FC<MonitoringProps> = ({
  monitoringStats,
  isShiftActive,
  setIsShiftActive,
  currentUser,
  staffShifts,
  setStaffShifts,
  addNotification,
  logModeratorAction,
  isSimulating,
  setIsSimulating,
  simulationCounter,
  simulationSpeed,
  setSimulationSpeed,
}) => {
  const chartData = [
    { time: '10:00', cpu: 20, ram: 40, api: 120 },
    { time: '10:05', cpu: 25, ram: 42, api: 135 },
    { time: '10:10', cpu: 22, ram: 45, api: 110 },
    { time: '10:15', cpu: 30, ram: 43, api: 125 },
    { time: '10:20', cpu: 24, ram: 45, api: 130 },
    { time: '10:25', cpu: Number(monitoringStats.cpu.toFixed(0)), ram: Number(monitoringStats.ram.toFixed(0)), api: 115 },
  ];

  const toggleShift = () => {
    if (!isShiftActive) {
      setIsShiftActive(true);
      const newShift = { id: Date.now().toString(), name: currentUser?.name || 'Вы', start: new Date() };
      setStaffShifts(prev => [newShift, ...prev]);
      logModeratorAction('Смена', 'Смена начата');
      addNotification('Смена начата', 'Ваша активность теперь фиксируется в системе');
    } else {
      setIsShiftActive(false);
      setStaffShifts(prev => prev.map((s, i) => i === 0 ? { ...s, end: new Date() } : s));
      logModeratorAction('Смена', 'Смена завершена');
      addNotification('Смена завершена', 'Рабочий день закончен');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-left">
      <div className="bg-vk-white p-6 rounded-[4px] border border-vk-separator shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-vk-separator bg-[#f0f2f5] flex items-center justify-center text-[#2a5885]">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-[17px] font-medium text-vk-text">Мониторинг системы</h1>
              <div className="text-[11px] text-vk-text-secondary mt-0.5">Техническое состояние в реальном времени</div>
            </div>
          </div>
          <button 
            onClick={toggleShift}
            className={`px-4 py-1.5 rounded-[4px] text-[12.5px] font-medium transition-all flex items-center gap-2 cursor-pointer ${isShiftActive ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-[#5181b8] text-white hover:bg-[#5b88bd]'}`}
          >
            {isShiftActive ? <LogOut size={16} /> : <LogIn size={16} />}
            {isShiftActive ? 'ЗАВЕРШИТЬ СМЕНУ' : 'НАЧАТЬ СМЕНУ'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-4 bg-white border border-vk-separator rounded-[4px] shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-vk-text-secondary uppercase">Загрузка CPU</span>
              <Cpu size={14} className="text-[#5181b8]" />
            </div>
            <div className="text-2xl font-bold text-vk-text">{monitoringStats.cpu.toFixed(1)}%</div>
            <div className="w-full bg-[#f0f2f5] h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                 style={{ width: `${monitoringStats.cpu}%` }}
                 className={`h-full transition-all duration-500 ${monitoringStats.cpu > 80 ? 'bg-red-500' : 'bg-[#5181b8]'}`}
              />
            </div>
          </div>
          <div className="p-4 bg-white border border-vk-separator rounded-[4px] shadow-sm">
            <div className="flex justify-between items-center mb-2">
               <span className="text-[11px] font-bold text-vk-text-secondary uppercase">Использование RAM</span>
               <Database size={14} className="text-[#4bb34b]" />
            </div>
            <div className="text-2xl font-bold text-vk-text">{monitoringStats.ram.toFixed(1)}%</div>
            <div className="w-full bg-[#f0f2f5] h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                 style={{ width: `${monitoringStats.ram}%` }}
                 className="h-full bg-[#4bb34b] transition-all duration-500"
              />
            </div>
          </div>
          <div className="p-4 bg-white border border-vk-separator rounded-[4px] shadow-sm">
             <div className="flex justify-between items-center mb-2">
               <span className="text-[11px] font-bold text-vk-text-secondary uppercase">API Latency</span>
               <Zap size={14} className="text-[#ffa000]" />
             </div>
             <div className="text-2xl font-bold text-vk-text">125ms</div>
             <div className="text-[10px] text-[#4bb34b] font-bold mt-1">Оптимально</div>
          </div>
          <div className="p-4 bg-white border border-vk-separator rounded-[4px] shadow-sm">
             <div className="flex justify-between items-center mb-2">
               <span className="text-[11px] font-bold text-vk-text-secondary uppercase">Текущая смена</span>
               <Clock size={14} className="text-[#5181b8]" />
             </div>
             <div className="text-[14px] font-bold text-vk-text">{isShiftActive ? 'Активна' : 'Не начата'}</div>
             <div className="text-[10px] text-vk-text-secondary mt-1">{isShiftActive ? `Начало в ${staffShifts[0]?.start ? new Date(staffShifts[0]?.start).toLocaleTimeString() : '—'}` : '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#fcfdff] border border-vk-separator rounded-[4px] p-6 lg:col-span-2">
             <h3 className="text-[13px] font-bold text-[#2a5885] mb-6 uppercase tracking-wider">Графики производительности</h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                   <defs>
                     <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#5181b8" stopOpacity={0.2}/>
                       <stop offset="95%" stopColor="#5181b8" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <Tooltip 
                     contentStyle={{ borderRadius: '4px', border: '1px solid #dce1e6', fontSize: '12px' }}
                   />
                   <Area type="monotone" dataKey="cpu" stroke="#5181b8" fillOpacity={1} fill="url(#colorCpu)" name="CPU %" />
                   <Area type="monotone" dataKey="api" stroke="#ffa000" fillOpacity={0} name="API ms" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white border border-vk-separator rounded-[4px] p-4 flex flex-col gap-4">
             <div className="border-b border-vk-separator pb-4 mb-2">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-[11.5px] font-bold text-[#2a5885] uppercase tracking-wider flex items-center gap-1.5">
                   <span className="relative flex h-2 w-2">
                     <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSimulating ? 'bg-red-400' : 'bg-gray-400'} opacity-75`}></span>
                     <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                   </span>
                   Симулятор потока
                 </h3>
                 <span className="text-[11px] bg-[#f0f2f5] px-2 py-0.5 rounded-[4px] font-mono font-medium text-vk-text-secondary">
                   +{simulationCounter} симул.
                 </span>
               </div>
               <p className="text-[11.5px] text-vk-text-secondary mb-3">
                 Эмулирует входящий поток новых жалоб пользователей на публикации и тикетов в техподдержку.
               </p>
               <div className="flex gap-2 mb-3">
                 <button 
                   onClick={() => setIsSimulating(!isSimulating)}
                   className={`w-full py-1.5 px-3 rounded-[4px] text-[12px] font-medium transition-all cursor-pointer ${isSimulating ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-[#4bb34b]/10 text-[#4bb34b] border border-[#4bb34b]/30 hover:bg-[#4bb34b]/20'}`}
                 >
                   {isSimulating ? 'Остановить симуляцию' : 'Запустить симуляцию'}
                 </button>
               </div>
               {isSimulating && (
                 <div className="space-y-1.5">
                   <div className="text-[10px] uppercase font-bold text-vk-text-secondary">Интенсивность генерации:</div>
                   <div className="grid grid-cols-3 gap-1.5">
                     {(['slow', 'normal', 'fast'] as const).map((speed) => (
                       <button
                         key={speed}
                         onClick={() => setSimulationSpeed(speed)}
                         className={`py-1 px-1.5 rounded text-[10.5px] font-medium border text-center transition-colors cursor-pointer ${simulationSpeed === speed ? 'bg-[#5181b8] border-[#5181b8] text-white' : 'bg-white border-vk-separator text-vk-text-secondary hover:bg-[#fafbfc]'}`}
                       >
                         {speed === 'slow' ? 'Редкая' : speed === 'normal' ? 'Средняя' : 'Лавина!'}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
             </div>

             <h3 className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Управление узлами</h3>
             <div className="space-y-3">
               {[
                 { id: 'web-srv-01', status: 'online', load: '12%' },
                 { id: 'web-srv-02', status: 'online', load: '15%' },
                 { id: 'db-primary', status: 'online', load: '8%' },
                 { id: 'cache-node', status: 'online', load: '22%' }
               ].map(node => (
                 <div key={node.id} className="p-3 bg-[#fafbfc] border border-vk-separator rounded-[4px] flex items-center justify-between group">
                   <div>
                      <div className="text-[12px] font-bold text-[#285473]">{node.id}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#4bb34b]" />
                         <span className="text-[10px] text-[#4bb34b] font-bold uppercase">{node.status}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-vk-text-secondary">{node.load}</span>
                      <button 
                        onClick={() => {
                          logModeratorAction('Узел', `Принудительная перезагрузка узла ${node.id}`);
                          addNotification('Команда отправлена', `Узел ${node.id} перезагружается...`);
                        }}
                        className="p-1.5 text-[#5181b8] hover:bg-[#5181b8]/10 rounded-[4px] cursor-pointer bg-transparent border-none"
                      >
                        <RefreshCcw size={14} />
                      </button>
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
