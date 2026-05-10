/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Code.gs additions — Slug API
 *  ჩასვი არსებულ Код.gs ფაილში
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  წინაპირობა:
 *    Reps sheet-ში დაამატე ახალი სვეტი — სათაური `slug`
 *    (პატარა Latin ასოებით, მაგ: mariami, ani, giorgi)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ─────────────────────────────────────────────────────────────────────
   1. ჩასვი ეს ფუნქცია სადმე Код.gs-ში (მაგ. getRep()-ის შემდეგ)
   ───────────────────────────────────────────────────────────────────── */
function getRepBySlug(params) {
  try {
    const cleanSlug = String((params && params.slug) || '').trim().toLowerCase();
    if (!cleanSlug) return { ok: false, error: 'No slug provided' };

    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Reps');
    if (!sheet) return { ok: false, error: 'Reps sheet not found' };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { ok: false, error: 'Reps sheet is empty' };

    const headers = data[0].map(h => String(h || '').trim().toLowerCase());
    const slugCol = headers.indexOf('slug');
    const pidCol = headers.indexOf('pid');

    if (slugCol === -1) return { ok: false, error: 'Slug column not found in Reps sheet' };
    if (pidCol === -1) return { ok: false, error: 'PID column not found in Reps sheet' };

    for (let i = 1; i < data.length; i++) {
      const rowSlug = String(data[i][slugCol] || '').trim().toLowerCase();
      if (rowSlug && rowSlug === cleanSlug) {
        const pid = String(data[i][pidCol] || '').trim();
        if (!pid) continue;
        // Delegate to existing getRep — same response shape
        return getRep({ pid: pid });
      }
    }

    return { ok: false, error: 'Rep not found for slug: ' + cleanSlug };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ─────────────────────────────────────────────────────────────────────
   2. ჩაამატე ეს case `handleRequest`-ში — სხვა case-ების გვერდით
      (მაგ. case 'get_rep'-ის შემდეგ):
   ─────────────────────────────────────────────────────────────────────

      case 'get_rep_by_slug':
        return jsonResponse(getRepBySlug(p), callback);

   ───────────────────────────────────────────────────────────────────── */
