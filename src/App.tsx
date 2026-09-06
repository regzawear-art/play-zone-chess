import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
    Board,
    Color,
    GameMode,
    GameStage,
    PieceType,
    TimeControl,
    AIDifficulty,
} from './game/types';

import { useChess } from './hooks/useChess';
import { PLAYERS, CURRENT_USER } from './data/players';

import { TopHeader } from './components/TopHeader';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
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
import { Clubs } from './components/Clubs';
import { MatchmakingPanel } from './components/MatchmakingPanel';
import { PricingPlans } from './components/PricingPlans';
import { ReferralSection } from './components/ReferralSection';
import { WalletModalDB } from './components/WalletModalDB';
import { useWalletDB } from './hooks/useWalletDB';
import { PremiumOfferPopup } from './components/PremiumOfferPopup';
import { GameSetup } from './components/GameSetup';
import { ChessGamePage } from './components/ChessGamePage';
import { OnlineGameView } from './components/OnlineGameView';

import { CreditCard, Gift, LayoutGrid, Settings as SettingsIcon } from 'lucide-react';

import { sound } from './game/sound';
import { legalMoves } from './game/engine';
import { supabase, type AppUser } from './lib/supabase';

import useInvites from './hooks/useInvites';
import { useProfile } from './hooks/useProfile';

import {
    getStoredTheme,
    storeTheme,
    getThemeById,
    applyThemeCSS,
} from './game/themes';

import type { OnlineGameConfig } from './hooks/useOnlineGame';

const PIECE_VALUES: Record<PieceType, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
};

function computeCaptured(
    board: Board
): {
    white: PieceType[];
    black: PieceType[];
    whiteDiff: number;
    blackDiff: number;
} {
    const counts: Record<
        string,
        Record<PieceType, number>
    > = {
        w: {
            p: 0,
            n: 0,
            b: 0,
            r: 0,
            q: 0,
            k: 0,
        },
        b: {
            p: 0,
            n: 0,
            b: 0,
            r: 0,
            q: 0,
            k: 0,
        },
    };

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];

            if (p) {
                counts[p.color][p.type]++;
            }
        }
    }

    const capturedByWhite: PieceType[] = [];
    const capturedByBlack: PieceType[] = [];

    (['p', 'n', 'b', 'r', 'q'] as PieceType[]).forEach(
        (t) => {
            const missingFromBlack = 8 - counts.b[t];

            for (
                let i = 0;
                i < missingFromBlack;
                i++
            ) {
                capturedByWhite.push(t);
            }

            const originalWhite = t === 'p' ? 8 : 2;
            const missingFromWhite =
                originalWhite - counts.w[t];

            for (
                let i = 0;
                i < missingFromWhite;
                i++
            ) {
                capturedByBlack.push(t);
            }
        }
    );

    const whiteMaterial = capturedByWhite.reduce(
        (s, p) => s + PIECE_VALUES[p],
        0
    );

    const blackMaterial = capturedByBlack.reduce(
        (s, p) => s + PIECE_VALUES[p],
        0
    );

    return {
        white: capturedByWhite,
        black: capturedByBlack,
        whiteDiff: Math.max(
            0,
            whiteMaterial - blackMaterial
        ),
        blackDiff: Math.max(
            0,
            blackMaterial - whiteMaterial
        ),
    };
}

function formatDuration(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);

    return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function HomePage() {
    const [view, setView] = useState<string>('home');
    const [footerPage, setFooterPage] =
        useState<string | null>(null);

    const [gameMode, setGameMode] =
        useState<GameMode>('ai');

    const [aiDifficulty, setAiDifficulty] =
        useState<AIDifficulty>('intermediate');

    const [playerColor, setPlayerColor] =
        useState<Color>('w');

    const [timeControl, setTimeControl] =
        useState<TimeControl>('3min');

    const [customMinutes, setCustomMinutes] =
        useState(5);

    const [orientation, setOrientation] =
        useState<Color>('w');

    const [userAvatar, setUserAvatar] =
        useState(CURRENT_USER.avatar);

    const [roomOpen, setRoomOpen] =
        useState(false);

    const [activeRoomId, setActiveRoomId] =
        useState<string | null>(null);

    const [musicOn, setMusicOn] =
        useState(false);

    const [matchmakingOpen, setMatchmakingOpen] =
        useState(false);

    const [onlineGameId, setOnlineGameId] =
        useState<string | null>(null);

    const [onlineIsHost, setOnlineIsHost] =
        useState(false);

    const [boardThemeId, setBoardThemeId] =
        useState<string>(getStoredTheme());

    const [onlineGameConfig, setOnlineGameConfig] =
        useState<OnlineGameConfig | null>(null);

    const [showPremiumOffer, setShowPremiumOffer] =
        useState(false);

    const [quickMatchSetupOpen, setQuickMatchSetupOpen] =
        useState(false);

    const [gameStarted, setGameStarted] =
        useState(false);

    const [muted, setMuted] =
        useState(sound.muted);

    const [volume, setVolume] =
        useState(sound.volume);

    const [autoFlip, setAutoFlip] =
        useState(true);

    const [notifications, setNotifications] =
        useState(true);

    const [authUser, setAuthUser] =
        useState<AppUser | null>(null);

    const [authOpen, setAuthOpen] =
        useState(false);

    const [walletOpen, setWalletOpen] =
        useState(false);

    const walletDB = useWalletDB(authUser);

    const {
        profile,
        showBonusPopup,
        setShowBonusPopup,
        updateProfile,
        claimBonus,
    } = useProfile(authUser);

    useEffect(() => {
        applyThemeCSS(
            getThemeById(boardThemeId)
        );
    }, [boardThemeId]);

    /* AUTH */
    useEffect(() => {
        let mounted = true;

        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;

            if (data.session?.user) {
                setAuthUser({
                    id: data.session.user.id,
                    email: data.session.user.email ?? '',
                });
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (!mounted) return;

                if (session?.user) {
                    setAuthUser({
                        id: session.user.id,
                        email: session.user.email ?? '',
                    });

                    if (event === 'SIGNED_IN') {
                        setShowPremiumOffer(true);
                    }
                } else {
                    setAuthUser(null);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useInvites();

    /* Shared room URL */
    useEffect(() => {
        const params = new URLSearchParams(
            window.location.search
        );

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

    const user = useMemo(
        () => ({
            ...CURRENT_USER,
            avatar:
                profile?.avatar_url || userAvatar,
            name:
                profile?.display_name ||
                profile?.username ||
                CURRENT_USER.name,
            flag:
                profile?.flag_emoji ||
                CURRENT_USER.flag,
            country:
                profile?.country_code ||
                CURRENT_USER.country,
            rating:
                profile?.rating ||
                CURRENT_USER.rating,
        }),
        [profile, userAvatar]
    );

    /*
     * This hook is retained for the existing
     * homepage history/profile functionality.
     *
     * The actual dedicated Bot game gets its own
     * ChessGamePage instance using the same settings.
     */
    const game = useChess({
        playerColor,
        opponentColor:
            playerColor === 'w' ? 'b' : 'w',
        vsComputer: gameMode === 'ai',
        timeControl,
        customMinutes,
        opponentName: opponent.name,
        opponentAvatar: opponent.avatar,
        opponentFlag: opponent.flag,
        gameMode,
        aiDifficulty,
    });

    const navigate = useCallback(
        (id: string) => {
            setFooterPage(null);
            setView(id);

            requestAnimationFrame(() => {
                const el =
                    document.getElementById(id);

                if (el) {
                    el.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
                } else {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth',
                    });
                }
            });
        },
        []
    );

    /*
     * Normal homepage Play Now:
     * ONLY opens/scrolls to setup.
     */
    const handlePlay = useCallback(() => {
        setFooterPage(null);
        setView('play');

        requestAnimationFrame(() => {
            document
                .getElementById('play')
                ?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
        });
    }, []);

    /*
     * Quick Match:
     * opens the setup modal instead of scrolling.
     */
    const handleQuickMatch = useCallback(() => {
        setGameMode('online');
        setQuickMatchSetupOpen(true);
    }, []);

    const handleLeaderboard = useCallback(
        () => navigate('leaderboard'),
        [navigate]
    );

    const onChangeColor = useCallback(
        (c: Color) => {
            setPlayerColor(c);

            if (autoFlip) {
                setOrientation(c);
            }

            sound.play('select');
        },
        [autoFlip]
    );

    const onChangeTimeControl = useCallback(
        (tc: TimeControl) => {
            setTimeControl(tc);
            sound.play('select');
        },
        []
    );

    /*
     * IMPORTANT:
     * Selecting Online/Friends does NOT open
     * matchmaking/room automatically.
     */
    const onChangeMode = useCallback(
        (m: GameMode) => {
            setGameMode(m);
            sound.play('select');
        },
        []
    );

    const onChangeDifficulty = useCallback(
        (d: AIDifficulty) => {
            setAiDifficulty(d);
            sound.play('select');
        },
        []
    );

    const onToggleMute = useCallback(() => {
        sound.unlock();

        const next = !muted;

        sound.setMuted(next);
        setMuted(next);

        if (!next) {
            sound.play('select');
        }
    }, [muted]);

    const onToggleMusic = useCallback(() => {
        sound.unlock();
        sound.toggleMusic();
        setMusicOn(!sound.musicMuted);
    }, []);

    const onChangeVolume = useCallback(
        (v: number) => {
            sound.unlock();
            sound.setVolume(v);
            setVolume(v);

            if (v > 0 && muted) {
                sound.setMuted(false);
                setMuted(false);
            }
        },
        [muted]
    );

    const onResetSettings = useCallback(() => {
        sound.setMuted(false);
        sound.setVolume(0.7);

        setMuted(false);
        setVolume(0.7);
        setAutoFlip(true);
        setNotifications(true);
    }, []);

    /*
     * BOT GAME
     *
     * We do NOT call game.startGame() here because
     * ChessGamePage owns the dedicated game instance.
     */
    const startBotGame = useCallback(() => {
        setQuickMatchSetupOpen(false);
        setGameStarted(true);
    }, []);

    /*
     * Setup PLAY handler used by homepage setup.
     */
    const handleSetupPlay = useCallback(() => {
        if (gameMode === 'online') {
            setQuickMatchSetupOpen(false);

            if (!authUser) {
                setAuthOpen(true);
                return;
            }

            setMatchmakingOpen(true);
            return;
        }

        if (gameMode === 'room') {
            setQuickMatchSetupOpen(false);

            if (!authUser) {
                setAuthOpen(true);
                return;
            }

            setRoomOpen(true);
            return;
        }

        startBotGame();
    }, [
        gameMode,
        authUser,
        startBotGame,
    ]);

    /*
     * Matchmaking matched.
     */
    const handleMatched = useCallback(
        (gameId: string, isHost: boolean) => {
            if (!authUser) return;

            const color: Color =
                isHost ? 'w' : 'b';

            setOnlineGameId(gameId);
            setOnlineIsHost(isHost);
            setGameMode('online');
            setPlayerColor(color);

            if (autoFlip) {
                setOrientation(color);
            }

            setOnlineGameConfig({
                gameId,
                roomId: gameId,
                isHost,
                userId: authUser.id,
                playerColor: color,
                timeControl,
                customMinutes,
            });

            setMatchmakingOpen(false);
        },
        [
            authUser,
            autoFlip,
            timeControl,
            customMinutes,
        ]
    );

    /*
     * Invite accepted -> online game.
     */
    useEffect(() => {
        const onCreated = (e: any) => {
            const createdGame = e.detail;

            if (!createdGame || !authUser) {
                return;
            }

            const isHost =
                createdGame.white_id ===
                authUser.id;

            const color: Color =
                isHost ? 'w' : 'b';

            setOnlineGameId(createdGame.id);
            setOnlineIsHost(isHost);
            setGameMode('online');
            setPlayerColor(color);

            if (autoFlip) {
                setOrientation(color);
            }

            setOnlineGameConfig({
                gameId: createdGame.id,
                roomId: createdGame.id,
                isHost,
                userId: authUser.id,
                playerColor: color,
                timeControl,
                customMinutes,
            });
        };

        window.addEventListener(
            'online-game-created',
            onCreated as EventListener
        );

        const onInviteAccepted = (ev: any) => {
            const invite = ev.detail?.invite;

            if (!invite) return;

            (async () => {
                try {
                    const u =
                        await supabase.auth.getUser();

                    const uid =
                        u.data?.user?.id;

                    if (!uid) return;

                    if (
                        invite.from_user === uid &&
                        invite.game_id
                    ) {
                        const { data: createdGame } =
                            await supabase
                                .from('games')
                                .select('*')
                                .eq(
                                    'id',
                                    invite.game_id
                                )
                                .single();

                        if (createdGame) {
                            window.dispatchEvent(
                                new CustomEvent(
                                    'online-game-created',
                                    {
                                        detail: createdGame,
                                    }
                                )
                            );
                        }
                    }
                } catch (err) {
                    console.warn(
                        'invite-accepted handler failed',
                        err
                    );
                }
            })();
        };

        window.addEventListener(
            'invite-accepted',
            onInviteAccepted as EventListener
        );

        return () => {
            window.removeEventListener(
                'online-game-created',
                onCreated as EventListener
            );

            window.removeEventListener(
                'invite-accepted',
                onInviteAccepted as EventListener
            );
        };
    }, [
        authUser,
        autoFlip,
        timeControl,
        customMinutes,
    ]);

    /*
     * Online move broadcast.
     */
    useEffect(() => {
        if (
            !onlineGameId ||
            !authUser ||
            !game.started
        ) {
            return;
        }

        const lastMove =
            game.getMoveForBroadcast();

        if (!lastMove) return;

        const wasOurMove =
            (onlineIsHost &&
                game.state.turn === 'b') ||
            (!onlineIsHost &&
                game.state.turn === 'w');

        if (!wasOurMove) return;

        supabase
            .from('online_game_moves')
            .insert({
                game_id: onlineGameId,
                move_number: game.history.length,
                from_row: lastMove.from[0],
                from_col: lastMove.from[1],
                to_row: lastMove.to[0],
                to_col: lastMove.to[1],
                promotion:
                    lastMove.promotion || null,
                player_id: authUser.id,
                san:
                    game.history[
                        game.history.length - 1
                    ]?.san || '',
            })
            .then(() => { });

        supabase
            .from('online_games')
            .update({
                turn: game.state.turn,
            })
            .eq('id', onlineGameId)
            .then(() => { });
    }, [
        game.history,
        onlineGameId,
        authUser,
        onlineIsHost,
        game.started,
        game.state.turn,
        game.getMoveForBroadcast,
    ]);

    /*
     * Opponent online moves.
     */
    useEffect(() => {
        if (!onlineGameId || !authUser) {
            return;
        }

        const channel = supabase
            .channel(`game-${onlineGameId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'online_game_moves',
                    filter: `game_id=eq.${onlineGameId}`,
                },
                (payload) => {
                    const m = payload.new as {
                        player_id: string;
                        from_row: number;
                        from_col: number;
                        to_row: number;
                        to_col: number;
                        promotion: string | null;
                    };

                    if (
                        m.player_id === authUser.id
                    ) {
                        return;
                    }

                    const allLegal = legalMoves(
                        game.board,
                        game.state,
                        game.state.turn
                    );

                    const found = allLegal.find(
                        (mv) =>
                            mv.from[0] === m.from_row &&
                            mv.from[1] === m.from_col &&
                            mv.to[0] === m.to_row &&
                            mv.to[1] === m.to_col &&
                            (mv.promotion || '') ===
                            (m.promotion || '')
                    );

                    if (found) {
                        game.applyRemoteMove(found);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [
        onlineGameId,
        authUser,
        game,
    ]);

    const whitePlayer =
        playerColor === 'w'
            ? user
            : opponent;

    const blackPlayer =
        playerColor === 'w'
            ? opponent
            : user;

    const winnerName =
        game.status.winner === 'w'
            ? whitePlayer.name
            : blackPlayer.name;

    const playerWon =
        game.status.winner === playerColor;

    const closePopup = useCallback(() => {
        setDismissKey((k) => k + 1);
    }, []);

    const [dismissKey, setDismissKey] =
        useState(0);

    const pendingKey = useRef(0);

    const showPopup =
        game.pendingResult &&
        dismissKey !== pendingKey.current;

    useEffect(() => {
        if (game.pendingResult) {
            pendingKey.current =
                dismissKey + 1;
        }
    }, [
        game.pendingResult,
        dismissKey,
    ]);

    const onNewGame = useCallback(() => {
        setDismissKey(pendingKey.current);
        game.startGame();
    }, [game]);

    const stageForPanel =
        game.stageLabel as
        | GameStage
        | 'Not started'
        | 'Game over';

    const captured = useMemo(
        () => computeCaptured(game.board),
        [game.board]
    );

    const onFooterPage = useCallback(
        (page: string) => {
            setFooterPage(page);
            setView('footer');

            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        },
        []
    );

    /*
     * Dedicated BOT game screen.
     *
     * This MUST happen before the normal homepage.
     */
    if (gameStarted) {
        return (
            <ChessGamePage
                gameMode={gameMode}
                aiDifficulty={aiDifficulty}
                playerColor={playerColor}
                timeControl={timeControl}
                customMinutes={customMinutes}
                onExit={() => {
                    setGameStarted(false);
                    setView('play');
                }}
            />
        );
    }

    /*
     * Footer pages.
     */
    if (footerPage) {
        return (
            <div className="min-h-screen bg-navy-800">
                <TopHeader
                    active=""
                    onNavigate={navigate}
                    user={authUser}
                    onLogin={() => setAuthOpen(true)}
                    onLogout={handleLogout}
                    onWallet={() => setWalletOpen(true)}
                    walletBalanceInr={walletDB.balanceInr}
                />

                <div className="mx-auto w-full max-w-[1400px]">
                    <main className="flex min-w-0 flex-col pt-14">
                        <FooterPage
                            page={footerPage as any}
                            onBack={() => {
                                setFooterPage(null);
                                navigate('home');
                            }}
                        />

                        <Footer
                            onNavigate={navigate}
                            onFooterPage={onFooterPage}
                        />
                    </main>

                    <AuthModal
                        open={authOpen}
                        onClose={() =>
                            setAuthOpen(false)
                        }
                        onAuthed={(u) => {
                            setAuthUser(u);
                            setAuthOpen(false);
                        }}
                    />
                </div>
            </div>
        );
    }

    /*
     * ONLINE GAME.
     */
    if (onlineGameConfig) {
        const handleExitOnline = () => {
            setOnlineGameConfig(null);
            setOnlineGameId(null);
            setActiveRoomId(null);
            setGameMode('ai');
            setView('home');
        };

        const handleRematch = () => {
            if (!onlineGameConfig) return;

            setOnlineGameConfig({
                ...onlineGameConfig,
                gameId:
                    onlineGameConfig.gameId +
                    '-rematch-' +
                    Date.now(),
            });
        };

        return (
            <div className="min-h-screen bg-navy-800">
                <TopHeader
                    active="play"
                    onNavigate={navigate}
                    user={authUser}
                    onLogin={() => setAuthOpen(true)}
                    onLogout={handleLogout}
                    onWallet={() => setWalletOpen(true)}
                    walletBalanceInr={walletDB.balanceInr}
                />

                <div className="mx-auto w-full max-w-[1400px]">
                    <main className="flex min-w-0 flex-col pt-14">
                        <OnlineGameView
                            config={onlineGameConfig}
                            themeId={boardThemeId}
                            onThemeChange={(id) => {
                                setBoardThemeId(id);
                                storeTheme(id);
                            }}
                            onExit={handleExitOnline}
                            onRematch={handleRematch}
                        />

                        <AuthModal
                            open={authOpen}
                            onClose={() =>
                                setAuthOpen(false)
                            }
                            onAuthed={(u) => {
                                setAuthUser(u);
                                setAuthOpen(false);
                            }}
                        />
                    </main>
                </div>
            </div>
        );
    }

    const gameDuration = formatDuration(
        (timeControl === '1min'
            ? 60000
            : timeControl === '3min'
                ? 180000
                : timeControl === '10min'
                    ? 600000
                    : customMinutes * 60000) *
        2 -
        (game.whiteMs + game.blackMs)
    );

    return (
        <div className="min-h-screen overflow-x-hidden bg-navy-800">
            <TopHeader
                active={view}
                onNavigate={navigate}
                user={authUser}
                onLogin={() => setAuthOpen(true)}
                onLogout={handleLogout}
                onWallet={() => setWalletOpen(true)}
                walletBalanceInr={walletDB.balanceInr}
            />

            <div className="mx-auto w-full max-w-[1400px]">
                <main className="flex min-w-0 flex-col pt-14">
                    <Hero
                        onPlay={handleQuickMatch}
                        onQuickMatch={handleQuickMatch}
                        onLeaderboard={handleLeaderboard}
                        onAuth={() => setAuthOpen(true)}
                        onOnline={() => {
                            setGameMode('online');
                            handlePlay();
                        }}
                        onRooms={() => {
                            setGameMode('room');
                            handlePlay();
                        }}
                        onAI={() => {
                            setGameMode('ai');
                            handlePlay();
                        }}
                    />

                    <Features />

                    {/* SETUP */}
                    <section
                        id="play"
                        className="w-full scroll-mt-20 px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                    >
                        <GameSetup
                            gameMode={gameMode}
                            onChangeMode={onChangeMode}
                            timeControl={timeControl}
                            onChangeTimeControl={
                                onChangeTimeControl
                            }
                            customMinutes={customMinutes}
                            onChangeCustomMinutes={
                                setCustomMinutes
                            }
                            aiDifficulty={aiDifficulty}
                            onChangeDifficulty={
                                onChangeDifficulty
                            }
                            playerColor={playerColor}
                            onChangeColor={onChangeColor}
                            onPlay={handleSetupPlay}
                        />
                    </section>

                    {/* LEADERBOARD */}
                    <section
                        id="leaderboard"
                        className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
                    >
                        <div className="mb-8 text-center">
                            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
                                <LayoutGrid size={13} />
                                Rankings
                            </span>

                            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                                Top{' '}
                                <span className="shimmer-text">
                                    Players
                                </span>
                            </h2>

                            <p className="mt-2 text-navy-300">
                                The world's highest-rated
                                competitors this season.
                            </p>
                        </div>

                        <Leaderboard />
                    </section>

                    {/* PRICING */}
                    <section
                        id="pricing"
                        className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
                    >
                        <div className="mb-8 text-center">
                            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
                                <CreditCard size={13} />
                                Plans
                            </span>

                            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                                Choose Your{' '}
                                <span className="shimmer-text">
                                    Plan
                                </span>
                            </h2>

                            <p className="mt-2 text-navy-300">
                                Free for AI play. Upgrade for
                                multiplayer, tournaments, and
                                premium features.
                            </p>
                        </div>

                        <PricingPlans
                            userId={authUser?.id ?? null}
                            onLogin={() =>
                                setAuthOpen(true)
                            }
                        />
                    </section>

                    {/* REFERRAL */}
                    <section
                        id="referral"
                        className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
                    >
                        <div className="mb-8 text-center">
                            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
                                <Gift size={13} />
                                Referrals
                            </span>

                            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                                Refer &{' '}
                                <span className="shimmer-text">
                                    Earn
                                </span>
                            </h2>

                            <p className="mt-2 text-navy-300">
                                Invite friends and earn a bonus
                                for every successful referral.
                            </p>
                        </div>

                        <ReferralSection
                            userId={authUser?.id ?? null}
                            onLogin={() =>
                                setAuthOpen(true)
                            }
                            onReferralComplete={(email) =>
                                walletDB.processReferralBonus(
                                    email
                                )
                            }
                        />
                    </section>

                    {/* CLUBS */}
                    <section
                        id="clubs"
                        className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
                    >
                        <Clubs
                            userId={authUser?.id ?? null}
                            onLogin={() =>
                                setAuthOpen(true)
                            }
                        />
                    </section>

                    {/* PROFILE */}
                    <section
                        id="profile"
                        className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
                    >
                        <div className="mb-8 text-center">
                            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
                                <LayoutGrid size={13} />
                                Your Card
                            </span>

                            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                                Your{' '}
                                <span className="shimmer-text">
                                    Profile
                                </span>
                            </h2>
                        </div>

                        <div className="w-full space-y-6">
                            {profile ? (
                                <EditableProfile
                                    profile={profile}
                                    onUpdate={updateProfile}
                                />
                            ) : (
                                <ProfileCard user={user} />
                            )}

                            <MatchHistory
                                matches={game.matches}
                                onClear={
                                    game.clearMatchHistory
                                }
                            />
                        </div>
                    </section>

                    {/* SETTINGS */}
                    <section
                        id="settings"
                        className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
                    >
                        <div className="mb-8 text-center">
                            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
                                <SettingsIcon size={13} />
                                Preferences
                            </span>

                            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                                <span className="shimmer-text">
                                    Settings
                                </span>
                            </h2>

                            <p className="mt-2 text-navy-300">
                                Customize your avatar, sound,
                                and gameplay.
                            </p>
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
                                onToggleAutoFlip={() =>
                                    setAutoFlip((v) => !v)
                                }
                                notifications={notifications}
                                onToggleNotifications={() =>
                                    setNotifications(
                                        (v) => !v
                                    )
                                }
                                onResetSettings={
                                    onResetSettings
                                }
                                matchCount={
                                    game.matches.length
                                }
                                onClearHistory={
                                    game.clearMatchHistory
                                }
                            />
                        </div>
                    </section>

                    <Footer
                        onNavigate={navigate}
                        onFooterPage={onFooterPage}
                    />
                </main>

                {/* Existing game-over popup for homepage state */}
                {showPopup &&
                    game.pendingResult && (
                        <GameOverPopup
                            status={
                                game.pendingResult.status
                            }
                            ending={
                                game.pendingResult.ending
                            }
                            onClose={closePopup}
                            onNewGame={onNewGame}
                            winnerName={winnerName}
                            playerWon={playerWon}
                            moves={game.history.length}
                            duration={gameDuration}
                            ratingChange={
                                playerWon
                                    ? 8
                                    : game.pendingResult
                                        ?.ending ===
                                        'stalemate'
                                        ? 0
                                        : -6
                            }
                        />
                    )}

                {/* AUTH */}
                <AuthModal
                    open={authOpen}
                    onClose={() =>
                        setAuthOpen(false)
                    }
                    onAuthed={(u) => {
                        setAuthUser(u);
                        setAuthOpen(false);
                    }}
                />

                {/* WALLET */}
                <WalletModalDB
                    open={walletOpen}
                    onClose={() =>
                        setWalletOpen(false)
                    }
                    balanceInr={walletDB.balanceInr}
                    transactions={
                        walletDB.transactions
                    }
                    onRedeemCoupon={
                        walletDB.redeemCoupon
                    }
                />

                {/* ROOM */}
                <RoomPanel
                    open={roomOpen}
                    onClose={() =>
                        setRoomOpen(false)
                    }
                    userId={authUser?.id ?? null}
                    username={
                        profile?.display_name ||
                        profile?.username ||
                        authUser?.email ||
                        'Player'
                    }
                    onRoomJoined={async (
                        rid: string,
                        isHost: boolean,
                        code: string,
                        tc: TimeControl
                    ) => {
                        setActiveRoomId(rid);

                        if (!authUser) return;

                        let gameId: string | null =
                            null;

                        if (!isHost) {
                            const { data: room } =
                                await supabase
                                    .from('rooms')
                                    .select('host_id')
                                    .eq('id', rid)
                                    .maybeSingle();

                            if (room?.host_id) {
                                const {
                                    data: ogRow,
                                } = await supabase
                                    .from('online_games')
                                    .insert({
                                        host_id:
                                            room.host_id,
                                        guest_id:
                                            authUser.id,
                                        time_control: tc,
                                        status: 'active',
                                        turn: 'w',
                                    })
                                    .select()
                                    .maybeSingle();

                                if (ogRow) {
                                    gameId = ogRow.id;

                                    await supabase
                                        .from('rooms')
                                        .update({
                                            game_id: gameId,
                                        })
                                        .eq('id', rid);
                                }
                            }
                        } else {
                            for (
                                let i = 0;
                                i < 30;
                                i++
                            ) {
                                const { data: room } =
                                    await supabase
                                        .from('rooms')
                                        .select('game_id')
                                        .eq('id', rid)
                                        .maybeSingle();

                                if (room?.game_id) {
                                    gameId =
                                        room.game_id;
                                    break;
                                }

                                await new Promise(
                                    (r) =>
                                        setTimeout(r, 500)
                                );
                            }
                        }

                        if (gameId) {
                            setOnlineGameConfig({
                                gameId,
                                roomId: rid,
                                isHost,
                                userId: authUser.id,
                                playerColor:
                                    isHost ? 'w' : 'b',
                                timeControl: tc,
                                customMinutes,
                            });

                            setOnlineGameId(gameId);
                            setOnlineIsHost(isHost);
                            setGameMode('online');
                            setPlayerColor(
                                isHost ? 'w' : 'b'
                            );

                            if (autoFlip) {
                                setOrientation(
                                    isHost ? 'w' : 'b'
                                );
                            }

                            setRoomOpen(false);
                        }
                    }}
                />

                {/* MATCHMAKING */}
                <MatchmakingPanel
                    open={matchmakingOpen}
                    onClose={() =>
                        setMatchmakingOpen(false)
                    }
                    userId={
                        authUser?.id ?? null
                    }
                    timeControl={
                        timeControl === 'custom'
                            ? `${customMinutes}min`
                            : timeControl
                    }
                    onMatched={handleMatched}
                    onLogin={() =>
                        setAuthOpen(true)
                    }
                />

                {/* QUICK MATCH SETUP POPUP */}
                {quickMatchSetupOpen && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
                        onMouseDown={(e) => {
                            if (
                                e.target ===
                                e.currentTarget
                            ) {
                                setQuickMatchSetupOpen(
                                    false
                                );
                            }
                        }}
                    >
                        <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto">
                            <button
                                type="button"
                                onClick={() =>
                                    setQuickMatchSetupOpen(
                                        false
                                    )
                                }
                                className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-navy-700 text-lg text-navy-200 transition hover:bg-navy-600 hover:text-white"
                                aria-label="Close setup"
                            >
                                ×
                            </button>

                            <GameSetup
                                gameMode={gameMode}
                                onChangeMode={onChangeMode}
                                timeControl={
                                    timeControl
                                }
                                onChangeTimeControl={
                                    onChangeTimeControl
                                }
                                customMinutes={
                                    customMinutes
                                }
                                onChangeCustomMinutes={
                                    setCustomMinutes
                                }
                                aiDifficulty={
                                    aiDifficulty
                                }
                                onChangeDifficulty={
                                    onChangeDifficulty
                                }
                                playerColor={
                                    playerColor
                                }
                                onChangeColor={
                                    onChangeColor
                                }
                                onPlay={
                                    handleSetupPlay
                                }
                            />
                        </div>
                    </div>
                )}

                {/* BONUS */}
                {showBonusPopup && (
                    <WelcomeBonusPopup
                        onClose={() =>
                            setShowBonusPopup(false)
                        }
                        onClaim={claimBonus}
                    />
                )}

                {/* PREMIUM */}
                {showPremiumOffer && (
                    <PremiumOfferPopup
                        onClose={() =>
                            setShowPremiumOffer(false)
                        }
                        onClaim={() =>
                            setShowPremiumOffer(false)
                        }
                    />
                )}
            </div>
        </div>
    );
}

export default function App() {
    return <HomePage />;
}