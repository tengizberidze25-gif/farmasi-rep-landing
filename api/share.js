// ════════════════════════════════════════════════════════════
//   FARMASI — სოც-ქსელის "Share" გვერდი (Vercel Serverless Function)
//
//   მისამართი:  /api/share?v=<videoGuid>&slug=<slug>&name=<სახელი>
//
//   რას აკეთებს:
//     • ფეისბუქის/სოც-ქსელის "რობოტს" უბრუნებს Open Graph ბარათს —
//       ვიდეოს სურათი + სათაური "გადადი და შეუკვეთე".
//     • ნამდვილ მომხმარებელს მაშინვე გადაამისამართებს წარმომადგენლის
//       საჯარო ფეიჯზე (my.farmasi.ge/<slug>), სადაც ვიდეოა + შეკვეთა.
//
//   ფაილი ჩასვი farmasi-rep-landing repo-ში: api/share.js
//   (Vercel ავტომატურად გამოაჩენს მისამართზე /api/share)
// ════════════════════════════════════════════════════════════

const BUNNY_LIBRARY = '674864';                  // შენი Bunny Stream Library ID
const BUNNY_CDN     = 'vz-5179c29c-fda.b-cdn.net'; // შენი Bunny Pull Zone hostname
const SITE          = 'https://my.farmasi.ge';     // საიტის ძირი

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default function handler(req, res) {
  const q = req.query || {};
  const slug = String(q.slug || '').trim();
  const guid = String(q.v || '').replace(/[^a-zA-Z0-9-]/g, '');
  const name = q.name ? decodeURIComponent(String(q.name)) : 'FARMASI';

  // საჯარო ფეიჯის ლინკი — აქ გადადის ნამდვილი მომხმარებელი
  const publicUrl = slug ? `${SITE}/${encodeURIComponent(slug)}` : SITE;

  // share-ლინკი თვითონ — ფეისბუქმა ამის OG ტეგები (ვიდეო-კადრი) აიღოს,
  // არა საჯარო ფეიჯისა (რომელიც ბრენდირებულ ბარათს აჩვენებს)
  const host = (req.headers && req.headers.host) || 'my.farmasi.ge';
  const shareUrl = `https://${host}${req.url || ''}`;

  // Bunny-ს სურათი და ფლეიერი (ვიდეო Bunny-ში public embed-ით უნდა იყოს)
  const thumb  = guid ? `https://${BUNNY_CDN}/${guid}/thumbnail.jpg` : `${SITE}/og-default.jpg`;
  const player = guid ? `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY}/${guid}` : '';

  const title = `გადადი და შეუკვეთე — ${name}`;
  const desc  = 'ნახე ვიდეო და გააფორმე შეკვეთა FARMASI-ის ოფიციალურ წარმომადგენელთან.';

  const videoTags = player ? `
  <meta property="og:video" content="${esc(player)}">
  <meta property="og:video:secure_url" content="${esc(player)}">
  <meta property="og:video:type" content="text/html">
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">
  <meta name="twitter:player" content="${esc(player)}">
  <meta name="twitter:player:width" content="1280">
  <meta name="twitter:player:height" content="720">` : '';

  const html = `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>

  <meta property="og:type" content="video.other">
  <meta property="og:site_name" content="FARMASI Georgia">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(shareUrl)}">
  <meta property="og:image" content="${esc(thumb)}">
  <meta property="og:image:width" content="1280">
  <meta property="og:image:height" content="720">${videoTags}

  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(thumb)}">

  <script>location.replace(${JSON.stringify(publicUrl)});</script>
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px;background:#0b0b0f;color:#fff">
  <p>გადამისამართება საჯარო ფეიჯზე…</p>
  <p><a href="${esc(publicUrl)}" style="color:#ff6b9d">თუ ავტომატურად ვერ გადახვედი, დააჭირე აქ</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(html);
}
