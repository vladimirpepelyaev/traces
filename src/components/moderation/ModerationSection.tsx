import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Shield, Copy, Check, Clock, AlertCircle, BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { AppUser, Complaint, ModeratorAction } from '../../types';
import { ModerationBadges } from './ModerationBadges';
import {
  calculateUserBadges,
  ModerationBadgeContext,
  UserBadges
} from '../../features/moderation/moderationBadges';
import {
  resolveRuleMetadata,
  KnowledgeRuleMeta
} from '../../features/moderation/knowledgeBaseRules';

export interface ModerationFeedItem {
  id: string;
  category: 'content' | 'dialogs' | 'pages';
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  reason: string;
  rating?: string;
  complaintsCount?: number;
  timestamp: Date | string;
  rawItem?: any;
  wikiArticleId?: string;
  wikiArticleTitle?: string;
  wikiRule?: string;
  ruleCode?: string;
}

export interface ModerationSectionProps {
  currentUser: AppUser | null;
  users: AppUser[];
  complaints: Complaint[];
  spamComplaints: Complaint[];
  dialogComplaints: any[];
  pageComplaints: Complaint[];
  moderatorHistory: ModeratorAction[];
  securityLogs: any[];
  onAction: (item: ModerationFeedItem, actionType: 'AGREE' | 'IGNORE') => Promise<void> | void;
  onNavigateToUser?: (userId: string) => void;
  onOpenWikiArticle?: (articleId: string) => void;
  addNotification?: (title: string, message: string) => void;
}

export const ModerationSection: React.FC<ModerationSectionProps> = ({
  currentUser,
  users,
  complaints,
  spamComplaints,
  dialogComplaints,
  pageComplaints,
  moderatorHistory,
  securityLogs,
  onAction,
  onNavigateToUser,
  onOpenWikiArticle,
  addNotification
}) => {
  // Top Navigation Tabs: "Лента модерации" (default) and "Мои решения"
  const [activeTab, setActiveTab] = useState<'feed' | 'decisions'>('feed');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  // Badge context for pure in-memory calculation (prevents N+1 database queries)
  const badgeContext: ModerationBadgeContext = useMemo(() => ({
    users,
    moderatorHistory,
    securityLogs,
    complaints,
    dialogComplaints,
    pageComplaints
  }), [users, moderatorHistory, securityLogs, complaints, dialogComplaints, pageComplaints]);

  // Build the unified feed list from active complaints
  const feedList = useMemo<ModerationFeedItem[]>(() => {
    const list: ModerationFeedItem[] = [];

    // Helper to compute user complaint count
    const getUserComplaintCount = (uId: string, uName: string) => {
      const c1 = complaints.filter(c => c.userId === uId || c.userName === uName || c.targetId === uId || c.targetName === uName).length;
      const c2 = spamComplaints.filter(s => s.userId === uId || s.userName === uName || s.targetId === uId || s.targetName === uName).length;
      const c3 = pageComplaints.filter(p => p.userId === uId || p.userName === uName || p.targetId === uId || p.targetName === uName).length;
      const c4 = dialogComplaints.filter(d => d.offenderId === uId || d.offenderName === uName).length;
      return Math.max(1, c1 + c2 + c3 + c4);
    };

    // 1. Content complaints
    complaints
      .filter(c => c.status !== 'resolved' && c.status !== 'closed')
      .forEach(c => {
        const uId = c.targetId || c.userId || 'user-1';
        const uName = c.targetName || c.userName || 'Пользователь';
        const meta = resolveRuleMetadata(c.reason, c.content);
        list.push({
          id: c.id,
          category: 'content',
          userId: uId,
          userName: uName,
          userAvatar: c.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
          content: c.content || c.reason || 'Публикация с нарушением правил сообщества',
          reason: c.reason || meta.ruleTitle,
          rating: c.rating && !isNaN(Number(c.rating)) ? c.rating : '0.04',
          complaintsCount: getUserComplaintCount(uId, uName),
          timestamp: c.timestamp || c.created_at || new Date(),
          rawItem: c,
          wikiArticleId: meta.articleId,
          wikiArticleTitle: meta.articleTitle,
          wikiRule: meta.ruleTitle,
          ruleCode: meta.code
        });
      });

    // 2. Spam complaints
    spamComplaints
      .filter(s => s.status !== 'resolved' && s.status !== 'closed')
      .forEach(s => {
        const uId = s.targetId || s.userId || 'user-spam';
        const uName = s.targetName || s.userName || 'Пользователь';
        const meta = resolveRuleMetadata(s.reason || 'Спам', s.content);
        list.push({
          id: s.id,
          category: 'content',
          userId: uId,
          userName: uName,
          userAvatar: s.userAvatar || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=200&auto=format&fit=crop',
          content: s.content || s.reason || 'Спам-рассылка',
          reason: s.reason || meta.ruleTitle,
          rating: '0.02',
          complaintsCount: getUserComplaintCount(uId, uName),
          timestamp: s.timestamp || new Date(),
          rawItem: s,
          wikiArticleId: meta.articleId,
          wikiArticleTitle: meta.articleTitle,
          wikiRule: meta.ruleTitle,
          ruleCode: meta.code
        });
      });

    // 3. Dialog complaints
    dialogComplaints
      .filter((d: any) => d.status !== 'resolved' && d.status !== 'closed' && !d.moderatedBy)
      .forEach(d => {
      const previewText =
        d.previewMessages?.map((m: any) => m.text).join(' ') ||
        d.fullDialogueMessages?.filter((m: any) => m.isViolation).map((m: any) => m.text).join(' ') ||
        d.violationType ||
        'Нарушение в личном сообщении';
      const uId = d.offenderId || 'dialog-user';
      const uName = d.offenderName || 'Собеседник';
      const meta = resolveRuleMetadata(d.violationType || 'Угроза', previewText);
      list.push({
        id: d.id,
        category: 'dialogs',
        userId: uId,
        userName: uName,
        userAvatar: d.offenderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
        content: previewText,
        reason: d.violationType || meta.ruleTitle,
        rating: '0.08',
        complaintsCount: getUserComplaintCount(uId, uName),
        timestamp: new Date(),
        rawItem: d,
        wikiArticleId: meta.articleId,
        wikiArticleTitle: meta.articleTitle,
        wikiRule: meta.ruleTitle,
        ruleCode: meta.code
      });
    });

    // 4. Page complaints
    pageComplaints
      .filter(p => p.status !== 'resolved' && p.status !== 'closed')
      .forEach(p => {
        const uId = p.targetId || p.userId || 'page-user';
        const uName = p.targetName || p.userName || 'Профиль';
        const meta = resolveRuleMetadata(p.reason || 'Профиль', p.content);
        list.push({
          id: p.id,
          category: 'pages',
          userId: uId,
          userName: uName,
          userAvatar: p.userAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
          content: p.content || p.reason || 'Жалоба на оформление страницы пользователя',
          reason: p.reason || meta.ruleTitle,
          rating: '0.03',
          complaintsCount: getUserComplaintCount(uId, uName),
          timestamp: p.timestamp || new Date(),
          rawItem: p,
          wikiArticleId: meta.articleId,
          wikiArticleTitle: meta.articleTitle,
          wikiRule: meta.ruleTitle,
          ruleCode: meta.code
        });
      });

    return list;
  }, [complaints, spamComplaints, dialogComplaints, pageComplaints]);

  // Compute decisions made by the current moderator
  const myDecisionsList = useMemo(() => {
    const currentName = currentUser?.name || 'Модератор';
    const currentId = currentUser?.id;

    const matchedActions = (moderatorHistory || []).filter(h => {
      const isMyAction =
        (currentId && h.operatorId === currentId) ||
        (currentName && h.operatorName === currentName) ||
        h.type === 'complaint' ||
        h.type === 'moderation';
      return isMyAction;
    });

    return matchedActions.slice().reverse();
  }, [moderatorHistory, currentUser]);

  // Pre-calculate badges for all feed items in memory (O(N) single pass, 0 network requests)
  const itemBadgesMap = useMemo<Record<string, UserBadges>>(() => {
    const map: Record<string, UserBadges> = {};
    feedList.forEach(item => {
      map[item.id] = calculateUserBadges(item.userId, item.userName, badgeContext);
    });
    return map;
  }, [feedList, badgeContext]);

  // Handle Copy action
  const handleCopy = async (item: ModerationFeedItem) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(item.content);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = item.content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedItemId(item.id);
      addNotification?.('Скопировано', 'Текст жалобы скопирован в буфер обмена');
      setTimeout(() => {
        setCopiedItemId(prev => (prev === item.id ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Handle decision action (AGREE / IGNORE)
  const handleDecision = async (item: ModerationFeedItem, type: 'AGREE' | 'IGNORE') => {
    try {
      setProcessingId(item.id);
      await onAction(item, type);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4 text-left font-sans">
      {/* Top Header Tabs Bar matching visual mockup */}
      <div className="bg-white border border-[#e7e8ec] rounded-[12px] p-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-5 py-2.5 text-[13.5px] font-semibold rounded-[8px] transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-[#eef2f8] text-[#3b6799]'
                : 'text-[#656565] hover:text-[#2c2d2e] hover:bg-gray-50'
            }`}
          >
            Лента модерации
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`px-5 py-2.5 text-[13.5px] font-semibold rounded-[8px] transition-all cursor-pointer ${
              activeTab === 'decisions'
                ? 'bg-[#eef2f8] text-[#3b6799]'
                : 'text-[#656565] hover:text-[#2c2d2e] hover:bg-gray-50'
            }`}
          >
            Мои решения
          </button>
        </div>

        {/* Counter indicator */}
        <div className="pr-3 text-[12.5px] text-[#818c99]">
          {activeTab === 'feed' ? (
            <span>
              В очереди: <strong className="text-[#2c2d2e]">{feedList.length}</strong>
            </span>
          ) : (
            <span>
              Решений: <strong className="text-[#2c2d2e]">{myDecisionsList.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* TAB 1: ЛЕНТА МОДЕРАЦИИ */}
      {activeTab === 'feed' && (
        <div>
          {feedList.length === 0 ? (
            <div className="bg-white p-16 rounded-[12px] border border-[#e7e8ec] text-center flex flex-col items-center gap-3 shadow-sm my-4">
              <div className="w-12 h-12 rounded-full bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-[16px] font-bold text-[#2c2d2e]">Все жалобы обработаны!</h3>
              <p className="text-[#656565] text-[13px] max-w-sm">
                В выбранных очередях больше нет необработанных обращений.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              <AnimatePresence mode="popLayout">
                {feedList.map(item => {
                  const badges = itemBadgesMap[item.id] || {
                    passwordChanged: false,
                    isStaff: false,
                    isVerified: false,
                    hasBlockHistory: false,
                    isNewUser: false
                  };
                  const isProcessing = processingId === item.id;
                  const isCopied = copiedItemId === item.id;
                  const ruleMeta = resolveRuleMetadata(item.reason, item.content);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="bg-white border border-[#e7e8ec] rounded-[14px] p-5 shadow-sm hover:border-[#ccd4e0] transition-all flex flex-col md:flex-row gap-5 items-start justify-between text-left"
                    >
                      {/* Left: User Avatar, Name, Dynamic Badges, Meta Info & Content */}
                      <div className="grow space-y-3.5 max-w-2xl w-full">
                        {/* Header Row: Avatar + User Info + Badges */}
                        <div className="flex items-center gap-3.5 flex-wrap">
                          <img
                            src={item.userAvatar}
                            alt={item.userName}
                            className="w-11 h-11 rounded-full object-cover border border-[#e7e8ec] shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="space-y-0.5">
                            {/* Name + Dynamic Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                onClick={() => onNavigateToUser && onNavigateToUser(item.userId)}
                                className="text-[15px] font-bold text-[#2c2d2e] hover:underline cursor-pointer tracking-tight"
                              >
                                {item.userName}
                              </span>

                              {/* Five Dynamic Badges */}
                              <ModerationBadges badges={badges} />
                            </div>

                            {/* Subtitle: Reason, Rate, Complaints Count matching mockup */}
                            <div className="flex items-center gap-4 text-[13px] text-[#818c99] pt-0.5">
                              <div>
                                <span>Причина: </span>
                                <strong className="text-[#2c2d2e] font-semibold">{item.reason}</strong>
                              </div>
                              <div>
                                <span>Rate: </span>
                                <strong className="text-[#2c2d2e] font-semibold">{item.rating || '0.04'}</strong>
                              </div>
                              <div>
                                <span>Жалоб: </span>
                                <strong className="text-[#2c2d2e] font-semibold">{item.complaintsCount || 1}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Knowledge Base Regulation Banner */}
                        <div className="flex items-center justify-between gap-2 flex-wrap text-[12px] bg-[#f0f4f9] px-3 py-1.5 rounded-[8px] border border-[#d6e2ee]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <BookOpen size={14} className="text-[#2a5885] shrink-0" />
                            <span className="text-[#55677d] font-medium shrink-0">Регламент:</span>
                            <span className="font-semibold text-[#2a5885] truncate">
                              {item.ruleCode || ruleMeta.code} — {item.wikiRule || ruleMeta.ruleTitle}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedRuleId(expandedRuleId === item.id ? null : item.id)}
                            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#2a5885] hover:text-[#1e3f61] hover:underline cursor-pointer ml-auto shrink-0"
                          >
                            <span>{expandedRuleId === item.id ? 'Скрыть регламент' : 'Справка из Базы знаний'}</span>
                            {expandedRuleId === item.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        </div>

                        {/* Collapsible Regulation Guide Details */}
                        <AnimatePresence>
                          {expandedRuleId === item.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 bg-[#fbfcfd] border border-[#d6e2ee] rounded-[8px] space-y-2 text-[12.5px] text-[#2c2d2e]">
                                <div className="flex items-center justify-between border-b border-[#e7e8ec] pb-1.5 flex-wrap gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded-[3px] bg-[#2a5885]/10 text-[#2a5885] font-bold text-[11px]">
                                      {ruleMeta.code}
                                    </span>
                                    <span className="font-semibold text-[#2c2d2e]">
                                      Статья Wiki: «{ruleMeta.articleTitle}»
                                    </span>
                                  </div>
                                  {onOpenWikiArticle && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenWikiArticle(ruleMeta.articleId)}
                                      className="text-[#2a5885] hover:underline text-[11.5px] font-medium inline-flex items-center gap-1 cursor-pointer ml-auto"
                                    >
                                      <span>Открыть статью</span>
                                      <ExternalLink size={12} />
                                    </button>
                                  )}
                                </div>

                                <div>
                                  <div className="text-[11px] font-bold text-[#656565] uppercase tracking-wider mb-1">
                                    Критерии нарушения регламента:
                                  </div>
                                  <ul className="space-y-0.5 pl-1">
                                    {ruleMeta.criteria.map((crit, idx) => (
                                      <li key={idx} className="flex items-start gap-1.5 text-[12px] text-[#444]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#5181b8] mt-1.5 shrink-0" />
                                        <span>{crit}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#e7e8ec]">
                                  <div className="bg-[#f0f4f9]/70 p-2 rounded-[5px] border border-[#d6e2ee]/60">
                                    <div className="text-[10.5px] font-bold text-[#2a5885] uppercase">Порядок действий:</div>
                                    <div className="text-[11.5px] text-[#333] mt-0.5">{ruleMeta.moderatorAction}</div>
                                  </div>
                                  <div className="bg-[#fdf2f2] p-2 rounded-[5px] border border-[#f5c6cb]/60">
                                    <div className="text-[10.5px] font-bold text-[#e64646] uppercase">Санкция по регламенту:</div>
                                    <div className="text-[11.5px] text-[#721c24] mt-0.5">{ruleMeta.sanctions.first}</div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Reported Content Snippet Block */}
                        <div className="bg-[#f7f8fa] p-4 rounded-[10px] text-[14px] text-[#2c2d2e] leading-relaxed font-sans whitespace-pre-wrap select-text border border-[#f0f2f5]">
                          {item.content}
                        </div>
                      </div>

                      {/* Right Action Column: AGREE, IGNORE, Скопировать */}
                      <div className="shrink-0 w-full md:w-[210px] space-y-2.5 pt-2 md:pt-0">
                        {/* Top row: AGREE & IGNORE side by side */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleDecision(item, 'AGREE')}
                            className="w-full py-3.5 bg-[#5181b8] hover:bg-[#4773a6] active:bg-[#3d6593] text-white text-[13px] font-bold tracking-wider rounded-[10px] transition-all shadow-sm cursor-pointer text-center disabled:opacity-50"
                          >
                            AGREE
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleDecision(item, 'IGNORE')}
                            className="w-full py-3.5 bg-[#f0f2f5] hover:bg-[#e4e7ec] active:bg-[#d9dee6] text-[#4a5868] text-[13px] font-bold tracking-wider rounded-[10px] transition-all cursor-pointer text-center disabled:opacity-50"
                          >
                            IGNORE
                          </button>
                        </div>

                        {/* Bottom row: Скопировать full width */}
                        <button
                          onClick={() => handleCopy(item)}
                          className="w-full py-2.5 bg-[#eaedf2] hover:bg-[#dde3ea] active:bg-[#d2dae3] text-[#4a5868] text-[13px] font-medium rounded-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isCopied ? (
                            <>
                              <Check size={15} className="text-[#16a34a]" />
                              <span>Скопировано!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} className="opacity-70" />
                              <span>Скопировать</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: МОИ РЕШЕНИЯ */}
      {activeTab === 'decisions' && (
        <div className="space-y-3.5">
          {myDecisionsList.length === 0 ? (
            <div className="bg-white p-16 rounded-[12px] border border-[#e7e8ec] text-center flex flex-col items-center gap-3 shadow-sm my-4">
              <div className="w-12 h-12 rounded-full bg-[#f4f7fa] text-[#5181b8] flex items-center justify-center">
                <Clock size={28} />
              </div>
              <h3 className="text-[16px] font-bold text-[#2c2d2e]">История решений пуста</h3>
              <p className="text-[#656565] text-[13px] max-w-sm">
                Здесь будут отображаться решения, принятые вами в ленте модерации.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myDecisionsList.map(action => {
                const targetUser = users.find(
                  u => u.id === action.targetId || u.name === action.targetName
                );
                const targetBadges = targetUser
                  ? calculateUserBadges(targetUser.id, targetUser.name, badgeContext)
                  : {
                      passwordChanged: false,
                      isStaff: false,
                      isVerified: false,
                      hasBlockHistory: false,
                      isNewUser: false
                    };

                const isBlocked =
                  action.result === 'blocked' ||
                  action.action?.toLowerCase().includes('блок') ||
                  action.message?.toLowerCase().includes('блок');
                const isDeleted =
                  action.result === 'deleted' ||
                  action.action?.toLowerCase().includes('принят') ||
                  action.action?.toLowerCase().includes('удален');

                const decisionLabel = isBlocked
                  ? 'Заблокирован'
                  : isDeleted
                  ? 'Нарушение удалено (AGREE)'
                  : 'Проигнорировано (IGNORE)';

                const decisionBadgeColor = isBlocked
                  ? 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]'
                  : isDeleted
                  ? 'bg-[#e5effa] text-[#2a5885] border-[#b2c1d4]'
                  : 'bg-[#f0f2f5] text-[#55677d] border-[#d8dce2]';

                const formattedTime = action.timestamp
                  ? new Date(action.timestamp).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '';

                return (
                  <div
                    key={action.id}
                    className="bg-white border border-[#e7e8ec] rounded-[12px] p-4 shadow-sm flex flex-col md:flex-row gap-4 items-start justify-between text-left"
                  >
                    <div className="space-y-2 grow">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-9 h-9 rounded-full bg-[#f0f2f5] border border-[#e7e8ec] flex items-center justify-center font-bold text-[#55677d] text-[13px] shrink-0">
                          {action.targetName ? action.targetName[0]?.toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-bold text-[#2c2d2e]">
                              {action.targetName || 'Пользователь'}
                            </span>
                            <ModerationBadges badges={targetBadges} size="sm" />
                            <span className="text-[11px] text-[#818c99]">{formattedTime}</span>
                          </div>
                          <div className="text-[12px] text-[#656565] mt-0.5">
                            Действие: <span className="font-medium text-[#2c2d2e]">{action.action}</span>
                          </div>
                        </div>
                      </div>

                      {/* Log details */}
                      <div className="bg-[#f9fafb] p-3 rounded-[8px] text-[12.5px] text-[#4a5868] border border-[#f0f2f5] font-sans">
                        {action.message}
                      </div>
                    </div>

                    {/* Right column: decision tag */}
                    <div className="shrink-0 self-start">
                      <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-[6px] border ${decisionBadgeColor}`}>
                        {decisionLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
