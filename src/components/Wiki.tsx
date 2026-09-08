import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, FileText, Search, Pencil, Trash2, Settings, X, Plus, Check, ArrowLeft
} from 'lucide-react';
import { ModeratorAction } from '../types';
import { alertRepository } from '../services/database/Repository';

export interface WikiArticleItem {
  id: string;
  title: string;
  cat: string;
  count: number;
  content: string;
}

interface WikiProps {
  wikiArticles: WikiArticleItem[];
  wikiCategories: string[];
  wikiRules?: string[];
  isStaff: boolean;
  addNotification: (title: string, message: string) => void;
  addModeratorLog: (log: Omit<ModeratorAction, 'id' | 'operatorId' | 'operatorName' | 'timestamp'>) => void;
  loadWiki: () => Promise<void>;
  initialSelectedArticleId?: string | null;
}

export const Wiki: React.FC<WikiProps> = ({
  wikiArticles,
  wikiCategories,
  addNotification,
  addModeratorLog,
  loadWiki,
  initialSelectedArticleId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeWikiCat, setActiveWikiCat] = useState('Все');
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');

  // Editing state for article view
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Article Form state (/wiki_new)
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('Общее');
  const [customBadge, setCustomBadge] = useState('');
  const [isCustomBadge, setIsCustomBadge] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Category management state (/wiki_edit)
  const [newCatInput, setNewCatInput] = useState('');
  const [isUpdatingCats, setIsUpdatingCats] = useState(false);

  // Determine current route state
  const currentPath = location.pathname;
  const isNewModalOpen = currentPath === '/wiki_new';
  const isEditCategoriesModalOpen = currentPath === '/wiki_edit';

  // Match article ID from URL (e.g. /wiki-1, /wiki-123)
  const articleIdFromPath = useMemo(() => {
    if (currentPath.startsWith('/wiki-')) {
      return currentPath.slice(1); // "wiki-1"
    }
    return null;
  }, [currentPath]);

  // Find article matching either route or initialSelectedArticleId
  const selectedArticle = useMemo(() => {
    const targetId = articleIdFromPath || initialSelectedArticleId;
    if (!targetId) return null;
    return wikiArticles.find(
      a => a.id === targetId || 
           a.id === targetId.replace(/^wiki-/, '') || 
           `wiki-${a.id}` === targetId
    ) || null;
  }, [articleIdFromPath, initialSelectedArticleId, wikiArticles]);

  // Synchronize edit fields when selectedArticle changes or editing begins
  useEffect(() => {
    if (selectedArticle) {
      setEditTitle(selectedArticle.title);
      setEditCat(selectedArticle.cat);
      setEditContent(selectedArticle.content);
      setIsEditing(false);
    }
  }, [selectedArticle]);

  // Available categories list
  const availableCategories = useMemo(() => {
    const list = wikiCategories.filter(c => c !== 'Все');
    if (!list.includes('Общее')) {
      return ['Общее', ...list];
    }
    return list;
  }, [wikiCategories]);

  // Filtered articles list for main view
  const filteredArticles = useMemo(() => {
    return wikiArticles.filter(a => {
      const q = wikiSearchQuery.toLowerCase().trim();
      const matchesQuery = !q || a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
      const matchesCat = activeWikiCat === 'Все' || a.cat === activeWikiCat;
      return matchesQuery && matchesCat;
    });
  }, [wikiArticles, wikiSearchQuery, activeWikiCat]);

  // Open article
  const handleOpenArticle = (article: WikiArticleItem) => {
    const routeId = article.id.startsWith('wiki-') ? article.id : `wiki-${article.id}`;
    navigate(`/${routeId}`);
  };

  // Save changes to current article
  const handleSaveArticle = async () => {
    if (!selectedArticle) return;
    if (!editTitle.trim()) {
      addNotification('Ошибка', 'Введите название статьи');
      return;
    }
    if (!editContent.trim()) {
      addNotification('Ошибка', 'Текст статьи не может быть пустым');
      return;
    }

    setIsSaving(true);
    try {
      const updatedArticle = {
        id: selectedArticle.id,
        title: editTitle.trim(),
        text: editContent.trim(),
        tag: editCat.trim() || 'Общее',
        timestamp: new Date().toISOString()
      };

      await alertRepository.insert(updatedArticle);
      await loadWiki();
      setIsEditing(false);
      addNotification('Сохранено', 'Статья успешно обновлена в базе данных');
      addModeratorLog({
        type: 'wiki',
        action: 'Редактирование статьи Wiki',
        message: `Обновлена статья Wiki: "${updatedArticle.title}" (ID: ${updatedArticle.id})`,
        targetId: updatedArticle.id,
        targetName: updatedArticle.title
      });
    } catch (e) {
      console.error('Failed to update wiki article:', e);
      addNotification('Ошибка', 'Не удалось сохранить изменения в базе данных');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    if (selectedArticle) {
      setEditTitle(selectedArticle.title);
      setEditCat(selectedArticle.cat);
      setEditContent(selectedArticle.content);
    }
    setIsEditing(false);
  };

  // Delete article from database
  const handleDeleteArticle = async () => {
    if (!selectedArticle) return;
    if (!window.confirm(`Вы действительно хотите удалить статью "${selectedArticle.title}" из базы данных?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await alertRepository.delete(selectedArticle.id);
      await loadWiki();
      addNotification('Удалено', `Статья "${selectedArticle.title}" успешно удалена`);
      addModeratorLog({
        type: 'wiki',
        action: 'Удаление статьи Wiki',
        message: `Удалена статья Wiki: "${selectedArticle.title}" (ID: ${selectedArticle.id})`,
        targetId: selectedArticle.id,
        targetName: selectedArticle.title
      });
      navigate('/wiki');
    } catch (e) {
      console.error('Failed to delete wiki article:', e);
      addNotification('Ошибка', 'Не удалось удалить статью');
    } finally {
      setIsDeleting(false);
    }
  };

  // Create new article
  const handleCreateNewArticle = async () => {
    if (!newTitle.trim()) {
      addNotification('Ошибка', 'Укажите название статьи');
      return;
    }
    if (!newContent.trim()) {
      addNotification('Ошибка', 'Заполните содержание статьи');
      return;
    }

    const assignedBadge = isCustomBadge ? customBadge.trim() : newCat.trim();
    if (!assignedBadge) {
      addNotification('Ошибка', 'Укажите бейдж или категорию статьи');
      return;
    }

    setIsCreating(true);
    try {
      // Find maximum numeric suffix or timestamp for unique ID
      const existingIds = wikiArticles
        .map(a => {
          const match = a.id.match(/^wiki-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      const nextNum = existingIds.length > 0 ? Math.max(...existingIds) + 1 : wikiArticles.length + 1;
      const articleId = `wiki-${nextNum}`;

      const newRecord = {
        id: articleId,
        title: newTitle.trim(),
        text: newContent.trim(),
        tag: assignedBadge,
        timestamp: new Date().toISOString()
      };

      await alertRepository.insert(newRecord);
      await loadWiki();

      // Reset form
      setNewTitle('');
      setNewContent('');
      setCustomBadge('');
      setIsCustomBadge(false);
      setIsCreating(false);

      addNotification('Успех', 'Новая статья успешно добавлена в базу данных');
      addModeratorLog({
        type: 'wiki',
        action: 'Создание статьи Wiki',
        message: `Создана новая корпоративная статья: "${newRecord.title}" с бейджем "${assignedBadge}"`,
        targetId: newRecord.id,
        targetName: newRecord.title
      });

      // Navigate to newly created article
      navigate(`/${articleId}`);
    } catch (e) {
      console.error('Failed to create wiki article:', e);
      addNotification('Ошибка', 'Не удалось сохранить статью в базу данных');
      setIsCreating(false);
    }
  };

  // Add category in admin panel
  const handleAddCategory = async () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (wikiCategories.includes(trimmed)) {
      addNotification('Внимание', 'Такая категория уже существует');
      return;
    }

    setIsUpdatingCats(true);
    try {
      const updated = [...wikiCategories, trimmed];
      await alertRepository.insert({
        id: 'wiki_categories',
        title: 'Wiki Categories Configuration',
        text: JSON.stringify(updated),
        tag: 'System',
        timestamp: new Date().toISOString()
      });
      await loadWiki();
      setNewCatInput('');
      addNotification('Добавлено', `Категория "${trimmed}" успешно добавлена`);
    } catch (e) {
      console.error('Failed to add category:', e);
      addNotification('Ошибка', 'Не удалось сохранить категорию');
    } finally {
      setIsUpdatingCats(false);
    }
  };

  // Delete category in admin panel
  const handleDeleteCategory = async (catToDelete: string) => {
    if (catToDelete === 'Все' || catToDelete === 'Общее') {
      addNotification('Внимание', 'Системную категорию нельзя удалить');
      return;
    }

    setIsUpdatingCats(true);
    try {
      const updated = wikiCategories.filter(c => c !== catToDelete);
      await alertRepository.insert({
        id: 'wiki_categories',
        title: 'Wiki Categories Configuration',
        text: JSON.stringify(updated),
        tag: 'System',
        timestamp: new Date().toISOString()
      });
      await loadWiki();
      if (activeWikiCat === catToDelete) {
        setActiveWikiCat('Все');
      }
      addNotification('Удалено', `Категория "${catToDelete}" удалена`);
    } catch (e) {
      console.error('Failed to delete category:', e);
      addNotification('Ошибка', 'Не удалось удалить категорию');
    } finally {
      setIsUpdatingCats(false);
    }
  };

  // =========================================================================
  // VIEW: SINGLE ARTICLE
  // =========================================================================
  if (selectedArticle || articleIdFromPath) {
    if (!selectedArticle) {
      return (
        <div className="bg-white p-8 rounded-[4px] border border-vk-separator text-left space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/wiki')}
              className="p-1.5 hover:bg-[#f0f2f5] rounded-full text-[#2a5885] transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-[17px] font-bold text-vk-text">Статья не найдена</h2>
          </div>
          <p className="text-[13px] text-vk-text-secondary">
            Статья с указанным идентификатором отсутствует в базе данных или была удалена.
          </p>
          <button 
            onClick={() => navigate('/wiki')}
            className="px-4 py-1.5 bg-[#5181b8] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#4672a3] cursor-pointer"
          >
            Вернуться в Базу знаний
          </button>
        </div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-left">
        <div className="bg-white p-6 md:p-8 rounded-[4px] border border-vk-separator shadow-xs">
          
          {/* Top Bar with Navigation & Actions */}
          <div className="flex items-center justify-between border-b border-vk-separator pb-4 mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/wiki')} 
                title="Назад в Базу знаний"
                className="p-1.5 hover:bg-[#f0f2f5] rounded-full text-[#2a5885] transition-colors cursor-pointer"
              >
                <ChevronLeft size={22} />
              </button>
              <div className="flex items-center gap-2">
                <span className="bg-[#5181b8]/15 text-[#2a5885] text-[11px] font-bold uppercase px-2 py-0.5 rounded-[3px] border border-[#5181b8]/20">
                  {selectedArticle.cat}
                </span>
                <span className="text-[12px] text-vk-text-secondary">
                  База знаний • {selectedArticle.id}
                </span>
              </div>
            </div>

            {/* Action Buttons: Edit / Delete or Save / Cancel */}
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(true)}
                    title="Редактировать статью"
                    className="p-2 text-[#2a5885] hover:bg-[#f0f2f5] rounded-[4px] transition-colors cursor-pointer border border-vk-separator/80 flex items-center gap-1 text-[12.5px] font-medium"
                  >
                    <Pencil size={15} />
                    <span className="hidden sm:inline">Редактировать</span>
                  </button>
                  <button 
                    onClick={handleDeleteArticle}
                    disabled={isDeleting}
                    title="Удалить статью"
                    className="p-2 text-[#e64646] hover:bg-[#fde8e8] rounded-[4px] transition-colors cursor-pointer border border-vk-separator/80 flex items-center justify-center disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 text-[12.5px] font-medium text-vk-text-secondary hover:text-vk-text bg-[#f0f2f5] hover:bg-[#e4e6eb] rounded-[4px] transition-colors cursor-pointer"
                  >
                    Отменить
                  </button>
                  <button 
                    onClick={handleSaveArticle}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-[12.5px] font-bold text-white bg-[#4bb34b] hover:bg-[#43a143] rounded-[4px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                  >
                    <Check size={15} />
                    <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Article Content: View or Edit Mode */}
          {!isEditing ? (
            <div className="space-y-4">
              <h1 className="text-[22px] font-bold text-vk-text leading-tight">
                {selectedArticle.title}
              </h1>
              <div className="text-[15px] text-vk-text leading-[1.65] whitespace-pre-line pt-2">
                {selectedArticle.content}
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {/* Title Field */}
              <div className="space-y-1">
                <label className="text-[11.5px] font-bold uppercase tracking-wider text-vk-text-secondary">
                  Заголовок статьи
                </label>
                <input 
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Введите название..."
                  className="w-full bg-white border border-[#dce1e6] rounded-[4px] px-3.5 py-2 text-[15px] font-semibold text-vk-text focus:outline-none focus:border-[#5181b8]"
                />
              </div>

              {/* Category / Badge Field */}
              <div className="space-y-1">
                <label className="text-[11.5px] font-bold uppercase tracking-wider text-vk-text-secondary">
                  Категория / Бейдж
                </label>
                <div className="flex gap-2">
                  <select
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value)}
                    className="w-full sm:w-64 bg-white border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[13px] text-vk-text focus:outline-none focus:border-[#5181b8]"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Content Textarea */}
              <div className="space-y-1 pt-2">
                <label className="text-[11.5px] font-bold uppercase tracking-wider text-vk-text-secondary">
                  Содержание статьи
                </label>
                <textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Введите текст статьи..."
                  rows={14}
                  className="w-full bg-white border border-[#dce1e6] rounded-[4px] p-3.5 text-[14.5px] leading-relaxed text-vk-text focus:outline-none focus:border-[#5181b8] resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-vk-separator">
                <button 
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 text-[13px] font-medium text-vk-text-secondary hover:text-vk-text bg-[#f0f2f5] hover:bg-[#e4e6eb] rounded-[4px] transition-colors cursor-pointer"
                >
                  Отменить
                </button>
                <button 
                  onClick={handleSaveArticle}
                  disabled={isSaving}
                  className="px-5 py-2 text-[13px] font-bold text-white bg-[#4bb34b] hover:bg-[#43a143] rounded-[4px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{isSaving ? 'Сохранение...' : 'Сохранить'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    );
  }

  // =========================================================================
  // VIEW: MAIN WIKI LIST & CATEGORIES
  // =========================================================================
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-left">
      <div className="bg-white rounded-[4px] border border-vk-separator shadow-xs overflow-hidden">
        
        {/* Header Section: Light, Uncluttered, Direct */}
        <div className="p-6 border-b border-vk-separator bg-[#fafbfc]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-bold text-vk-text">База знаний</h1>
              <p className="text-[12.5px] text-vk-text-secondary mt-0.5">
                Справочные материалы, инструкции и регламенты
              </p>
            </div>

            {/* Top-Right Control Buttons: Pencil (New) & Gear (Edit categories) */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/wiki_new')}
                title="Создать статью"
                className="p-2 text-[#2a5885] hover:bg-white hover:text-[#5181b8] bg-[#f0f2f5] rounded-[6px] border border-[#dce1e6] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <Pencil size={18} />
              </button>
              <button 
                onClick={() => navigate('/wiki_edit')}
                title="Управление категориями"
                className="p-2 text-[#2a5885] hover:bg-white hover:text-[#5181b8] bg-[#f0f2f5] rounded-[6px] border border-[#dce1e6] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-5 pt-4 border-t border-vk-separator/60">
            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {['Все', ...availableCategories].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveWikiCat(cat)}
                  className={`px-3.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap transition-all border cursor-pointer ${
                    cat === activeWikiCat 
                      ? 'bg-[#5181b8] text-white border-[#5181b8] shadow-2xs font-semibold' 
                      : 'bg-[#f0f2f5] text-[#55677d] border-transparent hover:bg-[#e4e6eb]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full md:w-64 shrink-0">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search size={14} />
              </div>
              <input 
                type="text" 
                placeholder="Поиск по статьям..."
                value={wikiSearchQuery}
                onChange={(e) => setWikiSearchQuery(e.target.value)}
                className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[6px] pl-9 pr-3 py-1.5 text-[12.5px] focus:outline-none focus:bg-white focus:border-[#5181b8] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Articles List */}
        <div className="p-6 space-y-3">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((art) => (
              <div 
                key={art.id}
                onClick={() => handleOpenArticle(art)}
                className="p-4 border border-vk-separator rounded-[4px] bg-white hover:border-[#5181b8]/50 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#5181b8]/15 text-[#2a5885] text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[2px] border border-[#5181b8]/20">
                        {art.cat}
                      </span>
                      <span className="text-[11px] text-vk-text-secondary">
                        {art.id}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-vk-text group-hover:text-[#2a5885] transition-colors">
                      {art.title}
                    </h3>
                    <p className="text-[12.5px] text-vk-text-secondary line-clamp-2 leading-relaxed">
                      {art.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-[#f0f2f5] flex items-center justify-center mx-auto mb-3 text-vk-text-secondary">
                <FileText size={22} />
              </div>
              <h4 className="text-[15px] font-semibold text-vk-text">В базе знаний пока нет статей</h4>
              <p className="text-[12.5px] text-vk-text-secondary mt-1 max-w-sm mx-auto">
                {wikiSearchQuery || activeWikiCat !== 'Все' 
                  ? 'По вашему запросу ничего не найдено. Попробуйте сбросить фильтры.' 
                  : 'Нажмите на кнопку карандаша в правом верхнем углу, чтобы добавить первую статью.'}
              </p>
              {!(wikiSearchQuery || activeWikiCat !== 'Все') && (
                <button
                  onClick={() => navigate('/wiki_new')}
                  className="mt-4 px-4 py-2 bg-[#5181b8] hover:bg-[#4672a3] text-white text-[12.5px] font-semibold rounded-[4px] transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <Pencil size={14} /> Создать статью
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW ARTICLE (/wiki_new) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-[8px] border border-vk-separator shadow-xl w-full max-w-lg overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="p-4 px-6 border-b border-vk-separator flex items-center justify-between bg-[#fafbfc]">
                <div className="flex items-center gap-2">
                  <Pencil size={16} className="text-[#2a5885]" />
                  <h3 className="text-[15px] font-bold text-vk-text">Создание статьи</h3>
                </div>
                <button 
                  onClick={() => navigate('/wiki')}
                  className="p-1 text-vk-text-secondary hover:text-vk-text hover:bg-[#f0f2f5] rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-vk-text-secondary">
                    Название статьи *
                  </label>
                  <input 
                    type="text"
                    placeholder="Например: Инструкция по работе с жалобами"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white border border-[#dce1e6] rounded-[4px] px-3 py-2 text-[13px] text-vk-text focus:outline-none focus:border-[#5181b8]"
                  />
                </div>

                {/* Badge / Category */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11.5px] font-bold uppercase tracking-wider text-vk-text-secondary">
                      Бейдж / Категория *
                    </label>
                    <button 
                      type="button"
                      onClick={() => setIsCustomBadge(!isCustomBadge)}
                      className="text-[11px] text-[#2a5885] hover:underline font-medium cursor-pointer"
                    >
                      {isCustomBadge ? 'Выбрать из существующих' : 'Ввести свой бейдж'}
                    </button>
                  </div>

                  {!isCustomBadge ? (
                    <select
                      value={newCat}
                      onChange={(e) => setNewCat(e.target.value)}
                      className="w-full bg-white border border-[#dce1e6] rounded-[4px] px-3 py-2 text-[13px] text-vk-text focus:outline-none focus:border-[#5181b8]"
                    >
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text"
                      placeholder="Например: Регламент, Поддержка, Безопасность..."
                      value={customBadge}
                      onChange={(e) => setCustomBadge(e.target.value)}
                      className="w-full bg-white border border-[#dce1e6] rounded-[4px] px-3 py-2 text-[13px] text-vk-text focus:outline-none focus:border-[#5181b8]"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-vk-text-secondary">
                    Текст статьи *
                  </label>
                  <textarea 
                    placeholder="Опишите подробно все пункты и регламенты..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={8}
                    className="w-full bg-white border border-[#dce1e6] rounded-[4px] p-3 text-[13px] leading-relaxed text-vk-text focus:outline-none focus:border-[#5181b8] resize-y"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-vk-separator bg-[#fafbfc] flex items-center justify-end gap-2">
                <button 
                  onClick={() => navigate('/wiki')}
                  disabled={isCreating}
                  className="px-4 py-2 text-[12.5px] font-medium text-vk-text-secondary hover:text-vk-text bg-[#f0f2f5] hover:bg-[#e4e6eb] rounded-[4px] transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button 
                  onClick={handleCreateNewArticle}
                  disabled={isCreating}
                  className="px-5 py-2 text-[12.5px] font-bold text-white bg-[#4bb34b] hover:bg-[#43a143] rounded-[4px] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isCreating ? 'Сохранение...' : 'Создать статью'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: EDIT CATEGORIES ADMIN PANEL (/wiki_edit) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditCategoriesModalOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-[8px] border border-vk-separator shadow-xl w-full max-w-md overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="p-4 px-6 border-b border-vk-separator flex items-center justify-between bg-[#fafbfc]">
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-[#2a5885]" />
                  <h3 className="text-[15px] font-bold text-vk-text">Управление категориями</h3>
                </div>
                <button 
                  onClick={() => navigate('/wiki')}
                  className="p-1 text-vk-text-secondary hover:text-vk-text hover:bg-[#f0f2f5] rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Add Category Section */}
                <div className="space-y-1.5">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-vk-text-secondary">
                    Добавить новую категорию
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Название категории..."
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                      className="grow bg-white border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] text-vk-text focus:outline-none focus:border-[#5181b8]"
                    />
                    <button 
                      onClick={handleAddCategory}
                      disabled={isUpdatingCats || !newCatInput.trim()}
                      className="px-3 py-1.5 bg-[#4bb34b] hover:bg-[#43a143] text-white text-[12px] font-bold rounded-[4px] transition-colors cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Plus size={14} /> Добавить
                    </button>
                  </div>
                </div>

                {/* Categories List */}
                <div className="space-y-1 pt-2">
                  <label className="text-[11.5px] font-bold uppercase tracking-wider text-vk-text-secondary">
                    Список активных категорий
                  </label>
                  <div className="border border-vk-separator rounded-[4px] divide-y divide-vk-separator max-h-60 overflow-y-auto">
                    {availableCategories.map(cat => {
                      const articleCount = wikiArticles.filter(a => a.cat === cat).length;
                      const isDefault = cat === 'Общее';
                      return (
                        <div key={cat} className="p-2.5 px-3.5 flex items-center justify-between text-[13px] hover:bg-[#fafbfc] transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-vk-text">{cat}</span>
                            <span className="text-[11px] text-vk-text-secondary">({articleCount})</span>
                          </div>
                          {!isDefault ? (
                            <button 
                              onClick={() => handleDeleteCategory(cat)}
                              disabled={isUpdatingCats}
                              className="text-[#e64646] hover:underline text-[11.5px] font-medium cursor-pointer"
                            >
                              Удалить
                            </button>
                          ) : (
                            <span className="text-[11px] text-vk-text-secondary italic">Базовая</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-vk-separator bg-[#fafbfc] flex items-center justify-end">
                <button 
                  onClick={() => navigate('/wiki')}
                  className="px-4 py-1.5 text-[12.5px] font-semibold text-white bg-[#5181b8] hover:bg-[#4672a3] rounded-[4px] transition-colors cursor-pointer"
                >
                  Готово
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
