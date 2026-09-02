export interface Player {
  id: number;
  name: string;
  title?: string;
  country: string;
  countryCode: string;
  flag: string; // emoji
  rating: number;
  avatar: string;
  wins: number;
  draws: number;
  losses: number;
  streak: number;
  online: boolean;
}

// Real Pexels portrait URLs (HD, square-ish) — assigned to named players.
export const PLAYERS: Player[] = [
  {
    id: 1,
    name: 'Magnus K.',
    title: 'GM',
    country: 'Norway',
    countryCode: 'NO',
    flag: '\u{1F1F3}\u{1F1F4}',
    rating: 2839,
    avatar: 'https://images.pexels.com/photos/749091/pexels-photo-749091.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 412,
    draws: 88,
    losses: 41,
    streak: 7,
    online: true,
  },
  {
    id: 2,
    name: 'Hikaru N.',
    title: 'GM',
    country: 'United States',
    countryCode: 'US',
    flag: '\u{1F1FA}\u{1F1F8}',
    rating: 2802,
    avatar: 'https://images.pexels.com/photos/5308640/pexels-photo-5308640.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 389,
    draws: 76,
    losses: 52,
    streak: 3,
    online: true,
  },
  {
    id: 3,
    name: 'Alina V.',
    title: 'IM',
    country: 'Russia',
    countryCode: 'RU',
    flag: '\u{1F1F7}\u{1F1FA}',
    rating: 2671,
    avatar: 'https://images.pexels.com/photos/38707525/pexels-photo-38707525.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 301,
    draws: 64,
    losses: 39,
    streak: 5,
    online: false,
  },
  {
    id: 4,
    name: 'Wei L.',
    title: 'GM',
    country: 'China',
    countryCode: 'CN',
    flag: '\u{1F1E8}\u{1F1F3}',
    rating: 2754,
    avatar: 'https://images.pexels.com/photos/5197205/pexels-photo-5197205.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 356,
    draws: 71,
    losses: 48,
    streak: 4,
    online: true,
  },
  {
    id: 5,
    name: 'Sofia R.',
    title: 'WGM',
    country: 'Sweden',
    countryCode: 'SE',
    flag: '\u{1F1F8}\u{1F1ED}',
    rating: 2588,
    avatar: 'https://images.pexels.com/photos/7717254/pexels-photo-7717254.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 274,
    draws: 58,
    losses: 47,
    streak: 2,
    online: true,
  },
  {
    id: 6,
    name: 'David S.',
    country: 'Germany',
    countryCode: 'DE',
    flag: '\u{1F1E9}\u{1F1EA}',
    rating: 2641,
    avatar: 'https://images.pexels.com/photos/31420959/pexels-photo-31420959.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 288,
    draws: 60,
    losses: 55,
    streak: 1,
    online: false,
  },
  {
    id: 7,
    name: 'Priya M.',
    title: 'WIM',
    country: 'India',
    countryCode: 'IN',
    flag: '\u{1F1EE}\u{1F1F3}',
    rating: 2519,
    avatar: 'https://images.pexels.com/photos/33680700/pexels-photo-33680700.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 241,
    draws: 49,
    losses: 38,
    streak: 6,
    online: true,
  },
  {
    id: 8,
    name: 'Lucas P.',
    country: 'Brazil',
    countryCode: 'BR',
    flag: '\u{1F1E7}\u{1F1F7}',
    rating: 2487,
    avatar: 'https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 219,
    draws: 44,
    losses: 51,
    streak: 0,
    online: false,
  },
  {
    id: 9,
    name: 'Emma J.',
    country: 'United Kingdom',
    countryCode: 'GB',
    flag: '\u{1F1EC}\u{1F1E7}',
    rating: 2433,
    avatar: 'https://images.pexels.com/photos/8312669/pexels-photo-8312669.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 198,
    draws: 41,
    losses: 44,
    streak: 2,
    online: true,
  },
  {
    id: 10,
    name: 'Yuki T.',
    country: 'Japan',
    countryCode: 'JP',
    flag: '\u{1F1EF}\u{1F1F5}',
    rating: 2401,
    avatar: 'https://images.pexels.com/photos/33136738/pexels-photo-33136738.jpeg?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
    wins: 176,
    draws: 38,
    losses: 47,
    streak: 1,
    online: false,
  },
];

export const CURRENT_USER: Player = {
  id: 0,
  name: 'You',
  title: '',
  country: 'United States',
  countryCode: 'US',
  flag: '\u{1F1FA}\u{1F1F8}',
  rating: 1842,
  avatar: 'https://images.pexels.com/photos/37273005/pexels-photo-37273005.png?auto=compress&cs=tinysrgb&w=256&h=256&fit=crop',
  wins: 47,
  draws: 12,
  losses: 23,
  streak: 2,
  online: true,
};

export function winRate(p: Player): number {
  const total = p.wins + p.draws + p.losses;
  if (total === 0) return 0;
  return Math.round(((p.wins + p.draws * 0.5) / total) * 100);
}

export function gamesPlayed(p: Player): number {
  return p.wins + p.draws + p.losses;
}
