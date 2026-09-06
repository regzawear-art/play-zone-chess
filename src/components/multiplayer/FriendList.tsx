import React from 'react';
import useFriends from '../../hooks/useFriends';
import { UserPlus } from 'lucide-react';

export default function FriendList() {
  const { friends } = useFriends();

  return (
    <div className="rounded-xl border border-white/8 bg-navy-750 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Friends</h3>
        <button className="text-navy-300 hover:text-white"><UserPlus size={14} /></button>
      </div>
      <div className="flex flex-col gap-2">
        {friends.length === 0 && <p className="text-sm text-navy-300">No friends yet</p>}
        {friends.map((f: any) => (
          <div key={f.id} className="flex items-center justify-between rounded-md bg-navy-700 px-3 py-2">
            <div>
              <div className="text-sm font-semibold text-white">{f.friend_id}</div>
              <div className="text-xs text-navy-300">{f.status}</div>
            </div>
            <div>
              <button onClick={async () => { try { await navigator.clipboard.writeText(f.friend_id); /* eslint-disable-next-line no-console */ console.log('copied friend id'); } catch (e) { /* eslint-disable-next-line no-console */ console.warn('copy failed', e); } }} className="text-xs text-navy-200 hover:text-white">Copy ID</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
