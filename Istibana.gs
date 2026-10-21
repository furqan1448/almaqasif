/**
 * استبانة قياس أثر نظام وحدة المقاصف — جمعية فرقان
 * ملف مستقل تمامًا عن Code.gs الخاص بنظام المقاصف، ويُربط بجدول Google Sheets جديد.
 *
 * خطوات التشغيل:
 *  1) أنشئي جدول Google Sheets جديدًا، ثم: الإضافات ← Apps Script.
 *  2) احذفي المحتوى الموجود والصقي هذا الملف كاملًا، ثم احفظي.
 *  3) اختاري الدالة setup من القائمة العلوية واضغطي «تشغيل» (وامنحي الصلاحيات).
 *  4) في ورقة «المراكز» اكتبي أسماء المراكز في العمود A بدءًا من الصف الثاني.
 *  5) نشر ← نشر جديد ← النوع: تطبيق ويب ← التنفيذ باسم: أنا ← الوصول: أي شخص ← نشر.
 *  6) انسخي رابط تطبيق الويب وضعيه في SCRIPT_URL داخل istibana.html.
 *
 * تعديل أسماء المراكز لاحقًا يتم من ورقة «المراكز» مباشرة دون إعادة نشر.
 */

const SHEET_RESPONSES = 'الردود';
const SHEET_SUMMARY = 'الملخص';
const SHEET_CENTERS = 'المراكز';
const RED = '#8f1d2c';
const ROLES = ['مسؤولة مقصف', 'مديرة مركز'];
const DEVICES = ['الجوال', 'الحاسب', 'كلاهما'];

const FREQ = ['يوميًا', 'أسبوعيًا', 'شهريًا', 'في نهاية الفصل الدراسي'];
const SERVICES = ['سجل البيع اليومي', 'بيان الفواتير', 'إشعارات الاستلام والتسليم', 'المرفقات',
  'قائمة الأسعار', 'الإشعارات الهامة', 'محاضر الاجتماعات', 'بطاقات التحفيز', 'المهام والتعهد'];

// يجب أن تطابق QUESTIONS في istibana.html (المفتاح والنوع والخيارات والشروط)
const QUESTIONS = [
  { key: 'beforeFreq', type: 'radio', req: true, title: 'التسجيل قبل النظام', options: FREQ },
  { key: 'regular', type: 'radio', req: true, title: 'التسجيل أولًا بأول بعد النظام',
    options: ['نعم، بصورة دائمة', 'نعم، في أغلب الأحيان', 'أحيانًا', 'لا، ما زال التسجيل يتأخر'] },
  { key: 'time', type: 'radio', req: true, title: 'الوقت المستغرق في التوثيق والمتابعة',
    options: ['أقل بكثير', 'أقل', 'مماثلًا', 'أكثر', 'أكثر بكثير'] },
  { key: 'easier', type: 'radio', req: true, title: 'هل سهّل النظام أداء المهام؟',
    options: ['نعم، بدرجة كبيرة', 'نعم، إلى حدّ ما', 'لم ألاحظ فرقًا', 'لا، أجد صعوبة في استخدامه'] },
  { key: 'experience', type: 'radio', req: true, title: 'وصف تجربة الاستخدام',
    options: ['سهلة وواضحة', 'جيدة مع وجود بعض الصعوبات', 'أواجه صعوبات في بعض المهام', 'أواجه صعوبات في معظم المهام'] },
  { key: 'clarity', type: 'radio', req: true, title: 'صعوبة بسبب عدم وضوح الخطوات',
    options: ['نعم', 'أحيانًا', 'لا'] },
  { key: 'unclearTasks', type: 'check', req: true, title: 'مهام تحتاج إلى شرح',
    showIf: { key: 'clarity', in: ['نعم', 'أحيانًا'] },
    options: ['تسجيل الدخول'].concat(SERVICES, ['تقييم مسؤولة المقصف', 'أخرى']) },
  { key: 'device', type: 'radio', req: true, title: 'الجهاز المستخدم', options: DEVICES },
  { key: 'tech', type: 'radio', req: true, title: 'المشكلات التقنية',
    options: ['نعم، بصورة متكررة', 'أحيانًا', 'نادرًا', 'لم أواجه مشكلات تقنية'] },
  { key: 'techTypes', type: 'check', req: true, title: 'نوع المشكلات التقنية',
    showIf: { key: 'tech', in: ['نعم، بصورة متكررة', 'أحيانًا', 'نادرًا'] },
    options: ['بطء تحميل الصفحات', 'تعذّر حفظ البيانات', 'تعذّر تسجيل الدخول', 'تعذّر رفع المرفقات',
              'عدم ظهور البيانات بعد حفظها', 'أخرى'] },
  { key: 'video', type: 'radio', req: true, title: 'الاطلاع على المقطع التعريفي',
    options: ['نعم، وكان واضحًا ومفيدًا', 'نعم، ولكنه يحتاج إلى توضيح أكثر', 'لم أطّلع عليه'] },
  { key: 'rating', type: 'rating', req: true, title: 'التقييم العام (من ٥)',
    options: [5, 4, 3, 2, 1], labels: ['ممتاز', 'جيد جدًا', 'جيد', 'مقبول', 'ضعيف'] },
  { key: 'difficulties', type: 'text', req: false, title: 'أبرز الصعوبات' },
  { key: 'suggestions', type: 'text', req: false, title: 'المقترحات وما يُرغب في تحسينه أو إضافته' }
];

const BASE_HEADERS = ['التاريخ والوقت', 'الصفة', 'المركز', 'الفترة', 'الاسم'];

function headers_() { return BASE_HEADERS.concat(QUESTIONS.map(function (q) { return q.title; })); }
function qByKey_(key) { for (let i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].key === key) return QUESTIONS[i]; return null; }
function colOf_(key) {
  for (let i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].key === key) return BASE_HEADERS.length + 1 + i;
  return -1;
}
function colLetter_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/* ===================== الإعداد ===================== */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const h = headers_();

  let sh = ss.getSheetByName(SHEET_RESPONSES);
  if (!sh) sh = ss.insertSheet(SHEET_RESPONSES, 0);
  sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, h.length).setValues([h])
    .setBackground(RED).setFontColor('#ffffff').setFontWeight('bold')
    .setWrap(true).setVerticalAlignment('middle').setHorizontalAlignment('center');
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 60);
  sh.setColumnWidth(1, 140);
  sh.setColumnWidths(2, BASE_HEADERS.length - 1, 120);
  QUESTIONS.forEach(function (q) {
    sh.setColumnWidth(colOf_(q.key), q.type === 'text' || q.type === 'check' ? 240 : (q.type === 'rating' ? 100 : 170));
  });

  let ct = ss.getSheetByName(SHEET_CENTERS);
  if (!ct) {
    ct = ss.insertSheet(SHEET_CENTERS);
    ct.setRightToLeft(true);
    ct.getRange(1, 1).setValue('اسم المركز')
      .setBackground(RED).setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    ct.setFrozenRows(1);
    ct.setColumnWidth(1, 280);
  }

  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ورقة1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  buildSummary_();
}

/* ===================== ورقة الملخص =====================
   معادلات حيّة تتحدث تلقائيًا مع كل رد جديد */
function buildSummary_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sm = ss.getSheetByName(SHEET_SUMMARY);
  if (!sm) sm = ss.insertSheet(SHEET_SUMMARY);
  sm.clear();
  sm.setRightToLeft(true);

  const R = "'" + SHEET_RESPONSES + "'!";
  const rngOf = function (key) { const L = colLetter_(colOf_(key)); return R + L + '2:' + L; };
  const roleRng = R + 'B2:B';
  const totalAll = 'COUNTA(' + R + 'A2:A)';
  const totalRole = function (r) { return 'COUNTIF(' + roleRng + ',"' + r + '")'; };
  const W = 5;
  const blank = function () { return ['', '', '', '', '']; };

  // نسبة من اخترن إحدى القيم (للكل أو لصفة معينة)
  const share = function (key, values, role) {
    const rng = rngOf(key);
    const parts = values.map(function (v) {
      return role ? 'COUNTIFS(' + rng + ',"' + v + '",' + roleRng + ',"' + role + '")' : 'COUNTIF(' + rng + ',"' + v + '")';
    });
    return '=IFERROR((' + parts.join('+') + ')/' + (role ? totalRole(role) : totalAll) + ',"")';
  };
  const avgRating = function (role) {
    const rng = rngOf('rating');
    return role ? '=IFERROR(ROUND(AVERAGEIF(' + roleRng + ',"' + role + '",' + rng + '),2),"")'
                : '=IFERROR(ROUND(AVERAGE(' + rng + '),2),"")';
  };

  const rows = [];
  const heads = [];
  const pctRanges = [];   // [صف، عمود، عدد الصفوف، عدد الأعمدة]
  const centerRanges = [];

  rows.push(['ملخص نتائج استبانة قياس أثر نظام وحدة المقاصف', '', '', '', '']);
  rows.push(['إجمالي الردود', '=' + totalAll, '', '', '']);
  rows.push(['ردود مسؤولات المقاصف', '=' + totalRole(ROLES[0]), '', '', '']);
  rows.push(['ردود مديرات المراكز', '=' + totalRole(ROLES[1]), '', '', '']);

  // ===== المؤشرات الرئيسة =====
  rows.push(blank());
  heads.push(rows.length + 1);
  rows.push(['المؤشرات الرئيسة', 'الكل', 'المسؤولات', 'المديرات', '']);
  const kStart = rows.length + 1;
  rows.push(['متوسط التقييم العام للنظام (من ٥)', avgRating(), avgRating(ROLES[0]), avgRating(ROLES[1]), '']);
  const KPIS = [
    ['تسجيل البيانات يوميًا أو أسبوعيًا — قبل النظام', 'beforeFreq', ['يوميًا', 'أسبوعيًا']],
    ['تأجيل التسجيل إلى نهاية الفصل — قبل النظام', 'beforeFreq', ['في نهاية الفصل الدراسي']],
    ['التسجيل أولًا بأول — بعد النظام (دائمًا أو غالبًا)', 'regular', ['نعم، بصورة دائمة', 'نعم، في أغلب الأحيان']],
    ['انخفاض الوقت المستغرق في التوثيق والمتابعة', 'time', ['أقل بكثير', 'أقل']],
    ['النظام سهّل أداء المهام', 'easier', ['نعم، بدرجة كبيرة', 'نعم، إلى حدّ ما']],
    ['تجربة استخدام سهلة أو جيدة', 'experience', ['سهلة وواضحة', 'جيدة مع وجود بعض الصعوبات']],
    ['صعوبة بسبب عدم وضوح الخطوات (نعم أو أحيانًا)', 'clarity', ['نعم', 'أحيانًا']],
    ['مشكلات تقنية متكررة أو أحيانًا', 'tech', ['نعم، بصورة متكررة', 'أحيانًا']],
    ['الاطلاع على المقطع التعريفي', 'video', ['نعم، وكان واضحًا ومفيدًا', 'نعم، ولكنه يحتاج إلى توضيح أكثر']]
  ];
  KPIS.forEach(function (k) {
    rows.push([k[0], share(k[1], k[2]), share(k[1], k[2], ROLES[0]), share(k[1], k[2], ROLES[1]), '']);
  });
  pctRanges.push([kStart + 1, 2, KPIS.length, 3]);
  centerRanges.push([kStart, 2, KPIS.length + 1, 3]);

  // ===== توزيع إجابات الأسئلة =====
  QUESTIONS.forEach(function (q) {
    if (q.type === 'text' || q.key === 'device') return;
    const rng = rngOf(q.key);
    rows.push(blank());
    heads.push(rows.length + 1);
    rows.push([q.title + (q.showIf ? ' (سؤال متفرع)' : ''), 'العدد', 'النسبة من الردود', 'المسؤولات', 'المديرات']);
    const start = rows.length + 1;
    q.options.forEach(function (o, i) {
      const crit = q.type === 'check' ? '"*' + o + '*"' : (q.type === 'rating' ? o : '"' + o + '"');
      const label = q.type === 'rating' ? o + ' — ' + q.labels[i] : o;
      rows.push([
        label,
        '=COUNTIF(' + rng + ',' + crit + ')',
        '=IFERROR(COUNTIF(' + rng + ',' + crit + ')/' + totalAll + ',"")',
        '=COUNTIFS(' + rng + ',' + crit + ',' + roleRng + ',"' + ROLES[0] + '")',
        '=COUNTIFS(' + rng + ',' + crit + ',' + roleRng + ',"' + ROLES[1] + '")'
      ]);
    });
    pctRanges.push([start, 3, q.options.length, 1]);
    centerRanges.push([start, 2, q.options.length, 4]);
  });

  sm.getRange(1, 1, rows.length, W).setValues(rows);

  // ===== جداول جانبية: المشاركة حسب المركز وحسب الجهاز =====
  sm.getRange(6, 7, 1, 2).setValues([['المركز', 'عدد الردود']]);
  sm.getRange(7, 7).setFormula('=IFERROR(QUERY(' + R + 'C2:C,"select C, count(C) where C <> \'\' group by C order by count(C) desc label count(C) \'\'",0),"")');
  sm.getRange(6, 10, 1, 2).setValues([['الجهاز المستخدم', 'عدد الردود']]);
  sm.getRange(7, 10, DEVICES.length, 2).setValues(DEVICES.map(function (d) {
    return [d, '=COUNTIF(' + rngOf('device') + ',"' + d + '")'];
  }));
  [[6, 7], [6, 10]].forEach(function (p) {
    sm.getRange(p[0], p[1], 1, 2).setBackground(RED).setFontColor('#fff').setFontWeight('bold').setHorizontalAlignment('center');
  });
  sm.getRange(7, 8, 200, 1).setHorizontalAlignment('center');
  sm.getRange(7, 11, DEVICES.length, 1).setHorizontalAlignment('center');
  sm.setColumnWidth(6, 30);
  sm.setColumnWidth(7, 220);
  sm.setColumnWidth(8, 100);
  sm.setColumnWidth(9, 30);
  sm.setColumnWidth(10, 150);
  sm.setColumnWidth(11, 100);

  // ===== التنسيق =====
  sm.getRange(1, 1, 1, W).merge().setBackground(RED).setFontColor('#fff').setFontWeight('bold')
    .setFontSize(14).setHorizontalAlignment('center');
  sm.setRowHeight(1, 40);
  sm.getRange(2, 1, 3, 1).setFontWeight('bold');
  sm.getRange(2, 2, 3, 1).setHorizontalAlignment('center').setFontWeight('bold').setFontColor(RED);
  heads.forEach(function (r) {
    sm.getRange(r, 1, 1, W).setBackground(RED).setFontColor('#fff').setFontWeight('bold').setVerticalAlignment('middle');
    sm.getRange(r, 2, 1, W - 1).setHorizontalAlignment('center');
  });
  centerRanges.forEach(function (p) {
    sm.getRange(p[0], p[1], p[2], p[3]).setHorizontalAlignment('center');
    for (let i = 0; i < p[2]; i += 2) sm.getRange(p[0] + i, 1, 1, W).setBackground('#fbf6f7');
  });
  pctRanges.forEach(function (p) { sm.getRange(p[0], p[1], p[2], p[3]).setNumberFormat('0%'); });
  sm.getRange(kStart, 1, KPIS.length + 1, W).setFontWeight('bold');
  sm.setColumnWidth(1, 340);
  sm.setColumnWidths(2, 4, 105);
}

/* ===================== قراءة المراكز ===================== */
function getCenters_() {
  const ct = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CENTERS);
  if (!ct || ct.getLastRow() < 2) return [];
  const seen = {};
  return ct.getRange(2, 1, ct.getLastRow() - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (c) { if (!c || seen[c]) return false; seen[c] = true; return true; });
}

/* ===================== استقبال الردود ===================== */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const clean = function (v, max) { return String(v == null ? '' : v).trim().slice(0, max || 300); };

    const role = clean(d.role, 50), center = clean(d.center, 120);
    if (ROLES.indexOf(role) < 0) return json_({ ok: false, error: 'role' });
    if (!center) return json_({ ok: false, error: 'center' });
    if (!clean(d.name, 100)) return json_({ ok: false, error: 'name' });
    const a = d.answers || {};

    const vals = [];
    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i];
      // السؤال المتفرع لا يُطلب إلا إذا تحقق شرطه
      const active = !q.showIf || q.showIf.in.indexOf(clean(a[q.showIf.key], 80)) >= 0;
      if (!active) { vals.push(''); continue; }
      if (q.type === 'text') { vals.push(clean(a[q.key], 3000)); continue; }
      if (q.type === 'check') {
        const arr = (Array.isArray(a[q.key]) ? a[q.key] : []).map(function (x) { return clean(x, 80); })
          .filter(function (x) { return q.options.indexOf(x) >= 0; });
        if (q.req && !arr.length) return json_({ ok: false, error: q.key });
        vals.push(arr.join('، '));
        continue;
      }
      if (q.type === 'rating') {
        const n = Number(a[q.key]);
        if (q.req && q.options.indexOf(n) < 0) return json_({ ok: false, error: q.key });
        vals.push(n);
        continue;
      }
      const v = clean(a[q.key], 80);
      if (q.req && q.options.indexOf(v) < 0) return json_({ ok: false, error: q.key });
      vals.push(v);
    }

    const row = [
      Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd HH:mm'),
      role, center, clean(d.period, 30), clean(d.name, 100)
    ].concat(vals);

    let sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESPONSES);
    if (!sh) { setup(); sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESPONSES); }
    // النصوص تُحفظ نصًّا كما هي، والتقييم رقمًا ليُحسب متوسطه
    const ratingIdx = colOf_('rating') - 1;
    sh.getRange(sh.getLastRow() + 1, 1, 1, row.length)
      .setNumberFormats([row.map(function (_, i) { return i === ratingIdx ? '0' : '@'; })])
      .setValues([row]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'centers') return json_({ ok: true, centers: getCenters_() });
  return json_({ ok: true, service: 'istibana-maqasif' });
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
