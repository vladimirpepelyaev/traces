import React, { useState } from 'react';
import { 
  Globe, PenLine, Bell, Layout, Sparkles, HelpCircle, 
  Check, Play, AlertCircle, Trash2, Shield, Settings, LogOut, FileText, BadgeCheck 
} from 'lucide-react';

interface TranslationsProps {
  translations: { [key: string]: string };
  setTranslations: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  addNotification: (title: string, message: string) => void;
}

export const Translations: React.FC<TranslationsProps> = ({
  translations,
  setTranslations,
  addNotification,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'buttons' | 'notifications' | 'modals'>('buttons');
  const [editingItem, setEditingItem] = useState<{
    key: string;
    label: string;
    description: string;
    value: string;
  } | null>(null);

  const translationRegistry = {
    buttons: [
      { key: 'btn_submit_support', label: 'Подать обращение', description: 'Кнопка отправки формы создания нового тикета в поддержку', defaultVal: 'Отправить вопрос' },
      { key: 'btn_logout', label: 'Кнопка «Выйти»', description: 'Элемент выхода в боковом меню и выпадающем меню профиля', defaultVal: 'Выйти' },
      { key: 'btn_save_settings', label: 'Сохранить изменения', description: 'Синяя кнопка сохранения отредактированных настроек в админ-панели', defaultVal: 'Сохранить изменения' },
      { key: 'btn_place_hotspot', label: 'Разместить кнопку', description: 'Нижняя зеленая кнопка выгрузки точки быстрого обращения в прод', defaultVal: 'Сохранить в Прод' },
      { key: 'btn_verify', label: 'Подать заявку', description: 'Кнопка отправки анкеты верификации личности на рассмотрение', defaultVal: 'Подать заявку' },
      { key: 'btn_moderation_delete', label: 'Удалить контент', description: 'Действие в модераторском кабинете: удаление запрещенных постов', defaultVal: 'Удалить контент' },
      { key: 'btn_moderation_block', label: 'Забанить автора', description: 'Действие оператора: немедленная блокировка нарушителя правил', defaultVal: 'Забанить автора' },
      { key: 'btn_moderation_ignore', label: 'Отклонить жалобу', description: 'Действие в модерации: оправдание поста и сохранение в ленте', defaultVal: 'Отклонить жалобу' },
      { key: 'btn_add_rule', label: 'Добавить правило', description: 'Кнопка запуска нового правила автоматического модерирования (робота)', defaultVal: 'Добавить правило' },
    ],
    notifications: [
      { key: 'notif_success_title', label: 'Заголовок: Успех', description: 'Зеленый статус успешного выполнения команды или сохранения', defaultVal: 'Успешно' },
      { key: 'notif_error_title', label: 'Заголовок: Ошибка', description: 'Красный статус оповещения о неверных данных или отказе', defaultVal: 'Ошибка' },
      { key: 'notif_delete_title', label: 'Заголовок: Удаление', description: 'Информационный статус при полном удалении элементов на сайте', defaultVal: 'Удалено' },
      { key: 'notif_quick_request_title', label: 'Заголовок: Быстрый запрос', description: 'Тема тикета при клике по закрепленной быстрой кнопке сбоку', defaultVal: 'Быстрое обращение' },
      { key: 'notif_added_hotspot', label: 'Действие: Кнопка создана', description: 'Сообщение, подтверждающее установку новой быстрой кнопки', defaultVal: 'Кнопка успешно размещена у пользователей!' },
      { key: 'notif_copied_api', label: 'Лог: Токен скопирован', description: 'Всплывающий статус копирования системных токенов модераторами', defaultVal: 'Токен скопирован в буфер обмена' },
    ],
    modals: [
      { key: 'modal_verification_title', label: 'Окно: Верификация', description: 'Главный заголовок модального окна просмотра анкеты верификации', defaultVal: 'Новая заявка на верификацию' },
      { key: 'modal_complaint_title', label: 'Окно: Обработка жалобы', description: 'Замыкающий заголовок формы апелляций и споров о действиях модератора', defaultVal: 'Жалоба на модератора / апелляция' },
      { key: 'modal_appeal_title', label: 'Окно: Блокировка и Апелляция', description: 'Окно отправки запроса заблокированным пользователем', defaultVal: 'Апелляция на блокировку' },
      { key: 'modal_constructor_title', label: 'Окно: Конструктор кнопок', description: 'Заголовок управления быстрыми ссылками онлайн-помощи', defaultVal: 'Конструктор кнопок быстрого доступа' },
      { key: 'modal_profile_details', label: 'Окно: Информация о сотруднике', description: 'Окно детальной инспекции модератора старшим персоналом', defaultVal: 'Профиль сотрудника' },
      { key: 'modal_add_user', label: 'Окно: Нанять специалиста', description: 'Окно ручного найма нового оператора/администратора в команду', defaultVal: 'Добавить пользователя в команду' },
      { key: 'modal_edit_post', label: 'Окно: Исправить публикацию', description: 'Заголовок редактора постов для исправления текста пользователем', defaultVal: 'Редактировать публикацию' },
    ]
  };

  const currentItems = translationRegistry[activeSubTab];

  const handleEdit = (key: string, label: string, description: string) => {
    setEditingItem({
      key,
      label,
      description,
      value: translations[key] || ''
    });
  };

  const handleSave = () => {
    if (!editingItem) return;
    const { key, value } = editingItem;
    setTranslations(prev => ({
      ...prev,
      [key]: value
    }));
    addNotification('Перевод сохранен', `Параметр «${key}» изменен на «${value}»`);
    setEditingItem(null);
  };

  const handleTestToast = (titleKey: string, messageText: string) => {
    const titleVal = translations[titleKey] || 'Тест';
    addNotification(titleVal, messageText);
  };

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Шапка раздела */}
      <div className="bg-white border border-[#e7e8ec] rounded-[4px] p-5">
        <div className="flex items-center gap-2.5 mb-2 border-b border-[#f2f3f5] pb-3">
          <Globe size={22} className="text-[#5181b8] animate-pulse" />
          <div>
            <h2 className="text-[16px] font-bold text-[#2a5885]">Управление переводами и локализацией</h2>
            <p className="text-[11.5px] text-[#818c99] leading-tight mt-0.5">
              Интерактивная панель кастомизации всех текстов приложения. Выберите любой элемент, чтобы перевести его и сразу увидеть изменения в прод-режиме
            </p>
          </div>
        </div>

        {/* Статистика переводов */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="bg-[#f0f2f5] p-3 rounded-[4px] border border-[#e2e4e8]">
            <div className="text-[10px] text-[#818c99] uppercase font-bold tracking-wider">Всего параметров</div>
            <div className="text-[19px] font-bold text-[#2a5885]">
              {translationRegistry.buttons.length + translationRegistry.notifications.length + translationRegistry.modals.length}
            </div>
          </div>
          <div className="bg-[#f0f2f5] p-3 rounded-[4px] border border-[#e2e4e8]">
            <div className="text-[10px] text-[#818c99] uppercase font-bold tracking-wider">Изменено переводов</div>
            <div className="text-[19px] font-bold text-[#4bb34b]">
              {Object.keys(translations).length}
            </div>
          </div>
          <div className="bg-[#f0f2f5] p-3 rounded-[4px] border border-[#e2e4e8]">
            <div className="text-[10px] text-[#818c99] uppercase font-bold tracking-wider">Статус локализации</div>
            <div className="text-[19px] font-bold text-amber-500">100% RU-LIVE</div>
          </div>
        </div>
      </div>

      {/* Переключатель вкладок (Кнопки / Уведомления / Модалки / Окна) */}
      <div className="border-b border-[#e7e8ec] bg-[#fafbfc] flex items-center justify-between pr-4 flex-wrap rounded-t-[4px] border border-b-0">
        <div className="flex overflow-x-auto no-scrollbar px-2">
          {[
            { id: 'buttons', label: '🖱️ Текст кнопок', count: translationRegistry.buttons.length },
            { id: 'notifications', label: '🔔 Всплывающие уведомления', count: translationRegistry.notifications.length },
            { id: 'modals', label: '🖼️ Окна и модальные окна', count: translationRegistry.modals.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-3 text-[13px] font-semibold transition-all whitespace-nowrap cursor-pointer relative ${
                activeSubTab === tab.id 
                  ? 'text-[#2a5885] border-b-2 border-[#5181b8]' 
                  : 'text-[#656565] hover:bg-[#e1e5eb]/30'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeSubTab === tab.id ? 'bg-[#5181b8] text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Основной контент */}
      <div className="bg-white border border-[#e7e8ec] rounded-b-[4px] p-5">
        
        {/* КНОПКИ */}
        {activeSubTab === 'buttons' && (
          <div className="space-y-4">
            <h3 className="text-[13px] font-bold text-[#2a5885] uppercase tracking-wider mb-2">
              Конструктор надписей на кнопках интерфейса
            </h3>
            <p className="text-[11.5px] text-[#818c99] leading-normal mb-4">
              Нажмите на любую кнопку-превью для мгновенного изменения ее текста. Текст сразу обновится на всех экранах приложения.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {translationRegistry.buttons.map((btn) => {
                const currentLabel = translations[btn.key] || btn.defaultVal;
                
                // Determine mock style for preview button
                let btnStyle = 'bg-[#5181b8] text-white hover:bg-[#5b88bd]';
                if (btn.key === 'btn_submit_support') btnStyle = 'bg-[#4bb34b] text-white hover:bg-[#52c152]';
                if (btn.key === 'btn_logout') btnStyle = 'bg-[#e5ebf1] text-[#e64646] hover:bg-[#dfe6ed]';
                if (btn.key === 'btn_place_hotspot') btnStyle = 'bg-[#4bb34b] text-white';
                if (btn.key === 'btn_moderation_delete') btnStyle = 'bg-[#e64646] text-white hover:bg-[#eb5a5a]';
                if (btn.key === 'btn_moderation_ignore') btnStyle = 'bg-[#e5ebf1] text-[#55677d] hover:bg-[#dfe6ed]';

                return (
                  <div 
                    key={btn.key}
                    onClick={() => handleEdit(btn.key, btn.label, btn.description)}
                    className="group border border-[#e7e8ec] p-4 rounded-[4px] flex flex-col justify-between hover:border-[#5181b8] hover:shadow-md transition-all cursor-pointer h-[130px] relative bg-[#fafbfc] hover:bg-white"
                  >
                    <div className="absolute top-3 right-3 text-gray-400 group-hover:text-[#5181b8] transition-colors">
                      <PenLine size={14} />
                    </div>

                    <div className="space-y-1 pr-6">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] text-[#2a5885] font-bold uppercase tracking-wide">
                          {btn.label}
                        </span>
                        <code className="text-[8.5px] bg-[#f0f2f5] px-1 rounded font-mono text-gray-400 select-none">
                          {btn.key}
                        </code>
                      </div>
                      <p className="text-[11px] text-[#818c99] leading-tight line-clamp-1">{btn.description}</p>
                    </div>

                    <div className="mt-3">
                      <button className={`px-4 py-1.5 rounded-[4px] text-[12px] font-bold transition-all shadow-sm flex items-center gap-1 ${btnStyle}`}>
                        {btn.key === 'btn_logout' && <LogOut size={12} className="mr-0.5" />}
                        <span>{currentLabel}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* УВЕДОМЛЕНИЯ */}
        {activeSubTab === 'notifications' && (
          <div className="space-y-4">
            <h3 className="text-[13px] font-bold text-[#2a5885] uppercase tracking-wider mb-2">
              Локализация всплывающих уведомлений (Toasts)
            </h3>
            <p className="text-[11.5px] text-[#818c99] leading-normal mb-4">
              Эти сообщения выводятся в левом нижнем углу экрана при выполнении действий. Вы можете не просто поменять текст, но и нажать кнопку «Запустить тест» для немедленной проверки анимации у себя на экране!
            </p>

            <div className="space-y-3.5">
              {translationRegistry.notifications.map((notif) => {
                const currentLabel = translations[notif.key] || notif.defaultVal;
                
                // Color bar indicator representing type
                let typeColor = 'bg-[#4bb34b]'; // success / added
                if (notif.key.includes('error')) typeColor = 'bg-[#e64646]';
                if (notif.key.includes('delete')) typeColor = 'bg-[#939393]';
                if (notif.key.includes('copied')) typeColor = 'bg-[#5181b8]';

                return (
                  <div 
                    key={notif.key}
                    className="border border-[#e7e8ec] rounded-[4px] p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#fafbfc] hover:border-[#5181b8] transition-all"
                  >
                    {/* Visual Toast Card Preview Replica */}
                    <div 
                      onClick={() => handleEdit(notif.key, notif.label, notif.description)}
                      className="bg-[#2c2d2e] p-3 shadow-xl min-w-[280px] max-w-[280px] rounded-[2px] border border-white/5 relative cursor-pointer hover:scale-[1.02] active:scale-95 transition-all text-left group"
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#5181b8]">
                        <PenLine size={12} />
                      </div>
                      <div className="text-white font-bold text-[12px] flex items-center gap-1.5 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${typeColor}`} />
                        <span>{currentLabel}</span>
                      </div>
                      <div className="text-[#a0a0a0] text-[10px] leading-tight select-none">
                        Тестовое описание системного события...
                      </div>
                    </div>

                    {/* Metadata & Test Controls */}
                    <div className="grow md:px-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-vk-text">{notif.label}</span>
                        <code className="text-[9px] bg-gray-200 px-1 rounded font-mono text-gray-500">{notif.key}</code>
                      </div>
                      <p className="text-[11px] text-[#818c99] mt-0.5 leading-tight">{notif.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestToast(notif.key, 'Это демонстрационное уведомление с новым переводом!')}
                      className="px-3 py-1.5 border border-[#5181b8] text-[#2a5885] hover:bg-[#5181b8]/10 rounded-[4px] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm mt-1 shrink-0"
                    >
                      <Play size={10} className="fill-current" />
                      <span>Запустить тест</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ОКНА И МОДАЛКИ */}
        {activeSubTab === 'modals' && (
          <div className="space-y-5">
            <h3 className="text-[13px] font-bold text-[#2a5885] uppercase tracking-wider">
              Интерактивный чертеж-симулятор всплывающих окон
            </h3>
            <p className="text-[11.5px] text-[#818c99] leading-normal">
              Ниже представлены макеты основных окон администрирования. Прямо в макетах заголовки окон подсвечены <span className="text-[#5181b8] font-bold">синей пунктирной рамкой</span> — кликайте по ним для немедленного редактирования текстов верхнего уровня.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Макет №1: Заявка на верификацию */}
              <div className="bg-[#f0f2f5] p-5 rounded-[6px] border border-dashed border-[#ccd4db] text-left relative flex flex-col justify-between">
                <div className="absolute top-3 right-3 text-[9px] bg-[#5181b8] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider select-none">
                  Форма верификации
                </div>

                {/* Simulated window body */}
                <div className="bg-white border border-[#e7e8ec] rounded-[4px] shadow-lg p-4 space-y-3.5 mt-2">
                  {/* Dynamic interactive header */}
                  <div 
                    onClick={() => handleEdit('modal_verification_title', 'Заголовок у верификации', 'Задается в окне проверки данных паспорта у персонала')}
                    className="border-2 border-dashed border-[#5181b8]/50 hover:border-[#5181b8] p-1.5 rounded bg-[#5181b8]/10 hover:bg-[#5181b8]/20 transition-all cursor-pointer"
                    title="Кликните для редактирования этого заголовка"
                  >
                    <div className="flex items-center justify-between text-[#2a5885] font-bold text-[12.5px]">
                      <span>{translations.modal_verification_title || 'Новая заявка на верификацию'}</span>
                      <PenLine size={11} className="text-[#5181b8] animate-pulse" />
                    </div>
                  </div>

                  {/* Dummy text layout */}
                  <div className="space-y-2 text-[11px] text-[#656565]">
                    <div className="bg-gray-100 p-2 rounded text-[10.5px]">
                      <div><strong>Заявитель:</strong> Маргарита Князева (ID: 902)</div>
                      <div className="text-[9.5px] text-gray-400">Роль: Оператор техподдержки</div>
                    </div>
                    <div className="h-6 bg-slate-50 border border-[#e7e8ec] rounded flex items-center px-2 text-[9.5px]">Причина: "Не заходит по ключу-токену доступа"</div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-1 border-t border-[#f2f3f5]">
                    <span className="text-[10px] bg-green-500 text-white rounded px-2.5 py-1 font-bold">Одобрить</span>
                    <span className="text-[10px] bg-red-500 text-white rounded px-2.5 py-1 font-bold">Отклонить</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#818c99] italic mt-2 text-center">
                  Параметр: <code className="font-mono text-[9px] text-[#2a5885] font-bold">modal_verification_title</code>
                </div>
              </div>

              {/* Макет №2: Апелляция на блокировку */}
              <div className="bg-[#f0f2f5] p-5 rounded-[6px] border border-dashed border-[#ccd4db] text-left relative flex flex-col justify-between">
                <div className="absolute top-3 right-3 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider select-none">
                  Форма апелляции
                </div>

                {/* Simulated window body */}
                <div className="bg-white border border-[#e7e8ec] rounded-[4px] shadow-lg p-4 space-y-3.5 mt-2">
                  {/* Dynamic interactive header */}
                  <div 
                    onClick={() => handleEdit('modal_appeal_title', 'Заголовок у апелляций', 'Шапка анкеты разжалования для заблокированных')}
                    className="border-2 border-dashed border-[#5181b8]/50 hover:border-[#5181b8] p-1.5 rounded bg-[#5181b8]/10 hover:bg-[#5181b8]/20 transition-all cursor-pointer"
                    title="Кликните для редактирования этого заголовка"
                  >
                    <div className="flex items-center justify-between text-[#2a5885] font-bold text-[12.5px]">
                      <span>{translations.modal_appeal_title || 'Апелляция на блокировку'}</span>
                      <PenLine size={11} className="text-[#5181b8] animate-pulse" />
                    </div>
                  </div>

                  {/* Dummy text layout */}
                  <div className="space-y-2 text-[11px] text-[#656565]">
                    <div className="h-6 bg-amber-50 border border-amber-200 rounded flex items-center px-2 text-[10px] text-amber-800">
                      Статус рассмотрения: На усмотрении Старшего
                    </div>
                    <div className="text-[10px] text-gray-400">"Прошу разблокировать аккаунт, осознал вину..."</div>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-[#f2f3f5] text-[10px] font-bold">
                    <span className="text-[#2a5885] bg-[#5181b8]/10 px-2.5 py-1 rounded">Принять апелляцию</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#818c99] italic mt-2 text-center">
                  Параметр: <code className="font-mono text-[9px] text-[#2a5885] font-bold">modal_appeal_title</code>
                </div>
              </div>

              {/* Макет №3: Конструктор быстрой помощи */}
              <div className="bg-[#f0f2f5] p-5 rounded-[6px] border border-dashed border-[#ccd4db] text-left relative flex flex-col justify-between">
                <div className="absolute top-3 right-3 text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider select-none">
                  Конструктор быстрой помощи
                </div>

                {/* Simulated window body */}
                <div className="bg-white border border-[#e7e8ec] rounded-[4px] shadow-lg p-4 space-y-3.5 mt-2">
                  {/* Dynamic interactive header */}
                  <div 
                    onClick={() => handleEdit('modal_constructor_title', 'Заголовок у конструктора', 'Верхняя надпись внутри создателя точек быстрого входа во вкладке Управление')}
                    className="border-2 border-dashed border-[#5181b8]/50 hover:border-[#5181b8] p-1.5 rounded bg-[#5181b8]/10 hover:bg-[#5181b8]/20 transition-all cursor-pointer"
                    title="Кликните для редактирования этого заголовка"
                  >
                    <div className="flex items-center justify-between text-[#2a5885] font-bold text-[12.5px]">
                      <span>{translations.modal_constructor_title || 'Конструктор кнопок быстрого доступа'}</span>
                      <PenLine size={11} className="text-[#5181b8] animate-pulse" />
                    </div>
                  </div>

                  {/* Dummy text layout */}
                  <div className="space-y-1.5 text-[10px] text-gray-500">
                    <div className="w-full h-2 bg-gray-200 rounded shrink-0" />
                    <div className="w-4/5 h-2 bg-gray-200 rounded shrink-0" />
                  </div>
                </div>
                <div className="text-[10px] text-[#818c99] italic mt-2 text-center">
                  Параметр: <code className="font-mono text-[9px] text-[#2a5885] font-bold">modal_constructor_title</code>
                </div>
              </div>

              {/* Макет №4: Профиль сотрудника */}
              <div className="bg-[#f0f2f5] p-5 rounded-[6px] border border-dashed border-[#ccd4db] text-left relative flex flex-col justify-between">
                <div className="absolute top-3 right-3 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider select-none">
                  Карточка оператора
                </div>

                {/* Simulated window body */}
                <div className="bg-white border border-[#e7e8ec] rounded-[4px] shadow-lg p-4 space-y-3.5 mt-2">
                  {/* Dynamic interactive header */}
                  <div 
                    onClick={() => handleEdit('modal_profile_details', 'Карточка сотрудника', 'Задается при детальном рассмотрении модераторского стажа коллеги')}
                    className="border-2 border-dashed border-[#5181b8]/50 hover:border-[#5181b8] p-1.5 rounded bg-[#5181b8]/10 hover:bg-[#5181b8]/20 transition-all cursor-pointer"
                    title="Кликните для редактирования этого заголовка"
                  >
                    <div className="flex items-center justify-between text-[#2a5885] font-bold text-[12.5px]">
                      <span>{translations.modal_profile_details || 'Профиль сотрудника'}</span>
                      <PenLine size={11} className="text-[#5181b8] animate-pulse" />
                    </div>
                  </div>

                  {/* Dummy text layout */}
                  <div className="flex gap-2 items-center">
                    <div className="w-7 h-7 bg-gray-300 rounded-full shrink-0" />
                    <div className="space-y-1 grow">
                      <div className="text-[11px] font-bold text-black leading-none">Константин Ант</div>
                      <div className="text-[9.5px] text-[#818c99] leading-none">Стаж: 3 года</div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-[#818c99] italic mt-2 text-center">
                  Параметр: <code className="font-mono text-[9px] text-[#2a5885] font-bold">modal_profile_details</code>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ ТЕКСТА ПЕРЕВОДА */}
      {editingItem && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4 transition-all">
          <div className="bg-white rounded-[6px] border border-[#dce1e6] shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.15s_ease-out]">
            {/* Header */}
            <div className="bg-[#f0f2f5] px-5 py-4 border-b border-[#e7e8ec] flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-[#2a5885] text-[13.5px]">
                <PenLine size={15} />
                <span>Редактировать надпись</span>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-[#818c99] hover:text-black font-semibold text-[14px]"
              >
                ✕
              </button>
            </div>

            {/* Inputs Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[#818c99] uppercase tracking-wider block mb-1">
                  Системный ключ (ID)
                </label>
                <div className="bg-slate-50 border border-[#e7e8ec] px-3 py-1.5 rounded-[4px] font-mono text-[11px] text-[#2a5885] break-all select-all font-semibold">
                  {editingItem.key}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#818c99] uppercase tracking-wider block mb-1">
                  Описание назначения / области применения
                </label>
                <p className="text-[11.5px] text-vk-text leading-tight bg-[#fcfcfd] border border-dashed border-gray-200 p-2 rounded text-slate-600">
                  {editingItem.description}
                </p>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-[#818c99] uppercase tracking-wider block mb-1">
                  Надпись (Текущий перевод)
                </label>
                <textarea
                  rows={2}
                  className="w-full bg-[#f2f3f5] hover:bg-[#ebf0f5] focus:bg-white px-3 py-2 rounded-[4px] border border-transparent focus:border-[#5181b8] text-[13px] outline-none transition-all font-medium leading-normal block resize-none"
                  value={editingItem.value}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, value: e.target.value } : null)}
                  placeholder="Задайте надпись..."
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-[#f0f2f5] px-5 py-3 border-t border-[#e7e8ec] flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="bg-white hover:bg-gray-50 text-[#55677d] border border-[#e7e8ec] px-4 py-2 rounded-[4px] text-[12px] font-semibold transition-all cursor-pointer shadow-sm"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="bg-[#5181b8] hover:bg-[#5b88bd] text-white px-4 py-2 rounded-[4px] text-[12px] font-bold transition-all cursor-pointer shadow-sm"
              >
                Сохранить перевод
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
