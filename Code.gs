/**
 * نظام وحدة المقاصف - جمعية فرقان لتحفيظ القرآن الكريم
 * الكود الخلفي (Google Apps Script)
 *
 * طريقة التركيب:
 * 1) افتحي Google Sheet جديد فاضي.
 * 2) من القائمة: Extensions > Apps Script
 * 3) احذفي أي كود موجود، والصقي هذا الكود كامل.
 * 4) عدّلي القيمة ADMIN_NOTIFY_EMAIL أدناه ببريدك الإلكتروني عشان توصلك إشعارات الاستلام والتسليم.
 * 5) شغلي دالة setup() مرة وحدة من القائمة أعلى المحرر (لإنشاء الشيتات والأعمدة تلقائياً).
 * 6) بعدين Deploy > New deployment > اختاري نوع "Web app"
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7) انسخي رابط الـ Web app والصقيه في ملف config.js في الموقع.
 */

const FOLDER_NAME = 'مرفقات نظام المقاصف';

// ⚠️ حطي بريدك الإلكتروني هنا عشان تستلمي إشعار كل ما مركز يرسل إشعار استلام أو تسليم
const ADMIN_NOTIFY_EMAIL = maram1998m3@gmail.com';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheets = {
    'المسؤولات': ['الاسم', 'البريد الإلكتروني', 'كلمة المرور'],
    'الحضور': ['الاسم', 'التاريخ', 'الوقت'],
    'التعهد': ['الاسم', 'نص التعهد', 'تاريخ التوقيع', 'الحالة'],
    'المراكز': ['اسم المركز', 'كلمة المرور'],
    'المبيعات': ['معرف', 'اسم المركز', 'التاريخ', 'الوقت', 'المبلغ'],
    'المرتجعات': ['معرف', 'اسم المركز', 'التاريخ', 'وصف الصنف', 'الكمية', 'القيمة'],
    'الفواتير': ['معرف', 'اسم المركز', 'رقم الفاتورة', 'التاريخ', 'المبلغ الإجمالي', 'الربح'],
    'الإشعارات': ['معرف', 'النوع', 'اسم المركز', 'المبلغ', 'تاريخ الإرسال',
      'رابط توقيع المركز', 'رابط صورة الإشعار', 'الحالة',
      'رابط توقيع الإدارة', 'رابط صورة الإشعار الموقع', 'تاريخ توقيع الإدارة',
      'بيانات توقيع المركز']
  };

  Object.keys(sheets).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(sheets[name]);
      sh.getRange(1, 1, 1, sheets[name].length).setFontWeight('bold');
      sh.setRightToLeft(true);
    }
  });

  // شيت مثال - عدليه بأسماء المراكز الحقيقية وكلمات المرور
  const centersSheet = ss.getSheetByName('المراكز');
  if (centersSheet.getLastRow() === 1) {
    centersSheet.appendRow(['مركز تحفيظ 1', '1234']);
    centersSheet.appendRow(['مركز تحفيظ 2', '5678']);
  }

  SpreadsheetApp.getUi().alert('تم إنشاء جميع الشيتات بنجاح. عدّلي شيت "المراكز" و "المسؤولات" بالبيانات الحقيقية، ولا تنسي تحطي بريدك في ADMIN_NOTIFY_EMAIL أعلى الكود.');
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

function sheetToObjects_(name) {
  const sh = sheet_(name);
  const data = sh.getDataRange().getValues();
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach(function (h, idx) { obj[h] = data[i][idx]; });
    obj._row = i + 1;
    rows.push(obj);
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

      case 'getPledge': return json_(getPledge_(p));
      case 'signPledge': return json_(signPledge_(p));

      case 'submitNotice': return json_(submitNotice_(p));
      case 'getCenterNotices': return json_(getCenterNotices_(p));
      case 'getPendingNotices': return json_(getPendingNotices_());
      case 'adminSignNotice': return json_(adminSignNotice_(p));

      case 'getStats': return json_(getStats_());

      default: return json_({ ok: false, error: 'إجراء غير معروف' });
    }
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

/* ------------------- المراكز: تسجيل الدخول ------------------- */

function getCenters_() {
  const rows = sheetToObjects_('المراكز');
  return { ok: true, centers: rows.map(function (r) { return r['اسم المركز']; }) };
}

function loginCenter_(p) {
  const rows = sheetToObjects_('المراكز');
  const found = rows.find(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim() &&
      String(r['كلمة المرور']).trim() === String(p.password).trim();
  });
  if (!found) return { ok: false, error: 'اسم المركز أو كلمة المرور غير صحيحة' };
  return { ok: true, center: found['اسم المركز'] };
}

function loginMasoula_(p) {
  const rows = sheetToObjects_('المسؤولات');
  const found = rows.find(function (r) {
    const idMatch = String(r['الاسم']).trim() === String(p.username).trim() ||
      String(r['البريد الإلكتروني']).trim().toLowerCase() === String(p.username).trim().toLowerCase();
    return idMatch && String(r['كلمة المرور']).trim() === String(p.password).trim();
  });
  if (!found) return { ok: false, error: 'الاسم/البريد أو كلمة المرور غير صحيحة' };
  return { ok: true, name: found['الاسم'] };
}

/* ------------------- المبيعات اليومية ------------------- */

function recordSale_(p) {
  const sh = sheet_('المبيعات');
  const id = Utilities.getUuid();
  sh.appendRow([id, p.center, p.date, p.time || '', Number(p.amount)]);
  return { ok: true, id: id };
}

function getSales_(p) {
  const rows = sheetToObjects_('المبيعات').filter(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim();
  });
  const total = rows.reduce(function (sum, r) { return sum + (Number(r['المبلغ']) || 0); }, 0);
  return { ok: true, sales: rows, total: total };
}

function updateSale_(p) {
  const sh = sheet_('المبيعات');
  // عمود المبلغ هو الخامس: معرف، اسم المركز، التاريخ، الوقت، المبلغ
  sh.getRange(Number(p.row), 5).setValue(Number(p.amount));
  if (p.date) sh.getRange(Number(p.row), 3).setValue(p.date);
  return { ok: true };
}

function deleteSale_(p) {
  const sh = sheet_('المبيعات');
  sh.deleteRow(Number(p.row));
  return { ok: true };
}

/* ------------------- البضائع المرتجعة ------------------- */

function recordReturn_(p) {
  const sh = sheet_('المرتجعات');
  const id = Utilities.getUuid();
  const date = p.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  sh.appendRow([id, p.center, date, p.description || '', Number(p.quantity) || 0, Number(p.value) || 0]);
  return { ok: true, id: id };
}

function getReturns_(p) {
  const rows = sheetToObjects_('المرتجعات').filter(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim();
  });
  const total = rows.reduce(function (sum, r) { return sum + (Number(r['القيمة']) || 0); }, 0);
  return { ok: true, returns: rows, total: total };
}

function updateReturn_(p) {
  const sh = sheet_('المرتجعات');
  // معرف، اسم المركز، التاريخ، وصف الصنف، الكمية، القيمة
  if (p.description !== undefined) sh.getRange(Number(p.row), 4).setValue(p.description);
  if (p.quantity !== undefined) sh.getRange(Number(p.row), 5).setValue(Number(p.quantity));
  if (p.value !== undefined) sh.getRange(Number(p.row), 6).setValue(Number(p.value));
  return { ok: true };
}

function deleteReturn_(p) {
  const sh = sheet_('المرتجعات');
  sh.deleteRow(Number(p.row));
  return { ok: true };
}

/* ------------------- بيان الفواتير ------------------- */

function recordInvoice_(p) {
  const sh = sheet_('الفواتير');
  const id = Utilities.getUuid();
  const date = p.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  sh.appendRow([id, p.center, p.invoiceNumber || '', date, Number(p.totalAmount) || 0, Number(p.profit) || 0]);
  return { ok: true, id: id };
}

function getInvoices_(p) {
  const rows = sheetToObjects_('الفواتير').filter(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim();
  });
  const totalAmount = rows.reduce(function (sum, r) { return sum + (Number(r['المبلغ الإجمالي']) || 0); }, 0);
  const totalProfit = rows.reduce(function (sum, r) { return sum + (Number(r['الربح']) || 0); }, 0);
  return { ok: true, invoices: rows, totalAmount: totalAmount, totalProfit: totalProfit };
}

function updateInvoice_(p) {
  const sh = sheet_('الفواتير');
  // معرف، اسم المركز، رقم الفاتورة، التاريخ، المبلغ الإجمالي، الربح
  if (p.invoiceNumber !== undefined) sh.getRange(Number(p.row), 3).setValue(p.invoiceNumber);
  if (p.totalAmount !== undefined) sh.getRange(Number(p.row), 5).setValue(Number(p.totalAmount));
  if (p.profit !== undefined) sh.getRange(Number(p.row), 6).setValue(Number(p.profit));
  return { ok: true };
}

function deleteInvoice_(p) {
  const sh = sheet_('الفواتير');
  sh.deleteRow(Number(p.row));
  return { ok: true };
}

/* ------------------- حضور الاجتماعات ------------------- */

function recordAttendance_(p) {
  const sh = sheet_('الحضور');
  const now = new Date();
  sh.appendRow([p.name, Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm')]);
  return { ok: true };
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
  const now = new Date();
  sh.appendRow([p.name, p.pledgeText, Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'), 'تم التعهد']);
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
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  const signatureUrl = saveImage_(p.signature, 'توقيع-مركز-' + id);
  const noticeImageUrl = saveImage_(p.noticeImage, 'إشعار-' + id);

  sh.appendRow([id, p.type, p.center, p.amount, dateStr, signatureUrl, noticeImageUrl,
    'بانتظار الاطلاع', '', '', '', p.signature || '']);

  notifyAdminNewNotice_(p.type, p.center, p.amount, dateStr, noticeImageUrl);

  return { ok: true, id: id };
}

function notifyAdminNewNotice_(type, center, amount, dateStr, noticeImageUrl) {
  if (!ADMIN_NOTIFY_EMAIL || ADMIN_NOTIFY_EMAIL.indexOf('@example.com') !== -1) return;
  try {
    MailApp.sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: 'إشعار ' + type + ' جديد من ' + center + ' - وحدة المقاصف',
      body: 'السلام عليكم،\n\n' +
        'وصل إشعار ' + type + ' جديد من مركز "' + center + '".\n' +
        'المبلغ: ' + amount + ' ريال\n' +
        'التاريخ: ' + dateStr + '\n\n' +
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

function adminSignNotice_(p) {
  const sh = sheet_('الإشعارات');
  const rows = sheetToObjects_('الإشعارات');
  const target = rows.find(function (r) { return r['معرف'] === p.id; });
  if (!target) return { ok: false, error: 'الإشعار غير موجود' };

  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  const adminSigUrl = saveImage_(p.signature, 'توقيع-إدارة-' + p.id);
  const signedImageUrl = saveImage_(p.signedNoticeImage, 'إشعار-موقع-' + p.id);

  const row = target._row;
  sh.getRange(row, 9).setValue(adminSigUrl);       // رابط توقيع الإدارة
  sh.getRange(row, 10).setValue(signedImageUrl);   // رابط صورة الإشعار الموقع
  sh.getRange(row, 11).setValue(dateStr);          // تاريخ توقيع الإدارة
  sh.getRange(row, 8).setValue('تم الاطلاع');      // الحالة

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
