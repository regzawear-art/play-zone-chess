import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { BOARD_THEMES, applyThemeCSS, storeTheme, getThemeById } from '@/game/themes';
import { sound } from '@/game/sound';

interface Props {
  currentThemeId: string;
  onThemeChange: (themeId: string) => void;
}

export function BoardThemeSwitcher({ currentThemeId, onThemeChange }: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (themeId: string) => {
    const theme = getThemeById(themeId);
    applyThemeCSS(theme);
    storeTheme(themeId);
    onThemeChange(themeId);
    sound.play('select');
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-royal-500/25 bg-navy-700 px-3 py-2 text-xs font-semibold text-white transition-all hover:border-royal-500/50 hover:shadow-glow-sm"
        title="Board theme"
      >
        <Palette size={14} className="text-royal-400" />
        <span className="hidden sm:inline">Theme</span>
        <span
          className="h-4 w-4 rounded border border-white/20"
          style={{ background: getThemeById(currentThemeId).preview }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-royal-500/20 bg-navy-700 p-3 shadow-card-lg backdrop-blur-xl animate-pop-in">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
              Board Themes
            </p>
            <div className="grid grid-cols-4 gap-2">
              {BOARD_THEMES.map((theme) => {
                const isActive = theme.id === currentThemeId;
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-royal-400 shadow-glow-sm'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    style={{ background: theme.preview }}
                    title={theme.name}
                  >
                    {isActive && (
                      <span className="absolute inset-0 grid place-items-center bg-black/40">
                        <Check size={16} className="text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-navy-600 px-2.5 py-1.5">
              <span
                className="h-4 w-4 shrink-0 rounded border border-white/20"
                style={{ background: getThemeById(currentThemeId).preview }}
              />
              <span className="text-xs font-semibold text-white">
                {getThemeById(currentThemeId).name}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
