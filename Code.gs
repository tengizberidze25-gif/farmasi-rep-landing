// SSO Configuration
const SSO_SECRET = 'your-sso-secret-key-here'; // შენ შემდეგ ცვლი ლაშის Secret-ით

/**
 * FARMASI Landing API
 * 
 * Web App endpoint for representative landing pages.
 * Supports JSONP for cross-origin requests from Vercel.
 */

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEETS = {
  REPS:         'Reps',
  PRODUCTS:     'Products',
  REP_PRODUCTS: 'RepProducts',
  VISITS:       'Visits',
  LEADS:        'Leads',
  ORDERS:       'Orders',
};

// ─── ENTRY POINTS ──────────────────────────────────────────────────────────

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = (e && e.parameter) || {};
  const action = params.action || 'ping';
  const callback = params.callback; // JSONP callback name

  let result;
  try {
    switch (action) {
      case 'ping':              result = { ok: true, msg: 'FARMASI Landing API is alive', time: new Date().toISOString() }; break;
      case 'request_otp':       result = requestOtp(params); break;
      case 'register_phone':    result = registerPhone(params); break;
      case 'verify_otp':        result = verifyOtp(params); break;
      case 'sso_login':         result = ssoLogin(params); break;
      case 'get_rep':           result = getRep(params.pid); break;
      case 'get_rep_by_slug':   return jsonResponse(getRepBySlug(params), callback);
      case 'get_labels':        return jsonResponse(getLabels(), callback);
      case 'log_visit':         result = logVisit(params.pid, params.product_id || ''); break;
      case 'submit_lead':       result = submitLead(params); break;
      case 'upload_photo':      result = uploadPhoto(params); break;
      case 'upload_video':      result = uploadVideo(params); break;
      case 'get_problems':      result = getProblems(); break;
      case 'save_rep':          result = saveRep(params); break;
      case 'update_lead_status':result = updateLeadStatus(params); break;
      case 'add_rep_product':   result = addRepProduct(params); break;
      case 'update_rep_product':result = updateRepProduct(params); break;
      case 'remove_rep_product':result = removeRepProduct(params); break;
      case 'get_products':      result = getProducts(); break;
      case 'get_visits':        result = getVisits(params.pid); break;
      case 'get_leads':         result = getLeads(params.pid); break;
      case 'get_rep_products':  result = getRepProducts(params.pid); break;
      case 'submit_order':      return jsonResponse(submitOrder(params), callback);
      case 'get_order':         return jsonResponse(getOrder(params.order_id), callback);
      case 'get_rep_orders':    return jsonResponse(getRepOrders(params.pid), callback);
      default:                  result = { ok: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { ok: false, error: err.message, stack: err.stack };
  }

  return jsonResponse(result, callback);
}

function jsonResponse(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── SLUG HELPERS ──────────────────────────────────────────────────────────

/**
 * Transliterate Georgian → Latin and clean for URL slug.
 * Uses only first word for privacy.
 * E.g. "შორენა" → "shorena", "ნინო ცინცაძე" → "nino"
 */
function slugify(name) {
  if (!name) return '';
  const map = {
    'ა':'a','ბ':'b','გ':'g','დ':'d','ე':'e','ვ':'v','ზ':'z','თ':'t',
    'ი':'i','კ':'k','ლ':'l','მ':'m','ნ':'n','ო':'o','პ':'p','ჟ':'zh',
    'რ':'r','ს':'s','ტ':'t','უ':'u','ფ':'p','ქ':'q','ღ':'gh','ყ':'q',
    'შ':'sh','ჩ':'ch','ც':'ts','ძ':'dz','წ':'ts','ჭ':'ch','ხ':'kh',
    'ჯ':'j','ჰ':'h'
  };
  const firstWord = String(name).trim().split(/\s+/)[0] || '';
  const slug = firstWord
    .toLowerCase()
    .split('')
    .map(c => map[c] || c)
    .join('')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length >= 3 ? slug : '';
}

/**
 * Full-name slug for fallback lookup.
 * Transliterates the WHOLE name (first + last + ...) → hyphenated slug.
 * E.g. "იზოლდა კეზევაძე" → "izolda-kezevadze"
 *      "თამარ გელაშვილი" → "tamar-gelashvili"
 * Used by getRepBySlug() as a Pass-2 fallback when exact slug not found.
 */
function fullNameSlug(name) {
  if (!name) return '';
  const map = {
    'ა':'a','ბ':'b','გ':'g','დ':'d','ე':'e','ვ':'v','ზ':'z','თ':'t',
    'ი':'i','კ':'k','ლ':'l','მ':'m','ნ':'n','ო':'o','პ':'p','ჟ':'zh',
    'რ':'r','ს':'s','ტ':'t','უ':'u','ფ':'p','ქ':'q','ღ':'gh','ყ':'q',
    'შ':'sh','ჩ':'ch','ც':'ts','ძ':'dz','წ':'ts','ჭ':'ch','ხ':'kh',
    'ჯ':'j','ჰ':'h'
  };
  return String(name).trim().toLowerCase()
    .split('')
    .map(c => map[c] || c)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '')   // remove punctuation, keep spaces+hyphens
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/--+/g, '-')            // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
}

/**
 * Generate a beautiful anonymous slug (FARMASI-themed).
 * E.g. "velvet-bloom", "golden-petal"
 */
function generateBeautifulSlug() {
  const adjectives = ['velvet','silk','golden','rose','pearl','crimson','royal','radiant',
    'glowing','soft','pure','bright','glam','chic','ruby','amber','coral',
    'blush','ivory','pink','lush','sweet','fresh','tender','dreamy','silky'];
  const nouns = ['bloom','petal','orchid','jasmine','lily','rose','lotus','tulip',
    'aurora','flame','glow','sparkle','dawn','pearl','gem','mist','dew',
    'magnolia','iris','peony','velvet','star','moon','satin','silk','flora'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return adj + '-' + noun;
}

/**
 * Check if a slug is already taken in the Reps sheet (excluding the given PID).
 */
function isSlugTaken(slug, sheet, headers, excludePid) {
  if (!slug) return false;
  const slugCol = headers.indexOf('slug');
  if (slugCol < 0) return false;
  
  const data = sheet.getDataRange().getValues();
  excludePid = String(excludePid || '').trim();
  const checkSlug = String(slug).trim().toLowerCase();
  
  for (let i = 1; i < data.length; i++) {
    const rowSlug = String(data[i][slugCol] || '').trim().toLowerCase();
    const rowPid = String(data[i][0] || '').trim();
    if (rowSlug === checkSlug && rowPid !== excludePid) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a unique slug from a name. If base is taken, append a number.
 * Falls back to beautiful slug if name is empty/invalid.
 */
function generateUniqueSlug(name, sheet, headers, excludePid) {
  let base = slugify(name) || generateBeautifulSlug();
  let candidate = base;
  let suffix = 2;
  
  while (isSlugTaken(candidate, sheet, headers, excludePid) && suffix < 100) {
    candidate = base + '-' + suffix;
    suffix++;
  }
  
  if (isSlugTaken(candidate, sheet, headers, excludePid)) {
    return generateBeautifulSlug() + '-' + Math.floor(Math.random() * 9999);
  }
  
  return candidate;
}

// ─── ACTIONS ───────────────────────────────────────────────────────────────

/**
 * GET REP — Returns representative data by PID.
 * If rep doesn't exist, creates a new row WITH auto-generated slug.
 */
function getRep(pid) {
  if (!pid) return { ok: false, error: 'PID required' };
  pid = String(pid).trim();

  const sheet = getSheet(SHEETS.REPS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find the rep
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === pid) {
      return { ok: true, rep: rowToObject(headers, data[i]) };
    }
  }

  // Not found — create new row with auto-generated slug
  const now = new Date().toISOString();
  const autoSlug = generateUniqueSlug('', sheet, headers, pid); // empty name → FARMASI-themed
  
  // Build newRow matching header count exactly (handles any column count)
  const newRow = new Array(headers.length).fill('');
  newRow[0] = pid;
  
  const createdAtCol = headers.indexOf('created_at');
  const updatedAtCol = headers.indexOf('updated_at');
  const slugCol = headers.indexOf('slug');
  const urlCol = headers.indexOf('URL');
  
  if (createdAtCol >= 0) newRow[createdAtCol] = now;
  if (updatedAtCol >= 0) newRow[updatedAtCol] = now;
  if (slugCol >= 0)      newRow[slugCol] = autoSlug;
  if (urlCol >= 0 && autoSlug) newRow[urlCol] = 'https://my.farmasi.ge/' + autoSlug;
  
  sheet.appendRow(newRow);

  return { ok: true, rep: rowToObject(headers, newRow), created: true };
}

/**
 * BACKFILL REP URLS — One-time admin utility.
 * Run from Apps Script editor: select "backfillRepUrls" → Run.
 * 
 * Fills missing URL column values for all reps that have a slug.
 * Safe to run multiple times — only fills empty URL cells.
 */
function backfillRepUrls() {
  // ცარდენ FARMASI Landing Data ცარდენ ცარდენ ID-ცი
  const SPREADSHEET_ID = '1mBKr_qkBlE0d1kXuAzdbcBX-a6oDn73Ly1Ii1xJexMM';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // ცარდენ ცარდენ ცარდენ ცარდენ ცარდენ
  const allSheets = ss.getSheets().map(s => s.getName());
  Logger.log('📋 ცარდენ ცარდენ: ' + allSheets.join(', '));
  
  // ცარდენ Reps ცარდენ (case-insensitive)
  let sheet = null;
  for (const s of ss.getSheets()) {
    const name = s.getName().toLowerCase().trim();
    if (name === 'reps' || name === 'წარმომადგენლები' || name === 'rep') {
      sheet = s;
      Logger.log('✅ ვიპოვე: ' + s.getName());
      break;
    }
  }
  
  if (!sheet) {
    Logger.log('❌ Reps ცარდენ ცარდენ ცარდენ ცარდენ ცარდენ');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  Logger.log('📋 Headers: ' + headers.join(' | '));
  
  // Case-insensitive search for slug and URL
  let slugCol = -1, urlCol = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).trim().toLowerCase();
    if (h === 'slug') slugCol = i;
    if (h === 'url') urlCol = i;
  }
  
  Logger.log('🔍 slug column: ' + slugCol);
  Logger.log('🔍 URL column: ' + urlCol);
  
  if (slugCol < 0 || urlCol < 0) {
    Logger.log('❌ ვერ ვიპოვე slug ან URL სვეტი');
    return;
  }
  
  let filled = 0;
  let skipped = 0;
  
  for (let i = 1; i < data.length; i++) {
    const slug = String(data[i][slugCol] || '').trim();
    const url = String(data[i][urlCol] || '').trim();
    
    if (slug && !url) {
      const newUrl = 'https://my.farmasi.ge/' + slug;
      sheet.getRange(i + 1, urlCol + 1).setValue(newUrl);
      Logger.log('✅ მცკრივი ' + (i + 1) + ': ' + newUrl);
      filled++;
    } else {
      skipped++;
    }
  }
  
  Logger.log('');
  Logger.log('📊 შედეგი:');
  Logger.log('   შევსებული: ' + filled);
  Logger.log('   გამოტოვებული: ' + skipped);
}

/**
 * SAVE REP — Updates representative profile data.
 * Now includes slug with format validation and uniqueness check.
 */
function saveRep(params) {
  const pid = String(params.pid || '').trim();
  if (!pid) return { ok: false, error: 'PID required' };

  const sheet = getSheet(SHEETS.REPS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find row index
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === pid) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return { ok: false, error: 'Rep not found: ' + pid };
  }

  // ─── SLUG: validate + uniqueness check, then save ───
  if (params.slug !== undefined) {
    const requestedSlug = String(params.slug).trim().toLowerCase();
    const slugCol = headers.indexOf('slug');
    
    if (requestedSlug && slugCol >= 0) {
      // Validate format
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(requestedSlug) || requestedSlug.length < 3 || requestedSlug.length > 30) {
        return { ok: false, error: 'Slug format invalid. Use 3-30 lowercase letters, numbers, dashes (e.g. rose-bloom, nino).' };
      }
      
      // Uniqueness check
      if (isSlugTaken(requestedSlug, sheet, headers, pid)) {
        return { ok: false, error: 'Slug already taken: ' + requestedSlug + ' — try another.' };
      }
      
      // Save
      sheet.getRange(rowIndex, slugCol + 1).setValue(requestedSlug);
      
      // Auto-update URL column to match new slug
      const urlCol = headers.indexOf('URL');
      if (urlCol >= 0) {
        sheet.getRange(rowIndex, urlCol + 1).setValue('https://my.farmasi.ge/' + requestedSlug);
      }
    }
  }

  // Other editable fields
  const editable = ['name', 'bio', 'photo_url', 'city', 'phone', 'whatsapp',
                  'instagram', 'facebook', 'tiktok', 'youtube', 'telegram', 'video_url',
                  'customer_videos', 'referral_link'];
  editable.forEach(field => {
  if (params[field] === undefined) return;
  
  // Skip empty URL fields — they're managed by upload actions
  if (!params[field] && (field === 'photo_url' || field === 'video_url')) return;
  
  const colIndex = headers.indexOf(field);
  if (colIndex >= 0) {
    sheet.getRange(rowIndex, colIndex + 1).setValue(params[field]);
  }
});

  // Update timestamp
  const updatedAtCol = headers.indexOf('updated_at');
  if (updatedAtCol >= 0) {
    sheet.getRange(rowIndex, updatedAtCol + 1).setValue(new Date().toISOString());
  }

  // Return updated rep
  const updatedRow = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  return { ok: true, rep: rowToObject(headers, updatedRow) };
}

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
    const nameCol = headers.indexOf('name');

    if (slugCol === -1) return { ok: false, error: 'Slug column not found in Reps sheet' };
    if (pidCol === -1) return { ok: false, error: 'PID column not found in Reps sheet' };

    // ── PASS 1: Exact slug match (existing behavior, highest priority) ──
    for (let i = 1; i < data.length; i++) {
      const rowSlug = String(data[i][slugCol] || '').trim().toLowerCase();
      if (rowSlug && rowSlug === cleanSlug) {
        const pid = String(data[i][pidCol] || '').trim();
        if (!pid) continue;
        return getRep(pid);
      }
    }

    // ── PASS 2: Full-name fallback ──
    // If exact slug fails, try matching against transliterated full name.
    // E.g. request "izolda-kezevadze" matches rep "იზოლდა კეზევაძე"
    // even though their actual slug is just "izolda".
    if (nameCol !== -1) {
      for (let i = 1; i < data.length; i++) {
        const fullName = String(data[i][nameCol] || '').trim();
        if (!fullName) continue;

        const candidateSlug = fullNameSlug(fullName);
        if (candidateSlug && candidateSlug === cleanSlug) {
          const pid = String(data[i][pidCol] || '').trim();
          if (!pid) continue;
          return getRep(pid);
        }
      }
    }

    return { ok: false, error: 'Rep not found for slug: ' + cleanSlug };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * LOG VISIT — Increments visit count for today.
 */
function logVisit(pid, productId) {
  if (!pid) return { ok: false, error: 'PID required' };
  pid = String(pid).trim();
  productId = String(productId || '').trim();

  const today = Utilities.formatDate(new Date(), 'Asia/Tbilisi', 'yyyy-MM-dd');
  const sheet = getSheet(SHEETS.VISITS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowPid = String(data[i][0]).trim();
    const rowProductId = String(data[i][1] || '').trim();
    let rowDate = data[i][2];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, 'Asia/Tbilisi', 'yyyy-MM-dd');
    } else {
      rowDate = String(rowDate).trim();
    }
    if (rowPid === pid && rowProductId === productId && rowDate === today) {
      sheet.getRange(i + 1, 4).setValue(Number(data[i][3]) + 1);
      return { ok: true };
    }
  }

  sheet.appendRow([pid, productId, today, 1]);
  return { ok: true, created: true };
}

/**
 * SUBMIT LEAD — Records a contact form submission.
 */
function submitLead(params) {
  const pid = String(params.pid || '').trim();
  if (!pid) return { ok: false, error: 'PID required' };

  const sheet = getSheet(SHEETS.LEADS);
  sheet.appendRow([
    pid,
    String(params.visitor_name || ''),
    String(params.visitor_phone || ''),
    String(params.message || ''),
    String(params.product_id || ''),
    'new',
    new Date().toISOString(),
  ]);

  return { ok: true };
}

// ─── HELPERS ───────────────────────────────────────────────────────────────

function getSheet(name) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    let val = row[i];
    if (val === undefined || val === null) {
      obj[h] = '';
    } else if (val instanceof Date) {
      obj[h] = val.toISOString();
    } else {
      obj[h] = String(val);
    }
  });
  return obj;
}

// ─── MIGRATION — RUN ONCE TO ASSIGN SLUGS TO EXISTING REPS WITHOUT ONE ─────

/**
 * MIGRATION: Assigns auto-generated slugs to reps with empty slug.
 * Uses name (first word) if available, else FARMASI-themed fallback.
 * Safe to run multiple times — only fills empties.
 * 
 * HOW TO RUN:
 *   1. Apps Script editor: select "assignMissingSlugs" from function dropdown
 *   2. Click ▶ Run
 *   3. View → Logs to see what was assigned
 */
function assignMissingSlugs() {
  const sheet = getSheet(SHEETS.REPS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const slugCol = headers.indexOf('slug');
  const nameCol = headers.indexOf('name');
  
  if (slugCol < 0) {
    Logger.log('❌ Slug column not found. Add a "slug" column to Reps sheet first.');
    return;
  }
  
  let assignedCount = 0;
  let skippedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const existingSlug = String(data[i][slugCol] || '').trim();
    const pid = String(data[i][0] || '').trim();
    const name = nameCol >= 0 ? String(data[i][nameCol] || '').trim() : '';
    
    if (existingSlug) {
      skippedCount++;
      continue;
    }
    
    if (!pid) continue;
    
    const newSlug = generateUniqueSlug(name, sheet, headers, pid);
    sheet.getRange(i + 1, slugCol + 1).setValue(newSlug);
    Logger.log('✓ PID ' + pid + ' (' + (name || '(no name)') + ') → ' + newSlug);
    assignedCount++;
  }
  
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('🌹 Migration complete!');
  Logger.log('   Assigned: ' + assignedCount + ' new slugs');
  Logger.log('   Skipped: ' + skippedCount + ' (already had slug)');
}

// ─── PHOTO UPLOAD ──────────────────────────────────────────────────────────

const PHOTO_FOLDER_NAME = 'FARMASI Landing Photos';

function getOrCreatePhotoFolder() {
  const folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(PHOTO_FOLDER_NAME);
}

function uploadPhoto(params) {
  const pid = String(params.pid || '').trim();
  if (!pid) return { ok: false, error: 'PID required' };
  
  const photoData = params.photo_data || '';
  if (!photoData) return { ok: false, error: 'Photo data required' };

  try {
    const matches = photoData.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return { ok: false, error: 'Invalid photo format' };
    
    const mimeType = matches[1];
    const base64 = matches[2];
    const extension = mimeType.split('/')[1];
    
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, `rep_${pid}_${Date.now()}.${extension}`);
    
    const folder = getOrCreatePhotoFolder();
    const file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    const photoUrl = `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
    
    const sheet = getSheet(SHEETS.REPS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === pid) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return { ok: false, error: 'Rep not found: ' + pid };
    
    const photoCol = headers.indexOf('photo_url');
    if (photoCol >= 0) {
      sheet.getRange(rowIndex, photoCol + 1).setValue(photoUrl);
    }
    
    const updatedAtCol = headers.indexOf('updated_at');
    if (updatedAtCol >= 0) {
      sheet.getRange(rowIndex, updatedAtCol + 1).setValue(new Date().toISOString());
    }
    
    return { ok: true, photo_url: photoUrl };
    
  } catch (err) {
    return { ok: false, error: 'Upload failed: ' + err.message };
  }
}

function uploadVideo(params) {
  try {
    var pid = String(params.pid || '').trim();
    var videoData = String(params.video_data || '');
    var filename = String(params.video_filename || 'video.mp4');
    
    if (!pid) return { ok: false, error: 'PID მითითებული არ არის' };
    if (!videoData) return { ok: false, error: 'ვიდეო ცარიელია' };
    
    var base64 = videoData.replace(/^data:video\/[^;]+;base64,/, '');
    var contentType = (videoData.match(/^data:(video\/[^;]+);/) || [])[1] || 'video/mp4';
    var bytes = Utilities.base64Decode(base64);
    var blob = Utilities.newBlob(bytes, contentType, 'rep_' + pid + '_' + Date.now() + '_' + filename);
    
    var folderName = 'FARMASI Landing Videos';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    var file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    var videoUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
    
    var sheet = getSheet(SHEETS.REPS);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var videoCol = headers.indexOf('video_url');
    
    if (videoCol === -1) {
      sheet.getRange(1, headers.length + 1).setValue('video_url');
      videoCol = headers.length;
    }
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === pid) {
        sheet.getRange(i + 1, videoCol + 1).setValue(videoUrl);
        var updatedAtCol = headers.indexOf('updated_at');
        if (updatedAtCol >= 0) {
          sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
        }
        break;
      }
    }
    
    return { ok: true, video_url: videoUrl };
  } catch (err) {
    return { ok: false, error: 'Upload failed: ' + err.toString() };
  }
}

// ─── DEBUG / TEST ──────────────────────────────────────────────────────────

function testUpload() {
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const result = uploadPhoto({
    pid: '153205',
    photo_data: tinyPng,
  });
  Logger.log(JSON.stringify(result, null, 2));
}

function testGetRepBySlug() {
  const result = getRepBySlug({ slug: 'mariami' });
  Logger.log(JSON.stringify(result, null, 2));
}

function getVisits(pid) {
  if (!pid) return { ok: false, error: 'PID required' };
  pid = String(pid).trim();

  const sheet = getSheet(SHEETS.VISITS);
  const data = sheet.getDataRange().getValues();

  const today = Utilities.formatDate(new Date(), 'Asia/Tbilisi', 'yyyy-MM-dd');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = Utilities.formatDate(sevenDaysAgo, 'Asia/Tbilisi', 'yyyy-MM-dd');

  let todayCount = 0;
  let weekCount = 0;
  let totalCount = 0;
  const dailyBreakdown = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyBreakdown[Utilities.formatDate(d, 'Asia/Tbilisi', 'yyyy-MM-dd')] = 0;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() !== pid) continue;

    let date = data[i][2];
    if (date instanceof Date) {
      date = Utilities.formatDate(date, 'Asia/Tbilisi', 'yyyy-MM-dd');
    } else {
      date = String(date).trim();
    }
    const count = Number(data[i][3]) || 0;

    totalCount += count;

    if (date === today) todayCount += count;
    if (date >= sevenDaysAgoStr) {
      weekCount += count;
      if (dailyBreakdown[date] !== undefined) {
        dailyBreakdown[date] += count;
      }
    }
  }

  const days = Object.keys(dailyBreakdown).sort().map(date => ({
    date,
    count: dailyBreakdown[date],
  }));

  return {
    ok: true,
    today: todayCount,
    week: weekCount,
    total: totalCount,
    days: days,
  };
}

function testLog() {
  const sheet = getSheet(SHEETS.VISITS);
  const data = sheet.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), 'Asia/Tbilisi', 'yyyy-MM-dd');
  Logger.log('Today computed: ' + today);
  for (let i = 1; i < data.length; i++) {
    let rowDate = data[i][2];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, 'Asia/Tbilisi', 'yyyy-MM-dd');
    } else {
      rowDate = String(rowDate).trim();
    }
    Logger.log('Row ' + i + ' date: ' + rowDate + ' | match: ' + (rowDate === today));
  }
}

function getProblems() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Problems');
    if (!sheet) return { ok: false, error: 'Problems sheet not found' };
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { ok: true, problems: [] };
    
    const headers = data[0].map(h => String(h).trim());
    const out = [];
    
    for (let i = 1; i < data.length; i++) {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = data[i][idx]; });
      
      const isActive = String(obj.active).toUpperCase() === 'TRUE' || obj.active === true;
      if (!isActive) continue;
      if (!obj.id) continue;
      
      const hasBridge = !!obj.bridge_eyebrow;
      
      out.push({
        id: String(obj.id).trim(),
        label: String(obj.label || obj.id),
        icon: String(obj.icon || 'circle'),
        accent: String(obj.accent || '#E50571'),
        productId: obj.product_id ? Number(obj.product_id) : null,
        sort: Number(obj.sort) || 999,
        bridge: hasBridge ? {
          science: String(obj.bridge_science || ''),
          tipsDo: String(obj.bridge_tips_do || ''),
          tipsAvoid: String(obj.bridge_tips_avoid || ''),
          doctor: String(obj.bridge_doctor || ''),
          eyebrow: String(obj.bridge_eyebrow || ''),
          headline: String(obj.bridge_headline || ''),
          paragraphs: [obj.bridge_para_1, obj.bridge_para_2, obj.bridge_para_3]
            .map(p => String(p || '').trim())
            .filter(p => p.length > 0),
          stat: String(obj.bridge_stat || ''),
          repNote: String(obj.bridge_rep_note || ''),
          cta: String(obj.bridge_cta || 'ნახე შენი რიტუალი'),
        } : null
      });
    }
    
    out.sort((a, b) => a.sort - b.sort);
    return { ok: true, problems: out };
    
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function testGetProblems() {
  const result = getProblems();
  Logger.log(JSON.stringify(result, null, 2));
}

function getProducts() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Products');
    if (!sheet) return { ok: true, products: [] };

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { ok: true, products: [] };

    const headers = data[0].map(h => String(h).trim());
    const out = [];

    for (let i = 1; i < data.length; i++) {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = data[i][idx]; });

      const isActive = String(obj.active).toUpperCase() === 'TRUE' || obj.active === true;
      if (!isActive) continue;
      if (!obj.id) continue;

      out.push({
        id: Number(obj.id),
        problemId: String(obj.problem_id || '').trim(),
        sort: Number(obj.sort) || 999,
        active: true,
        name: String(obj.name || ''),
        cat: String(obj.cat || ''),
        price: Number(obj.price) || 0,
        tag: String(obj.tag || ''),
        image: String(obj.image || ''),
        accent: String(obj.accent || '#E50571'),
        description: String(obj.description || ''),
      });
    }

    out.sort((a, b) => a.sort - b.sort);
    return { ok: true, products: out };

  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// ─── LABELS — Multi-sheet i18n system ──────────────────────────────────────

/**
 * GET LABELS — Reads label overrides from multiple sheets and merges them.
 * 
 * Supports 3 separate sheets (one per page) for cleaner organization:
 *   - "შესვლა" (Welcome)        — welcome/login page texts
 *   - "პანელი" (Dashboard)      — admin/edit panel texts
 *   - "საჯარო ფეიჯი" (Public)   — public rep page texts
 * 
 * Each sheet must have two columns: "key" | "value"
 * 
 * Legacy "Labels" sheet is also supported (backward compatibility).
 * If duplicate keys exist across sheets, later sheets override earlier ones.
 */
function getLabels() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);

    // Sheet names to read from, in order. Later sheets override earlier ones.
    // Both Georgian and English names supported, plus legacy "Labels".
    const sheetNames = [
      'Labels',           // legacy single-sheet fallback
      'შესვლა',           // Welcome page
      'Welcome',
      'პანელი',           // Dashboard
      'Dashboard',
      'საჯარო ფეიჯი',     // Public page
      'Public',
    ];

    const labels = {};

    for (let s = 0; s < sheetNames.length; s++) {
      const sheet = spreadsheet.getSheetByName(sheetNames[s]);
      if (!sheet) continue;

      const data = sheet.getDataRange().getValues();
      if (data.length < 2) continue;

      const headers = data[0].map(h => String(h || '').trim().toLowerCase());
      const keyCol = headers.indexOf('key');
      const valueCol = headers.indexOf('value');
      if (keyCol === -1 || valueCol === -1) continue;

      for (let i = 1; i < data.length; i++) {
        const key = String(data[i][keyCol] || '').trim();
        const value = String(data[i][valueCol] || '');
        if (key) labels[key] = value;
      }
    }

    return { ok: true, labels: labels };
  } catch (err) {
    return { ok: false, error: err.message, labels: {} };
  }
}

// ─── LEADS — Contact form submissions ──────────────────────────────────────

/**
 * GET LEADS — Returns all leads for a given rep (PID), sorted by newest first.
 * Used by the Dashboard to show contact form submissions.
 */
function getLeads(pid) {
  if (!pid) return { ok: false, error: 'PID required' };
  pid = String(pid).trim();

  try {
    const sheet = getSheet(SHEETS.LEADS);
    const data = sheet.getDataRange().getValues();
    if (data.length < 1) return { ok: true, leads: [] };

    // Leads sheet structure (from submitLead):
    //   col 0: pid
    //   col 1: visitor_name
    //   col 2: visitor_phone
    //   col 3: message
    //   col 4: product_id
    //   col 5: status (new / contacted / closed)
    //   col 6: timestamp
    const leads = [];
    for (let i = 0; i < data.length; i++) {
      const rowPid = String(data[i][0] || '').trim();
      if (rowPid !== pid) continue;

      let timestamp = data[i][6];
      if (timestamp instanceof Date) {
        timestamp = timestamp.toISOString();
      } else {
        timestamp = String(timestamp || '');
      }

      leads.push({
        row: i + 1, // 1-indexed for later updates
        name: String(data[i][1] || ''),
        phone: String(data[i][2] || ''),
        message: String(data[i][3] || ''),
        productId: String(data[i][4] || ''),
        status: String(data[i][5] || 'new'),
        timestamp: timestamp,
      });
    }

    // Sort newest first
    leads.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    return { ok: true, leads: leads };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * UPDATE LEAD STATUS — Marks a lead as contacted/closed.
 * Frontend passes the row number returned from getLeads.
 */
function updateLeadStatus(params) {
  const row = Number(params.row);
  const status = String(params.status || '').trim();
  if (!row || row < 1) return { ok: false, error: 'Invalid row' };
  if (!['new', 'contacted', 'closed'].includes(status)) {
    return { ok: false, error: 'Invalid status' };
  }

  try {
    const sheet = getSheet(SHEETS.LEADS);
    sheet.getRange(row, 6).setValue(status); // col 6 = status (1-indexed)
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── REP PRODUCTS — Each rep's curated favorite products ───────────────────

/**
 * GET REP PRODUCTS — Returns rep's curated product list with full product details.
 * Joins RepProducts (selections) with Products (catalog) on product_id.
 *
 * RepProducts sheet structure:
 *   pid | product_id | note | sort | active
 */
function getRepProducts(pid) {
  if (!pid) return { ok: false, error: 'PID required' };
  pid = String(pid).trim();

  try {
    const sheet = getSheet(SHEETS.REP_PRODUCTS);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return { ok: true, products: [] };

    const headers = data[0].map(h => String(h || '').trim().toLowerCase());
    const pidCol     = headers.indexOf('pid');
    const productCol = headers.indexOf('product_id');
    const noteCol    = headers.indexOf('note');
    const sortCol    = headers.indexOf('sort');
    const activeCol  = headers.indexOf('active');

    if (pidCol === -1 || productCol === -1) {
      return { ok: false, error: 'RepProducts sheet missing required columns: pid, product_id' };
    }

    // Build list of rep's selections (id, note, sort)
    const selections = [];
    for (let i = 1; i < data.length; i++) {
      const rowPid = String(data[i][pidCol] || '').trim();
      if (rowPid !== pid) continue;

      // Filter inactive entries (rep "hid" the product)
      const isActive = activeCol === -1 ||
        String(data[i][activeCol]).toUpperCase() === 'TRUE' ||
        data[i][activeCol] === true ||
        String(data[i][activeCol]).trim() === '';
      if (!isActive) continue;

      const productId = String(data[i][productCol] || '').trim();
      if (!productId) continue;

      selections.push({
        row: i + 1, // 1-indexed for later updates
        productId: productId,
        note: noteCol >= 0 ? String(data[i][noteCol] || '') : '',
        sort: sortCol >= 0 ? (Number(data[i][sortCol]) || 999) : 999,
      });
    }

    // Sort by sort column (lower = first)
    selections.sort((a, b) => a.sort - b.sort);

    // Now join with Products sheet
    const productsResult = getProducts();
    if (!productsResult.ok) return productsResult;
    const allProducts = productsResult.products;
    const productById = {};
    allProducts.forEach(p => { productById[String(p.id)] = p; });

    const enriched = selections.map(sel => {
      const product = productById[sel.productId];
      if (!product) return null; // product no longer in catalog or inactive
      return {
        ...product,
        note: sel.note,
        sort: sel.sort,
        row: sel.row,
      };
    }).filter(Boolean);

    return { ok: true, products: enriched };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * ADD REP PRODUCT — Add a product to rep's curated list.
 * If already exists, updates the note instead.
 */
function addRepProduct(params) {
  const pid = String(params.pid || '').trim();
  const productId = String(params.product_id || '').trim();
  const note = String(params.note || '');
  if (!pid) return { ok: false, error: 'PID required' };
  if (!productId) return { ok: false, error: 'Product ID required' };

  try {
    const sheet = getSheet(SHEETS.REP_PRODUCTS);
    const data = sheet.getDataRange().getValues();

    // If sheet is empty, set headers first
    if (data.length === 0) {
      sheet.appendRow(['pid', 'product_id', 'note', 'sort', 'active']);
    }

    // Check if already exists — update instead of duplicate
    if (data.length > 1) {
      const headers = data[0].map(h => String(h || '').trim().toLowerCase());
      const pidCol = headers.indexOf('pid');
      const productCol = headers.indexOf('product_id');
      const noteCol = headers.indexOf('note');
      const activeCol = headers.indexOf('active');

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][pidCol] || '').trim() === pid &&
            String(data[i][productCol] || '').trim() === productId) {
          // Update existing row
          if (noteCol >= 0) sheet.getRange(i + 1, noteCol + 1).setValue(note);
          if (activeCol >= 0) sheet.getRange(i + 1, activeCol + 1).setValue('TRUE');
          return { ok: true, updated: true };
        }
      }
    }

    // Compute next sort value (last + 1)
    const existing = getRepProducts(pid);
    const nextSort = existing.ok && existing.products.length > 0
      ? Math.max(...existing.products.map(p => p.sort)) + 1
      : 1;

    sheet.appendRow([pid, productId, note, nextSort, 'TRUE']);
    return { ok: true, created: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * UPDATE REP PRODUCT — Updates note or sort for an existing entry.
 * Frontend passes the row number returned from getRepProducts.
 */
function updateRepProduct(params) {
  const row = Number(params.row);
  if (!row || row < 2) return { ok: false, error: 'Invalid row' };

  try {
    const sheet = getSheet(SHEETS.REP_PRODUCTS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(h => String(h || '').trim().toLowerCase());

    if (params.note !== undefined) {
      const noteCol = headers.indexOf('note');
      if (noteCol >= 0) sheet.getRange(row, noteCol + 1).setValue(String(params.note));
    }
    if (params.sort !== undefined) {
      const sortCol = headers.indexOf('sort');
      if (sortCol >= 0) sheet.getRange(row, sortCol + 1).setValue(Number(params.sort));
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * REMOVE REP PRODUCT — Soft-delete by setting active=FALSE (preserves history).
 * Frontend passes the row number returned from getRepProducts.
 */
function removeRepProduct(params) {
  const row = Number(params.row);
  if (!row || row < 2) return { ok: false, error: 'Invalid row' };

  try {
    const sheet = getSheet(SHEETS.REP_PRODUCTS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(h => String(h || '').trim().toLowerCase());
    const activeCol = headers.indexOf('active');

    if (activeCol >= 0) {
      // Soft delete — set active=FALSE
      sheet.getRange(row, activeCol + 1).setValue('FALSE');
    } else {
      // Hard delete if no active column
      sheet.deleteRow(row);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function debugSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) { Logger.log('NO ACTIVE SPREADSHEET'); return; }
  Logger.log('Spreadsheet name: ' + ss.getName());
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('Tabs:');
  ss.getSheets().forEach(function(s) {
    Logger.log('  - ' + s.getName() + ' (' + s.getLastRow() + ' rows)');
  });
}

// ─── SSO FUNCTIONS ─────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// OTP LOGIN — SMS-based authentication for self-service rep login
// Flow: rep enters PID → request_otp → SMS sent → rep enters code → verify_otp → session
// ────────────────────────────────────────────────────────────────────────────

// Flow: user enters phone → request_otp → SMS sent → user enters OTP → verify_otp → session
// New user? verifyOtp auto-creates row in REPS sheet.
// ────────────────────────────────────────────────────────────────────────────

function requestOtp(params) {
  const phoneInput = String(params.phone || '').trim();
  
  // Phone format check (9 digits starting with 5 — Georgian mobile)
  if (!/^5\d{8}$/.test(phoneInput)) {
    return { ok: false, error: 'ნომერი არასწორი ფორმატია (599XXXXXX)' };
  }
  
  // Generate OTP, cache keyed by phone (not PID)
  const otp = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  const cache = CacheService.getDocumentCache();
  cache.put('otp_phone_' + phoneInput, otp, 600); // 10-minute expiry
  
  try {
    // SMS format optimized for auto-fill on iOS Safari (autocomplete="one-time-code")
    // and Android Chrome (Web OTP API requires "@hostname #code" suffix on last line)
    const smsBody = 'FARMASI კოდი: ' + otp + '\n\nVerification code: ' + otp + '\n\n@my.farmasi.ge #' + otp;
    sendSms(phoneInput, smsBody);
    const phoneMask = '****' + phoneInput.slice(-4);
    return { ok: true, phoneMask: phoneMask, message: 'OTP sent to ' + phoneInput.slice(-4) };
  } catch (err) {
    return { ok: false, error: 'SMS failed: ' + err.message };
  }
}

function verifyOtp(params) {
  const phoneInput = String(params.phone || '').trim();
  const otp = String(params.otp || '').trim();
  
  if (!phoneInput || !otp) return { ok: false, error: 'Phone and OTP required' };
  if (!/^5\d{8}$/.test(phoneInput)) return { ok: false, error: 'Invalid phone format' };
  
  const cache = CacheService.getDocumentCache();
  const storedOtp = cache.get('otp_phone_' + phoneInput);
  
  if (!storedOtp) {
    return { ok: false, error: 'OTP expired. Request new code.' };
  }
  
  if (String(storedOtp).trim() !== String(otp).trim()) {
    return { ok: false, error: 'Invalid OTP' };
  }
  
  cache.remove('otp_phone_' + phoneInput);
  
  // Find rep by phone in REPS sheet
  const sheet = getSheet(SHEETS.REPS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const phoneCol = headers.indexOf('phone');
  
  let pid = '';
  if (phoneCol >= 0) {
    for (let i = 1; i < data.length; i++) {
      const rowPhone = String(data[i][phoneCol] || '').replace(/\D/g, '').slice(-9);
      if (rowPhone === phoneInput) {
        pid = String(data[i][0]).trim();
        break;
      }
    }
  }
  
  // ✅ Auto-create new rep row if phone not found
  if (!pid) {
    pid = phoneInput; // use phone as row identifier for new reps
    const now = new Date().toISOString();
    const newRow = new Array(headers.length).fill('');
    newRow[0] = pid;
    if (phoneCol >= 0) newRow[phoneCol] = phoneInput;
    
    const createdAtCol = headers.indexOf('created_at');
    const updatedAtCol = headers.indexOf('updated_at');
    const slugCol = headers.indexOf('slug');
    const urlCol = headers.indexOf('URL');
    
    if (createdAtCol >= 0) newRow[createdAtCol] = now;
    if (updatedAtCol >= 0) newRow[updatedAtCol] = now;
    if (slugCol >= 0) {
      try {
        const newSlug = generateUniqueSlug('', sheet, headers, pid);
        newRow[slugCol] = newSlug;
        if (urlCol >= 0 && newSlug) newRow[urlCol] = 'https://my.farmasi.ge/' + newSlug;
      } catch (e) {
        // slug generation failed — leave empty, user can set later
      }
    }
    
    sheet.appendRow(newRow);
  }
  
  const sessionToken = Utilities.getUuid();
  cache.put('otp_session_' + pid, sessionToken, 21600);
  
  const repData = getRep(pid);
  
  return { 
    ok: true, 
    token: sessionToken, 
    pid: pid,
    rep: repData.ok ? repData.rep : null
  };
}

// ────────────────────────────────────────────────────────────────────────────
// SSO LOGIN — HMAC-signed URLs
// ────────────────────────────────────────────────────────────────────────────

function validateHmacSignature(pid, ts, signature) {
  const data = pid + '|' + ts;
  const hmac = Utilities.computeHmacSha256Signature(data, SSO_SECRET);
  const hmacHex = bytesToHex(hmac);
  return hmacHex === signature;
}

function createSsoSession(pid) {
  const sessionToken = Utilities.getUuid();
  const cache = CacheService.getDocumentCache();
  cache.put('sso_session_' + pid, sessionToken, 21600); // 6 hours
  return sessionToken;
}

function ssoLogin(params) {
  const pid = String(params.pid || '').trim();
  const ts = String(params.ts || '').trim();
  const sig = String(params.sig || '').trim();
  
  if (!pid || !ts || !sig) {
    return { ok: false, error: 'Missing SSO parameters' };
  }
  
  // Validate HMAC signature
  if (!validateHmacSignature(pid, ts, sig)) {
    return { ok: false, error: 'Invalid signature' };
  }
  
  // Validate timestamp (not older than 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - parseInt(ts);
  if (timeDiff < 0 || timeDiff > 300) {
    return { ok: false, error: 'Timestamp expired' };
  }
  
  // Get or create rep
  const repData = getRep(pid);
  if (!repData.ok) {
    return { ok: false, error: 'Cannot load rep data' };
  }
  
  // Create session
  const token = createSsoSession(pid);
  
  return { 
    ok: true, 
    token: token, 
    pid: pid,
    rep: repData.rep
  };
}

// ────────────────────────────────────────────────────────────────────────────
// FIRST-TIME PHONE REGISTRATION (no SMS verification on first login)
// ⚠️ SECURITY: PIDs are public, so this allows anyone with an unclaimed PID
//    to register their own phone. Monitor REPS sheet for unexpected entries.
// ────────────────────────────────────────────────────────────────────────────
function registerPhone(params) {
  const pid = String(params.pid || '').trim();
  const phone = String(params.phone || '').trim();
  const name = String(params.name || '').trim(); // ✅ NEW: optional name for first-time registration
  
  if (!pid || !/^\d{6}$/.test(pid)) return { ok: false, error: 'PID არასწორი ფორმატია' };
  if (!/^5\d{8}$/.test(phone)) return { ok: false, error: 'ნომერი არასწორი ფორმატია' };
  
  const sheet = getSheet(SHEETS.REPS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const phoneCol = headers.indexOf('phone');
  const nameCol = headers.indexOf('name');
  if (phoneCol < 0) return { ok: false, error: 'REPS sheet-ში phone სვეტი არ მოიძებნა' };
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === pid) {
      const existingPhone = String(data[i][phoneCol] || '').trim();
      
      // SECURITY: prevent overwriting an existing phone (which would hijack the account)
      if (existingPhone && existingPhone.length >= 9) {
        return { ok: false, error: 'ამ PID-ისთვის ნომერი უკვე რეგისტრირებულია. დაუკავშირდი ადმინს.' };
      }
      
      // Save phone to REPS sheet
      sheet.getRange(i + 1, phoneCol + 1).setValue(phone);
      
      // ✅ NEW: Also save name if provided AND existing name is empty (don't overwrite existing)
      if (name && nameCol >= 0) {
        const existingName = String(data[i][nameCol] || '').trim();
        if (!existingName) {
          sheet.getRange(i + 1, nameCol + 1).setValue(name);
        }
      }
      
      // Create session token (mimics verifyOtp)
      const sessionToken = Utilities.getUuid();
      const cache = CacheService.getDocumentCache();
      cache.put('otp_session_' + pid, sessionToken, 21600);
      
      // Get rep data for return (refreshed from sheet, includes any just-saved fields)
      const repData = getRep(pid);
      
      return {
        ok: true,
        token: sessionToken,
        pid: pid,
        rep: repData.ok ? repData.rep : null
      };
    }
  }
  
  return { ok: false, error: 'PID მონაცემთა ბაზაში ვერ მოიძებნა' };
}

// ════════════════════════════════════════════════════════════════════════════
// SMS GATEWAY — bulksms.ge / POSTA GÜVERCINI integration
// 
// Credentials are stored in Script Properties (Project Settings → Script Properties).
// Required keys:
//   - PUBLIC_KEY   (your bulksms.ge public key)
//   - PRIVATE_KEY  (your bulksms.ge private key)
// ════════════════════════════════════════════════════════════════════════════

function sendSms(phone, message) {
  const SMS_API_URL = 'https://api.bulksms.ge/gateway/api/sms/v1/message/send';
  const SMS_DEFAULT_SENDER = 'FARMASI';
  
  const props = PropertiesService.getScriptProperties();
  const publicKey = props.getProperty('PUBLIC_KEY');
  const privateKey = props.getProperty('PRIVATE_KEY');
  
  if (!publicKey || !privateKey) {
    throw new Error('PUBLIC_KEY / PRIVATE_KEY missing in Script Properties');
  }
  
  // Normalize phone — strip non-digits, ensure 995 country prefix
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('995')) digits = digits.substring(3);
  if (digits.length !== 9) {
    throw new Error('Invalid phone format (expected 9 digits): ' + phone);
  }
  const intlPhone = '995' + digits;
  
  const payload = {
    Text: message,
    Purpose: 'INF',
    Options: {
      Originator: SMS_DEFAULT_SENDER,
      Encoding: 'UNICODE',
      SmsType: 'SMS',
      ReportLabel: 'FARMASI Auth OTP'
    },
    Receivers: [{ Receiver: intlPhone }]
  };
  
  const url = SMS_API_URL + '?publicKey=' + encodeURIComponent(publicKey);
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + privateKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  const code = response.getResponseCode();
  const body = response.getContentText();
  Logger.log('sendSms[' + intlPhone + ']: HTTP ' + code + ' — ' + body);
  
  if (code < 200 || code >= 300) {
    throw new Error('SMS gateway HTTP ' + code + ': ' + body);
  }
  
  return { ok: true, response: body };
}

// Quick test helper — update phone to your own number, then click Run.
function testSms() {
  return sendSms('599XXXXXX', 'ტესტი FARMASI-სგან');
}

// ════════════════════════════════════════════════════════════════════════════
// ORDERS — Shopping cart submissions from public rep pages
// 
// Flow: customer adds products to cart on /slug page → fills name/phone/address
// → submits → order saved to ORDERS sheet → SMS notification sent to rep
// ════════════════════════════════════════════════════════════════════════════

function submitOrder(params) {
  try {
    // Parse and validate input
    const repPid = String(params.rep_pid || '').trim();
    const customerName = String(params.customer_name || '').trim();
    const customerPhone = String(params.customer_phone || '').replace(/\D/g, '').slice(-9);
    const customerAddress = String(params.customer_address || '').trim();
    let items;
    try {
      items = typeof params.items === 'string' ? JSON.parse(params.items) : (params.items || []);
    } catch (e) {
      return { ok: false, error: 'items field is not valid JSON' };
    }
    
    if (!repPid) return { ok: false, error: 'rep_pid required' };
    if (!customerName) return { ok: false, error: 'სახელი გვარი სავალდებულოა' };
    if (!/^5\d{8}$/.test(customerPhone)) return { ok: false, error: 'ტელეფონის ნომერი არასწორი ფორმატია' };
    if (!customerAddress) return { ok: false, error: 'მისამართი სავალდებულოა' };
    if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'კალათა ცარიელია' };
    
    // Validate items structure: [{product_id, name, quantity, price}]
    let total = 0;
    items = items.map(it => {
      const qty = parseInt(it.quantity, 10) || 1;
      const price = parseFloat(it.price) || 0;
      const subtotal = qty * price;
      total += subtotal;
      return {
        product_id: String(it.product_id || ''),
        name: String(it.name || ''),
        quantity: qty,
        price: price,
        subtotal: subtotal
      };
    });
    // Round grand total to 2 decimal places (e.g. 106.92, not 106.9199999)
    total = Math.round(total * 100) / 100;
    
    // Find rep info (name + phone for SMS recipient)
    const repData = getRep(repPid);
    if (!repData.ok) return { ok: false, error: 'წარმომადგენელი ვერ მოიძებნა' };
    const rep = repData.rep;
    const repName = String(rep.name || '').trim() || repPid;
    const repPhone = String(rep.phone || '').replace(/\D/g, '').slice(-9);
    
    // Generate order ID and save to ORDERS sheet
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    const now = new Date().toISOString();
    
    saveOrderToSheet({
      order_id: orderId,
      timestamp: now,
      rep_pid: repPid,
      rep_name: repName,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      items: JSON.stringify(items),
      total: total,
      status: 'new'
    });
    
    // Send SMS to rep (if rep has phone)
    let smsResult = { sent: false, reason: '' };
    if (repPhone && /^5\d{8}$/.test(repPhone)) {
      try {
        const smsText = formatOrderSms({
          orderId: orderId,
          customerName: customerName,
          customerPhone: customerPhone,
          customerAddress: customerAddress,
          items: items,
          total: total
        });
        sendSms(repPhone, smsText);
        smsResult.sent = true;
      } catch (e) {
        Logger.log('Order SMS to rep failed: ' + e.message);
        smsResult.reason = e.message;
      }
    } else {
      smsResult.reason = 'rep has no valid phone';
    }
    
    // Send confirmation SMS to the customer with invoice link
    let customerSmsResult = { sent: false, reason: '' };
    if (/^5\d{8}$/.test(customerPhone)) {
      try {
        const customerSmsText = formatCustomerOrderSms({
          orderId: orderId,
          customerName: customerName,
          repName: repName,
          total: total
        });
        sendSms(customerPhone, customerSmsText);
        customerSmsResult.sent = true;
      } catch (e) {
        Logger.log('Order SMS to customer failed: ' + e.message);
        customerSmsResult.reason = e.message;
      }
    }
    
    return {
      ok: true,
      order_id: orderId,
      total: total,
      sms_sent: smsResult.sent,
      customer_sms_sent: customerSmsResult.sent,
      message: 'შეკვეთა მიღებულია! წარმომადგენელი მალე დაგიკავშირდება.'
    };
  } catch (err) {
    Logger.log('submitOrder error: ' + err.message);
    return { ok: false, error: 'შეცდომა: ' + err.message };
  }
}

// Save order row to ORDERS sheet, creating the sheet with headers if it doesn't exist
function saveOrderToSheet(order) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.ORDERS);
  const SITE_BASE_URL = 'https://my.farmasi.ge';
  
  if (!sheet) {
    // Auto-create with proper headers
    sheet = ss.insertSheet(SHEETS.ORDERS);
    sheet.appendRow([
      'order_id', 'timestamp', 'rep_pid', 'rep_name',
      'customer_name', 'customer_phone', 'customer_address',
      'items', 'total', 'status', 'invoice_url'
    ]);
    // Freeze header row
    sheet.setFrozenRows(1);
    // Bold header
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
  }
  
  sheet.appendRow([
    order.order_id,
    order.timestamp,
    order.rep_pid,
    order.rep_name,
    order.customer_name,
    order.customer_phone,
    order.customer_address,
    order.items,
    order.total,
    order.status,
    SITE_BASE_URL + '/?order=' + order.order_id
  ]);
}

// Format the SMS text sent to the rep when a new order arrives
function formatOrderSms(o) {
  // Short SMS with link to beautiful invoice page (saves SMS segments + cost)
  const SITE_BASE_URL = 'https://my.farmasi.ge';
  return '🛒 ახალი შეკვეთა!\n\n' +
         '👤 ' + o.customerName + '\n' +
         '📱 ' + o.customerPhone + '\n' +
         '💰 ' + o.total + ' GEL\n\n' +
         'სრული შეკვეთა:\n' +
         SITE_BASE_URL + '/?order=' + o.orderId;
}

// Format the SMS text sent to the customer as order confirmation with invoice link
function formatCustomerOrderSms(o) {
  const SITE_BASE_URL = 'https://my.farmasi.ge';
  const repPart = o.repName ? o.repName + ' ' : '';
  return '🌹 FARMASI: შენი შეკვეთა მიღებულია!\n\n' +
         repPart + 'მალე დაგიკავშირდება.\n\n' +
         '💰 ' + o.total + ' GEL\n\n' +
         'შენი ინვოისი:\n' +
         SITE_BASE_URL + '/?order=' + o.orderId;
}

// Fetch a single order by ID — used by the invoice page on frontend
function getOrder(orderId) {
  if (!orderId) return { ok: false, error: 'order_id required' };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.ORDERS);
  if (!sheet) return { ok: false, error: 'შეკვეთა ვერ მოიძებნა' };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('order_id');
  if (idCol < 0) return { ok: false, error: 'ORDERS sheet missing order_id column' };
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(orderId).trim()) {
      const order = {};
      headers.forEach((h, j) => order[h] = data[i][j]);
      // Parse items JSON back to array
      try { order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch (e) { order.items = []; }
      return { ok: true, order: order };
    }
  }
  
  return { ok: false, error: 'შეკვეთა ვერ მოიძებნა: ' + orderId };
}

// Helper to fetch orders for a specific rep (for future Dashboard view)
function getRepOrders(pid) {
  if (!pid) return { ok: false, error: 'pid required' };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.ORDERS);
  if (!sheet) return { ok: true, orders: [] };
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const repPidCol = headers.indexOf('rep_pid');
  
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][repPidCol]).trim() !== String(pid).trim()) continue;
    const order = {};
    headers.forEach((h, j) => order[h] = data[i][j]);
    // Parse items JSON back to array
    try { order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch (e) {}
    orders.push(order);
  }
  
  // Most recent first
  orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return { ok: true, orders: orders };
}

// Quick test helper
function testSubmitOrder() {
  return submitOrder({
    rep_pid: '598185090', // change to a real rep pid in your sheet
    customer_name: 'ნინო ცინცაძე',
    customer_phone: '599772266',
    customer_address: 'თბილისი, ვაკე, ჭავჭავაძის გამზ. 12',
    items: JSON.stringify([
      { product_id: '1000001', name: 'სატესტო პროდუქტი', quantity: 2, price: 25 },
      { product_id: '1000002', name: 'მეორე პროდუქტი', quantity: 1, price: 33 }
    ])
  });
}
