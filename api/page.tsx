// ════════════════════════════════════════════════════════════════════════════
// /api/page.tsx — HTML proxy with per-rep meta tag injection
// Runtime: Vercel Edge
//
// Purpose: Social media scrapers (WhatsApp, Facebook, Telegram, etc.) fetch
// the HTML and read static <meta> tags. They don't run JavaScript. So to
// show per-rep preview images and titles in share previews, we must serve
// HTML with the right meta tags already in place.
//
// Flow:
//   1. vercel.json rewrites /<slug> and /<slug>/edit through this function
//   2. We fetch the static index.html and the rep data in parallel
//   3. We replace og:image, og:title, og:description, twitter:* meta tags
//   4. We return the modified HTML
//
// Cache: aggressive — page edits are rare, og:image is dynamic per-rep
//        via /api/og (which has its own cache).
// ════════════════════════════════════════════════════════════════════════════

export const config = { runtime: 'edge' };

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby0BJOvqZZz4eK5zHyep36R3vcPvweNk8ob-sOcCEokNoGto9m1BrfBxNlBcBB81pJ5/exec';

const DEFAULT_TITLE = 'FARMASI · წარმომადგენლის Portfolio';
const DEFAULT_DESC =
  'აღმოაჩინე პროდუქტები, რომლებიც დაგეხმარება. გამიჭერი WhatsApp-ი — დაგეხმარები აირჩევა.';

// Apps Script returns JSONP-wrapped data: `cb({...})`. Strip the wrapper.
async function fetchRep(action: string, params: Record<string, string>) {
  try {
    const q = new URLSearchParams({ ...params, action, callback: 'cb' }).toString();
    const res = await fetch(`${APPS_SCRIPT_URL}?${q}`);
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/^[^(]*\(([\s\S]*?)\)\s*;?\s*$/);
    if (!match) {
      try {
        const data = JSON.parse(text);
        return data.ok ? data.rep : null;
      } catch {
        return null;
      }
    }
    const data = JSON.parse(match[1]);
    return data.ok ? data.rep : null;
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get('slug') || '').trim();
    const pid = (url.searchParams.get('pid') || '').trim();
    const origin = url.origin;

    // Fetch index.html + rep data in parallel for speed
    const [htmlRes, rep] = await Promise.all([
      fetch(`${origin}/index.html`),
      slug
        ? fetchRep('get_rep_by_slug', { slug })
        : pid
        ? fetchRep('get_rep', { pid })
        : Promise.resolve(null),
    ]);

    if (!htmlRes.ok) {
      return new Response('Failed to load page', { status: 502 });
    }
    let html = await htmlRes.text();

    // Per-rep OG image URL (passes slug/pid to /api/og, which handles caching)
    let ogQuery = '';
    if (slug) ogQuery = `?slug=${encodeURIComponent(slug)}`;
    else if (pid) ogQuery = `?pid=${encodeURIComponent(pid)}`;
    const ogImageUrl = `${origin}/api/og${ogQuery}`;

    // Build per-rep title + description
    let title = DEFAULT_TITLE;
    let desc = DEFAULT_DESC;
    if (rep && (rep as any).name) {
      const repName = String((rep as any).name);
      const repCity = String((rep as any).city || '');
      const repBio = String((rep as any).bio || '');
      title = `${repName} · FARMASI`;
      if (repBio) {
        desc = repBio.length > 180 ? repBio.substring(0, 177) + '...' : repBio;
      } else if (repCity) {
        desc = `შენი პერსონალური FARMASI კონსულტანტი — ${repCity}.`;
      } else {
        desc = 'შენი პერსონალური FARMASI კონსულტანტი.';
      }
    }
    const titleEsc = escapeHtml(title);
    const descEsc = escapeHtml(desc);

    // Replace meta tags — both Open Graph (FB/WhatsApp/Telegram) and Twitter Cards
    html = html
      .replace(
        /<meta property="og:image" content="[^"]*"\s*\/?>/gi,
        `<meta property="og:image" content="${ogImageUrl}" />`
      )
      .replace(
        /<meta name="twitter:image" content="[^"]*"\s*\/?>/gi,
        `<meta name="twitter:image" content="${ogImageUrl}" />`
      )
      .replace(
        /<meta property="og:title" content="[^"]*"\s*\/?>/gi,
        `<meta property="og:title" content="${titleEsc}" />`
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*"\s*\/?>/gi,
        `<meta name="twitter:title" content="${titleEsc}" />`
      )
      .replace(
        /<meta property="og:description" content="[^"]*"\s*\/?>/gi,
        `<meta property="og:description" content="${descEsc}" />`
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*"\s*\/?>/gi,
        `<meta name="twitter:description" content="${descEsc}" />`
      )
      .replace(/<title>[^<]*<\/title>/i, `<title>${titleEsc}</title>`);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Browser cache 1h, Edge CDN 5min, stale-while-revalidate 24h
        'Cache-Control':
          'public, max-age=3600, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    // Robust fallback: serve original index.html if anything goes wrong
    try {
      const url = new URL(req.url);
      const fallback = await fetch(`${url.origin}/index.html`);
      const fallbackHtml = await fallback.text();
      return new Response(fallbackHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    } catch {
      return new Response('Service temporarily unavailable', { status: 503 });
    }
  }
}
