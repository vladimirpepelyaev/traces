import { Complaint, DialogComplaint, WikiArticle } from '../../types';

export interface KnowledgeRuleMeta {
  code: string;
  articleId: string;
  articleTitle: string;
  category: string;
  ruleTitle: string;
  criteria: string[];
  sanctions: {
    first: string;
    repeat: string;
    critical: string;
  };
  moderatorAction: string;
}

export const KNOWLEDGE_BASE_RULES_MAP: Record<string, KnowledgeRuleMeta> = {};

export const OFFICIAL_KNOWLEDGE_BASE_ARTICLES: WikiArticle[] = [];

export const OFFICIAL_KB_COMPLAINTS: Complaint[] = [];

export const OFFICIAL_KB_DIALOG_COMPLAINTS: DialogComplaint[] = [];

/**
 * Resolves governing rule metadata for any complaint text/reason.
 */
export function resolveRuleMetadata(reason?: string, content?: string): KnowledgeRuleMeta {
  const normReason = (reason || '').toLowerCase();

  for (const key of Object.keys(KNOWLEDGE_BASE_RULES_MAP)) {
    const rule = KNOWLEDGE_BASE_RULES_MAP[key];
    if (rule && (normReason.includes(rule.ruleTitle.toLowerCase()) || normReason.includes(rule.code.toLowerCase()))) {
      return rule;
    }
  }

  return {
    code: 'RULE-01',
    articleId: 'wiki-1',
    articleTitle: reason || 'Регламент модерации',
    category: 'Модерация',
    ruleTitle: reason || 'Общий регламент',
    criteria: [reason || 'Нарушение регламента платформы'],
    sanctions: {
      first: 'Предупреждение',
      repeat: 'Временная блокировка',
      critical: 'Перманентный бан'
    },
    moderatorAction: 'Рассмотреть жалобу в соответствии с регламентом'
  };
}
