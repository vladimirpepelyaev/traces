export interface ProfileThemeConfig {
  id: string;
  name: string;
  colorHex: string;
  cardBg: string;
  borderLeft: string;
  badgeBg: string;
  badgeText: string;
}

export const PROFILE_THEMES: Record<string, ProfileThemeConfig> = {
  default: {
    id: 'default',
    name: 'Стандартная',
    colorHex: '#9ca3af',
    cardBg: '',
    borderLeft: '',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-zinc-600'
  },
  pastel_blue: {
    id: 'pastel_blue',
    name: 'Пастельный синий',
    colorHex: '#A0C4FF',
    cardBg: 'rgba(160, 196, 255, 0.05)',
    borderLeft: '#A0C4FF',
    badgeBg: 'rgba(160, 196, 255, 0.15)',
    badgeText: '#4A7BB0'
  },
  pastel_green: {
    id: 'pastel_green',
    name: 'Пастельный зеленый',
    colorHex: '#CAFFBF',
    cardBg: 'rgba(202, 255, 191, 0.05)',
    borderLeft: '#CAFFBF',
    badgeBg: 'rgba(202, 255, 191, 0.15)',
    badgeText: '#5E9E52'
  },
  pastel_pink: {
    id: 'pastel_pink',
    name: 'Пастельный розовый',
    colorHex: '#FFADAD',
    cardBg: 'rgba(255, 173, 173, 0.05)',
    borderLeft: '#FFADAD',
    badgeBg: 'rgba(255, 173, 173, 0.15)',
    badgeText: '#BA5555'
  },
  pastel_peach: {
    id: 'pastel_peach',
    name: 'Пастельный персик',
    colorHex: '#FFD1A9',
    cardBg: 'rgba(255, 209, 169, 0.05)',
    borderLeft: '#FFD1A9',
    badgeBg: 'rgba(255, 209, 169, 0.15)',
    badgeText: '#B36B30'
  },
  pastel_mint: {
    id: 'pastel_mint',
    name: 'Пастельная мята',
    colorHex: '#BFFCC6',
    cardBg: 'rgba(191, 252, 198, 0.05)',
    borderLeft: '#BFFCC6',
    badgeBg: 'rgba(191, 252, 198, 0.15)',
    badgeText: '#418F4E'
  },
  pastel_lavender: {
    id: 'pastel_lavender',
    name: 'Пастельная лаванда',
    colorHex: '#E8AEFF',
    cardBg: 'rgba(232, 174, 255, 0.05)',
    borderLeft: '#E8AEFF',
    badgeBg: 'rgba(232, 174, 255, 0.15)',
    badgeText: '#964BB0'
  },
  pastel_yellow: {
    id: 'pastel_yellow',
    name: 'Пастельный желтый',
    colorHex: '#FDFFB6',
    cardBg: 'rgba(253, 255, 182, 0.05)',
    borderLeft: '#FDFFB6',
    badgeBg: 'rgba(253, 255, 182, 0.15)',
    badgeText: '#9C9E3F'
  },
  pastel_sand: {
    id: 'pastel_sand',
    name: 'Пастельный песочный',
    colorHex: '#E6CCB2',
    cardBg: 'rgba(230, 204, 178, 0.05)',
    borderLeft: '#E6CCB2',
    badgeBg: 'rgba(230, 204, 178, 0.15)',
    badgeText: '#876445'
  },
  pastel_gray: {
    id: 'pastel_gray',
    name: 'Пастельный серый',
    colorHex: '#D3D3D3',
    cardBg: 'rgba(211, 211, 211, 0.05)',
    borderLeft: '#D3D3D3',
    badgeBg: 'rgba(211, 211, 211, 0.15)',
    badgeText: '#6E6E6E'
  },
  pastel_violet: {
    id: 'pastel_violet',
    name: 'Пастельный фиолетовый',
    colorHex: '#CDB4DB',
    cardBg: 'rgba(205, 180, 219, 0.05)',
    borderLeft: '#CDB4DB',
    badgeBg: 'rgba(205, 180, 219, 0.15)',
    badgeText: '#7E5C92'
  },
  // Keep support for older themes as fallback, mapping them if needed
  mist: { id: 'mist', name: 'Mist', colorHex: '#7A8B99', cardBg: 'rgba(122, 139, 153, 0.05)', borderLeft: '#7A8B99', badgeBg: 'rgba(122, 139, 153, 0.15)', badgeText: '#556673' },
  mint: { id: 'mint', name: 'Mint', colorHex: '#82C3A6', cardBg: 'rgba(130, 195, 166, 0.05)', borderLeft: '#82C3A6', badgeBg: 'rgba(130, 195, 166, 0.15)', badgeText: '#3B7A5D' },
  peach: { id: 'peach', name: 'Peach', colorHex: '#F6A27E', cardBg: 'rgba(246, 162, 126, 0.05)', borderLeft: '#F6A27E', badgeBg: 'rgba(246, 162, 126, 0.15)', badgeText: '#A75D3F' },
  sky: { id: 'sky', name: 'Sky', colorHex: '#57C1EB', cardBg: 'rgba(87, 193, 235, 0.05)', borderLeft: '#57C1EB', badgeBg: 'rgba(87, 193, 235, 0.15)', badgeText: '#1E7C9E' },
  sand: { id: 'sand', name: 'Sand', colorHex: '#D8B281', cardBg: 'rgba(216, 178, 129, 0.05)', borderLeft: '#D8B281', badgeBg: 'rgba(216, 178, 129, 0.15)', badgeText: '#875C2E' },
  rose: { id: 'rose', name: 'Rose', colorHex: '#E8A598', cardBg: 'rgba(232, 165, 152, 0.05)', borderLeft: '#E8A598', badgeBg: 'rgba(232, 165, 152, 0.15)', badgeText: '#9A5042' },
  sage: { id: 'sage', name: 'Sage', colorHex: '#87A987', cardBg: 'rgba(135, 169, 135, 0.05)', borderLeft: '#87A987', badgeBg: 'rgba(135, 169, 135, 0.15)', badgeText: '#4E6A4E' },
  lavender: { id: 'lavender', name: 'Lavender', colorHex: '#B19FFB', cardBg: 'rgba(177, 159, 251, 0.05)', borderLeft: '#B19FFB', badgeBg: 'rgba(177, 159, 251, 0.15)', badgeText: '#5A46C2' },
  ice: { id: 'ice', name: 'Ice', colorHex: '#9BE1E4', cardBg: 'rgba(155, 225, 228, 0.05)', borderLeft: '#9BE1E4', badgeBg: 'rgba(155, 225, 228, 0.15)', badgeText: '#3B8B8E' },
  cream: { id: 'cream', name: 'Cream', colorHex: '#EAD5C3', cardBg: 'rgba(234, 213, 195, 0.05)', borderLeft: '#EAD5C3', badgeBg: 'rgba(234, 213, 195, 0.15)', badgeText: '#8A6848' }
};
