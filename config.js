// ⚠️ حطي هنا رابط الـ Web app اللي طلعلك من Google Apps Script بعد الـ Deploy
const API_URL = "https://script.google.com/macros/s/AKfycbw0pCPaznO4wUB9dlSvWr2GxrbNPZjg-txq81P83nEJoDHaA_SmcV8tlDYPzClKV6fy/exec";

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

/* الأشهر الميلادية بالعربي - تُستخدم بقائمة "شهر مبيعات المقصف" بالإشعارات */
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/* الفصول الدراسية */
const AR_TERMS = ['الأول', 'الثاني', 'الثالث'];

/* تنسيق موحّد لعرض يوم/تاريخ/وقت بدون أي أصفار زايدة، مع توافق مع
   السجلات القديمة اللي ما فيها عمود "اليوم" أصلاً */
function formatDayDateTime(day, date, time) {
  const parts = [];
  if (day) parts.push('يوم ' + day);
  if (date) parts.push(date);
  if (time) parts.push(time);
  return parts.join(' · ');
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

/* تعبئة قائمة السنوات (الهجرية/الميلادية حسب رغبتها) بنطاق حول السنة الحالية */
function fillYearSelect(selectId, span) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const currentYear = new Date().getFullYear();
  sel.innerHTML = '';
  for (let y = currentYear - (span || 1); y <= currentYear + 1; y++) {
    const opt = document.createElement('option');
    opt.value = String(y); opt.textContent = String(y);
    if (y === currentYear) opt.selected = true;
    sel.appendChild(opt);
  }
}

/* -------- تصدير جداول البيانات إلى ملف Excel --------
   data: مصفوفة كائنات (كل كائن = صف، مفاتيحه هي أسماء الأعمدة)
   filename: اسم الملف بدون امتداد
   sheetName: اسم الورقة داخل ملف الإكسل (اختياري)
   يمكن فتح الملف الناتج مباشرة في Excel، أو استيراده في Google Sheets
   من قائمة File > Import داخل شيتس. */
function exportToExcel(data, filename, sheetName) {
  if (!data || !data.length) {
    alert('لا يوجد بيانات لتصديرها');
    return;
  }
  if (typeof XLSX === 'undefined') {
    alert('تعذر تحميل مكتبة التصدير، تأكدي من الاتصال بالإنترنت وحاولي مرة أخرى');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'بيانات');
  XLSX.writeFile(wb, filename + '.xlsx');
}

/* -------- تصدير/طباعة تقرير كـ PDF --------
   تفتح نافذة جديدة بتنسيق مرتب وتشغّل حوار الطباعة تلقائياً؛
   المستخدمة تقدر تختار "حفظ كـ PDF" من نافذة الطباعة نفسها (يعمل على الجوال وسطح المكتب).
   columns: مصفوفة [{key, label}], rows: مصفوفة كائنات بيانات */
function printReport(title, subtitle, columns, rows) {
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
  html += '@import url(\'https://fonts.googleapis.com/css2?family=Amiri:wght@700&family=Almarai:wght@400;700&display=swap\');';
  html += 'body{font-family:"Almarai",sans-serif;direction:rtl;padding:28px;color:#2b2321;}';
  html += 'h1{font-family:"Amiri",serif;color:#8C1A2C;margin:0 0 2px;font-size:1.5rem;}';
  html += '.sub{color:#8a7d76;margin-bottom:22px;font-size:0.9rem;}';
  html += 'table{width:100%;border-collapse:collapse;font-size:0.88rem;}';
  html += 'th,td{border:1px solid #C2AA85;padding:8px 10px;text-align:center;}';
  html += 'th{background:#e8dcc8;color:#6e1523;}';
  html += '@media print{ body{padding:10px;} }';
  html += '</style></head><body>';
  html += '<h1>جمعية فرقان لتحفيظ القرآن الكريم</h1>';
  html += '<div class="sub">' + title + (subtitle ? (' - ' + subtitle) : '') + ' &middot; ' + new Date().toLocaleDateString('ar-SA') + '</div>';
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

  const [sigImg, adminImg] = await Promise.all([
    loadImage_(opts.sigDataUrl), loadImage_(opts.adminSigDataUrl)
  ]);

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#FBF8F3';
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#8C1A2C');
  grad.addColorStop(1, '#6e1523');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 110);

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Almarai, sans-serif';
  ctx.fillText('جمعية فرقان لتحفيظ القرآن الكريم', W / 2, 48);
  ctx.font = '20px Almarai, sans-serif';
  ctx.fillStyle = '#e8dcc8';
  ctx.fillText('وحدة المقاصف', W / 2, 82);

  ctx.fillStyle = '#8C1A2C';
  ctx.font = 'bold 34px Amiri, serif';
  ctx.fillText('إشعار ' + opts.type, W / 2, 172);

  ctx.strokeStyle = '#C2AA85';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 128, W - 80, H - 298);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2b2321';
  const rx = W - 90;

  // اليوم / التاريخ
  ctx.font = '22px Almarai, sans-serif';
  ctx.fillText('اليوم: ' + (opts.day || ''), rx, 215);
  ctx.fillText('التاريخ: ' + (opts.date || ''), rx, 248);

  // جملة الاستلام/التسليم من/إلى المركز
  const verb = opts.type === 'تسليم' ? 'سلّمنا مركز' : 'استلمنا من مركز';
  ctx.font = 'bold 23px Almarai, sans-serif';
  ctx.fillStyle = '#8C1A2C';
  ctx.fillText(verb + ': ' + (opts.center || ''), rx, 288);

  // جملة قيمة مبيعات المقصف لشهر .... للفصل الدراسي .... لعام ....
  ctx.font = '20px Almarai, sans-serif';
  ctx.fillStyle = '#2b2321';
  const salesLine = 'وذلك قيمة مبيعات المقصف لشهر ' + (opts.month || '.......') +
    ' للفصل الدراسي ' + (opts.term || '.......') + ' لعام ' + (opts.year || '.......');
  wrapText_(ctx, salesLine, rx, 322, W - 160, 26);

  ctx.font = 'bold 22px Almarai, sans-serif';
  ctx.fillStyle = '#8C1A2C';
  ctx.fillText('المبلغ: ' + Number(opts.amount || 0).toFixed(2) + ' ريال', rx, 375);

  ctx.textAlign = 'center';
  ctx.font = '18px Almarai, sans-serif';
  ctx.fillStyle = '#8a7d76';
  ctx.fillText('توقيع المسلّمة' + (opts.senderName ? (': ' + opts.senderName) : ''), W * 0.28, 415);
  ctx.fillText((opts.adminLabel || 'توقيع المستلمة') + (opts.receiverName ? (': ' + opts.receiverName) : ''), W * 0.72, 415);

  if (sigImg) ctx.drawImage(sigImg, W * 0.28 - 130, 425, 260, 85);
  if (adminImg) ctx.drawImage(adminImg, W * 0.72 - 130, 425, 260, 85);

  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 522); ctx.lineTo(W * 0.28 + 130, 522); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.72 - 130, 522); ctx.lineTo(W - 60, 522); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a7d76';
  ctx.font = '16px Almarai, sans-serif';
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
