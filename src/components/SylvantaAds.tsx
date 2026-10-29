import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';
import PRODUCTS_RAW from '../data/sylvanta-products.json';

interface Product {
    name: string;
    price: number;
    mrp: number | null;
    url: string;
    img: string;
}

const PRODUCTS = PRODUCTS_RAW as Product[];
const STORE_URL = 'https://sylvantapvt.com/';

/* ------------------------------------------------------------------
 * Google AdSense
 * Paste your publisher id (ca-pub-XXXXXXXXXXXXXXXX) and slot ids here
 * once AdSense approves khelchess.com. While empty, nothing renders.
 * ------------------------------------------------------------------ */
export const ADSENSE_CLIENT = '';
export const ADSENSE_SLOTS = { home: '', puzzles: '' };

function track(url: string, placement: string) {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'khelchess');
    u.searchParams.set('utm_medium', 'banner');
    u.searchParams.set('utm_campaign', placement);
    return u.toString();
}

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
const off = (p: Product) => (p.mrp ? Math.round((1 - p.price / p.mrp) * 100) : 0);

/** Wide product strip for the home page. */
export function SylvantaHomeStrip() {
    return (
        <section className="w-full px-4 py-10 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-[#262421] p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#989795]">Sponsored</span>
                        <h2 className="mt-1 flex items-center gap-2 font-display text-2xl font-extrabold text-white">
                            <ShoppingBag size={22} className="text-[#81b64c]" /> Shop at Sylvanta
                        </h2>
                        <p className="mt-1 text-sm text-[#c3c2c1]">Home, kitchen and lifestyle deals delivered across India.</p>
                    </div>
                    <a
                        href={track(STORE_URL, 'home_strip')}
                        target="_blank"
                        rel="noopener sponsored"
                        className="flex items-center gap-1.5 rounded-lg bg-[#81b64c] px-4 py-2 text-sm font-extrabold text-white shadow-[0_3px_0_#45753c] transition hover:bg-[#a3d160]"
                    >
                        Visit Store <ExternalLink size={14} />
                    </a>
                </div>
                <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                    {PRODUCTS.map((p) => (
                        <a
                            key={p.url}
                            href={track(p.url, 'home_strip')}
                            target="_blank"
                            rel="noopener sponsored"
                            className="group w-40 shrink-0 snap-start overflow-hidden rounded-xl bg-[#1f1e1b] ring-1 ring-white/5 transition hover:ring-[#81b64c]/60 sm:w-44"
                        >
                            <div className="relative aspect-square bg-white">
                                <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-contain p-2 transition group-hover:scale-105" />
                                {off(p) >= 5 && (
                                    <span className="absolute left-2 top-2 rounded bg-[#c33a32] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                                        {off(p)}% OFF
                                    </span>
                                )}
                            </div>
                            <div className="p-2.5">
                                <p className="line-clamp-2 min-h-[2.5rem] text-xs font-semibold text-white">{p.name}</p>
                                <p className="mt-1 text-sm font-extrabold text-white">
                                    {inr(p.price)}
                                    {p.mrp && <span className="ml-1.5 text-[11px] font-medium text-[#989795] line-through">{inr(p.mrp)}</span>}
                                </p>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
            <AdSenseSlot slot={ADSENSE_SLOTS.home} className="mx-auto mt-6 max-w-6xl" />
        </section>
    );
}

/** Compact rotating card for side panels. */
export function SylvantaSideCard() {
    const start = useMemo(() => Math.floor(Math.random() * PRODUCTS.length), []);
    const [i, setI] = useState(start);
    useEffect(() => {
        const t = window.setInterval(() => setI((x) => (x + 1) % PRODUCTS.length), 12000);
        return () => window.clearInterval(t);
    }, []);
    const p = PRODUCTS[i];
    if (!p) return null;
    return (
        <a
            href={track(p.url, 'side_card')}
            target="_blank"
            rel="noopener sponsored"
            className="flex items-center gap-3 rounded-lg bg-[#1f1e1b] p-2.5 ring-1 ring-white/5 transition hover:ring-[#81b64c]/60"
        >
            <img src={p.img} alt={p.name} loading="lazy" className="h-14 w-14 shrink-0 rounded-md bg-white object-contain p-1" />
            <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#989795]">Sponsored · Sylvanta</p>
                <p className="truncate text-xs font-semibold text-white">{p.name}</p>
                <p className="text-sm font-extrabold text-white">
                    {inr(p.price)}
                    {off(p) >= 5 && <span className="ml-1.5 text-[11px] font-bold text-[#a3d160]">{off(p)}% off</span>}
                </p>
            </div>
            <span className="shrink-0 rounded-md bg-[#81b64c] px-2.5 py-1.5 text-[11px] font-extrabold text-white">Shop</span>
        </a>
    );
}

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

/** Google AdSense display unit. Renders nothing until ADSENSE_CLIENT is set. */
export function AdSenseSlot({ slot, className = '' }: { slot: string; className?: string }) {
    const pushed = useRef(false);
    useEffect(() => {
        if (!ADSENSE_CLIENT || !slot || pushed.current) return;
        if (!document.querySelector('script[data-adsense]')) {
            const s = document.createElement('script');
            s.async = true;
            s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
            s.crossOrigin = 'anonymous';
            s.dataset.adsense = '1';
            document.head.appendChild(s);
        }
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushed.current = true;
        } catch {
            /* ignore */
        }
    }, [slot]);
    if (!ADSENSE_CLIENT || !slot) return null;
    return (
        <div className={className}>
            <ins
                className="adsbygoogle block"
                style={{ display: 'block' }}
                data-ad-client={ADSENSE_CLIENT}
                data-ad-slot={slot}
                data-ad-format="auto"
                data-full-width-responsive="true"
            />
        </div>
    );
}
