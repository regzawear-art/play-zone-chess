import React, { useState, useEffect } from 'react';
import useFriends from '../../hooks/useFriends';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';
import { UserPlus } from 'lucide-react';
import SuggestionList from './SuggestionList';

export default function FriendList({ compact }: { compact?: boolean } = {}) {
  const { friends } = useFriends();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const challenge = async (idOrUsername: string) => {
    try {
      // allow passing username or id; lookup id if necessary
      let targetId = idOrUsername;
      if (!/^[0-9a-fA-F-]{8,}$/.test(idOrUsername)) {
        const matches = await multiplayer.searchPlayers(idOrUsername, 1);
        if (matches && matches.length > 0) targetId = matches[0].id;
      }
      await multiplayer.sendInvite(targetId, { type: 'challenge' });
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Challenge sent', type: 'success' } }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('send invite failed', e);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Failed to send challenge', type: 'error' } }));
    }
  };

  const onSearch = async (q: string) => {
    setSearch(q);
    if (!q || q.trim().length < 1) { setResults([]); return; }
    try {
      const res = await multiplayer.searchPlayers(q, 6);
      setResults(res || []);
    } catch (_) { setResults([]); }
  };

  return (
    <div className={`rounded-xl border border-white/8 bg-navy-750 ${compact ? 'p-2' : 'p-3'}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Friends</h3>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-add-friend'))}
          title="Add friend"
          aria-label="Add friend"
          className="flex items-center gap-2 text-navy-300 hover:text-white"
        >
          <UserPlus size={14} />
          <span className="hidden sm:inline text-xs">Add</span>
        </button>
      </div>
      <div className="mb-2">
        <div className="relative">
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search by username, email or id" className="w-full rounded-md bg-navy-700 px-3 py-2 text-sm text-white outline-none placeholder:text-navy-400" />
        </div>
        {results.length > 0 && (
          <div className="mt-1 rounded border border-white/6 bg-navy-800">
            <SuggestionList
              items={results}
              onSelect={async (r) => {
                try {
                  await multiplayer.sendFriendRequest(r.id);
                  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Friend request sent', type: 'success' } }));
                } catch (e) {
                  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Failed to send friend request', type: 'error' } }));
                }
              }}
              containerClassName=""
            />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {friends.length === 0 && <p className="text-sm text-navy-300">No friends yet</p>}
        {friends.map((f: any) => (
          <div key={f.id} className="flex items-center justify-between rounded-md bg-navy-700 px-3 py-2">
            <div>
              <div className="text-sm font-semibold text-white truncate">{f.username ?? f.id}</div>
              <div className="text-xs text-navy-300">{f.status}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => challenge(f.id)} className="text-xs text-navy-200 hover:text-white">Challenge</button>
              <button onClick={async () => {
                try {
                  await navigator.clipboard.writeText(f.username ?? f.id);
                  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Friend copied', type: 'success' } }));
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.warn('copy failed', e);
                  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Copy failed', type: 'error' } }));
                }
              }} className="text-xs text-navy-200 hover:text-white">Copy</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
