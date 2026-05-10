/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  seed-labels.gs — ერთჯერადი Labels sheet seed-ი
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  რას აკეთებს:
 *    Labels sheet-ში ავსებს ფეიფ ფეიჯის 98 ტექსტური ელემენტის defaults-ს.
 *    ცელ-ცელად შემდეგ შეგიძლია გადააწერო, თუ რომელიმე გინდა შეცვალო.
 *
 *  ნაბიჯები:
 *    1. Spreadsheet-ში დაამატე ახალი sheet სახელით `Labels`
 *    2. პირველი რიგი: სვეტი A = `key`, სვეტი B = `value`
 *    3. Apps Script რედაქტორი → "+" → Script → დაარქვი `seed-labels`
 *    4. Paste ეს მთლიანი ფაილის შინაარსი
 *    5. Save (Ctrl/Cmd + S)
 *    6. Drop-down → `seedLabelContent` → Run
 *    7. Permission-ი მოგთხოვს — ნება დართე
 *    8. Execution log-ში ნახავ — 98 label ჩაიწერა
 *
 *  ერთჯერადია — გაშვების შემდეგ ფაილი წაშალე ან გადაარქვი (რომ შემთხვევით
 *  ხელახლა არ გაუშვა — გადააწერდა შენს მანუალურ ცვლილებებს).
 * ═══════════════════════════════════════════════════════════════════════════
 */

function seedLabelContent() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName('Labels');

  // Create sheet automatically if missing
  if (!sheet) {
    sheet = ss.insertSheet('Labels');
    sheet.getRange(1, 1).setValue('key');
    sheet.getRange(1, 2).setValue('value');
    sheet.setColumnWidth(1, 280);
    sheet.setColumnWidth(2, 600);
    sheet.setFrozenRows(1);
  }

  // ─── DEFAULTS — 98 keys ────────────────────────────────────────────────────
  const labels = {
    // Hero
    hero_topbar_full: 'FARMASI · OFFICIAL CONSULTANT',
    hero_topbar_short: 'FARMASI',
    hero_edition_prefix: '№ 01',
    hero_rep_role: 'ფარმასის წარმომადგენელი',
    hero_name_placeholder: 'შენი სახელი',
    hero_tagline: 'ნამდვილი ქალისთვის',
    hero_verified: 'ვერიფიცირებული',
    hero_cta_primary: 'გავიგოთ რა გჭირდება',
    hero_cta_whatsapp: 'WhatsApp',
    hero_social_phone: 'დარეკე',
    hero_edition_badge: '✦ Edition №01',
    hero_video_label: 'ვიდეო',
    hero_scroll_hint: 'გადახედე',

    // Manifesto (Act I)
    manifesto_chapter: 'ფილოსოფია',
    manifesto_headline_1: 'შენი ნამდვილი თავი',
    manifesto_headline_2: 'არ წაშლილა.',
    manifesto_sub_1: 'ის უბრალოდ ცოტა',
    manifesto_sub_2: 'ყურადღებას ელოდება.',

    // Act II — Quiz
    act2_chapter: 'დიაგნოსტიკა',
    act2_eyebrow: '✦ შენთვის შერჩეული',
    act2_headline_left: 'რა',
    act2_headline_right: 'გაწუხებს?',
    act2_single_choice: 'ერთი არჩევანი',
    act2_subtitle: 'გაჩვენებ რიტუალს, რომელმაც სხვებს დაეხმარა',

    // Act III — Empathy bridge
    act3_chapter: 'თანაგრძნობა',
    act3_eyebrow_default: 'შენ აირჩიე',
    act3_headline_default: 'ვიცი ეს ტკივილი.',
    rep_card_says_suffix: 'ამბობს',
    rep_note_default: 'ბევრს დავეხმარე ამ გზის გავლაში — შენც გვერდში გაგიდექი.',
    act3_scroll_prompt_with_videos: 'ნახე ვინ გაიარა ეს გზა',
    act3_scroll_prompt_no_videos: 'ნახე რამ უშველათ',

    // Act IV — Science
    act4_chapter: 'გაცნობიერება',
    act4_eyebrow: '✦ რა ხდება სინამდვილეში',
    act4_headline_left: 'ცოდნა',
    act4_headline_right: 'იმპულსი',
    act4_subtitle: 'სანამ კოსმეტიკას ცდი — გასაგები რატომ.',

    // Act V — Tips (Do / Avoid)
    act5_chapter: 'რჩევა',
    act5_eyebrow: '✦ უფასო — დღესვე შესასრულებელი',
    act5_headline_left: 'ცადე ეს —',
    act5_headline_right: 'დღესვე',
    act5_subtitle: 'ფასი არ აქვს. პროდუქტი არ ჭირდება. ერთი კვირა სცადე და ნახე.',
    act5_do_eyebrow: 'გააკეთე',
    act5_do_title: 'ეს გააკეთე',
    act5_avoid_eyebrow: 'მოერიდე',
    act5_avoid_title: 'ამას მოერიდე',

    // Act VI — Doctor (honesty)
    act6_chapter: 'გულახდილობა',
    act6_eyebrow: '✦ მე გულახდილი ვარ',
    act6_headline_left: 'ზოგ შემთხვევაში —',
    act6_headline_right: 'ექიმთან',
    act6_quote_prefix: '-ის სიტყვა: ',
    act6_quote: 'ჩემი პროდუქტი ცილოვანი დახმარებაა, არა მედიცინა. თუ ქვემოთ ჩამოთვლილი რომელიმე ემთხვევა — ფასიც კი არ ღირს კოსმეტიკის ცდა, სანამ ექიმი არ მოიკითხავს.',
    act6_closing: 'ჯერ მიზეზი დავადგინოთ — მერე გავაკეთოთ რიტუალი.',

    // Act VII — Stories
    act7_chapter: 'ისტორიები',
    act7_eyebrow: '✦ მათ გაიარეს იგივე',
    act7_headline_left: 'ნამდვილი',
    act7_headline_right: 'ისტორიები',
    act7_subtitle_suffix: 'მათივე სიტყვებით',
    act7_scroll_prompt: 'ნახე რა გამოიყენეს',

    // Act VIII — Products
    act8_eyebrow: '✦ შენი რიტუალი',
    act8_headline_prefix: 'შერჩეული',
    act8_headline_suffix: '-სთვის',
    act8_subtitle_single: 'ერთი პროდუქტი — ერთი მიზანი',
    act8_subtitle_multi_suffix: 'პროდუქტი — ერთი რიტუალი',
    act8_bundle_lead: 'ან გაიგე მეტი',
    act8_bundle_cta: 'მაცნობე მეტი',
    act8_bundle_note: 'გავუგზავნი ინდივიდუალურ რეცეპტს შენი ვითარებიდან გამომდინარე',

    // No problem selected (empty state)
    no_problem_title: 'აირჩიე პრობლემა',
    no_problem_subtitle: 'ზემოთ მონიშნე რა გაწუხებს — გამოგიჩვენებ კონკრეტულ პროდუქტებს, შედეგებსა და ვიდეო-რეცენზიებს, რომლებიც სწორედ შენი პრობლემისთვისაა.',

    // Footer
    footer_topbar_full: 'END · CONTACT',
    footer_topbar_short: 'CONTACT',
    footer_edition: '№ 01',
    footer_brand: 'FARMASI · TANTALIZE COSMETICS',
    footer_contact_lead: 'დაგვიკავშირდი',
    footer_whatsapp_btn: 'WhatsApp',
    footer_call_btn: 'დარეკე',
    footer_copyright_holder: 'FARMASI GEORGIA',
    footer_id_prefix: 'ID #',
    footer_back_to_top: 'ზემოთ დაბრუნება',

    // Floating buttons
    chat_button_tooltip: 'მესიჯი',
    floating_whatsapp_label: 'WhatsApp',

    // Product Detail Modal
    modal_back: 'უკან',
    product_description_eyebrow: '✦ აღწერილობა',
    product_order_cta: 'შეუკვეთე ან გაიგე მეტი',
    whatsapp_problem_msg_prefix: 'გამარჯობა! მაინტერესებს რჩევა',
    whatsapp_problem_msg_suffix: '-სთვის.',
    whatsapp_product_msg_prefix: 'გამარჯობა! მაინტერესებს',

    // ChatModal
    chat_product_intro_prefix: 'გამარჯობა, "',
    chat_product_intro_suffix: '"-ს შესახებ მაინტერესებს...',
    chat_toast_empty: '⚠️ ჯერ ჩაწერე მესიჯი',
    chat_toast_copied: '✓ მესიჯი დაკოპირდა — ჩატში დააჭირე Ctrl+V (ან long-press → Paste)',
    chat_toast_copy_failed: '⚠️ ხელით დააკოპირე ტექსტი და ჩასვი ჩატში',
    chat_header_eyebrow: 'მომწერე',
    chat_msg_placeholder: 'გამარჯობა! მაინტერესებს...',
    chat_send_via_suffix: '-ზე გაგზავნა',
    chat_autofill_hint: '✨ პირდაპირ ჩავარდება',
    chat_other_channels: 'ან აირჩიე სხვა არხი',
    chat_copy_hint: '↑ ტექსტი ავტომატურად დაკოპირდება — ჩასვი ჩატში',
    chat_phone_lead: 'ან დარეკე:',
  };

  // ─── EXECUTION ─────────────────────────────────────────────────────────────
  // Read existing rows to skip already-filled keys (don't overwrite user edits)
  const existingData = sheet.getDataRange().getValues();
  const existingKeys = new Set();
  for (let i = 1; i < existingData.length; i++) {
    const k = String(existingData[i][0] || '').trim();
    if (k) existingKeys.add(k);
  }

  // Build rows to append
  const rowsToAppend = [];
  let skipped = 0;
  for (const [key, value] of Object.entries(labels)) {
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    rowsToAppend.push([key, value]);
  }

  if (rowsToAppend.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rowsToAppend.length, 2).setValues(rowsToAppend);
  }

  const result = `✅ Done. Added ${rowsToAppend.length} labels. Skipped ${skipped} (already present).`;
  Logger.log(result);
  return result;
}
