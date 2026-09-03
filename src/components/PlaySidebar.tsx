import { Gamepad2, Puzzle, GraduationCap, MoreHorizontal } from 'lucide-react';

interface Props {
  active: string;
  onNavigate: (id: string) => void;
}

const ITEMS = [
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'puzzles', label: 'Puzzles', icon: Puzzle },
  { id: 'learn', label: 'Learn', icon: GraduationCap },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export function PlaySidebar({ active, onNavigate }: Props) {
  return (
    <nav className="flex h-full flex-col items-center gap-1 rounded-2xl border border-white/5 bg-navy-750 p-2">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-all duration-200 ${
              isActive
                ? 'bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/30'
                : 'text-navy-400 hover:bg-navy-600/60 hover:text-white'
            }`}
            title={item.label}
          >
            <Icon size={22} />
            <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
