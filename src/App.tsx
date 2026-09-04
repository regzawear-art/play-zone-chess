import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Board, Color, GameMode, GameStage, PieceType, TimeControl, AIDifficulty } from './game/types';
import { useChess } from './hooks/useChess';
import { PLAYERS, CURRENT_USER } from './data/players';
import { Navbar } from './components/Navbar';
import { PlaySidebar } from './components/PlaySidebar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { ChessBoard } from './components/ChessBoard';
import { GamePanel } from './components/GamePanel';
import { PlayerHUD } from './components/PlayerHUD';
import { GameModeSelector } from './components/GameModeSelector';
import { GameOverPopup } from './components/GameOverPopup';
import { Leaderboard } from './components/Leaderboard';
import { EditableProfile } from './components/EditableProfile';
import { ProfileCard } from './components/ProfileCard';
import { Settings } from './components/Settings';
import { MatchHistory } from './components/MatchHistory';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { FooterPage } from './components/FooterPage';
import { WelcomeBonusPopup } from './components/WelcomeBonusPopup';
import { RoomPanel } from './components/RoomPanel';
import { GameChat } from './components/GameChat';
import { Clubs } from './components/Clubs';
import { MatchmakingPanel } from './components/MatchmakingPanel';
import { PricingPlans } from './components/PricingPlans';
import { ReferralSection } from './components/ReferralSection';
import { WalletModalDB } from './components/WalletModalDB';
import { useWalletDB } from './hooks/useWalletDB';
import { PlayActionCards } from './components/PlayActionCards';
import { PremiumOfferPopup } from './components/PremiumOfferPopup';
import { CreditCard, Gift } from 'lucide-react';
import { sound } from './game/sound';
import { legalMoves } from './game/engine';
import { supabase, type AppUser } from './lib/supabase';
import { useProfile } from './hooks/useProfile';
import { BoardThemeSwitcher } from './components/BoardThemeSwitcher';
import { OnlineGameView } from './components/OnlineGameView';
import { getStoredTheme, storeTheme, getThemeById, applyThemeCSS } from './game/themes';
import type { OnlineGameConfig } from './hooks/useOnlineGame';
import { LayoutGrid, Swords, Settings as SettingsIcon, History, Music, Music2 } from 'lucide-react';

const PIECE_VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function computeCaptured(board: Board): { white: PieceType[]; black: PieceType[]; whiteDiff: number; blackDiff: number } {
  const counts: Record<string, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) counts[p.color][p.type]++;
    }
  }
  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];
  (['p', 'n', 'b', 'r', 'q'] as PieceType[]).forEach((t) => {
    const missingFromBlack = 8 - counts.b[t];
    for (let i = 0; i < missingFromBlack; i++) capturedByWhite.push(t);
    const missingFromWhite = t === 'p' ? 8 : 2;
    const wm = missingFromWhite - counts.w[t];
    for (let i = 0; i < wm; i++) capturedByBlack.push(t);
  });
  const whiteMaterial = capturedByWhite.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const blackMaterial = capturedByBlack.reduce((s, p) => s + PIECE_VALUES[p], 0);
  return {
    white: capturedByWhite,
    black: capturedByBlack,
    whiteDiff: Math.max(0, whiteMaterial - blackMaterial),
    blackDiff: Math.max(0, blackMaterial - whiteMaterial),
  };
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function App() {
  const [view, setView] = useState<string>('home');
  const [footerPage, setFooterPage] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('intermediate');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [timeControl, setTimeControl] = useState<TimeControl>('3min');
  const [customMinutes, setCustomMinutes] = useState(5);
  const [orientation, setOrientation] = useState<Color>('w');
  const [userAvatar, setUserAvatar] = useState(CURRENT_USER.avatar);
  const [roomOpen, setRoomOpen] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [matchmakingOpen, setMatchmakingOpen] = useState(false);
  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);
  const [onlineIsHost, setOnlineIsHost] = useState(false);
  const [boardThemeId, setBoardThemeId] = useState<string>(getStoredTheme());
  const [onlineGameConfig, setOnlineGameConfig] = useState<OnlineGameConfig | null>(null);
  const [onlineRoomCode, setOnlineRoomCode] = useState<string>('');
  const [showPremiumOffer, setShowPremiumOffer] = useState(false);
  const [boardPx, setBoardPx] = useState(0);

  // Settings state
  const [muted, setMuted] = useState(sound.muted);
  const [volume, setVolume] = useState(sound.volume);
  const [autoFlip, setAutoFlip] = useState(true);
  const [notifications, setNotifications] = useState(true);

  // Auth state
  const [authUser, setAuthUser] = useState<AppUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  const walletDB = useWalletDB(authUser);

  const { profile, showBonusPopup, setShowBonusPopup, updateProfile, claimBonus } = useProfile(authUser);

  // Apply saved board theme on mount
  useEffect(() => {
    applyThemeCSS(getThemeById(boardThemeId));
  }, [boardThemeId]);

  // Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setAuthUser({ id: data.session.user.id, email: data.session.user.email ?? '' });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const wasAlreadyAuthed = authUser !== null;
        setAuthUser({ id: session.user.id, email: session.user.email ?? '' });
        if (_event === 'SIGNED_IN' && !wasAlreadyAuthed) {
          setShowPremiumOffer(true);
        }
      } else {
        setAuthUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Auto-open RoomPanel when arriving via ?room=CODE shared link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setGameMode('room');
      setRoomOpen(true);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
  }, []);

  const opponent = PLAYERS[1];
  const user = useMemo(() => ({
    ...CURRENT_USER,
    avatar: profile?.avatar_url || userAvatar,
    name: profile?.display_name || profile?.username || CURRENT_USER.name,
    flag: profile?.flag_emoji || CURRENT_USER.flag,
    country: profile?.country_code || CURRENT_USER.country,
    rating: profile?.rating || CURRENT_USER.rating,
  }), [profile, userAvatar]);

  const vsComputer = gameMode === 'ai';

  const game = useChess({
    playerColor,
    opponentColor: playerColor === 'w' ? 'b' : 'w',
    vsComputer,
    timeControl,
    customMinutes,
    opponentName: opponent.name,
    opponentAvatar: opponent.avatar,
    opponentFlag: opponent.flag,
    gameMode,
    aiDifficulty,
  });

  const navigate = useCallback((id: string) => {
    setFooterPage(null);
    setView(id);
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, []);

  const handlePlay = useCallback(() => navigate('play'), [navigate]);
  const handleLeaderboard = useCallback(() => navigate('leaderboard'), [navigate]);

  const onChangeColor = useCallback((c: Color) => {
    setPlayerColor(c);
    if (autoFlip) setOrientation(c);
    sound.play('select');
  }, [autoFlip]);

  const onChangeTimeControl = useCallback((tc: TimeControl) => {
    setTimeControl(tc);
    sound.play('select');
  }, []);

  const onChangeMode = useCallback((m: GameMode) => {
    setGameMode(m);
    sound.play('select');
    if (m === 'room') setRoomOpen(true);
    if (m === 'online') setMatchmakingOpen(true);
  }, []);

  const onChangeDifficulty = useCallback((d: AIDifficulty) => {
    setAiDifficulty(d);
    sound.play('select');
  }, []);

  const onToggleMute = useCallback(() => {
    sound.unlock();
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
    if (!next) sound.play('select');
  }, [muted]);

  const onToggleMusic = useCallback(() => {
    sound.unlock();
    sound.toggleMusic();
    setMusicOn(!sound.musicMuted);
  }, []);

  const onChangeVolume = useCallback((v: number) => {
    sound.unlock();
    sound.setVolume(v);
    setVolume(v);
    if (v > 0 && muted) {
      sound.setMuted(false);
      setMuted(false);
    }
  }, [muted]);

  const onResetSettings = useCallback(() => {
    sound.setMuted(false);
    sound.setVolume(0.7);
    setMuted(false);
    setVolume(0.7);
    setAutoFlip(true);
    setNotifications(true);
  }, []);

  // Matchmaking matched callback
  const handleMatched = useCallback((gameId: string, isHost: boolean) => {
    setOnlineGameId(gameId);
    setOnlineIsHost(isHost);
    setGameMode('online');
    setPlayerColor(isHost ? 'w' : 'b');
    if (autoFlip) setOrientation(isHost ? 'w' : 'b');
    if (authUser) {
      setOnlineGameConfig({
        gameId,
        roomId: gameId,
        isHost,
        userId: authUser.id,
        playerColor: isHost ? 'w' : 'b',
        timeControl,
        customMinutes,
      });
    }
    navigate('play');
  }, [autoFlip, authUser, timeControl, customMinutes, navigate]);

  // Broadcast local moves to the online game table
  useEffect(() => {
    if (!onlineGameId || !authUser || !game.started) return;
    const lastMove = game.getMoveForBroadcast();
    if (!lastMove) return;
    const wasOurMove = (onlineIsHost && game.state.turn === 'b') || (!onlineIsHost && game.state.turn === 'w');
    if (!wasOurMove) return;

    supabase.from('online_game_moves').insert({
      game_id: onlineGameId,
      move_number: game.history.length,
      from_row: lastMove.from[0],
      from_col: lastMove.from[1],
      to_row: lastMove.to[0],
      to_col: lastMove.to[1],
      promotion: lastMove.promotion || null,
      player_id: authUser.id,
      san: game.history[game.history.length - 1]?.san || '',
    }).then(() => {});

    supabase.from('online_games').update({ turn: game.state.turn }).eq('id', onlineGameId).then(() => {});
  }, [game.history, onlineGameId, authUser, onlineIsHost, game.started, game.state.turn, game.getMoveForBroadcast]);

  // Listen for opponent's moves
  useEffect(() => {
    if (!onlineGameId || !authUser) return;
    const channel = supabase
      .channel(`game-${onlineGameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'online_game_moves', filter: `game_id=eq.${onlineGameId}` },
        (payload) => {
          const m = payload.new as {
            player_id: string;
            from_row: number; from_col: number;
            to_row: number; to_col: number;
            promotion: string | null;
          };
          if (m.player_id === authUser.id) return;
          // Find the matching legal move and apply it
          const allLegal = legalMoves(game.board, game.state, game.state.turn);
          const found = allLegal.find((mv) =>
            mv.from[0] === m.from_row && mv.from[1] === m.from_col &&
            mv.to[0] === m.to_row && mv.to[1] === m.to_col &&
            ((mv.promotion || '') === (m.promotion || '')),
          );
          if (found) game.applyRemoteMove(found);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [onlineGameId, authUser, game]);

  const whitePlayer = playerColor === 'w' ? user : opponent;
  const blackPlayer = playerColor === 'w' ? opponent : user;
  const winnerName = game.status.winner === 'w' ? whitePlayer.name : blackPlayer.name;
  const playerWon = game.status.winner === playerColor;

  const closePopup = useCallback(() => {
    setDismissKey((k) => k + 1);
  }, []);

  const [dismissKey, setDismissKey] = useState(0);
  const pendingKey = useRef(0);
  const showPopup = game.pendingResult && dismissKey !== pendingKey.current;
  useEffect(() => {
    if (game.pendingResult) {
      pendingKey.current = dismissKey + 1;
    }
  }, [game.pendingResult]);
  const onNewGame = useCallback(() => {
    setDismissKey(pendingKey.current);
    game.startGame();
  }, [game]);

  const stageForPanel: GameStage | 'Not started' | 'Game over' = game.stageLabel as GameStage | 'Not started' | 'Game over';

  // Compute captured pieces from current board
  const captured = useMemo(() => computeCaptured(game.board), [game.board]);

  const topPlayer = orientation === 'w' ? blackPlayer : whitePlayer;
  const bottomPlayer = orientation === 'w' ? whitePlayer : blackPlayer;
  const topCaptured = orientation === 'w' ? captured.black : captured.white;
  const bottomCaptured = orientation === 'w' ? captured.white : captured.black;
  const topDiff = orientation === 'w' ? captured.blackDiff : captured.whiteDiff;
  const bottomDiff = orientation === 'w' ? captured.whiteDiff : captured.blackDiff;

  const topMs = orientation === 'w' ? game.blackMs : game.whiteMs;
  const bottomMs = orientation === 'w' ? game.whiteMs : game.blackMs;
  const topActive = game.running && game.state.turn !== orientation;
  const bottomActive = game.running && game.state.turn === orientation;

  // Handle footer page navigation
  const onFooterPage = useCallback((page: string) => {
    setFooterPage(page);
    setView('footer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (footerPage) {
    return (
      <div className="flex min-h-screen justify-center bg-navy-800">
      <div className="mx-auto flex w-full max-w-[1400px]">
      {/* Desktop left sidebar navigation */}
      <aside className="sticky top-0 hidden h-screen w-14 shrink-0 lg:block lg:w-48">
        <PlaySidebar
          active=""
          onNavigate={navigate}
          user={authUser}
          onLogin={() => setAuthOpen(true)}
          onLogout={handleLogout}
          onWallet={() => setWalletOpen(true)}
          walletBalanceInr={walletDB.balanceInr}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 lg:hidden">
        <Navbar
          active=""
          onNavigate={navigate}
          user={authUser}
          onLogin={() => setAuthOpen(true)}
          onLogout={handleLogout}
          onWallet={() => setWalletOpen(true)}
          walletBalanceInr={walletDB.balanceInr}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <FooterPage page={footerPage as any} onBack={() => { setFooterPage(null); navigate('home'); }} />
        <Footer onNavigate={navigate} onFooterPage={onFooterPage} />
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthed={(u) => { setAuthUser(u); setAuthOpen(false); }} />
    </div>
    </div>
    );
  }

  // Full-screen online multiplayer game view
  if (onlineGameConfig) {
    const handleExitOnline = () => {
      setOnlineGameConfig(null);
      setOnlineGameId(null);
      setActiveRoomId(null);
      navigate('home');
    };
    const handleRematch = () => {
      if (onlineGameConfig) {
        setOnlineGameConfig({ ...onlineGameConfig, gameId: onlineGameConfig.gameId + '-rematch-' + Date.now() });
      }
    };
    return (
      <div className="flex min-h-screen justify-center bg-navy-800">
      <div className="mx-auto flex w-full max-w-[1400px]">
      {/* Desktop left sidebar navigation */}
      <aside className="sticky top-0 hidden h-screen w-14 shrink-0 lg:block lg:w-48">
        <PlaySidebar
          active="play"
          onNavigate={navigate}
          user={authUser}
          onLogin={() => setAuthOpen(true)}
          onLogout={handleLogout}
          onWallet={() => setWalletOpen(true)}
          walletBalanceInr={walletDB.balanceInr}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 lg:hidden">
        <Navbar
          active="play"
          onNavigate={navigate}
          user={authUser}
          onLogin={() => setAuthOpen(true)}
          onLogout={handleLogout}
          onWallet={() => setWalletOpen(true)}
          walletBalanceInr={walletDB.balanceInr}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <OnlineGameView
          config={onlineGameConfig}
          themeId={boardThemeId}
          onThemeChange={(id) => { setBoardThemeId(id); storeTheme(id); }}
          onExit={handleExitOnline}
          onRematch={handleRematch}
        />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthed={(u) => { setAuthUser(u); setAuthOpen(false); }} />
      </main>
    </div>
    </div>
  );
  }

  const gameDuration = formatDuration(
    (timeControl === '1min' ? 60000 : timeControl === '3min' ? 180000 : timeControl === '10min' ? 600000 : customMinutes * 60000) * 2 - (game.whiteMs + game.blackMs)
  );

  return (
    <div className="flex min-h-screen justify-center overflow-x-hidden bg-navy-800">
    <div className="mx-auto flex w-full max-w-[1400px]">
      {/* Desktop left sidebar navigation */}
      <aside className="sticky top-0 hidden h-screen w-14 shrink-0 lg:block lg:w-48">
        <PlaySidebar
          active={view}
          onNavigate={navigate}
          user={authUser}
          onLogin={() => setAuthOpen(true)}
          onLogout={handleLogout}
          onWallet={() => setWalletOpen(true)}
          walletBalanceInr={walletDB.balanceInr}
        />
      </aside>

      {/* Mobile top bar (replaces sidebar on small screens) */}
      <div className="fixed inset-x-0 top-0 z-40 lg:hidden">
        <Navbar
          active={view}
          onNavigate={navigate}
          user={authUser}
          onLogin={() => setAuthOpen(true)}
          onLogout={handleLogout}
          onWallet={() => setWalletOpen(true)}
          walletBalanceInr={walletDB.balanceInr}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        <Hero
          onPlay={handlePlay}
          onLeaderboard={handleLeaderboard}
          onAuth={() => setAuthOpen(true)}
          onOnline={() => { setGameMode('online'); setMatchmakingOpen(true); navigate('play'); }}
          onRooms={() => { setGameMode('room'); setRoomOpen(true); }}
          onAI={() => { setGameMode('ai'); navigate('play'); }}
        />

        <Features />

        {/* PLAY SECTION — board | right panel on desktop */}
        <section id="play" className="px-1 py-2 sm:px-2 lg:flex lg:h-screen lg:w-full lg:items-stretch lg:gap-0 lg:px-0 lg:py-0 lg:overflow-hidden">
          {/* Board column — board + HUDs + controls, takes all remaining width */}
          <div data-board-col className="flex min-w-0 flex-1 flex-col items-center lg:items-center lg:h-full lg:justify-center lg:overflow-hidden lg:min-h-0 lg:px-2">
            {/* Top player HUD */}
            <div className="w-full" style={{ maxWidth: boardPx || undefined }}>
            <PlayerHUD
              player={{
                name: topPlayer.name,
                avatar: topPlayer.avatar,
                flag: topPlayer.flag,
                rating: topPlayer.rating,
                title: topPlayer.title,
                online: topPlayer.online,
                capturedPieces: topCaptured,
                materialDiff: topDiff,
              }}
              ms={topMs}
              active={topActive}
              running={game.running}
              align="top"
            />
            </div>

            {/* Board — square, sized to fill vertical space minus HUDs */}
            <div className="relative w-full" style={{ maxWidth: boardPx || undefined, marginTop: 2, marginBottom: 2 }}>
              <ChessBoard
                board={game.board}
                selected={game.selected}
                legal={game.legal}
                lastMove={game.lastMove}
                status={game.status}
                orientation={orientation}
                turn={game.state.turn}
                onSquareClick={game.selectSquare}
                onDrop={game.dropPiece}
                promotion={game.promotion}
                onChoosePromotion={game.choosePromotion}
                onCancelPromotion={game.cancelPromotion}
                thinking={game.thinking}
                onSizeChange={setBoardPx}
              />
            </div>

            {/* Bottom player HUD */}
            <div className="w-full" style={{ maxWidth: boardPx || undefined }}>
            <PlayerHUD
              player={{
                name: bottomPlayer.name,
                avatar: bottomPlayer.avatar,
                flag: bottomPlayer.flag,
                rating: bottomPlayer.rating,
                title: bottomPlayer.title,
                online: bottomPlayer.online,
                capturedPieces: bottomCaptured,
                materialDiff: bottomDiff,
              }}
              ms={bottomMs}
              active={bottomActive}
              running={game.running}
              align="bottom"
            />
            </div>

            {/* Controls bar */}
            <div className="w-full mt-1" style={{ maxWidth: boardPx || undefined }}>
            <div className="flex w-full items-center gap-1.5 rounded-lg bg-navy-700/70 px-2 py-1">
              <button onClick={game.startGame} className="flex items-center gap-1.5 rounded-md bg-blue-grad px-3 py-1.5 text-xs font-bold text-white shadow-glow-sm transition-transform hover:translate-y-[-1px]">
                <Swords size={13} />
                {game.started ? 'New' : 'Play'}
              </button>
              <div className="ml-auto flex items-center gap-0.5 rounded-md bg-navy-600 p-0.5">
                <button onClick={() => game.jumpToMove(-1)} disabled={game.history.length === 0} className="grid h-6 w-6 place-items-center rounded text-white transition-colors hover:bg-navy-500 disabled:opacity-30" title="First move">
                  {'|\u226A'}
                </button>
                <button onClick={game.undo} disabled={game.history.length === 0} className="grid h-6 w-6 place-items-center rounded text-white transition-colors hover:bg-navy-500 disabled:opacity-30" title="Previous move">
                  {'\u226A'}
                </button>
                <button onClick={game.redo} disabled={game.history.length === 0} className="grid h-6 w-6 place-items-center rounded text-white transition-colors hover:bg-navy-500 disabled:opacity-30" title="Next move">
                  {'\u226B'}
                </button>
                <button onClick={() => game.jumpToMove(game.history.length - 1)} disabled={game.history.length === 0} className="grid h-6 w-6 place-items-center rounded text-white transition-colors hover:bg-navy-500 disabled:opacity-30" title="Last move">
                  {'\u226B|'}
                </button>
              </div>
              <BoardThemeSwitcher
                currentThemeId={boardThemeId}
                onThemeChange={(id) => { setBoardThemeId(id); storeTheme(id); }}
              />
              <button
                onClick={onToggleMusic}
                className={`grid h-8 w-8 place-items-center rounded-md transition-all ${
                  musicOn ? 'bg-blue-grad text-white shadow-glow-sm' : 'bg-navy-600 text-white hover:bg-navy-500'
                }`}
                title="Background music"
              >
                {musicOn ? <Music2 size={14} /> : <Music size={14} />}
              </button>
            </div>
            </div>

            {/* In-game chat for online/room modes */}
            {(gameMode === 'online' || gameMode === 'room') && (
              <div className="w-full mt-1" style={{ maxWidth: boardPx || undefined }}>
              <GameChat
                roomId={activeRoomId}
                currentUser={authUser ? {
                  id: authUser.id,
                  username: profile?.username || authUser.email,
                  avatar: profile?.avatar_url || '',
                } : null}
                compact
              />
              </div>
            )}
          </div>

          {/* Right sidebar — matches board column height on desktop */}
          <aside className="flex w-full flex-col gap-2 overflow-y-auto no-scrollbar lg:w-[340px] lg:shrink-0 lg:border-l lg:border-navy-600/30 lg:pl-3 lg:pr-1 lg:self-center lg:my-auto" style={boardPx ? { maxHeight: boardPx + 90 } : undefined}>
            <PlayActionCards
              onPlayOnline={() => { setGameMode('online'); setMatchmakingOpen(true); }}
              onPlayBots={() => { setGameMode('ai'); }}
              onPlayCoach={() => { setGameMode('ai'); setAiDifficulty('advanced'); }}
              onTournaments={() => navigate('leaderboard')}
              mode={gameMode}
              aiDifficulty={aiDifficulty}
              onChangeMode={onChangeMode}
              onChangeDifficulty={onChangeDifficulty}
            />

            <GamePanel
              status={game.status}
              running={game.running}
              started={game.started}
              thinking={game.thinking}
              turn={game.state.turn}
              playerColor={playerColor}
              timeControl={timeControl}
              customMinutes={customMinutes}
              history={game.history}
              stageLabel={stageForPanel}
              onStart={game.startGame}
              onResign={game.resign}
              onUndo={game.undo}
              onChangeTimeControl={onChangeTimeControl}
              onChangeCustomMinutes={setCustomMinutes}
              onFlip={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
              onChangeColor={onChangeColor}
            />
          </aside>

          {/* Mobile game mode selector */}
          <div className="w-full lg:hidden">
            <GameModeSelector
              mode={gameMode}
              onChangeMode={onChangeMode}
            />
          </div>
        </section>

        {/* LEADERBOARD */}
        <section id="leaderboard" className="mx-auto max-w-7xl min-w-0 px-4 py-12 sm:px-6 lg:py-16" style={{ boxSizing: 'border-box' }}>
          <div className="mb-8 text-center">
            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
              <LayoutGrid size={13} />
              Rankings
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Top <span className="shimmer-text">Players</span>
            </h2>
            <p className="mt-2 text-navy-300">The world's highest-rated competitors this season.</p>
          </div>
          <Leaderboard />
        </section>

        {/* PRICING */}
        <section id="pricing" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-8 text-center">
            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
              <CreditCard size={13} />
              Plans
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Choose Your <span className="shimmer-text">Plan</span>
            </h2>
            <p className="mt-2 text-navy-300">Free for AI play. Upgrade for multiplayer, tournaments, and premium features.</p>
          </div>
          <PricingPlans userId={authUser?.id ?? null} onLogin={() => setAuthOpen(true)} />
        </section>

        {/* REFERRAL */}
        <section id="referral" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-8 text-center">
            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
              <Gift size={13} />
              Referrals
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Refer & <span className="shimmer-text">Earn</span>
            </h2>
            <p className="mt-2 text-navy-300">Invite friends and earn a bonus for every successful referral.</p>
          </div>
          <ReferralSection
            userId={authUser?.id ?? null}
            onLogin={() => setAuthOpen(true)}
            onReferralComplete={(email) => walletDB.processReferralBonus(email)}
          />
        </section>

        {/* CLUBS */}
        <section id="clubs" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <Clubs userId={authUser?.id ?? null} onLogin={() => setAuthOpen(true)} />
        </section>

        {/* PROFILE */}
        <section id="profile" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-8 text-center">
            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
              <LayoutGrid size={13} />
              Your Card
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your <span className="shimmer-text">Profile</span>
            </h2>
          </div>
          <div className="mx-auto max-w-2xl space-y-6">
            {profile ? (
              <EditableProfile profile={profile} onUpdate={updateProfile} />
            ) : (
              <ProfileCard user={user} />
            )}
            <MatchHistory matches={game.matches} onClear={game.clearMatchHistory} />
          </div>
        </section>

        {/* SETTINGS */}
        <section id="settings" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="mb-8 text-center">
            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
              <SettingsIcon size={13} />
              Preferences
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="shimmer-text">Settings</span>
            </h2>
            <p className="mt-2 text-navy-300">Customize your avatar, sound, and gameplay.</p>
          </div>
          <div className="flex justify-center">
            <Settings
              user={user}
              userAvatar={userAvatar}
              onUploadAvatar={setUserAvatar}
              muted={muted}
              onToggleMute={onToggleMute}
              volume={volume}
              onChangeVolume={onChangeVolume}
              autoFlip={autoFlip}
              onToggleAutoFlip={() => setAutoFlip((v) => !v)}
              notifications={notifications}
              onToggleNotifications={() => setNotifications((v) => !v)}
              onResetSettings={onResetSettings}
              matchCount={game.matches.length}
              onClearHistory={game.clearMatchHistory}
            />
          </div>
        </section>
        <Footer onNavigate={navigate} onFooterPage={onFooterPage} />
      </main>

      {showPopup && game.pendingResult && (
        <GameOverPopup
          status={game.pendingResult.status}
          ending={game.pendingResult.ending}
          onClose={closePopup}
          onNewGame={onNewGame}
          winnerName={winnerName}
          playerWon={playerWon}
          moves={game.history.length}
          duration={gameDuration}
          ratingChange={playerWon ? 8 : game.pendingResult?.ending === 'stalemate' ? 0 : -6}
        />
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthed={(u) => { setAuthUser(u); setAuthOpen(false); }} />

      <WalletModalDB
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        balanceInr={walletDB.balanceInr}
        transactions={walletDB.transactions}
        onRedeemCoupon={walletDB.redeemCoupon}
      />

      <RoomPanel
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        userId={authUser?.id ?? null}
        username={profile?.display_name || profile?.username || authUser?.email || 'Player'}
        onRoomJoined={async (rid: string, isHost: boolean, code: string, tc: TimeControl) => {
          setActiveRoomId(rid);
          setOnlineRoomCode(code);
          if (!authUser) return;
          let gameId: string | null = null;

          if (!isHost) {
            // Guest joins: fetch the room to get host_id, then create the online_games row
            const { data: room } = await supabase
              .from('rooms')
              .select('host_id')
              .eq('id', rid)
              .maybeSingle();
            if (room?.host_id) {
              const { data: ogRow } = await supabase
                .from('online_games')
                .insert({
                  host_id: room.host_id,
                  guest_id: authUser.id,
                  time_control: tc,
                  status: 'active',
                  turn: 'w',
                })
                .select()
                .maybeSingle();
              if (ogRow) {
                gameId = ogRow.id;
                // Store game_id on the room so the host can find it
                await supabase.from('rooms').update({ game_id: gameId }).eq('id', rid);
              }
            }
          } else {
            // Host: poll the room for game_id set by the guest (up to ~15s)
            for (let i = 0; i < 30; i++) {
              const { data: room } = await supabase
                .from('rooms')
                .select('game_id')
                .eq('id', rid)
                .maybeSingle();
              if (room?.game_id) {
                gameId = room.game_id;
                break;
              }
              await new Promise((r) => setTimeout(r, 500));
            }
          }

          if (gameId) {
            setOnlineGameConfig({
              gameId,
              roomId: rid,
              isHost,
              userId: authUser.id,
              playerColor: isHost ? 'w' : 'b',
              timeControl: tc,
              customMinutes,
            });
            setOnlineGameId(gameId);
            setOnlineIsHost(isHost);
            setGameMode('online');
            setPlayerColor(isHost ? 'w' : 'b');
            if (autoFlip) setOrientation(isHost ? 'w' : 'b');
            navigate('play');
          }
        }}
      />

      <MatchmakingPanel
        open={matchmakingOpen}
        onClose={() => setMatchmakingOpen(false)}
        userId={authUser?.id ?? null}
        timeControl={timeControl === 'custom' ? `${customMinutes}min` : timeControl}
        onMatched={handleMatched}
        onLogin={() => setAuthOpen(true)}
      />

      {showBonusPopup && (
        <WelcomeBonusPopup
          onClose={() => setShowBonusPopup(false)}
          onClaim={claimBonus}
        />
      )}

      {showPremiumOffer && (
        <PremiumOfferPopup
          onClose={() => setShowPremiumOffer(false)}
          onClaim={() => setShowPremiumOffer(false)}
        />
      )}
    </div>
    </div>
  );
}
