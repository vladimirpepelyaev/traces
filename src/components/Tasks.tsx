import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ListTodo, Check, Trash2, Clock, X 
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  assignee: string;
}

interface TasksProps {
  addNotification: (title: string, message: string) => void;
}

export const Tasks: React.FC<TasksProps> = ({
  addNotification,
}) => {
  const [internalTasks, setInternalTasks] = useState<Task[]>([
    { id: 't-1', title: 'Обновить Wiki для новых агентов', priority: 'high', status: 'todo', assignee: 'Мария' },
    { id: 't-2', title: 'Проверить отчеты по жалобам за Пятницу', priority: 'medium', status: 'in-progress', assignee: 'Александр' },
    { id: 't-3', title: 'Собрать фидбек по новому интерфейсу', priority: 'low', status: 'todo', assignee: 'admin' }
  ]);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', priority: 'medium', assignee: 'admin' });

  const handleAddTask = () => {
    if (!newTaskData.title.trim()) return;
    const newTask = {
      id: `t-${Date.now()}`,
      title: newTaskData.title,
      priority: newTaskData.priority,
      status: 'todo',
      assignee: newTaskData.assignee
    };
    setInternalTasks([newTask, ...internalTasks]);
    setIsTaskModalOpen(false);
    setNewTaskData({ title: '', priority: 'medium', assignee: 'admin' });
    addNotification('Задача создана', `Задача «${newTask.title}» добавлена в список для ${newTask.assignee}`);
  };

  const statusColumns = [
    { key: 'todo', title: 'Нужно сделать' },
    { key: 'in-progress', title: 'В работе' },
    { key: 'completed', title: 'Готово' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 relative text-left">
      <div className="bg-vk-white p-6 rounded-[4px] border border-vk-separator shadow-sm">
        <div className="flex items-center justify-between border-b border-vk-separator pb-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-vk-separator bg-[#f0f2f5] flex items-center justify-center text-[#2a5885]">
              <ListTodo size={20} />
            </div>
            <div>
              <h1 className="text-[17px] font-medium text-vk-text">Внутренние задачи</h1>
              <div className="text-[11px] text-vk-text-secondary mt-0.5">Координация работы внутри команды</div>
            </div>
          </div>
          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="bg-[#5181b8] text-white px-4 py-1.5 rounded-[4px] text-[12.5px] font-medium hover:bg-[#5b88bd] transition-colors cursor-pointer"
          >
             НОВАЯ ЗАДАЧА
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statusColumns.map(col => (
            <div key={col.key} className="bg-[#f0f2f5] p-3 rounded-[6px] border border-vk-separator min-h-[400px]">
              <div className="flex items-center justify-between mb-4 px-1">
                 <h3 className="text-[12px] font-bold text-[#55677d] uppercase tracking-wider">
                   {col.title}
                 </h3>
                 <span className="bg-white/50 text-[#55677d] text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                   {internalTasks.filter(t => t.status === col.key).length}
                 </span>
              </div>
              
              <div className="space-y-3">
                {internalTasks.filter(t => t.status === col.key).map(task => (
                  <div key={task.id} className="bg-white p-3 rounded-[4px] border border-vk-separator shadow-sm group hover:shadow-md transition-all text-left">
                     <div className="flex items-start justify-between mb-2">
                        <span className={`text-[9px] uppercase font-bold px-1 rounded-[2px] ${
                          task.priority === 'high' ? 'bg-red-100 text-red-600' : 
                          task.priority === 'medium' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                        }`}>
                          {task.priority === 'high' ? 'СРОЧНО' : task.priority === 'medium' ? 'СРЕДНЕ' : 'НИЗКИЙ'}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           {col.key !== 'completed' && (
                             <button 
                               onClick={() => {
                                 setInternalTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: col.key === 'todo' ? 'in-progress' : 'completed' } : t));
                               }} 
                               className="p-1 hover:bg-[#f0f2f5] rounded text-green-600 cursor-pointer bg-transparent border-none"
                             >
                               <Check size={14} />
                             </button>
                           )}
                           <button 
                             onClick={() => {
                               setInternalTasks(prev => prev.filter(t => t.id !== task.id));
                             }} 
                             className="p-1 hover:bg-red-50 rounded text-red-600 cursor-pointer bg-transparent border-none"
                           >
                             <Trash2 size={14} />
                           </button>
                        </div>
                     </div>
                     <p className="text-[13px] text-vk-text font-medium leading-snug mb-3">{task.title}</p>
                     <div className="flex items-center justify-between border-t border-vk-separator pt-2">
                        <div className="flex items-center gap-1">
                           <div className="w-5 h-5 rounded-full bg-[#f0f2f5] border border-vk-separator text-[9px] flex items-center justify-center font-bold text-vk-text-secondary">
                              {task.assignee.charAt(0).toUpperCase()}
                           </div>
                           <span className="text-[11px] text-vk-text-secondary">{task.assignee}</span>
                        </div>
                        <div className="text-[10px] text-vk-text-secondary opacity-50"><Clock size={10} className="inline mr-1" /> сегод.</div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[8px] w-full max-w-md border border-vk-separator shadow-2xl overflow-hidden text-left"
            >
              <div className="p-4 border-b border-vk-separator bg-[#f0f2f5] flex items-center justify-between">
                <h2 className="text-[16px] font-medium">Новая задача</h2>
                <button onClick={() => setIsTaskModalOpen(false)} className="text-vk-text-secondary hover:text-vk-text cursor-pointer bg-transparent border-none"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-vk-text-secondary uppercase mb-1">Название задачи</label>
                  <input 
                    type="text"
                    value={newTaskData.title}
                    onChange={(e) => setNewTaskData({...newTaskData, title: e.target.value})}
                    placeholder="Что нужно сделать?"
                    className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-2 text-[13px] focus:outline-none focus:border-[#5181b8]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-vk-text-secondary uppercase mb-1">Приоритет</label>
                    <select 
                      value={newTaskData.priority}
                      onChange={(e) => setNewTaskData({...newTaskData, priority: e.target.value})}
                      className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-2 text-[13px]"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-vk-text-secondary uppercase mb-1">Исполнитель</label>
                    <select 
                      value={newTaskData.assignee}
                      onChange={(e) => setNewTaskData({...newTaskData, assignee: e.target.value})}
                      className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[4px] px-3 py-2 text-[13px]"
                    >
                      <option value="admin">Я (админ)</option>
                      <option value="Мария">Мария</option>
                      <option value="Александр">Александр</option>
                      <option value="Общая">Для всех</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-[#f7f8fa] border-t border-vk-separator flex justify-end gap-2">
                <button 
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-1.5 text-[12px] font-medium text-[#55677d] hover:bg-[#e5ebf1] rounded-[4px] cursor-pointer bg-transparent border-none"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleAddTask}
                  className="px-4 py-1.5 text-[12px] font-medium bg-[#5181b8] text-white hover:bg-[#5b88bd] rounded-[4px] cursor-pointer border-none"
                >
                  Создать
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
