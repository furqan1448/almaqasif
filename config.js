// ⚠️ حطي هنا رابط الـ Web app اللي طلعلك من Google Apps Script بعد الـ Deploy
const API_URL = "https://script.google.com/macros/s/AKfycbzbm37KU0bqiChGNXxgjgDmVA4QYzaqnqfLYPqF_QsbMiYVbWpfeyK47f_s-KVSWv8S/exec";

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
  return d.toISOString().slice(0, 10);
}

function nowTimeStr() {
  const d = new Date();
  return d.toTimeString().slice(0, 5);
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

async function generateNoticeImage(type, center, amount, sigDataUrl, adminSigDataUrl, adminLabel, senderName, receiverName) {
  const canvas = document.getElementById('noticeCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const [sigImg, adminImg] = await Promise.all([loadImage_(sigDataUrl), loadImage_(adminSigDataUrl)]);

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
  ctx.fillText('إشعار ' + type, W / 2, 175);

  ctx.strokeStyle = '#C2AA85';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 130, W - 80, H - 300);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#2b2321';
  ctx.font = '24px Almarai, sans-serif';
  const rx = W - 90;
  ctx.fillText('المركز: ' + center, rx, 240);
  ctx.fillText('المبلغ: ' + Number(amount).toFixed(2) + ' ريال', rx, 285);
  ctx.fillText('التاريخ: ' + new Date().toLocaleDateString('ar-SA'), rx, 330);

  ctx.textAlign = 'center';
  ctx.font = '18px Almarai, sans-serif';
  ctx.fillStyle = '#8a7d76';
  ctx.fillText('توقيع المسلّمة' + (senderName ? (': ' + senderName) : ''), W * 0.28, 380);
  ctx.fillText((adminLabel || 'توقيع المستلمة') + (receiverName ? (': ' + receiverName) : ''), W * 0.72, 380);

  if (sigImg) ctx.drawImage(sigImg, W * 0.28 - 130, 395, 260, 90);
  if (adminImg) ctx.drawImage(adminImg, W * 0.72 - 130, 395, 260, 90);

  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 500); ctx.lineTo(W * 0.28 + 130, 500); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.72 - 130, 500); ctx.lineTo(W - 60, 500); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a7d76';
  ctx.font = '16px Almarai, sans-serif';
  ctx.fillText('تم إنشاء هذا الإشعار آلياً عبر نظام وحدة المقاصف', W / 2, H - 20);

  return canvas.toDataURL('image/png');
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
