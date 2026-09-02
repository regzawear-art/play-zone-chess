import { useState, useEffect } from 'react';
import { Palette, Check, Pipette, RotateCcw } from 'lucide-react';
import {
  BOARD_THEMES,
  applyThemeCSS,
  storeTheme,
  getThemeById,
  getCustomColors,
  storeCustomColors,
  buildCustomTheme,
  type CustomColors,
} from '@/game/themes';
import { sound } from '@/game/sound';

interface Props {
  currentThemeId: string;
  onThemeChange: (themeId: string) => void;
}

const DEFAULT_CUSTOM: CustomColors = { light: '#e8e8e8', dark: '#5a7d9a' };

export function BoardThemeSwitcher({ currentThemeId, onThemeChange }: Props) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customColors, setCustomColors] = useState<CustomColors>(
    () => getCustomColors() ?? DEFAULT_CUSTOM,
  );

  useEffect(() => {
    if (open) {
      setCustomColors(getCustomColors() ?? DEFAULT_CUSTOM);
    }
  }, [open]);

  const handleSelect = (themeId: string) => {
    const theme = getThemeById(themeId);
    applyThemeCSS(theme);
    storeTheme(themeId);
    onThemeChange(themeId);
    sound.play('select');
    setOpen(false);
  };

  const handleCustomApply = () => {
    storeCustomColors(customColors);
    const theme = buildCustomTheme(customColors);
    applyThemeCSS(theme);
    storeTheme('custom');
    onThemeChange('custom');
    sound.play('select');
    setOpen(false);
  };

  const handleCustomLive = (field: 'light' | 'dark', value: string) => {
    const updated = { ...customColors, [field]: value };
    setCustomColors(updated);
    const theme = buildCustomTheme(updated);
    applyThemeCSS(theme);
  };

  const resetCustom = () => {
    setCustomColors(DEFAULT_CUSTOM);
    applyThemeCSS(buildCustomTheme(DEFAULT_CUSTOM));
  };

  const activePreview = getThemeById(currentThemeId).preview;
  const activeName = getThemeById(currentThemeId).name;

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
          style={{ background: activePreview }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-royal-500/20 bg-navy-700 p-3 shadow-card-lg backdrop-blur-xl animate-pop-in">
            {!showCustom && (
              <>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    Board Themes
                  </p>
                  <button
                    onClick={() => setShowCustom(true)}
                    className="flex items-center gap-1 rounded-full bg-navy-600 px-2.5 py-1 text-[10px] font-bold text-royal-300 transition-all hover:bg-navy-500"
                  >
                    <Pipette size={11} />
                    Custom
                  </button>
                </div>
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
                  {currentThemeId === 'custom' && (
                    <button
                      onClick={() => setShowCustom(true)}
                      className="group relative aspect-square overflow-hidden rounded-xl border-2 border-royal-400 shadow-glow-sm"
                      style={{ background: activePreview }}
                    >
                      <span className="absolute inset-0 grid place-items-center bg-black/40">
                        <Check size={16} className="text-white" />
                      </span>
                    </button>
                  )}
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-navy-600 px-2.5 py-1.5">
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-white/20"
                    style={{ background: activePreview }}
                  />
                  <span className="text-xs font-semibold text-white">{activeName}</span>
                </div>
              </>
            )}

            {showCustom && (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowCustom(false);
                      const t = getThemeById(currentThemeId);
                      applyThemeCSS(t);
                    }}
                    className="text-[11px] font-bold text-navy-300 transition-colors hover:text-white"
                  >
                    ← Back
                  </button>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    Custom Colors
                  </p>
                </div>

                <div className="mb-3 rounded-xl bg-navy-600 p-3">
                  <div
                    className="mb-3 h-16 w-full rounded-lg border border-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${customColors.light} 50%, ${customColors.dark} 50%)`,
                    }}
                  />
                  <div className="space-y-2.5">
                    <ColorRow
                      label="Light Squares"
                      value={customColors.light}
                      onChange={(v) => handleCustomLive('light', v)}
                    />
                    <ColorRow
                      label="Dark Squares"
                      value={customColors.dark}
                      onChange={(v) => handleCustomLive('dark', v)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={resetCustom}
                    className="flex items-center gap-1.5 rounded-full bg-navy-600 px-3 py-2 text-xs font-bold text-navy-200 transition-all hover:bg-navy-500"
                  >
                    <RotateCcw size={12} />
                    Reset
                  </button>
                  <button
                    onClick={handleCustomApply}
                    className="btn-primary flex-1 text-xs"
                  >
                    <Check size={14} />
                    Apply Theme
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold text-navy-200">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded-lg border border-white/10 bg-navy-700 px-2 py-1 text-[11px] font-mono text-white outline-none focus:border-royal-400"
          spellCheck={false}
        />
        <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-lg border border-white/20">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 h-12 w-12 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>
    </div>
  );
}
