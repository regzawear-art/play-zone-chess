import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import multiplayer from '@/lib/multiplayer/supabase-multiplayer';

type RequestRow = { id: string; user_id: string; friend_id: string; status: string };

export default function FriendRequestsPanel() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const u = await supabase.auth.getUser();
      const uid = u.data?.user?.id;
      if (!uid) { setRequests([]); setLoading(false); return; }
      const { data } = await supabase.from('friends').select('*').or(`friend_id.eq.${uid}`).eq('status','pending');
      if (data) setRequests(data as RequestRow[]);
    } catch (e) {
      setRequests([]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel('public:friends')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const accept = async (id: string) => {
    try {
      await multiplayer.acceptFriendRequest(id);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Friend request accepted', type: 'success' } }));
      load();
    } catch (e) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Could not accept friend', type: 'error' } }));
    }
  };

  const reject = async (id: string) => {
    try {
      await supabase.from('friends').update({ status: 'rejected' }).eq('id', id);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Friend request rejected', type: 'info' } }));
      load();
    } catch (e) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Could not reject friend', type: 'error' } }));
    }
  };

  if (loading) return <div className="text-sm text-navy-300 p-2">Loading…</div>;
  if (!requests || requests.length === 0) return <div className="text-sm text-navy-300 p-2">No friend requests</div>;

  return (
    <div className="space-y-2 p-1">
      {requests.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-md bg-navy-700 px-2 py-1">
          <div className="text-sm text-white truncate">{r.user_id}</div>
          <div className="flex gap-2">
            <button onClick={() => accept(r.id)} className="text-xs text-emerald-300">Accept</button>
            <button onClick={() => reject(r.id)} className="text-xs text-red-300">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
