import type { VercelRequest, VercelResponse } from '@vercel/node';

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby0BJOvqZZz4eK5zHyep36R3vcPvweNk8ob-sOcCEokNoGto9m1BrfBxNlBcBB81pJ5/exec';

const DEFAULT_DESCRIPTION =
  'შენი სილამაზის, ჯანმრთელობის და ესთეტიკის გზამკვლევი';

interface Rep {
  pid?: string;
  name?: string;
  city?: string;
  slug?: string;
  [key: string]: any;
}

async function fetchRepBySlug(slug: string): Promise<Rep | null> {
  try {
    const url = `${APPS_SCRIPT_URL}?action=get_rep_by_slug&slug=${encodeURIComponent(slug)}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const text = await res.text();
    const data = JSON.parse(text);
    return data?.ok && data?.rep ? (data.rep as Rep) : null;
  } catch (e) {
    console.error('[api/page] fetchRepBySlug error:', e);
    return null;
  }
}

function escapeHtmlAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = String(req.query.slug || '').toLowerCase().trim();

  // Slug validation: 3-30 chars, lowercase alphanumeric + dash
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 30) {
    res.status(400).send('Invalid slug');
    return;
  }

  // Host detection — works for both farmasi-rep-landing.vercel.app and my.farmasi.ge
  const host = req.headers.host || 'my.farmasi.ge';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  // Fetch rep data + index.html in parallel for speed
  const [rep, htmlRes] = await Promise.all([
    fetchRepBySlug(slug),
    fetch(`${baseUrl}/index.html`),
  ]);

  if (!htmlRes.ok) {
    res.status(500).send('Failed to load template');
    return;
  }

  let html = await htmlRes.text();

  // Build dynamic OG values
  const repName = (rep?.name || '').trim();
  const repCity = (rep?.city || '').trim();
  const ogTitle = repName ? `${repName} — FARMASI` : 'FARMASI · წარმომადგენელი';
  const ogDesc = repCity ? `${repCity} · ${DEFAULT_DESCRIPTION}` : DEFAULT_DESCRIPTION;
  const pageUrl = `${baseUrl}/${slug}`;
  const ogImageUrl = `${baseUrl}/api/og?slug=${encodeURIComponent(slug)}`;

  // Replace existing meta tags via regex
  html = html
    .replace(
      /<meta\s+property="og:title"[^>]*\/?>/i,
      `<meta property="og:title" content="${escapeHtmlAttr(ogTitle)}" />`
    )
    .replace(
      /<meta\s+property="og:description"[^>]*\/?>/i,
      `<meta property="og:description" content="${escapeHtmlAttr(ogDesc)}" />`
    )
    .replace(
      /<meta\s+property="og:image"[^>]*\/?>/i,
      `<meta property="og:image" content="${ogImageUrl}" />`
    )
    .replace(
      /<meta\s+name="twitter:image"[^>]*\/?>/i,
      `<meta name="twitter:image" content="${ogImageUrl}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"[^>]*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtmlAttr(ogTitle)}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"[^>]*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtmlAttr(ogDesc)}" />`
    );

  // Inject og:url (and twitter:url) before og:title (if not already present)
  if (!/<meta\s+property="og:url"/i.test(html)) {
    html = html.replace(
      /<meta\s+property="og:title"/i,
      `<meta property="og:url" content="${pageUrl}" />\n<meta property="og:title"`
    );
  } else {
    html = html.replace(
      /<meta\s+property="og:url"[^>]*\/?>/i,
      `<meta property="og:url" content="${pageUrl}" />`
    );
  }

  // OPTIONAL: inject rep data to skip client-side fetch (faster page load)
  if (rep) {
    const repJson = JSON.stringify(rep).replace(/</g, '\\u003c').replace(/-->/g, '--\\>');
    html = html.replace(
      /<\/head>/i,
      `<script>window.__REP__ = ${repJson};</script>\n</head>`
    );
  }

  // Cache headers: CDN caches 5 min, stale-while-revalidate 1 day
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=86400'
  );
  res.status(200).send(html);
}
