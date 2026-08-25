/**
 * نظام وحدة المقاصف - جمعية فرقان لتحفيظ القرآن الكريم
 * الكود الخلفي (Google Apps Script)
 *
 * طريقة التركيب:
 * 1) افتحي Google Sheet جديد فاضي (أو استخدمي شيتك الحالي).
 * 2) من القائمة: Extensions > Apps Script
 * 3) احذفي أي كود موجود، والصقي هذا الكود كامل.
 * 4) عدّلي القيمة ADMIN_NOTIFY_EMAIL أدناه ببريدك الإلكتروني.
 * 5) شغلي دالة setup() مرة وحدة من القائمة أعلى المحرر (لإنشاء الشيتات والأعمدة الناقصة تلقائياً).
 * 6) Deploy > Manage deployments > ✏️ تعديل > New version > Deploy
 *    (أو New deployment لو أول مرة، وبعدها حطي الرابط بملف config.js)
 */

const FOLDER_NAME = 'مرفقات نظام المقاصف';

// ⚠️ حطي بريدك الإلكتروني هنا عشان تستلمي إشعار كل ما مركز يرسل إشعار استلام أو تسليم
const ADMIN_NOTIFY_EMAIL = 'maram1998m3@gmail.com';

// الأعمدة اللي المفروض دايماً تُحفظ وتُقرأ كنص خام (وليست تاريخ/وقت تلقائي من قوقل شيتس)
// عشان نتفادى مشكلة "الأصفار الزايدة" (مثل 1899-12-30 أو 00:00:00.000Z) اللي تصير
// لما قوقل شيتس يحوّل نص التاريخ/الوقت تلقائياً إلى كائن Date داخلي.
const TEXT_COLUMNS_ = ['اليوم', 'التاريخ', 'الوقت', 'تاريخ الإرسال', 'يوم الإرسال', 'وقت الإرسال',
  'يوم اطلاع الإدارة', 'تاريخ اطلاع الإدارة', 'وقت اطلاع الإدارة', 'تاريخ توقيع الإدارة',
  'رقم الفاتورة', 'العام'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheets = {
    'المسؤولات': ['الاسم', 'البريد الإلكتروني', 'كلمة المرور', 'اسم المركز'],
    'الحضور': ['الاسم', 'اليوم', 'التاريخ', 'الوقت'],
    'التعهد': ['الاسم', 'نص التعهد', 'اليوم', 'التاريخ', 'الوقت', 'الحالة'],
    'المراكز': ['اسم المركز', 'كلمة المرور'],
    'المبيعات': ['معرف', 'اسم المركز', 'اليوم', 'التاريخ', 'الوقت', 'المبلغ'],
    'المرتجعات': ['معرف', 'اسم المركز', 'اليوم', 'التاريخ', 'وصف الصنف', 'الكمية', 'القيمة'],
    'الفواتير': ['معرف', 'اسم المركز', 'رقم الفاتورة', 'اليوم', 'التاريخ', 'المبلغ الإجمالي', 'الربح'],
    'الإشعارات': ['معرف', 'النوع', 'اسم المركز', 'يوم الإرسال', 'تاريخ الإرسال', 'وقت الإرسال',
      'اسم المسلّمة', 'المبلغ', 'الشهر', 'الفصل الدراسي', 'العام',
      'رابط توقيع المركز', 'رابط صورة الإشعار', 'الحالة',
      'رابط توقيع الإدارة', 'رابط صورة الإشعار الموقع',
      'يوم اطلاع الإدارة', 'تاريخ اطلاع الإدارة', 'وقت اطلاع الإدارة',
      'اسم المستلمة', 'بيانات توقيع المركز']
  };

  Object.keys(sheets).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(sheets[name]);
      sh.getRange(1, 1, 1, sheets[name].length).setFontWeight('bold');
      sh.setRightToLeft(true);
    } else {
      // إذا كان الشيت موجود من قبل بأعمدة أقل (تحديث نظام قديم)، نضيف الأعمدة الناقصة بآخر الصف
      const existingHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      sheets[name].forEach(function (col) {
        if (existingHeaders.indexOf(col) === -1) {
          sh.getRange(1, sh.getLastColumn() + 1).setValue(col).setFontWeight('bold');
        }
      });
    }

    // نجبر أعمدة التاريخ/الوقت على تنسيق "نص عادي" حتى لا يحوّلها قوقل شيتس
    // تلقائياً إلى كائن Date (وهذا هو مصدر "الأصفار الزايدة")
    const headersNow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    headersNow.forEach(function (h, idx) {
      if (TEXT_COLUMNS_.indexOf(h) !== -1) {
        sh.getRange(2, idx + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
      }
    });
  });

  // شيت مثال - عدليه بأسماء المراكز الحقيقية وكلمات المرور
  const centersSheet = ss.getSheetByName('المراكز');
  if (centersSheet.getLastRow() === 1) {
    centersSheet.appendRow(['مركز تحفيظ 1', '1234']);
    centersSheet.appendRow(['مركز تحفيظ 2', '5678']);
  }

  SpreadsheetApp.getUi().alert('تم إنشاء/تحديث جميع الشيتات بنجاح. تأكدي من تعبئة عمود "اسم المركز" بشيت "المسؤولات" لكل مسؤولة، وتحطي بريدك في ADMIN_NOTIFY_EMAIL أعلى الكود.\n\nملاحظة: لو كان عندك شيت قديم وفيه بيانات، شغّلي أيضاً دالة fixOldDateColumns من قائمة الدوال فوق المحرر مرة وحدة عشان تصلح صيغة الأعمدة القديمة.');
}

/* تشغّل مرة وحدة (اختياري) لو عندك شيتات قديمة فيها بيانات تاريخ/وقت محفوظة
   كـ Date تلقائي من قوقل شيتس، عشان تحوّلها لنص واضح بدون أصفار زايدة. */
function fixOldDateColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ['المبيعات', 'المرتجعات', 'الفواتير', 'الحضور', 'التعهد', 'الإشعارات'].forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const lastCol = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    const range = sh.getRange(2, 1, sh.getLastRow() - 1, lastCol);
    const values = range.getValues();
    headers.forEach(function (h, idx) {
      if (TEXT_COLUMNS_.indexOf(h) === -1) return;
      const isTimeCol = (h === 'الوقت' || h === 'وقت الإرسال' || h === 'وقت اطلاع الإدارة');
      for (let i = 0; i < values.length; i++) {
        const v = values[i][idx];
        if (v instanceof Date) {
          values[i][idx] = isTimeCol
            ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm')
            : Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
      }
    });
    sh.getRange(1, 1, 1, lastCol).setNumberFormat('@'); // احتياط
    range.setNumberFormat('@');
    range.setValues(values);
  });
  invalidateCache_('المبيعات'); invalidateCache_('المرتجعات'); invalidateCache_('الفواتير');
  invalidateCache_('الحضور'); invalidateCache_('التعهد'); invalidateCache_('الإشعارات');
  SpreadsheetApp.getUi().alert('تم تحويل أعمدة التاريخ والوقت القديمة إلى نص واضح بدون أصفار زايدة.');
}

/* أسماء أيام الأسبوع بالعربي - الأحد أول الأسبوع */
const AR_DAYS_ = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function dayName_(d) {
  return AR_DAYS_[d.getDay()];
}

/* ترجع اليوم/التاريخ/الوقت الحالي كنص واضح بدون أي أصفار زايدة */
function nowParts_() {
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  return {
    day: dayName_(now),
    date: Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
    time: Utilities.formatDate(now, tz, 'HH:mm')
  };
}

/* ترجع اسم اليوم بالعربي لتاريخ نصي بصيغة yyyy-MM-dd (تُستخدم لو المستخدمة
   عدّلت التاريخ يدوياً في الواجهة عشان يبقى اسم اليوم مطابق للتاريخ المختار) */
function dayNameForDateStr_(dateStr) {
  if (!dateStr) return dayName_(new Date());
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dayName_(new Date());
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dayName_(d);
}

function getOrCreateFolder_() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

function saveImage_(base64Data, fileName) {
  if (!base64Data) return '';
  const cleaned = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const bytes = Utilities.base64Decode(cleaned);
  const blob = Utilities.newBlob(bytes, 'image/png', fileName + '.png');
  const folder = getOrCreateFolder_();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function sheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/* ------------------- تخزين مؤقت (Cache) لتسريع القراءة ------------------- */
const CACHE_SECONDS = 90;           // شيتات متغيّرة (مبيعات، إشعارات، فواتير، مرتجعات، حضور...)
const CACHE_SECONDS_LONG = 300;     // شيتات شبه ثابتة (المراكز، المسؤولات) - 5 دقائق فقط (كانت 6 ساعات)

function getCache_() {
  return CacheService.getScriptCache();
}

function invalidateCache_(name) {
  try { getCache_().remove('sheet_' + name); } catch (e) {}
}

/* شغّليها يدوياً من قائمة الدوال أعلى المحرر (▶️ Run) في أي وقت بعد ما تعدّلي
   شيت "المسؤولات" أو "المراكز" يدوياً، عشان التغييرات تنعكس بالموقع فوراً
   بدون ما تنتظري وقت الكاش. */
function clearCache() {
  const cache = getCache_();
  ['المسؤولات', 'المراكز', 'المبيعات', 'المرتجعات', 'الفواتير', 'الحضور', 'التعهد', 'الإشعارات'].forEach(function (n) {
    cache.remove('sheet_' + n);
  });
  SpreadsheetApp.getUi().alert('تم تفريغ الذاكرة المؤقتة. جربي الدخول بالموقع الحين.');
}

/* تنسيق التواريخ عند القراءة: قوقل شيتس يحوّل نصوص التاريخ تلقائياً لكائن Date،
   وإذا رجعناه للواجهة كما هو يظهر بصيغة فيها أصفار زايدة (مثل 00:00:00.000Z).
   هذي الدالة تصيغه نص واضح: تاريخ فقط، أو تاريخ ووقت لو فيه وقت فعلي. */
function formatSheetDate_(d) {
  const tz = Session.getScriptTimeZone();
  // قيمة وقت فقط (بدون تاريخ حقيقي) يخزّنها قوقل شيتس داخلياً بتاريخ 30 ديسمبر 1899
  const isTimeOnly = d.getFullYear() === 1899 && d.getMonth() === 11 && d.getDate() === 30;
  if (isTimeOnly) return Utilities.formatDate(d, tz, 'HH:mm');
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  return Utilities.formatDate(d, tz, hasTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
}

function sheetToObjects_(name, cacheSeconds) {
  const duration = cacheSeconds || CACHE_SECONDS;
  const cache = getCache_();
  const cacheKey = 'sheet_' + name;

  try {
    const cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    // تجاهل أي خطأ بالكاش وأكملي القراءة العادية من الشيت
  }

  const sh = sheet_(name);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach(function (h, idx) {
      let val = data[i][idx];
      if (val instanceof Date) val = formatSheetDate_(val);
      obj[h] = val;
    });
    obj._row = i + 1;
    rows.push(obj);
  }

  try {
    cache.put(cacheKey, JSON.stringify(rows), duration);
  } catch (e) {
    // إذا كانت البيانات كبيرة جداً على الكاش نتجاهل الخطأ ونكمل بدون تخزين مؤقت
  }

  return rows;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return handleRequest_(e.parameter);
}

function doPost(e) {
  let params = {};
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    params = e.parameter;
  }
  return handleRequest_(params);
}

function handleRequest_(p) {
  try {
    const action = p.action;
    switch (action) {
      case 'getCenters': return json_(getCenters_());
      case 'loginCenter': return json_(loginCenter_(p));
      case 'loginMasoula': return json_(loginMasoula_(p));
      case 'getMasoulat': return json_(getMasoulat_());

      case 'recordSale': return json_(recordSale_(p));
      case 'getSales': return json_(getSales_(p));
      case 'updateSale': return json_(updateSale_(p));
      case 'deleteSale': return json_(deleteSale_(p));

      case 'recordReturn': return json_(recordReturn_(p));
      case 'getReturns': return json_(getReturns_(p));
      case 'updateReturn': return json_(updateReturn_(p));
      case 'deleteReturn': return json_(deleteReturn_(p));

      case 'recordInvoice': return json_(recordInvoice_(p));
      case 'getInvoices': return json_(getInvoices_(p));
      case 'updateInvoice': return json_(updateInvoice_(p));
      case 'deleteInvoice': return json_(deleteInvoice_(p));

      case 'getAttendance': return json_(getAttendance_(p));
      case 'recordAttendance': return json_(recordAttendance_(p));
      case 'recordAttendanceBulk': return json_(recordAttendanceBulk_(p));
      case 'getAttendanceForDate': return json_(getAttendanceForDate_(p));

      case 'getPledge': return json_(getPledge_(p));
      case 'signPledge': return json_(signPledge_(p));

      case 'submitNotice': return json_(submitNotice_(p));
      case 'getCenterNotices': return json_(getCenterNotices_(p));
      case 'getPendingNotices': return json_(getPendingNotices_());
      case 'getAllNotices': return json_(getAllNotices_());
      case 'adminSignNotice': return json_(adminSignNotice_(p));

      case 'getStats': return json_(getStats_());

      default: return json_({ ok: false, error: 'إجراء غير معروف' });
    }
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

/* ------------------- المراكز والمسؤولات: تسجيل الدخول ------------------- */

function getCenters_() {
  const rows = sheetToObjects_('المراكز', CACHE_SECONDS_LONG);
  return { ok: true, centers: rows.map(function (r) { return r['اسم المركز']; }) };
}

function loginCenter_(p) {
  const rows = sheetToObjects_('المراكز', CACHE_SECONDS_LONG);
  const found = rows.find(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim() &&
      String(r['كلمة المرور']).trim() === String(p.password).trim();
  });
  if (!found) return { ok: false, error: 'اسم المركز أو كلمة المرور غير صحيحة' };
  return { ok: true, center: found['اسم المركز'] };
}

function loginMasoula_(p) {
  const rows = sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG);
  const username = String(p.username || '').trim();
  const password = String(p.password || '').trim();

  const nameMatch = rows.find(function (r) {
    return String(r['الاسم']).trim() === username ||
      String(r['البريد الإلكتروني']).trim().toLowerCase() === username.toLowerCase();
  });

  if (!nameMatch) {
    return { ok: false, error: 'ما لقينا اسم "' + username + '" بشيت المسؤولات. تأكدي إنه مكتوب بالضبط نفس الشيت (بدون مسافات زايدة).' };
  }
  if (String(nameMatch['كلمة المرور']).trim() !== password) {
    return { ok: false, error: 'الاسم صحيح، بس كلمة المرور مو مطابقة لللي بالشيت لهذا الاسم.' };
  }

  return { ok: true, name: nameMatch['الاسم'], center: nameMatch['اسم المركز'] || '' };
}

function getMasoulat_() {
  const rows = sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG);
  return { ok: true, masoulat: rows.map(function (r) { return r['الاسم']; }).filter(Boolean) };
}

/* ------------------- المبيعات اليومية ------------------- */

function recordSale_(p) {
  const sh = sheet_('المبيعات');
  const id = Utilities.getUuid();
  const now = nowParts_();
  const date = p.date || now.date;
  const time = p.time || now.time;
  const day = dayNameForDateStr_(date);
  sh.appendRow([id, p.center, day, date, time, Number(p.amount)]);
  invalidateCache_('المبيعات');
  return { ok: true, id: id };
}

function getSales_(p) {
  const all = sheetToObjects_('المبيعات');
  const rows = p.center ? all.filter(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim();
  }) : all;
  const total = rows.reduce(function (sum, r) { return sum + (Number(r['المبلغ']) || 0); }, 0);
  return { ok: true, sales: rows, total: total };
}

/* ترجع رقم عمود بالاسم (1-indexed) بالبحث عن اسم العمود بصف العناوين */
function colIndex_(sh, headerName) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const idx = headers.indexOf(headerName);
  return idx === -1 ? -1 : idx + 1;
}

function updateSale_(p) {
  const sh = sheet_('المبيعات');
  const row = Number(p.row);
  sh.getRange(row, colIndex_(sh, 'المبلغ')).setValue(Number(p.amount));
  if (p.date) {
    sh.getRange(row, colIndex_(sh, 'التاريخ')).setValue(p.date);
    const dayCol = colIndex_(sh, 'اليوم');
    if (dayCol !== -1) sh.getRange(row, dayCol).setValue(dayNameForDateStr_(p.date));
  }
  invalidateCache_('المبيعات');
  return { ok: true };
}

function deleteSale_(p) {
  const sh = sheet_('المبيعات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('المبيعات');
  return { ok: true };
}

/* ------------------- البضائع المرتجعة ------------------- */

function recordReturn_(p) {
  const sh = sheet_('المرتجعات');
  const id = Utilities.getUuid();
  const date = p.date || nowParts_().date;
  const day = dayNameForDateStr_(date);
  sh.appendRow([id, p.center, day, date, p.description || '', Number(p.quantity) || 0, Number(p.value) || 0]);
  invalidateCache_('المرتجعات');
  return { ok: true, id: id };
}

function getReturns_(p) {
  const all = sheetToObjects_('المرتجعات');
  const rows = p.center ? all.filter(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim();
  }) : all;
  const total = rows.reduce(function (sum, r) { return sum + (Number(r['القيمة']) || 0); }, 0);
  return { ok: true, returns: rows, total: total };
}

function updateReturn_(p) {
  const sh = sheet_('المرتجعات');
  const row = Number(p.row);
  if (p.description !== undefined) sh.getRange(row, colIndex_(sh, 'وصف الصنف')).setValue(p.description);
  if (p.quantity !== undefined) sh.getRange(row, colIndex_(sh, 'الكمية')).setValue(Number(p.quantity));
  if (p.value !== undefined) sh.getRange(row, colIndex_(sh, 'القيمة')).setValue(Number(p.value));
  invalidateCache_('المرتجعات');
  return { ok: true };
}

function deleteReturn_(p) {
  const sh = sheet_('المرتجعات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('المرتجعات');
  return { ok: true };
}

/* ------------------- بيان الفواتير ------------------- */

function recordInvoice_(p) {
  const sh = sheet_('الفواتير');
  const id = Utilities.getUuid();
  const date = p.date || nowParts_().date;
  const day = dayNameForDateStr_(date);
  sh.appendRow([id, p.center, p.invoiceNumber || '', day, date, Number(p.totalAmount) || 0, Number(p.profit) || 0]);
  invalidateCache_('الفواتير');
  return { ok: true, id: id };
}

function getInvoices_(p) {
  const all = sheetToObjects_('الفواتير');
  const rows = p.center ? all.filter(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim();
  }) : all;
  const totalAmount = rows.reduce(function (sum, r) { return sum + (Number(r['المبلغ الإجمالي']) || 0); }, 0);
  const totalProfit = rows.reduce(function (sum, r) { return sum + (Number(r['الربح']) || 0); }, 0);
  return { ok: true, invoices: rows, totalAmount: totalAmount, totalProfit: totalProfit };
}

function updateInvoice_(p) {
  const sh = sheet_('الفواتير');
  const row = Number(p.row);
  if (p.invoiceNumber !== undefined) sh.getRange(row, colIndex_(sh, 'رقم الفاتورة')).setValue(p.invoiceNumber);
  if (p.date !== undefined && p.date) {
    sh.getRange(row, colIndex_(sh, 'التاريخ')).setValue(p.date);
    const dayCol = colIndex_(sh, 'اليوم');
    if (dayCol !== -1) sh.getRange(row, dayCol).setValue(dayNameForDateStr_(p.date));
  }
  if (p.totalAmount !== undefined) sh.getRange(row, colIndex_(sh, 'المبلغ الإجمالي')).setValue(Number(p.totalAmount));
  if (p.profit !== undefined) sh.getRange(row, colIndex_(sh, 'الربح')).setValue(Number(p.profit));
  invalidateCache_('الفواتير');
  return { ok: true };
}

function deleteInvoice_(p) {
  const sh = sheet_('الفواتير');
  sh.deleteRow(Number(p.row));
  invalidateCache_('الفواتير');
  return { ok: true };
}

/* ------------------- حضور الاجتماعات (تسجّله الإدارة) ------------------- */

// تسجيل حضور اسم واحد (أبقيناها للتوافق مع الاستخدامات القديمة)
function recordAttendance_(p) {
  const sh = sheet_('الحضور');
  const now = nowParts_();
  const date = p.date || now.date;
  const time = p.time || now.time;
  const day = dayNameForDateStr_(date);
  sh.appendRow([p.name, day, date, time]);
  invalidateCache_('الحضور');
  return { ok: true };
}

// تسجيل حضور عدة مسؤولات دفعة وحدة ليوم معيّن (تُستخدم من لوحة الإدارة)
function recordAttendanceBulk_(p) {
  const sh = sheet_('الحضور');
  const now = nowParts_();
  const date = p.date || now.date;
  const time = now.time;
  const day = dayNameForDateStr_(date);
  let names = p.names;
  if (typeof names === 'string') {
    try { names = JSON.parse(names); } catch (e) { names = [names]; }
  }
  names = names || [];

  // تفادي تكرار تسجيل نفس الاسم بنفس التاريخ
  const existingNames = sheetToObjects_('الحضور').filter(function (r) {
    return r['التاريخ'] === date;
  }).map(function (r) { return r['الاسم']; });

  let added = 0;
  names.forEach(function (name) {
    if (existingNames.indexOf(name) === -1) {
      sh.appendRow([name, day, date, time]);
      added++;
    }
  });
  invalidateCache_('الحضور');
  return { ok: true, added: added };
}

function getAttendanceForDate_(p) {
  const date = p.date;
  const rows = sheetToObjects_('الحضور').filter(function (r) { return r['التاريخ'] === date; });
  return { ok: true, names: rows.map(function (r) { return r['الاسم']; }) };
}

function getAttendance_(p) {
  const rows = sheetToObjects_('الحضور').filter(function (r) {
    return String(r['الاسم']).trim() === String(p.name).trim();
  });
  return { ok: true, records: rows };
}

/* ------------------- التعهد السنوي ------------------- */

function signPledge_(p) {
  const sh = sheet_('التعهد');
  const now = nowParts_();
  sh.appendRow([p.name, p.pledgeText, now.day, now.date, now.time, 'تم التعهد']);
  invalidateCache_('التعهد');
  return { ok: true };
}

function getPledge_(p) {
  const rows = sheetToObjects_('التعهد').filter(function (r) {
    return String(r['الاسم']).trim() === String(p.name).trim();
  });
  const latest = rows.length ? rows[rows.length - 1] : null;
  return { ok: true, pledge: latest };
}

/* ------------------- إشعارات الاستلام والتسليم ------------------- */

function submitNotice_(p) {
  const sh = sheet_('الإشعارات');
  const id = Utilities.getUuid();
  const now = nowParts_();

  // نحفظ صورة الإشعار الكاملة بس (فيها التوقيع أصلاً) - توفير وقت بعدم رفع صورتين لكل إشعار
  const noticeImageUrl = saveImage_(p.noticeImage, 'إشعار-' + id);

  // معرف، النوع، اسم المركز، يوم الإرسال، تاريخ الإرسال، وقت الإرسال، اسم المسلّمة، المبلغ،
  // الشهر، الفصل الدراسي، العام، رابط توقيع المركز، رابط صورة الإشعار، الحالة،
  // رابط توقيع الإدارة، رابط صورة الإشعار الموقع، يوم/تاريخ/وقت اطلاع الإدارة،
  // اسم المستلمة، بيانات توقيع المركز
  sh.appendRow([id, p.type, p.center, now.day, now.date, now.time, p.senderName || '', p.amount,
    p.month || '', p.term || '', p.year || '',
    '', noticeImageUrl, 'بانتظار الاطلاع', '', '', '', '', '', '', p.signature || '']);
  invalidateCache_('الإشعارات');

  notifyAdminNewNotice_(p.type, p.center, p.amount, now, noticeImageUrl, p.senderName);

  return { ok: true, id: id };
}

function notifyAdminNewNotice_(type, center, amount, now, noticeImageUrl, senderName) {
  if (!ADMIN_NOTIFY_EMAIL || ADMIN_NOTIFY_EMAIL.indexOf('@example.com') !== -1) return;
  try {
    MailApp.sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: 'إشعار ' + type + ' جديد من ' + center + ' - وحدة المقاصف',
      body: 'السلام عليكم،\n\n' +
        'وصل إشعار ' + type + ' جديد من مركز "' + center + '".\n' +
        (senderName ? ('اسم المسلّمة: ' + senderName + '\n') : '') +
        'المبلغ: ' + amount + ' ريال\n' +
        'اليوم: ' + now.day + '\n' +
        'التاريخ: ' + now.date + '\n' +
        'الوقت: ' + now.time + '\n\n' +
        'الرجاء الدخول للوحة إدارة وحدة المقاصف للاطلاع عليه وتوقيعه.\n' +
        (noticeImageUrl ? ('رابط صورة الإشعار: ' + noticeImageUrl + '\n') : '') +
        '\n— نظام وحدة المقاصف، جمعية فرقان لتحفيظ القرآن الكريم'
    });
  } catch (e) {
    // تجاهل خطأ الإرسال حتى لا يفشل حفظ الإشعار بسببه
  }
}

function getCenterNotices_(p) {
  const rows = sheetToObjects_('الإشعارات').filter(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim();
  });
  return { ok: true, notices: rows.reverse() };
}

function getPendingNotices_() {
  const rows = sheetToObjects_('الإشعارات').filter(function (r) {
    return r['الحالة'] === 'بانتظار الاطلاع';
  });
  return { ok: true, notices: rows.reverse() };
}

// ترجع جميع إشعارات الاستلام والتسليم (بانتظار الاطلاع + تم الاطلاع) - تُستخدم بلوحة الإدارة
function getAllNotices_() {
  const rows = sheetToObjects_('الإشعارات').slice().reverse();
  const pending = rows.filter(function (r) { return r['الحالة'] === 'بانتظار الاطلاع'; });
  const done = rows.filter(function (r) { return r['الحالة'] !== 'بانتظار الاطلاع'; });
  return { ok: true, pending: pending, done: done, notices: rows };
}

function adminSignNotice_(p) {
  const sh = sheet_('الإشعارات');
  const rows = sheetToObjects_('الإشعارات');
  const target = rows.find(function (r) { return r['معرف'] === p.id; });
  if (!target) return { ok: false, error: 'الإشعار غير موجود' };

  const now = nowParts_();

  // نحفظ الصورة النهائية الموقعة بس (فيها توقيع المركز + توقيع الإدارة سوا) - توفير وقت
  const signedImageUrl = saveImage_(p.signedNoticeImage, 'إشعار-موقع-' + p.id);

  const row = target._row;
  sh.getRange(row, colIndex_(sh, 'رابط توقيع الإدارة')).setValue('');            // لم يعد يُحفظ لوحده
  sh.getRange(row, colIndex_(sh, 'رابط صورة الإشعار الموقع')).setValue(signedImageUrl);
  sh.getRange(row, colIndex_(sh, 'يوم اطلاع الإدارة')).setValue(now.day);
  sh.getRange(row, colIndex_(sh, 'تاريخ اطلاع الإدارة')).setValue(now.date);
  sh.getRange(row, colIndex_(sh, 'وقت اطلاع الإدارة')).setValue(now.time);
  sh.getRange(row, colIndex_(sh, 'اسم المستلمة')).setValue(p.receiverName || '');
  sh.getRange(row, colIndex_(sh, 'الحالة')).setValue('تم الاطلاع');
  invalidateCache_('الإشعارات');

  return { ok: true };
}

/* ------------------- الإحصائيات (إيرادات المقاصف) ------------------- */

function getStats_() {
  const sales = sheetToObjects_('المبيعات');
  const byCenter = {};
  sales.forEach(function (r) {
    const c = String(r['اسم المركز'] || '').trim();
    if (!c) return;
    byCenter[c] = (byCenter[c] || 0) + (Number(r['المبلغ']) || 0);
  });
  let centersArr = Object.keys(byCenter).map(function (c) { return { center: c, total: byCenter[c] }; });
  centersArr.sort(function (a, b) { return b.total - a.total; });
  const grandTotal = centersArr.reduce(function (s, c) { return s + c.total; }, 0);
  return { ok: true, totalRevenue: grandTotal, centers: centersArr };
}
