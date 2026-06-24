import { PublicProfileSettings } from './features/public-identity/publicIdentityTypes';

export interface SpamDecision {
  id: string;
  postText: string;
  authorName: string;
  moderatorName: string;
  timestamp: string;
  source: string;
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: string;
  content: string;
  rating: string;
  image?: string;
  selected?: boolean;
  reason?: string;
  dept?: string;
  timestamp?: Date;
  moderatedBy?: string;
  targetId?: string;
  targetName?: string;
  status?: string;
  target_type?: string;
  target_status?: string;
  resolution?: string;
  resolution_comment?: string;
  resolved_at?: string;
  moderation_action_id?: string;
  created_at?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  status: 'new' | 'answered';
  messages: { sender: 'user' | 'staff'; text: string; time: string; operatorName?: string }[];
  description?: string;
  urgency?: 'low' | 'medium' | 'high';
  category?: string;
  /** Источник обращения: форма поддержки или чат служебного профиля */
  source?: 'form' | 'service_profile_chat';
  /** ID служебного профиля, через который создано обращение */
  serviceProfileId?: string;
  serviceProfileName?: string;
  serviceProfileAvatar?: string;
}

export interface FeedPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  title?: string;
  text?: string;
  image?: string;
  likes: number;
  timestamp: string;
  displayTime?: string;
  isLiked?: boolean;
  isDownvoted?: boolean;
  comments?: { 
    id: string; 
    authorId?: string;
    authorName: string; 
    authorAvatar: string; 
    text: string; 
    timestamp: string;
    displayTime?: string;
    type?: 'continue_thought' | 'disagree' | 'share_experience';
    parentCommentId?: string;
    firesCount?: number;
    negativeReactions?: number;
    positiveAttentionPct?: number;
    fireUsers?: { userId: string; userName: string; userAvatar: string; timestamp: string }[];
    negativeUsers?: { userId: string; userName: string; userAvatar: string; timestamp: string }[];
  }[];
  moderatedBy?: string;
  isApproved?: boolean;
  context?: string;
  visualPriority?: 'text' | 'media' | 'discussion';
  quietReactions?: { saved?: number; returned?: number; continued?: number };
  postFormat?: 'QUESTION' | 'OPINION' | 'ANALYSIS' | 'RESEARCH' | 'SOLUTION';
  topicScores?: { topic: string; score: number }[];
  topicClassificationSource?: 'AUTO' | 'MANUAL';
  topicHistory?: { timestamp: string; action: string; source: 'AUTO' | 'MANUAL'; moderator?: string }[];
  attentionScore?: number;
  boostedUsers?: string[];
}

export interface ComplaintHistoryItem {
  id: string;
  type: 'incoming' | 'outgoing';
  content: string;
  decision: string;
  moderator: string;
  timestamp: string;
  status: 'Обрабатывается' | 'Завершена';
}

export interface AppUser {
  id: string;
  name: string;
  avatar: string;
  trustLevel: number;
  isVerified: boolean;
  isBlocked: boolean;
  regDate: string;
  isDeleted?: boolean;
  originalName?: string;
  isPornMarked?: boolean;
  birthday?: string;
  city?: string;
  login?: string;
  status?: string;
  friendsCount?: number;
  followersCount?: number;
  photosCount?: number;
  blockReason?: string;
  moderatorComment?: string;
  spamCount?: number;
  isSpamBadge?: boolean;
  recoveryApproval?: 'approved' | 'rejected' | null;
  recoveryRejectReason?: string;
  nameHistory?: string[];
  complaintHistory?: ComplaintHistoryItem[];
  profileBlockInfo?: {
    duration: string;
    reason: string;
    comment: string;
    timestamp: Date;
    moderator: string;
  };
  roles?: any;
  role?: string;
  roleList?: string[];
  isEmployee?: boolean;
  /** Служебный профиль платформы для официального взаимодействия с пользователями */
  isServiceProfile?: boolean;
  /** Показывать кнопку «Написать сообщение» на служебном профиле */
  showServiceMessageButton?: boolean;
  /** Категория CRM для обращений из чата служебного профиля */
  serviceSupportCategory?: string;
  rightMenuAccess?: {
    id: boolean;
    block: boolean;
    card: boolean;
    verify: boolean;
    info: boolean;
    complaints: boolean;
    delete: boolean;
    mark: boolean;
  };
  publicSettings?: PublicProfileSettings;
  onboardingCompleted?: boolean;
  interests?: string[];
  currentStep?: string | null;
  boostsLeft?: number;
  boostsUsed?: number;
  boostsResetTime?: string;
  attentionBalance?: number;
}

export interface VerificationRequest {
  id: string;
  senderId: string;
  userName: string;
  userAvatar: string;
  text: string;
  senderLogin?: string;
}

export interface ModeratorAction {
  id: string;
  type: string;
  action: string;
  targetId?: string;
  targetName?: string;
  message: string;
  operatorId: string;
  operatorName: string;
  timestamp: Date | string;
  complaintId?: string;
  result?: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
}

export interface DialogMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  isViolation?: boolean;
}

export interface DialogComplaint {
  id: string;
  offenderId: string;
  offenderName: string;
  offenderAvatar: string;
  offenderTrust: number;
  offenderRisk: number;
  violationType: 'Угроза' | 'Домогательство' | 'Спам' | 'Оскорбление' | 'Мошенничество' | 'Доксинг';
  source: 'Жалобы пользователя' | 'Автофлаг';
  reporterId: string;
  reporterName: string;
  reporterAvatar: string;
  participants: {
    userA: { name: string; avatar: string; isOffender: boolean };
    userB: { name: string; avatar: string; isOffender: boolean };
  };
  previewMessages: DialogMessage[];
  contextBeforeMessages: DialogMessage[];
  contextAfterMessages: DialogMessage[];
  fullDialogueMessages: DialogMessage[];
  aiAnalysis: {
    threat: number;
    toxicity: number;
    insult: number;
    spam: number;
    scam: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  violationHistory: {
    violationsCount: number;
    warningsCount: number;
    blocksCount: number;
    lastViolationDate: string;
    lastViolationReason: string;
  };
  hasCounterComplaint: boolean;
  counterComplaintText?: string;
  selected?: boolean;
}

export function getDisplayName(profile?: { display_name?: string; username?: string }) {
  if (!profile) return 'Пользователь';
  return profile.display_name?.trim() || profile.username || 'Пользователь';
}
