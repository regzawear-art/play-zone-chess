import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PlayWithFriends from './components/multiplayer/PlayWithFriends';

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

import {
    CreditCard,
    Gift,
    LayoutGrid,
    Settings as SettingsIcon,
} from 'lucide-react';
import AddFriendModal from './components/multiplayer/AddFriendModal';

import { sound } from './game/sound';
import { supabase, type AppUser } from './lib/supabase';

import useInvites from './hooks/useInvites';
import { useProfile } from './hooks/useProfile';
import usePresenceHeartbeat from './hooks/usePresenceHeartbeat';

import {
    getStoredTheme,
    storeTheme,
    getThemeById,
    applyThemeCSS,
} from './game/themes';

import type { OnlineGameConfig } from './hooks/useOnlineGame';
import { joinOnlineGame } from './lib/multiplayer/supabase-multiplayer';

const PIECE_VALUES: Record<PieceType, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
};

type ActiveGameItem = {
    id: string;
    host_id: string;
    guest_id: string;
    time_control: TimeControl;
    status: string;
    turn: Color;
    winner: Color | null;
    white_ms: number;
    black_ms: number;
    created_at: string;
    updated_at: string;
    payload: Record<string, any> | null;
    opponentName: string;
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

            const originalWhite =
                t === 'p' ? 8 : 2;

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
    const s = Math.max(
        0,
        Math.floor(ms / 1000)
    );

    const m = Math.floor(s / 60);

    return `${m}:${String(s % 60).padStart(
        2,
        '0'
    )}`;
}

function HomePage() {
    const [view, setView] =
        useState<string>('home');

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

    const [addFriendOpen, setAddFriendOpen] =
        useState(false);

    const [playWithFriendsOpen, setPlayWithFriendsOpen] =
        useState(false);

    const [activeGames, setActiveGames] =
        useState<ActiveGameItem[]>([]);

    const walletDB =
        useWalletDB(authUser);

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

    usePresenceHeartbeat(
        authUser?.id ?? null
    );

    /* AUTH */
    useEffect(() => {
        let mounted = true;

        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (!mounted) return;

                if (data.session?.user) {
                    setAuthUser({
                        id: data.session.user.id,
                        email:
                            data.session.user.email ??
                            '',
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
                        email:
                            session.user.email ??
                            '',
                    });

          
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

    /*
     * ACTIVE GAMES
     *
     * online_games is the source of truth for
     * games that can be resumed.
     */
    const loadActiveGames = useCallback(
        async () => {
            if (!authUser?.id) {
                setActiveGames([]);
                return;
            }

            try {
                const {
                    data: games,
                    error,
                } = await supabase
                    .from('online_games')
                    .select(`
                        id,
                        host_id,
                        guest_id,
                        time_control,
                        status,
                        turn,
                        winner,
                        white_ms,
                        black_ms,
                        created_at,
                        updated_at,
                        payload
                    `)
                    .eq('status', 'active')
                    .or(
                        `host_id.eq.${authUser.id},guest_id.eq.${authUser.id}`
                    )
                    .order('updated_at', {
                        ascending: false,
                    });

                if (error) {
                    console.error(
                        '[App] Failed to load active games:',
                        error
                    );
                    return;
                }

                if (!games?.length) {
                    setActiveGames([]);
                    return;
                }

                const opponentIds =
                    games.map((game) =>
                        game.host_id ===
                            authUser.id
                            ? game.guest_id
                            : game.host_id
                    );

                const {
                    data: profiles,
                } = await supabase
                    .from('profiles')
                    .select(
                        'id, display_name, username'
                    )
                    .in(
                        'id',
                        opponentIds
                    );

                const profileMap =
                    new Map(
                        (profiles ?? []).map(
                            (p) => [
                                p.id,
                                p.display_name ||
                                p.username ||
                                'Opponent',
                            ]
                        )
                    );

                const formattedGames: ActiveGameItem[] =
                    games.map((game) => {
                        const opponentId =
                            game.host_id ===
                                authUser.id
                                ? game.guest_id
                                : game.host_id;

                        return {
                            id: game.id,
                            host_id:
                                game.host_id,
                            guest_id:
                                game.guest_id,
                            time_control:
                                (game.time_control ||
                                    '3min') as TimeControl,
                            status:
                                game.status,
                            turn:
                                (game.turn ||
                                    'w') as Color,
                            winner:
                                (game.winner ||
                                    null) as
                                | Color
                                | null,
                            white_ms:
                                game.white_ms ??
                                180000,
                            black_ms:
                                game.black_ms ??
                                180000,
                            created_at:
                                game.created_at,
                            updated_at:
                                game.updated_at,
                            payload:
                                game.payload ??
                                null,
                            opponentName:
                                profileMap.get(
                                    opponentId
                                ) ||
                                'Opponent',
                        };
                    });

                setActiveGames(
                    formattedGames
                );
            } catch (error) {
                console.error(
                    '[App] Active games loading failed:',
                    error
                );
            }
        },
        [authUser?.id]
    );

    useEffect(() => {
        if (!authUser?.id) {
            setActiveGames([]);
            return;
        }

        loadActiveGames();

        const interval =
            window.setInterval(() => {
                loadActiveGames();
            }, 5000);

        return () => {
            window.clearInterval(
                interval
            );
        };
    }, [
        authUser?.id,
        loadActiveGames,
    ]);

    /*
     * Resume an existing online game.
     */
    const resumeOnlineGame =
        useCallback(
            (
                gameItem: ActiveGameItem
            ) => {
                if (!authUser) return;

                const isHost =
                    gameItem.host_id ===
                    authUser.id;

                const color: Color =
                    isHost ? 'w' : 'b';

                const payload =
                    gameItem.payload ?? {};

                const payloadCustomMinutes =
                    Number(
                        payload.custom_minutes ??
                        payload.customMinutes ??
                        5
                    );

                const resolvedTimeControl =
                    gameItem.time_control ||
                    '3min';

                setOnlineGameId(
                    gameItem.id
                );

                setOnlineIsHost(
                    isHost
                );

                setGameMode('online');

                setPlayerColor(
                    color
                );

                if (autoFlip) {
                    setOrientation(
                        color
                    );
                }

                setOnlineGameConfig({
                    gameId:
                        gameItem.id,
                    roomId:
                        gameItem.id,
                    isHost,
                    userId:
                        authUser.id,
                    playerColor:
                        color,
                    timeControl:
                        resolvedTimeControl,
                    customMinutes:
                        payloadCustomMinutes,
                });

                setView('home');
            },
            [authUser, autoFlip]
        );

    

    /* Shared room URL */
    useEffect(() => {
        const params =
            new URLSearchParams(
                window.location.search
            );

        const roomParam =
            params.get('room');

        if (roomParam) {
            setGameMode('room');
            setRoomOpen(true);
        }
    }, []);

    const handleLogout =
        useCallback(async () => {
            await supabase.auth.signOut();
            setAuthUser(null);
            setActiveGames([]);
        }, []);

    const opponent = PLAYERS[1];

    const user = useMemo(
        () => ({
            ...CURRENT_USER,
            avatar:
                profile?.avatar_url ||
                userAvatar,
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

    const game = useChess({
        playerColor,
        opponentColor:
            playerColor === 'w'
                ? 'b'
                : 'w',
        vsComputer:
            gameMode === 'ai',
        timeControl,
        customMinutes,
        opponentName:
            opponent.name,
        opponentAvatar:
            opponent.avatar,
        opponentFlag:
            opponent.flag,
        gameMode,
        aiDifficulty,
    });

    const navigate =
        useCallback(
            (id: string) => {
                setFooterPage(null);
                setView(id);

                requestAnimationFrame(
                    () => {
                        const el =
                            document.getElementById(
                                id
                            );

                        if (el) {
                            el.scrollIntoView({
                                behavior:
                                    'smooth',
                                block: 'start',
                            });
                        } else {
                            window.scrollTo({
                                top: 0,
                                behavior:
                                    'smooth',
                            });
                        }
                    }
                );
            },
            []
        );

    /*
     * Normal homepage Play Now.
     */
    const handlePlay =
        useCallback(() => {
            setFooterPage(null);
            setView('play');

            requestAnimationFrame(
                () => {
                    document
                        .getElementById(
                            'play'
                        )
                        ?.scrollIntoView({
                            behavior:
                                'smooth',
                            block: 'start',
                        });
                }
            );
        }, []);

    /*
     * Quick Match.
     */
    const handleQuickMatch =
        useCallback(() => {
            setGameMode('online');
            setQuickMatchSetupOpen(
                true
            );
        }, []);

    const handleLeaderboard =
        useCallback(
            () =>
                navigate(
                    'leaderboard'
                ),
            [navigate]
        );

    const onChangeColor =
        useCallback(
            (c: Color) => {
                setPlayerColor(c);

                if (autoFlip) {
                    setOrientation(
                        c
                    );
                }

                sound.play('select');
            },
            [autoFlip]
        );

    const onChangeTimeControl =
        useCallback(
            (tc: TimeControl) => {
                setTimeControl(tc);
                sound.play('select');
            },
            []
        );

    const onChangeMode = useCallback((m: GameMode) => {
        console.log('[App] onChangeMode RECEIVED:', m);
        setGameMode(m);
        sound.play('select');
    }, []);

    const onChangeDifficulty =
        useCallback(
            (d: AIDifficulty) => {
                setAiDifficulty(d);
                sound.play('select');
            },
            []
        );

    const onToggleMute =
        useCallback(() => {
            sound.unlock();

            const next = !muted;

            sound.setMuted(next);
            setMuted(next);

            if (!next) {
                sound.play(
                    'select'
                );
            }
        }, [muted]);

    const onToggleMusic =
        useCallback(() => {
            sound.unlock();
            sound.toggleMusic();
            setMusicOn(
                !sound.musicMuted
            );
        }, []);

    const onChangeVolume =
        useCallback(
            (v: number) => {
                sound.unlock();
                sound.setVolume(v);
                setVolume(v);

                if (v > 0 && muted) {
                    sound.setMuted(
                        false
                    );
                    setMuted(false);
                }
            },
            [muted]
        );

    const onResetSettings =
        useCallback(() => {
            sound.setMuted(false);
            sound.setVolume(0.7);

            setMuted(false);
            setVolume(0.7);
            setAutoFlip(true);
            setNotifications(true);
        }, []);

    /*
     * BOT GAME
     */
    const startBotGame =
        useCallback(() => {
            setQuickMatchSetupOpen(
                false
            );
            setGameStarted(true);
        }, []);

    /*
     * Setup PLAY handler.
     */
    const handleSetupPlay = useCallback(() => {
        console.log('[App] PLAY clicked');
        console.log('[App] gameMode:', gameMode);
        console.log('[App] authUser:', authUser);

        if (gameMode === 'online') {
            console.log('[App] ONLINE MODE detected');

            setQuickMatchSetupOpen(false);

            if (!authUser) {
                console.log('[App] NO AUTH USER');
                setAuthOpen(true);
                return;
            }

            console.log('[App] About to open MatchmakingPanel');
            setMatchmakingOpen(true);
            console.log('[App] setMatchmakingOpen(true) called');

            return;
        }

        if (gameMode === 'room') {
            console.log('[App] ROOM MODE detected');

            setQuickMatchSetupOpen(false);

            if (!authUser) {
                setAuthOpen(true);
                return;
            }

            setPlayWithFriendsOpen(true);
            return;
        }

        console.log('[App] Starting bot game');
        startBotGame();
    }, [
        gameMode,
        authUser,
        startBotGame,
    ]);

    /*
     * Matchmaking matched.
     */
    const handleMatched =
        useCallback(
            async (
                gameId: string,
                isHost: boolean
            ) => {
                if (!authUser) return;

                if (!isHost) {
                    try {
                        await joinOnlineGame(
                            gameId
                        );
                    } catch (error) {
                        console.error(
                            '[App] failed to join matched game:',
                            error
                        );

                        window.dispatchEvent(
                            new CustomEvent(
                                'app-toast',
                                {
                                    detail: {
                                        message:
                                            error instanceof
                                                Error
                                                ? error.message
                                                : 'Failed to join game',
                                        type: 'error',
                                    },
                                }
                            )
                        );

                        return;
                    }
                }

                const color: Color =
                    isHost ? 'w' : 'b';

                setOnlineGameId(
                    gameId
                );

                setOnlineIsHost(
                    isHost
                );

                setGameMode(
                    'online'
                );

                setPlayerColor(
                    color
                );

                if (autoFlip) {
                    setOrientation(
                        color
                    );
                }

                setOnlineGameConfig({
                    gameId,
                    roomId: gameId,
                    isHost,
                    userId:
                        authUser.id,
                    playerColor:
                        color,
                    timeControl,
                    customMinutes,
                });

                setMatchmakingOpen(
                    false
                );
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
        const onCreated = (
            e: any
        ) => {
            const raw = e?.detail;

            if (
                !raw ||
                !authUser
            ) {
                return;
            }

            const createdGame =
                raw.data ??
                (Array.isArray(raw)
                    ? raw[0]
                    : raw);

            if (
                !createdGame ||
                typeof createdGame !==
                'object'
            ) {
                return;
            }

            const id =
                createdGame.id ??
                createdGame.game_id ??
                null;

            if (!id) {
                console.warn(
                    '[App] online-game-created event missing id',
                    createdGame
                );
                return;
            }

            const hostId =
                createdGame.host_id ??
                createdGame.host ??
                null;

            const whiteId =
                createdGame.white_id ??
                createdGame.white ??
                null;

            const isHost =
                hostId ===
                authUser.id ||
                whiteId ===
                authUser.id ||
                createdGame.host_id ===
                authUser.id;

            const color: Color =
                isHost ? 'w' : 'b';

            const derivedTimeControl =
                createdGame.time_control ??
                createdGame.payload
                    ?.time_control ??
                timeControl ??
                null;

            setOnlineGameId(id);
            setOnlineIsHost(
                isHost
            );
            setGameMode(
                'online'
            );
            setPlayerColor(
                color
            );

            if (autoFlip) {
                setOrientation(
                    color
                );
            }

            setOnlineGameConfig({
                gameId: id,
                roomId: id,
                isHost,
                userId:
                    authUser.id,
                playerColor:
                    color,
                timeControl:
                    derivedTimeControl,
                customMinutes,
            });
        };

        window.addEventListener(
            'online-game-created',
            onCreated as EventListener
        );

        const onInviteAccepted = (
            ev: any
        ) => {
            const invite =
                ev.detail?.invite;

            if (
                !invite?.game_id ||
                !authUser
            ) {
                return;
            }

            if (
                invite.from_user !==
                authUser.id
            ) {
                return;
            }

            console.log(
                '[App] Opening accepted game:',
                invite.game_id
            );

            (async () => {
                try {
                    const {
                        data: gameRow,
                        error,
                    } =
                        await supabase
                            .from(
                                'online_games'
                            )
                            .select(
                                '*'
                            )
                            .eq(
                                'id',
                                invite.game_id
                            )
                            .single();

                    if (error) {
                        console.error(
                            '[App] Failed to load accepted game:',
                            error
                        );
                        return;
                    }

                    if (!gameRow) {
                        console.error(
                            '[App] Accepted game not found:',
                            invite.game_id
                        );
                        return;
                    }

                    const isHost =
                        gameRow.host_id ===
                        authUser.id;

                    const color: Color =
                        isHost
                            ? 'w'
                            : 'b';

                    const derivedTimeControl =
                        gameRow.time_control ??
                        gameRow.payload
                            ?.time_control ??
                        timeControl ??
                        '3min';

                    setOnlineGameId(
                        gameRow.id
                    );

                    setOnlineIsHost(
                        isHost
                    );

                    setGameMode(
                        'online'
                    );

                    setPlayerColor(
                        color
                    );

                    if (autoFlip) {
                        setOrientation(
                            color
                        );
                    }

                    setOnlineGameConfig(
                        {
                            gameId:
                                gameRow.id,
                            roomId:
                                gameRow.id,
                            isHost,
                            userId:
                                authUser.id,
                            playerColor:
                                color,
                            timeControl:
                                derivedTimeControl,
                            customMinutes,
                        }
                    );

                    console.log(
                        '[App] ONLINE GAME CONFIG SET:',
                        gameRow.id,
                        color
                    );
                } catch (err) {
                    console.error(
                        '[App] invite accepted handler failed:',
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
     * The dedicated useOnlineGame hook now owns:
     *
     * - move persistence
     * - move reconstruction
     * - realtime opponent moves
     * - clocks
     * - turn persistence
     *
     * Therefore App.tsx intentionally does NOT
     * duplicate those effects here.
     */

    useEffect(() => {
        const openAdd = () =>
            setAddFriendOpen(true);

        window.addEventListener(
            'open-add-friend',
            openAdd as EventListener
        );

        return () => {
            window.removeEventListener(
                'open-add-friend',
                openAdd as EventListener
            );
        };
    }, []);

    const whitePlayer =
        playerColor === 'w'
            ? user
            : opponent;

    const blackPlayer =
        playerColor === 'w'
            ? opponent
            : user;

    const winnerName =
        game.status.winner ===
            'w'
            ? whitePlayer.name
            : blackPlayer.name;

    const playerWon =
        game.status.winner ===
        playerColor;

    const closePopup =
        useCallback(() => {
            setDismissKey(
                (k) => k + 1
            );
        }, []);

    const [dismissKey, setDismissKey] =
        useState(0);

    const pendingKey = useRef(0);

    const showPopup =
        game.pendingResult &&
        dismissKey !==
        pendingKey.current;

    useEffect(() => {
        if (game.pendingResult) {
            pendingKey.current =
                dismissKey + 1;
        }
    }, [
        game.pendingResult,
        dismissKey,
    ]);

    const onNewGame =
        useCallback(() => {
            setDismissKey(
                pendingKey.current
            );
            game.startGame();
        }, [game]);

    const stageForPanel =
        game.stageLabel as
        | GameStage
        | 'Not started'
        | 'Game over';

    const captured = useMemo(
        () =>
            computeCaptured(
                game.board
            ),
        [game.board]
    );

    const onFooterPage =
        useCallback(
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
     */
    if (gameStarted) {
        return (
            <ChessGamePage
                gameMode={gameMode}
                aiDifficulty={
                    aiDifficulty
                }
                playerColor={
                    playerColor
                }
                timeControl={
                    timeControl
                }
                customMinutes={
                    customMinutes
                }
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
                    onLogin={() =>
                        setAuthOpen(
                            true
                        )
                    }
                    onLogout={
                        handleLogout
                    }
                    onWallet={() =>
                        setWalletOpen(
                            true
                        )
                    }
                    walletBalanceInr={
                        walletDB.balanceInr
                    }
                />

                <div className="mx-auto w-full max-w-[1400px]">
                    <main className="flex min-w-0 flex-col pt-14">
                        <FooterPage
                            page={
                                footerPage as any
                            }
                            onBack={() => {
                                setFooterPage(
                                    null
                                );
                                navigate(
                                    'home'
                                );
                            }}
                        />

                        <Footer
                            onNavigate={
                                navigate
                            }
                            onFooterPage={
                                onFooterPage
                            }
                        />

                        <AuthModal
                            open={
                                authOpen
                            }
                            onClose={() =>
                                setAuthOpen(
                                    false
                                )
                            }
                            onAuthed={(u) => {
                                setAuthUser(
                                    u
                                );
                                setAuthOpen(
                                    false
                                );
                            }}
                        />
                    </main>
                </div>
            </div>
        );
    }

    /*
     * ONLINE GAME.
     */
    if (onlineGameConfig) {
        const handleExitOnline =
            () => {
                setOnlineGameConfig(
                    null
                );
                setOnlineGameId(
                    null
                );
                setActiveRoomId(
                    null
                );
                setGameMode('ai');
                setView('home');

                loadActiveGames();
            };

        const handleRematch = async () => {
            if (!onlineGameConfig || !authUser) {
                return;
            }

            try {
                // Get the finished game so we can create
                // a completely new online_games row.
                const {
                    data: previousGame,
                    error: previousGameError,
                } = await supabase
                    .from('online_games')
                    .select(
                        'host_id, guest_id, time_control, payload'
                    )
                    .eq(
                        'id',
                        onlineGameConfig.gameId
                    )
                    .single();

                if (
                    previousGameError ||
                    !previousGame
                ) {
                    console.error(
                        '[App] Failed to load previous game for rematch:',
                        previousGameError
                    );

                    window.dispatchEvent(
                        new CustomEvent(
                            'app-toast',
                            {
                                detail: {
                                    message:
                                        'Unable to start rematch',
                                    type: 'error',
                                },
                            }
                        )
                    );

                    return;
                }

                const previousPayload =
                    previousGame.payload ?? {};

                const customMinutesValue =
                    Number(
                        previousPayload.custom_minutes ??
                        previousPayload.customMinutes ??
                        onlineGameConfig.customMinutes ??
                        5
                    );

                // Create a REAL new online_games row.
                // PostgreSQL/Supabase generates a fresh UUID.
                const {
                    data: newGame,
                    error: newGameError,
                } = await supabase
                    .from('online_games')
                    .insert({
                        host_id:
                            previousGame.host_id,
                        guest_id:
                            previousGame.guest_id,
                        time_control:
                            previousGame.time_control ??
                            onlineGameConfig.timeControl,
                        status: 'active',
                        turn: 'w',
                        white_ms:
                            onlineGameConfig.timeControl ===
                                'custom'
                                ? customMinutesValue * 60 * 1000
                                : onlineGameConfig.timeControl ===
                                    '1min'
                                    ? 60 * 1000
                                    : onlineGameConfig.timeControl ===
                                        '10min'
                                        ? 10 * 60 * 1000
                                        : 3 * 60 * 1000,
                        black_ms:
                            onlineGameConfig.timeControl ===
                                'custom'
                                ? customMinutesValue * 60 * 1000
                                : onlineGameConfig.timeControl ===
                                    '1min'
                                    ? 60 * 1000
                                    : onlineGameConfig.timeControl ===
                                        '10min'
                                        ? 10 * 60 * 1000
                                        : 3 * 60 * 1000,
                        clock_updated_at:
                            new Date().toISOString(),
                        payload: {
                            ...previousPayload,
                            custom_minutes:
                                customMinutesValue,
                            result_reason: null,
                        },
                    })
                    .select()
                    .single();

                if (
                    newGameError ||
                    !newGame
                ) {
                    console.error(
                        '[App] Failed to create rematch:',
                        newGameError
                    );

                    window.dispatchEvent(
                        new CustomEvent(
                            'app-toast',
                            {
                                detail: {
                                    message:
                                        newGameError?.message ??
                                        'Unable to create rematch',
                                    type: 'error',
                                },
                            }
                        )
                    );

                    return;
                }

                const newGameId =
                    newGame.id;

                // Keep the same player/color assignment.
                const color =
                    onlineGameConfig.playerColor;

                setOnlineGameId(
                    newGameId
                );

                setOnlineIsHost(
                    onlineGameConfig.isHost
                );

                setPlayerColor(
                    color
                );

                if (autoFlip) {
                    setOrientation(color);
                }

                setOnlineGameConfig({
                    ...onlineGameConfig,
                    gameId: newGameId,
                    roomId: newGameId,
                    timeControl:
                        (newGame.time_control ??
                            onlineGameConfig.timeControl) as TimeControl,
                    customMinutes:
                        customMinutesValue,
                });

                console.log(
                    '[App] Rematch created:',
                    newGameId
                );
            } catch (error) {
                console.error(
                    '[App] Rematch failed:',
                    error
                );

                window.dispatchEvent(
                    new CustomEvent(
                        'app-toast',
                        {
                            detail: {
                                message:
                                    'Unable to start rematch',
                                type: 'error',
                            },
                        }
                    )
                );
            }
        };

        return (
            <div className="min-h-screen bg-navy-800">
                <TopHeader
                    active="play"
                    onNavigate={
                        navigate
                    }
                    user={authUser}
                    onLogin={() =>
                        setAuthOpen(
                            true
                        )
                    }
                    onLogout={
                        handleLogout
                    }
                    onWallet={() =>
                        setWalletOpen(
                            true
                        )
                    }
                    walletBalanceInr={
                        walletDB.balanceInr
                    }
                />

                <div className="mx-auto w-full max-w-[1400px]">
                    <main className="flex min-w-0 flex-col pt-14">
                        <OnlineGameView
                            config={
                                onlineGameConfig
                            }
                            themeId={
                                boardThemeId
                            }
                            onThemeChange={(
                                id
                            ) => {
                                setBoardThemeId(
                                    id
                                );
                                storeTheme(
                                    id
                                );
                            }}
                            onExit={
                                handleExitOnline
                            }
                            onRematch={
                                handleRematch
                            }
                        />

                        <AuthModal
                            open={
                                authOpen
                            }
                            onClose={() =>
                                setAuthOpen(
                                    false
                                )
                            }
                            onAuthed={(u) => {
                                setAuthUser(
                                    u
                                );
                                setAuthOpen(
                                    false
                                );
                            }}
                        />
                    </main>
                </div>
            </div>
        );
    }

    const gameDuration =
        formatDuration(
            (timeControl ===
                '1min'
                ? 60000
                : timeControl ===
                    '3min'
                    ? 180000
                    : timeControl ===
                        '10min'
                        ? 600000
                        : customMinutes *
                        60000) *
            2 -
            (game.whiteMs +
                game.blackMs)
        );

    return (
        <div className="min-h-screen overflow-x-hidden bg-navy-800">
            <TopHeader
                active={view}
                onNavigate={navigate}
                user={authUser}
                onLogin={() =>
                    setAuthOpen(true)
                }
                onLogout={
                    handleLogout
                }
                onWallet={() =>
                    setWalletOpen(true)
                }
                walletBalanceInr={
                    walletDB.balanceInr
                }
            />

            <div className="mx-auto w-full max-w-[1400px]">
                <main className="flex min-w-0 flex-col pt-14">
                    <Hero
                        onPlay={
                            handleQuickMatch
                        }
                        onQuickMatch={
                            handleQuickMatch
                        }
                        onLeaderboard={
                            handleLeaderboard
                        }
                        onAuth={() =>
                            setAuthOpen(
                                true
                            )
                        }
                        onOnline={() => {
                            setGameMode(
                                'online'
                            );
                            handlePlay();
                        }}
                        onRooms={() => {
                            setGameMode(
                                'room'
                            );
                            handlePlay();
                        }}
                        onAI={() => {
                            setGameMode(
                                'ai'
                            );
                            handlePlay();
                        }}
                    />

                    {/* ACTIVE GAMES */}
                    {authUser &&
                        activeGames.length >
                        0 && (
                            <section className="w-full px-4 pb-8 sm:px-6 lg:px-8">
                                <div className="rounded-2xl border border-white/10 bg-navy-700/60 p-5 shadow-xl backdrop-blur-sm">
                                    <div className="mb-5 flex items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

                                                <h2 className="font-display text-xl font-extrabold text-white sm:text-2xl">
                                                    Active Games
                                                </h2>
                                            </div>

                                            <p className="mt-1 text-sm text-navy-300">
                                                Continue your unfinished multiplayer games.
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-royal-500/15 px-3 py-1 text-xs font-semibold text-royal-300 ring-1 ring-royal-500/25">
                                            {
                                                activeGames.length
                                            }{' '}
                                            {activeGames.length ===
                                                1
                                                ? 'game'
                                                : 'games'}
                                        </span>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {activeGames.map(
                                            (
                                                gameItem
                                            ) => {
                                                const isWhite =
                                                    gameItem.host_id ===
                                                    authUser.id;

                                                const yourTurn =
                                                    (isWhite &&
                                                        gameItem.turn ===
                                                        'w') ||
                                                    (!isWhite &&
                                                        gameItem.turn ===
                                                        'b');

                                                const yourClock =
                                                    isWhite
                                                        ? gameItem.white_ms
                                                        : gameItem.black_ms;

                                                const opponentClock =
                                                    isWhite
                                                        ? gameItem.black_ms
                                                        : gameItem.white_ms;

                                                return (
                                                    <div
                                                        key={
                                                            gameItem.id
                                                        }
                                                        className="rounded-xl border border-white/10 bg-navy-800/80 p-4"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="truncate font-semibold text-white">
                                                                    vs.{' '}
                                                                    {
                                                                        gameItem.opponentName
                                                                    }
                                                                </p>

                                                                <p className="mt-1 text-xs text-navy-400">
                                                                    {gameItem.time_control ===
                                                                        'custom'
                                                                        ? `${gameItem.payload?.custom_minutes ??
                                                                        gameItem.payload?.customMinutes ??
                                                                        5
                                                                        } min`
                                                                        : gameItem.time_control}
                                                                    {' • '}
                                                                    {isWhite
                                                                        ? 'White'
                                                                        : 'Black'}
                                                                </p>
                                                            </div>

                                                            <span
                                                                className={
                                                                    `shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${yourTurn
                                                                        ? 'bg-emerald-500/15 text-emerald-300'
                                                                        : 'bg-navy-600 text-navy-300'
                                                                    }`
                                                                }
                                                            >
                                                                {yourTurn
                                                                    ? 'Your turn'
                                                                    : "Opponent's turn"}
                                                            </span>
                                                        </div>

                                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                                            <div className="rounded-lg bg-navy-900/70 p-2.5">
                                                                <p className="text-[10px] uppercase tracking-wider text-navy-500">
                                                                    You
                                                                </p>

                                                                <p className="mt-1 font-mono text-sm font-bold text-white">
                                                                    {formatDuration(
                                                                        yourClock
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <div className="rounded-lg bg-navy-900/70 p-2.5">
                                                                <p className="text-[10px] uppercase tracking-wider text-navy-500">
                                                                    Opponent
                                                                </p>

                                                                <p className="mt-1 font-mono text-sm font-bold text-white">
                                                                    {formatDuration(
                                                                        opponentClock
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                resumeOnlineGame(
                                                                    gameItem
                                                                )
                                                            }
                                                            className="mt-4 w-full rounded-lg bg-royal-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-royal-400"
                                                        >
                                                            Resume Game
                                                        </button>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                    <Features />

                    {/* SETUP */}
                    <section
                        id="play"
                        className="w-full scroll-mt-20 px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
                    >
                        <GameSetup
                            gameMode={
                                gameMode
                            }
                            onChangeMode={
                                onChangeMode
                            }
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
                    </section>

                    {/* LEADERBOARD */}
                    <section
                        id="leaderboard"
                        className="w-full px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
                    >
                        <div className="mb-8 text-center">
                            <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
                                <LayoutGrid
                                    size={
                                        13
                                    }
                                />
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
                                <CreditCard
                                    size={
                                        13
                                    }
                                />
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
                            userId={
                                authUser?.id ??
                                null
                            }
                            onLogin={() =>
                                setAuthOpen(
                                    true
                                )
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
                                <Gift
                                    size={
                                        13
                                    }
                                />
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
                            userId={
                                authUser?.id ??
                                null
                            }
                            onLogin={() =>
                                setAuthOpen(
                                    true
                                )
                            }
                            onReferralComplete={(
                                email
                            ) =>
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
                            userId={
                                authUser?.id ??
                                null
                            }
                            onLogin={() =>
                                setAuthOpen(
                                    true
                                )
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
                                <LayoutGrid
                                    size={
                                        13
                                    }
                                />
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
                                    profile={
                                        profile
                                    }
                                    onUpdate={
                                        updateProfile
                                    }
                                />
                            ) : (
                                <ProfileCard
                                    user={
                                        user
                                    }
                                />
                            )}

                            <MatchHistory
                                matches={
                                    game.matches
                                }
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
                                <SettingsIcon
                                    size={
                                        13
                                    }
                                />
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
                                userAvatar={
                                    userAvatar
                                }
                                onUploadAvatar={
                                    setUserAvatar
                                }
                                muted={
                                    muted
                                }
                                onToggleMute={
                                    onToggleMute
                                }
                                volume={
                                    volume
                                }
                                onChangeVolume={
                                    onChangeVolume
                                }
                                autoFlip={
                                    autoFlip
                                }
                                onToggleAutoFlip={() =>
                                    setAutoFlip(
                                        (v) =>
                                            !v
                                    )
                                }
                                notifications={
                                    notifications
                                }
                                onToggleNotifications={() =>
                                    setNotifications(
                                        (v) =>
                                            !v
                                    )
                                }
                                onResetSettings={
                                    onResetSettings
                                }
                                matchCount={
                                    game
                                        .matches
                                        .length
                                }
                                onClearHistory={
                                    game.clearMatchHistory
                                }
                            />
                        </div>
                    </section>

                    <Footer
                        onNavigate={
                            navigate
                        }
                        onFooterPage={
                            onFooterPage
                        }
                    />
                </main>

                {/* Existing game-over popup */}
                {showPopup &&
                    game.pendingResult && (
                        <GameOverPopup
                            status={
                                game
                                    .pendingResult
                                    .status
                            }
                            ending={
                                game
                                    .pendingResult
                                    .ending
                            }
                            onClose={
                                closePopup
                            }
                            onNewGame={
                                onNewGame
                            }
                            winnerName={
                                winnerName
                            }
                            playerWon={
                                playerWon
                            }
                            moves={
                                game
                                    .history
                                    .length
                            }
                            duration={
                                gameDuration
                            }
                            ratingChange={
                                playerWon
                                    ? 8
                                    : game
                                        .pendingResult
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
                        setAuthOpen(
                            false
                        )
                    }
                    onAuthed={(u) => {
                        setAuthUser(u);
                        setAuthOpen(
                            false
                        );
                    }}
                />

                {/* WALLET */}
                <WalletModalDB
                    open={
                        walletOpen
                    }
                    onClose={() =>
                        setWalletOpen(
                            false
                        )
                    }
                    balanceInr={
                        walletDB.balanceInr
                    }
                    transactions={
                        walletDB.transactions
                    }
                    onRedeemCoupon={
                        walletDB.redeemCoupon
                    }
                />

                {/* ROOM */}
                <RoomPanel
                    open={
                        roomOpen
                    }
                    onClose={() =>
                        setRoomOpen(
                            false
                        )
                    }
                    userId={
                        authUser?.id ??
                        null
                    }
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
                        setActiveRoomId(
                            rid
                        );

                        if (!authUser)
                            return;

                        let gameId:
                            | string
                            | null =
                            null;

                        if (!isHost) {
                            const {
                                data: room,
                            } =
                                await supabase
                                    .from(
                                        'rooms'
                                    )
                                    .select(
                                        'host_id'
                                    )
                                    .eq(
                                        'id',
                                        rid
                                    )
                                    .maybeSingle();

                            if (
                                room?.host_id
                            ) {
                                const {
                                    data: ogRow,
                                } =
                                    await supabase
                                        .from(
                                            'online_games'
                                        )
                                        .insert(
                                            {
                                                host_id:
                                                    room.host_id,
                                                guest_id:
                                                    authUser.id,
                                                time_control:
                                                    tc,
                                                status:
                                                    'active',
                                                turn: 'w',
                                            }
                                        )
                                        .select()
                                        .maybeSingle();

                                if (ogRow) {
                                    gameId =
                                        ogRow.id;

                                    await supabase
                                        .from(
                                            'rooms'
                                        )
                                        .update(
                                            {
                                                game_id:
                                                    gameId,
                                            }
                                        )
                                        .eq(
                                            'id',
                                            rid
                                        );
                                }
                            }
                        } else {
                            for (
                                let i = 0;
                                i < 30;
                                i++
                            ) {
                                const {
                                    data: room,
                                } =
                                    await supabase
                                        .from(
                                            'rooms'
                                        )
                                        .select(
                                            'game_id'
                                        )
                                        .eq(
                                            'id',
                                            rid
                                        )
                                        .maybeSingle();

                                if (
                                    room?.game_id
                                ) {
                                    gameId =
                                        room.game_id;
                                    break;
                                }

                                await new Promise(
                                    (
                                        r
                                    ) =>
                                        setTimeout(
                                            r,
                                            500
                                        )
                                );
                            }
                        }

                        if (gameId) {
                            setOnlineGameConfig(
                                {
                                    gameId,
                                    roomId:
                                        rid,
                                    isHost,
                                    userId:
                                        authUser.id,
                                    playerColor:
                                        isHost
                                            ? 'w'
                                            : 'b',
                                    timeControl:
                                        tc,
                                    customMinutes,
                                }
                            );

                            setOnlineGameId(
                                gameId
                            );

                            setOnlineIsHost(
                                isHost
                            );

                            setGameMode(
                                'online'
                            );

                            setPlayerColor(
                                isHost
                                    ? 'w'
                                    : 'b'
                            );

                            if (
                                autoFlip
                            ) {
                                setOrientation(
                                    isHost
                                        ? 'w'
                                        : 'b'
                                );
                            }

                            setRoomOpen(
                                false
                            );
                        }
                    }}
                />

                {/* MATCHMAKING */}
                <MatchmakingPanel
                    open={
                        matchmakingOpen
                    }
                    onClose={() =>
                        setMatchmakingOpen(
                            false
                        )
                    }
                    userId={
                        authUser?.id ??
                        null
                    }
                    timeControl={
                        timeControl ===
                            'custom'
                            ? `${customMinutes}min`
                            : timeControl
                    }
                    onMatched={
                        handleMatched
                    }
                    onLogin={() =>
                        setAuthOpen(
                            true
                        )
                    }
                />

                {/* QUICK MATCH SETUP POPUP */}
                {quickMatchSetupOpen && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
                        onMouseDown={(
                            e
                        ) => {
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
                                gameMode={
                                    gameMode
                                }
                                onChangeMode={
                                    onChangeMode
                                }
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
                            setShowBonusPopup(
                                false
                            )
                        }
                        onClaim={
                            claimBonus
                        }
                    />
                )}

                {/* PREMIUM */}
                {showPremiumOffer && (
                    <PremiumOfferPopup
                        onClose={() =>
                            setShowPremiumOffer(
                                false
                            )
                        }
                        onClaim={() =>
                            setShowPremiumOffer(
                                false
                            )
                        }
                    />
                )}

                {/* ADD FRIEND */}
                {addFriendOpen && (
                    <AddFriendModal
                        open={addFriendOpen}
                        onClose={() =>
                            setAddFriendOpen(false)
                        }
                    />
                )}

                {/* PLAY WITH FRIENDS */}
                {playWithFriendsOpen && (
                    <PlayWithFriends
                        onClose={() =>
                            setPlayWithFriendsOpen(false)
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