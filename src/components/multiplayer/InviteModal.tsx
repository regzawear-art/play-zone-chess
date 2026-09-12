import React, { useState, useEffect } from 'react';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';
import SuggestionList from './SuggestionList';

export default function InviteModal({ onClose }: { onClose: () => void }) {
  const [toUser, setToUser] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [focusedSuggestion, setFocusedSuggestion] = useState<number>(-1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const q = toUser.trim();
      if (!q || q.length < 1) { setSuggestions([]); return; }
      setLoadingSuggestions(true);
      try {
        const res = await multiplayer.searchPlayers(q, 6);
        if (!cancelled) setSuggestions(res || []);
      } catch (e) {
        if (!cancelled) setSuggestions([]);
      } finally { if (!cancelled) setLoadingSuggestions(false); }
    };

    const t = setTimeout(load, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [toUser]);

  const send = async () => {
    setSending(true);
    try {
      // prevent self-invite
      const u = await (await import('../../lib/supabase')).supabase.auth.getUser();
      const myId = u.data?.user?.id;
      // resolve target id quickly
      let targetId = toUser;
      if (!/^[0-9a-fA-F-]{8,}$/.test(toUser)) {
        // try username lookup
        const byU = await (await import('../../lib/supabase')).supabase.from('profiles').select('id,username').eq('username', toUser).maybeSingle();
        if (byU?.data?.id) targetId = byU.data.id;
      }
      if (targetId && myId && targetId === myId) {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "You can't invite yourself", type: 'info' } }));
        setSending(false);
        return;
      }
      const res = await multiplayer.sendInvite(toUser, {});
      // eslint-disable-next-line no-console
      console.log('invite sent', res);
      onClose();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('invite failed', e);
    } finally { setSending(false); }
  };

  return (
    <div className="fixed left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-navy-800 p-4 mx-4 sm:mx-0">
        <h3 className="mb-2 text-sm font-bold text-white">Send Invite</h3>
        <div className="relative">
          <input value={toUser} onChange={(e) => setToUser(e.target.value)} className="w-full rounded p-3 text-sm text-white placeholder:text-navy-400 bg-navy-700" placeholder="username, email or id" />
          {suggestions.length > 0 && (
            <SuggestionList
              items={suggestions}
              onSelect={async (s) => {
                try {
                  await multiplayer.sendInvite(s.id, {});
                  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Invite sent', type: 'success' } }));
                  onClose();
                } catch (err) {
                  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Failed to send invite', type: 'error' } }));
                }
              }}
              containerClassName="absolute left-0 w-full z-50 mt-1"
            />
          )}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="text-sm">Cancel</button>
          <button onClick={send} disabled={sending} className="btn btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}
