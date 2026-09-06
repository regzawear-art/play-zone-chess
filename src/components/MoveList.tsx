import React from 'react';

export default function MoveList({ moves }: { moves: string[] }) {
  // Render SAN moves in two-column move list
  const rows: Array<[string | null, string | null]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push([moves[i] || null, moves[i + 1] || null]);
  }

  return (
    <div className="rounded-xl border border-white/8 bg-navy-750 p-3 h-full">
      <h4 className="text-sm font-bold text-white mb-2">Moves</h4>
      <div className="text-sm text-navy-200 overflow-auto max-h-[60vh]">
        {rows.length === 0 && <div className="text-navy-300">No moves yet</div>}
        {rows.map((r, idx) => (
          <div key={idx} className="flex items-center gap-3 py-1 border-b border-white/4 last:border-0">
            <div className="w-6 text-navy-300 text-xs">{idx + 1}.</div>
            <div className="flex gap-2">
              <div className="min-w-[60px] text-white">{r[0] ?? ''}</div>
              <div className="min-w-[60px] text-navy-300">{r[1] ?? ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
