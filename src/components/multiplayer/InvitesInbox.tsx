import React, { useState } from 'react';
import useInvites from '../../hooks/useInvites';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';

export default function InvitesInbox({ onClose }: { onClose?: () => void }) {
  const { invites } = useInvites();
  const [localUpdating, setLocalUpdating] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(true);
  // patch: no-op edit to trigger patch tool

  const accept = async (id: string) => {
    try {
      const game = await multiplayer.acceptInvite(id);
      // eslint-disable-next-line no-console
      console.log('accepted invite, created game', game);
      // notify app to open the online game view
      try {
        const evt = new CustomEvent('online-game-created', { detail: game });
        window.dispatchEvent(evt);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('failed dispatching online-game-created', e);
      }
      if (onClose) onClose();
      // provide small UI feedback by updating invite status locally until realtime updates arrive
      setLocalUpdating((s) => ({ ...s, [id]: 'accepted' }));
      // auto-close the inbox after accept
      setTimeout(() => setVisible(false), 300);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('accept failed', e);
    }
  };

  const reject = async (id: string) => {
    try {
      await (await import('../../lib/supabase')).supabase.from('invites').update({ status: 'rejected' }).eq('id', id);
      // eslint-disable-next-line no-console
      console.log('rejected', id);
      setLocalUpdating((s) => ({ ...s, [id]: 'rejected' }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('reject failed', e);
    }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-navy-750 p-3 w-96">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Invites</h3>
        <div>
          <button onClick={() => setVisible(false)} className="text-xs text-navy-300 hover:text-white">X</button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {invites.length === 0 && <p className="text-sm text-navy-300">No invites</p>}
        {!visible && <p className="text-sm text-navy-300">Closed</p>}
        {invites.map((inv: any) => (
          <div key={inv.id} className="flex items-center justify-between rounded-md bg-navy-700 px-3 py-2">
            <div>
              <div className="text-sm font-semibold text-white">From: {inv.from_user}</div>
              <div className="text-xs text-navy-300">{inv.payload?.note || ''}</div>
            </div>
            <div className="flex items-center gap-2">
              {localUpdating[inv.id] ? (
                <span className="text-xs rounded px-2 py-1 text-navy-200">{localUpdating[inv.id]}</span>
              ) : (
                <>
                  <button onClick={() => accept(inv.id)} className="text-xs rounded bg-emerald-600/10 px-2 py-1 text-emerald-300 hover:bg-emerald-600/20">Accept</button>
                  <button onClick={() => reject(inv.id)} className="text-xs rounded bg-red-600/10 px-2 py-1 text-red-300 hover:bg-red-600/20">Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
