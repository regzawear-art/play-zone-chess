import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, MapPin, Send, MessageCircle, Shield, BookOpen, HelpCircle, Info, FileText, Loader2, Trophy, Target, Calendar, Briefcase, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type PageId = 'about' | 'privacy' | 'terms' | 'contact' | 'faq' | 'rules' | 'tournaments' | 'puzzles' | 'forums' | 'events' | 'careers' | 'blog' | 'press' | 'status';

interface Props {
  page: PageId;
  onBack: () => void;
}

const PAGE_META: Record<PageId, { title: string; icon: typeof Info; description: string }> = {
  about: { title: 'About Us', icon: Info, description: 'Learn about Gambit Royale' },
  privacy: { title: 'Privacy Policy', icon: Shield, description: 'How we handle your data' },
  terms: { title: 'Terms of Service', icon: FileText, description: 'Our terms and conditions' },
  contact: { title: 'Contact Us', icon: Mail, description: 'Get in touch with our team' },
  faq: { title: 'Help Center', icon: HelpCircle, description: 'Frequently asked questions' },
  rules: { title: 'How to Play', icon: BookOpen, description: 'Chess rules and guides' },
  tournaments: { title: 'Tournaments', icon: Trophy, description: 'Daily and weekly competitions' },
  puzzles: { title: 'Puzzles', icon: Target, description: 'Sharpen your tactical vision' },
  forums: { title: 'Forums', icon: MessageCircle, description: 'Community discussions' },
  events: { title: 'Events', icon: Calendar, description: 'Live events and broadcasts' },
  careers: { title: 'Careers', icon: Briefcase, description: 'Join our team' },
  blog: { title: 'Blog', icon: BookOpen, description: 'Chess news and strategy' },
  press: { title: 'Press Kit', icon: FileText, description: 'Brand assets and media' },
  status: { title: 'System Status', icon: Activity, description: 'Platform health and uptime' },
};

export function FooterPage({ page, onBack }: Props) {
  const meta = PAGE_META[page];
  const Icon = meta.icon;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  return (
    <div className="min-h-screen bg-navy-800 pt-28 pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-semibold text-white shadow-card transition-all hover:shadow-glow-sm"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>

        <div className="rounded-3xl border border-white/10 bg-navy-700/80 p-6 shadow-card-lg backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-grad shadow-glow-sm">
              <Icon size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{meta.title}</h1>
              <p className="text-sm text-navy-400">{meta.description}</p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-white">
            {page === 'about' && <AboutContent />}
            {page === 'privacy' && <PrivacyContent />}
            {page === 'terms' && <TermsContent />}
            {page === 'contact' && <ContactContent />}
            {page === 'faq' && <FaqContent />}
            {page === 'rules' && <RulesContent />}
            {['tournaments', 'puzzles', 'forums', 'events', 'careers', 'blog', 'press', 'status'].includes(page) && (
              <ComingSoon title={meta.title} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-navy-600">
        <Trophy size={28} className="text-royal-400" />
      </div>
      <h3 className="font-display text-xl font-bold text-white">{title} — Coming Soon</h3>
      <p className="mt-2 text-sm text-navy-400">
        We're working hard to bring this feature to life. Check back soon for updates!
      </p>
      <p className="mt-4 text-xs text-navy-400">
        In the meantime, enjoy our fully playable AI, Pass &amp; Play, and Private Room game modes.
      </p>
    </div>
  );
}

function AboutContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-white">
      <p>
        Gambit Royale is a premium online chess platform built for players of every level — from
        beginners making their first moves to grandmasters refining their craft. Our mission is to make
        chess accessible, beautiful, and competitive for everyone, everywhere.
      </p>
      <p>
        Founded in 2024, we've grown to a vibrant community of players across 180+ countries. Our platform
        offers real-time matchmaking, AI training across multiple difficulty levels, private rooms for
        games with friends, clubs for community building, and competitive play.
      </p>
      <p>
        We believe chess is more than a game — it's a universal language that connects people across
        cultures and generations. That's why we invest heavily in fair play technology, beautiful design,
        and a welcoming community for all.
      </p>
      <div className="grid grid-cols-3 gap-3 pt-4">
        {[
          { k: '180+', v: 'Countries' },
          { k: '48', v: 'Daily matches' },
          { k: '99.9%', v: 'Uptime' },
        ].map((s) => (
          <div key={s.v} className="rounded-2xl bg-navy-600 p-4 text-center">
            <p className="font-display text-xl font-extrabold text-white">{s.k}</p>
            <p className="text-xs text-navy-400">{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-white">
      <p>Last updated: August 2026</p>
      <h3 className="font-display text-lg font-bold text-white">1. Information We Collect</h3>
      <p>
        We collect your email address, display name, country, and gameplay statistics when you create an
        account. We also store match history, chat messages in private rooms, and device information for
        security purposes.
      </p>
      <h3 className="font-display text-lg font-bold text-white">2. How We Use Your Data</h3>
      <p>
        Your data is used to provide matchmaking, maintain leaderboards, display profiles, prevent
        cheating, and improve our services. We never sell your personal information to third parties.
      </p>
      <h3 className="font-display text-lg font-bold text-white">3. Data Storage & Security</h3>
      <p>
        All data is encrypted in transit and at rest. Passwords are hashed using industry-standard
        algorithms. Access to personal data is restricted to authorized personnel only.
      </p>
      <h3 className="font-display text-lg font-bold text-white">4. Your Rights</h3>
      <p>
        You can request a copy of your data, update your profile, or delete your account at any time from
        your settings page. Contact us at privacy@gambitroyale.com for data requests.
      </p>
      <h3 className="font-display text-lg font-bold text-white">5. Cookies</h3>
      <p>
        We use essential cookies to maintain your session and preferences. No third-party tracking cookies
        are used without your consent.
      </p>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-white">
      <p>Last updated: August 2026</p>
      <h3 className="font-display text-lg font-bold text-white">1. Acceptance of Terms</h3>
      <p>
        By creating an account or using Gambit Royale, you agree to these terms. If you do not agree,
        please discontinue use of the platform.
      </p>
      <h3 className="font-display text-lg font-bold text-white">2. Fair Play Policy</h3>
      <p>
        Cheating, using chess engines during rated games, multi-accounting, or any form of unfair
        assistance is strictly prohibited. Violations result in account suspension and rating reset.
      </p>
      <h3 className="font-display text-lg font-bold text-white">3. Welcome Bonus</h3>
      <p>
        New users receive a $50 USD welcome bonus upon first sign-up. This bonus is non-transferable,
        cannot be withdrawn, and is intended for use in tournaments and premium features. Abuse of the
        bonus system may result in forfeiture.
      </p>
      <h3 className="font-display text-lg font-bold text-white">4. User Conduct</h3>
      <p>
        Harassment, hate speech, spam, or inappropriate content in chat or profiles is not tolerated.
        Report violations through the in-game report system or contact support.
      </p>
      <h3 className="font-display text-lg font-bold text-white">5. Account Security</h3>
      <p>
        You are responsible for keeping your password secure. Notify us immediately of any unauthorized
        access to your account.
      </p>
      <h3 className="font-display text-lg font-bold text-white">6. Service Availability</h3>
      <p>
        We strive for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance and
        unexpected outages may occur.
      </p>
    </div>
  );
}

function ContactContent() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    setError(null);
    const { error: err } = await supabase.from('contact_submissions').insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    if (err) {
      setError('Could not send message. Please try again or email us directly.');
      setSending(false);
      return;
    }
    setSent(true);
    setSending(false);
    setTimeout(() => {
      setSent(false);
      setName('');
      setEmail('');
      setMessage('');
    }, 4000);
  };

  return (
    <div className="space-y-4 text-sm leading-relaxed text-white">
      <p>
        We'd love to hear from you! Whether you have a question, feedback, or need help, our team is here
        to assist.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-navy-600 p-4">
          <Mail size={20} className="text-royal-600" />
          <div>
            <p className="font-semibold text-white">Email</p>
            <p className="text-xs text-navy-400">support@gambitroyale.com</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-navy-600 p-4">
          <MapPin size={20} className="text-royal-600" />
          <div>
            <p className="font-semibold text-white">Location</p>
            <p className="text-xs text-navy-400">San Francisco, CA</p>
          </div>
        </div>
      </div>
      {sent ? (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-700">
          <MessageCircle size={20} />
          <p className="font-semibold">Thank you! Your message has been sent. We'll reply within 24 hours.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-3 text-sm text-white outline-none transition-all text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
            />
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-3 text-sm text-white outline-none transition-all text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
            />
          </div>
          <textarea
            placeholder="Your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-3 text-sm text-white outline-none transition-all text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
          />
          <button type="submit" disabled={sending} className="btn-primary w-full disabled:opacity-60">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Sending…' : 'Send Message'}
          </button>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
}

function FaqContent() {
  const faqs = [
    {
      q: 'How do I get my $50 welcome bonus?',
      a: 'Your $50 welcome bonus is automatically credited to your account when you first sign up. You can claim it from the welcome popup that appears after registration, or from your profile page.',
    },
    {
      q: 'Is Gambit Royale free to play?',
      a: 'Yes! You can play unlimited games for free. Premium features like advanced AI analysis and tournament entry may use your bonus points or require a subscription.',
    },
    {
      q: 'How do I play online with friends?',
      a: 'Click "Create Room" in the game mode selector, share the 6-character room code or direct link with your friend, and start playing once they join.',
    },
    {
      q: 'How does the AI difficulty work?',
      a: 'Easy mode makes simple moves with some randomness. Hard mode plays at a strong club level. Grandmaster mode uses deep search for top-level play.',
    },
    {
      q: 'How are ratings calculated?',
      a: 'We use a Glicko-2 rating system. Your rating changes based on the outcome of rated games and your opponent\'s rating. You start at 1000.',
    },
    {
      q: 'What if my opponent disconnects?',
      a: 'If your opponent disconnects during a rated game, you will be awarded the win after a brief grace period.',
    },
    {
      q: 'How do I join a club?',
      a: 'Browse clubs from the Clubs page, find one you like, and click Join. Club founders can also invite you directly.',
    },
  ];

  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <details key={i} className="group rounded-2xl border border-white/10 bg-navy-600 p-4">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
            {f.q}
            <span className="ml-2 shrink-0 text-royal-500 transition-transform group-open:rotate-45">+</span>
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-navy-300">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

function RulesContent() {
  const rules = [
    { title: 'The Board', desc: 'Chess is played on an 8x8 board with 64 squares. Each player starts with 16 pieces: 1 king, 1 queen, 2 rooks, 2 bishops, 2 knights, and 8 pawns.' },
    { title: 'Piece Movement', desc: 'Each piece moves differently: Pawns move forward one square (or two on their first move) and capture diagonally. Knights move in an L-shape. Bishops move diagonally. Rooks move horizontally and vertically. The queen combines rook and bishop moves. The king moves one square in any direction.' },
    { title: 'Special Moves', desc: 'Castling moves the king two squares toward a rook, which jumps over. En passant captures a pawn that moved two squares. Promotion transforms a pawn that reaches the far rank into any piece (usually a queen).' },
    { title: 'Check & Checkmate', desc: 'When the king is under attack, it is in check and must escape. If the king cannot escape, it is checkmate and the game is over. Stalemate occurs when the player has no legal moves but is not in check — this is a draw.' },
    { title: 'Winning', desc: 'You win by checkmating your opponent\'s king, or if your opponent resigns or runs out of time on their clock.' },
    { title: 'Drawing', desc: 'A game can be drawn by stalemate, threefold repetition, the 50-move rule, insufficient material, or mutual agreement.' },
  ];

  return (
    <div className="space-y-4">
      {rules.map((r, i) => (
        <div key={i} className="rounded-2xl bg-navy-600 p-4">
          <h3 className="font-display text-base font-bold text-white">
            <span className="mr-2 text-royal-500">{i + 1}.</span>
            {r.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-navy-300">{r.desc}</p>
        </div>
      ))}
      <div className="rounded-2xl bg-blue-grad p-5 text-white shadow-glow-sm">
        <p className="font-display text-base font-bold">Ready to play?</p>
        <p className="mt-1 text-sm text-royal-100">Start with the Easy AI to learn the basics, then work your way up!</p>
      </div>
    </div>
  );
}
