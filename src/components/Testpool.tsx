import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  testpoolService, 
  isEnabled 
} from '../services/testpool/TestpoolService';
import { experimentRepository } from '../services/testpool/ExperimentRepository';
import { TestpoolExperiment, TestpoolAssignment, TestpoolEvent, AppUser, ExperimentStatus } from '../types';
import { 
  Search, 
  Users, 
  UserPlus, 
  Settings, 
  Plus, 
  Check, 
  X, 
  Zap, 
  Edit3, 
  Trash2, 
  Sliders, 
  History, 
  Play, 
  LogOut, 
  Info, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';

interface TestpoolProps {
  currentUser: AppUser | null;
  users: AppUser[];
  addNotification: (title: string, text: string) => void;
}

export function Testpool({ currentUser, users, addNotification }: TestpoolProps) {
  const [experiments, setExperiments] = useState<TestpoolExperiment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState<TestpoolExperiment | null>(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState<TestpoolExperiment | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState<TestpoolExperiment | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<TestpoolExperiment | null>(null);

  // Form states
  const [newKey, setNewKey] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [formError, setFormError] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Participant assignment state
  const [participants, setParticipants] = useState<TestpoolAssignment[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Experiment change log state
  const [eventLogs, setEventLogs] = useState<TestpoolEvent[]>([]);

  // Load experiments on mount and register listener for real-time state sync with diagnostics
  useEffect(() => {
    console.log('TESTPOOL_ROUTE', window.location.pathname);

    let reason = 'none';
    // If not authorized to see, we might redirect (or we might just let parent handle)
    const canAccess = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.isEmployee);
    if (!canAccess) {
      reason = 'not_authorized';
    }
    console.log('TESTPOOL_REDIRECT_REASON', reason);

    const updateList = async () => {
      try {
        setLoading(true);
        const data = await experimentRepository.getExperiments();
        console.log('TESTPOOL_RESPONSE', data);

        await testpoolService.preload();
        const loadedExps = Array.from((testpoolService as any).experimentsCache.values()) as TestpoolExperiment[];
        setExperiments(loadedExps);
      } catch (err) {
        console.error('[Testpool] Error preloading experiments:', err);
        console.log('TESTPOOL_RESPONSE', null);
      } finally {
        setLoading(false);
      }
    };

    updateList();
    const unsubscribe = testpoolService.subscribe(updateList);
    return () => unsubscribe();
  }, [currentUser]);

  // TESTPOOL_RENDER diagnostics log
  useEffect(() => {
    console.log('TESTPOOL_RENDER', {
      loading,
      experimentsCount: experiments.length,
      currentExperiment: experiments[0] || null
    });
  }, [loading, experiments]);

  // Update participant list when participant modal is open
  useEffect(() => {
    if (isParticipantsOpen) {
      testpoolService.getEvents(isParticipantsOpen.id).then(() => {
        const list = (testpoolService as any).assignmentsCache.get(isParticipantsOpen.id) || [];
        setParticipants(list);
      });
    }
  }, [isParticipantsOpen]);

  // Sync edit form fields
  useEffect(() => {
    if (isEditOpen) {
      setEditTitle(isEditOpen.title);
      setEditDesc(isEditOpen.description || '');
    }
  }, [isEditOpen]);

  // Load history logs
  useEffect(() => {
    if (isHistoryOpen) {
      testpoolService.getEvents(isHistoryOpen.id).then(setEventLogs);
    }
  }, [isHistoryOpen]);

  // Get status text display
  const getStatusDisplay = (status: ExperimentStatus, rolloutPercent: number) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Черновик',
          bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
          desc: 'Доступно только по ручному списку'
        };
      case 'partial':
        if (rolloutPercent === 100) {
          return {
            label: 'Используется для текущих регистраций',
            bg: 'bg-blue-50 text-blue-700 border-blue-200',
            desc: 'Включено на 100% существующих пользователей'
          };
        }
        return {
          label: 'Используется для части аудитории',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          desc: `Раскатано на ${rolloutPercent}% аудитории`
        };
      case 'new_users':
        return {
          label: 'Используется только для новых регистраций',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          desc: 'Автоматически включается новым аккаунтам'
        };
      case 'released':
        return {
          label: 'В релизе',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          desc: 'Включено для всей аудитории (100%)'
        };
      case 'disabled':
        return {
          label: 'Выключено',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          desc: 'Полностью деактивировано'
        };
      default:
        return {
          label: 'Неизвестно',
          bg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
          desc: ''
        };
    }
  };

  const filteredExperiments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return experiments;
    return experiments.filter(e => 
      e.title.toLowerCase().includes(q) || 
      e.key.toLowerCase().includes(q) || 
      (e.description && e.description.toLowerCase().includes(q))
    );
  }, [experiments, searchQuery]);

  // Search users for addition
  const searchedUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      (u.login && u.login.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q))
    ).slice(0, 5); // Limit search results to 5
  }, [users, userSearchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    const keyTrimmed = newKey.trim().toLowerCase();
    if (!keyTrimmed || !newTitle.trim()) {
      setFormError('Пожалуйста заполните обязательные поля');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(keyTrimmed)) {
      setFormError('Ключ должен состоять только из латинских букв, цифр и нижнего подчеркивания');
      return;
    }

    // Check if key already exists
    const existing = experiments.some(exp => exp.key === keyTrimmed);
    if (existing) {
      setFormError('Эксперимент с таким ключом уже зарегистрирован');
      return;
    }

    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.registerExperiment(keyTrimmed, newTitle.trim(), newDesc.trim(), operatorId);
      
      addNotification('Testpool', `Функция "${newTitle}" успешно зарегистрирована.`);
      
      // Reset form
      setNewKey('');
      setNewTitle('');
      setNewDesc('');
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Ошибка создания эксперимента');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditOpen) return;

    if (!editTitle.trim()) {
      addNotification('Ошибка', 'Название функции не может быть пустым');
      return;
    }

    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.editExperimentMeta(isEditOpen.id, editTitle.trim(), editDesc.trim(), operatorId);
      addNotification('Testpool', 'Метаданные функции обновлены');
      setIsEditOpen(null);
    } catch (err) {
      addNotification('Ошибка', 'Не удалось обновить настройки');
    }
  };

  const handleToggleStatus = async (id: string, status: ExperimentStatus) => {
    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.updateStatus(id, status, operatorId);
      addNotification('Testpool', `Статус функции изменен на: ${status}`);
    } catch (err) {
      addNotification('Ошибка', 'Не удалось изменить статус');
    }
  };

  const handleRollout100 = async (id: string) => {
    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.rolloutToAllExisting(id, operatorId);
      addNotification('Testpool', 'Функция раскатана на 100% текущих пользователей');
    } catch (err) {
      addNotification('Ошибка', 'Не удалось раскатить функцию');
    }
  };

  const handleRolloutNewOnly = async (id: string) => {
    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.rolloutToNewOnly(id, operatorId);
      addNotification('Testpool', 'Функция раскатана только для новых регистраций');
    } catch (err) {
      addNotification('Ошибка', 'Не удалось раскатить функцию');
    }
  };

  const handleRelease = async (id: string) => {
    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.updateStatus(id, 'released', operatorId);
      addNotification('Testpool', 'Функция полностью выпущена в Релиз (100% аудитории)');
    } catch (err) {
      addNotification('Ошибка', 'Не удалось выпустить в релиз');
    }
  };

  const handleDeleteExperiment = async (id: string, title: string) => {
    if (!window.confirm(`Вы уверены, что хотите безвозвратно удалить функцию "${title}" из Testpool?`)) {
      return;
    }
    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.deleteExperiment(id, operatorId);
      addNotification('Testpool', 'Функция успешно удалена из панели');
    } catch (err) {
      addNotification('Ошибка', 'Не удалось удалить функцию');
    }
  };

  const handleAddParticipant = async (experimentId: string, userId: string, name: string) => {
    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.addParticipant(experimentId, userId, operatorId, 'manual');
      addNotification('Testpool', `Пользователь ${name} успешно подключен к функции`);
      
      // Update local participants modal state if open
      if (isParticipantsOpen && isParticipantsOpen.id === experimentId) {
        const updated = (testpoolService as any).assignmentsCache.get(experimentId) || [];
        setParticipants(updated);
      }
      setUserSearchQuery('');
    } catch (err) {
      addNotification('Ошибка', 'Не удалось добавить пользователя');
    }
  };

  const handleRemoveParticipant = async (experimentId: string, userId: string, name: string) => {
    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.removeParticipant(experimentId, userId, operatorId);
      addNotification('Testpool', `Пользователь ${name} отключен от функции`);
      
      // Update local participants state
      if (isParticipantsOpen && isParticipantsOpen.id === experimentId) {
        const updated = (testpoolService as any).assignmentsCache.get(experimentId) || [];
        setParticipants(updated);
      }
    } catch (err) {
      addNotification('Ошибка', 'Не удалось удалить пользователя');
    }
  };

  const handleUpdatePercentage = async (id: string, percent: number) => {
    try {
      const operatorId = currentUser?.id || 'system';
      await testpoolService.setRolloutPercent(id, percent, operatorId);
      addNotification('Testpool', `Процент раскатки изменен на ${percent}%`);
    } catch (err) {
      addNotification('Ошибка', 'Не удалось изменить процент раскатки');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4" id="testpool-loader">
        <div className="w-10 h-10 border-4 border-[#5181b8] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-zinc-500 font-medium">Загрузка экспериментов...</p>
      </div>
    );
  }

  if (experiments.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center space-y-6 mt-12 bg-white border border-[#e3e9f0] rounded-2xl shadow-sm" id="testpool-empty-state-root">
        <Sliders className="mx-auto text-zinc-300" size={48} />
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-800">Экспериментов пока нет</h2>
          <p className="text-sm text-zinc-500">Создайте первый эксперимент</p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="mx-auto flex items-center justify-center gap-2 bg-[#5181b8] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#4671a3] transition cursor-pointer"
        >
          <Plus size={16} />
          Создать эксперимент
        </button>
        
        {/* Render Create Experiment Modal inside Empty State if opened */}
        <AnimatePresence>
          {isCreateOpen && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border border-[#e3e9f0] rounded-2xl p-6 max-w-md w-full shadow-xl text-left"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                  <h3 className="font-semibold text-zinc-900 text-lg">Зарегистрировать функцию</h3>
                  <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={18} />
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-400 font-medium mb-1">
                      Служебный ключ функции (уникальный) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="E.g. ai_summary_widget, new_header"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8]"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Используется разработчиками в коде: <code className="bg-zinc-100 px-1 rounded">isEnabled('key', userId)</code>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 font-medium mb-1">
                      Название функции <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="E.g. Умный помощник в комментариях"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 font-medium mb-1">Описание и цель запуска</label>
                    <textarea 
                      placeholder="Укажите, что тестирует фича, и какая целевая группа..."
                      rows={3}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8] resize-none"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-zinc-100">
                    <button 
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-500 hover:bg-zinc-50"
                    >
                      Отмена
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-[#5181b8] hover:bg-[#4671a3] text-white rounded-lg text-sm font-medium"
                    >
                      Зарегистрировать
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" id="testpool-section">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-[#e3e9f0] p-6 rounded-2xl shadow-sm gap-4" id="testpool-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Testpool</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-md select-none">
              Внутренний инструмент
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            Управляемый запуск новых функций и фич-флагов, координация A/B тестирования и контроль доступности элементов интерфейса для сотрудников платформы.
          </p>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#5181b8] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#4671a3] transition active:scale-95 shrink-0 shadow-sm shadow-[#5181b8]/10 cursor-pointer"
          id="btn-register-feature"
        >
          <Plus size={16} />
          Зарегистрировать функцию
        </button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="testpool-quick-stats">
        <div className="bg-white border border-[#e3e9f0] p-4 rounded-xl shadow-xs">
          <p className="text-xs text-zinc-400 font-medium">Всего функций</p>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{experiments.length}</p>
        </div>
        <div className="bg-white border border-[#e3e9f0] p-4 rounded-xl shadow-xs">
          <p className="text-xs text-zinc-400 font-medium">В процессе раскатки</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {experiments.filter(e => e.status === 'partial').length}
          </p>
        </div>
        <div className="bg-white border border-[#e3e9f0] p-4 rounded-xl shadow-xs">
          <p className="text-xs text-zinc-400 font-medium">Для новых регистраций</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {experiments.filter(e => e.status === 'new_users').length}
          </p>
        </div>
        <div className="bg-white border border-[#e3e9f0] p-4 rounded-xl shadow-xs">
          <p className="text-xs text-zinc-400 font-medium">Полностью в Релизе</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {experiments.filter(e => e.status === 'released').length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative" id="testpool-filters">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input 
          type="text"
          placeholder="Поиск по названию, ключу или описанию фичи..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-[#e3e9f0] pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8] transition text-zinc-800 shadow-2xs"
          id="testpool-search"
        />
      </div>

      {/* Experiments Grid */}
      {filteredExperiments.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200/60 rounded-2xl py-12 px-4 text-center" id="testpool-empty-state">
          <Sliders className="mx-auto text-zinc-300 mb-3" size={36} />
          <p className="text-sm font-medium text-zinc-600">Эксперименты не найдены</p>
          <p className="text-xs text-zinc-400 mt-1">Зарегистрируйте новую функцию для старта</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="testpool-grid">
          {filteredExperiments.map((exp) => {
            const statusConfig = getStatusDisplay(exp.status, exp.rollout_percent);
            const userCount = (testpoolService as any).assignmentsCache.get(exp.id)?.length || 0;

            return (
              <motion.div 
                key={exp.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#e3e9f0] rounded-2xl p-5 flex flex-col justify-between hover:shadow-md hover:border-[#d0d7e0] transition-all relative group shadow-sm"
                id={`card-${exp.key}`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-zinc-800 text-base group-hover:text-[#5181b8] transition">
                        {exp.title}
                      </h3>
                      <code className="text-xs font-mono text-zinc-400 bg-zinc-50 border border-zinc-100 rounded-md px-1.5 py-0.5 mt-1 inline-block">
                        {exp.key}
                      </code>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => setIsHistoryOpen(exp)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition cursor-pointer"
                        title="История изменений"
                      >
                        <History size={16} />
                      </button>
                      <button 
                        onClick={() => setIsEditOpen(exp)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition cursor-pointer"
                        title="Редактировать функцию"
                        id={`btn-edit-${exp.key}`}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteExperiment(exp.id, exp.title)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-500 mt-3 line-clamp-2">
                    {exp.description || 'Описание функции отсутствует.'}
                  </p>

                  {/* Status Badge */}
                  <div className="mt-4 flex flex-wrap gap-2 items-center">
                    <span className={`text-xs px-2.5 py-1 font-medium rounded-full border ${statusConfig.bg}`}>
                      {statusConfig.label}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {statusConfig.desc}
                    </span>
                  </div>

                  {/* Active Users Summary */}
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <p className="text-xs text-zinc-400 font-medium">
                      Используется для <span className="text-zinc-700 font-bold">{userCount}</span> пользователей
                    </p>
                  </div>
                </div>

                {/* Operations Buttons Panel */}
                <div className="mt-5 pt-3 border-t border-zinc-50 flex flex-wrap gap-1.5">
                  <button 
                    onClick={() => setIsParticipantsOpen(exp)}
                    className="flex items-center gap-1.5 bg-zinc-50 text-zinc-600 border border-zinc-200/80 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-zinc-100 hover:border-zinc-300 transition cursor-pointer"
                    id={`btn-participants-${exp.key}`}
                  >
                    <Users size={13} />
                    Раскатано на ({userCount})
                  </button>

                  <button 
                    onClick={() => setIsAddUserOpen(exp)}
                    className="flex items-center gap-1.5 bg-[#5181b8]/10 text-[#5181b8] px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-[#5181b8]/15 transition cursor-pointer"
                    id={`btn-add-user-${exp.key}`}
                  >
                    <UserPlus size={13} />
                    Добавить пользователя
                  </button>

                  {/* Quick percentage rollout controls (visible if active and partial) */}
                  {exp.status === 'partial' && (
                    <div className="w-full mt-3 p-3 bg-zinc-50 border border-zinc-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                        <span>Процент раскатки:</span>
                        <span className="text-[#5181b8] font-bold">{exp.rollout_percent}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={exp.rollout_percent}
                        onChange={(e) => handleUpdatePercentage(exp.id, parseInt(e.target.value))}
                        className="w-full accent-[#5181b8]"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-400">
                        <span>0% (Выкл)</span>
                        <span>50%</span>
                        <span>100% (Все)</span>
                      </div>
                    </div>
                  )}

                  {/* Flow Action Controls */}
                  <div className="flex flex-wrap gap-1.5 w-full mt-3 pt-2 border-t border-zinc-50">
                    {/* Action 1: Rollout 100% */}
                    {exp.status !== 'released' && exp.status !== 'disabled' && (
                      <button 
                        onClick={() => handleRollout100(exp.id)}
                        className="flex-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer text-center"
                        title="Раскатить на 100% текущих пользователей"
                      >
                        Раскатить на 100%
                      </button>
                    )}

                    {/* Action 2: Rollout to New Only */}
                    {exp.status !== 'released' && exp.status !== 'disabled' && (
                      <button 
                        onClick={() => handleRolloutNewOnly(exp.id)}
                        className="flex-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer text-center"
                        title="Раскатить только на новые регистрации"
                      >
                        Только новые
                      </button>
                    )}

                    {/* Action 3: Release */}
                    {exp.status !== 'released' && (
                      <button 
                        onClick={() => handleRelease(exp.id)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer text-center"
                        title="Выпустить в релиз (для всех текущих и будущих пользователей)"
                      >
                        Релиз
                      </button>
                    )}

                    {/* Action 4: Disable completely */}
                    {exp.status !== 'disabled' && (
                      <button 
                        onClick={() => handleToggleStatus(exp.id, 'disabled')}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer text-center"
                        title="Выключить фичу"
                      >
                        Выключить
                      </button>
                    )}

                    {/* Action 5: Restore to draft (if disabled) */}
                    {exp.status === 'disabled' && (
                      <button 
                        onClick={() => handleToggleStatus(exp.id, 'draft')}
                        className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer text-center"
                      >
                        Вернуть в черновик
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* --- MODAL 1: CREATE EXPERIMENT --- */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#e3e9f0] rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <h3 className="font-semibold text-zinc-900 text-lg">Зарегистрировать функцию</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1">
                    Служебный ключ функции (уникальный) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="E.g. ai_summary_widget, new_header"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8]"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Используется разработчиками в коде: <code className="bg-zinc-100 px-1 rounded">isEnabled('key', userId)</code>
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1">
                    Название функции <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="E.g. Умный помощник в комментариях"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1">Описание и цель запуска</label>
                  <textarea 
                    placeholder="Укажите, что тестирует фича, и какая целевая группа..."
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8] resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-zinc-100">
                  <button 
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-500 hover:bg-zinc-50"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-[#5181b8] hover:bg-[#4671a3] text-white rounded-lg text-sm font-medium"
                  >
                    Зарегистрировать
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: EDIT METADATA --- */}
      <AnimatePresence>
        {isEditOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#e3e9f0] rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <h3 className="font-semibold text-zinc-900 text-lg">Редактирование: {isEditOpen.key}</h3>
                <button onClick={() => setIsEditOpen(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4" id={`form-edit-${isEditOpen.key}`}>
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1">Название функции</label>
                  <input 
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1">Описание</label>
                  <textarea 
                    rows={4}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200/80 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8] resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-zinc-100">
                  <button 
                    type="button"
                    onClick={() => setIsEditOpen(null)}
                    className="px-4 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-500 hover:bg-zinc-50"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-[#5181b8] hover:bg-[#4671a3] text-white rounded-lg text-sm font-medium"
                    id="btn-save-edit"
                  >
                    Сохранить изменения
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: PARTICIPANTS (Раскатано на) --- */}
      <AnimatePresence>
        {isParticipantsOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#e3e9f0] rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 text-lg">Раскатано на</h3>
                  <p className="text-xs text-zinc-400">Эксперимент: {isParticipantsOpen.title}</p>
                </div>
                <button onClick={() => setIsParticipantsOpen(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-1" id="participants-list">
                {participants.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">
                    К этой функции пока не подключен ни один пользователь вручную.
                  </div>
                ) : (
                  participants.map((assign) => {
                    const profile = users.find(u => u.id === assign.user_id);
                    return (
                      <div 
                        key={assign.id} 
                        className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-xl p-3"
                        id={`participant-${assign.user_id}`}
                      >
                        <div className="flex items-center gap-3">
                          {profile?.avatar ? (
                            <img 
                              src={profile.avatar} 
                              alt={profile.name} 
                              className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-400 flex items-center justify-center text-xs font-bold font-mono">
                              👤
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-zinc-800">{profile?.name || 'Пользователь'}</p>
                            <p className="text-[10px] text-zinc-400 font-mono">UID: {assign.user_id}</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleRemoveParticipant(isParticipantsOpen.id, assign.user_id, profile?.name || 'Пользователь')}
                          className="flex items-center gap-1 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
                          id={`btn-remove-${assign.user_id}`}
                        >
                          <X size={12} />
                          Убрать
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-100 mt-4">
                <button 
                  onClick={() => {
                    const temp = isParticipantsOpen;
                    setIsParticipantsOpen(null);
                    setIsAddUserOpen(temp);
                  }}
                  className="px-4 py-2 bg-[#5181b8] text-white hover:bg-[#4671a3] rounded-lg text-xs font-medium cursor-pointer"
                >
                  Добавить пользователя
                </button>
                <button 
                  onClick={() => setIsParticipantsOpen(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-500 hover:bg-zinc-50"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 4: ADD PARTICIPANT (No Overlay Dimming as requested) --- */}
      <AnimatePresence>
        {isAddUserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent pointer-events-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-zinc-200 rounded-2xl p-6 max-w-md w-full shadow-2xl pointer-events-auto shadow-zinc-900/10"
              id="modal-add-user"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 text-lg">Добавить пользователя</h3>
                  <p className="text-xs text-zinc-400">Эксперимент: {isAddUserOpen.title}</p>
                </div>
                <button onClick={() => setIsAddUserOpen(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Поиск по имени, логину или UID..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200/80 pl-9 pr-4 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5181b8]/20 focus:border-[#5181b8]"
                    id="search-add-user"
                  />
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto py-1">
                  {userSearchQuery.trim().length === 0 ? (
                    <div className="text-center py-6 text-zinc-400 text-xs">
                      Введите текст для поиска пользователей
                    </div>
                  ) : searchedUsers.length === 0 ? (
                    <div className="text-center py-6 text-zinc-400 text-xs">
                      Пользователи не найдены
                    </div>
                  ) : (
                    searchedUsers.map((user) => {
                      const isAlreadyConnected = ((testpoolService as any).assignmentsCache.get(isAddUserOpen.id) || [])
                        .some((a: any) => a.user_id === user.id && !a.removed_at);

                      return (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 hover:bg-zinc-100/50 transition"
                          id={`search-item-${user.id}`}
                        >
                          <div className="flex items-center gap-2.5">
                            {user.avatar ? (
                              <img 
                                src={user.avatar} 
                                alt={user.name} 
                                className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-400 flex items-center justify-center text-xs font-bold font-mono">
                                👤
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-zinc-800">{user.name}</p>
                              <p className="text-[9px] text-zinc-400 font-mono">@{user.login || 'no_login'}</p>
                            </div>
                          </div>

                          {isAlreadyConnected ? (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md font-medium border border-emerald-100 flex items-center gap-1">
                              <Check size={10} /> Подключен
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleAddParticipant(isAddUserOpen.id, user.id, user.name)}
                              className="bg-[#5181b8] hover:bg-[#4671a3] text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                              id={`btn-apply-add-${user.id}`}
                            >
                              Раскатить
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-100 mt-4">
                <button 
                  onClick={() => {
                    const temp = isAddUserOpen;
                    setIsAddUserOpen(null);
                    setIsParticipantsOpen(temp);
                  }}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-500 hover:bg-zinc-50"
                >
                  Назад к списку
                </button>
                <button 
                  onClick={() => setIsAddUserOpen(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs text-zinc-500 font-semibold"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 5: CHANGE LOG HISTORY --- */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#e3e9f0] rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 text-lg">Лог изменений</h3>
                  <p className="text-xs text-zinc-400">Эксперимент: {isHistoryOpen.title}</p>
                </div>
                <button onClick={() => setIsHistoryOpen(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-3 pr-1 py-1" id="history-logs">
                {eventLogs.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs">
                    История изменений пуста.
                  </div>
                ) : (
                  eventLogs.map((log) => {
                    const operator = users.find(u => u.id === log.operator_id);
                    return (
                      <div key={log.id} className="flex gap-3 bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                        <div className="w-1.5 bg-[#5181b8] rounded-full shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-zinc-800">
                            Действие: <span className="font-mono text-xs text-[#5181b8] bg-[#5181b8]/5 px-1 py-0.5 rounded">{log.action}</span>
                          </p>
                          {log.payload && (
                            <pre className="text-[10px] bg-white border border-zinc-100 p-2 rounded-lg font-mono text-zinc-500 overflow-x-auto max-w-full">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          )}
                          <div className="flex items-center gap-2 mt-2 pt-1 text-[10px] text-zinc-400 border-t border-zinc-100/50">
                            <span>Оператор: {operator?.name || log.operator_id || 'System'}</span>
                            <span>•</span>
                            <span>{new Date(log.created_at).toLocaleString('ru-RU')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-zinc-100 mt-4">
                <button 
                  onClick={() => setIsHistoryOpen(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-xs text-zinc-500 hover:bg-zinc-50"
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
}
