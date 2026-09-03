export interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
  highlight: string;
  select: string;
  legalDot: string;
  legalRing: string;
  checkBg: string;
  lastMoveBg: string;
  preview: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'green',
    name: 'Emerald Green',
    light: '#ebecd0',
    dark: '#779952',
    highlight: '#baca44',
    select: '#f7f769',
    legalDot: 'rgba(0,0,0,0.22)',
    legalRing: 'rgba(0,0,0,0.22)',
    checkBg: 'rgba(229,57,53,0.45)',
    lastMoveBg: 'rgba(186,202,68,0.55)',
    preview: 'linear-gradient(135deg, #ebecd0 50%, #779952 50%)',
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    light: '#dee3e6',
    dark: '#8ca2ad',
    highlight: '#c4d4e0',
    select: '#bbd6e8',
    legalDot: 'rgba(0,0,0,0.22)',
    legalRing: 'rgba(0,0,0,0.22)',
    checkBg: 'rgba(229,57,53,0.45)',
    lastMoveBg: 'rgba(140,162,173,0.55)',
    preview: 'linear-gradient(135deg, #dee3e6 50%, #8ca2ad 50%)',
  },
  {
    id: 'brown',
    name: 'Classic Wood',
    light: '#f0d9b5',
    dark: '#b58863',
    highlight: '#dcb28c',
    select: '#f7ec74',
    legalDot: 'rgba(0,0,0,0.22)',
    legalRing: 'rgba(0,0,0,0.22)',
    checkBg: 'rgba(229,57,53,0.45)',
    lastMoveBg: 'rgba(181,136,99,0.55)',
    preview: 'linear-gradient(135deg, #f0d9b5 50%, #b58863 50%)',
  },
  {
    id: 'walnut',
    name: 'Walnut',
    light: '#e8d9ca',
    dark: '#6b4f3a',
    highlight: '#c4a87e',
    select: '#f0e0a0',
    legalDot: 'rgba(0,0,0,0.25)',
    legalRing: 'rgba(0,0,0,0.25)',
    checkBg: 'rgba(229,57,53,0.5)',
    lastMoveBg: 'rgba(107,79,58,0.5)',
    preview: 'linear-gradient(135deg, #e8d9ca 50%, #6b4f3a 50%)',
  },
  {
    id: 'dark',
    name: 'Silver & Charcoal',
    light: '#f2f2f2',
    dark: '#2b2b2b',
    highlight: '#d0d0d0',
    select: '#a8a8a8',
    legalDot: 'rgba(0,0,0,0.35)',
    legalRing: 'rgba(0,0,0,0.35)',
    checkBg: 'rgba(229,57,53,0.55)',
    lastMoveBg: 'rgba(120,120,120,0.5)',
    preview: 'linear-gradient(135deg, #f2f2f2 50%, #2b2b2b 50%)',
  },
  {
    id: 'ice',
    name: 'Ice Blue',
    light: '#e0f7fa',
    dark: '#80deea',
    highlight: '#b2ebf2',
    select: '#c0eef5',
    legalDot: 'rgba(0,0,0,0.18)',
    legalRing: 'rgba(0,0,0,0.18)',
    checkBg: 'rgba(229,57,53,0.4)',
    lastMoveBg: 'rgba(128,222,234,0.5)',
    preview: 'linear-gradient(135deg, #e0f7fa 50%, #80deea 50%)',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    light: '#cfedf6',
    dark: '#4a9eb8',
    highlight: '#a8d8e8',
    select: '#b8e8f0',
    legalDot: 'rgba(0,0,0,0.22)',
    legalRing: 'rgba(0,0,0,0.22)',
    checkBg: 'rgba(229,57,53,0.45)',
    lastMoveBg: 'rgba(74,158,184,0.5)',
    preview: 'linear-gradient(135deg, #cfedf6 50%, #4a9eb8 50%)',
  },
  {
    id: 'ember',
    name: 'Ember',
    light: '#f5dccb',
    dark: '#c4633a',
    highlight: '#e8a080',
    select: '#f0c0a0',
    legalDot: 'rgba(0,0,0,0.22)',
    legalRing: 'rgba(0,0,0,0.22)',
    checkBg: 'rgba(229,57,53,0.5)',
    lastMoveBg: 'rgba(196,99,58,0.5)',
    preview: 'linear-gradient(135deg, #f5dccb 50%, #c4633a 50%)',
  },
];

const STORAGE_KEY = 'chess-board-theme';
const CUSTOM_KEY = 'chess-board-custom';
const CUSTOM_ID = 'custom';

export interface CustomColors {
  light: string;
  dark: string;
}

export function getStoredTheme(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'green';
  } catch {
    return 'green';
  }
}

export function storeTheme(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function getCustomColors(): CustomColors | null {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomColors;
  } catch {
    return null;
  }
}

export function storeCustomColors(colors: CustomColors): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(colors));
  } catch {
    // ignore
  }
}

function deriveTheme(light: string, dark: string): BoardTheme {
  return {
    id: CUSTOM_ID,
    name: 'Custom',
    light,
    dark,
    highlight: dark,
    select: light,
    legalDot: 'rgba(0,0,0,0.22)',
    legalRing: 'rgba(0,0,0,0.22)',
    checkBg: 'rgba(229,57,53,0.45)',
    lastMoveBg: `${dark}88`,
    preview: `linear-gradient(135deg, ${light} 50%, ${dark} 50%)`,
  };
}

export function buildCustomTheme(colors: CustomColors): BoardTheme {
  return deriveTheme(colors.light, colors.dark);
}

export function applyThemeCSS(theme: BoardTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--board-light', theme.light);
  root.style.setProperty('--board-dark', theme.dark);
  root.style.setProperty('--board-highlight', theme.highlight);
  root.style.setProperty('--board-select', theme.select);
  root.style.setProperty('--board-legal-dot', theme.legalDot);
  root.style.setProperty('--board-legal-ring', theme.legalRing);
  root.style.setProperty('--board-check-bg', theme.checkBg);
  root.style.setProperty('--board-last-move', theme.lastMoveBg);
}

export function getThemeById(id: string): BoardTheme {
  if (id === CUSTOM_ID) {
    const custom = getCustomColors();
    if (custom) return buildCustomTheme(custom);
  }
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}

export function getAllThemes(): BoardTheme[] {
  const custom = getCustomColors();
  const list = [...BOARD_THEMES];
  if (custom) list.push(buildCustomTheme(custom));
  return list;
}
