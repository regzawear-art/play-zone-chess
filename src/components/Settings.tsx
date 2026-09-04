import { useRef } from 'react';
import type { Player } from '../data/players';
import { sound } from '../game/sound';
import { Volume2, VolumeX, Bell, Upload, Trash2, User, RotateCcw } from 'lucide-react';

interface Props {
  user: Player;
  userAvatar: string;
  onUploadAvatar: (dataUrl: string) => void;
  muted: boolean;
  onToggleMute: () => void;
  volume: number;
  onChangeVolume: (v: number) => void;
  autoFlip: boolean;
  onToggleAutoFlip: () => void;
  notifications: boolean;
  onToggleNotifications: () => void;
  onResetSettings: () => void;
  matchCount: number;
  onClearHistory: () => void;
}

export function Settings(props: Props) {
  const { user, userAvatar, onUploadAvatar, muted, onToggleMute, volume, onChangeVolume, autoFlip, onToggleAutoFlip, notifications, onToggleNotifications, onResetSettings, matchCount, onClearHistory } = props;
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { alert('Please choose an image under 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { onUploadAvatar(reader.result as string); sound.play('select'); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full space-y-5">
      <Section title="Avatar" icon={User}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-4 ring-white/10 shadow-glow-sm">
              <img src={userAvatar} alt={user.name} className="h-full w-full object-cover" />
            </div>
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-blue-grad text-white shadow-glow-sm transition-transform hover:scale-110" aria-label="Upload avatar">
              <Upload size={15} />
            </button>
          </div>
          <div className="flex-1">
            <p className="font-display text-lg font-bold text-white">{user.name}</p>
            <p className="text-sm text-navy-400">Upload a photo up to 2 MB.</p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="hidden" />
          </div>
        </div>
      </Section>

      <Section title="Sound" icon={muted ? VolumeX : Volume2}>
        <ToggleRow label="Sound effects" desc="Move, capture, check & victory sounds" checked={!muted} onChange={onToggleMute} />
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Volume</span>
            <span className="text-xs font-bold text-royal-400">{Math.round(volume * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => onChangeVolume(parseFloat(e.target.value))} className="slider-green w-full" />
        </div>
      </Section>

      <Section title="Gameplay" icon={RotateCcw}>
        <ToggleRow label="Auto-flip board" desc="Flip board to your color at game start" checked={autoFlip} onChange={onToggleAutoFlip} />
      </Section>

      <Section title="Notifications" icon={Bell}>
        <ToggleRow label="Game alerts" desc="Check, checkmate & match invitations" checked={notifications} onChange={onToggleNotifications} />
      </Section>

      <Section title="Data" icon={Trash2}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Match history</p>
            <p className="text-xs text-navy-400">{matchCount} game{matchCount !== 1 ? 's' : ''} stored locally</p>
          </div>
          <button onClick={onClearHistory} disabled={matchCount === 0} className="rounded-full border border-red-500/25 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-40">Clear history</button>
        </div>
        <button onClick={onResetSettings} className="mt-3 w-full rounded-full border border-white/10 bg-navy-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-500">Reset all settings</button>
      </Section>

      <style>{`
        .slider-green { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; background: linear-gradient(90deg, #81B64C, #6ba238); outline: none; }
        .slider-green::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid #81B64C; box-shadow: 0 2px 6px rgba(129,182,76,0.4); cursor: pointer; }
        .slider-green::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid #81B64C; box-shadow: 0 2px 6px rgba(129,182,76,0.4); cursor: pointer; }
      `}</style>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-navy-700/80 p-5 shadow-card backdrop-blur-xl sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-royal-500/15 text-royal-400"><Icon size={16} /></div>
        <h3 className="font-display text-base font-bold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-navy-400">{desc}</p>
      </div>
      <button onClick={onChange} role="switch" aria-checked={checked} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${checked ? 'bg-blue-grad shadow-glow-sm' : 'bg-navy-600'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
