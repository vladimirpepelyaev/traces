import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, FileText, Search, PenLine, Settings, BookOpen, ArrowUpRight, ShieldCheck, FileSearch 
} from 'lucide-react';
import { ToastNotification, ModeratorAction } from '../types';
import { alertRepository } from '../services/database/Repository';

interface WikiProps {
  wikiArticles: { id: string; title: string; cat: string; count: number; content: string }[];
  wikiCategories: string[];
  wikiRules: string[];
  isStaff: boolean;
  addNotification: (title: string, message: string) => void;
  addModeratorLog: (log: Omit<ModeratorAction, 'id' | 'operatorId' | 'operatorName' | 'timestamp'>) => void;
  loadWiki: () => Promise<void>;
}

export const Wiki: React.FC<WikiProps> = ({
  wikiArticles,
  wikiCategories,
  wikiRules,
  isStaff,
  addNotification,
  addModeratorLog,
  loadWiki,
}) => {
  const [wikiSubTab, setWikiSubTab] = useState<'articles' | 'manage'>('articles');
  const [activeWikiCat, setActiveWikiCat] = useState('Все');
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [selectedWikiArticle, setSelectedWikiArticle] = useState<typeof wikiArticles[0] | null>(null);
  const [showAddArticleForm, setShowAddArticleForm] = useState(false);
  const [newWikiCatName, setNewWikiCatName] = useState('');
  
  const [newWikiArticle, setNewWikiArticle] = useState({
    title: '',
    cat: 'Модератор',
    content: '',
    pageCount: 1
  });

  const filteredArticles = wikiArticles.filter(a => {
    const matchesQuery = a.title.toLowerCase().includes(wikiSearchQuery.toLowerCase()) || 
                          a.content.toLowerCase().includes(wikiSearchQuery.toLowerCase());
    const matchesCat = activeWikiCat === 'Все' || a.cat === activeWikiCat;
    return matchesQuery && matchesCat;
  });

  const categories = wikiCategories;

  const handleCreateArticle = async () => {
    if (!newWikiArticle.title || !newWikiArticle.content) {
      addNotification('Ошибка', 'Заполните все поля статьи!');
      return;
    }
    const createdItem = {
      id: `wiki-${Date.now()}`,
      title: `${newWikiArticle.title} [count:${newWikiArticle.pageCount || 1}]`,
      text: newWikiArticle.content,
      tag: newWikiArticle.cat,
      timestamp: new Date().toISOString()
    };
    await alertRepository.insert(createdItem);
    await loadWiki();
    setNewWikiArticle({ title: '', cat: 'Модератор', content: '', pageCount: 1 });
    setShowAddArticleForm(false);
    addNotification('Успех', 'Новая статья успешно добавлена в базу знаний');
    addModeratorLog({
      type: 'wiki',
      action: 'Создание статьи Wiki',
      message: `Создана новая корпоративная статья: "${newWikiArticle.title}" в разделе "${newWikiArticle.cat}"`,
      targetId: createdItem.id,
      targetName: newWikiArticle.title
    });
  };

  const handleAddCategory = async () => {
    if (!newWikiCatName.trim()) return;
    if (wikiCategories.includes(newWikiCatName.trim())) {
      addNotification('Ошибка', 'Категория уже существует');
      return;
    }
    const updatedCategories = [...wikiCategories, newWikiCatName.trim()];
    await alertRepository.insert({
      id: 'wiki_categories',
      title: 'Wiki Categories Configuration',
      text: JSON.stringify(updatedCategories),
      tag: 'System',
      timestamp: new Date().toISOString()
    });
    await loadWiki();
    addNotification('Добавлено', `Категория "${newWikiCatName.trim()}" успешно добавлена`);
    addModeratorLog({
      type: 'wiki',
      action: 'Добавление категории Wiki',
      message: `Добавлена новая категория статей в базу знаний: "${newWikiCatName.trim()}"`,
      targetName: newWikiCatName.trim()
    });
    setNewWikiCatName('');
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    if (catToDelete === 'Все') return;
    const updatedCategories = wikiCategories.filter(c => c !== catToDelete);
    await alertRepository.insert({
      id: 'wiki_categories',
      title: 'Wiki Categories Configuration',
      text: JSON.stringify(updatedCategories),
      tag: 'System',
      timestamp: new Date().toISOString()
    });
    await loadWiki();
    if (activeWikiCat === catToDelete) setActiveWikiCat('Все');
    addNotification('Удалено', `Категория "${catToDelete}" удалена`);
    addModeratorLog({
      type: 'wiki',
      action: 'Удаление категории Wiki',
      message: `Удалена категория Wiki: "${catToDelete}"`,
      targetName: catToDelete
    });
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    await alertRepository.delete(id);
    await loadWiki();
    addNotification('Удалено', `Статья "${title}" успешно удалена`);
    addModeratorLog({
      type: 'wiki',
      action: 'Удаление статьи Wiki',
      message: `Удалена статья Wiki: "${title}" (ID: ${id})`,
      targetId: id,
      targetName: title
    });
  };

  if (selectedWikiArticle) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-left">
        <div className="bg-vk-white p-8 rounded-[4px] border border-vk-separator shadow-sm">
          <div className="flex items-center gap-4 border-b border-vk-separator pb-6 mb-8">
            <button 
              onClick={() => setSelectedWikiArticle(null)} 
              className="p-2 hover:bg-[#f0f2f5] rounded-full text-[#2a5885] transition-colors cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-[#5181b8]/15 text-[#2a5885] text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] border border-[#5181b8]/20">{selectedWikiArticle.cat}</span>
                <span className="text-vk-text-secondary text-[11px]">База знаний • Информационная статья</span>
              </div>
              <h1 className="text-[22px] font-bold text-vk-text leading-tight">{selectedWikiArticle.title}</h1>
            </div>
          </div>
          <div className="text-[15px] text-vk-text leading-[1.6] space-y-4 whitespace-pre-line">
            {selectedWikiArticle.content}
            
            <div className="p-6 bg-[#f5f7f8] border-l-4 border-[#5181b8] rounded-[4px] mt-10 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-vk-separator/50">
                <h4 className="text-[13px] font-bold text-[#285473] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={18} /> Регламент взаимодействия:
                </h4>
                {isStaff && (
                  <button 
                    onClick={async () => {
                      const newRule1 = prompt("Пункт 1 Регламента:", wikiRules[0]) || wikiRules[0];
                      const newRule2 = prompt("Пункт 2 Регламента:", wikiRules[1]) || wikiRules[1];
                      const newRule3 = prompt("Пункт 3 Регламента:", wikiRules[2]) || wikiRules[2];
                      const updatedRules = [newRule1, newRule2, newRule3];
                      await alertRepository.insert({
                        id: 'wiki_rules',
                        title: 'Wiki Rules Configuration',
                        text: JSON.stringify(updatedRules),
                        tag: 'System',
                        timestamp: new Date().toISOString()
                      });
                      await loadWiki();
                      addNotification('Успех', 'Регламент взаимодействия успешно сохранен');
                    }}
                    className="text-[11.5px] text-[#2a5885] font-semibold hover:underline cursor-pointer"
                  >
                    Редактировать регламент
                  </button>
                )}
              </div>
              <ul className="space-y-2 text-[14px]">
                {wikiRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#5181b8] mt-2 shrink-0" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 flex justify-between items-center border-t border-vk-separator pt-6">
            <span className="text-vk-text-secondary text-[12px] italic">Последнее редактирование регламента доступно администраторам</span>
            <button disabled className="text-vk-text-secondary text-[12.5px] flex items-center gap-2 bg-transparent border-none">
              <FileText size={16} /> Чтение • {selectedWikiArticle.count || 1} стр.
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 text-left">
      <div className="bg-vk-white rounded-[4px] border border-vk-separator overflow-hidden shadow-sm">
        <div className="p-6 border-b border-vk-separator bg-[#fafbfc]">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#5181b8]/10 flex items-center justify-center text-[#5181b8]">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h1 className="text-[19px] font-bold text-vk-text">База знаний (Wiki)</h1>
                  <p className="text-[12px] text-vk-text-secondary">Единый центр инструкций, регламентов и документации</p>
                </div>
              </div>
              
              <div className="flex gap-1.5 self-start md:self-auto bg-[#f0f2f5] p-0.5 rounded-[6px]">
                <button 
                  onClick={() => setWikiSubTab('articles')}
                  className={`px-4 py-1.5 text-[12px] font-medium rounded-[5px] transition-all cursor-pointer ${
                    wikiSubTab === 'articles' ? 'bg-white text-vk-text shadow-sm' : 'text-vk-text-secondary hover:text-vk-text'
                  }`}
                >
                  Статьи
                </button>
                <button 
                  onClick={() => setWikiSubTab('manage')}
                  className={`px-4 py-1.5 text-[12px] font-medium rounded-[5px] transition-all flex items-center gap-1 cursor-pointer ${
                    wikiSubTab === 'manage' ? 'bg-white text-vk-text shadow-sm' : 'text-vk-text-secondary hover:text-vk-text'
                  }`}
                >
                  <Settings size={13} /> Управление разделами
                </button>
              </div>
           </div>

           {wikiSubTab === 'manage' && (
             <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-6 p-4 bg-white border border-vk-separator rounded-[4px] space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#e7e8ec]">
                   <Settings size={15} className="text-[#5181b8]" />
                   <h3 className="text-[13px] font-bold text-vk-text-secondary uppercase tracking-wider">Панель управления разделами и статьями (В строчку)</h3>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-[#f5f7f8] rounded-[4px] border border-vk-separator/60">
                  <div className="flex flex-col">
                    <span className="text-[12.5px] font-bold text-vk-text">Добавить новый раздел</span>
                    <span className="text-[11px] text-vk-text-secondary">Будет создан новый подраздел в каталоге Базы знаний</span>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                     <input 
                       type="text" 
                       placeholder="Название раздела (например: Работа с жалобами)"
                       value={newWikiCatName}
                       onChange={(e) => setNewWikiCatName(e.target.value)}
                       className="grow bg-white border border-[#dce1e6] rounded-[4px] px-3 py-1 text-[12px] w-full md:w-64 focus:outline-none focus:border-[#5181b8]"
                     />
                     <button 
                       onClick={handleAddCategory}
                       className="bg-[#4bb34b] hover:bg-[#52c152] text-white px-4 py-1 rounded-[4px] text-[12px] font-medium shrink-0 transition-all cursor-pointer"
                     >
                       Создать
                     </button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-vk-text-secondary mb-1">Список активных разделов:</h4>
                  <div className="border border-vk-separator rounded-[4px] overflow-hidden bg-white divide-y divide-vk-separator">
                    {categories.map(cat => (
                      <div key={cat} className="flex items-center justify-between p-2.5 px-4 text-[13px] hover:bg-[#fafbfc] transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#2a5885]">{cat}</span>
                          <span className="text-[11px] text-vk-text-secondary">({wikiArticles.filter(a => a.cat === cat).length} статей)</span>
                        </div>
                        {cat !== 'Все' ? (
                          <button 
                            onClick={() => handleDeleteCategory(cat)}
                            className="text-[#e64646] hover:underline text-[11.5px] font-medium cursor-pointer"
                          >
                            Удалить раздел
                          </button>
                        ) : (
                          <span className="text-vk-text-secondary text-[11px] italic font-medium">Системный и обязательный</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-vk-text-secondary mb-1">Список опубликованных статей:</h4>
                  <div className="border border-vk-separator rounded-[4px] overflow-hidden bg-white divide-y divide-vk-separator">
                    {wikiArticles.map(art => (
                      <div key={art.id} className="flex items-center justify-between p-2.5 px-4 text-[13px] hover:bg-[#fafbfc] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-vk-text">{art.title}</span>
                          <span className="bg-[#5181b8]/10 text-[#2a5885] text-[10px] font-bold px-1.5 py-0.2 rounded-[2px]">{art.cat}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteArticle(art.id, art.title)}
                          className="text-[#e64646] hover:underline text-[11.5px] font-medium cursor-pointer"
                        >
                          Удалить статью
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
             </motion.div>
           )}

           {wikiSubTab === 'articles' && (
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
               <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
                  {categories.map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setActiveWikiCat(cat)}
                      className={`px-4 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all border cursor-pointer ${
                        cat === activeWikiCat ? 'bg-[#5181b8] text-white border-[#5181b8] shadow-sm' : 'bg-[#f0f2f5] text-[#55677d] border-transparent hover:bg-[#e1e5eb]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
               </div>
               
               <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto">
                 <div className="relative grow md:w-64">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#5181b8] transition-colors"><Search size={14} /></div>
                    <input 
                      type="text" 
                      placeholder="Быстрый поиск в статьях..."
                      value={wikiSearchQuery}
                      onChange={(e) => setWikiSearchQuery(e.target.value)}
                      className="w-full bg-[#f2f3f5] border border-[#dce1e6] rounded-[6px] pl-9 pr-4 py-1.5 text-[13px] focus:outline-none focus:bg-white focus:border-[#5181b8]"
                    />
                 </div>
                 <button 
                   onClick={() => {
                     setShowAddArticleForm(!showAddArticleForm);
                     if (!newWikiArticle.cat) {
                       const firstCat = categories.find(c => c !== 'Все') || 'Модератор';
                       setNewWikiArticle({ ...newWikiArticle, cat: firstCat });
                     }
                   }}
                   className="px-4 py-1.5 bg-[#4bb34b] hover:bg-[#52c152] text-white text-[12.5px] rounded-[6px] font-semibold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap cursor-pointer"
                 >
                   <PenLine size={14} /> Создать статью
                 </button>
               </div>
             </div>
           )}

           {wikiSubTab === 'articles' && showAddArticleForm && (
             <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-[#fafbfc] border border-vk-separator rounded-[4px] shadow-inner mt-4 space-y-4">
               <div className="flex items-center justify-between pb-2 border-b border-vk-separator/50">
                 <div className="flex items-center gap-1.5">
                   <PenLine size={15} className="text-[#2a5885]" />
                   <h3 className="text-[13px] font-bold text-vk-text">Новая статья в Базу знаний</h3>
                 </div>
                 <button onClick={() => setShowAddArticleForm(false)} className="text-xs text-[#2a5885] hover:underline font-medium cursor-pointer">Закрыть форму</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-1">
                   <label className="text-[11.5px] text-vk-text-secondary ml-1 font-bold">Название регламента</label>
                   <input 
                     type="text"
                     placeholder="Например: Инструкция по работе с жалобами"
                     value={newWikiArticle.title}
                     onChange={(e) => setNewWikiArticle({ ...newWikiArticle, title: e.target.value })}
                     className="w-full bg-white border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-[#5181b8]"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[11.5px] text-vk-text-secondary ml-1 font-semibold">Раздел базы знаний</label>
                   <select 
                     value={newWikiArticle.cat}
                     onChange={(e) => setNewWikiArticle({ ...newWikiArticle, cat: e.target.value })}
                     className="w-full bg-white border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-[#5181b8]"
                   >
                     {categories.filter(c => c !== 'Все').map(cat => (
                       <option key={cat} value={cat}>{cat}</option>
                     ))}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[11.5px] text-vk-text-secondary ml-1 font-semibold">Количество страниц</label>
                   <input 
                     type="number"
                     min={1}
                     value={newWikiArticle.pageCount}
                     onChange={(e) => setNewWikiArticle({ ...newWikiArticle, pageCount: parseInt(e.target.value) || 1 })}
                     className="w-full bg-white border border-[#dce1e6] rounded-[4px] px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-[#5181b8]"
                   />
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[11.5px] text-vk-text-secondary ml-1 font-semibold">Содержание статьи</label>
                 <textarea 
                   placeholder="Опишите подробно все пункты и регламенты..."
                   value={newWikiArticle.content}
                   onChange={(e) => setNewWikiArticle({ ...newWikiArticle, content: e.target.value })}
                   className="w-full h-36 bg-white border border-[#dce1e6] rounded-[4px] p-3 text-[12.5px] focus:outline-none focus:border-[#5181b8] resize-none"
                 />
               </div>
               <button 
                 onClick={handleCreateArticle}
                 className="px-5 py-2 bg-[#4bb34b] hover:bg-[#52c152] text-white rounded-[4px] text-[12.5px] font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
               >
                 Опубликовать статью <ArrowUpRight size={14} />
               </button>
             </motion.div>
           )}

        </div>


           {wikiSubTab === 'articles' && (
             <div className="p-6 space-y-3">
               {filteredArticles.map((item) => (
                 <div 
                   key={item.id} 
                   onClick={() => setSelectedWikiArticle(item)}
                   className="p-4 border border-vk-separator rounded-[4px] bg-white hover:border-[#5181b8]/40 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-6 group w-full"
                 >
                   <div className="flex items-center gap-4 min-w-0">
                     <div className="w-10 h-10 rounded-full bg-[#5181b8]/5 flex items-center justify-center text-[#5181b8] shrink-0">
                       <FileText size={18} />
                     </div>
                     <div className="min-w-0">
                       <div className="flex items-center gap-2 mb-0.5">
                         <span className="bg-[#5181b8]/15 text-[#2a5885] text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-[2px]">{item.cat}</span>
                         <span className="text-[11px] text-vk-text-secondary">• {item.count || 1} стр.</span>
                       </div>
                       <h3 className="text-[14.5px] font-semibold text-[#2a5885] group-hover:underline truncate">{item.title}</h3>
                       <p className="text-[12px] text-vk-text-secondary line-clamp-1 mt-0.5">{item.content}</p>
                     </div>
                   </div>
                   <div className="shrink-0 flex items-center gap-1.5 text-[12px] text-[#2a5885] font-semibold">
                     <span>Читать</span>
                     <ArrowUpRight size={13} className="transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                   </div>
                 </div>
               ))}
               {filteredArticles.length === 0 && (
                 <div className="py-24 text-center bg-white border border-vk-separator rounded-[6px]">
                   <div className="w-16 h-16 bg-[#f0f2f5] rounded-full flex items-center justify-center mx-auto mb-4 text-[#dce1e6]">
                     <FileSearch size={32} />
                   </div>
                   <h4 className="text-[16px] font-medium text-[#2a5885]">Ничего не найдено</h4>
                   <p className="text-[13px] text-vk-text-secondary mt-1">Отредактируйте параметры поиска или выберите другую категорию в базе знаний.</p>
                 </div>
               )}
             </div>
           )}
      </div>
    </motion.div>
  );
};
