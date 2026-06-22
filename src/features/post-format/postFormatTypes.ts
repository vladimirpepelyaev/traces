export type PostFormat = 'QUESTION' | 'OPINION' | 'ANALYSIS' | 'RESEARCH' | 'SOLUTION';

export interface PostFormatInfo {
  id: PostFormat;
  label: string;
  icon: string;
  classes: string; // Tailwind classes for the badge
  textClass: string;
}

export const POST_FORMATS: PostFormatInfo[] = [
  {
    id: 'QUESTION',
    label: 'Вопрос',
    icon: '',
    classes: 'bg-zinc-50 text-zinc-700 border-zinc-200/80',
    textClass: 'text-zinc-700',
  },
  {
    id: 'OPINION',
    label: 'Мнение',
    icon: '',
    classes: 'bg-zinc-50 text-zinc-700 border-zinc-200/80',
    textClass: 'text-zinc-700',
  },
  {
    id: 'ANALYSIS',
    label: 'Разбор',
    icon: '',
    classes: 'bg-zinc-50 text-zinc-700 border-zinc-200/80',
    textClass: 'text-zinc-700',
  },
  {
    id: 'RESEARCH',
    label: 'Исследование',
    icon: '',
    classes: 'bg-zinc-50 text-zinc-700 border-zinc-200/80',
    textClass: 'text-zinc-700',
  },
  {
    id: 'SOLUTION',
    label: 'Решение',
    icon: '',
    classes: 'bg-zinc-50 text-zinc-700 border-zinc-200/80',
    textClass: 'text-zinc-700',
  },
];

