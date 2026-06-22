import {
  AttentionDetails,
  ContributionDataSources,
  ContributionMetrics,
  EngagementDetails,
  TrustDetails,
  UtilityDetails,
} from './contributionTypes';

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getCommentDepth(
  comments: NonNullable<ContributionDataSources['posts'][number]['comments']>,
  commentId: string,
  depth = 1
): number {
  const comment = comments.find(c => c.id === commentId);
  if (!comment?.parentCommentId) return depth;
  return getCommentDepth(comments, comment.parentCommentId, depth + 1);
}

function collectDiscussionStats(posts: ContributionDataSources['posts']) {
  let repliesReceived = 0;
  const participants = new Set<string>();
  let maxDepth = 0;
  let discussionReturns = 0;

  posts.forEach(post => {
    const comments = post.comments || [];
    repliesReceived += comments.length;
    discussionReturns += post.quietReactions?.returned || 0;

    comments.forEach(comment => {
      participants.add(comment.authorId || comment.authorName);
      maxDepth = Math.max(maxDepth, getCommentDepth(comments, comment.id));
    });
  });

  return {
    repliesReceived,
    discussionParticipants: participants.size,
    averageDiscussionDepth: maxDepth,
    discussionReturns,
  };
}

export class ContributionMetricsService {
  static calculateTrust(sources: ContributionDataSources): { score: number; details: TrustDetails } {
    const incomingViolations = (sources.complaintHistory || []).filter(
      item => item.type === 'incoming'
    ).length;
    const moderationSanctions =
      (sources.isBlocked ? 1 : 0) +
      (sources.isSpamBadge ? 1 : 0) +
      (sources.spamCount || 0) +
      (sources.isPornMarked ? 1 : 0);
    const approvedPosts = sources.posts.filter(post => post.isApproved !== false).length;
    const contentQualityScore = clamp(
      55 + approvedPosts * 4 - sources.complaintsAgainstUser * 3,
      20,
      100
    );

    let score = sources.trustLevel * 100;
    score -= incomingViolations * 4;
    score -= sources.complaintsAgainstUser * 5;
    score -= (sources.spamCount || 0) * 8;
    if (sources.isBlocked) score -= 35;
    if (sources.isSpamBadge) score -= 18;
    if (sources.isPornMarked) score -= 12;
    if (sources.isVerified) score += 6;
    score += Math.min(8, approvedPosts * 1.5);

    return {
      score: clamp(score),
      details: {
        violationHistory: incomingViolations + (sources.spamCount || 0),
        confirmedComplaints: sources.complaintsAgainstUser,
        moderationSanctions,
        contentQualityScore,
      },
    };
  }

  static calculateUtility(sources: ContributionDataSources): { score: number; details: UtilityDetails } {
    const likesReceived = sources.posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const materialSaves = sources.posts.reduce(
      (sum, post) => sum + (post.quietReactions?.saved || 0),
      0
    );

    const userComments = sources.commentsByUser || [];
    const helpfulAnswers = userComments.filter(c => c.type === 'continue_thought').length;
    const bestAnswers = userComments.filter(c => c.type === 'share_experience').length;

    const continued = sources.posts.reduce(
      (sum, post) => sum + (post.quietReactions?.continued || 0),
      0
    );

    const raw =
      likesReceived * 0.04 +
      materialSaves * 0.35 +
      helpfulAnswers * 2.2 +
      bestAnswers * 3.5 +
      continued * 0.5 +
      sources.posts.length * 4;

    return {
      score: clamp(38 + raw * 0.45),
      details: {
        helpfulAnswers,
        bestAnswers,
        materialSaves,
        likesReceived,
      },
    };
  }

  static calculateAttention(sources: ContributionDataSources): { score: number; details: AttentionDetails } {
    const likesReceived = sources.posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const commentsCount = sources.posts.reduce(
      (sum, post) => sum + (post.comments?.length || 0),
      0
    );
    const seed = hashSeed(sources.userId);

    const views =
      likesReceived * 18 +
      commentsCount * 14 +
      sources.posts.length * 120 +
      (seed % 900) +
      800;
    const uniqueReaders = Math.max(
      sources.subscriberCount,
      Math.round(views * (0.18 + (seed % 12) / 100))
    );
    const averageReadThrough = clamp(
      52 +
        Math.min(28, likesReceived * 0.08) +
        Math.min(12, commentsCount * 0.6) +
        (sources.posts.length > 0 ? 6 : 0),
      35,
      95
    );
    const profileVisits = sources.subscriberCount * 4 + likesReceived * 2 + sources.posts.length * 35;
    const repeatViews = Math.round(views * (0.12 + (seed % 8) / 100));

    const raw =
      Math.log10(views + 10) * 18 +
      uniqueReaders * 0.015 +
      averageReadThrough * 0.35 +
      profileVisits * 0.004;

    return {
      score: clamp(raw),
      details: {
        views,
        uniqueReaders,
        averageReadThrough,
        profileVisits,
        repeatViews,
      },
    };
  }

  static calculateEngagement(sources: ContributionDataSources): { score: number; details: EngagementDetails } {
    const stats = collectDiscussionStats(sources.posts);
    const continued = sources.posts.reduce(
      (sum, post) => sum + (post.quietReactions?.continued || 0),
      0
    );

    const raw =
      stats.repliesReceived * 0.55 +
      stats.discussionParticipants * 2.8 +
      stats.averageDiscussionDepth * 6 +
      stats.discussionReturns * 1.4 +
      continued * 0.8;

    return {
      score: clamp(30 + raw * 0.9),
      details: {
        repliesReceived: stats.repliesReceived,
        discussionParticipants: stats.discussionParticipants,
        averageDiscussionDepth: stats.averageDiscussionDepth,
        discussionReturns: stats.discussionReturns + continued,
      },
    };
  }

  static calculateOverallContribution(metrics: Pick<ContributionMetrics, 'trust' | 'utility' | 'attention' | 'engagement'>): number {
    return clamp(
      metrics.trust * 0.3 +
        metrics.utility * 0.25 +
        metrics.attention * 0.2 +
        metrics.engagement * 0.25
    );
  }

  static resolveLastActivity(sources: ContributionDataSources): Date {
    const now = Date.now();
    const seed = hashSeed(`${sources.userId}-${sources.userName}`);
    const hoursAgo = 1 + (seed % 48);
    return new Date(now - hoursAgo * 60 * 60 * 1000);
  }

  static calculateAll(sources: ContributionDataSources): ContributionMetrics {
    if (sources.isServiceProfile) {
      const emptyDetails = {
        trust: { violationHistory: 0, confirmedComplaints: 0, moderationSanctions: 0, contentQualityScore: 0 },
        utility: { helpfulAnswers: 0, bestAnswers: 0, materialSaves: 0, likesReceived: 0 },
        attention: { views: 0, uniqueReaders: 0, averageReadThrough: 0, profileVisits: 0, repeatViews: 0 },
        engagement: { repliesReceived: 0, discussionParticipants: 0, averageDiscussionDepth: 0, discussionReturns: 0 },
      };
      return {
        trust: 0,
        utility: 0,
        attention: 0,
        engagement: 0,
        overall: 0,
        lastActivityAt: new Date(),
        details: emptyDetails,
      };
    }

    const trust = this.calculateTrust(sources);
    const utility = this.calculateUtility(sources);
    const attention = this.calculateAttention(sources);
    const engagement = this.calculateEngagement(sources);

    const partial = {
      trust: trust.score,
      utility: utility.score,
      attention: attention.score,
      engagement: engagement.score,
    };

    return {
      ...partial,
      overall: this.calculateOverallContribution(partial),
      lastActivityAt: this.resolveLastActivity(sources),
      details: {
        trust: trust.details,
        utility: utility.details,
        attention: attention.details,
        engagement: engagement.details,
      },
    };
  }
}
