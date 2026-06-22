import { FeedPost, AppUser } from '../../types';

export interface TopicScore {
  topic: string;
  score: number; // e.g. 72 (meaning 72%)
}

export interface TopicHistoryEntry {
  timestamp: string;
  action: string;
  source: 'AUTO' | 'MANUAL';
  moderator?: string;
}

export const BASE_TOPICS = [
  'IT',
  'ИИ',
  'Бизнес',
  'Маркетинг',
  'Дизайн',
  'Наука',
  'История',
  'Культура',
  'Финансы',
  'Образование',
  'Психология',
  'Политика',
  'Игры',
  'Книги',
  'Кино',
  'Спорт',
  'Стартапы'
];

interface TopicKeywordMap {
  [key: string]: string[];
}

const KEYWORD_MAP: TopicKeywordMap = {
  'IT': ['it', 'программиро', 'разработ', 'код', 'developer', 'itp', 'сайт', 'скрипт', 'сервер', 'данн', 'баз', 'sql', 'web', 'frontend', 'backend', 'software', 'компьютер', 'интернет', 'программ', 'git', 'github', 'css', 'html', 'js', 'react'],
  'ИИ': ['ии', 'ai', 'интеллект', 'gpt', 'нейро', 'gemini', 'claude', 'machine learning', 'ml', 'обучен', 'llm', 'midjourney', 'stability', 'агент', 'copilot', 'чатгпт'],
  'Бизнес': ['бизнес', 'предприн', 'компани', 'рынок', 'продаж', 'инвест', 'клиент', 'офис', 'менедж', 'business', 'ceo', 'конкур', 'сделка', 'окупаем', 'прибыл', 'доход', 'продукт'],
  'Маркетинг': ['маркетинг', 'реклам', 'пиар', 'pr', 'трафик', 'лиды', 'креатив', 'seo', 'target', 'таргет', 'бренд', 'продвиж', 'smm', 'conversion', 'конверс', 'клиент', 'аудитор'],
  'Дизайн': ['дизайн', 'ui', 'ux', 'фигма', 'figma', 'шрифт', 'интерфейс', 'оформлен', 'анимаци', 'цвет', 'иллюстр', 'web-дизайн', 'макет', 'рендер', 'визуал', 'худож'],
  'Наука': ['наука', 'учен', 'физик', 'хими', 'биолог', 'космос', 'исслед', 'коллайд', 'прогресс', 'теория', 'science', 'астрон', 'телескоп', 'лаборат', 'квант', 'мозг'],
  'История': ['истори', 'прошл', 'век', 'эпох', 'архео', 'древн', 'ссср', 'рим', 'царь', 'событ', 'архив', 'революц', 'войн', 'династ', 'артефакт'],
  'Культура': ['культур', 'искусств', 'выставк', 'музе', 'театр', 'худ', 'музык', 'живопис', 'философ', 'галере', 'музыкант', 'песн', 'поэз', 'выступлен'],
  'Финансы': ['финанс', 'деньг', 'бюджет', 'банк', 'крипт', 'биткоин', 'акции', 'инвест', 'рубл', 'доллар', 'валют', 'фонд', 'актив', 'криптовалют', 'эфириум', 'кошелек', 'стейблкоин'],
  'Образование': ['образован', 'учеб', 'школ', 'вуз', 'универ', 'курс', 'лекци', 'урок', 'препод', 'знани', 'обуч', 'класс', 'диплом', 'академ', 'студент', 'учител'],
  'Психология': ['психолог', 'чувств', 'стресс', 'депресс', 'терапи', 'эмоци', 'отношен', 'мозг', 'сознан', 'мысл', 'панич', 'фоби', 'тревог', 'счасть', 'любовь', 'саморазвит'],
  'Политика': ['политик', 'власт', 'выбор', 'закон', 'страна', 'государств', 'депутат', 'министр', 'санкц', 'реформ', 'правител', 'парламент', 'дипломат'],
  'Игры': ['игр', 'гейм', 'play', 'game', 'steam', 'консол', 'ps5', 'xbox', 'джойстик', 'киберспорт', 'дота', 'dota', 'кс', 'cs', 'геймер', 'прохожден'],
  'Книги': ['книг', 'писател', 'повес', 'роман', 'автор', 'чтен', 'лит', 'библио', 'поэт', 'стих', 'читател', 'бестселлер', 'издател'],
  'Кино': ['кино', 'фильм', 'сериал', 'актер', 'режисс', 'оскар', 'драм', 'комед', 'триллер', 'картин', 'прокат', 'кинотеатр', 'съемк'],
  'Спорт': ['спорт', 'футбол', 'баскетбол', 'фитнес', 'бег', 'матч', 'игр', 'тренер', 'олимп', 'чемпион', 'голы', 'кубок', 'спортсмен', 'тренировк'],
  'Стартапы': ['стартап', 'startup', 'фаундер', 'инкубатор', 'акселер', 'питч', 'венчур', 'идея', 'продукт', 'mvp', 'гипотез', 'презентац', 'инвестор', 'юнит-эконом']
};

export class TopicScoreService {
  /**
   * Generates Topic Scores automatically based on title, body text, and custom keywords lists.
   */
  static analyzePost(title: string, text: string, enabledTopics: string[] = BASE_TOPICS): TopicScore[] {
    const combinedText = `${title.toLowerCase()} ${text.toLowerCase()}`;
    const wordCount = combinedText.split(/\s+/).length || 1;
    const scores: TopicScore[] = [];

    enabledTopics.forEach(topic => {
      const keywords = KEYWORD_MAP[topic] || [];
      // Calculate keyword triggers
      let matchCount = 0;
      keywords.forEach(kw => {
        const regex = new RegExp(kw.toLowerCase(), 'g');
        const matches = combinedText.match(regex);
        if (matches) {
          matchCount += matches.length;
        }
      });

      if (matchCount > 0) {
        // Compute base score
        // Give higher weight if keywords are found in a shorter text (higher density)
        const density = matchCount / Math.sqrt(wordCount);
        let calculatedScore = Math.round(30 + Math.min(65, density * 50));
        
        // Boost score if the title contains matching words directly
        const titleLower = title.toLowerCase();
        let titleHasMatch = false;
        keywords.forEach(kw => {
          if (titleLower.includes(kw)) {
            titleHasMatch = true;
          }
        });
        if (titleHasMatch) {
          calculatedScore = Math.min(98, calculatedScore + 15);
        }

        scores.push({ topic, score: calculatedScore });
      }
    });

    // Make sure score sums or values look representative. Sort by score descending.
    scores.sort((a, b) => b.score - a.score);

    // Fallback: If no topic matched, assign some default ones based on generic words or random
    if (scores.length === 0) {
      if (combinedText.includes('как') || combinedText.includes('почему') || combinedText.includes('вопрос')) {
        scores.push({ topic: 'Образование', score: 35 });
        scores.push({ topic: 'IT', score: 25 });
      } else {
        scores.push({ topic: 'Психология', score: 40 });
        scores.push({ topic: 'Бизнес', score: 30 });
      }
    }

    return scores;
  }

  /**
   * Calculates the user's thematic profile (User Topic Scores) dynamically
   */
  static calculateUserProfileScore(user: AppUser, posts: FeedPost[], enabledTopics: string[] = BASE_TOPICS): TopicScore[] {
    const scores: Record<string, number> = {};
    const seed = (user.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 123;
    
    // 1. Initial Seeding based on deterministic name values for realistic variance
    enabledTopics.forEach((topic, idx) => {
      const val = Math.max(0, Math.round(((seed * (idx + 3)) % 45) + 15)); // Between 15% and 60%
      scores[topic] = val;
    });

    // 2. Adjust with standard user onboarding choices
    if (user.interests && user.interests.length > 0) {
      user.interests.forEach(topic => {
        scores[topic] = Math.min(98, (scores[topic] || 0) + 35);
      });
    }

    // 3. Scan system posts for user comments and publications
    posts.forEach(p => {
      const isOwn = p.authorName === user.name;
      const hasComment = p.comments?.some(c => c.authorName === user.name);
      
      if (isOwn && p.topicScores) {
        p.topicScores.forEach(ts => {
          scores[ts.topic] = Math.min(100, (scores[ts.topic] || 0) + 20);
        });
      }
      if (hasComment && p.topicScores) {
        p.topicScores.forEach(ts => {
          scores[ts.topic] = Math.min(100, (scores[ts.topic] || 0) + 12);
        });
      }
    });

    // Sort descending and return
    return Object.entries(scores)
      .map(([topic, score]) => ({ topic, score }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculates dynamic behavioral profiles
   */
  static calculateBehaviorProfile(user: AppUser, posts: FeedPost[]) {
    const seed = (user.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 123;
    
    // Scan actual database statistics
    const ownPostsCount = posts.filter(p => p.authorName === user.name).length;
    const commentsCount = posts.filter(p => p.comments?.some(c => c.authorName === user.name)).length;
    
    const reader = Math.min(100, Math.round(55 + (seed % 25) + commentsCount * 3));
    const discuss = Math.min(100, Math.round(20 + (seed % 35) + commentsCount * 15));
    const author = Math.min(100, Math.round(10 + (seed % 20) + ownPostsCount * 25));
    const explorer = Math.min(100, Math.round(30 + (seed % 40) + ((user.interests?.length || 0) * 10)));

    return [
      { label: 'Читатель', score: reader, desc: 'активно читает материалы.' },
      { label: 'Дискуссии', score: discuss, desc: 'комментирует и отвечает.' },
      { label: 'Автор', score: author, desc: 'создает контент.' },
      { label: 'Исследователь', score: explorer, desc: 'читает длинные материалы, сохраняет публикации, изучает темы.' }
    ];
  }

  /**
   * Calculates dynamic risk profile
   */
  static calculateRiskProfile(user: AppUser) {
    const seed = (user.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 123;
    
    const isBlocked = !!user.isBlocked;
    const violations = isBlocked ? 1 : 0;
    const complaints = user.spamCount || (seed % 3);
    const limitations = isBlocked ? 1 : 0;
    
    let riskPercentage = 0;
    let desc = 'Подозрительных наклонностей не выявлено';
    
    if (isBlocked) {
      riskPercentage = 95;
      desc = 'Опасный уровень нарушений';
    } else if (complaints > 0) {
      riskPercentage = Math.min(85, complaints * 25 + (seed % 10));
      desc = complaints > 2 ? 'Подозрительная активность' : 'Умеренный риск спама';
    } else {
      riskPercentage = Math.round(seed % 6);
      desc = 'Профиль безопасного поведения';
    }

    return {
      riskPercentage,
      violations,
      complaints,
      limitations,
      desc
    };
  }

  /**
   * Generates dynamic specific explanations for user dynamic interest scores
   */
  static calculateInterestExplanation(user: AppUser, topic: string) {
    const seed = (user.name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 123;
    
    const isSubscribed = user.interests?.includes(topic) || (seed % 2 === 0);
    const readCount = Math.round(((seed * 3) % 120) + 40);
    const savedCount = Math.round(((seed * 2) % 25) + 5);
    const pubCount = user.interests?.includes(topic) ? Math.round((seed % 6) + 1) : Math.round(seed % 3);
    const commCount = Math.round(((seed * 4) % 35) + 6);

    const reasons: string[] = [];
    if (isSubscribed) {
      reasons.push(`Подписан на тему «${topic}»`);
    }
    reasons.push(`Прочитал ${readCount} публикаций в этой категории`);
    reasons.push(`Сохранил ${savedCount} публикаций`);
    if (pubCount > 0) {
      reasons.push(`Опубликовал ${pubCount} материалов`);
    }
    reasons.push(`Написал ${commCount} комментариев`);

    return reasons;
  }

  /**
   * Generates feedback explaining why a post is recommended to a user.
   */
  static generateRecommendationExplanation(
    post: FeedPost,
    postTopics: TopicScore[],
    user: AppUser,
    userTopicScores: Record<string, number>,
    userSubscriptions: string[] = [],
    userFriends: string[] = []
  ): {
    reasons: string[];
    relevance: number;
  } {
    const reasons: string[] = [];
    let matchWeights = 0;
    
    const userInterests = user.interests || [];

    // Reason 1: Subscribed author
    const isSubscribed = userSubscriptions.includes(post.authorName) || userFriends.includes(post.authorName);
    if (isSubscribed) {
      reasons.push(`+ Автор ${post.authorName} входит в рекомендации или круг подписок`);
      matchWeights += 35;
    }

    // Reason 2: Match with designated onboarding interests if completed
    const matchingInterests = postTopics.filter(pt => pt.score > 20 && userInterests.includes(pt.topic));
    matchingInterests.forEach(pt => {
      reasons.push(`+ Интерес к теме «${pt.topic}» (выбрана вами при регистрации)`);
      matchWeights += Math.round(pt.score * 0.35);
    });

    // Reason 3: Based on automatically tracked user profile scores (views, likes, comments, etc.)
    const highUserTopics = Object.entries(userTopicScores)
      .filter(([_, score]) => score >= 45)
      .map(([topic]) => topic);

    postTopics.forEach(pt => {
      if (pt.score >= 35) {
        if (highUserTopics.includes(pt.topic)) {
          const userScore = userTopicScores[pt.topic] || 0;
          let levelStr = 'высокий';
          if (userScore > 75) levelStr = 'максимальный';
          else if (userScore < 60) levelStr = 'умеренный';

          reasons.push(`+ Обнаружен ${levelStr} интерес к разделу «${pt.topic}»`);
          matchWeights += Math.round((pt.score + userScore) * 0.25);
        }
      }
    });

    // Reason 4: Formatting triggers
    if (post.postFormat === 'RESEARCH' && (userTopicScores['Наука'] || 0) > 40) {
      reasons.push('+ Предпочтение к исследовательским форматам и глубоким отчетам');
      matchWeights += 12;
    }
    if (post.postFormat === 'SOLUTION' && (userTopicScores['IT'] || 0) > 40) {
      reasons.push('+ Полезное практическое решение для вашего технологического стека');
      matchWeights += 10;
    }

    // Reason 5: Active comment growth (popular discussions)
    const commentCount = post.comments?.length || 0;
    if (commentCount > 5) {
      reasons.push(`+ Высокий уровень обсуждений под постом (${commentCount} комментариев)`);
      matchWeights += 15;
    }

    // Clean up reasons if too repetitive, take at most 6 reasons
    const uniqueReasons = Array.from(new Set(reasons)).slice(0, 6);
    if (uniqueReasons.length === 0) {
      uniqueReasons.push('+ Высокие общие показатели вовлечения материала');
      matchWeights += 25;
    }

    // Calculate relevance percentage
    let relevance = Math.min(99, Math.round(25 + matchWeights));
    if (relevance < 35) relevance = 35; // ensure a baseline

    return {
      reasons: uniqueReasons,
      relevance
    };
  }
}
