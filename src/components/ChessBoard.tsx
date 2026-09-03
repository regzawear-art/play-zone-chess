import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Board, Color, GameStatus, Move, Piece, PieceType } from '../game/types';
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
  promotion: { from: [number, number]; to: [number, number]; moves: Move[] } | null;
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
    <div className="chess-board-wrap mx-auto w-full max-w-full">
      <div
        ref={containerRef}
        className="chess-board-inner relative grid touch-none select-none grid-cols-8 overflow-hidden border border-black/30 shadow-2xl"
        style={{ aspectRatio: '1 / 1', touchAction: 'none', borderRadius: 0 }}
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
            const showFileLabel = c === (orientation === 'w' ? 7 : 0);
            const showRankLabel = r === (orientation === 'w' ? 7 : 0);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => onSquareClick(r, c)}
                className={`relative flex aspect-square items-center justify-center outline-none transition-colors duration-200 ${
                  isLight ? 'square-light' : 'square-dark'
                }`}
                aria-label={`${FILES[c]}${RANKS[r]}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`}
              >
                {(lastF || lastT) && <span className="absolute inset-0" style={{ backgroundColor: 'var(--board-last-move)' }} />}
                {isCheck && (
                  <span className="absolute inset-0 animate-glow-pulse" style={{ backgroundColor: 'var(--board-check-bg)', boxShadow: 'inset 0 0 0 2px rgba(229,57,53,0.7)' }} />
                )}
                {target && !piece && <span className="legal-dot absolute h-1/3 w-1/3 rounded-full" />}
                {target && piece && <span className="legal-ring absolute inset-0 rounded-none" />}
                {sel && <span className="absolute inset-0" style={{ backgroundColor: 'var(--board-select)', opacity: 0.5 }} />}

                {showCoords && showFileLabel && (
                  <span className={`coord-label coord-file ${isLight ? 'coord-light' : 'coord-dark'}`}>{FILES[c]}</span>
                )}
                {showCoords && showRankLabel && (
                  <span className={`coord-label coord-rank ${isLight ? 'coord-light' : 'coord-dark'}`}>{RANKS[r]}</span>
                )}

                {piece && (
                  <span
                    data-piece-id={piece.id}
                    data-row={r}
                    data-col={c}
                    onPointerDown={(e) => startDrag(e, r, c, piece)}
                    className={`chess-piece pointer-events-auto absolute inset-0 grid place-items-center ${isDraggingThis ? 'z-30 opacity-40' : ''}`}
                    style={{ touchAction: 'none' }}
                    dangerouslySetInnerHTML={{ __html: pieceSVG(piece.type, piece.color) }}
                  />
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

        {(status.phase === 'checkmate' || status.phase === 'stalemate') && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-navy-900/55 backdrop-blur-[2px] animate-fade-in">
            <div className="flex flex-col items-center gap-2 px-4 text-center">
              <div className={`grid h-14 w-14 place-items-center rounded-2xl shadow-card-lg animate-pop-in sm:h-16 sm:w-16 ${status.phase === 'checkmate' ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-to-br from-navy-400 to-navy-600'}`}>
                {status.phase === 'checkmate'
                  ? <Trophy size={28} className="text-white sm:size-8" />
                  : <Handshake size={28} className="text-white" />}
              </div>
              <p className="font-display text-xl font-extrabold text-white drop-shadow-lg sm:text-2xl">
                {status.phase === 'checkmate' ? 'Checkmate!' : 'Stalemate'}
              </p>
              {status.phase === 'checkmate' && status.winner && (
                <p className="text-sm font-bold text-amber-300 drop-shadow sm:text-base">
                  {status.winner === 'w' ? 'White' : 'Black'} wins
                </p>
              )}
              {status.phase === 'stalemate' && (
                <p className="text-sm font-bold text-navy-200 drop-shadow">Draw — no legal moves</p>
              )}
            </div>
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

      {/* Floating drag ghost */}
      {drag && cellSize > 0 && (
        <div
          className="chess-piece pointer-events-none fixed z-50 grid place-items-center"
          style={{
            left: drag.x,
            top: drag.y,
            transform: `translate(-50%, -50%)`,
            width: cellSize,
            height: cellSize,
          }}
        >
          <div dangerouslySetInnerHTML={{ __html: pieceSVG(drag.piece.type, drag.piece.color) }}
            style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' }}
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
        className="absolute overflow-hidden border border-royal-500/30 bg-white shadow-card-lg"
        style={{ top, left, width: cellSize, height: cellSize * 4, borderRadius: 0 }}
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
              className="chess-piece grid w-full place-items-center transition-colors hover:bg-royal-100"
              dangerouslySetInnerHTML={{ __html: pieceSVG(t, color) }}
            />
          );
        })}
      </div>
    </div>
  );
}
