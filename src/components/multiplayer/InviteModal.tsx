import React, { useState } from 'react';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';

export default function InviteModal({ onClose }: { onClose: () => void }) {
  const [toUser, setToUser] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
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
      <div className="w-96 rounded-xl bg-navy-800 p-4">
        <h3 className="mb-2 text-sm font-bold text-white">Send Invite</h3>
        <input value={toUser} onChange={(e) => setToUser(e.target.value)} className="w-full rounded p-2" placeholder="Recipient user id" />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="text-sm">Cancel</button>
          <button onClick={send} disabled={sending} className="btn btn-primary">Send</button>
        </div>
      </div>
    </div>
  );
}
