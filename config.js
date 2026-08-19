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

async function generateNoticeImage(type, center, amount, sigDataUrl, adminSigDataUrl, adminLabel) {
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
  ctx.font = 'bold 30px Tajawal, sans-serif';
  ctx.fillText('جمعية فرقان لتحفيظ القرآن الكريم', W / 2, 48);
  ctx.font = '20px Tajawal, sans-serif';
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
  ctx.font = '24px Tajawal, sans-serif';
  const rx = W - 90;
  ctx.fillText('المركز: ' + center, rx, 240);
  ctx.fillText('المبلغ: ' + Number(amount).toFixed(2) + ' ريال', rx, 285);
  ctx.fillText('التاريخ: ' + new Date().toLocaleDateString('ar-SA'), rx, 330);

  ctx.textAlign = 'center';
  ctx.font = '18px Tajawal, sans-serif';
  ctx.fillStyle = '#8a7d76';
  ctx.fillText('توقيع المركز', W * 0.28, 380);
  ctx.fillText(adminLabel || 'توقيع إدارة وحدة المقاصف', W * 0.72, 380);

  if (sigImg) ctx.drawImage(sigImg, W * 0.28 - 130, 395, 260, 90);
  if (adminImg) ctx.drawImage(adminImg, W * 0.72 - 130, 395, 260, 90);

  ctx.strokeStyle = '#e8dcc8';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 500); ctx.lineTo(W * 0.28 + 130, 500); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * 0.72 - 130, 500); ctx.lineTo(W - 60, 500); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a7d76';
  ctx.font = '16px Tajawal, sans-serif';
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
