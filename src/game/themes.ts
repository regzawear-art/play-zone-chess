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
  preview: string; // small swatch for the picker
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'green',
    name: 'Green',
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
    name: 'Blue',
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
    name: 'Brown',
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
    name: 'Dark',
    light: '#8b8b8b',
    dark: '#3d3d3d',
    highlight: '#5a5a5a',
    select: '#7a7a4a',
    legalDot: 'rgba(255,255,255,0.18)',
    legalRing: 'rgba(255,255,255,0.18)',
    checkBg: 'rgba(229,57,53,0.5)',
    lastMoveBg: 'rgba(90,90,90,0.5)',
    preview: 'linear-gradient(135deg, #8b8b8b 50%, #3d3d3d 50%)',
  },
  {
    id: 'purple',
    name: 'Violet',
    light: '#e3d9f0',
    dark: '#7d5ba6',
    highlight: '#c4a8e8',
    select: '#d4b8f8',
    legalDot: 'rgba(0,0,0,0.22)',
    legalRing: 'rgba(0,0,0,0.22)',
    checkBg: 'rgba(229,57,53,0.45)',
    lastMoveBg: 'rgba(125,91,166,0.5)',
    preview: 'linear-gradient(135deg, #e3d9f0 50%, #7d5ba6 50%)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
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
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}
