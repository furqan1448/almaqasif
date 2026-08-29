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
    'المبيعات': ['معرف', 'اسم المركز', 'اليوم', 'التاريخ', 'الوقت', 'المبلغ', 'ملاحظات'],
    'المرتجعات': ['معرف', 'اسم المركز', 'اليوم', 'التاريخ', 'وصف الصنف', 'الكمية', 'القيمة', 'ملاحظات'],
    'الفواتير': ['معرف', 'اسم المركز', 'رقم الفاتورة', 'اليوم', 'التاريخ', 'المبلغ الإجمالي', 'الربح', 'ملاحظات'],
    'الإشعارات': ['معرف', 'النوع', 'اسم المركز', 'يوم الإرسال', 'تاريخ الإرسال', 'وقت الإرسال',
      'اسم المسلّمة', 'المبلغ', 'الشهر', 'الفصل الدراسي', 'العام', 'بيان مخصص',
      'رابط توقيع المركز', 'رابط صورة الإشعار', 'الحالة',
      'رابط توقيع الإدارة', 'رابط صورة الإشعار الموقع',
      'يوم اطلاع الإدارة', 'تاريخ اطلاع الإدارة', 'وقت اطلاع الإدارة',
      'اسم المستلمة', 'بيانات توقيع المركز'],
    'المرفقات': ['معرف', 'العنوان', 'النوع', 'الرابط', 'اسم الملف', 'من', 'اليوم', 'التاريخ', 'الوقت'],
    'مرفقات الإشراف': ['معرف', 'العنوان', 'النوع', 'الرابط', 'اسم الملف', 'من', 'اليوم', 'التاريخ', 'الوقت'],
    'دخول الإشراف': ['البريد الإلكتروني', 'كلمة المرور', 'الاسم'],
    'الصعوبات والمقترحات': ['معرف', 'اسم المركز', 'من', 'النوع', 'النص', 'اليوم', 'التاريخ', 'الوقت']
  };

  Object.keys(sheets).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(sheets[name]);
      sh.getRange(1, 1, 1, sheets[name].length).setFontWeight('bold');
      sh.setRightToLeft(true);
    } else {
      // إذا كان الشيت موجود من قبل بأعمدة أقل (تحديث نظام قديم)، نضيف الأعمدة الناقصة بآخر الصف.
      // نتجاهل المسافات الزائدة بالمقارنة (نفس سبب مشكلة "اليوم ما ينكتب") حتى ما ينضاف
      // عمود مكرر لو كان الموجود مسبقاً فيه مسافة خفية بالاسم.
      const existingHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
      sheets[name].forEach(function (col) {
        if (existingHeaders.indexOf(col) === -1) {
          sh.getRange(1, sh.getLastColumn() + 1).setValue(col).setFontWeight('bold');
          existingHeaders.push(col); // نحدّث القائمة بالذاكرة عشان ما نضيف نفس العمود مرتين بهذي التشغيلة
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

  notify_('تم إنشاء/تحديث جميع الشيتات بنجاح. تأكدي من تعبئة عمود "اسم المركز" بشيت "المسؤولات" لكل مسؤولة، وتحطي بريدك في ADMIN_NOTIFY_EMAIL أعلى الكود.\n\nملاحظة: لو كان عندك شيت قديم وفيه بيانات، شغّلي أيضاً دالة fixOldDateColumns من قائمة الدوال فوق المحرر مرة وحدة عشان تصلح صيغة الأعمدة القديمة، ودالة fillMissingDayNames لو لاحظتِ إن عمود "اليوم" فاضي بصفوف قديمة بالمبيعات/المرتجعات/الفواتير.');
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
  notify_('تم تحويل أعمدة التاريخ والوقت القديمة إلى نص واضح بدون أصفار زايدة.');
}

/* أسماء أيام الأسبوع بالعربي - الأحد أول الأسبوع */
const AR_DAYS_ = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* بديل آمن لـ SpreadsheetApp.getUi().alert() - يشتغل سواء نفّذتِ الدالة من زر
   "تشغيل" بمحرر Apps Script مباشرة (ما فيه واجهة شيت متاحة وقتها) أو من قائمة
   مخصصة داخل الشيت نفسه. لو ما قدر يفتح نافذة تنبيه، يسجّل الرسالة بسجل التنفيذ
   (Logger) عشان تقدري تشوفينها من "عرض" ← "سجلات التنفيذ" (Execution log). */
function notify_(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    Logger.log(message);
  }
}

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
  // file.getUrl() ترجع رابط صفحة عرض بقوقل درايف، وما تشتغل مباشرة داخل <img src>.
  // هذا الرابط هو الصيغة الصحيحة لعرض الصورة مباشرة بالمتصفح (وبتاق <img>)
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

/* نفس فكرة saveImage_ بس لأي نوع ملف (PDF، Word، صورة...) مو بس PNG -
   تُستخدم لرفع مرفقات المستخدمات (خانة "إضافة مرفقات"). ترجع رابط عرض/تحميل
   عادي بقوقل درايف (يشتغل بفتح تبويب جديد، عكس رابط saveImage_ المخصص للعرض داخل <img>) */
function saveAttachmentFile_(base64Data, fileName, mimeType) {
  if (!base64Data) return '';
  const cleaned = String(base64Data).replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(cleaned);
  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName || 'مرفق');
  const root = getOrCreateFolder_();
  const folders = root.getFoldersByName('المرفقات');
  const folder = folders.hasNext() ? folders.next() : root.createFolder('المرفقات');
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/* تسجّل مرفق جديد (ملف أو رابط). p.store: اسم الشيت الوجهة - افتراضياً 'المرفقات'
   (المشتركة بين المراكز/المسؤولات/الإدارة)، أو 'مرفقات الإشراف' لمكتب إشراف الداخل.
   p.kind: 'file' أو 'link'. لو 'file' لازم p.fileData (base64) و p.fileName و p.mimeType.
   لو 'link' لازم p.link. p.from: اسم الجهة المضيفة (مركز/مسؤولة/الإدارة) للعرض بس. */
function recordAttachment_(p) {
  const sh = sheet_(p.store || 'المرفقات');
  const id = Utilities.getUuid();
  const now = nowParts_();
  let link = '';
  let fileName = '';
  if (p.kind === 'file') {
    link = saveAttachmentFile_(p.fileData, p.fileName || (p.title || id), p.mimeType || '');
    fileName = p.fileName || '';
  } else {
    link = p.link || '';
  }
  appendRowByHeaders_(sh, {
    'معرف': id, 'العنوان': p.title || '', 'النوع': p.kind === 'file' ? 'ملف' : 'رابط',
    'الرابط': link, 'اسم الملف': fileName, 'من': p.from || '',
    'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time
  });
  invalidateCache_(p.store || 'المرفقات');
  return { ok: true, id: id };
}

function getAttachments_(p) {
  const rows = sheetToObjects_((p && p.store) || 'المرفقات');
  return { ok: true, attachments: rows.reverse() };
}

function deleteAttachment_(p) {
  const sh = sheet_(p.store || 'المرفقات');
  sh.deleteRow(Number(p.row));
  invalidateCache_(p.store || 'المرفقات');
  return { ok: true };
}

// تشغّل مرة وحدة (اختياري): تصلح روابط الصور القديمة المحفوظة بشيت "الإشعارات"
// اللي كانت بالصيغة الغلط (drive.google.com/file/d/.../view) وتحوّلها للصيغة الصحيحة
function fixOldImageUrls() {
  const sh = sheet_('الإشعارات');
  if (!sh || sh.getLastRow() < 2) { notify_('لا يوجد بيانات لتصليحها'); return; }
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const urlCols = ['رابط صورة الإشعار', 'رابط صورة الإشعار الموقع'];
  const range = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn());
  const values = range.getValues();
  let fixed = 0;
  headers.forEach(function (h, idx) {
    if (urlCols.indexOf(h) === -1) return;
    for (let i = 0; i < values.length; i++) {
      const v = values[i][idx];
      const match = /drive\.google\.com\/file\/d\/([^/]+)\//.exec(v);
      if (match) {
        values[i][idx] = 'https://lh3.googleusercontent.com/d/' + match[1];
        fixed++;
      }
    }
  });
  range.setValues(values);
  invalidateCache_('الإشعارات');
  notify_('تم تصليح ' + fixed + ' رابط صورة قديم.');
}

/* تشغّل مرة وحدة (اختياري): تصلح صفوف "المبيعات" اللي انكتبت بترتيب أعمدة غلط
   (كان فيها خلل قديم يخلي المبلغ ينكتب تحت عمود "اليوم" وهكذا بالتسلسل).
   تتعرف على الصفوف المتضررة بنمط واضح: عمود "المبلغ" فيه وقت (مثل 14:05) بدل رقم،
   وعمود "اليوم" فيه رقم بدل اسم يوم، وعمود "التاريخ" فيه اسم يوم بدل تاريخ - وترجع كل قيمة لعمودها الصحيح. */
function fixMisalignedSalesRows_() {
  const sh = sheet_('المبيعات');
  if (!sh || sh.getLastRow() < 2) { notify_('لا يوجد بيانات لتصليحها'); return; }

  const dayCol = colIndex_(sh, 'اليوم');
  const dateCol = colIndex_(sh, 'التاريخ');
  const timeCol = colIndex_(sh, 'الوقت');
  const amountCol = colIndex_(sh, 'المبلغ');
  if ([dayCol, dateCol, timeCol, amountCol].indexOf(-1) !== -1) {
    notify_('تعذر إيجاد كل الأعمدة المطلوبة (اليوم/التاريخ/الوقت/المبلغ) بشيت المبيعات.');
    return;
  }

  const range = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn());
  const values = range.getValues();
  const timePattern = /^\d{1,2}:\d{2}$/;
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  let fixed = 0;

  values.forEach(function (row) {
    const amountVal = row[amountCol - 1];
    const dayVal = row[dayCol - 1];
    const dateVal = row[dateCol - 1];
    const timeVal = row[timeCol - 1];

    const amountLooksLikeTime = timePattern.test(String(amountVal).trim());
    const dayLooksNumeric = dayVal !== '' && dayVal !== null && !isNaN(parseFloat(dayVal));
    const dateLooksLikeDayName = dayNames.indexOf(String(dateVal).trim()) !== -1;

    // نصلح الصف بس لو انطبقت كل علامات الخلل الثلاث سوا - تفادياً لتعديل صفوف سليمة بالغلط
    if (amountLooksLikeTime && dayLooksNumeric && dateLooksLikeDayName) {
      row[dayCol - 1] = dateVal;   // كان فيه اسم اليوم أصلاً
      row[dateCol - 1] = timeVal;  // كان فيه التاريخ أصلاً
      row[timeCol - 1] = amountVal; // كان فيه الوقت أصلاً
      row[amountCol - 1] = dayVal; // كان فيه المبلغ أصلاً
      fixed++;
    }
  });

  range.setValues(values);
  invalidateCache_('المبيعات');
  notify_('تم تصليح ' + fixed + ' صف من صفوف المبيعات المتضررة.');
}


/* تشغّل مرة وحدة (اختياري): تعبّي عمود "اليوم" لأي صف قديم فاضي فيه، بالاعتماد
   على عمود "التاريخ" بنفس الصف. تستخدمينها لو لاحظتِ إن اسم اليوم ما ينكتب
   بالمبيعات/المرتجعات/الفواتير (سواء لصفوف قديمة، أو لأن عمود "اليوم" ما كان
   موجود أصلاً بالشيت وقت ما انسجلت هذي الصفوف). */
function fillMissingDayNames_() {
  const sheetNames = ['المبيعات', 'المرتجعات', 'الفواتير'];
  let totalFixed = 0;
  const missingSheets = [];
  sheetNames.forEach(function (name) {
    const sh = sheet_(name);
    if (!sh) return;
    const dayCol = colIndex_(sh, 'اليوم');
    const dateCol = colIndex_(sh, 'التاريخ');
    if (dayCol === -1 || dateCol === -1) { missingSheets.push(name); return; }
    if (sh.getLastRow() < 2) return;
    const range = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn());
    const values = range.getValues();
    let fixed = 0;
    values.forEach(function (row) {
      const dayVal = String(row[dayCol - 1]).trim();
      const dateVal = row[dateCol - 1];
      if (!dayVal && dateVal) {
        row[dayCol - 1] = dayNameForDateStr_(String(dateVal));
        fixed++;
      }
    });
    if (fixed > 0) range.setValues(values);
    invalidateCache_(name);
    totalFixed += fixed;
  });
  let msg = 'تم تعبئة اسم اليوم لـ ' + totalFixed + ' صف كان فاضي.';
  if (missingSheets.length) {
    msg += '\n\nتنبيه: عمود "اليوم" أو "التاريخ" غير موجود أصلاً بشيت: ' + missingSheets.join('، ') + '. شغّلي دالة setup أولاً لإضافته، ثم أعيدي تشغيل هذي الدالة.';
  }
  notify_(msg);
}

/* تشغّل مرة وحدة (تشخيص): تطلع لك بالضبط أسماء أعمدة شيتات المبيعات/المرتجعات/الفواتير،
   كل اسم عمود بين قوسين [ ] عشان توضّح أي مسافة خفية بأول أو آخر الاسم، وتحدد
   أي عمود هو "اليوم" اللي يتعرف عليه الكود فعلياً. شغليها لو مازال اليوم ما ينكتب
   بعد تشغيل setup و fillMissingDayNames، وابعتيلي محتوى الرسالة اللي تطلع لك. */
function debugDayColumn_() {
  const names = ['المبيعات', 'المرتجعات', 'الفواتير'];
  let msg = '';
  names.forEach(function (name) {
    const sh = sheet_(name);
    if (!sh) { msg += name + ': ⚠️ الشيت غير موجود\n\n'; return; }
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const foundCol = colIndex_(sh, 'اليوم');
    msg += name + ' (يجدها الكود بعمود رقم: ' + (foundCol === -1 ? 'ما لقاها ❌' : foundCol) + '):\n';
    headers.forEach(function (h, i) {
      const isMatch = String(h).trim() === 'اليوم';
      msg += '  عمود ' + (i + 1) + ': [' + h + ']' + (isMatch ? '  ← تطابق مع "اليوم"' : '') + '\n';
    });
    // نموذج: وش راح ينكتب لو سجّلنا صف اليوم بالضبط
    msg += '  مثال: اسم اليوم المحسوب لتاريخ اليوم = ' + dayNameForDateStr_(nowParts_().date) + '\n\n';
  });
  notify_(msg);
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
  notify_('تم تفريغ الذاكرة المؤقتة. جربي الدخول بالموقع الحين.');
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
      obj[String(h).trim()] = val;
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
      case 'updateNotice': return json_(updateNotice_(p));
      case 'deleteNotice': return json_(deleteNotice_(p));

      case 'getStats': return json_(getStats_());

      case 'recordAttachment': return json_(recordAttachment_(p));
      case 'getAttachments': return json_(getAttachments_(p));
      case 'deleteAttachment': return json_(deleteAttachment_(p));

      case 'loginSupervision': return json_(loginSupervision_(p));

      case 'recordDifficulty': return json_(recordDifficulty_(p));
      case 'getDifficulties': return json_(getDifficulties_(p));
      case 'deleteDifficulty': return json_(deleteDifficulty_(p));

      case 'debugInfo': return json_(debugInfo_());

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

/* تسجيل دخول مكتب إشراف الداخل (eshraf.html) بالبريد الإلكتروني وكلمة المرور -
   البيانات تُدارى يدوياً بشيت "دخول الإشراف" (تضيفين صف جديد لكل بريد مسموح له بالدخول). */
function loginSupervision_(p) {
  const rows = sheetToObjects_('دخول الإشراف', CACHE_SECONDS_LONG);
  const email = String(p.email || '').trim().toLowerCase();
  const password = String(p.password || '').trim();

  const found = rows.find(function (r) {
    return String(r['البريد الإلكتروني']).trim().toLowerCase() === email;
  });

  if (!found) {
    return { ok: false, error: 'ما لقينا هذا البريد الإلكتروني بشيت "دخول الإشراف". تأكدي إنه مضاف ومكتوب بالضبط.' };
  }
  if (String(found['كلمة المرور']).trim() !== password) {
    return { ok: false, error: 'البريد الإلكتروني صحيح، بس كلمة المرور مو مطابقة.' };
  }
  return { ok: true, email: found['البريد الإلكتروني'], name: found['الاسم'] || '' };
}

/* ------------------- المبيعات اليومية ------------------- */

function recordSale_(p) {
  const sh = sheet_('المبيعات');
  const id = Utilities.getUuid();
  const now = nowParts_();
  const date = p.date || now.date;
  const time = p.time || now.time;
  const day = dayNameForDateStr_(date);
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center, 'اليوم': day, 'التاريخ': date, 'الوقت': time, 'المبلغ': Number(p.amount),
    'ملاحظات': p.notes || ''
  });
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

/* ترجع رقم عمود بالاسم (1-indexed) بالبحث عن اسم العمود بصف العناوين.
   تتجاهل أي مسافات زائدة بأول/آخر اسم العمود بالشيت عشان ما يفشل التطابق
   لو انضاف العمود يدوياً وفيه مسافة خفية (وهذا سبب شائع لمشكلة "اليوم ما ينكتب"). */
function colIndex_(sh, headerName) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const target = String(headerName).trim();
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === target) return i + 1;
  }
  return -1;
}

/* تضيف صف جديد حسب اسم العمود الفعلي بالشيت (مو حسب ترتيب ثابت بالكود).
   هذا يحمينا لو صار ترتيب الأعمدة الفعلي بالشيت مختلف عن الترتيب المتوقع
   (مثلاً لو انضاف عمود جديد بآخر الشيت بدل ما ينحط بمكانه الصحيح) - وهذا بالضبط
   كان سبب مشكلة "المبلغ يتكتب تحت عمود اليوم" اللي صارت قبل هذا الإصلاح.
   تتجاهل أيضاً أي مسافات زائدة بأسماء الأعمدة (نفس سبب مشكلة colIndex_ أعلاه).
   valuesObj: كائن {اسم العمود: القيمة} - أي عمود موجود بالشيت وما انذكر بالكائن يُترك فاضي. */
function appendRowByHeaders_(sh, valuesObj) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const keysTrimmed = {};
  Object.keys(valuesObj).forEach(function (k) { keysTrimmed[k.trim()] = valuesObj[k]; });
  const row = headers.map(function (h) {
    const key = String(h).trim();
    return keysTrimmed.hasOwnProperty(key) ? keysTrimmed[key] : '';
  });
  sh.appendRow(row);
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
  if (p.notes !== undefined) {
    const notesCol = colIndex_(sh, 'ملاحظات');
    if (notesCol !== -1) sh.getRange(row, notesCol).setValue(p.notes);
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
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center, 'اليوم': day, 'التاريخ': date,
    'وصف الصنف': p.description || '', 'الكمية': Number(p.quantity) || 0, 'القيمة': Number(p.value) || 0,
    'ملاحظات': p.notes || ''
  });
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
  if (p.notes !== undefined) {
    const notesCol = colIndex_(sh, 'ملاحظات');
    if (notesCol !== -1) sh.getRange(row, notesCol).setValue(p.notes);
  }
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
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center, 'رقم الفاتورة': p.invoiceNumber || '', 'اليوم': day, 'التاريخ': date,
    'المبلغ الإجمالي': Number(p.totalAmount) || 0, 'الربح': Number(p.profit) || 0, 'ملاحظات': p.notes || ''
  });
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
  if (p.notes !== undefined) {
    const notesCol = colIndex_(sh, 'ملاحظات');
    if (notesCol !== -1) sh.getRange(row, notesCol).setValue(p.notes);
  }
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
  appendRowByHeaders_(sh, { 'الاسم': p.name, 'اليوم': day, 'التاريخ': date, 'الوقت': time });
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
      appendRowByHeaders_(sh, { 'الاسم': name, 'اليوم': day, 'التاريخ': date, 'الوقت': time });
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
  appendRowByHeaders_(sh, {
    'الاسم': p.name, 'نص التعهد': p.pledgeText, 'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time, 'الحالة': 'تم التعهد'
  });
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

  appendRowByHeaders_(sh, {
    'معرف': id, 'النوع': p.type, 'اسم المركز': p.center,
    'يوم الإرسال': now.day, 'تاريخ الإرسال': now.date, 'وقت الإرسال': now.time,
    'اسم المسلّمة': p.senderName || '', 'المبلغ': p.amount,
    'الشهر': p.month || '', 'الفصل الدراسي': p.term || '', 'العام': p.year || '',
    'بيان مخصص': p.reason || '',
    'رابط صورة الإشعار': noticeImageUrl, 'الحالة': 'بانتظار الاطلاع',
    'بيانات توقيع المركز': p.signature || ''
  });
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

/* ------------------- الصعوبات والمقترحات ------------------- */

function recordDifficulty_(p) {
  const sh = sheet_('الصعوبات والمقترحات');
  const id = Utilities.getUuid();
  const now = nowParts_();
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center || '', 'من': p.from || '', 'النوع': p.type || 'صعوبة',
    'النص': p.text || '', 'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time
  });
  invalidateCache_('الصعوبات والمقترحات');
  notifyAdminNewDifficulty_(p.type, p.center, p.from, p.text, now);
  return { ok: true, id: id };
}

function notifyAdminNewDifficulty_(type, center, from, text, now) {
  if (!ADMIN_NOTIFY_EMAIL || ADMIN_NOTIFY_EMAIL.indexOf('@example.com') !== -1) return;
  try {
    MailApp.sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: (type || 'صعوبة') + ' جديدة من ' + (center || '') + ' - وحدة المقاصف',
      body: 'السلام عليكم،\n\n' +
        'وصلت ' + (type || 'صعوبة') + ' جديدة من مركز "' + (center || '') + '".\n' +
        (from ? ('من: ' + from + '\n') : '') +
        '\nالنص:\n' + (text || '') + '\n\n' +
        'اليوم: ' + now.day + '\n' +
        'التاريخ: ' + now.date + '\n' +
        'الوقت: ' + now.time + '\n\n' +
        'الرجاء الدخول للوحة إدارة وحدة المقاصف للاطلاع.\n\n' +
        '— نظام وحدة المقاصف، جمعية فرقان لتحفيظ القرآن الكريم'
    });
  } catch (e) {
    // تجاهل خطأ الإرسال حتى لا يفشل الحفظ بسببه
  }
}

/* p.center: لو انمرّرت، ترجع صعوبات/مقترحات هذا المركز بس (يشوفها المركز نفسه).
   وإلا لو انمرّر p.from، ترجع اللي أرسلتها هذي الجهة بس (مسؤولة غير مربوطة بمركز).
   لو ما انمرّر ولا واحد منهم، ترجع الكل (لصفحة الإدارة). */
function getDifficulties_(p) {
  const rows = sheetToObjects_('الصعوبات والمقترحات');
  let filtered = rows;
  if (p && p.center) {
    filtered = rows.filter(function (r) { return String(r['اسم المركز']).trim() === String(p.center).trim(); });
  } else if (p && p.from) {
    filtered = rows.filter(function (r) { return String(r['من']).trim() === String(p.from).trim(); });
  }
  return { ok: true, items: filtered.reverse() };
}

function deleteDifficulty_(p) {
  const sh = sheet_('الصعوبات والمقترحات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('الصعوبات والمقترحات');
  return { ok: true };
}

function getCenterNotices_(p) {
  const rows = sheetToObjects_('الإشعارات').filter(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim();
  });
  return { ok: true, notices: rows.reverse() };
}

/* تعديل خفيف على إشعار موجود: المبلغ و/أو اسم المسلّمة فقط
   (ما تُعدَّل الصورة/التوقيع/الحالة عشان تبقى السجلات الموقّعة موثوقة) */
function updateNotice_(p) {
  const sh = sheet_('الإشعارات');
  const row = Number(p.row);
  if (p.amount !== undefined && p.amount !== '') sh.getRange(row, colIndex_(sh, 'المبلغ')).setValue(Number(p.amount));
  if (p.senderName !== undefined) sh.getRange(row, colIndex_(sh, 'اسم المسلّمة')).setValue(p.senderName);
  invalidateCache_('الإشعارات');
  return { ok: true };
}

function deleteNotice_(p) {
  const sh = sheet_('الإشعارات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('الإشعارات');
  return { ok: true };
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

// دالة تشخيص: ترجع اسم/رابط ملف الإكسل اللي متصل فيه هذا الكود فعلياً، مع عدد صفوف كل شيت،
// تساعد لو صار لخبطة إن الموقع متصل بملف إكسل غير اللي المستخدمة تشوف فيه بياناتها
function debugInfo_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ['المسؤولات', 'الحضور', 'التعهد', 'المراكز', 'المبيعات', 'المرتجعات', 'الفواتير', 'الإشعارات'];
  const sheetsInfo = sheetNames.map(function (name) {
    const sh = ss.getSheetByName(name);
    return { name: name, exists: !!sh, rows: sh ? Math.max(sh.getLastRow() - 1, 0) : 0 };
  });
  return {
    ok: true,
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    sheets: sheetsInfo
  };
}

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
