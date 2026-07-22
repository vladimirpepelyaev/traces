import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Users, UserPlus, Check, X, ShieldAlert, 
  HelpCircle, Sparkles, BookOpen, Clock, Activity, Search
} from 'lucide-react';
import { testpoolService } from '../services/testpool/TestpoolService';
import { Experiment, Assignment, TestpoolEvent } from '../services/testpool/ExperimentRepository';
import { permissionService } from '../services/permission/PermissionService';
import { AppUser } from '../types';

interface TestpoolDashboardProps {
  currentUser: AppUser | null;
  users: AppUser[];
  addNotification: (title: string, message: string) => void;
}

const STATUS_LABELS = {
  draft: 'Ещё не используется (Черновик)',
  partial: 'Используется для части аудитории',
  new_users: 'Используется только для новых регистраций',
  released: 'В релизе (Все пользователи)',
  disabled: 'Выключено'
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  partial: 'bg-[#e1f5fe] text-[#0288d1] border-[#b3e5fc]',
  new_users: 'bg-[#efebe9] text-[#5d4037] border-[#d7ccc8]',
  released: 'bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]',
  disabled: 'bg-[#ffebee] text-[#c62828] border-[#ffcdd2]'
};

export const TestpoolDashboard: React.FC<TestpoolDashboardProps> = ({
  currentUser,
  users,
  addNotification
}) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeTab, setActiveTab] = useState<'experiments' | 'events'>('experiments');
  const [events, setEvents] = useState<TestpoolEvent[]>([]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const [participantsModalTab, setParticipantsModalTab] = useState<'effective' | 'overrides'>('effective');

  // Selected entities
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [experimentParticipants, setExperimentParticipants] = useState<AppUser[]>([]);

  // Form states
  const [formKey, setFormKey] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<Experiment['status']>('draft');
  const [formEnabled, setFormEnabled] = useState(false);
  const [formRollout, setFormRollout] = useState(0);
  const [formIncludeNew, setFormIncludeNew] = useState(false);

  // Search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppUser[]>([]);

  // Guard: Testpool is accessible ONLY to superadmins
  if (!permissionService.isSuperAdmin(currentUser)) {
    return (
      <div className="bg-white border border-vk-separator rounded-[4px] p-8 text-center space-y-3 my-4">
        <ShieldAlert size={40} className="mx-auto text-red-500" />
        <h2 className="text-base font-bold text-vk-text">Доступ ограничен — Testpool</h2>
        <p className="text-xs text-vk-text-secondary max-w-md mx-auto">
          Служебный инструмент управления фича-флагами и A/B тестированием доступен исключительно суперадминистраторам системы.
        </p>
      </div>
    );
  }

  // Sync users with testpoolService
  useEffect(() => {
    testpoolService.setUsers(users);
    testpoolService.refresh(users);
  }, [users]);

  // Load data on mount and subscribe to service changes
  useEffect(() => {
    const updateData = () => {
      setExperiments(testpoolService.getExperiments());
      if (selectedExperiment) {
        // Update selected experiment and participants if modal is open
        const fresh = testpoolService.getExperiments().find(e => e.id === selectedExperiment.id);
        if (fresh) {
          setSelectedExperiment(fresh);
          setExperimentParticipants(testpoolService.getUsersInExperiment(fresh.id));
        }
      }
    };

    updateData();
    const unsubscribe = testpoolService.subscribe(updateData);

    // Load events log
    testpoolService.getEventsLog().then(setEvents);

    return () => {
      unsubscribe();
    };
  }, [selectedExperiment]);

  // Handle Search Input
  useEffect(() => {
    if (!userSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = userSearchQuery.toLowerCase();
    const results = users.filter(u => {
      const nameMatch = u.name?.toLowerCase().includes(query);
      const loginMatch = u.login?.toLowerCase().includes(query);
      // Fallback email from login or generic
      const emailMatch = `${u.login}@sledy-moderator.ru`.toLowerCase().includes(query);
      return nameMatch || loginMatch || emailMatch;
    });
    setSearchResults(results.slice(0, 5)); // Limit to 5 results
  }, [userSearchQuery, users]);

  const operatorId = currentUser?.id || 'admin-operator';

  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formTitle.trim()) {
      addNotification('Ошибка', 'Заполните ключ и название эксперимента');
      return;
    }

    try {
      await testpoolService.createExperiment(
        formKey.trim(),
        formTitle.trim(),
        formDescription.trim(),
        operatorId
      );
      addNotification('Эксперимент создан', `Фича-флаг ${formKey} зарегистрирован в testpool`);
      setIsCreateModalOpen(false);
      resetForm();
      const evts = await testpoolService.getEventsLog();
      setEvents(evts);
    } catch (err: any) {
      addNotification('Ошибка', err.message || 'Не удалось создать эксперимент');
    }
  };

  const handleOpenEdit = (exp: Experiment) => {
    setSelectedExperiment(exp);
    setFormKey(exp.key);
    setFormTitle(exp.title);
    setFormDescription(exp.description);
    setFormStatus(exp.status);
    setFormEnabled(exp.enabled);
    setFormRollout(exp.rollout_percent);
    setFormIncludeNew(exp.include_new_users);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExperiment) return;

    try {
      await testpoolService.updateExperiment(selectedExperiment.id, {
        key: formKey,
        title: formTitle,
        description: formDescription,
        status: formStatus,
        enabled: formEnabled,
        rollout_percent: formRollout,
        include_new_users: formIncludeNew
      }, operatorId);

      addNotification('Успешно', `Параметры эксперимента ${formKey} сохранены`);
      setIsEditModalOpen(false);
      resetForm();
      const evts = await testpoolService.getEventsLog();
      setEvents(evts);
    } catch (err: any) {
      addNotification('Ошибка', err.message || 'Не удалось обновить эксперимент');
    }
  };

  const handleOpenParticipants = (exp: Experiment) => {
    setSelectedExperiment(exp);
    setExperimentParticipants(testpoolService.getUsersInExperiment(exp.id));
    setIsParticipantsModalOpen(true);
  };

  const handleExcludeUserFromExperiment = async (userId: string, userName: string) => {
    if (!selectedExperiment) return;

    try {
      await testpoolService.excludeUserFromExperiment(selectedExperiment.id, userId, operatorId);
      addNotification('Пользователь исключен', `Пользователю ${userName} явным правилом заблокирован доступ к ${selectedExperiment.key}`);
    } catch (err: any) {
      addNotification('Ошибка', err.message || 'Не удалось исключить пользователя');
    }
  };

  const handleRemoveUserFromExperiment = async (userId: string, userName: string) => {
    if (!selectedExperiment) return;

    try {
      await testpoolService.removeAssignment(selectedExperiment.id, userId, operatorId);
      addNotification('Ручное правило сброшено', `Ручное правило для пользователя ${userName} удалено`);
    } catch (err: any) {
      addNotification('Ошибка', err.message || 'Не удалось сбросить правило');
    }
  };

  const handleOpenAddUser = (exp: Experiment) => {
    setSelectedExperiment(exp);
    setUserSearchQuery('');
    setSearchResults([]);
    setIsAddUserModalOpen(true);
  };

  const handleAddUserToExperiment = async (user: AppUser) => {
    if (!selectedExperiment) return;

    try {
      await testpoolService.addAssignment(selectedExperiment.id, user.id, operatorId, 'manual');
      addNotification('Пользователь добавлен', `Эксперимент раскатан на пользователя ${user.name}`);
      setIsAddUserModalOpen(false);
      // Local state is updated via subscription
    } catch (err: any) {
      addNotification('Ошибка', err.message || 'Не удалось добавить пользователя');
    }
  };

  // Immediate Action Handlers
  const handleRollout100 = async (exp: Experiment) => {
    try {
      await testpoolService.rolloutTo100Percent(exp.id, operatorId);
      addNotification('Раскатка 100%', `Эксперимент ${exp.key} раскатан на 100% существующих пользователей`);
      const evts = await testpoolService.getEventsLog();
      setEvents(evts);
    } catch (err: any) {
      addNotification('Ошибка', err.message);
    }
  };

  const handleRolloutNewOnly = async (exp: Experiment) => {
    try {
      await testpoolService.rolloutToNewUsersOnly(exp.id, operatorId);
      addNotification('Раскатка на новые', `Эксперимент ${exp.key} раскатан только на новые регистрации`);
      const evts = await testpoolService.getEventsLog();
      setEvents(evts);
    } catch (err: any) {
      addNotification('Ошибка', err.message);
    }
  };

  const handleRelease = async (exp: Experiment) => {
    try {
      await testpoolService.releaseExperiment(exp.id, operatorId);
      addNotification('Релиз завершен', `Эксперимент ${exp.key} завершен и выпущен в релиз для всех`);
      const evts = await testpoolService.getEventsLog();
      setEvents(evts);
    } catch (err: any) {
      addNotification('Ошибка', err.message);
    }
  };

  const resetForm = () => {
    setSelectedExperiment(null);
    setFormKey('');
    setFormTitle('');
    setFormDescription('');
    setFormStatus('draft');
    setFormEnabled(false);
    setFormRollout(0);
    setFormIncludeNew(false);
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      {/* Header Panel */}
      <div className="bg-vk-white p-4 rounded-[4px] border border-vk-separator flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-medium text-vk-text">Сервис управления A/B-тестированием (testpool)</h1>
            <span className="bg-[#5181b8]/10 text-[#5181b8] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
              Внутренний инструмент
            </span>
          </div>
          <p className="text-[12.5px] text-vk-text-secondary mt-1">
            Управление доступностью новых функций, фича-флагов и A/B экспериментов по сегментам аудитории.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#5181b8] hover:bg-[#5b88bd] text-white rounded-[4px] text-[12.5px] font-medium shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Зарегистрировать фичу</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-vk-separator bg-vk-white rounded-[4px] p-1 gap-1 border">
        <button
          onClick={() => setActiveTab('experiments')}
          className={`flex items-center gap-2 px-4 py-2 text-[12.5px] font-medium rounded transition-all cursor-pointer ${
            activeTab === 'experiments' ? 'bg-[#5181b8]/10 text-[#2a5885] font-bold' : 'text-vk-text-secondary hover:bg-gray-50'
          }`}
        >
          <Sparkles size={16} />
          <span>Эксперименты ({experiments.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('events');
            testpoolService.getEventsLog().then(setEvents);
          }}
          className={`flex items-center gap-2 px-4 py-2 text-[12.5px] font-medium rounded transition-all cursor-pointer ${
            activeTab === 'events' ? 'bg-[#5181b8]/10 text-[#2a5885] font-bold' : 'text-vk-text-secondary hover:bg-gray-50'
          }`}
        >
          <Activity size={16} />
          <span>Лог событий ({events.length})</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'experiments' && (
        <div className="grid grid-cols-1 gap-4">
          {experiments.map((exp) => {
            const activeAssigns = testpoolService.getAssignmentsForExperiment(exp.id);
            const statusClass = STATUS_COLORS[exp.status] || 'bg-gray-100 text-gray-700';
            const statusLabel = STATUS_LABELS[exp.status] || exp.status;

            return (
              <div 
                key={exp.id} 
                className="bg-vk-white border border-vk-separator rounded-[4px] p-4 shadow-sm flex flex-col gap-4 hover:border-[#b2bcd0] transition-colors relative"
              >
                {/* Upper row: Title & Edit Button */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[15px] font-semibold text-vk-text">{exp.title}</h2>
                      <code className="text-[11px] font-mono font-bold bg-[#f0f2f5] px-1.5 py-0.5 rounded text-[#2a5885]">
                        {exp.key}
                      </code>
                    </div>
                    <p className="text-[12.5px] text-vk-text-secondary pr-6 leading-relaxed">
                      {exp.description || <span className="italic">Описание отсутствует</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenEdit(exp)}
                    title="Редактировать параметры фичи"
                    className="p-1.5 text-vk-text-secondary hover:text-[#2a5885] hover:bg-[#e5ebf1] rounded transition-all cursor-pointer"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>

                  {/* Info block */}
                  {(() => {
                    const stats = testpoolService.getExperimentStats(exp.id);
                    return (
                      <div className="bg-[#fafbfc] border border-vk-separator/50 p-3 rounded text-[12.5px] space-y-2">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div className="text-vk-text-secondary">
                            Фактическая аудитория (Effective Audience): <span className="font-bold text-vk-text font-mono">{stats.effectiveAudienceCount} / {stats.totalUsers} чел.</span>
                          </div>
                          <div className={`text-[11.5px] font-medium px-2 py-0.5 rounded border ${statusClass}`}>
                            {statusLabel}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-gray-100">
                          <div className="bg-white p-1.5 rounded border border-gray-100 text-center">
                            <div className="text-vk-text-secondary">Rollout</div>
                            <div className="font-bold text-[#2a5885]">{stats.rolloutPercent}%</div>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-gray-100 text-center">
                            <div className="text-vk-text-secondary">Ручных вкл.</div>
                            <div className="font-bold text-green-700">+{stats.manualEnabledCount}</div>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-gray-100 text-center">
                            <div className="text-vk-text-secondary">Ручных искл.</div>
                            <div className="font-bold text-red-600">-{stats.manualExcludedCount}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* Actions row */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-vk-separator/50">
                  <button
                    onClick={() => handleOpenParticipants(exp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f2f5] hover:bg-[#e5ebf1] text-[#2a5885] rounded text-[12px] font-medium transition-colors cursor-pointer"
                  >
                    <Users size={14} />
                    <span>Раскатано на</span>
                  </button>

                  <button
                    onClick={() => handleOpenAddUser(exp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f2f5] hover:bg-[#e5ebf1] text-[#2a5885] rounded text-[12px] font-medium transition-colors cursor-pointer"
                  >
                    <UserPlus size={14} />
                    <span>Добавить пользователя</span>
                  </button>

                  {exp.status !== 'released' && (
                    <>
                      <button
                        onClick={() => handleRollout100(exp)}
                        className="px-3 py-1.5 bg-[#e1f5fe] hover:bg-[#b3e5fc] text-[#0288d1] rounded text-[12px] font-medium transition-colors cursor-pointer"
                      >
                        Раскатить на 100%
                      </button>

                      <button
                        onClick={() => handleRolloutNewOnly(exp)}
                        className="px-3 py-1.5 bg-[#efebe9] hover:bg-[#d7ccc8] text-[#5d4037] rounded text-[12px] font-medium transition-colors cursor-pointer"
                      >
                        Только новые
                      </button>

                      <button
                        onClick={() => handleRelease(exp)}
                        className="px-3 py-1.5 bg-[#e8f5e9] hover:bg-[#c8e6c9] text-[#2e7d32] rounded text-[12px] font-medium transition-colors cursor-pointer font-semibold"
                      >
                        Релиз
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {experiments.length === 0 && (
            <div className="bg-vk-white p-8 text-center rounded border border-vk-separator text-vk-text-secondary text-[13px]">
              Зарегистрированные фичи отсутствуют. Нажмите кнопку выше для добавления.
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="bg-vk-white border border-vk-separator rounded-[4px] shadow-sm overflow-hidden">
          <div className="p-3 bg-[#fafbfc] border-b border-vk-separator flex justify-between items-center">
            <h3 className="text-[12.5px] font-bold text-vk-text uppercase">Журнал изменений testpool</h3>
            <span className="text-[11px] text-vk-text-secondary font-mono">{events.length} записей</span>
          </div>
          <div className="divide-y divide-vk-separator max-h-[500px] overflow-y-auto">
            {events.map((evt) => {
              const exp = experiments.find(e => e.id === evt.experiment_id);
              const op = users.find(u => u.id === evt.operator_id);
              return (
                <div key={evt.id} className="p-3 hover:bg-[#f9fafc] transition-colors text-[12px]">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="space-y-1">
                      <div>
                        <span className="font-semibold text-vk-text">{op?.name || evt.operator_id}</span>
                        <span className="text-vk-text-secondary"> выполнил действие </span>
                        <span className="font-bold font-mono text-[#5181b8]">{evt.action}</span>
                        {exp && (
                          <>
                            <span> для эксперимента </span>
                            <span className="font-semibold text-[#2a5885]">{exp.title} ({exp.key})</span>
                          </>
                        )}
                      </div>
                      {evt.payload && Object.keys(evt.payload).length > 0 && (
                        <pre className="text-[10px] font-mono bg-gray-50 p-1.5 rounded border border-gray-100 max-w-full overflow-x-auto text-gray-600">
                          {JSON.stringify(evt.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="text-[10.5px] text-vk-text-secondary font-mono shrink-0">
                      {new Date(evt.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}

            {events.length === 0 && (
              <div className="p-8 text-center text-vk-text-secondary italic">
                История изменений пуста
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODALS SECTION --- */}
      <AnimatePresence>
        {/* 1. Register Feature Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setIsCreateModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-md rounded-[4px] shadow-2xl border border-vk-separator relative z-10 overflow-hidden">
              <div className="p-4 bg-[#fafbfc] border-b border-vk-separator flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#285473]">Регистрация новой фичи</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-vk-text-secondary hover:text-black cursor-pointer"><X size={16} /></button>
              </div>
              <form onSubmit={handleCreateExperiment} className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Ключ фичи (feature_key)</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., vkontakte_music_widget"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-[#f7f8fa] border border-[#dce1e6] p-2 rounded-[2px] text-[13px] focus:outline-none focus:border-[#5181b8]"
                  />
                  <p className="text-[10px] text-vk-text-secondary">Только латиница, цифры и нижнее подчеркивание. Используется в коде для проверки и включения.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Название</label>
                  <input
                    type="text"
                    required
                    placeholder="Например, Новый плеер во вкладке Музыка"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#f7f8fa] border border-[#dce1e6] p-2 rounded-[2px] text-[13px] focus:outline-none focus:border-[#5181b8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Описание</label>
                  <textarea
                    placeholder="Для чего предназначена, кто тестирует, контакты"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-[#f7f8fa] border border-[#dce1e6] p-2 rounded-[2px] text-[13px] focus:outline-none focus:border-[#5181b8] min-h-[70px]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="grow py-2 bg-[#5181b8] text-white rounded-[4px] text-[12.5px] font-medium hover:bg-[#5b88bd] transition-colors cursor-pointer">Зарегистрировать</button>
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="grow py-2 bg-[#e5ebf1] text-[#55677d] rounded-[4px] text-[12.5px] font-medium hover:bg-[#dfe6ed] transition-colors cursor-pointer">Отмена</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. Edit Feature Modal */}
        {isEditModalOpen && selectedExperiment && (
          <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setIsEditModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-md rounded-[4px] shadow-2xl border border-vk-separator relative z-10 overflow-hidden">
              <div className="p-4 bg-[#fafbfc] border-b border-vk-separator flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#285473]">Параметры фичи: {selectedExperiment.key}</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-vk-text-secondary hover:text-black cursor-pointer"><X size={16} /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Название</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#f7f8fa] border border-[#dce1e6] p-2 rounded-[2px] text-[13px] focus:outline-none focus:border-[#5181b8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Описание</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-[#f7f8fa] border border-[#dce1e6] p-2 rounded-[2px] text-[13px] focus:outline-none focus:border-[#5181b8] min-h-[60px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Статус</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full bg-[#f7f8fa] border border-[#dce1e6] p-2 rounded-[2px] text-[12.5px] focus:outline-none"
                    >
                      <option value="draft">Черновик (draft)</option>
                      <option value="partial">Часть аудитории (partial)</option>
                      <option value="new_users">Новые регистрации (new_users)</option>
                      <option value="released">Релиз (released)</option>
                      <option value="disabled">Выключено (disabled)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Флаг включения</label>
                    <div className="flex items-center h-10">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formEnabled}
                          onChange={(e) => setFormEnabled(e.target.checked)}
                          className="rounded text-[#5181b8] focus:ring-[#5181b8] border-[#dce1e6] w-4 h-4 cursor-pointer"
                        />
                        <span className="text-[13px] font-medium text-vk-text">Активен</span>
                      </label>
                    </div>
                  </div>
                </div>

                {formStatus === 'partial' && (
                  <div className="space-y-1.5 bg-[#f0f2f5] p-3 rounded">
                    <div className="flex justify-between text-[11px] font-bold text-vk-text-secondary">
                      <span>ДОЛЯ АУДИТОРИИ (ROLLOUT PERCENT)</span>
                      <span>{formRollout}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={formRollout}
                      onChange={(e) => setFormRollout(parseInt(e.target.value))}
                      className="w-full accent-[#5181b8] cursor-pointer"
                    />
                    <p className="text-[10px] text-vk-text-secondary">Пользователи сегментируются детерминированно по их ID. Значение 100% эквивалентно охвату всех существующих пользователей.</p>
                  </div>
                )}

                {formStatus === 'new_users' && (
                  <div className="bg-[#f0f2f5] p-3 rounded flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="inc_new"
                      checked={formIncludeNew}
                      onChange={(e) => setFormIncludeNew(e.target.checked)}
                      className="rounded text-[#5181b8] border-[#dce1e6] w-4 h-4"
                    />
                    <label htmlFor="inc_new" className="text-[12.5px] font-medium text-vk-text cursor-pointer select-none">
                      Автоматически включать новых пользователей после регистрации
                    </label>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button type="submit" className="grow py-2 bg-[#5181b8] text-white rounded-[4px] text-[12.5px] font-medium hover:bg-[#5b88bd] transition-colors cursor-pointer">Сохранить</button>
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="grow py-2 bg-[#e5ebf1] text-[#55677d] rounded-[4px] text-[12.5px] font-medium hover:bg-[#dfe6ed] transition-colors cursor-pointer">Отмена</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. View Participants Modal */}
        {isParticipantsModalOpen && selectedExperiment && (
          <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setIsParticipantsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-lg rounded-[4px] shadow-2xl border border-vk-separator relative z-10 overflow-hidden">
              <div className="p-4 bg-[#fafbfc] border-b border-vk-separator flex justify-between items-center">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-[#285473]">Аудитория и управления доступом</h3>
                  <p className="text-[11px] text-vk-text-secondary">Фича: {selectedExperiment.title} ({selectedExperiment.key})</p>
                </div>
                <button onClick={() => setIsParticipantsModalOpen(false)} className="text-vk-text-secondary hover:text-black cursor-pointer"><X size={16} /></button>
              </div>

              {/* Subtabs inside Modal */}
              <div className="flex border-b border-vk-separator bg-gray-50 px-4 pt-2 gap-2 text-[12px] font-medium">
                <button
                  onClick={() => setParticipantsModalTab('effective')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    participantsModalTab === 'effective' ? 'border-[#5181b8] text-[#2a5885] font-bold' : 'border-transparent text-vk-text-secondary'
                  }`}
                >
                  Фактическая аудитория ({testpoolService.getEffectiveAudienceForExperiment(selectedExperiment.id).length})
                </button>
                <button
                  onClick={() => setParticipantsModalTab('overrides')}
                  className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                    participantsModalTab === 'overrides' ? 'border-[#5181b8] text-[#2a5885] font-bold' : 'border-transparent text-vk-text-secondary'
                  }`}
                >
                  Ручные переопределения ({testpoolService.getManualOverridesForExperiment(selectedExperiment.id).length})
                </button>
              </div>

              <div className="p-4 max-h-[380px] overflow-y-auto divide-y divide-vk-separator">
                {participantsModalTab === 'effective' && (
                  <>
                    {testpoolService.getEffectiveAudienceForExperiment(selectedExperiment.id).map((user) => (
                      <div key={user.id} className="py-2.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} 
                            alt={user.name} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-gray-100 object-cover shrink-0" 
                          />
                          <div>
                            <div className="text-[12.5px] font-semibold text-vk-text">{user.name}</div>
                            <div className="text-[10px] text-vk-text-secondary font-mono">UID: {user.id} • @{user.login || 'user'}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleExcludeUserFromExperiment(user.id, user.name)}
                          className="px-2.5 py-1 text-red-600 hover:text-white border border-red-200 hover:bg-red-600 rounded text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Исключить вручную
                        </button>
                      </div>
                    ))}

                    {testpoolService.getEffectiveAudienceForExperiment(selectedExperiment.id).length === 0 && (
                      <div className="py-6 text-center text-vk-text-secondary italic text-[12px]">
                        Функция сейчас недоступна ни одному пользователю.
                      </div>
                    )}
                  </>
                )}

                {participantsModalTab === 'overrides' && (
                  <>
                    {testpoolService.getManualOverridesForExperiment(selectedExperiment.id).map(({ user, assignment, type }) => (
                      <div key={user.id} className="py-2.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} 
                            alt={user.name} 
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-full border border-gray-100 object-cover shrink-0" 
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] font-semibold text-vk-text">{user.name}</span>
                              {type === 'manual_enable' ? (
                                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded">Включено</span>
                              ) : (
                                <span className="bg-red-100 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded">Заблокировано</span>
                              )}
                            </div>
                            <div className="text-[10px] text-vk-text-secondary font-mono">
                              UID: {user.id} • {new Date(assignment.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveUserFromExperiment(user.id, user.name)}
                          className="px-2.5 py-1 text-gray-700 hover:bg-gray-200 border border-gray-300 rounded text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Сбросить
                        </button>
                      </div>
                    ))}

                    {testpoolService.getManualOverridesForExperiment(selectedExperiment.id).length === 0 && (
                      <div className="py-6 text-center text-vk-text-secondary italic text-[12px]">
                        Ручные явные правила (Manual Overrides) отсутствуют.
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-3 bg-[#fafbfc] border-t border-vk-separator text-right">
                <button 
                  onClick={() => setIsParticipantsModalOpen(false)} 
                  className="px-4 py-1.5 bg-[#e5ebf1] text-[#55677d] rounded-[4px] text-[12px] font-semibold hover:bg-[#dfe6ed] cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 4. Add User Modal (NO Dimming Backdrop / Без затемнения фона!) */}
        {isAddUserModalOpen && selectedExperiment && (
          <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
            {/* Invisible backdrop for closing when clicking outside, absolutely no dimming as requested */}
            <div className="absolute inset-0 bg-transparent" onClick={() => setIsAddUserModalOpen(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }} 
              className="bg-white w-full max-w-sm rounded-[4px] shadow-2xl border border-vk-separator relative z-10 overflow-hidden border-2"
            >
              <div className="p-4 bg-[#fafbfc] border-b border-[#e7e8ec] flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-[#285473]">Добавить пользователя в эксперимент</h3>
                  <span className="text-[10px] font-mono font-bold bg-[#f0f2f5] px-1 py-0.2 rounded text-[#2a5885]">{selectedExperiment.key}</span>
                </div>
                <button onClick={() => setIsAddUserModalOpen(false)} className="text-vk-text-secondary hover:text-black cursor-pointer"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-bold text-vk-text-secondary uppercase tracking-wider">Поиск пользователя</label>
                  <div className="relative flex items-center">
                    <Search size={14} className="absolute left-2.5 text-vk-text-secondary" />
                    <input
                      type="text"
                      placeholder="Имя, юзернейм или email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-[#f7f8fa] border border-[#dce1e6] pl-8 pr-2.5 py-1.5 rounded-[2px] text-[12.5px] focus:outline-none focus:border-[#5181b8]"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Autocomplete Results */}
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUserToExperiment(user)}
                      className="w-full p-2 hover:bg-[#f2f5f9] text-left rounded flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <img 
                          src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} 
                          alt={user.name} 
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full border border-gray-100 object-cover" 
                        />
                        <div>
                          <div className="text-[12px] font-medium text-vk-text group-hover:text-[#2a5885]">{user.name}</div>
                          <div className="text-[10px] text-vk-text-secondary">@{user.login || 'user'}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#5181b8] opacity-0 group-hover:opacity-100 transition-opacity">
                        Раскатить
                      </span>
                    </button>
                  ))}

                  {userSearchQuery && searchResults.length === 0 && (
                    <div className="p-4 text-center text-vk-text-secondary text-[11px]">
                      Никого не найдено
                    </div>
                  )}

                  {!userSearchQuery && (
                    <div className="p-4 text-center text-vk-text-secondary text-[11.5px] bg-[#f9fafc] rounded border border-dashed border-[#e0e0e0]">
                      Введите имя или логин для поиска пользователей
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 bg-[#fafbfc] border-t border-vk-separator flex justify-end gap-2">
                <button 
                  onClick={() => setIsAddUserModalOpen(false)} 
                  className="px-4 py-1.5 bg-[#e5ebf1] text-[#55677d] rounded-[4px] text-[11.5px] font-semibold hover:bg-[#dfe6ed] cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
