// ════════════════════════════════════════════════════════════════════════════
// /api/og.tsx — Dynamic Open Graph image for FARMASI rep landing pages
// Runtime: Vercel Edge
// Returns: 1200x630 PNG personalized with rep's photo + name + city + logo
//
// REDESIGN (v2):
//   • Cream-blush background (was: bright pink gradient)
//   • Rose gold photo frame (was: FARMASI pink)
//   • Eyebrow label: "ოფიციალური წარმომადგენელი"
//   • Tagline updated to communicate beauty/health/aesthetics mission
//   • Three-pillar row below tagline (სილამაზე · ჯანმრთელობა · ესთეტიკა)
//   • Logo moved/resized in top-right corner
// ════════════════════════════════════════════════════════════════════════════

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby0BJOvqZZz4eK5zHyep36R3vcPvweNk8ob-sOcCEokNoGto9m1BrfBxNlBcBB81pJ5/exec';

const FONT_URL =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-georgian@5.1.0/files/noto-serif-georgian-georgian-700-normal.woff';

let fontDataCache: ArrayBuffer | null = null;
async function getFont(): Promise<ArrayBuffer> {
  if (!fontDataCache) {
    const res = await fetch(FONT_URL);
    if (!res.ok) throw new Error('Font fetch failed: ' + res.status);
    fontDataCache = await res.arrayBuffer();
  }
  return fontDataCache;
}

// ────────────────────────────────────────────────────────────────────────────
// ⚠️  KEEP YOUR EXISTING LOGO_DATA_URL VALUE — copy it from your current og.tsx
//     The current 4K-source base64 string already works in production.
//     Just paste it into the line below, replacing the placeholder.
// ────────────────────────────────────────────────────────────────────────────
const LOGO_DATA_URL = 'data:image/png;base64,PASTE_YOUR_EXISTING_LOGO_DATA_URL_HERE';

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

  const [rep, font] = await Promise.all([
    pid
      ? fetchRep('get_rep', { pid })
      : slug
      ? fetchRep('get_rep_by_slug', { slug })
      : Promise.resolve(null),
    getFont(),
  ]);

  const name = (rep?.name as string) || 'FARMASI';
  const city = (rep?.city as string) || '';
  const photoUrl = (rep?.photo_url as string) || '';
  const photo = /^https?:\/\//i.test(photoUrl) ? photoUrl : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background:
            'linear-gradient(135deg, #FAEDE6 0%, #FFF6EE 50%, #FAEDE6 100%)',
          padding: 70,
          alignItems: 'center',
          gap: 50,
          fontFamily: 'Noto Serif Georgian',
          position: 'relative',
        }}
      >
        {/* Decorative circle — top-left */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: -180,
            width: 460,
            height: 460,
            borderRadius: 230,
            background: '#F2D8CC',
            opacity: 0.5,
            display: 'flex',
          }}
        />

        {/* Decorative circle — bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -180,
            right: -180,
            width: 420,
            height: 420,
            borderRadius: 210,
            background: '#F2D8CC',
            opacity: 0.4,
            display: 'flex',
          }}
        />

        {/* FARMASI logo — top-right corner */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 70,
            display: 'flex',
          }}
        >
          <img
            src={LOGO_DATA_URL}
            width={220}
            height={94}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* LEFT — rep photo (with rose gold frame) or branded fallback */}
        {photo ? (
          <img
            src={photo}
            width={420}
            height={480}
            style={{
              objectFit: 'cover',
              borderRadius: 4,
              border: '10px solid #C9A678',
            }}
          />
        ) : (
          <div
            style={{
              width: 420,
              height: 480,
              background: '#EFE0CF',
              borderRadius: 4,
              border: '10px solid #C9A678',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 60,
            }}
          >
            <img
              src={LOGO_DATA_URL}
              width={260}
              height={111}
              style={{ objectFit: 'contain' }}
            />
          </div>
        )}

        {/* RIGHT — text content column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: 0,
            marginTop: 40,
          }}
        >
          {/* Eyebrow label */}
          <div
            style={{
              fontSize: 20,
              color: '#9B7A65',
              letterSpacing: 6,
              fontWeight: 500,
              display: 'flex',
            }}
          >
            ოფიციალური წარმომადგენელი
          </div>

          {/* Name (large serif) */}
          <div
            style={{
              fontSize: name.length > 14 ? 70 : 96,
              color: '#1A1A1A',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              marginTop: 18,
              display: 'flex',
            }}
          >
            {name}
          </div>

          {/* Gold accent line */}
          <div
            style={{
              width: 100,
              height: 3,
              background: '#C9A678',
              marginTop: 26,
              display: 'flex',
            }}
          />

          {/* Tagline (two lines) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 22,
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 30,
                color: '#3D2A1F',
                lineHeight: 1.25,
                display: 'flex',
              }}
            >
              შენი სილამაზის, ჯანმრთელობის
            </div>
            <div
              style={{
                fontSize: 30,
                color: '#3D2A1F',
                lineHeight: 1.25,
                display: 'flex',
              }}
            >
              და ესთეტიკის გზამკვლევი
            </div>
          </div>

          {/* Three-pillar row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              marginTop: 34,
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: 2,
            }}
          >
            <div style={{ display: 'flex', color: '#993556' }}>სილამაზე</div>
            <div
              style={{
                width: 1,
                height: 22,
                background: '#C9A678',
                opacity: 0.6,
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex', color: '#3B6D11' }}>ჯანმრთელობა</div>
            <div
              style={{
                width: 1,
                height: 22,
                background: '#C9A678',
                opacity: 0.6,
                display: 'flex',
              }}
            />
            <div style={{ display: 'flex', color: '#854F0B' }}>ესთეტიკა</div>
          </div>

          {/* City */}
          {city && (
            <div
              style={{
                fontSize: 22,
                color: '#9B7A65',
                marginTop: 28,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
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
        'Cache-Control':
          'public, max-age=3600, s-maxage=300, stale-while-revalidate=86400',
      },
    }
  );
}
