import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  UserPlus, 
  UserCheck, 
  ArrowRight,
  MessageSquare,
  HelpCircle,
  Hash,
  Lightbulb,
  FileSearch,
  BookOpen,
  Compass,
  Footprints
} from 'lucide-react';
import { AppUser, FeedPost } from '../types';

export const ONBOARDING_TOPICS = [
  'Технологии',
  'ИИ',
  'Бизнес',
  'Психология',
  'Наука',
  'Дизайн',
  'Культура',
  'История',
  'Философия',
  'Маркетинг'
];

export function getUserTopic(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ONBOARDING_TOPICS[hash % ONBOARDING_TOPICS.length];
}

export function getPostTopic(postId: string): string {
  const hash = postId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ONBOARDING_TOPICS[hash % ONBOARDING_TOPICS.length];
}

interface OnboardingProps {
  currentUser: AppUser | null;
  users: AppUser[];
  feedPosts: FeedPost[];
  mySubscriptions: string[];
  setMySubscriptions: React.Dispatch<React.SetStateAction<string[]>>;
  mySubscribedDiscussions: string[];
  setMySubscribedDiscussions: React.Dispatch<React.SetStateAction<string[]>>;
  onComplete: (selectedInterests: string[], openComposer?: boolean) => void;
  addNotification: (title: string, message: string) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({
  currentUser,
  users,
  feedPosts,
  mySubscriptions,
  setMySubscriptions,
  mySubscribedDiscussions,
  setMySubscribedDiscussions,
  onComplete,
  addNotification
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  // Highlighting or active states for mock representations
  const [activeScreen1Trace, setActiveScreen1Trace] = useState<number>(0);
  const [activeScreen2Card, setActiveScreen2Card] = useState<number>(0);
  const [votedConcept, setVotedConcept] = useState<'up' | 'down' | null>(null);

  // Cycle traces on Screen 1 automatically
  useEffect(() => {
    if (step === 1) {
      const interval = setInterval(() => {
        setActiveScreen1Trace(prev => (prev + 1) % 4);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Cycle cards on Screen 2 automatically
  useEffect(() => {
    if (step === 2) {
      const interval = setInterval(() => {
        setActiveScreen2Card(prev => (prev + 1) % 5);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleToggleInterest = (topic: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(topic)) {
        return prev.filter(t => t !== topic);
      } else {
        return [...prev, topic];
      }
    });
  };

  const handleToggleSubscribeAuthor = (userId: string, userName: string) => {
    const isSubscribed = mySubscriptions.includes(userId);
    if (isSubscribed) {
      setMySubscriptions(prev => prev.filter(id => id !== userId));
      addNotification('Подписка', `Вы отменили подписку на автора ${userName}`);
    } else {
      setMySubscriptions(prev => [...prev, userId]);
      addNotification('Подписка', `Вы подписались на автора ${userName}`);
    }
  };

  // Extract author list from users
  const recommendedAuthors = useMemo(() => {
    const validUsers = users.filter(u => u.id !== currentUser?.id && !u.isBlocked && !u.isDeleted);
    // Sort primarily by active trust but keep it private
    const sorted = [...validUsers].sort((a, b) => (b.trustLevel || 0.8) - (a.trustLevel || 0.8));
    return sorted.slice(0, 6);
  }, [users, currentUser]);

  // Dynamic humanized descriptions for author recommendations
  const getAuthorDescription = (authorId: string, authorName: string): string => {
    const idx = authorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 4;
    const bios = [
      'Публикует исследования о будущем искусственного интеллекта и этике систем.',
      'Делится практическими решениями для продуктов, маркетинга и развития команд.',
      'Задает глубокие вопросы о философии разума, психологии и поведении людей.',
      'Формулирует наблюдения об эволюции цифровых культур, культуры медиа и дизайна.'
    ];
    return bios[idx];
  };

  const isStep4Valid = selectedInterests.length >= 1;

  const handleNextStep = () => {
    if (step === 5) {
      // Step 5 completes setting up authors, moves to final screen
      setStep(6);
    } else if (step === 6) {
      // Done - go to feed
      onComplete(selectedInterests);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleCompleteWithComposer = () => {
    onComplete(selectedInterests, true);
  };

  // Mock structures for interactive screens
  const screen1Traces = [
    { title: 'Почему люди стали меньше читать?', category: 'вопрос', author: 'Алексей К.' },
    { title: 'Наблюдение про удалённую работу в распределенной команде', category: 'наблюдение', author: 'Мария П.' },
    { title: 'Глубокий разбор новой мультимодальной модели ИИ', category: 'исследование', author: 'Константин В.' },
    { title: 'Как я решил проблему выгорания инженеров поддержки', category: 'решение', author: 'Елена С.' }
  ];

  const screen2Cards = [
    { type: 'Вопрос', desc: 'Запрос на поиск истины или коллективного разума.', color: 'from-[#4158D0] to-[#C850C0]' },
    { type: 'Мнение', desc: 'Уникальная точка зрения, открытая для аргументации.', color: 'from-[#FFCC70] to-[#C850C0]' },
    { type: 'Разбор', desc: 'Структурированный анализ явлений на мелкие детали.', color: 'from-[#00DBDE] to-[#FC00FF]' },
    { type: 'Исследование', desc: 'Сбор доказательств, академический или полевой анализ.', color: 'from-[#FA8BFF] to-[#2BD2FF]' },
    { type: 'Решение', desc: 'Конкретный выход из проблемы с доказанной пользой.', color: 'from-[#85FFBD] to-[#FFFB7D]' }
  ];

  return (
    <div className="fixed inset-0 bg-[#fafafa] z-[999] overflow-y-auto flex items-center justify-center p-4 sm:p-6" id="onboarding-screen">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />
      
      <div className="relative w-full max-w-2xl bg-white border border-[#e1e1e3] shadow-[0_12px_40px_rgba(0,0,0,0.04)] rounded-3xl overflow-hidden flex flex-col text-zinc-950 font-sans min-h-[580px] max-h-[90vh]">
        
        {/* Modern minimal header */}
        <div className="px-8 py-3 w-full border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center select-none">
            <span className="text-zinc-950 font-bold text-[14.5px] tracking-tight flex items-center gap-2">
              <Footprints size={15} strokeWidth={2.4} className="text-zinc-950 transform -rotate-12" />
              <span>Следы</span>
            </span>
          </div>
          {step <= 5 && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 font-medium select-none">
              <span>{step}</span>
              <span className="opacity-30">/</span>
              <span>5</span>
            </div>
          )}
        </div>

        {/* Core content view representing steps */}
        <div className="px-8 py-8 md:px-12 grow overflow-y-auto flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="space-y-6 flex-1 flex flex-col justify-center"
            >
              
              {/* SCREEN 1: Это мы (Concept & Live Mind Map) */}
              {step === 1 && (
                <div className="space-y-6 flex-1 flex flex-col justify-between py-2">
                  <div className="space-y-3.5 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f4f5] border border-zinc-200 text-zinc-650 text-[10.5px] font-bold self-center sm:self-start leading-none tracking-wide select-none">
                      <Sparkles size={11} className="text-zinc-600" />
                      <span>Платформа качественных обсуждений</span>
                    </div>
                    <h2 className="text-3xl sm:text-[42px] lg:text-[50px] font-black text-zinc-950 tracking-tight leading-[1.06] sm:leading-[1.06]">
                      Следы, которые оставляют мысли.
                    </h2>
                    <p className="text-[14px] text-zinc-500 max-w-xl leading-relaxed font-medium">
                      Следы помогают сохранять наблюдения, вопросы, идеи и выводы — чтобы другие люди могли их найти, продолжить или переосмыслить.
                    </p>
                  </div>

                  {/* Connected Mind Map Animation - Subdued as subtle background accompaniment */}
                  <div className="bg-zinc-50/40 border border-dashed border-zinc-200/80 rounded-2xl p-4 relative h-[140px] flex flex-col justify-center gap-1.5 overflow-hidden shadow-none grow my-2 opacity-75">
                    
                    {/* SVG Connections Map */}
                    <div className="absolute inset-0 pointer-events-none opacity-40">
                      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <motion.path 
                          d="M 120,30 Q 200,60 180,95" 
                          stroke="#d4d4d8" 
                          strokeWidth="1" 
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.5, delay: 0.5 }}
                        />
                        <motion.path 
                          d="M 320,35 Q 260,65 280,105" 
                          stroke="#d4d4d8" 
                          strokeWidth="1" 
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1.2, delay: 1 }}
                        />
                      </svg>
                    </div>

                    <div className="space-y-1.5 relative z-10 w-full max-w-md mx-auto">
                      {screen1Traces.map((tr, idx) => {
                        const isActive = activeScreen1Trace === idx;
                        return (
                          <motion.div
                            key={idx}
                            animate={{ 
                              scale: isActive ? 1 : 0.97, 
                              opacity: isActive ? 0.9 : 0.35 
                            }}
                            transition={{ type: "spring", damping: 20 }}
                            className={`p-2 px-3 rounded-lg border flex items-center justify-between gap-3 text-left transition-all duration-300 ${
                              isActive 
                                ? 'bg-white border-zinc-250 shadow-[0_2px_8px_rgba(0,0,0,0.02)]' 
                                : 'bg-transparent border-transparent'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-[8.5px] uppercase tracking-wider font-mono font-bold text-zinc-400 bg-zinc-100 px-1 rounded leading-none">
                                {tr.category}
                              </span>
                              <p className="text-[11.5px] font-semibold text-zinc-850 mt-0.5 truncate">
                                {tr.title}
                              </p>
                            </div>
                            <span className="shrink-0 text-[9.5px] text-zinc-450 font-mono">
                              {tr.author}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 2: Что такое След? (Thread evolution animation) */}
              {step === 2 && (
                <div className="space-y-6 flex-1 flex flex-col justify-between py-2">
                  <div className="space-y-3.5 text-center sm:text-left">
                    <h2 className="text-3xl sm:text-[42px] lg:text-[48px] font-black text-zinc-950 tracking-tight leading-[1.06] sm:leading-[1.06]">
                      Одна мысль может стать началом большого обсуждения.
                    </h2>
                    <p className="text-[14px] text-zinc-500 max-w-xl leading-relaxed font-medium">
                      След — это не лонгрид. Иногда достаточно одного предложения, чтобы запустить рассуждение.
                    </p>
                  </div>

                  {/* Horizontal Category Chips */}
                  <div className="grid grid-cols-5 gap-2 my-1 shrink-0">
                    {screen2Cards.map((card, i) => {
                      const isActive = activeScreen2Card === i;
                      return (
                        <div 
                          key={i} 
                          onClick={() => setActiveScreen2Card(i)}
                          className={`p-1.5 py-2 rounded-lg border text-center cursor-pointer transition-all duration-200 ${
                            isActive 
                              ? 'bg-zinc-950 border-zinc-950 text-white shadow-xs' 
                              : 'bg-zinc-100/70 hover:bg-zinc-100 border-transparent text-zinc-650'
                          }`}
                        >
                          <span className="text-[10px] font-bold block">{card.type}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Thread Animation Panel - Subdued style */}
                  <div className="bg-zinc-50/40 border border-dashed border-zinc-200/80 rounded-2xl p-4 relative h-[140px] flex flex-col justify-center items-center overflow-hidden grow shadow-none opacity-85">
                    <div className="w-full max-w-md space-y-2">
                      {/* Original Trace Parent */}
                      <motion.div 
                        layout 
                        className="p-2.5 bg-white border border-zinc-200/80 rounded-lg shadow-none relative z-20 text-left text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[8px] font-mono uppercase bg-zinc-100 px-1 py-0.5 rounded text-zinc-500 font-bold">
                            {screen2Cards[activeScreen2Card].type}
                          </span>
                        </div>
                        <p className="font-semibold text-zinc-800 leading-tight">
                          {screen2Cards[activeScreen2Card].desc}
                        </p>
                      </motion.div>

                      {/* Expanding branching path indicator */}
                      <div className="relative pl-5 border-l border-zinc-200 space-y-1 text-left ml-3 opacity-90">
                        <motion.div 
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={`reply-1-${activeScreen2Card}`}
                          transition={{ delay: 0.15 }}
                          className="p-1.5 px-2 bg-white/70 border border-zinc-150 rounded-md text-[10px] text-zinc-500 leading-normal"
                        >
                          <span className="font-bold text-zinc-700">Александр Б.</span>
                          Отличный вывод. Давайте разберем его детальнее.
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 3: Как это работает (▲ and ▼ mechanic explanation) */}
              {step === 3 && (
                <div className="space-y-6 flex-1 flex flex-col justify-between py-2">
                  <div className="space-y-3.5 text-center sm:text-left">
                    <h2 className="text-3xl sm:text-[42px] lg:text-[48px] font-black text-zinc-950 tracking-tight leading-[1.06] sm:leading-[1.06]">
                      Помогайте находить полезные мысли.
                    </h2>
                    <p className="text-[14px] text-zinc-500 max-w-xl leading-relaxed font-medium">
                      Если след оказался полезным — поднимите его выше.
                    </p>
                  </div>

                  {/* Interactive Button Mechanics demo - Subdued Accompaniment */}
                  <div className="bg-zinc-50/40 border border-dashed border-zinc-200/80 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-none grow my-1 opacity-85">
                    <div className="w-full max-w-md p-3.5 rounded-xl bg-white border border-zinc-200 text-left">
                      <p className="text-[12px] font-semibold text-zinc-850 leading-relaxed mb-3">
                        «Каждый оставленный в системе след анализируется алгоритмами. Вы — главный ориентир точности.»
                      </p>
                      
                      <div className="flex items-center gap-3 border-t border-zinc-100 pt-2.5">
                        {/* Up button block */}
                        <div className="flex-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setVotedConcept(votedConcept === 'up' ? null : 'up')}
                            className={`p-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                              votedConcept === 'up' 
                                ? 'bg-zinc-900 border-zinc-900 text-white' 
                                : 'bg-zinc-100 hover:bg-zinc-200 border-transparent text-zinc-550'
                            }`}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <div className="min-w-0">
                            <span className="text-[10.5px] font-bold text-zinc-800 block">▲ Полезный след</span>
                          </div>
                        </div>

                        {/* Down button block */}
                        <div className="flex-1 flex items-center gap-2 border-l border-zinc-150 pl-3">
                          <button
                            type="button"
                            onClick={() => setVotedConcept(votedConcept === 'down' ? null : 'down')}
                            className={`p-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                              votedConcept === 'down' 
                                ? 'bg-zinc-900 border-zinc-900 text-white' 
                                : 'bg-zinc-100 hover:bg-zinc-200 border-transparent text-zinc-550'
                            }`}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <div className="min-w-0">
                            <span className="text-[10.5px] font-bold text-zinc-800 block">▼ Тематика неточна</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-center font-serif italic text-[11px] text-zinc-400 max-w-xs leading-none">
                      Пользователь помогает качеству платформы, а не оценивает людей.
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 4: Настройка интересов (Select topics) */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="text-center sm:text-left space-y-2">
                    <h2 className="text-3xl sm:text-[42px] lg:text-[48px] font-black text-zinc-950 tracking-tight leading-[1.06] sm:leading-[1.06]">Что вам действительно интересно?</h2>
                    <p className="text-[13px] text-zinc-500 font-medium mt-1">Выберите темы, которые близки — будем показывать их чаще.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                    {ONBOARDING_TOPICS.map((topic) => {
                      const isSelected = selectedInterests.includes(topic);
                      return (
                        <button
                          key={topic}
                          id={`topic-btn-${topic}`}
                          type="button"
                          onClick={() => handleToggleInterest(topic)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between h-[74px] transition-all relative cursor-pointer ${
                            isSelected 
                              ? 'bg-zinc-950 border-zinc-950 text-white shadow-xs' 
                              : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200/70 text-zinc-900'
                          }`}
                        >
                          <span className="text-[12.5px] font-bold">{topic}</span>
                          <div className="flex justify-between items-center w-full mt-auto">
                            <span className="text-[9.5px] text-zinc-400 leading-none">Категория</span>
                            {isSelected ? (
                              <div className="bg-white text-zinc-950 rounded-full p-0.5">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            ) : (
                              <div className="border border-zinc-300 text-zinc-500 rounded-full p-0.5">
                                <Plus size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-center pt-1 h-6">
                    {!isStep4Valid ? (
                      <p className="text-xs font-bold text-red-650 animate-pulse">
                        Выберите хотя бы одну интересующую тему для продолжения
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1.5 bg-emerald-50 border border-emerald-150 py-0.5 px-3 rounded-full max-w-fit mx-auto transition-all">
                        <Check size={10} strokeWidth={3} /> Готово к выбору авторов
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* SCREEN 5: Первые авторы (No internal rating scores visible) */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="text-center sm:text-left space-y-2">
                    <h2 className="text-3xl sm:text-[42px] lg:text-[48px] font-black text-zinc-950 tracking-tight leading-[1.06] sm:leading-[1.06]">Начните с лучших авторов</h2>
                    <p className="text-[13px] text-zinc-500 font-medium mt-1">Их следы «цепляют» и запускают качественную полемику.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1 select-text scrollbar-thin">
                    {recommendedAuthors.map((author) => {
                      const isSubscribed = mySubscriptions.includes(author.id);
                      const desc = getAuthorDescription(author.id, author.name);

                      return (
                        <div 
                          key={author.id}
                          className="bg-white rounded-xl border border-zinc-200/80 p-3 flex flex-col justify-between space-y-2 hover:border-zinc-350 transition-all"
                        >
                          <div className="flex items-start gap-2.5 text-left">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-100 shrink-0 flex items-center justify-center bg-zinc-50">
                              <img referrerPolicy="no-referrer" src={author.avatar || `https://avatar.iran.liara.run/public/${author.id}`} alt={author.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[12.5px] font-bold text-zinc-900 truncate leading-tight">{author.name}</h4>
                              <p className="text-[10.5px] text-zinc-400 mt-1 leading-snug font-normal text-left">
                                {desc}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleSubscribeAuthor(author.id, author.name)}
                            className={`w-full py-1 rounded-lg text-[11px] font-bold transition-all border ${
                              isSubscribed 
                                ? 'bg-zinc-100 border-transparent text-zinc-500 hover:bg-zinc-200' 
                                : 'bg-zinc-950 border-transparent text-white hover:bg-zinc-800'
                            }`}
                          >
                            {isSubscribed ? (
                              <span className="flex items-center justify-center gap-1.5"><UserCheck size={11} /> Подписка оформлена</span>
                            ) : (
                              <span className="flex items-center justify-center gap-1.5"><UserPlus size={11} /> Подписаться</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FINAL SCREEN (Success transition area) */}
              {step === 6 && (
                <div className="space-y-6 text-center py-4 my-auto">
                  <div className="inline-flex p-3.5 rounded-full bg-zinc-50 border border-zinc-100 text-zinc-950 mb-1 relative opacity-90">
                    <Sparkles size={36} className="animate-pulse text-zinc-800" />
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-zinc-950 rounded-full animate-ping" />
                  </div>
                  
                  <div className="space-y-2.5">
                    <h2 className="text-3xl sm:text-[42px] lg:text-[48px] font-black text-zinc-950 tracking-tight leading-[1.06] sm:leading-[1.06]">Теперь можно оставить свой первый след.</h2>
                    <p className="text-[13px] text-zinc-500 max-w-md mx-auto leading-relaxed font-medium">
                      Поделитесь тем, что хотите обсудить и собрать мнения единомышленников. Или сразу погрузитесь в чтение чужих следов.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleCompleteWithComposer}
                      className="w-full py-3 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-zinc-850 text-white transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      <span>Оставить первый след</span>
                      <ArrowRight size={13} />
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-all cursor-pointer border border-transparent"
                    >
                      Перейти в ленту
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Actions for Steps 1 through 5 */}
              {step <= 5 && (
                <div className="flex items-center justify-between pt-6 border-t border-zinc-100 mt-6 shrink-0">
                  {/* Previous Step button */}
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                      Назад
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-3">
                    {/* Skip step or allow moving forward */}
                    {step !== 4 && (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                      >
                        Пропустить
                      </button>
                    )}

                    <button
                      disabled={step === 4 && !isStep4Valid}
                      onClick={handleNextStep}
                      id="onboarding-next-btn"
                      type="button"
                      className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                        step === 4 && !isStep4Valid
                          ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed shadow-none'
                          : 'bg-zinc-950 hover:bg-zinc-850 text-white'
                      }`}
                    >
                      <span>{step === 5 ? 'Завершить настройку' : 'Продолжить'}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
