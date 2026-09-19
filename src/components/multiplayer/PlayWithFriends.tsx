import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Mail, UserPlus } from 'lucide-react';
import { FriendList } from './FriendList';
import InvitesInbox from './InvitesInbox';

interface Props {
  onClose: () => void;
}

type Tab = 'friends' | 'invites';

/**
 * Page-level Friends dialog.
 *
 * Rendered through a portal so it cannot be trapped by an ancestor's
 * stacking context, transform, overflow, or z-index.
 */
export default function PlayWithFriends({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="friends-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy-800 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0 pr-4">
            <h2
              id="friends-dialog-title"
              className="flex items-center gap-2 text-lg font-bold text-white"
            >
              <Users size={19} className="text-royal-400" />
              Friends
            </h2>
            <p className="mt-1 text-xs text-navy-300">
              Manage friends and game invitations in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-navy-700 text-navy-200 transition hover:bg-navy-600 hover:text-white"
            aria-label="Close friends"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1 border-b border-white/10 bg-navy-850 px-4 pt-3 sm:px-6">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              activeTab === 'friends'
                ? 'border-royal-400 bg-navy-700 text-white'
                : 'border-transparent text-navy-300 hover:bg-navy-700/60 hover:text-white'
            }`}
          >
            <UserPlus size={16} />
            Friends
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invites')}
            className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-bold transition ${
              activeTab === 'invites'
                ? 'border-royal-400 bg-navy-700 text-white'
                : 'border-transparent text-navy-300 hover:bg-navy-700/60 hover:text-white'
            }`}
          >
            <Mail size={16} />
            Invites
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'friends' ? (
            <FriendList />
          ) : (
            <InvitesInbox onClose={undefined} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
