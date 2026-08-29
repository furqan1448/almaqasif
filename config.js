// ⚠️ حطي هنا رابط الـ Web app اللي طلعلك من Google Apps Script بعد الـ Deploy
const API_URL = "https://script.google.com/macros/s/AKfycbwEbKyD2nyVg-ZJSbAEZuheQ1wtogBqceFvmRM82kqTy3psCXa_SehKycl8btaEDIrz/exec";

async function callApi(action, data) {
  const payload = Object.assign({ action: action }, data || {});
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res.json();
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function nowTimeStr() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return h + ':' + m;
}

/* أسماء أيام الأسبوع بالعربي (الأحد أول الأسبوع) */
const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* اسم اليوم بالعربي لتاريخ نصي بصيغة yyyy-MM-dd (أو لليوم الحالي لو ما فيه) */
function dayNameFor(dateStr) {
  let d;
  if (dateStr) {
    const parts = String(dateStr).split('-');
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    d = new Date();
  }
  return AR_DAYS[d.getDay()];
}

/* الأشهر الهجرية - تُستخدم بقائمة "شهر مبيعات المقصف" بالإشعارات */
const AR_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

/* الفصول الدراسية */
const AR_TERMS = ['الأول', 'الثاني', 'الثالث'];

/* -------- تطبيق شعار فرقان بأعلى الصفحة (لو تم ضبط FURQAN_LOGO_URL بملف logo-config.js) -------- */
function applyBrandLogo() {
  const url = (typeof FURQAN_LOGO_URL !== 'undefined') ? FURQAN_LOGO_URL : '';
  const img = document.getElementById('brandLogo');
  const dot = document.getElementById('brandDot');
  if (!url || !img) return;
  img.src = url;
  img.onload = function () {
    img.classList.remove('hidden');
    if (dot) dot.classList.add('hidden');
  };
}
document.addEventListener('DOMContentLoaded', applyBrandLogo);
function toHijriStr(dateStr) {
  if (!dateStr) return '';
  const datePart = String(dateStr).split(' ')[0];
  const parts = datePart.split('-');
  let d;
  if (parts.length === 3) {
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return dateStr;
  try {
    // ملاحظة: تنسيق ar-SA-u-ca-islamic-umalqura يضيف "هـ" تلقائياً بآخر التاريخ،
    // فلا نضيفها نحن مرة ثانية (كانت هذي هي مصدر تكرار حرف "هـ")
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  } catch (e) {
    return dateStr;
  }
}

/* نفس التاريخ الهجري بس رقم الشهر بدل اسمه (مثال: ١٢/٣/١٤٤٨ هـ) */
function toHijriNumericStr(dateStr) {
  if (!dateStr) return '';
  const datePart = String(dateStr).split(' ')[0];
  const parts = datePart.split('-');
  let d;
  if (parts.length === 3) {
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return dateStr;
  try {
    return spaceOutDateSlashes_(new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d));
  } catch (e) {
    return dateStr;
  }
}

/* نفس التاريخ الميلادي بس بالأرقام والشهور العربية، بدون خط لاتيني */
function toGregorianArabicStr(dateStr) {
  if (!dateStr) return '';
  const datePart = String(dateStr).split(' ')[0];
  const parts = datePart.split('-');
  let d;
  if (parts.length === 3) {
    d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return dateStr;
  try {
    return spaceOutDateSlashes_(new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d));
  } catch (e) {
    return dateStr;
  }
}

/* تحويل أي أرقام لاتينية (0-9) داخل نص لأرقام عربية (٠-٩) */
function toArabicDigits(value) {
  const map = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
  return String(value).replace(/[0-9]/g, function (d) { return map[d]; });
}

/* يضيف مسافة بسيطة حوالين علامة "/" بالتاريخ عشان الأرقام ما تكون لاصقة ببعض،
   ويشيل أي رموز اتجاه نص خفية (RTL marks) يحطها Intl تلقائياً */
function spaceOutDateSlashes_(str) {
  return String(str).replace(/[\u200e\u200f]/g, '').split('/').map(function (s) { return s.trim(); }).join(' / ');
}

/* تنسيق مبلغ بأرقام عربية مع فاصلة "," بدل النقطة العشرية، عشان توضّح الفلوس عن الهللات
   مثال: 1250.5 => "١٢٥٠,٥٠" */
function toArabicAmountStr(amount) {
  const fixed = Number(amount || 0).toFixed(2);
  return toArabicDigits(fixed).replace('.', ',');
}

/* تنسيق موحّد لعرض يوم/تاريخ هجري (وميلادي بين قوسين)/وقت بدون أي أصفار زايدة */
function formatDayDateTime(day, date, time) {
  const parts = [];
  if (day) parts.push('يوم ' + day);
  if (date) parts.push(toHijriStr(date) + ' (' + toGregorianArabicStr(date) + ')');
  if (time) parts.push(toArabicDigits(time));
  return parts.join(' · ');
}

/* -------- اختيار أكثر من شهر لإشعارات المبيعات (شرائح قابلة للتبديل) -------- */
function renderMonthChips(containerId) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = '';
  box.dataset.selected = '';
  AR_MONTHS.forEach(function (m) {
    const chip = document.createElement('div');
    chip.className = 'month-chip';
    chip.textContent = m;
    chip.onclick = function () { chip.classList.toggle('selected'); };
    box.appendChild(chip);
  });
}

function getSelectedMonths(containerId) {
  const box = document.getElementById(containerId);
  if (!box) return [];
  return Array.from(box.querySelectorAll('.month-chip.selected')).map(function (c) { return c.textContent; });
}

/* صياغة جملة الأشهر: "لشهر يناير" أو "لأشهر يناير وفبراير" */
function monthsPhrase(months) {
  if (!months || !months.length) return 'لشهر .......';
  if (months.length === 1) return 'لشهر ' + months[0];
  return 'لأشهر ' + months.join('، ');
}

/* تعبئة قائمة منسدلة (select) بمصفوفة قيم نصية */
function fillSelect(selectId, values, placeholder) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '';
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = placeholder;
    sel.appendChild(opt);
  }
  values.forEach(function (v) {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
}

/* تعبئة قائمة السنوات الهجرية بنطاق حول السنة الهجرية الحالية */
function currentHijriYear() {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).formatToParts(new Date());
    return parseInt(parts.find(function (p) { return p.type === 'year'; }).value, 10);
  } catch (e) {
    return new Date().getFullYear() - 578; // تقريب احتياطي لو المتصفح ما يدعم التقويم الهجري
  }
}

function fillYearSelect(selectId, span) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const currentYear = currentHijriYear();
  sel.innerHTML = '';
  for (let y = currentYear - (span || 1); y <= currentYear + 1; y++) {
    const opt = document.createElement('option');
    const label = toArabicDigits(y) + ' هـ';
    opt.value = label; opt.textContent = label;
    if (y === currentYear) opt.selected = true;
    sel.appendChild(opt);
  }
}

/* -------- تحويل الأرقام إلى كتابة عربية (لكتابة المبلغ رقماً وكتابة) -------- */
function groupToArabicWords_(n) {
  if (n === 0) return '';
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];
  const parts = [];
  const h = Math.floor(n / 100), rem = n % 100;
  if (h > 0) parts.push(hundreds[h]);
  if (rem > 0) {
    if (rem < 10) parts.push(ones[rem]);
    else if (rem < 20) parts.push(teens[rem - 10]);
    else {
      const t = Math.floor(rem / 10), o = rem % 10;
      parts.push(o === 0 ? tens[t] : (ones[o] + ' و' + tens[t]));
    }
  }
  return parts.join(' و');
}

function thousandsToArabicWords_(n) {
  if (n === 0) return '';
  if (n === 1) return 'ألف';
  if (n === 2) return 'ألفان';
  if (n <= 10) return groupToArabicWords_(n) + ' آلاف';
  return groupToArabicWords_(n) + ' ألف';
}

function numberToArabicWords(num) {
  num = Math.floor(Math.abs(num));
  if (num === 0) return 'صفر';
  if (num < 1000) return groupToArabicWords_(num);

  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  const parts = [];
  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions <= 10) parts.push(groupToArabicWords_(millions) + ' ملايين');
    else parts.push(groupToArabicWords_(millions) + ' مليون');
  }
  if (thousands > 0) parts.push(thousandsToArabicWords_(thousands));
  if (remainder > 0) parts.push(groupToArabicWords_(remainder));

  return parts.join(' و');
}

/* المبلغ رقماً وكتابة معاً: "100.00 ريال (مئة ريال سعودي فقط لا غير)" */
function amountToArabicWords(amount) {
  amount = Number(amount) || 0;
  const riyals = Math.floor(amount);
  const halalas = Math.round((amount - riyals) * 100);
  let text = numberToArabicWords(riyals) + ' ريال سعودي';
  if (halalas > 0) text += ' و' + numberToArabicWords(halalas) + ' هللة';
  return text + ' فقط لا غير';
}

/* -------- تصدير جداول البيانات إلى ملف Excel --------
   data: مصفوفة كائنات (كل كائن = صف، مفاتيحه هي أسماء الأعمدة)
   filename: اسم الملف بدون امتداد
   sheetName: اسم الورقة داخل ملف الإكسل (اختياري)
   يمكن فتح الملف الناتج مباشرة في Excel، أو استيراده في Google Sheets
   من قائمة File > Import داخل شيتس. */
function exportToExcel(data, filename, sheetName, totals) {
  if (!data || !data.length) {
    alert('لا يوجد بيانات لتصديرها');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('تعذر تحميل مكتبة التصدير، تأكدي من الاتصال بالإنترنت وحاولي مرة أخرى');
    return;
  }
  let rows = data;
  if (totals && totals.key) {
    const sum = data.reduce(function (s, r) { return s + (Number(r[totals.key]) || 0); }, 0);
    const totalRow = {};
    Object.keys(data[0]).forEach(function (k) { totalRow[k] = ''; });
    const firstKey = Object.keys(data[0])[0];
    totalRow[firstKey] = totals.label || 'الإجمالي';
    totalRow[totals.key] = sum;
    rows = data.concat([totalRow]);
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'بيانات');
  XLSX.writeFile(wb, filename + '.xlsx');
}

/* -------- تصدير/طباعة تقرير كـ PDF --------
   تفتح نافذة جديدة بتنسيق مرتب وتشغّل حوار الطباعة تلقائياً؛
   المستخدمة تقدر تختار "حفظ كـ PDF" من نافذة الطباعة نفسها (يعمل على الجوال وسطح المكتب).
   columns: مصفوفة [{key, label}], rows: مصفوفة كائنات بيانات */
function printReport(title, subtitle, columns, rows, totals) {
  if (!rows || !rows.length) {
    alert('لا يوجد بيانات لطباعتها');
    return;
  }
  const win = window.open('', '_blank');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع عشان تقدري تطبعي التقرير');
    return;
  }
  let html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">';
  html += '<title>' + title + '</title>';
  html += '<style>';
  html += '@import url(\'https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Tajawal:wght@400;700;800&display=swap\');';
  html += '@page { margin: 0; }';
  html += '*{box-sizing:border-box;}';
  html += 'html,body{margin:0;padding:0;}';
  html += 'body{font-family:"Tajawal",sans-serif;direction:rtl;color:#2b2321;}';
  html += '.content{padding:0 28px 28px;}';
  html += 'h1{font-family:"Amiri",serif;color:#8C1A2C;margin:0 0 2px;font-size:1.5rem;}';
  html += '.sub{color:#8a7d76;margin:16px 0 22px;font-size:0.9rem;}';
  html += 'table{width:100%;border-collapse:collapse;font-size:0.88rem;}';
  html += 'th,td{border:1px solid #C2AA85;padding:8px 10px;text-align:center;}';
  html += 'th{background:#e8dcc8;color:#6e1523;}';
  html += '.report-total{margin-top:14px;text-align:left;font-weight:800;font-size:1.05rem;color:#6e1523;}';
  html += '.letterhead{width:100%;display:block;}';
  html += '@media print{ .letterhead{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }';
  html += '</style></head><body>';
  const letterheadUrl = (typeof FURQAN_LETTERHEAD_URL !== 'undefined') ? FURQAN_LETTERHEAD_URL : '';
  if (letterheadUrl) {
    html += '<img class="letterhead" src="' + letterheadUrl + '" alt="كليشة جمعية فرقان">';
    html += '<div class="content"><h1 style="margin-top:18px;">' + title + '</h1>';
  } else {
    const logoUrl = (typeof FURQAN_LOGO_URL !== 'undefined') ? FURQAN_LOGO_URL : '';
    html += '<div class="content" style="padding-top:20px;">';
    html += '<div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">';
    if (logoUrl) html += '<img src="' + logoUrl + '" alt="شعار فرقان" style="width:56px;height:56px;border-radius:50%;object-fit:cover;">';
    html += '<h1 style="margin:0;">جمعية فرقان لتحفيظ القرآن الكريم</h1>';
    html += '</div>';
    html += '<h1 style="font-size:1.2rem;">' + title + '</h1>';
  }
  html += '<div class="sub">' + (subtitle || '') + ' &middot; ' + toHijriStr(todayStr()) + '</div>';
  html += '<table><thead><tr>';
  columns.forEach(function (c) { html += '<th>' + c.label + '</th>'; });
  html += '</tr></thead><tbody>';
  rows.forEach(function (r) {
    html += '<tr>';
    columns.forEach(function (c) {
      const v = r[c.key];
      html += '<td>' + (v === undefined || v === null ? '' : v) + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  if (totals && totals.key) {
    const sum = rows.reduce(function (s, r) { return s + (Number(r[totals.key]) || 0); }, 0);
    html += '<div class="report-total">' + (totals.label || 'الإجمالي') + ': ' + sum.toFixed(2) + '</div>';
  }
  html += '</div>';
  html += '<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };<\/script>';
  html += '</body></html>';
  win.document.write(html);
  win.document.close();
}

/* -------- توليد صورة الإشعار (مشتركة بين صفحة المراكز والإدارة) --------
   تتطلب وجود عنصر: <canvas id="noticeCanvas" width="900" height="560" style="display:none;"></canvas> */

function loadImage_(src) {
  return new Promise(function (resolve) {
    if (!src) { resolve(null); return; }
    const img = new Image();
    // يسمح بتحميل الشعار من رابط خارجي (قوقل درايف مثلاً) بدون ما "يلوّث" الكانفاس
    // ويمنعنا لاحقاً من تصدير الصورة بـ toDataURL()
    img.crossOrigin = 'anonymous';
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
  });
}

/* opts: { type, center, amount, sigDataUrl, adminSigDataUrl, adminLabel, senderName,
   receiverName, day, date, time, month, term, year } */
async function generateNoticeImage(opts) {
  const canvas = document.getElementById('noticeCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // نتأكد إن خط "Tajawal" (وخط "Amiri" للعناوين) متحمّلين فعلياً بالمتصفح
  // قبل ما نرسم النص على الكانفاس، وإلا يرجع لخط افتراضي غير واضح
  try {
    await Promise.all([
      document.fonts.load('bold 34px Amiri'),
      document.fonts.load('20px Tajawal'),
      document.fonts.load('bold 23px Tajawal')
    ]);
  } catch (e) { /* تجاهل - المتصفحات القديمة جداً ما تدعم document.fonts */ }

  const [sigImg, adminImg, logoImg] = await Promise.all([
    loadImage_(opts.sigDataUrl), loadImage_(opts.adminSigDataUrl),
    loadImage_(typeof FURQAN_LOGO_URL !== 'undefined' ? FURQAN_LOGO_URL : '')
  ]);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#FBF8F3';
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#8C1A2C');
  grad.addColorStop(1, '#6e1523');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 130);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px Tajawal, sans-serif';
  ctx.fillText('جمعية فرقان لتحفيظ القرآن الكريم', W / 2, 34);
  ctx.font = '14px Tajawal, sans-serif';
  ctx.fillStyle = '#e8dcc8';
  ctx.fillText('إدارة التعليم النسائي - مكتب إشراف الداخل', W / 2, 62);
  ctx.font = 'bold 17px Tajawal, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText('وحدة المقاصف', W / 2, 92);

  if (logoImg) {
    const logoSize = 84;
    ctx.save();
    ctx.beginPath();
    ctx.arc(W - 88, 65, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(logoImg, W - 88 - logoSize / 2, 65 - logoSize / 2, logoSize, logoSize);
    ctx.restore();
  }

  ctx.fillStyle = '#8C1A2C';
  ctx.font = 'bold 34px Amiri, serif';
  ctx.fillText('إشعار ' + opts.type, W / 2, 192);

  ctx.strokeStyle = '#C2AA85';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 148, W - 80, 330);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2b2321';
  const rx = W - 90;

  // صندوق واحد صغير أعلى الإطار مع تسمية فوقه (بأسلوب سند القبض المرفق)
  ctx.save();
  const boxW = 160, boxH = 42, boxX = rx - boxW, boxY = 178;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a7d76';
  ctx.font = 'bold 13px Tajawal, sans-serif';
  ctx.fillText('المبلغ بالريال السعودي', boxX + boxW / 2, boxY - 8);

  ctx.fillStyle = '#F3ECDD';
  ctx.strokeStyle = '#C2AA85';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 7); else ctx.rect(boxX, boxY, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6e1523';
  ctx.font = 'bold 22px Tajawal, sans-serif';
  ctx.fillText(toArabicAmountStr(opts.amount), boxX + boxW / 2, boxY + 28);
  ctx.restore();

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2b2321';

  // اليوم / التاريخ (هجري وميلادي)
  ctx.font = '22px Tajawal, sans-serif';
  ctx.fillText('اليوم: ' + (opts.day || ''), rx, 253);
  const hijri = opts.date ? toHijriNumericStr(opts.date) : '';
  const greg = opts.date ? toGregorianArabicStr(opts.date) : '';
  ctx.fillText('التاريخ: ' + hijri + (greg ? (' (' + greg + ')') : ''), rx, 286);

  // سطر: استلمنا من مركز: [المركز] (خط منقّط بأسلوب سند القبض)
  const verb = opts.type === 'تسليم' ? 'سلّمنا مركز' : 'استلمنا من مركز';
  drawDottedField_(ctx, rx, 334, W - 160, verb + ':', opts.center || '');

  // سطر: مبلغ وقدره (كتابةً) + نقداً - رقم المبلغ نفسه بارز داخل صندوق أعلى الإطار
  drawDottedField_(ctx, rx, 376, W - 160, 'مبلغ وقدره:',
    amountToArabicWords(opts.amount) + ' نقداً',
    { valueFont: '16.5px Tajawal, sans-serif' });

  // سطر: وذلك (السبب) - قيمة المبيعات (استلام) أو مكافأة المتعاونة (تسليم)
  // opts.reason: نص بيان مخصص (مثل "قيمة رسوم حفل تحفيظ الصغار") يلغي البيان الافتراضي - يُستخدم لأنواع إشعارات فرعية جديدة بدون تعديل هذي الدالة
  const reasonLine = opts.reason
    ? opts.reason
    : (opts.type === 'تسليم'
      ? 'مكافأة لمتعاونة المقصف'
      : 'قيمة مبيعات المقصف ' + monthsPhrase(opts.months) +
        ' للفصل الدراسي ' + (opts.term || '.......') + ' لعام ' + (opts.year || '.......'));
  drawDottedField_(ctx, rx, 418, W - 160, 'وذلك:', reasonLine, { valueFont: '16.5px Tajawal, sans-serif' });

  ctx.textAlign = 'center';
  ctx.font = '18px Tajawal, sans-serif';
  ctx.fillStyle = '#8a7d76';
  ctx.fillText('توقيع المسلّمة' + (opts.senderName ? (': ' + opts.senderName) : ''), W * 0.28, 508);
  ctx.fillText((opts.adminLabel || 'توقيع المستلمة') + (opts.receiverName ? (': ' + opts.receiverName) : ''), W * 0.72, 508);

  if (sigImg) ctx.drawImage(sigImg, W * 0.28 - 130, 518, 260, 85);
  if (adminImg) ctx.drawImage(adminImg, W * 0.72 - 130, 518, 260, 85);

  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 615); ctx.lineTo(W * 0.28 + 130, 615); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.72 - 130, 615); ctx.lineTo(W - 60, 615); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a7d76';
  ctx.font = '16px Tajawal, sans-serif';
  ctx.fillText('تم إنشاء هذا الإشعار آلياً عبر نظام وحدة المقاصف', W / 2, H - 16);

  return canvas.toDataURL('image/png');
}

/* تفاف نص طويل على أكثر من سطر داخل الكانفاس (لدعم جملة "قيمة مبيعات المقصف...") */
function wrapText_(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  words.forEach(function (word) {
    const test = line ? (line + ' ' + word) : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lineHeight); });
  return lines.length;
}

/* يرسم "حقل" على شكل سند رسمي: تسمية + خط منقّط + القيمة فوق الخط،
   بنفس أسلوب سندات القبض المطبوعة (تسمية على اليمين، خط نقاط يمتلئ بالقيمة). */
function drawDottedField_(ctx, rx, y, width, label, value, opts) {
  opts = opts || {};
  const labelFont = opts.labelFont || 'bold 19px Tajawal, sans-serif';
  const valueFont = opts.valueFont || '17px Tajawal, sans-serif';
  const labelColor = opts.labelColor || '#8C1A2C';
  const valueColor = opts.valueColor || '#2b2321';
  const bg = opts.bg || '#FBF8F3';
  const leftEdge = rx - width;

  ctx.save();
  ctx.strokeStyle = '#c9bfae';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(leftEdge, y);
  ctx.lineTo(rx, y);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'right';
  ctx.font = labelFont;
  const labelW = ctx.measureText(label).width;
  ctx.fillStyle = bg;
  ctx.fillRect(rx - labelW - 4, y - 20, labelW + 8, 26);
  ctx.fillStyle = labelColor;
  ctx.fillText(label, rx, y - 2);

  if (value) {
    const valueX = rx - labelW - 4;
    const maxValueWidth = width - labelW - 20;
    // نصغّر الخط تدريجياً لو النص أطول من المساحة المتاحة، عشان يبقى بسطر وحد
    // وما يتكسر أو يطلع خارج الخط المنقّط
    let fontSize = parseFloat(valueFont);
    const fontRest = valueFont.replace(/^[\d.]+px/, '').trim();
    ctx.font = valueFont;
    while (ctx.measureText(value).width > maxValueWidth && fontSize > 10) {
      fontSize -= 1;
      ctx.font = fontSize + 'px ' + fontRest;
    }
    const valueW = ctx.measureText(value).width;
    ctx.fillStyle = bg;
    ctx.fillRect(valueX - valueW - 6, y - 20, valueW + 10, 26);
    ctx.fillStyle = valueColor;
    ctx.fillText(value, valueX, y - 2);
  }
}

/* -------- لوحة توقيع بالإصبع/الفأرة -------- */
function initSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.strokeStyle = '#2b2321';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  let drawing = false;

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  function start(e) { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); }
  function move(e) { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); }
  function end() { drawing = false; }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  return { clear: function () { ctx.clearRect(0, 0, canvas.width, canvas.height); } };
}

/* -------- توقيع بخيارين: رسم بالإصبع أو رفع صورة جاهزة --------
   يتطلب وجود عنصرين بجانب الـ canvas بنفس الـ id: id_file (input file) و id_preview (img) و id_drawWrap و id_uploadWrap */
const _sigWidgets = {};

function setupSignatureWidget(id) {
  _sigWidgets[id] = { mode: 'draw', uploadDataUrl: null, pad: initSignaturePad(id) };
  const fileInput = document.getElementById(id + '_file');
  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        _sigWidgets[id].uploadDataUrl = ev.target.result;
        const img = document.getElementById(id + '_preview');
        img.src = ev.target.result;
        img.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    });
  }
  return _sigWidgets[id];
}

function setSigMode(id, mode) {
  if (!_sigWidgets[id]) return;
  _sigWidgets[id].mode = mode;
  const drawWrap = document.getElementById(id + '_drawWrap');
  const uploadWrap = document.getElementById(id + '_uploadWrap');
  if (drawWrap) drawWrap.classList.toggle('hidden', mode !== 'draw');
  if (uploadWrap) uploadWrap.classList.toggle('hidden', mode !== 'upload');
  document.querySelectorAll('[data-sigtoggle="' + id + '"]').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });
}

function clearSignatureWidget(id) {
  const w = _sigWidgets[id];
  if (!w) return;
  if (w.pad) w.pad.clear();
  w.uploadDataUrl = null;
  const img = document.getElementById(id + '_preview');
  if (img) { img.src = ''; img.classList.add('hidden'); }
  const inp = document.getElementById(id + '_file');
  if (inp) inp.value = '';
}

function getSignatureDataUrl(id) {
  const w = _sigWidgets[id];
  if (w && w.mode === 'upload') return w.uploadDataUrl || '';
  const canvas = document.getElementById(id);
  return canvas ? canvas.toDataURL('image/png') : '';
}
