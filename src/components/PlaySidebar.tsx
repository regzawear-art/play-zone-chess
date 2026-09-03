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
    <nav className="flex h-full flex-col items-center gap-1 rounded-2xl bg-navy-700/80 p-2 backdrop-blur-xl">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`group flex w-full flex-col items-center gap-1 rounded-xl px-1 py-3 transition-all ${
              isActive ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-300 hover:bg-navy-600 hover:text-white'
            }`}
            title={item.label}
          >
            <Icon size={22} className={isActive ? 'text-white' : 'text-navy-300 group-hover:text-white'} />
            <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
