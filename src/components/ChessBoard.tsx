import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    Board,
    Color,
    GameStatus,
    Move,
    Piece,
    PieceType,
} from '../game/types';
import { pieceSVG } from '../game/pieces';
import { Trophy, Handshake } from 'lucide-react';

interface Props {
    board: Board;
    selected: [number, number] | null;
    legal: Move[];
    lastMove: Move | null;
    status: GameStatus;
    orientation: Color;
    turn: Color;
    onSquareClick: (r: number, c: number) => void;
    onDrop: (from: [number, number], to: [number, number]) => boolean;
    promotion: {
        from: [number, number];
        to: [number, number];
        moves: Move[];
    } | null;
    onChoosePromotion: (move: Move) => void;
    onCancelPromotion: () => void;
    thinking?: boolean;
    showCoords?: boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function ChessBoard({
    board,
    selected,
    legal,
    lastMove,
    status,
    orientation,
    turn,
    onSquareClick,
    onDrop,
    promotion,
    onChoosePromotion,
    onCancelPromotion,
    thinking,
    showCoords = true,
}: Props) {
    const rows =
        orientation === 'w'
            ? [0, 1, 2, 3, 4, 5, 6, 7]
            : [7, 6, 5, 4, 3, 2, 1, 0];

    const cols =
        orientation === 'w'
            ? [0, 1, 2, 3, 4, 5, 6, 7]
            : [7, 6, 5, 4, 3, 2, 1, 0];

    const pieces = useMemo(() => {
        const out: {
            piece: Piece;
            row: number;
            col: number;
        }[] = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];

                if (piece) {
                    out.push({
                        piece,
                        row: r,
                        col: c,
                    });
                }
            }
        }

        return out;
    }, [board]);

    const containerRef = useRef<HTMLDivElement>(null);

    /*
     * We no longer calculate board size with JavaScript.
     *
     * The board is always:
     *   width: 100%
     *   aspect-ratio: 1 / 1
     *
     * The parent decides how large it can become.
     */
    const [cellSize, setCellSize] = useState(0);

    const prevPositions = useRef<
        Map<number, { r: number; c: number }>
    >(new Map());

    const [drag, setDrag] = useState<{
        from: [number, number];
        x: number;
        y: number;
        piece: Piece;
    } | null>(null);

    const dragOffsetRef = useRef({
        dx: 0,
        dy: 0,
    });

    /*
     * Measure only the actual rendered board.
     *
     * This is NOT used to size the board.
     * It is only needed for:
     * - drag ghost
     * - promotion picker
     * - FLIP animation
     */
    useEffect(() => {
        const element = containerRef.current;

        if (!element) return;

        const updateCellSize = () => {
            const rect = element.getBoundingClientRect();

            if (rect.width > 0) {
                setCellSize(rect.width / 8);
            }
        };

        updateCellSize();

        const observer = new ResizeObserver(updateCellSize);
        observer.observe(element);

        window.addEventListener('resize', updateCellSize);

        return () => {
            observer.disconnect();
            window.removeEventListener(
                'resize',
                updateCellSize
            );
        };
    }, []);

    /*
     * FLIP animation
     */
    useEffect(() => {
        if (!cellSize) return;

        const container = containerRef.current;

        if (!container) return;

        const elements =
            container.querySelectorAll<HTMLElement>(
                '[data-piece-id]'
            );

        elements.forEach((element) => {
            const id = Number(
                element.dataset.pieceId
            );

            const previous =
                prevPositions.current.get(id);

            if (!previous) return;

            const currentRow = Number(
                element.dataset.row
            );

            const currentCol = Number(
                element.dataset.col
            );

            const displayedRow =
                orientation === 'w'
                    ? currentRow
                    : 7 - currentRow;

            const displayedCol =
                orientation === 'w'
                    ? currentCol
                    : 7 - currentCol;

            const previousDisplayedRow =
                orientation === 'w'
                    ? previous.r
                    : 7 - previous.r;

            const previousDisplayedCol =
                orientation === 'w'
                    ? previous.c
                    : 7 - previous.c;

            const dx =
                (previousDisplayedCol - displayedCol) *
                cellSize;

            const dy =
                (previousDisplayedRow - displayedRow) *
                cellSize;

            if (dx === 0 && dy === 0) return;

            element.style.transition = 'none';
            element.style.transform =
                `translate(${dx}px, ${dy}px)`;

            void element.offsetWidth;

            element.style.transition = '';
            element.style.transform = '';
        });

        const nextPositions = new Map<
            number,
            { r: number; c: number }
        >();

        pieces.forEach(({ piece, row, col }) => {
            nextPositions.set(piece.id, {
                r: row,
                c: col,
            });
        });

        prevPositions.current = nextPositions;
    }, [
        board,
        cellSize,
        orientation,
        pieces,
    ]);

    /*
     * Convert pointer coordinates into a chess square.
     */
    const clientToSquare = useCallback(
        (
            clientX: number,
            clientY: number
        ): [number, number] | null => {
            const element =
                containerRef.current;

            if (!element || !cellSize) {
                return null;
            }

            const rect =
                element.getBoundingClientRect();

            const x = clientX - rect.left;
            const y = clientY - rect.top;

            if (
                x < 0 ||
                y < 0 ||
                x > rect.width ||
                y > rect.height
            ) {
                return null;
            }

            const displayedCol =
                Math.floor(x / cellSize);

            const displayedRow =
                Math.floor(y / cellSize);

            const logicalRow =
                orientation === 'w'
                    ? displayedRow
                    : 7 - displayedRow;

            const logicalCol =
                orientation === 'w'
                    ? displayedCol
                    : 7 - displayedCol;

            if (
                logicalRow < 0 ||
                logicalRow > 7 ||
                logicalCol < 0 ||
                logicalCol > 7
            ) {
                return null;
            }

            return [logicalRow, logicalCol];
        },
        [cellSize, orientation]
    );

    /*
     * Drag start
     */
    const startDrag = useCallback(
        (
            event: React.PointerEvent,
            row: number,
            col: number,
            piece: Piece
        ) => {
            if (
                status.phase === 'checkmate' ||
                status.phase === 'stalemate'
            ) {
                return;
            }

            event.preventDefault();

            const element =
                event.currentTarget as HTMLElement;

            element.setPointerCapture(
                event.pointerId
            );

            const rect =
                element.getBoundingClientRect();

            dragOffsetRef.current = {
                dx:
                    event.clientX -
                    (rect.left + rect.width / 2),

                dy:
                    event.clientY -
                    (rect.top + rect.height / 2),
            };

            setDrag({
                from: [row, col],
                x: event.clientX,
                y: event.clientY,
                piece,
            });
        },
        [status.phase]
    );

    /*
     * Drag move
     */
    const onPointerMove = useCallback(
        (event: React.PointerEvent) => {
            if (!drag) return;

            event.preventDefault();

            setDrag((current) =>
                current
                    ? {
                        ...current,
                        x: event.clientX,
                        y: event.clientY,
                    }
                    : null
            );
        },
        [drag]
    );

    /*
     * Drag end
     */
    const endDrag = useCallback(
        (event: React.PointerEvent) => {
            if (!drag) return;

            event.preventDefault();

            const target = clientToSquare(
                event.clientX,
                event.clientY
            );

            if (target) {
                const success = onDrop(
                    drag.from,
                    target
                );

                if (!success) {
                    onSquareClick(
                        drag.from[0],
                        drag.from[1]
                    );
                }
            }

            setDrag(null);
        },
        [
            drag,
            clientToSquare,
            onDrop,
            onSquareClick,
        ]
    );

    const isTarget = useCallback(
        (row: number, col: number) =>
            legal.some(
                (move) =>
                    move.to[0] === row &&
                    move.to[1] === col
            ),
        [legal]
    );

    const isSelected = useCallback(
        (row: number, col: number) =>
            selected?.[0] === row &&
            selected?.[1] === col,
        [selected]
    );

    const isLastFrom = useCallback(
        (row: number, col: number) =>
            lastMove?.from[0] === row &&
            lastMove?.from[1] === col,
        [lastMove]
    );

    const isLastTo = useCallback(
        (row: number, col: number) =>
            lastMove?.to[0] === row &&
            lastMove?.to[1] === col,
        [lastMove]
    );

    /*
     * Check square
     */
    const checkSquare =
        useMemo<[number, number] | null>(() => {
            if (
                status.phase !== 'check' &&
                status.phase !== 'checkmate'
            ) {
                return null;
            }

            const loser: Color =
                status.phase === 'checkmate'
                    ? status.winner === 'w'
                        ? 'b'
                        : 'w'
                    : turn;

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = board[row][col];

                    if (
                        piece &&
                        piece.type === 'k' &&
                        piece.color === loser
                    ) {
                        return [row, col];
                    }
                }
            }

            return null;
        }, [board, status, turn]);

    const draggingFrom = drag
        ? `${drag.from[0]}-${drag.from[1]}`
        : null;

    return (
        <div className="relative w-full">
            {/* =====================================================
          BOARD
         ===================================================== */}
            <div
                ref={containerRef}
                className="
          relative
          grid
          aspect-square
          w-full
          grid-cols-8
          overflow-hidden
          rounded-md
          border
          border-black/30
          shadow-2xl
          touch-none
          select-none
        "
                style={{
                    touchAction: 'none',
                }}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                {rows.map((row) =>
                    cols.map((col) => {
                        const isLight =
                            (row + col) % 2 === 0;

                        const target =
                            isTarget(row, col);

                        const selectedSquare =
                            isSelected(row, col);

                        const lastFrom =
                            isLastFrom(row, col);

                        const lastTo =
                            isLastTo(row, col);

                        const isCheck =
                            checkSquare?.[0] === row &&
                            checkSquare?.[1] === col;

                        const piece = board[row][col];

                        const isDraggingThis =
                            draggingFrom ===
                            `${row}-${col}`;

                        const showFileLabel =
                            col ===
                            (orientation === 'w' ? 7 : 0);

                        const showRankLabel =
                            row ===
                            (orientation === 'w' ? 7 : 0);

                        return (
                            <button
                                key={`${row}-${col}`}
                                type="button"
                                onClick={() =>
                                    onSquareClick(row, col)
                                }
                                className={`
                  relative
                  flex
                  aspect-square
                  items-center
                  justify-center
                  outline-none
                  transition-colors
                  duration-200
                  ${isLight
                                        ? 'square-light'
                                        : 'square-dark'
                                    }
                `}
                                aria-label={`
                  ${FILES[col]}${RANKS[row]}
                  ${piece
                                        ? ` ${piece.color === 'w'
                                            ? 'white'
                                            : 'black'
                                        } ${piece.type}`
                                        : ''
                                    }
                `}
                            >
                                {/* Last move */}
                                {(lastFrom || lastTo) && (
                                    <span
                                        className="absolute inset-0"
                                        style={{
                                            backgroundColor:
                                                'var(--board-last-move)',
                                        }}
                                    />
                                )}

                                {/* Check */}
                                {isCheck && (
                                    <span
                                        className="
                      absolute
                      inset-0
                      animate-glow-pulse
                    "
                                        style={{
                                            backgroundColor:
                                                'var(--board-check-bg)',
                                            boxShadow:
                                                'inset 0 0 0 2px rgba(229,57,53,0.7)',
                                        }}
                                    />
                                )}

                                {/* Legal move */}
                                {target && !piece && (
                                    <span
                                        className="
                      legal-dot
                      absolute
                      h-1/3
                      w-1/3
                      rounded-full
                    "
                                    />
                                )}

                                {/* Capture */}
                                {target && piece && (
                                    <span
                                        className="
                      legal-ring
                      absolute
                      inset-0
                      rounded-none
                    "
                                    />
                                )}

                                {/* Selected */}
                                {selectedSquare && (
                                    <span
                                        className="absolute inset-0"
                                        style={{
                                            backgroundColor:
                                                'var(--board-select)',
                                            opacity: 0.5,
                                        }}
                                    />
                                )}

                                {/* Coordinates */}
                                {showCoords &&
                                    showFileLabel && (
                                        <span
                                            className={`
                        coord-label
                        coord-file
                        ${isLight
                                                    ? 'coord-light'
                                                    : 'coord-dark'
                                                }
                      `}
                                        >
                                            {FILES[col]}
                                        </span>
                                    )}

                                {showCoords &&
                                    showRankLabel && (
                                        <span
                                            className={`
                        coord-label
                        coord-rank
                        ${isLight
                                                    ? 'coord-light'
                                                    : 'coord-dark'
                                                }
                      `}
                                        >
                                            {RANKS[row]}
                                        </span>
                                    )}

                                {/* Piece */}
                                {piece && (
                                    <span
                                        data-piece-id={piece.id}
                                        data-row={row}
                                        data-col={col}
                                        onPointerDown={(event) =>
                                            startDrag(
                                                event,
                                                row,
                                                col,
                                                piece
                                            )
                                        }
                                        className={`
                      chess-piece
                      pointer-events-auto
                      absolute
                      inset-0
                      z-10
                      grid
                      place-items-center
                      ${isDraggingThis
                                                ? 'z-30 opacity-40'
                                                : ''
                                            }
                    `}
                                        style={{
                                            touchAction: 'none',
                                        }}
                                        dangerouslySetInnerHTML={{
                                            __html: pieceSVG(
                                                piece.type,
                                                piece.color
                                            ),
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })
                )}

                {/* ===================================================
            THINKING
           =================================================== */}
                {thinking && (
                    <div
                        className="
              pointer-events-none
              absolute
              right-2
              top-2
              z-20
              flex
              items-center
              gap-1.5
              rounded-full
              bg-navy-800/85
              px-3
              py-1.5
              text-[11px]
              font-semibold
              text-white
              shadow-glow-sm
              backdrop-blur
            "
                    >
                        <span
                            className="
                h-1.5
                w-1.5
                animate-ping
                rounded-full
                bg-royal-300
              "
                        />

                        Opponent thinking…
                    </div>
                )}

                {/* ===================================================
            GAME OVER
           =================================================== */}
                {(status.phase === 'checkmate' ||
                    status.phase === 'stalemate') && (
                        <div
                            className="
              absolute
              inset-0
              z-40
              grid
              place-items-center
              bg-navy-900/55
              backdrop-blur-[2px]
              animate-fade-in
            "
                        >
                            <div
                                className="
                flex
                flex-col
                items-center
                gap-2
                px-4
                text-center
              "
                            >
                                <div
                                    className={`
                  grid
                  h-14
                  w-14
                  place-items-center
                  rounded-2xl
                  shadow-card-lg
                  animate-pop-in
                  sm:h-16
                  sm:w-16
                  ${status.phase ===
                                            'checkmate'
                                            ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                                            : 'bg-gradient-to-br from-navy-400 to-navy-600'
                                        }
                `}
                                >
                                    {status.phase ===
                                        'checkmate' ? (
                                        <Trophy
                                            size={28}
                                            className="text-white sm:size-8"
                                        />
                                    ) : (
                                        <Handshake
                                            size={28}
                                            className="text-white"
                                        />
                                    )}
                                </div>

                                <p
                                    className="
                  font-display
                  text-xl
                  font-extrabold
                  text-white
                  drop-shadow-lg
                  sm:text-2xl
                "
                                >
                                    {status.phase ===
                                        'checkmate'
                                        ? 'Checkmate!'
                                        : 'Stalemate'}
                                </p>

                                {status.phase ===
                                    'checkmate' &&
                                    status.winner && (
                                        <p
                                            className="
                      text-sm
                      font-bold
                      text-amber-300
                      drop-shadow
                      sm:text-base
                    "
                                        >
                                            {status.winner === 'w'
                                                ? 'White'
                                                : 'Black'}{' '}
                                            wins
                                        </p>
                                    )}

                                {status.phase ===
                                    'stalemate' && (
                                        <p
                                            className="
                      text-sm
                      font-bold
                      text-navy-200
                      drop-shadow
                    "
                                        >
                                            Draw — no legal moves
                                        </p>
                                    )}
                            </div>
                        </div>
                    )}

                {/* ===================================================
            PROMOTION
           =================================================== */}
                {promotion && (
                    <PromotionPicker
                        promotion={promotion}
                        orientation={orientation}
                        cellSize={cellSize}
                        onChoose={onChoosePromotion}
                        onCancel={onCancelPromotion}
                    />
                )}
            </div>

            {/* =====================================================
          DRAG GHOST
         ===================================================== */}
            {drag && cellSize > 0 && (
                <div
                    className="
            chess-piece
            pointer-events-none
            fixed
            z-50
            grid
            place-items-center
          "
                    style={{
                        left: drag.x,
                        top: drag.y,
                        width: cellSize,
                        height: cellSize,
                        transform:
                            'translate(-50%, -50%)',
                    }}
                >
                    <div
                        className="h-full w-full"
                        dangerouslySetInnerHTML={{
                            __html: pieceSVG(
                                drag.piece.type,
                                drag.piece.color
                            ),
                        }}
                        style={{
                            filter:
                                'drop-shadow(0 6px 10px rgba(0,0,0,0.5))',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function PromotionPicker({
    promotion,
    orientation,
    cellSize,
    onChoose,
    onCancel,
}: {
    promotion: {
        from: [number, number];
        to: [number, number];
        moves: Move[];
    };
    orientation: Color;
    cellSize: number;
    onChoose: (move: Move) => void;
    onCancel: () => void;
}) {
    const [targetRow, targetCol] =
        promotion.to;

    const displayedRow =
        orientation === 'w'
            ? targetRow
            : 7 - targetRow;

    const displayedCol =
        orientation === 'w'
            ? targetCol
            : 7 - targetCol;

    const top =
        displayedRow * cellSize;

    const left =
        displayedCol * cellSize;

    const color =
        promotion.moves[0]?.piece.color ?? 'w';

    const order: PieceType[] = [
        'q',
        'r',
        'b',
        'n',
    ];

    return (
        <div
            className="
        absolute
        inset-0
        z-30
        grid
        place-items-center
        bg-navy-900/40
        backdrop-blur-sm
      "
            onClick={onCancel}
        >
            <div
                className="
          absolute
          overflow-hidden
          border
          border-royal-500/30
          bg-white
          shadow-card-lg
        "
                style={{
                    top,
                    left,
                    width: cellSize,
                    height: cellSize * 4,
                    borderRadius: 0,
                }}
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                {order.map((type) => {
                    const move =
                        promotion.moves.find(
                            (candidate) =>
                                candidate.promotion === type
                        );

                    if (!move) return null;

                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() =>
                                onChoose(move)
                            }
                            style={{
                                height: cellSize,
                            }}
                            className="
                chess-piece
                grid
                w-full
                place-items-center
                transition-colors
                hover:bg-royal-100
              "
                            dangerouslySetInnerHTML={{
                                __html: pieceSVG(
                                    type,
                                    color
                                ),
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}