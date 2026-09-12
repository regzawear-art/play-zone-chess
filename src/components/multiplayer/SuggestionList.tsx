import React, { useEffect, useRef, useState } from 'react';

interface Props {
  items: any[];
  onSelect: (item: any) => void;
  renderItem?: (item: any) => React.ReactNode;
  containerClassName?: string;
}

export default function SuggestionList({ items, onSelect, renderItem, containerClassName }: Props) {
  const [idx, setIdx] = useState(-1);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setIdx(-1); }, [items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!items || items.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length-1, i + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i-1)); }
      else if (e.key === 'Enter') { if (idx >= 0 && idx < items.length) { e.preventDefault(); onSelect(items[idx]); } }
      else if (e.key === 'Escape') { setIdx(-1); }
    };
    // attach to the document so focus-less key events are still handled
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [items, idx, onSelect]);

  if (!items || items.length === 0) return null;

  return (
    <div ref={ref} className={containerClassName || 'z-50 mt-1 max-h-48 overflow-auto rounded border border-white/6 bg-navy-800 py-1'}>
      {items.map((it, i) => (
        <button key={it.id ?? i} onClick={() => onSelect(it)} className={`w-full px-3 py-2 text-left text-sm text-navy-200 hover:bg-navy-700 ${i === idx ? 'bg-navy-700' : ''}`}>
          {renderItem ? renderItem(it) : (it.username ?? it.email ?? it.id)}
        </button>
      ))}
    </div>
  );
}
