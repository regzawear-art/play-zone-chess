import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Plus, X, Crown, Loader2, Search, Check } from 'lucide-react';

interface Club {
  id: string;
  name: string;
  description: string;
  founder_id: string;
  member_count: number;
  created_at: string;
}

interface Props {
  userId: string | null;
  onLogin: () => void;
}

export function Clubs({ userId, onLogin }: Props) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClubs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clubs')
      .select('*')
      .order('member_count', { ascending: false });
    if (data) setClubs(data as Club[]);
    setLoading(false);
  }, []);

  const loadJoined = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', userId);
    if (data) setJoinedIds(new Set(data.map((d) => d.club_id)));
  }, [userId]);

  useEffect(() => {
    loadClubs();
    loadJoined();
  }, [loadClubs, loadJoined]);

  const joinClub = async (clubId: string) => {
    if (!userId) { onLogin(); return; }
    await supabase.from('club_members').insert({ club_id: clubId, user_id: userId, role: 'member' });
    try { await supabase.rpc('increment_club_members', { club_id: clubId }); } catch { /* ignore */ }
    setJoinedIds((prev) => new Set([...prev, clubId]));
    setClubs((prev) => prev.map((c) => (c.id === clubId ? { ...c, member_count: c.member_count + 1 } : c)));
  };

  const leaveClub = async (clubId: string) => {
    if (!userId) return;
    await supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', userId);
    setJoinedIds((prev) => { const n = new Set(prev); n.delete(clubId); return n; });
    setClubs((prev) => prev.map((c) => (c.id === clubId ? { ...c, member_count: Math.max(0, c.member_count - 1) } : c)));
  };

  const createClub = async () => {
    if (!userId) { onLogin(); return; }
    if (!newName.trim()) { setError('Please enter a club name.'); return; }
    setCreating(true); setError(null);
    const { data, error: err } = await supabase
      .from('clubs')
      .insert({ name: newName.trim(), description: newDesc.trim(), founder_id: userId })
      .select().maybeSingle();
    if (err) { setError(err.message); setCreating(false); return; }
    if (data) {
      await supabase.from('club_members').insert({ club_id: data.id, user_id: userId, role: 'founder' });
      setClubs((prev) => [data as Club, ...prev]);
      setJoinedIds((prev) => new Set([...prev, data.id]));
      setNewName(''); setNewDesc(''); setShowCreate(false);
    }
    setCreating(false);
  };

  const filtered = clubs.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
            Chess <span className="shimmer-text">Clubs</span>
          </h2>
          <p className="mt-1 text-sm text-navy-400">Create or join clubs for internal tournaments and leaderboards</p>
        </div>
        <button onClick={() => (userId ? setShowCreate(true) : onLogin())} className="btn-primary">
          <Plus size={18} />
          Create Club
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clubs by name or description…"
          className="w-full rounded-full border border-white/10 bg-navy-700 py-3 pl-12 pr-4 text-sm text-white outline-none transition-all placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
        />
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 size={32} className="animate-spin text-royal-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-navy-700/80 p-12 text-center shadow-card">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-royal-500/15">
            <Users size={26} className="text-royal-400" />
          </div>
          <p className="text-sm font-semibold text-navy-300">
            {search ? 'No clubs found matching your search.' : 'No clubs yet. Create the first one!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((club) => {
            const joined = joinedIds.has(club.id);
            return (
              <div key={club.id} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-navy-700/80 p-5 shadow-card backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-card-lg">
                <div className="flex items-start justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-grad shadow-glow-sm">
                    <Users size={22} className="text-white" />
                  </div>
                  {joined && (
                    <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                      <Check size={11} /> Joined
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-white">{club.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-navy-300">{club.description || 'No description provided.'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-navy-400">
                    <Users size={14} /> {club.member_count} member{club.member_count !== 1 ? 's' : ''}
                  </div>
                  {joined ? (
                    <button onClick={() => leaveClub(club.id)} className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-navy-300 transition-colors hover:bg-navy-600">Leave</button>
                  ) : (
                    <button onClick={() => joinClub(club.id)} className="rounded-full bg-blue-grad px-4 py-2 text-xs font-bold text-white shadow-glow-sm transition-transform hover:translate-y-[-1px]">Join Club</button>
                  )}
                </div>
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-royal-400/10 blur-2xl transition-all duration-500 group-hover:bg-royal-400/25" />
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-navy-900/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg animate-pop-in">
            <div className="relative overflow-hidden bg-blue-grad px-6 pb-6 pt-6">
              <button onClick={() => setShowCreate(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30">
                <X size={16} />
              </button>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                  <Plus size={18} className="text-white" />
                </span>
                <div>
                  <p className="font-display text-lg font-extrabold text-white">Create a Club</p>
                  <p className="text-xs text-royal-100">Build your chess community</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-400">Club Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Grandmaster Society" maxLength={50}
                  className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-3 text-sm font-semibold text-white outline-none transition-all placeholder:font-normal placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-400">Description</label>
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} placeholder="What is your club about?" maxLength={200}
                  className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20" />
              </div>
              {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
              <button onClick={createClub} disabled={creating} className="btn-primary w-full disabled:opacity-60">
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Crown size={18} />}
                Create Club
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
