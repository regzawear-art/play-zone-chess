import { supabase } from './supabase';

const VISITOR_KEY = 'kc-visitor';
const LOCALHOST =
  typeof location !== 'undefined' &&
  (location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === '0.0.0.0');

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        'v-' +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36).slice(-4);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'v-unknown';
  }
}

function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'tablet';
  if (/mobi|android|iphone/.test(ua)) return 'mobile';
  return 'desktop';
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return 'edge';
  if (/chrome|crios/i.test(ua)) return 'chrome';
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  if (/safari/i.test(ua)) return 'safari';
  return 'other';
}

export interface LogEventOpts {
  mode?: string;
  detail?: string;
}

export function logSiteEvent(
  event:
    | 'page_view'
    | 'game_start'
    | 'game_end'
    | 'online_start'
    | 'js_error',
  opts: LogEventOpts = {},
): void {
  if (LOCALHOST) return;
  try {
    supabase.from('site_events').insert({
      visitor_id: getVisitorId(),
      event,
      mode: opts.mode ?? null,
      detail: opts.detail ?? null,
      path: typeof location !== 'undefined' ? location.pathname : null,
      device: detectDevice(),
      browser: detectBrowser(),
    }).then(
      () => {},
      () => {},
    );
  } catch {
    // ignore
  }
}

let pageViewLogged = false;
export function logPageViewOnce(): void {
  if (pageViewLogged) return;
  pageViewLogged = true;
  logSiteEvent('page_view');
}
