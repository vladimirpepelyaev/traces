import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, Search, ShieldCheck, Lock, FileWarning, Terminal, LogIn, Settings 
} from 'lucide-react';
import { ModeratorAction } from '../types';

interface SecurityProps {
  operatorName: string;
  addNotification: (title: string, message: string) => void;
  addModeratorLog: (log: Omit<ModeratorAction, 'id' | 'operatorId' | 'operatorName' | 'timestamp'>) => void;
}

export const Security: React.FC<SecurityProps> = ({
  operatorName,
  addNotification,
  addModeratorLog
}) => {
  const [securitySearchQuery, setSecuritySearchQuery] = useState('');
  const [isBruteForceActive, setIsBruteForceActive] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [newBlockedIP, setNewBlockedIP] = useState('');
  const [newBlockedIPReason, setNewBlockedIPReason] = useState('Атака на API/Брутфорс');

  const [securityLogs] = useState([
    { id: '1', event: 'Вход в панель', ip: '192.168.1.1', user: 'Admin (ID 1)', time: '10:45:12', status: 'success', device: 'Chrome / Windows 11' },
    { id: '2', event: 'Массовая блокировка', ip: '192.168.1.1', user: 'Admin (ID 1)', time: '10:30:05', status: 'warning', device: 'Chrome / Windows 11' },
    { id: '3', event: 'Ошибка авторизации', ip: '45.12.8.23', user: 'Unknown', time: '09:12:44', status: 'error', device: 'Safari / iPhone' },
    { id: '4', event: 'Смена пароля оператора', ip: '192.168.1.42', user: 'Mod_Ivan (ID 4)', time: '08:55:01', status: 'success', device: 'Firefox / Linux' },
    { id: '5', event: 'Экспорт базы данных', ip: '192.168.1.42', user: 'Mod_Ivan (ID 4)', time: '08:40:22', status: 'critical', device: 'Postman Runtime' }
  ]);

  const [blockedIPs, setBlockedIPs] = useState([
    { id: 'ip-1', ip: '185.220.101.5', reason: 'DDoS/Флуд запросами', date: 'Вчера, 14:22', staff: 'Мария' },
    { id: 'ip-2', ip: '45.143.22.89', reason: 'Спам сквозь шлюзы', date: 'Вчера, 18:01', staff: 'Александр' }
  ]);

  const filteredLogs = securityLogs.filter(l => 
    l.user.toLowerCase().includes(securitySearchQuery.toLowerCase()) || 
    l.ip.includes(securitySearchQuery) ||
    l.event.toLowerCase().includes(securitySearchQuery.toLowerCase())
  );

  const handleBlockIP = () => {
    if (!newBlockedIP.trim()) {
      addNotification('Ошибка', 'Введите валидный IP-адрес');
      return;
    }
    const newItem = {
      id: `ip-${Date.now()}`,
      ip: newBlockedIP.trim(),
      reason: newBlockedIPReason,
      date: 'Сегодня, ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      staff: operatorName
    };
    setBlockedIPs(prev => [newItem, ...prev]);
    setNewBlockedIP('');
    addNotification('Заблокировано', `IP-адрес ${newItem.ip} добавлен в черный список`);
    addModeratorLog({
      type: 'security',
      action: 'Блокировка IP-адреса',
      message: `IP-адрес ${newItem.ip} заблокирован на шлюзе доступа. Причина: ${newItem.reason}`,
      targetName: newItem.ip
    });
  };

  const handleUnblockIP = (id: string, ip: string) => {
    setBlockedIPs(prev => prev.filter(item => item.id !== id));
    addNotification('Разблокировано', `IP-адрес ${ip} удален из черного списка`);
    addModeratorLog({
      type: 'security',
      action: 'Разблокировка IP-адреса',
      message: `Разблокирован IP-адрес ${ip} оператором по запросу`,
      targetName: ip
    });
  };

  const handleRevokeSuspicious = () => {
    addNotification('Успех', 'Все подозрительные сессии принудительно сброшены');
    addModeratorLog({
      type: 'security',
      action: 'Сброс сессий операторов',
      message: `Выполнен экстренный сброс всех активных сессий сторонних операторов с неподтвержденных устройств`,
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-left">
      <div className="bg-vk-white p-6 rounded-[2px] border border-vk-separator shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-vk-separator bg-[#f0f2f5] flex items-center justify-center text-[#2a5885]">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-[17px] font-medium text-vk-text">Панель ИБ & Безопасности</h1>
              <div className="text-[11px] text-vk-text-secondary mt-0.5">Операционное управление доступом, брандмауэром и логами системных событий</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Search size={14} /></div>
              <input 
                type="text" 
                placeholder="Быстрый поиск логов..."
                value={securitySearchQuery}
                onChange={(e) => setSecuritySearchQuery(e.target.value)}
                className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] pl-9 pr-3 py-1.5 text-[13px] focus:outline-none focus:bg-white focus:border-[#5181b8]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-[#4bb34b]/5 to-[#4bb34b]/10 border border-[#4bb34b]/20 rounded-[4px] flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#4bb34b] border border-[#e7e8ec] shadow-sm"><ShieldCheck size={20} /></div>
             <div>
                <div className="text-xl font-bold text-vk-text">124</div>
                <div className="text-[10px] uppercase font-bold text-vk-text-secondary">Чистых сессий</div>
             </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-[#ffa000]/5 to-[#ffa000]/10 border border-[#ffa000]/20 rounded-[4px] flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#ffa000] border border-[#e7e8ec] shadow-sm"><Lock size={20} /></div>
             <div>
                <div className="text-xl font-bold text-vk-text">{blockedIPs.length}</div>
                <div className="text-[10px] uppercase font-bold text-vk-text-secondary">IP в черном списке</div>
             </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-[#ff3347]/5 to-[#ff3347]/10 border border-[#ff3347]/20 rounded-[4px] flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#ff3347] border border-[#e7e8ec] shadow-sm"><FileWarning size={20} /></div>
             <div>
                <div className="text-xl font-bold text-vk-text">3</div>
                <div className="text-[10px] uppercase font-bold text-vk-text-secondary">Подозрит. входа</div>
             </div>
          </div>
          <div className="p-4 bg-gradient-to-br from-[#5181b8]/5 to-[#5181b8]/10 border border-[#5181b8]/20 rounded-[4px] flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#5181b8] border border-[#e7e8ec] shadow-sm"><Terminal size={20} /></div>
             <div>
                <div className="text-xl font-bold text-vk-text">{isBruteForceActive ? 'АКТИВНА' : 'ВЫКЛ'}</div>
                <div className="text-[10px] uppercase font-bold text-vk-text-secondary">Защита брутфорса</div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-[13px] font-bold text-[#2a5885] uppercase tracking-wider">Лог визитов & Аудит авторизаций</h3>
            <div className="overflow-hidden border border-vk-separator rounded-[4px] shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f5f7f8] text-[#55677d] text-[11px] uppercase font-bold border-b border-vk-separator">
                  <tr>
                    <th className="px-4 py-3">Событие / Устройство</th>
                    <th className="px-4 py-3">Пользователь</th>
                    <th className="px-4 py-3">IP-адрес</th>
                    <th className="px-4 py-3 text-right">Статус</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] divide-y divide-vk-separator bg-white">
                  {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#fafbfc] transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.status === 'success' ? 'bg-[#5181b8]/10 text-[#5181b8]' : 'bg-red-50 text-red-500'}`}>
                             {log.event.includes('Вход') ? <LogIn size={14} /> : <Terminal size={14} />}
                          </div>
                          <div>
                            <div className="font-semibold text-vk-text">{log.event}</div>
                            <div className="text-[11px] text-vk-text-secondary font-mono">{(log as any).device || 'Chrome / MacOS'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                         <div className="text-[#2a5885] font-medium">{log.user}</div>
                         <div className="text-[10px] text-vk-text-secondary">Уровень: Доверенный</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11.5px] text-vk-text-secondary">{log.ip}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] border ${
                          log.status === 'success' ? 'bg-[#4bb34b]/10 text-[#4bb34b] border-[#4bb34b]/20' :
                          log.status === 'warning' ? 'bg-[#ffa000]/10 text-[#ffa000] border-[#ffa000]/20' :
                          'bg-[#ff3347]/10 text-[#ff3347] border-[#ff3347]/20'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-20 text-center opacity-30 italic">Событий безопасности не найдено</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-5 bg-[#fafbfc] border border-vk-separator rounded-[4px] space-y-4 shadow-sm text-left">
              <h3 className="text-[13px] font-bold text-vk-text uppercase tracking-normal border-b pb-2 flex items-center gap-2">
                 <Settings size={14} className="text-[#2a5885]" /> Параметры авторизации
              </h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-medium text-vk-text block">Защита от подбора</span>
                  <span className="text-[10.5px] text-vk-text-secondary block">Авто-блокировка IP</span>
                </div>
                <button 
                  onClick={() => {
                    setIsBruteForceActive(!isBruteForceActive);
                    addNotification('Безопасность', !isBruteForceActive ? 'Защита от брутфорса включена' : 'Защита от брутфорса деактивирована');
                  }}
                  className={`px-3 py-1 rounded-[4px] text-[11.5px] font-medium transition-colors border cursor-pointer ${
                    isBruteForceActive ? 'bg-[#4bb34b] text-white border-[#4bb34b]' : 'bg-gray-100 text-gray-400 border-gray-300'
                  }`}
                >
                  {isBruteForceActive ? 'АКТИВНА' : 'ОТКЛ'}
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-vk-text-secondary font-semibold uppercase mb-1">Максимум неверных попыток входа</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min={1} 
                    max={20}
                    value={maxAttempts} 
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                    className="w-20 bg-white border border-[#dce1e6] rounded-[4px] px-2.5 py-1 text-[13px] focus:outline-none focus:border-[#5181b8]"
                  />
                  <button 
                    onClick={() => addNotification('Сохранено', `Параметр изменен на: ${maxAttempts} попыток`)}
                    className="bg-[#5181b8] text-white text-[12px] px-3 py-1 rounded-[4px] hover:bg-[#5b88bd] transition-colors cursor-pointer"
                  >
                    Сохранить
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleRevokeSuspicious}
                  className="w-full bg-[#ff3347]/10 hover:bg-[#ff3347]/20 text-[#ff3347] border border-[#ff3347]/20 py-2 rounded-[4px] text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lock size={12} /> Сбросить сессии операторов
                </button>
              </div>
            </div>

            <div className="p-5 bg-white border border-vk-separator rounded-[4px] space-y-4 shadow-sm text-left">
              <h3 className="text-[13px] font-bold text-vk-text uppercase tracking-normal border-b pb-2 flex items-center gap-1.5 text-red-500">
                 <Lock size={14} /> Модуль Бранмауэра (FW)
              </h3>

              <div className="space-y-2.5">
                 <div>
                   <label className="block text-[10.5px] text-vk-text-secondary font-bold uppercase mb-1">Заблокировать IP-адрес</label>
                   <input 
                     type="text" 
                     placeholder="Например: 198.51.100.42"
                     value={newBlockedIP}
                     onChange={(e) => setNewBlockedIP(e.target.value)}
                     className="w-full bg-[#fafbfc] border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-[#5181b8]"
                   />
                 </div>
                 <div>
                   <label className="block text-[10.5px] text-vk-text-secondary font-bold uppercase mb-1">Причина блокировки</label>
                   <select 
                     value={newBlockedIPReason}
                     onChange={(e) => setNewBlockedIPReason(e.target.value)}
                     className="w-full bg-[#fafbfc] border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] focus:outline-none"
                   >
                      <option value="Атака на API/Брутфорс">Брутфорс / Подбор паролей</option>
                      <option value="DDoS/Флуд запросами">DDoS / Флуд / Скрейпинг</option>
                      <option value="Спам сквозь шлюзы">Спам-сессии бот-сети</option>
                      <option value="Сканирование уязвимостей">Попытки обхода прав доступа</option>
                   </select>
                 </div>
                 <button 
                   onClick={handleBlockIP}
                   className="w-full bg-[#4bb34b] hover:bg-[#52c152] text-white font-medium py-1.5 rounded-[4px] text-[12.5px] transition-colors cursor-pointer"
                 >
                   Внести в черный список
                 </button>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto border-t pt-3">
                <span className="text-[11px] text-vk-text-secondary font-bold uppercase block">Заблокированные в пуле</span>
                {blockedIPs.map(item => (
                  <div key={item.id} className="p-2.5 bg-[#fafbfc] border border-vk-separator rounded-[4px] text-[12px] flex justify-between items-center gap-2">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-vk-text block">{item.ip}</span>
                      <span className="text-[10px] text-vk-text-secondary block truncate max-w-[130px]">{item.reason}</span>
                      <span className="text-[9.5px] text-vk-text-secondary block italic mt-0.5">{item.date}</span>
                    </div>
                    <button 
                      onClick={() => handleUnblockIP(item.id, item.ip)}
                      className="text-[#5181b8] hover:underline text-[11.5px] shrink-0 cursor-pointer"
                    >
                      Разбанить
                    </button>
                  </div>
                ))}
                {blockedIPs.length === 0 && (
                  <div className="text-center py-6 text-vk-text-secondary text-[12px] italic">Черный список IP пуст</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
