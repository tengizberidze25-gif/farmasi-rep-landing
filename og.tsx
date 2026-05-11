// ════════════════════════════════════════════════════════════════════════════
// /api/og.tsx — Dynamic Open Graph image for FARMASI rep landing pages
// Runtime: Vercel Edge
// Returns: 1200×630 PNG personalized with rep's photo + name + city
//
// Usage:
//   /api/og                       → default FARMASI image
//   /api/og?pid=776934            → by PID
//   /api/og?slug=mariami          → by slug
// ════════════════════════════════════════════════════════════════════════════

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby0BJOvqZZz4eK5zHyep36R3vcPvweNk8ob-sOcCEokNoGto9m1BrfBxNlBcBB81pJ5/exec';

// Georgian font — required for Georgian text rendering in OG image
// @fontsource/noto-serif-georgian is mirrored on jsdelivr
const FONT_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-georgian@5.1.0/files/noto-serif-georgian-georgian-700-normal.woff';

// Cache font across requests in this edge instance (cold-start only)
let fontDataCache: ArrayBuffer | null = null;
async function getFont(): Promise<ArrayBuffer> {
  if (!fontDataCache) {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error('Font fetch failed: ' + res.status);
    fontDataCache = await res.arrayBuffer();
  }
  return fontDataCache;
}

// Cache logo as base64 data URL — Satori loads images more reliably from data URLs
// than from external HTTP URLs (no silent fetch failures).
let logoDataUrlCache: string | null = null;
async function getLogoDataUrl(origin: string): Promise<string | null> {
  if (logoDataUrlCache) return logoDataUrlCache;
  try {
    const res = await fetch(`${origin}/farmasi-logo.png`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    logoDataUrlCache = `data:image/png;base64,${btoa(binary)}`;
    return logoDataUrlCache;
  } catch {
    return null;
  }
}

// Apps Script returns JSONP-wrapped data: `cb({...})`. Strip the wrapper.
async function fetchRep(
  action: string,
  params: Record<string, string>
): Promise<any | null> {
  try {
    const q = new URLSearchParams({ ...params, action, callback: 'cb' }).toString();
    const res = await fetch(`${APPS_SCRIPT_URL}?${q}`);
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/^[^(]*\(([\s\S]*?)\)\s*;?\s*$/);
    if (!match) {
      // Maybe Apps Script returned plain JSON
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

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const pid = searchParams.get('pid');
  const slug = searchParams.get('slug');
  const origin = new URL(req.url).origin;

  // Fetch rep + font + logo in parallel for speed
  const [rep, font, logoUrl] = await Promise.all([
    pid
      ? fetchRep('get_rep', { pid })
      : slug
      ? fetchRep('get_rep_by_slug', { slug })
      : Promise.resolve(null),
    getFont(),
    getLogoDataUrl(origin),
  ]);

  const name = (rep?.name as string) || 'FARMASI';
  const city = (rep?.city as string) || '';
  const photoUrl = (rep?.photo_url as string) || '';
  // Only use http(s) photo URLs (safety: never embed arbitrary protocols)
  const photo = /^https?:\/\//i.test(photoUrl) ? photoUrl : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background:
            'linear-gradient(135deg, #FCE7F3 0%, #FFFFFF 50%, #FCE7F3 100%)',
          padding: 80,
          alignItems: 'center',
          gap: 60,
          fontFamily: 'Noto Serif Georgian',
          position: 'relative',
        }}
      >
        {/* Decorative gold corner accent */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            border: '1px solid #BE185D',
            opacity: 0.15,
            display: 'flex',
          }}
        />

        {/* LEFT — rep photo or FARMASI-branded fallback panel */}
        {photo ? (
          <img
            src={photo}
            width={420}
            height={520}
            style={{
              objectFit: 'cover',
              borderRadius: 12,
              border: '5px solid #E50571',
              boxShadow: '0 20px 60px rgba(229, 5, 113, 0.3)',
            }}
          />
        ) : (
          <div
            style={{
              width: 420,
              height: 520,
              background: '#FCE7F3',
              borderRadius: 12,
              border: '5px solid #E50571',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 60,
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} width={300} height={126} style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{ fontSize: 180, color: '#E50571', fontWeight: 700, display: 'flex' }}>F</div>
            )}
          </div>
        )}

        {/* RIGHT — text content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: 14,
          }}
        >
          {/* FARMASI logo (real brand mark, replaces text label) */}
          {logoUrl ? (
            <img
              src={logoUrl}
              width={200}
              height={84}
              style={{ objectFit: 'contain', marginBottom: 8 }}
            />
          ) : (
            <div
              style={{
                fontSize: 22,
                color: '#BE185D',
                letterSpacing: 6,
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              FARMASI · OFFICIAL
            </div>
          )}

          <div
            style={{
              fontSize: name.length > 14 ? 70 : 90,
              color: '#0F0F0F',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            {name}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginTop: 12,
            }}
          >
            <div style={{ width: 80, height: 3, background: '#E50571', display: 'flex' }} />
            <div style={{ fontSize: 34, color: '#E50571' }}>
              ნამდვილი ქალისთვის
            </div>
          </div>

          {city && (
            <div style={{ fontSize: 26, color: '#666', marginTop: 20, display: 'flex' }}>
              📍 {city}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Serif Georgian',
          data: font,
          style: 'normal',
          weight: 700,
        },
      ],
      headers: {
        // Edge: 5 min revalidate; Browser: 1 hour; Fallback: 24h stale-while-revalidate
        'Cache-Control':
          'public, max-age=3600, s-maxage=300, stale-while-revalidate=86400',
      },
    }
  );
}
