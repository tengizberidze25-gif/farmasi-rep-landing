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
// 🆕 catalog=1 support:
//   When the URL includes ?catalog=1 (e.g. my.farmasi.ge/<slug>?catalog=1),
//   this is a "share the digital catalog" link. Instead of the rep's own
//   photo/bio, we inject the catalog cover image + catalog-specific
//   title/description, so social previews show the catalog cover instead
//   of the generic rep card.
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

// 🆕 catalog share metadata
const CATALOG_TITLE = 'FARMASI · ციფრული კატალოგი';
const CATALOG_DESC =
  'დაათვალიერე FARMASI-ის უახლესი კატალოგი და შეუკვეთე პროდუქტები პირდაპირ.';
const CATALOG_IMAGE_PATH = '/catalog-cover.jpg'; // static file in /public

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
    const isCatalogShare = url.searchParams.get('catalog') === '1'; // 🆕
    const origin = url.origin;

    // Fetch index.html + rep data in parallel for speed.
    // Skip the rep lookup entirely for catalog shares — we don't need it.
    const [htmlRes, rep] = await Promise.all([
      fetch(`${origin}/index.html`),
      isCatalogShare
        ? Promise.resolve(null) // 🆕 no rep lookup needed for catalog card
        : slug
        ? fetchRep('get_rep_by_slug', { slug })
        : pid
        ? fetchRep('get_rep', { pid })
        : Promise.resolve(null),
    ]);

    if (!htmlRes.ok) {
      return new Response('Failed to load page', { status: 502 });
    }
    let html = await htmlRes.text();

    // Allow Bunny Stream video iframe to load on public pages.
    // index.html's CSP frame-src lists youtube/vimeo/etc. but not Bunny,
    // so the rep's video gets blocked. Append Bunny domains to frame-src
    // (only on the proxied public page — index.html itself is untouched).
    html = html.replace(/frame-src([^;"]*)/i, (m, list) =>
      list.includes('mediadelivery.net')
        ? m
        : `frame-src${list} https://iframe.mediadelivery.net https://*.mediadelivery.net`
    );

    // Per-rep OG image URL (passes slug/pid to /api/og, which handles caching)
    // 🆕 catalog shares use a static cover image instead.
    let ogImageUrl: string;
    if (isCatalogShare) {
      ogImageUrl = `${origin}${CATALOG_IMAGE_PATH}`;
    } else {
      let ogQuery = '';
      if (slug) ogQuery = `?slug=${encodeURIComponent(slug)}`;
      else if (pid) ogQuery = `?pid=${encodeURIComponent(pid)}`;
      ogImageUrl = `${origin}/api/og${ogQuery}`;
    }

    // Build title + description.
    // 🆕 catalog shares get fixed catalog copy; otherwise per-rep as before.
    let title = DEFAULT_TITLE;
    let desc = DEFAULT_DESC;
    if (isCatalogShare) {
      title = CATALOG_TITLE;
      desc = CATALOG_DESC;
    } else if (rep && (rep as any).name) {
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

    // 🆕 Build the canonical public-facing URL (the one people actually
    // share — my.farmasi.ge/<slug>, not the internal /api/page?slug=...
    // rewrite target). index.html has no og:url tag at all, so instead of
    // replacing an existing tag we inject a new one after og:type.
    // Facebook's debugger flags a missing og:url, and some scrapers use it
    // to resolve/cache the image, so this is worth having regardless.
    let publicPath = '/';
    if (slug) publicPath = `/${encodeURIComponent(slug)}`;
    else if (pid) publicPath = `/${encodeURIComponent(pid)}`;
    const shareUrl = `${origin}${publicPath}${isCatalogShare ? '?catalog=1' : ''}`;
    const shareUrlEsc = escapeHtml(shareUrl);

    // Replace meta tags — both Open Graph (FB/WhatsApp/Telegram) and Twitter Cards
    html = html
      .replace(
        /<meta property="og:type" content="[^"]*"\s*\/?>/i,
        (m) => `${m}\n<meta property="og:url" content="${shareUrlEsc}" />`
      )
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
