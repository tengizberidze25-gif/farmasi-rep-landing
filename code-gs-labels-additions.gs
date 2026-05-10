/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Code.gs additions — Labels API
 *  ჩასვი არსებულ Код.gs ფაილში (Apps Script რედაქტორი)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/* ─────────────────────────────────────────────────────────────────────
   1. ჩასვი ეს ფუნქცია სადმე Код.gs-ში (მაგ., getProblems()-ის შემდეგ)
   ───────────────────────────────────────────────────────────────────── */
function getLabels() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Labels');
    if (!sheet) return { ok: true, labels: {} };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { ok: true, labels: {} };

    const headers = data[0].map(h => String(h || '').trim().toLowerCase());
    const keyCol = headers.indexOf('key');
    const valueCol = headers.indexOf('value');
    if (keyCol === -1 || valueCol === -1) return { ok: true, labels: {} };

    const labels = {};
    for (let i = 1; i < data.length; i++) {
      const key = String(data[i][keyCol] || '').trim();
      const value = String(data[i][valueCol] || '');
      if (key) labels[key] = value;
    }

    return { ok: true, labels: labels };
  } catch (err) {
    return { ok: false, error: err.message, labels: {} };
  }
}

/* ─────────────────────────────────────────────────────────────────────
   2. ჩაამატე ეს case `handleRequest`-ში — სხვა case-ების გვერდით
      (მაგ. case 'get_problems'-ის შემდეგ):
   ─────────────────────────────────────────────────────────────────────

      case 'get_labels':
        return jsonResponse(getLabels(), callback);

   ───────────────────────────────────────────────────────────────────── */
