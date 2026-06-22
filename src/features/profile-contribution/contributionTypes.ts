export type ContributionMetricKey = 'trust' | 'utility' | 'attention' | 'engagement';

export interface TrustDetails {
  violationHistory: number;
  confirmedComplaints: number;
  moderationSanctions: number;
  contentQualityScore: number;
}

export interface UtilityDetails {
  helpfulAnswers: number;
  bestAnswers: number;
  materialSaves: number;
  likesReceived: number;
}

export interface AttentionDetails {
  views: number;
  uniqueReaders: number;
  averageReadThrough: number;
  profileVisits: number;
  repeatViews: number;
}

export interface EngagementDetails {
  repliesReceived: number;
  discussionParticipants: number;
  averageDiscussionDepth: number;
  discussionReturns: number;
}

export interface ContributionMetrics {
  trust: number;
  utility: number;
  attention: number;
  engagement: number;
  overall: number;
  lastActivityAt: Date;
  details: {
    trust: TrustDetails;
    utility: UtilityDetails;
    attention: AttentionDetails;
    engagement: EngagementDetails;
  };
}

export interface ContributionDataSources {
  userId: string;
  userName: string;
  trustLevel: number;
  isVerified: boolean;
  isBlocked: boolean;
  isServiceProfile?: boolean;
  isSpamBadge?: boolean;
  isPornMarked?: boolean;
  spamCount?: number;
  regDate?: string;
  status?: string;
  complaintHistory?: { type: 'incoming' | 'outgoing'; status: string }[];
  posts: {
    id: string;
    likes: number;
    comments?: {
      id: string;
      authorId?: string;
      authorName: string;
      type?: 'continue_thought' | 'disagree' | 'share_experience';
      parentCommentId?: string;
    }[];
    quietReactions?: { saved?: number; returned?: number; continued?: number };
    isApproved?: boolean;
    timestamp?: string;
  }[];
  complaintsAgainstUser: number;
  subscriberCount: number;
  commentsByUser?: {
    type?: 'continue_thought' | 'disagree' | 'share_experience';
  }[];
}

export const METRIC_LABELS: Record<ContributionMetricKey, string> = {
  trust: 'Доверие',
  utility: 'Полезность',
  attention: 'Внимание',
  engagement: 'Вовлеченность',
};

export const METRIC_DESCRIPTIONS: Record<ContributionMetricKey, string> = {
  trust: 'Надежность пользователя внутри сообщества',
  utility: 'Практическая ценность вклада автора',
  attention: 'Реальный интерес аудитории к материалам',
  engagement: 'Способность создавать и развивать дискуссии',
};
