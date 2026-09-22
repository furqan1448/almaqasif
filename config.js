// ⚠️ حطي هنا رابط الـ Web app اللي طلعلك من Google Apps Script بعد الـ Deploy
const API_URL = "https://script.google.com/macros/s/AKfycbzxQj8PyFM2l6Cejx0M5c27h42SvpZ8elmvEI5dTQTNUpiGyo64yjs4tFmdj9mXqFm1/exec";

/* ------------------- تخزين مؤقت خفيف من جهة المتصفح لطلبات القراءة -------------------
   الهدف: تقليل عدد الطلبات لـ Apps Script بدون تغيير أي نتيجة أو سلوك ظاهر للمستخدمة.
   - أي إجراء اسمه يبدأ بـ "get" (قراءة بيانات) يُخزَّن لمدة قصيرة (20 ثانية) بنفس
     معطياته بالضبط؛ لو تكرر نفس الطلب خلال هالمدة (مثلاً بالتنقل بين الشاشات) يرجع
     من الذاكرة فوراً بدل إعادة الاتصال بالسيرفر.
   - لو صار طلبان لنفس القراءة بنفس اللحظة (قبل ما يوصل ردّ الأول)، الثاني يشارك
     نفس الطلب الجالس بدل ما يبعت طلب مكرر.
   - أي إجراء غير "get..." (حفظ/تعديل/حذف/تسجيل دخول) يفرّغ هذا التخزين تلقائياً
     فور نجاحه، عشان أي قراءة بعده ترجع البيانات المحدّثة دايماً ولا يصير تعارض. */
const _apiCache_ = new Map();
const _apiInFlight_ = new Map();
const API_CACHE_MS = 20000;

function _apiCacheKey_(action, data) {
  const clean = Object.assign({}, data || {});
  const sortedKeys = Object.keys(clean).sort();
  const sorted = {};
  sortedKeys.forEach(function (k) { sorted[k] = clean[k]; });
  return action + '|' + JSON.stringify(sorted);
}

/* طلب واحد بمهلة زمنية (10 ثواني) - لو تأخر أكثر من كذا نعتبره فاشل ونعيد المحاولة،
   بدل ما يظل معلّق للأبد بدون ما يوصل رد ولا خطأ (هذا اللي يسبب "أحياناً تطلع
   وأحياناً لا" مع اتصالات الجوال المتذبذبة). */
function _fetchWithTimeout_(url, opts, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () { reject(new Error('timeout')); }, timeoutMs);
    fetch(url, opts).then(function (res) {
      clearTimeout(timer); resolve(res);
    }, function (err) {
      clearTimeout(timer); reject(err);
    });
  });
}

/* تعيد تنفيذ نفس الطلب تلقائياً وبصمت (بدون ما تشوف المستخدمة أي خطأ) لين 3 محاولات
   قبل ما نستسلم فعلاً - أغلب حالات التذبذب بشبكات الجوال (خصوصاً Private Relay بسفاري)
   تنجح من المحاولة الثانية أو الثالثة مباشرة. */
async function _fetchWithRetry_(url, opts, attempts) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await _fetchWithTimeout_(url, opts, 10000);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise(function (r) { setTimeout(r, 400); });
    }
  }
  throw lastErr;
}

async function callApi(action, data) {
  const isRead = action.indexOf('get') === 0;
  const key = isRead ? _apiCacheKey_(action, data) : null;

  if (isRead) {
    const cached = _apiCache_.get(key);
    if (cached && (Date.now() - cached.time) < API_CACHE_MS) return cached.value;
    if (_apiInFlight_.has(key)) return _apiInFlight_.get(key);
  }

  const payload = Object.assign({ action: action }, data || {});
  const requestPromise = _fetchWithRetry_(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  }, 3).then(function (res) { return res.json(); });

  if (!isRead) {
    // أي طلب حفظ/تعديل/حذف: نفرّغ كل الكاش فور نجاحه عشان الشاشات التالية تجيب بيانات محدّثة
    return requestPromise.then(function (result) {
      _apiCache_.clear();
      return result;
    });
  }

  _apiInFlight_.set(key, requestPromise);
  try {
    const result = await requestPromise;
    _apiCache_.set(key, { value: result, time: Date.now() });
    return result;
  } finally {
    _apiInFlight_.delete(key);
  }
}

/* تخلي أي زر حفظ/إرسال يبيّن إنه انضغط فوراً (يتعطّل + تظهر دوّارة تحميل)
   عشان اللي يستخدم النظام ما يضغط عليه أكثر من مرة وهو يحسب إنه ما انضغط.
   استخدام: setBtnBusy(btn, true) قبل استدعاء callApi، و setBtnBusy(btn, false) بعد الرد (نجح أو فشل). */
function setBtnBusy(btn, busy, busyText) {
  if (!btn) return;
  if (busy) {
    if (btn.dataset.originalHtml === undefined) btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ' + (busyText || 'جارِ الحفظ...');
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml !== undefined) {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }
  }
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  btn.innerHTML = isHidden
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
}

/* ------------------- قائمة منسدلة قابلة للبحث (بديل عن select العادي) -------------------
   inputId: عنصر input نصي يكتب فيه المستخدم ويظهر فيه الاختيار.
   dropdownId: عنصر div فاضي يوضع مباشرة بعد الـ input تُعرض فيه النتائج.
   getItems: دالة ترجع مصفوفة النصوص الحالية (تُستدعى وقت الفتح، عشان تنعكس أي تحديثات لاحقة).
   onEnterFallback: تُستدعى لو ضغطت Enter والقائمة مقفلة أو ما فيه عنصر محدد (مثلاً لتسجيل الدخول). */
function setupSearchableDropdown(inputId, dropdownId, getItems, onEnterFallback) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  let highlightIndex = -1;

  function filterItems(query) {
    const items = getItems() || [];
    const q = String(query || '').trim();
    if (!q) return items;
    return items.filter(function (it) { return String(it).indexOf(q) !== -1; });
  }

  function renderList(list) {
    dropdown.innerHTML = '';
    highlightIndex = -1;
    if (!list.length) {
      dropdown.innerHTML = '<div class="combo-empty">لا توجد نتائج مطابقة</div>';
    } else {
      list.forEach(function (item) {
        const div = document.createElement('div');
        div.className = 'combo-item';
        div.textContent = item;
        div.addEventListener('mousedown', function (e) {
          e.preventDefault();
          input.value = item;
          closeDropdown();
        });
        dropdown.appendChild(div);
      });
    }
    dropdown.classList.remove('hidden');
  }

  function openDropdown() { renderList(filterItems(input.value)); }
  function closeDropdown() { dropdown.classList.add('hidden'); }

  function updateHighlight() {
    const els = dropdown.querySelectorAll('.combo-item');
    els.forEach(function (el, i) { el.classList.toggle('active', i === highlightIndex); });
    if (highlightIndex >= 0 && els[highlightIndex]) els[highlightIndex].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('focus', openDropdown);
  input.addEventListener('click', openDropdown);
  input.addEventListener('input', openDropdown);
  input.addEventListener('blur', function () { setTimeout(closeDropdown, 150); });

  input.addEventListener('keydown', function (e) {
    const open = !dropdown.classList.contains('hidden');
    const els = dropdown.querySelectorAll('.combo-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { openDropdown(); return; }
      highlightIndex = Math.min(highlightIndex + 1, els.length - 1);
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIndex = Math.max(highlightIndex - 1, 0);
      updateHighlight();
    } else if (e.key === 'Enter') {
      if (open && highlightIndex >= 0 && els[highlightIndex]) {
        e.preventDefault();
        input.value = els[highlightIndex].textContent;
        closeDropdown();
        return;
      }
      closeDropdown();
      if (onEnterFallback) onEnterFallback();
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });
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
/* تحميل مكتبة XLSX عند الحاجة فقط (أول ضغطة على زر تصدير إكسل)، بدل تحميلها
   مع كل صفحة من البداية - المكتبة كبيرة الحجم (~1 ميجا) وما تُستخدم إلا نادراً،
   فتحميلها دايماً كان يبطّئ كل صفحة حتى لمن ما يحتاجون التصدير إطلاقاً. */
let _xlsxLoadPromise_ = null;
function ensureXlsxLoaded_() {
  if (typeof XLSX !== 'undefined') return Promise.resolve();
  if (_xlsxLoadPromise_) return _xlsxLoadPromise_;
  _xlsxLoadPromise_ = new Promise(function (resolve, reject) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = resolve;
    s.onerror = function () { _xlsxLoadPromise_ = null; reject(new Error('تعذر تحميل مكتبة XLSX')); };
    document.head.appendChild(s);
  });
  return _xlsxLoadPromise_;
}

/* -------- فلتر الفصل الدراسي (سجلات المبيعات/المرتجعات/الفواتير/إشعاراتي) --------
   تعبّي قائمة <select id="selectId"> بخيار "الفصل الحالي" (افتراضي) + "كل الفصول" +
   كل فصل دراسي سبق ترحيله. ترجع Promise حتى تنتظرين التعبئة قبل قراءة القيمة المختارة.
   ما تعيد التعبئة لو معبّية أصلاً (عشان ما تفقد المستخدمة اختيارها كل ما يعاد تحميل السجل). */
function populateTermFilter_(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return Promise.resolve();
  if (sel.dataset.filled === '1') return Promise.resolve();
  return callApi('getTermsList', {}).then(function (r) {
    sel.innerHTML = '<option value="current">الفصل الحالي</option><option value="all">كل الفصول</option>';
    (r.terms || []).forEach(function (t) {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      sel.appendChild(opt);
    });
    sel.dataset.filled = '1';
  });
}

/* -------- أرشفة الفصل السابق (ترحيل بيانات الفصل الحالي) --------
   مشتركة بين مراكز/مسؤولات/إدارة. تتطلب وجود عنصرين بنفس الصفحة:
   <select id="termNumberSelect"> و <input id="termYearInput">
   وزر بـ id="termArchiveBtn" onclick="submitTermArchive()" */
function submitTermArchive() {
  const num = document.getElementById('termNumberSelect').value;
  const year = document.getElementById('termYearInput').value.trim();
  if (!num) { alert('اختاري رقم الفصل الدراسي'); return; }
  if (!year) { alert('اكتبي السنة الهجرية'); return; }
  const label = 'الفصل الدراسي ' + num + ' ' + year + 'هـ';
  const sure = confirm(
    'بيتم ترحيل كل بيانات المبيعات والمرتجعات والفواتير والإشعارات "الحالية" (اللي ما انحطت لها تسمية فصل من قبل) وتسميتها بـ:\n\n"' + label + '"\n\n' +
    'البيانات نفسها تضل محفوظة بالكامل بالشيت، بس تصير موسومة باسم هذا الفصل بدل ما تكون "حالية". أي بيانات جديدة بعدها تُعتبر تلقائياً بداية فصل جديد.\n\n' +
    'متأكدة إنك تبين تسوين هذا الآن؟'
  );
  if (!sure) return;
  const btn = document.getElementById('termArchiveBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  callApi('archiveCurrentTerm', { termLabel: label }).then(function (r) {
    btn.disabled = false; btn.textContent = 'تأكيد الأرشفة';
    if (r.ok) {
      const c = r.counts || {};
      alert(
        'تم بنجاح ✅\n\nعدد الصفوف اللي انوسمت بـ "' + label + '":\n' +
        '- المبيعات: ' + (c['المبيعات'] || 0) + '\n' +
        '- المرتجعات: ' + (c['المرتجعات'] || 0) + '\n' +
        '- الفواتير: ' + (c['الفواتير'] || 0) + '\n' +
        '- الإشعارات: ' + (c['الإشعارات'] || 0)
      );
      document.getElementById('termNumberSelect').value = '';
      document.getElementById('termYearInput').value = '';
      document.querySelectorAll('.term-filter-select').forEach(function (s) { delete s.dataset.filled; });
      if (typeof showView === 'function') showView('homeView');
    } else {
      alert('صار خطأ: ' + (r.error || 'غير معروف'));
    }
  });
}

async function exportToExcel(data, filename, sheetName, totals) {
  if (!data || !data.length) {
    alert('لا يوجد بيانات لتصديرها');
    return;
  }
  try {
    await ensureXlsxLoaded_();
  } catch (e) {
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

/* -------- بناء محتوى "تقرير الزيارة اليومي" كـ HTML (يُستخدم بالطباعة، وبحفظ/مشاركة PDF) --------
   opts: { center, year, term, morning, evening, day, hijriDate, visitType, visitNumber,
           notesLines: [نص لكل صف], recommendation }
   ملاحظة: كل حقول التقرير (المركز، اليوم، التاريخ الهجري) تُكتب يدويًا بالنموذج، بدون أي تحويل تلقائي */
function buildVisitReportHTML(opts) {
  const rowsCount = Math.max(1, (opts.notesLines || []).length);
  const boxChar = function (checked) { return checked ? '☑' : '☐'; };

  let html = '<div class="vr-doc">';
  const letterheadUrl = (typeof FURQAN_LETTERHEAD_URL !== 'undefined') ? FURQAN_LETTERHEAD_URL : '';
  if (letterheadUrl) html += '<img class="vr-letterhead" src="' + letterheadUrl + '" width="1600" height="281" alt="كليشة جمعية فرقان">';

  html += '<div class="vr-content">';
  html += '<h1 class="vr-title">تقرير الزيارة اليومي</h1>';
  html += '<div class="vr-infoline">';
  html += '<span style="display:flex;align-items:center;gap:14px;">';
  html += '<span>المركز: ' + (opts.center || '') + '</span>';
  html += '<span class="vr-chk">' + boxChar(opts.morning) + ' صباحي &nbsp;&nbsp; ' + boxChar(opts.evening) + ' مسائي</span>';
  html += '</span>';
  html += '<span>لعام ' + toArabicDigits(opts.year || '') + 'هـ للفصل الدراسي ' + (opts.term || 'الأول') + '</span>';
  html += '</div>';
  html += '<div class="vr-subject">بشأن: أوضاع المقصف</div>';

  html += '<table class="vr-info-table"><tr class="vr-hdr-row">';
  html += '<td>اليوم: <span class="vr-value">' + (opts.day || '') + '</span></td>';
  html += '<td>التاريخ: <span class="vr-value">' + (opts.hijriDate || '') + '</span></td>';
  html += '<td>رقم الزيارة: <span class="vr-value">' + toArabicDigits(opts.visitNumber || '') + '</span></td>';
  html += '<td>نوع الزيارة: <span class="vr-value">' + (opts.visitType || '') + '</span></td>';
  html += '</tr></table>';

  html += '<table class="vr-notes-table"><tr class="vr-hdr-row"><td class="vr-mcell">م</td><td>الملاحظة</td><td>التوصية</td></tr>';
  for (let i = 0; i < rowsCount; i++) {
    const note = (opts.notesLines && opts.notesLines[i]) ? opts.notesLines[i] : '';
    html += '<tr><td class="vr-mcell vr-value">' + toArabicDigits(i + 1) + '</td><td class="vr-notecell" style="height:calc(56px * var(--z, 1));">' + note + '</td>';
    if (i === 0) {
      html += '<td class="vr-reccell" rowspan="' + rowsCount + '">' + (opts.recommendation || '') + '</td>';
    }
    html += '</tr>';
  }
  html += '</table>';

  const sigUrl = opts.signatureDataUrl || ((typeof FURQAN_UNIT_HEAD_SIGNATURE_URL !== 'undefined') ? FURQAN_UNIT_HEAD_SIGNATURE_URL : '');
  const sigScale = (opts.sigScale && opts.sigScale > 0) ? opts.sigScale : 1;
  const sigW = Math.round(140 * sigScale);
  const sigH = Math.round(80 * sigScale);
  html += '<div class="vr-footer">';
  html += '<span class="vr-footer-col"><span>رئيسة وحدة المقاصف</span><span>' + (opts.headName || 'فاطمة مبارك الكثيري') + '</span>';
  if (sigUrl) html += '<img class="vr-sig" style="max-width:calc(' + sigW + 'px * var(--z, 1));max-height:calc(' + sigH + 'px * var(--z, 1));" src="' + sigUrl + '" alt="توقيع" onerror="this.style.display=\'none\';">';
  html += '</span>';
  html += '<span class="vr-footer-col"><span>مديرة المركز</span><span>' + (opts.centerHeadName || '') + '</span></span>';
  html += '</div>';
  html += '</div></div>';
  return html;
}

/* نفس ستايل .vr-* الموجود بـ style.css، بس مكرر هنا كنص عشان نافذة الطباعة صفحة منفصلة
   ما توصل لملف style.css (نفس أسلوب بقية دوال الطباعة بهذا الملف) */
const VR_DOC_CSS_ =
  '.vr-doc{width:100%;margin:0;padding:0;}' +
  '.vr-doc,.vr-doc *{letter-spacing:normal !important;}' +
  '.vr-letterhead{width:100%;height:auto;display:block;margin:0;padding:0;border:0;}' +
  '@media print{ .vr-letterhead{ -webkit-print-color-adjust:exact; print-color-adjust:exact; } }' +
  '.vr-content{--z:1;padding:calc(10px * var(--z)) 30px calc(24px * var(--z));}' +
  '.vr-title{font-family:"Amiri",serif;color:#8C1A2C;margin:calc(10px * var(--z)) 0 calc(14px * var(--z));font-size:calc(1.55rem * var(--z));text-align:center;}' +
  '.vr-infoline{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:calc(0.95rem * var(--z));margin-bottom:calc(10px * var(--z));flex-wrap:wrap;gap:8px;}' +
  '.vr-subject{font-weight:800;margin:calc(6px * var(--z)) 0 calc(12px * var(--z));font-size:calc(0.95rem * var(--z));color:#8C1A2C;}' +
  '.vr-info-table,.vr-notes-table{width:100%;border-collapse:collapse;font-size:calc(0.88rem * var(--z));margin-bottom:0;}' +
  '.vr-info-table td,.vr-notes-table td{border:1px solid #2b2321;padding:calc(9px * var(--z)) 10px;text-align:center;vertical-align:middle;}' +
  '.vr-hdr-row td{background:#F2F2F2;font-weight:800;}' +
  '.vr-value{color:#8C1A2C;font-weight:800;}' +
  '.vr-notecell{text-align:right;padding-right:14px;}' +
  '.vr-mcell{width:5%;font-weight:800;}' +
  '.vr-reccell{width:38%;text-align:right;padding-right:14px;font-weight:700;color:#2b2321;}' +
  '.vr-footer{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:calc(28px * var(--z));font-weight:800;font-size:calc(1em * var(--z));break-inside:avoid;}' +
  '.vr-footer-col{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;text-align:center;}' +
  '.vr-sig{object-fit:contain;}';

/* -------- تصغير محتوى التقرير تلقائيًا ليكفي بصفحة A4 عرضية واحدة --------
   الكليشة تبقى بحجمها الكامل ملتصقة بأعلى الصفحة، والذي يتصغّر هو المحتوى (الجدول والنص) فقط،
   عن طريق المتغير --z (1 = الحجم الطبيعي). لو الملاحظات كثيرة جدًا وما كفى التصغير
   (أقل من 55%) يكمل على صفحة ثانية عادي. */
function fitVisitReportToPage_(root, done) {
  const content = root ? root.querySelector('.vr-content') : null;
  const img = root ? root.querySelector('.vr-letterhead') : null;
  function run() {
    if (content) {
      const prevW = root.style.width;
      root.style.width = '1123px';            // عرض A4 العرضي بالبكسل، عشان القياس يطابق الطباعة
      content.style.setProperty('--z', '1');
      const pageH = 794 - 6;                  // ارتفاع A4 العرضي (210مم) مع هامش أمان صغير
      const lhH = img ? img.offsetHeight : 0;
      let z = 1;
      for (let i = 0; i < 40 && z > 0.55 && (lhH + content.offsetHeight) > pageH; i++) {
        z = Math.max(0.55, z - 0.02);
        content.style.setProperty('--z', String(z));
      }
      root.style.width = prevW;
    }
    if (done) done();
  }
  if (img && !img.complete) {
    img.addEventListener('load', run);
    img.addEventListener('error', run);
  } else {
    run();
  }
}

/* -------- طباعة "تقرير الزيارة اليومي" (فتح نافذة طباعة، تقدري منها "حفظ كـ PDF" أيضًا) -------- */
/* معاينة وطباعة: نجهّز التقرير كـPDF (نفس مسار «حفظ PDF» بالضبط: الكليشة ملتصقة بأعلى الصفحة وبنفس الخطوط)
   ونفتحه بتبويب جديد، ومنه تطبعين بـ Ctrl+P. هذا يتجنب هوامش نافذة الطباعة اللي كانت تسبب مسافة فاضية فوق الكليشة.
   لو مكتبة الـPDF ما اشتغلت نرجع للطباعة المباشرة القديمة. */
async function printVisitReportWindow(opts) {
  if (typeof html2pdf === 'undefined' || !document.getElementById('vrPdfHost')) {
    printVisitReportWindowLegacy_(opts);
    return;
  }
  const win = window.open('', '_blank');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع عشان تقدري تطبعي التقرير');
    return;
  }
  try { win.document.write('<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>جاري تجهيز التقرير</title></head><body style="font-family:sans-serif;text-align:center;padding-top:80px;">جاري تجهيز التقرير للطباعة...</body></html>'); } catch (e) {}
  try {
    const host = renderVisitReportToHost_(opts);
    if (!host) { win.close(); return; }
    const blob = await visitReportPdfBlob_(host, visitReportFileName_(opts));
    win.location.href = URL.createObjectURL(blob);
  } catch (e) {
    try { win.close(); } catch (e2) {}
    printVisitReportWindowLegacy_(opts);
  }
}

function printVisitReportWindowLegacy_(opts) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع عشان تقدري تطبعي التقرير');
    return;
  }
  let html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">';
  html += '<title>تقرير الزيارة اليومي - ' + (opts.center || '') + '</title>';
  html += '<style>';
  html += '@import url(\'https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Tajawal:wght@400;500;700;800&display=swap\');';
  html += '@page { size: A4 landscape; margin: 0; }';
  html += '*{box-sizing:border-box;}';
  html += 'html,body{margin:0;padding:0;}';
  html += 'body{font-family:"Tajawal",sans-serif;direction:rtl;color:#2b2321;}';
  html += VR_DOC_CSS_;
  html += '</style></head><body>';
  html += buildVisitReportHTML(opts);
  html += '<script>' + fitVisitReportToPage_.toString() +
          ';window.onload = function(){ fitVisitReportToPage_(document.querySelector(".vr-doc"), function(){ setTimeout(function(){ window.print(); }, 350); }); };<\/script>';
  html += '</body></html>';
  win.document.write(html);
  win.document.close();
}

/* -------- حفظ ومشاركة "تقرير الزيارة اليومي" كملف PDF فعلي --------
   يعتمد على: 1) مكتبة html2pdf.js (لازم تكون محمّلة بالصفحة عبر <script> بالـ head)
              2) عنصر مخفي بالصفحة: <div id="vrPdfHost"></div> */
function visitReportFileName_(opts) {
  const safeCenter = String(opts.center || 'تقرير').replace(/[\\/:*?"<>|]/g, '').trim() || 'تقرير';
  return 'تقرير-الزيارة-' + safeCenter + '.pdf';
}

function renderVisitReportToHost_(opts) {
  const host = document.getElementById('vrPdfHost');
  if (!host) { alert('تعذّر تجهيز التقرير (عنصر vrPdfHost غير موجود بالصفحة)'); return null; }
  host.innerHTML = buildVisitReportHTML(opts);
  return host;
}

/* مكتبة تحويل الصفحة لصورة (html2canvas) ترسم كل نص كأنه إنجليزي (يسار→يمين)، فتنعكس النقطتين (:) والأرقام
   والرموز بجانب الكلمات العربية. نلف كل نص عربي بعلامة اتجاه (RTL) داخل النسخة المؤقتة فقط، وما تتأثر الشاشة. */
function vrFixBidiForCanvas_(doc) {
  const root = doc.querySelector('.vr-doc');
  if (!root) return;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(function (t) {
    const v = t.nodeValue;
    if (v && /[\u0600-\u06FF0-9]/.test(v)) t.nodeValue = '\u202B' + v + '\u202C';
  });
}

function visitReportPdfOptions_(fileName) {
  return {
    margin: 0,
    filename: fileName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: 1123, onclone: vrFixBidiForCanvas_ },
    jsPDF: { unit: 'mm', format: [297, 210], orientation: 'landscape' }
  };
}

/* تجهيز عامل html2pdf مع تثبيت موضع التقرير بأعلى-يسار الحاوية المؤقتة بعرض A4 بالضبط.
   السبب: الموقع كله RTL، ومكتبة html2pdf تحط حاويتها بـ margin:auto وحسب عرض الشاشة، فكانت
   الصفحة تنزاح (مسافة بيضاء + الكليشة تنقص) خصوصًا بالجوال. هنا نلغي هذا الاعتماد على عرض الشاشة. */
function visitReportPdfWorker_(host, fileName) {
  return html2pdf().set(visitReportPdfOptions_(fileName)).from(host)
    .toContainer().get('container').then(function (c) {
      if (c.parentElement) c.parentElement.style.direction = 'ltr';
      c.style.position = 'absolute';
      c.style.top = '0';
      c.style.left = '0';
      c.style.right = 'auto';
      c.style.margin = '0';
      c.style.width = '1123px';
      c.style.direction = 'rtl';
    }).toCanvas().toPdf();
}

/* توليد ملف PDF (Blob) من التقرير.
   الطريقة الأساسية: مكتبة html-to-image ترسم الصفحة بمحرك المتصفح نفسه، فيطلع العربي بنفس شكل الطباعة
   (حروف متصلة، النقطتين والأرقام بمكانها الصحيح). لو المكتبة ما تحمّلت نرجع للطريقة القديمة. */
/* تجهيز خطوط الموقع (Tajawal وAmiri) مضمّنة كنص Base64 عشان تنرسم بالـPDF بنفس السماكة والشكل اللي تشوفينه بالموقع.
   بدون هذا الرسم يستخدم خط بديل بسماكة مختلفة. يتحمّل مرة وحدة ويُخزّن. */
let vrFontCssPromise_ = null;
function vrFontEmbedCss_() {
  if (vrFontCssPromise_) return vrFontCssPromise_;
  vrFontCssPromise_ = (async function () {
    const link = document.querySelector('link[href*="fonts.googleapis.com/css"]');
    const cssUrl = link ? link.href : 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700;800&display=swap';
    const css = await (await fetch(cssUrl)).text();
    const blocks = css.split('/* ').slice(1).map(function (b) { return '/* ' + b; })
      .filter(function (b) { return /^\/\* (arabic|latin) \*\//.test(b); });
    let out = '';
    for (const blk of blocks) {
      const m = blk.match(/url\(([^)]+)\)/);
      if (!m) continue;
      const fontUrl = m[1].replace(/["']/g, '');
      const fontBlob = await (await fetch(fontUrl)).blob();
      const dataUrl = await new Promise(function (resolve) {
        const fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.readAsDataURL(fontBlob);
      });
      out += blk.replace(m[0], 'url(' + dataUrl + ')');
    }
    return out;
  })().catch(function (e) {
    console.warn('font embed failed', e);
    vrFontCssPromise_ = null;
    return '';
  });
  return vrFontCssPromise_;
}

async function visitReportPdfBlob_(host, fileName) {
  // العنصر vrPdfHost ممكن يكون داخل تبويب مخفي (حجمه صفر)، فنجهّز نسخة مؤقتة خارج الشاشة بعرض A4 عشان القياس والرسم يكونون صحيحين
  const tmp = document.createElement('div');
  tmp.style.cssText = 'position:fixed;left:-20000px;top:0;width:1123px;background:#fff;pointer-events:none;';
  tmp.innerHTML = host.innerHTML;
  document.body.appendChild(tmp);
  try {
    const el = tmp.querySelector('.vr-doc');
    await Promise.all(Array.from(tmp.querySelectorAll('img')).map(function (im) {
      return im.complete ? Promise.resolve() : new Promise(function (res) { im.onload = im.onerror = res; });
    }));
    await new Promise(function (resolve) { fitVisitReportToPage_(el, resolve); });
    // نرجّع نفس نسبة التصغير للنسخة الأصلية (تحتاجها الطريقة الاحتياطية)
    const z = el.querySelector('.vr-content').style.getPropertyValue('--z') || '1';
    const hostContent = host.querySelector('.vr-content');
    if (hostContent) hostContent.style.setProperty('--z', z);

    if (typeof htmlToImage !== 'undefined') {
      try {
        const imgOpts = {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          width: 1123,
          imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
          style: { width: '1123px', margin: '0' }
        };
        const fontCss = await vrFontEmbedCss_();
        if (fontCss) imgOpts.fontEmbedCSS = fontCss;
        const canvas = await htmlToImage.toCanvas(el, imgOpts);
        return await html2pdf().set(visitReportPdfOptions_(fileName)).from(canvas, 'canvas').outputPdf('blob');
      } catch (e) {
        console.warn('html-to-image failed, falling back to html2canvas', e);
      }
    }
  } finally {
    tmp.remove();
  }
  return await visitReportPdfWorker_(host, fileName).outputPdf('blob');
}

function vrDownloadBlob_(blob, fileName) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

/* حفظ التقرير مباشرة كملف PDF بجهاز المستخدمة */
function saveVisitReportPdf(opts) {
  const host = renderVisitReportToHost_(opts);
  if (!host) return;
  if (typeof html2pdf === 'undefined') { alert('تعذّر تحميل أداة إنشاء PDF، تأكدي من اتصالك بالإنترنت وحاولي مرة ثانية'); return; }
  const fileName = visitReportFileName_(opts);
  fitVisitReportToPage_(host.querySelector('.vr-doc'), function () {
    visitReportPdfBlob_(host, fileName).then(function (blob) {
      vrDownloadBlob_(blob, fileName);
    }).catch(function () {
      alert('صار خطأ أثناء إنشاء ملف الـPDF، حاولي مرة أخرى');
    });
  });
}

/* مشاركة التقرير كملف PDF عبر واتساب (تفتح شاشة المشاركة العادية بالجوال، وتختارين منها جهة الاتصال) */
async function shareVisitReportPdf(opts) {
  const host = renderVisitReportToHost_(opts);
  if (!host) return;
  if (typeof html2pdf === 'undefined') { alert('تعذّر تحميل أداة إنشاء PDF، تأكدي من اتصالك بالإنترنت وحاولي مرة ثانية'); return; }
  const fileName = visitReportFileName_(opts);
  try {
    await new Promise(function (resolve) { fitVisitReportToPage_(host.querySelector('.vr-doc'), resolve); });
    const blob = await visitReportPdfBlob_(host, fileName);
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'تقرير الزيارة اليومي',
        text: 'تقرير الزيارة اليومي - ' + (opts.center || '')
      });
    } else {
      alert('جهازك ما يدعم مشاركة الملفات مباشرة من المتصفح. راح نحفظ التقرير كملف PDF بدلاً من ذلك، وبعدها افتحي واتساب وأرفقيه يدويًا.');
      vrDownloadBlob_(blob, fileName);
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // ألغت المستخدمة نافذة المشاركة، ما فيه خطأ فعلي
    alert('صار خطأ أثناء تجهيز التقرير للمشاركة، حاولي مرة أخرى');
  }
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
  ctx.font = 'bold 18px Tajawal, sans-serif';
  ctx.fillStyle = '#8C1A2C';
  ctx.fillText('توقيع المسلّمة' + (opts.senderName ? (': ' + opts.senderName) : ''), W * 0.28, 508);
  ctx.fillText((opts.adminLabel || 'توقيع المستلمة') + (opts.receiverName ? (': ' + opts.receiverName) : ''), W * 0.72, 508);

  // صندوق التوقيع 300×110 (أكبر من قبل)، والصورة تنرسم داخله بنسبتها الأصلية بدون تمطيط
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawSignatureFit_(ctx, sigImg, W * 0.28, 514, 300, 110);
  drawSignatureFit_(ctx, adminImg, W * 0.72, 514, 300, 110);

  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 634); ctx.lineTo(W * 0.28 + 150, 634); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.72 - 150, 634); ctx.lineTo(W - 60, 634); ctx.stroke();

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

/* -------- معالجة صورة التوقيع (نفس أسلوب تقرير الزيارة) --------
   1) نقص المسافات الفاضية/البيضاء حوالين التوقيع، ونخلي الخلفية البيضاء شفافة
   2) نرسم التوقيع بنسبته الأصلية داخل صندوق ثابت بحجم صندوق التوقيع بالإشعار
   3) شريط "حجم التوقيع" يتحكم بحجمه داخل الصندوق (100% = أكبر حجم يسمح به الصندوق) */
const SIG_OUT_W_ = 900;   // نسبة 30:11 = نسبة صندوق التوقيع بصورة الإشعار (300×110)
const SIG_OUT_H_ = 330;

function trimToCanvas_(srcCanvas) {
  const w = srcCanvas.width, h = srcCanvas.height;
  if (!w || !h) return null;
  const work = document.createElement('canvas');
  work.width = w; work.height = h;
  const wctx = work.getContext('2d');
  wctx.drawImage(srcCanvas, 0, 0);
  const img = wctx.getImageData(0, 0, w, h);
  const d = img.data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let a = d[i + 3];
      if (a > 0) {
        const m = Math.min(d[i], d[i + 1], d[i + 2]);
        if (m >= 235) a = 0;                            // ورق أبيض/فاتح -> شفاف
        else if (m > 200) a = Math.round(a * (235 - m) / 35); // حافة ناعمة
        d[i + 3] = a;
      }
      if (a > 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;                            // ما فيه توقيع فعلي
  wctx.putImageData(img, 0, 0);
  const pad = 3;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(work, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

function composeSignature_(trimmed, scale) {
  const out = document.createElement('canvas');
  out.width = SIG_OUT_W_; out.height = SIG_OUT_H_;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const padRatio = 0.05;
  const maxW = SIG_OUT_W_ * (1 - 2 * padRatio), maxH = SIG_OUT_H_ * (1 - 2 * padRatio);
  const k = Math.min(maxW / trimmed.width, maxH / trimmed.height) * (scale > 0 ? scale : 1);
  const dw = trimmed.width * k, dh = trimmed.height * k;
  ctx.drawImage(trimmed, (SIG_OUT_W_ - dw) / 2, (SIG_OUT_H_ - dh) / 2, dw, dh);
  return out.toDataURL('image/png');
}

/* يرسم صورة التوقيع داخل صندوق (cx = منتصف الصندوق أفقيًا، top = أعلاه) بنسبتها الأصلية */
function drawSignatureFit_(ctx, img, cx, top, boxW, boxH) {
  if (!img || !img.width || !img.height) return;
  const k = Math.min(boxW / img.width, boxH / img.height);
  const dw = img.width * k, dh = img.height * k;
  ctx.drawImage(img, cx - dw / 2, top + (boxH - dh) / 2, dw, dh);
}

/* -------- توقيع بخيارين: رسم بالإصبع أو رفع صورة جاهزة --------
   يتطلب وجود عنصرين بجانب الـ canvas بنفس الـ id: id_file (input file) و id_preview (img) و id_drawWrap و id_uploadWrap */
const _sigWidgets = {};

function setupSignatureWidget(id) {
  _sigWidgets[id] = { mode: 'draw', uploadDataUrl: null, uploadTrimmed: null, scale: 1, pad: initSignaturePad(id) };
  const w = _sigWidgets[id];

  function refreshUploadPreview() {
    const img = document.getElementById(id + '_preview');
    if (!img || !w.uploadTrimmed) return;
    w.uploadDataUrl = composeSignature_(w.uploadTrimmed, w.scale);
    img.src = w.uploadDataUrl;
    img.classList.remove('hidden');
  }

  const fileInput = document.getElementById(id + '_file');
  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (ev) {
        const src = new Image();
        src.onload = function () {
          try {
            const c = document.createElement('canvas');
            c.width = src.naturalWidth; c.height = src.naturalHeight;
            c.getContext('2d').drawImage(src, 0, 0);
            w.uploadTrimmed = trimToCanvas_(c) || c;
            refreshUploadPreview();
          } catch (err) {
            // لو صار خطأ بالمعالجة نستخدم الصورة كما هي
            w.uploadTrimmed = null;
            w.uploadDataUrl = ev.target.result;
            const img = document.getElementById(id + '_preview');
            if (img) { img.src = ev.target.result; img.classList.remove('hidden'); }
          }
        };
        src.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // شريط حجم التوقيع (يُضاف تلقائيًا تحت خيارات الرسم/الرفع)
  const uploadWrap = document.getElementById(id + '_uploadWrap');
  if (uploadWrap && !document.getElementById(id + '_sizeRow')) {
    const row = document.createElement('div');
    row.id = id + '_sizeRow';
    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin:8px 0;';
    row.innerHTML = '<label style="margin:0;white-space:nowrap;">حجم التوقيع</label>' +
      '<input type="range" min="40" max="100" value="100" step="5" style="width:160px;" id="' + id + '_size">' +
      '<span id="' + id + '_sizeLabel" style="font-weight:700;color:var(--maroon,#8C1A2C);">100%</span>';
    uploadWrap.parentNode.insertBefore(row, uploadWrap.nextSibling);
    document.getElementById(id + '_size').addEventListener('input', function (ev) {
      w.scale = (Number(ev.target.value) || 100) / 100;
      document.getElementById(id + '_sizeLabel').textContent = ev.target.value + '%';
      refreshUploadPreview();
    });
  }
  return w;
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
  w.uploadTrimmed = null;
  const img = document.getElementById(id + '_preview');
  if (img) { img.src = ''; img.classList.add('hidden'); }
  const inp = document.getElementById(id + '_file');
  if (inp) inp.value = '';
}

function getSignatureDataUrl(id) {
  const w = _sigWidgets[id];
  const scale = w ? w.scale : 1;
  if (w && w.mode === 'upload') {
    if (w.uploadTrimmed) return composeSignature_(w.uploadTrimmed, scale);
    return w.uploadDataUrl || '';
  }
  const canvas = document.getElementById(id);
  if (!canvas) return '';
  try {
    const trimmed = trimToCanvas_(canvas);
    if (trimmed) return composeSignature_(trimmed, scale);
  } catch (e) { /* لو ما قدرنا نقص التوقيع نرجع الصورة كاملة */ }
  return canvas.toDataURL('image/png');
}
