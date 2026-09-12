
import { useCallback, useEffect, useState } from 'react';
import {
  Gift,
  Copy,
  Check,
  Users,
  Loader2,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getStoredCurrency } from '@/data/countries';

interface Props {
  userId: string | null;
  onLogin: () => void;
  onReferralComplete: (referredEmail: string) => void;
}

const REFERRAL_BONUS = 999;

export function ReferralSection({
  userId,
  onLogin,
  onReferralComplete,
}: Props) {
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<
    { referred_id: string; bonus_inr: number; created_at: string }[]
  >([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [suggestions, setSuggestions] = useState<
    { id: string; username?: string; email?: string }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currency = getStoredCurrency();

  const loadData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    const username = profile?.username ?? userId.slice(0, 8);

    setReferralCode(`GAMBIT - ${ username.toUpperCase() } `);

    const { data: refs } = await supabase
      .from('referrals')
      .select('referred_id, bonus_inr, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (refs) {
      setReferrals(refs as typeof referrals);

      setTotalEarned(
        refs.reduce((sum, r) => sum + Number(r.bonus_inr), 0)
      );
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadData();
  }, [userId, loadData]);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  const shareLink = `https://${window.location.host}?ref=${referralCode}`;

const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    });
};

/* ============================================================
   AUTOCOMPLETE
============================================================ */
useEffect(() => {
    let mounted = true;

    const fetchSuggestions = async () => {
        if (!inviteEmail || inviteEmail.trim().length < 1) {
            setSuggestions([]);
            return;
        }

        try {
            const res = await import(
                '@/lib/multiplayer/supabase-multiplayer'
            ).then((m) =>
                m.searchPlayers(inviteEmail.trim(), 6)
            );

            if (!mounted) return;

            setSuggestions(
                (res || []).map((s) => ({
                    id: s.id,
                    username: s.username,
                    email: s.email,
                }))
            );
        } catch {
            setSuggestions([]);
        }
    };

    const timeout = window.setTimeout(
        fetchSuggestions,
        150
    );

    return () => {
        mounted = false;
        window.clearTimeout(timeout);
    };
}, [inviteEmail]);

/* ============================================================
   SUBMIT REFERRAL
============================================================ */
const submitReferral = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
        onLogin();
        return;
    }

    setError(null);
    setSuccess(null);

    if (!inviteEmail.trim()) {
        setError('Please enter an email address.');
        return;
    }

    setSubmitting(true);

    try {
        const input = inviteEmail.trim();

        let referredUser: any = null;

        const username = input.includes('@')
            ? input.split('@')[0]
            : input;

        /* Try username first */
        try {
            const byUsername = await supabase
                .from('profiles')
                .select('id,username,email')
                .eq('username', username)
                .maybeSingle();

            if (byUsername.data) {
                referredUser = byUsername.data;
            }
        } catch (err) {
            console.warn(
                '[referral] username lookup failed',
                err
            );
        }

        /* Fallback to email */
        if (!referredUser) {
            try {
                const byEmail = await supabase
                    .from('profiles')
                    .select('id,username,email')
                    .eq('email', input)
                    .maybeSingle();

                if (byEmail.data) {
                    referredUser = byEmail.data;
                }
            } catch (err) {
                console.warn(
                    '[referral] email lookup failed, falling back to username local-part',
                    err
                );

                const uname = input.split('@')[0];

                if (uname) {
                    try {
                        const byU = await supabase
                            .from('profiles')
                            .select('id,username')
                            .eq('username', uname)
                            .maybeSingle();

                        if (byU.data) {
                            referredUser = byU.data;
                        }
                    } catch {
                        // Ignore fallback error
                    }
                }
            }
        }

        if (!referredUser) {
            setError(
                'User not found. Ask your friend to sign up first or share your referral link.'
            );

            setSubmitting(false);
            return;
        }

        if (referredUser.id === userId) {
            setError('You cannot refer yourself!');
            setSubmitting(false);
            return;
        }

        const { data: existing } = await supabase
            .from('referrals')
            .select('id')
            .eq('referrer_id', userId)
            .eq('referred_id', referredUser.id)
            .maybeSingle();

        if (existing) {
            setError('You have already referred this user.');
            setSubmitting(false);
            return;
        }

        const { error: refErr } = await supabase
            .from('referrals')
            .insert({
                referrer_id: userId,
                referred_id: referredUser.id,
                referral_code: referralCode,
                bonus_inr: REFERRAL_BONUS,
                status: 'completed',
            });

        if (refErr) {
            throw refErr;
        }

        onReferralComplete(inviteEmail.trim());

        setSuccess(
            `Referral successful! ${formatCurrency(
                REFERRAL_BONUS,
                currency
            )} bonus credited to your wallet.`
        );

        setInviteEmail('');

        await loadData();
    } catch (err) {
        setError(
            err instanceof Error
                ? err.message
                : 'Referral failed. Please try again.'
        );
    } finally {
        setSubmitting(false);
    }
};

/* ============================================================
   LOADING
============================================================ */
if (loading) {
    return (
        <div className="flex justify-center py-8 sm:py-12">
            <Loader2
                size={28}
                className="animate-spin text-royal-400"
            />
        </div>
    );
}

/* ============================================================
   LOGGED OUT
============================================================ */
if (!userId) {
    return (
        <div
            className="
          mx-auto
          w-full
          max-w-lg
          min-w-0
          overflow-hidden
          rounded-xl
          border
          border-white/10
          bg-navy-700/50
          p-5
          text-center
          sm:rounded-2xl
          sm:p-8
        "
        >
            <Gift
                size={40}
                className="mx-auto text-royal-400"
            />

            <h3 className="mt-4 font-display text-xl font-extrabold text-white">
                Earn {formatCurrency(REFERRAL_BONUS, currency)} per Referral
            </h3>

            <p className="mt-2 text-sm text-navy-300">
                Sign in to get your unique referral code and
                start earning bonuses for every friend you invite.
            </p>

            <button
                onClick={onLogin}
                className="btn-primary mt-5"
            >
                Sign In to Get Started
            </button>
        </div>
    );
}

/* ============================================================
   MAIN
============================================================ */
return (
    <div
        className="
        mx-auto
        w-full
        max-w-5xl
        min-w-0
        space-y-3
        overflow-hidden
        px-0
        sm:space-y-6
        sm:px-4
      "
    >
        {/* ========================================================
          BONUS HIGHLIGHT
      ======================================================== */}
        <div
            className="
          relative
          w-full
          min-w-0
          overflow-hidden
          rounded-xl
          bg-gradient-to-br
          from-royal-500/20
          via-navy-700
          to-navy-700
          p-3.5
          ring-1
          ring-royal-400/20
          sm:rounded-2xl
          sm:p-6
        "
        >
            <div
                className="
            pointer-events-none
            absolute
            -right-8
            -top-8
            h-24
            w-24
            rounded-full
            bg-royal-500/20
            blur-3xl
            sm:h-32
            sm:w-32
          "
            />

            <div
                className="
            relative
            flex
            min-w-0
            flex-col
            gap-3
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:gap-4
          "
            >
                {/* Left side */}
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className="
                grid
                h-10
                w-10
                shrink-0
                place-items-center
                rounded-lg
                bg-gradient-to-br
                from-royal-400
                to-royal-600
                shadow-glow-sm
                sm:h-14
                sm:w-14
                sm:rounded-2xl
              "
                    >
                        <Gift
                            size={22}
                            className="text-white sm:size-28"
                        />
                    </div>

                    <div className="min-w-0">
                        <h3 className="font-display text-base font-extrabold text-white sm:text-2xl">
                            Earn {formatCurrency(REFERRAL_BONUS, currency)}
                        </h3>

                        <p className="mt-0.5 truncate text-xs text-royal-100 sm:text-sm">
                            for every friend who joins!
                        </p>
                    </div>
                </div>

                {/* Total earned */}
                <div
                    className="
              flex
              min-w-0
              items-center
              justify-between
              gap-3
              rounded-lg
              bg-navy-800/30
              px-3
              py-2
              sm:block
              sm:bg-transparent
              sm:px-0
              sm:py-0
              sm:text-center
            "
                >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-royal-100 sm:text-xs">
                        Total Earned
                    </p>

                    <p className="font-display text-lg font-extrabold text-emerald-400 sm:text-3xl">
                        {formatCurrency(totalEarned, currency)}
                    </p>
                </div>
            </div>
        </div>

        {/* ========================================================
          CODE + INVITE
      ======================================================== */}
        <div
            className="
          grid
          w-full
          min-w-0
          grid-cols-1
          gap-3
          sm:gap-4
          lg:grid-cols-2
        "
        >
            {/* ======================================================
            REFERRAL CODE
        ======================================================= */}
            <div
                className="
            w-full
            min-w-0
            overflow-hidden
            rounded-xl
            border
            border-white/10
            bg-navy-700/50
            p-3
            sm:rounded-2xl
            sm:p-5
          "
            >
                <h4 className="mb-3 flex min-w-0 items-center gap-2 text-sm font-bold text-white">
                    <Share2
                        size={16}
                        className="shrink-0 text-royal-400"
                    />

                    <span className="truncate">
                        Your Referral Code
                    </span>
                </h4>

                {/* Referral code */}
                <div className="flex w-full min-w-0 items-stretch gap-2">
                    <div
                        className="
                min-w-0
                flex-1
                overflow-hidden
                rounded-xl
                border
                border-dashed
                border-royal-400/40
                bg-royal-500/5
                px-2
                py-2.5
                text-center
                font-mono
                text-xs
                font-bold
                text-royal-300
                sm:px-4
                sm:py-3
                sm:text-lg
              "
                        title={referralCode}
                    >
                        <span className="block truncate">
                            {referralCode}
                        </span>
                    </div>

                    <button
                        onClick={copyCode}
                        className="
                grid
                h-10
                w-10
                shrink-0
                place-items-center
                rounded-xl
                bg-navy-600
                text-white
                transition-colors
                hover:bg-navy-500
                sm:h-11
                sm:w-11
              "
                        title="Copy code"
                    >
                        {copied ? (
                            <Check
                                size={17}
                                className="text-emerald-400"
                            />
                        ) : (
                            <Copy size={17} />
                        )}
                    </button>
                </div>

                {/* Share link */}
                <div className="mt-3 min-w-0">
                    <p className="mb-1.5 text-xs font-semibold text-navy-300">
                        Share this link:
                    </p>

                    <div className="flex w-full min-w-0 items-stretch gap-2">
                        <div
                            className="
                  min-w-0
                  flex-1
                  overflow-hidden
                  rounded-xl
                  bg-navy-600
                  px-2.5
                  py-2.5
                  text-[11px]
                  leading-relaxed
                  text-navy-200
                  break-all
                  sm:px-3
                  sm:text-sm
                "
                        >
                            {shareLink}
                        </div>

                        <button
                            onClick={copyShareLink}
                            className="
                  grid
                  h-10
                  w-10
                  shrink-0
                  place-items-center
                  rounded-xl
                  bg-navy-600
                  text-white
                  transition-colors
                  hover:bg-navy-500
                "
                            title="Copy link"
                        >
                            {copied ? (
                                <Check
                                    size={16}
                                    className="text-emerald-400"
                                />
                            ) : (
                                <Copy size={16} />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* ======================================================
            INVITE FRIEND
        ======================================================= */}
            <div
                className="
            relative
            w-full
            min-w-0
            overflow-visible
            rounded-xl
            border
            border-white/10
            bg-navy-700/50
            p-3
            sm:rounded-2xl
            sm:p-5
          "
            >
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                    <Users
                        size={16}
                        className="shrink-0 text-royal-400"
                    />

                    <span>Invite a Friend</span>
                </h4>

                <form
                    onSubmit={submitReferral}
                    className="min-w-0 space-y-3"
                >
                    <input
                        type="text"
                        placeholder="username, email or id"
                        value={inviteEmail}
                        onChange={(e) =>
                            setInviteEmail(e.target.value)
                        }
                        className="
                w-full
                min-w-0
                rounded-xl
                border
                border-white/10
                bg-navy-600
                px-3
                py-2.5
                text-sm
                font-medium
                text-white
                outline-none
                transition-all
                placeholder:text-navy-400
                focus:border-royal-400
                focus:ring-2
                focus:ring-royal-400/20
              "
                    />

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div
                            className="
                  absolute
                  left-3
                  right-3
                  top-[calc(100%-0.25rem)]
                  z-20
                  max-h-40
                  min-w-0
                  overflow-x-hidden
                  overflow-y-auto
                  rounded-xl
                  border
                  border-white/10
                  bg-navy-800
                  p-1
                  shadow-card-lg
                  sm:left-5
                  sm:right-5
                  sm:top-[calc(100%+0.25rem)]
                "
                        >
                            {suggestions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        setInviteEmail(
                                            s.username ||
                                            s.email ||
                                            s.id
                                        );
                                        setSuggestions([]);
                                    }}
                                    className="
                      block
                      w-full
                      min-w-0
                      truncate
                      rounded-lg
                      px-2
                      py-2
                      text-left
                      text-sm
                      text-navy-200
                      hover:bg-navy-700
                    "
                                >
                                    {s.username ?? s.email ?? s.id}
                                </button>
                            ))}
                        </div>
                    )}

                    {error && (
                        <p className="break-words text-sm text-red-400">
                            {error}
                        </p>
                    )}

                    {success && (
                        <p className="break-words text-sm text-emerald-400">
                            {success}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="
                btn-primary
                w-full
                min-w-0
                disabled:opacity-60
              "
                    >
                        {submitting ? (
                            <>
                                <Loader2
                                    size={16}
                                    className="shrink-0 animate-spin"
                                />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <span className="truncate">
                                    Invite & Earn{' '}
                                    {formatCurrency(
                                        REFERRAL_BONUS,
                                        currency
                                    )}
                                </span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>

        {/* ========================================================
          REFERRAL HISTORY
      ======================================================== */}
        {referrals.length > 0 && (
            <div
                className="
            w-full
            min-w-0
            overflow-hidden
            rounded-xl
            border
            border-white/10
            bg-navy-700/50
            p-3
            sm:rounded-2xl
            sm:p-5
          "
            >
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                    <TrendingUp
                        size={16}
                        className="shrink-0 text-emerald-400"
                    />

                    <span>Referral History</span>
                </h4>

                <ul className="min-w-0 space-y-2">
                    {referrals.map((r, i) => (
                        <li
                            key={i}
                            className="
                  flex
                  min-w-0
                  items-center
                  gap-2
                  overflow-hidden
                  rounded-xl
                  bg-navy-600
                  p-2.5
                  sm:gap-3
                  sm:p-3
                "
                        >
                            <div
                                className="
                    grid
                    h-9
                    w-9
                    shrink-0
                    place-items-center
                    rounded-lg
                    bg-emerald-500/15
                    text-emerald-400
                  "
                            >
                                <Gift size={16} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-white">
                                    Referral #{i + 1}
                                </p>

                                <p className="truncate text-xs text-navy-400">
                                    {new Date(
                                        r.created_at
                                    ).toLocaleDateString()}
                                </p>
                            </div>

                            <span className="shrink-0 font-display text-xs font-extrabold text-emerald-400 sm:text-sm">
                                +
                                {formatCurrency(
                                    Number(r.bonus_inr),
                                    currency
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);
}
