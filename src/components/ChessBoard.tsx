import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Board, Color, GameStatus, Move, Piece, PieceType } from '../game/types';
import { GLYPH } from '../game/pieces';

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
  promotion: { from: [number, number]; to: [number, number]; moves: Move[] } | null;
  onChoosePromotion: (move: Move) => void;
  onCancelPromotion: () => void;
  thinking?: boolean;
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
}: Props) {
  const rows = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const pieces = useMemo(() => {
    const out: { piece: Piece; row: number; col: number }[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) out.push({ piece: p, row: r, col: c });
      }
    }
    return out;
  }, [board]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(0);
  const prevPositions = useRef<Map<number, { r: number; c: number }>>(new Map());

  // Drag state
  const [drag, setDrag] = useState<{
    from: [number, number];
    x: number;
    y: number;
    piece: Piece;
  } | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCellSize(e.contentRect.width / 8);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // FLIP animation
  useEffect(() => {
    if (!cellSize) return;
    const container = containerRef.current;
    if (!container) return;
    const els = container.querySelectorAll<HTMLElement>('[data-piece-id]');
    els.forEach((el) => {
      const id = Number(el.dataset.pieceId);
      const prev = prevPositions.current.get(id);
      if (!prev) return;
      const currR = Number(el.dataset.row);
      const currC = Number(el.dataset.col);
      const dispR = orientation === 'w' ? currR : 7 - currR;
      const dispC = orientation === 'w' ? currC : 7 - currC;
      const prevDispR = orientation === 'w' ? prev.r : 7 - prev.r;
      const prevDispC = orientation === 'w' ? prev.c : 7 - prev.c;
      const dx = (prevDispC - dispC) * cellSize;
      const dy = (prevDispR - dispR) * cellSize;
      if (dx === 0 && dy === 0) return;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth;
      el.style.transition = '';
      el.style.transform = '';
    });
    const next = new Map<number, { r: number; c: number }>();
    pieces.forEach((p) => next.set(p.piece.id, { r: p.row, c: p.col }));
    prevPositions.current = next;
  }, [board, cellSize, orientation, pieces]);

  // Convert client coords to board square
  const clientToSquare = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const el = containerRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
      const colFloat = x / cellSize;
      const rowFloat = y / cellSize;
      const dispCol = Math.floor(colFloat);
      const dispRow = Math.floor(rowFloat);
      const logicalR = orientation === 'w' ? dispRow : 7 - dispRow;
      const logicalC = orientation === 'w' ? dispCol : 7 - dispCol;
      if (logicalR < 0 || logicalR > 7 || logicalC < 0 || logicalC > 7) return null;
      return [logicalR, logicalC];
    },
    [cellSize, orientation],
  );

  const startDrag = useCallback(
    (e: React.PointerEvent, r: number, c: number, piece: Piece) => {
      if (status.phase === 'checkmate' || status.phase === 'stalemate') return;
      e.preventDefault();
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);
      const squareEl = el.getBoundingClientRect();
      dragOffsetRef.current = {
        dx: e.clientX - (squareEl.left + squareEl.width / 2),
        dy: e.clientY - (squareEl.top + squareEl.height / 2),
      };
      setDrag({ from: [r, c], x: e.clientX, y: e.clientY, piece });
    },
    [status.phase],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    e.preventDefault();
    setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : null));
  }, [drag]);

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      e.preventDefault();
      const target = clientToSquare(e.clientX, e.clientY);
      if (target) {
        const success = onDrop(drag.from, target);
        if (!success) onSquareClick(drag.from[0], drag.from[1]);
      }
      setDrag(null);
    },
    [drag, clientToSquare, onDrop, onSquareClick],
  );

  const isTarget = (r: number, c: number) => legal.some((m) => m.to[0] === r && m.to[1] === c);
  const isSelected = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c;
  const isLastFrom = (r: number, c: number) => lastMove?.from[0] === r && lastMove?.from[1] === c;
  const isLastTo = (r: number, c: number) => lastMove?.to[0] === r && lastMove?.to[1] === c;

  const checkSquare = useMemo<[number, number] | null>(() => {
    if (status.phase !== 'check' && status.phase !== 'checkmate') return null;
    const loser: Color = status.phase === 'checkmate' ? (status.winner === 'w' ? 'b' : 'w') : turn;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === loser) return [r, c];
      }
    }
    return null;
  }, [board, status, turn]);

  const draggingFrom = drag ? `${drag.from[0]}-${drag.from[1]}` : null;

  return (
    <div
      className="chess-board-wrap mx-auto w-full"
      style={{ maxWidth: 'min(100vw - 2rem, 560px)' }}
    >
      {/* top file labels */}
      <div className="mb-1 flex justify-center px-4 sm:px-5">
        {cols.map((c) => (
          <div key={c} className="flex-1 text-center text-[10px] font-bold uppercase tracking-wide text-navy-300 sm:text-xs">
            {FILES[c]}
          </div>
        ))}
      </div>

      <div className="flex gap-0.5 sm:gap-1">
        <div className="flex flex-col gap-0.5 py-1 sm:gap-1">
          {rows.map((r) => (
            <div key={r} className="flex flex-1 items-center justify-center text-[10px] font-bold text-navy-300 sm:text-xs">
              {RANKS[r]}
            </div>
          ))}
        </div>

        <div
          ref={containerRef}
          className="relative grid flex-1 touch-none select-none grid-cols-8 overflow-hidden rounded-xl border border-navy-600/50 shadow-card ring-1 ring-black/20"
          style={{ aspectRatio: '1 / 1', touchAction: 'none' }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {rows.map((r) =>
            cols.map((c) => {
              const isLight = (r + c) % 2 === 0;
              const target = isTarget(r, c);
              const sel = isSelected(r, c);
              const lastF = isLastFrom(r, c);
              const lastT = isLastTo(r, c);
              const isCheck = checkSquare?.[0] === r && checkSquare?.[1] === c;
              const piece = board[r][c];
              const isDraggingThis = draggingFrom === `${r}-${c}`;
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => onSquareClick(r, c)}
                  className={`relative flex aspect-square items-center justify-center outline-none transition-colors duration-200 ${
                    isLight ? 'square-light' : 'square-dark'
                  } ${sel ? '' : ''} ${
                    drag && isTarget(r, c) ? '' : ''
                  }`}
                  aria-label={`${FILES[c]}${RANKS[r]}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
                >
                  {(lastF || lastT) && <span className="absolute inset-0" style={{ backgroundColor: 'rgba(187,202,43,0.55)' }} />}
                  {isCheck && (
                    <span className="absolute inset-0 animate-glow-pulse bg-red-500/30 ring-2 ring-inset ring-red-500/70" />
                  )}
                  {target && !piece && <span className="legal-dot absolute h-1/3 w-1/3 rounded-full" />}
                  {target && piece && <span className="legal-ring absolute inset-0 rounded-none" />}
                  {sel && <span className="absolute inset-0" style={{ backgroundColor: 'rgba(187,202,43,0.45)' }} />}

                  {piece && (
                    <span
                      data-piece-id={piece.id}
                      data-row={r}
                      data-col={c}
                      onPointerDown={(e) => startDrag(e, r, c, piece)}
                      className={`chess-piece pointer-events-auto absolute inset-0 grid place-items-center text-[clamp(26px,8vw,52px)] ${
                        piece.color === 'w' ? 'white' : 'black'
                      } ${isDraggingThis ? 'z-30 opacity-40' : ''}`}
                      style={{ touchAction: 'none' }}
                    >
                      {GLYPH[piece.type]}
                    </span>
                  )}
                </button>
              );
            }),
          )}

          {thinking && (
            <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1.5 rounded-full bg-navy-800/85 px-3 py-1.5 text-[11px] font-semibold text-white shadow-glow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-royal-300" />
              Opponent thinking…
            </div>
          )}

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

        <div className="flex flex-col gap-0.5 py-1 sm:gap-1">
          {rows.map((r) => (
            <div key={r} className="flex flex-1 items-center justify-center text-[10px] font-bold text-navy-400 sm:text-xs">
              {RANKS[r]}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-1 flex justify-center px-4 sm:px-5">
        {cols.map((c) => (
          <div key={c} className="flex-1 text-center text-[10px] font-bold uppercase tracking-wide text-navy-300 sm:text-xs">
            {FILES[c]}
          </div>
        ))}
      </div>

      {/* Floating drag ghost */}
      {drag && (
        <div
          className="chess-piece pointer-events-none fixed z-50 grid place-items-center"
          style={{
            left: drag.x,
            top: drag.y,
            transform: `translate(-50%, -50%)`,
            fontSize: cellSize * 0.85,
          }}
        >
          <span className={drag.piece.color === 'w' ? 'white' : 'black'} style={{ filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.4))' }}>
            {GLYPH[drag.piece.type]}
          </span>
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
  promotion: { from: [number, number]; to: [number, number]; moves: Move[] };
  orientation: Color;
  cellSize: number;
  onChoose: (m: Move) => void;
  onCancel: () => void;
}) {
  const [tr, tc] = promotion.to;
  const dispR = orientation === 'w' ? tr : 7 - tr;
  const dispC = orientation === 'w' ? tc : 7 - tc;
  const top = dispR * cellSize;
  const left = dispC * cellSize;
  const color = promotion.moves[0]?.piece.color ?? 'w';
  const order: PieceType[] = ['q', 'r', 'b', 'n'];

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-navy-900/40 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="absolute overflow-hidden rounded-xl border border-royal-500/30 bg-white/95 shadow-card-lg"
        style={{ top, left, width: cellSize, height: cellSize * 4 }}
        onClick={(e) => e.stopPropagation()}
      >
        {order.map((t) => {
          const mv = promotion.moves.find((m) => m.promotion === t);
          if (!mv) return null;
          return (
            <button
              key={t}
              onClick={() => onChoose(mv)}
              style={{ height: cellSize }}
              className={`chess-piece grid w-full place-items-center transition-colors hover:bg-royal-100 ${color === 'w' ? 'white' : 'black'}`}
            >
              <span style={{ fontSize: cellSize * 0.72 }}>{GLYPH[t]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
