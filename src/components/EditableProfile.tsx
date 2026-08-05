import { useState, useRef } from 'react';
import type { Profile } from '../hooks/useProfile';
import { COUNTRY_FLAGS } from '../hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { Trophy, Target, Flame, TrendingUp, Medal, Upload, Save, DollarSign, Pencil, Check } from 'lucide-react';

interface Props {
  profile: Profile;
  onUpdate: (updates: Partial<Profile>) => void;
}

export function EditableProfile({ profile, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [countryCode, setCountryCode] = useState(profile.country_code);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);

  const total = profile.wins + profile.draws + profile.losses;
  const wr = total > 0 ? Math.round(((profile.wins + profile.draws * 0.5) / total) * 100) : 0;

  const stats = [
    { label: 'Rating', value: profile.rating, icon: TrendingUp, color: 'text-royal-400', bg: 'bg-royal-500/15' },
    { label: 'Win Rate', value: `${wr}%`, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { label: 'Wins', value: profile.wins, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { label: 'Streak', value: 0, icon: Flame, color: 'text-red-400', bg: 'bg-red-500/15' },
  ];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      alert('Please choose an image under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    const flag = COUNTRY_FLAGS[countryCode]?.flag ?? '🏳️';
    onUpdate({
      display_name: displayName,
      bio,
      country_code: countryCode,
      flag_emoji: flag,
      avatar_url: avatarUrl,
    });
    setSaving(false);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-navy-700/80 shadow-card-lg backdrop-blur-xl">
      {/* header band */}
      <div className="relative h-28 bg-navy-grad sm:h-32">
        <div className="absolute inset-0 bg-hero-radial opacity-60" />
        <div className="pointer-events-none absolute right-6 top-6 select-none text-5xl text-white/10">{'\u265A'}</div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
          >
            <Pencil size={12} />
            Edit Profile
          </button>
        ) : (
          <button
            onClick={save}
            disabled={saving}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-blue-grad px-3 py-1.5 text-xs font-semibold text-white shadow-glow-sm transition-all hover:translate-y-[-1px] disabled:opacity-60"
          >
            <Save size={12} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
        {saved && (
          <div className="absolute right-3 top-12 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white animate-pop-in">
            <Check size={12} />
            Saved!
          </div>
        )}
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        {/* avatar */}
        <div className="-mt-12 flex items-end justify-between sm:-mt-14">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-white shadow-glow-sm sm:h-28 sm:w-28">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.username} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-blue-grad text-2xl font-bold text-white">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {editing && (
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-blue-grad text-white shadow-glow-sm transition-transform hover:scale-110"
                aria-label="Upload avatar"
              >
                <Upload size={15} />
              </button>
            )}
            <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-blue-grad text-xs font-bold text-white ring-2 ring-white shadow-glow-sm">
              {profile.rating}
            </span>
          </div>
          <div className="mb-2 flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
            <Medal size={14} />
            {profile.rating >= 2000 ? 'Expert' : profile.rating >= 1500 ? 'Advanced' : 'Rising'}
          </div>
        </div>

        {/* name section */}
        {editing ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-400">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-2.5 text-sm font-semibold text-white outline-none transition-all focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-400">Country</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-2.5 text-sm font-semibold text-white outline-none transition-all focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
              >
                {Object.entries(COUNTRY_FLAGS).map(([code, { name, flag }]) => (
                  <option key={code} value={code}>{flag} {name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-400">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell other players about yourself…"
                className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
              />
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="hidden" />
          </div>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-2">
              <h3 className="font-display text-xl font-extrabold text-white sm:text-2xl">
                {profile.display_name || profile.username}
              </h3>
              <span className="text-xl" title={profile.country_code}>{profile.flag_emoji}</span>
            </div>
            <p className="mt-0.5 text-sm text-navy-400">
              @{profile.username} · {total} games played
            </p>
            {profile.bio && (
              <p className="mt-2 text-sm leading-relaxed text-navy-300">{profile.bio}</p>
            )}
          </>
        )}

        {/* Bonus badge */}
        <div className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 ${
          profile.bonus_claimed
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-400'
        }`}>
          <DollarSign size={18} />
          <div className="flex-1">
            <p className="text-sm font-bold">${profile.bonus_points.toFixed(2)} Welcome Bonus</p>
            <p className="text-xs opacity-80">
              {profile.bonus_claimed ? 'Bonus claimed — use it in tournaments!' : 'Claim your bonus now!'}
            </p>
          </div>
          {!profile.bonus_claimed && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white animate-pulse">
              New!
            </span>
          )}
        </div>

        {/* stats grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-navy-600 p-3 text-center transition-all hover:shadow-card">
                <div className={`mx-auto grid h-9 w-9 place-items-center rounded-xl ${s.bg}`}>
                  <Icon size={16} className={s.color} />
                </div>
                <p className="mt-2 font-display text-lg font-extrabold text-white">{s.value}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-navy-400">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* W/D/L bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-navy-300">
            <span>Record</span>
            <span className="text-navy-400">{profile.wins}W · {profile.draws}D · {profile.losses}L</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-navy-600">
            <div className="bg-emerald-500" style={{ width: `${total > 0 ? (profile.wins / total) * 100 : 0}%` }} />
            <div className="bg-navy-400" style={{ width: `${total > 0 ? (profile.draws / total) * 100 : 0}%` }} />
            <div className="bg-red-400" style={{ width: `${total > 0 ? (profile.losses / total) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
