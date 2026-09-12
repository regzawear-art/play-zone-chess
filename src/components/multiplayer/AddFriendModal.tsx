import React, { useState } from 'react';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';

export default function AddFriendModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await multiplayer.sendFriendRequest(q);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Friend request sent', type: 'success' } }));
      onClose();
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes('self-invite')) {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "You can't add yourself", type: 'info' } }));
      } else {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Failed to send friend request', type: 'error' } }));
      }
    } finally { setSending(false); }
  };

  return (
    <div className="fixed left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-navy-800 p-4 mx-4 sm:mx-0">
        <h3 className="mb-2 text-sm font-bold text-white">Add Friend</h3>
        <input value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded p-3 text-sm text-white placeholder:text-navy-400 bg-navy-700" placeholder="username, email or id" />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="text-sm">Cancel</button>
          <button onClick={send} disabled={sending} className="btn btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}
