/* =====================================================================
   price-menu.js — عرض قائمة الأسعار وتصديرها (ملف مشترك)
   يستخدمه: menu.html (الصفحة العامة)، marakez.html، masoulat.html، edara.html
   - PriceMenu.app(host, opts)                 الواجهة الكاملة (بطاقة العنوان + البحث + التصنيفات + القائمة)
   - PriceMenu.render(container, items, opts)  عرض بطاقات التصنيفات فقط
   - PriceMenu.exportExcel(items)              ملف Excel منسّق (اتجاه يمين لليسار)
   - PriceMenu.exportPdf(items)                ملف PDF مضغوط (صفحة واحدة غالبًا)
   items: صفوف ورقة «قائمة الأسعار» كما يرجعها getPriceItems
   ===================================================================== */
(function () {
  'use strict';

  var LETTERHEAD = (typeof FURQAN_LETTERHEAD_URL !== 'undefined' && FURQAN_LETTERHEAD_URL) ? FURQAN_LETTERHEAD_URL : 'furqan-letterhead.jpg';
  var EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
  var HTML2PDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  var TITLE = 'قائمة الأسعار';
  var FILE_NAME = 'قائمة-الأسعار';

  /* ---------- أدوات ---------- */
  function AR(s) { return String(s).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }).replace(/\./g, '٫'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toNum(v) {
    var n = String(v == null ? '' : v).trim().replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace('٫', '.')
      .replace(/\s*(ريال|ريالات|ر\.?\s?س\.?)\s*$/, '').trim();   // «1 ريال» تُعامل كرقم
    return /^\d+(\.\d+)?$/.test(n) ? +n : null;
  }
  function priceHtml(p) {
    var v = String(p == null ? '' : p).trim();
    if (!v) return '';
    var n = toNum(v);
    return n !== null ? '<span class="pm-pr">' + AR(n) + '<small>ريال</small></span>' : '<span class="pm-pr pm-text">' + esc(v) + '</span>';
  }
  function countLabel(n) { return AR(n) + ' ' + (n === 1 ? 'صنف' : n === 2 ? 'صنفان' : n <= 10 ? 'أصناف' : 'صنفًا'); }
  function todayLabel() {
    try { return new Date().toLocaleDateString('ar-SA-u-ca-gregory-nu-arab', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return ''; }
  }
  function loadScript(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve();
    loadScript._p = loadScript._p || {};
    if (!loadScript._p[src]) {
      loadScript._p[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = function () { resolve(); };
        s.onerror = function () { delete loadScript._p[src]; reject(new Error('load ' + src)); };
        document.head.appendChild(s);
      });
    }
    return loadScript._p[src];
  }

  /* أسماء العرض للتصنيفات (لا تغيّر الشيت) — تظهر هكذا في الصفحة وفي PDF وExcel */
  var CAT_ALIASES = { 'البطاطسات': 'البطاطس' };
  function catName(c) { c = String(c || '').trim() || 'أخرى'; return CAT_ALIASES[c] || c; }

  /* تجميع الأصناف حسب التصنيف بالترتيب */
  function group(items) {
    var list = (items || []).map(function (r) {
      return {
        row: r._row, raw: r,
        cat: catName(r['التصنيف']),
        name: String(r['اسم الصنف'] || '').trim(),
        price: r['السعر'],
        order: Number(r['ترتيب']) || 0
      };
    }).filter(function (it) { return it.name; });
    list.sort(function (a, b) { return a.order - b.order; });
    var cats = [], idx = {};
    list.forEach(function (it) {
      if (!(it.cat in idx)) { idx[it.cat] = cats.length; cats.push({ name: it.cat, items: [] }); }
      cats[idx[it.cat]].items.push(it);
    });
    return cats;
  }

  /* ---------- الأيقونات ---------- */
  var ICONS = {
    chips: '<path d="M7 3h10l-1.2 3.5L17 10l-1.2 3.5L17 17l-1 4H8l-1-4 1.2-3.5L7 10l1.2-3.5z"/><path d="M10 9.5h4M10 13h4"/>',
    candy: '<circle cx="12" cy="12" r="4.2"/><path d="M8.8 9.2L4.5 5.5 3 9l2.6.4M15.2 14.8l4.3 3.7L21 15l-2.6-.4"/>',
    drink: '<path d="M7 7h10l-1.4 13.2a1 1 0 0 1-1 .8H9.4a1 1 0 0 1-1-.8z"/><path d="M6 7h12M13 7l1.5-4H17"/>',
    cake: '<path d="M4 20h16v-6.5a1.5 1.5 0 0 0-1.5-1.5h-13A1.5 1.5 0 0 0 4 13.5z"/><path d="M4 16c1.6 1.2 3.4 1.2 5.3 0s3.7-1.2 5.4 0 3.6 1.2 5.3 0M12 12V8.5M12 5.5v.5"/>',
    cookie: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9h.01M14.5 8.5h.01M15 14h.01M9.5 14.5h.01M12 11.5h.01"/>',
    choco: '<rect x="6" y="3" width="12" height="18" rx="1.6"/><path d="M6 9h12M6 15h12M12 3v18"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    del: '<path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3"/>'
  };
  function iconFor(cat) {
    var c = String(cat);
    if (/بطاط|شيبس|تسالي/.test(c)) return ICONS.chips;
    if (/حلو|حلاو|مصاص/.test(c)) return ICONS.candy;
    if (/ماء|مياه|عصير|مشروب|شاي|قهو|حليب/.test(c)) return ICONS.drink;
    if (/كيك|كرو|معجن|فطائر|فطاير/.test(c)) return ICONS.cake;
    if (/بسك|بساك|ويفر/.test(c)) return ICONS.cookie;
    if (/شوك|شوكولا/.test(c)) return ICONS.choco;
    return ICONS.tag;
  }
  function svg(inner) { return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'; }

  /* ---------- التنسيق (يُضاف مرة واحدة) ---------- */
  var CSS = [
    '.pm-cat{background:#fff;border:1px solid #f0e9ea;border-radius:20px;padding:4px 18px 4px;margin:0 0 12px;box-shadow:0 2px 10px rgba(33,27,29,.05);scroll-margin-top:140px}',
    '.pm-head{display:flex;align-items:center;gap:12px;padding:14px 0 12px;border-bottom:1px solid #f1ecec}',
    '.pm-ico{flex:none;width:40px;height:40px;border-radius:12px;background:#f8eef0;display:grid;place-items:center}',
    '.pm-ico svg{width:21px;height:21px;stroke:#8f1d2c}',
    '.pm-head h2{margin:0;font-family:Tajawal,system-ui,sans-serif;font-size:19px;font-weight:800;color:#211b1d;line-height:1.3;flex:1}',
    '.pm-cat,.pm-cat *{font-family:Tajawal,system-ui,sans-serif}',
    '.pm-head span{font-size:12.5px;color:#9a9092;background:#f6f3f3;border-radius:20px;padding:2px 10px;font-weight:500;white-space:nowrap}',
    '.pm-rows{display:grid;grid-template-columns:1fr 1fr;column-gap:28px}',
    '.pm-row{display:flex;align-items:center;gap:8px;padding:12px 0;border-bottom:1px solid #f6f2f2}',
    '.pm-nm{font-weight:500;font-size:16px;color:#211b1d}',
    '.pm-nm mark{background:#fbe7b6;color:inherit;border-radius:3px;padding:0 2px}',
    '.pm-lead{flex:1;min-width:10px}',
    '.pm-pr{flex:none;font-weight:800;color:#8f1d2c;font-size:15.5px;white-space:nowrap;background:#f8eef0;border-radius:10px;padding:3px 10px}',
    '.pm-pr small{font-size:11.5px;font-weight:600;color:#8f1d2c;margin-right:3px}',
    '.pm-pr.pm-text{font-size:13px;color:#946a1f;background:#fbf3e3}',
    '.pm-act{flex:none;display:inline-flex;gap:2px;margin-right:2px}',
    '.pm-act button{border:0;background:transparent;width:28px;height:28px;border-radius:8px;cursor:pointer;display:grid;place-items:center;padding:0}',
    '.pm-act button svg{width:16px;height:16px;stroke:#8f1d2c}',
    '.pm-act button:hover{background:#f8eef0}',
    '.pm-act button.pm-del svg{stroke:#b3261e}',
    '.pm-empty{text-align:center;color:#857a7c;padding:24px 8px}',
    '@media (max-width:640px){.pm-cat{padding:4px 14px}.pm-rows{grid-template-columns:1fr}.pm-head h2{font-size:18px}.pm-nm{font-size:15.5px}}'
  ].join('\n');
  function ensureCss() {
    if (document.getElementById('pm-style')) return;
    var st = document.createElement('style');
    st.id = 'pm-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------- العرض ---------- */
  function normalize(s) { return String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase().trim(); }
  function highlight(name, q) {
    if (!q) return esc(name);
    var i = normalize(name).indexOf(q);
    if (i < 0) return esc(name);
    var map = [], k = 0;
    for (var j = 0; j < name.length; j++) { if (!/[ً-ْـ]/.test(name[j])) map[k++] = j; }
    var s = map[i], e = (map[i + q.length - 1] != null ? map[i + q.length - 1] : name.length - 1) + 1;
    return esc(name.slice(0, s)) + '<mark>' + esc(name.slice(s, e)) + '</mark>' + esc(name.slice(e));
  }

  /* opts: { query, idPrefix, emptyText, onEdit(rawItem), onDelete(rawItem) } */
  function render(container, items, opts) {
    opts = opts || {};
    ensureCss();
    var q = normalize(opts.query || '');
    var cats = group(items);
    var editable = typeof opts.onEdit === 'function' || typeof opts.onDelete === 'function';
    var flat = [];
    var html = cats.map(function (c, ci) {
      var list = q ? c.items.filter(function (it) { return normalize(it.name).indexOf(q) >= 0 || normalize(c.name).indexOf(q) >= 0; }) : c.items;
      if (!list.length) return '';
      return '<section class="pm-cat"' + (opts.idPrefix ? ' id="' + opts.idPrefix + ci + '"' : '') + '>' +
        '<div class="pm-head"><div class="pm-ico">' + svg(iconFor(c.name)) + '</div><h2>' + esc(c.name) + '</h2><span>' + countLabel(list.length) + '</span></div>' +
        '<div class="pm-rows">' + list.map(function (it) {
          var i = flat.push(it) - 1;
          var act = editable
            ? '<span class="pm-act">' +
                (opts.onEdit ? '<button type="button" class="pm-edit" data-i="' + i + '" title="تعديل" aria-label="تعديل">' + svg(ICONS.edit) + '</button>' : '') +
                (opts.onDelete ? '<button type="button" class="pm-del" data-i="' + i + '" title="حذف" aria-label="حذف">' + svg(ICONS.del) + '</button>' : '') +
              '</span>'
            : '';
          return '<div class="pm-row"><span class="pm-nm">' + highlight(it.name, q) + '</span><span class="pm-lead"></span>' + priceHtml(it.price) + act + '</div>';
        }).join('') + '</div></section>';
    }).join('');
    container.innerHTML = html || '<div class="pm-empty">' + esc(opts.emptyText || (items && items.length ? 'لا توجد أصناف مطابقة' : 'لا توجد أصناف بعد')) + '</div>';
    if (editable) {
      container.onclick = function (e) {
        var b = e.target.closest('.pm-edit, .pm-del'); if (!b) return;
        var it = flat[+b.getAttribute('data-i')]; if (!it) return;
        if (b.classList.contains('pm-edit') && opts.onEdit) opts.onEdit(it.raw);
        if (b.classList.contains('pm-del') && opts.onDelete) opts.onDelete(it.raw);
      };
    }
    return cats;
  }

  /* ---------- Excel منسّق ---------- */
  function exportExcel(items) {
    var cats = group(items);
    if (!cats.length) { alert('لا توجد أصناف لتصديرها'); return Promise.resolve(); }
    return loadScript(EXCELJS_URL, 'ExcelJS').then(function () {
      var wb = new ExcelJS.Workbook();
      var ws = wb.addWorksheet('قائمة الأسعار', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 3 }], pageSetup: { paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      ws.columns = [{ width: 8 }, { width: 38 }, { width: 16 }];
      var MAROON = 'FF8F1D2C', SOFT = 'FFF7EEF0', LINE = 'FFEADCDE';
      var font = function (o) { return Object.assign({ name: 'Arial', size: 12 }, o || {}); };

      ws.mergeCells('A1:C1');
      ws.getCell('A1').value = TITLE;
      ws.getCell('A1').font = font({ size: 18, bold: true, color: { argb: 'FFFFFFFF' } });
      ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAROON } };
      ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 34;
      ws.mergeCells('A2:C2');
      ws.getCell('A2').value = 'وحدة المقاصف — ' + todayLabel();
      ws.getCell('A2').font = font({ size: 11, color: { argb: 'FF857A7C' } });
      ws.getCell('A2').alignment = { horizontal: 'center' };
      var hdr = ws.getRow(3);
      hdr.values = ['م', 'اسم الصنف', 'السعر (ريال)'];
      hdr.eachCell(function (c) {
        c.font = font({ bold: true, color: { argb: MAROON } });
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = { bottom: { style: 'medium', color: { argb: MAROON } } };
      });
      hdr.height = 22;

      var n = 0;
      cats.forEach(function (c) {
        var r = ws.addRow([c.name + '  (' + c.items.length + ')', '', '']);
        ws.mergeCells('A' + r.number + ':C' + r.number);
        r.getCell(1).font = font({ bold: true, size: 13, color: { argb: 'FFFFFFFF' } });
        r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAROON } };
        r.getCell(1).alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
        r.height = 22;
        c.items.forEach(function (it, i) {
          n++;
          var num = toNum(it.price);
          var row = ws.addRow([n, it.name, num !== null ? num : String(it.price || '')]);
          row.getCell(1).alignment = { horizontal: 'center' };
          row.getCell(2).alignment = { horizontal: 'right' };
          row.getCell(3).alignment = { horizontal: 'center' };
          if (num !== null) row.getCell(3).numFmt = Number.isInteger(num) ? '0' : '0.0#';
          row.eachCell(function (cell) {
            cell.font = font();
            cell.border = { bottom: { style: 'thin', color: { argb: LINE } } };
            if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF8F8' } };
          });
          row.getCell(3).font = font({ bold: true, color: { argb: MAROON } });
        });
      });
      return wb.xlsx.writeBuffer();
    }).then(function (buf) {
      if (!buf) return;
      var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = FILE_NAME + '.xlsx';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }).catch(function () { alert('تعذّر تحميل ملف Excel، تحقّقي من الاتصال بالإنترنت ثم أعيدي المحاولة.'); });
  }

  /* ---------- PDF مضغوط ----------
     يُبنى بعرض صفحة A4 في ٣ أعمدة متوازنة، ثم يُصغَّر الخط تلقائيًا حتى تتسع القائمة في صفحة واحدة.
     إذا كانت الأصناف كثيرة جدًا فلا يقل الخط عن حد مقروء، وتنتقل البقية إلى صفحة ثانية. */
  var PAGE_W = 794, PAGE_H = 1123;   // A4 بدقة 96
  /* شكل ملف PDF: 'cards' | 'soft' | 'classic' */
  var PDF_VARIANT = 'cards';
  var PDF_BASE = [
    '.pmp{width:' + PAGE_W + 'px;background:#fff;color:#211b1d;font-family:Tajawal,Arial,sans-serif;direction:rtl;word-spacing:2px}',
    '.pmp *{box-sizing:border-box;font-family:Tajawal,Arial,sans-serif}',
    '.pmp img.lh{display:block;width:100%;height:auto}',
    '.pmp .ttl{display:flex;align-items:flex-end;justify-content:space-between;padding:16px 28px 10px;margin:0 0 4px}',
    '.pmp .ttl h1{margin:0;color:#8f1d2c;font-size:30px;font-weight:800;line-height:1.2;word-spacing:4px}',
    '.pmp .ttl .sub{color:#857a7c;font-size:12.5px;margin-top:2px}',
    '.pmp .ttl .chips{display:flex;gap:6px}',
    '.pmp .ttl .chip{background:#f8eef0;color:#8f1d2c;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;white-space:nowrap}',
    '.pmp .cols{display:flex;gap:14px;padding:6px 28px 14px;align-items:flex-start}',
    '.pmp .col{flex:1;min-width:0}',
    '.pmp .blk{margin:0 0 10px;break-inside:avoid;page-break-inside:avoid}',
    '.pmp .bh{display:flex;align-items:center;gap:7px;font-weight:800}',
    '.pmp .bh .t{flex:1;white-space:nowrap}',
    '.pmp .bh .ic{flex:none;display:grid;place-items:center}',
    '.pmp .bh .ic svg{stroke:#8f1d2c}',
    '.pmp .bh .c{font-weight:600;font-size:.78em;white-space:nowrap}',
    '.pmp .bh .t em{font-style:normal;font-weight:600;font-size:.78em;opacity:.7}',
    '.pmp .r{display:flex;align-items:center;gap:6px}',
    '.pmp .r .n{white-space:nowrap;flex:none}',
    '.pmp .r .d{flex:1;min-width:6px}',
    '.pmp .wrapnames .r .n{white-space:normal;flex:1 1 auto;min-width:0}',
    '.pmp .wrapnames .r .d{display:none}',
    '.pmp .r .p{white-space:nowrap;display:inline-flex;align-items:baseline;gap:3px;font-weight:800;color:#8f1d2c}',
    '.pmp .r .p small{font-weight:600;font-size:.74em}',
    '.pmp .r .p.t{color:#9a6a17;font-weight:700}',
    '.pmp .ft{display:flex;justify-content:space-between;align-items:center;margin:0 28px;padding:8px 0 14px;border-top:1px solid #efe6e7;color:#a09597;font-size:11px;white-space:nowrap}'
  ].join('\n');
  var PDF_VARIANTS = {
    /* (أ) بطاقات — مثل شكل الشاشة */
    cards: [
      '.pmp .blk{border:1px solid #eee2e4;border-radius:12px;padding:6px 10px 3px;background:#fff}',
      '.pmp .bh{color:#211b1d;padding:1px 0 6px;border-bottom:1px solid #f1e7e8;margin-bottom:2px}',
      '.pmp .bh .ic{width:1.75em;height:1.75em;border-radius:7px;background:#f8eef0}',
      '.pmp .bh .ic svg{width:1.1em;height:1.1em}',
      '.pmp .bh .c{color:#9a9092;background:#f6f3f3;border-radius:20px;padding:0 8px}',
      '.pmp .r{padding:2.5px 0;border-bottom:1px solid #f6f1f1}',
      '.pmp .blk .r:last-child{border-bottom:0}',
      '.pmp .r .p{background:#f8eef0;border-radius:6px;padding:0 7px}',
      '.pmp .r .p.t{background:#fbf3e3}'
    ].join('\n'),
    /* (ب) عناوين ناعمة — شريط وردي فاتح وأسطر منقّطة */
    soft: [
      '.pmp .bh{color:#8f1d2c;background:#f8eef0;border-radius:8px;padding:3px 9px;border-right:4px solid #8f1d2c;margin-bottom:3px}',
      '.pmp .bh .ic svg{width:1.05em;height:1.05em}',
      '.pmp .bh .c{color:#8f1d2c;opacity:.75}',
      '.pmp .r{padding:2px 6px}',
      '.pmp .blk .r:nth-child(odd){background:#fcf9f9}',
      '.pmp .r .d{border-bottom:1.5px dotted #dccbcd;align-self:flex-end;margin-bottom:.45em}'
    ].join('\n'),
    /* (ج) رسمي أنيق — خط عنابي تحت العنوان وفواصل رفيعة */
    classic: [
      '.pmp .cols{gap:0}',
      '.pmp .col{padding:0 12px;border-left:1px solid #efe6e7}',
      '.pmp .col:last-child{border-left:0}',
      '.pmp .bh{color:#8f1d2c;padding:0 0 4px;border-bottom:2px solid #8f1d2c;margin-bottom:2px}',
      '.pmp .bh .ic svg{width:1.05em;height:1.05em}',
      '.pmp .bh .c{color:#fff;background:#8f1d2c;border-radius:20px;padding:0 7px}',
      '.pmp .r{padding:2.5px 0;border-bottom:1px solid #f3ecec}',
      '.pmp .r .p{min-width:3.6em;justify-content:flex-start}'
    ].join('\n')
  };

  /* خط Tajawal مضمّن داخل ملف PDF (بدونه قد يظهر الملف بخط آخر) */
  var FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap';
  var _fontCss = null;
  function blobToData(b) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.readAsDataURL(b); }); }
  function fontEmbedCss() {
    if (_fontCss !== null) return Promise.resolve(_fontCss);
    return fetch(FONT_CSS_URL).then(function (r) { return r.text(); }).then(function (css) {
      var urls = [], re = /url\((['"]?)(https:[^)'"]+)\1\)/g, m;
      while ((m = re.exec(css))) if (urls.indexOf(m[2]) < 0) urls.push(m[2]);
      return Promise.all(urls.map(function (u) {
        return fetch(u).then(function (r) { return r.blob(); }).then(blobToData).then(function (d) { css = css.split(u).join(d); });
      })).then(function () { _fontCss = css; return css; });
    }).catch(function () { _fontCss = ''; return ''; });
  }

  /* الكليشة كصورة مضمّنة حتى تظهر دائمًا في ملف PDF */
  var _lhData = null;
  function letterheadSrc() {
    if (_lhData) return Promise.resolve(_lhData);
    return fetch(LETTERHEAD).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (b) {
      return blobToData(b).then(function (d) { _lhData = d; return d; });
    }).catch(function () { return LETTERHEAD; });
  }

  /* توزيع التصنيفات بترتيبها على أعمدة متساوية الطول؛ التصنيف الطويل يُكمَل في العمود التالي بعنوان «تابع» */
  var HEAD_W = 2.4;
  function balanceCols(cats, k) {
    var total = cats.reduce(function (n, c) { return n + c.items.length + HEAD_W; }, 0);
    var H = (total + HEAD_W * (k - 1)) / k;
    var cols = [[]], used = 0;
    var queue = cats.map(function (c) { return { name: c.name, items: c.items.slice(), count: c.items.length, cont: false }; });
    while (queue.length) {
      var c = queue[0], rem = H - used, need = HEAD_W + c.items.length, last = cols.length === k;
      if (last || need <= rem + 0.6) { cols[cols.length - 1].push(c); used += need; queue.shift(); continue; }
      var take = Math.floor(rem - HEAD_W + 0.4);
      if (take >= 3 && c.items.length - take >= 3) {
        cols[cols.length - 1].push({ name: c.name, items: c.items.slice(0, take), count: c.count, cont: c.cont });
        queue[0] = { name: c.name, items: c.items.slice(take), count: c.count, cont: true };
      }
      cols.push([]); used = 0;
    }
    while (cols.length < k) cols.push([]);
    return cols;
  }

  function buildPdfNode(cats, fs, lhSrc, ncols, variant, fontCss) {
    // توزيع التصنيفات على أعمدة متوازنة بحسب عدد الأسطر، مع الحفاظ على الترتيب
    ncols = ncols || 3;
    variant = PDF_VARIANTS[variant] ? variant : PDF_VARIANT;
    var cols = balanceCols(cats, ncols);
    var count = cats.reduce(function (n, c) { return n + c.items.length; }, 0);
    var root = document.createElement('div');
    root.className = 'pmp';
    root.innerHTML = '<style>' + (fontCss || '') + PDF_BASE + '\n' + PDF_VARIANTS[variant] + '</style>' +
      '<img class="lh" src="' + esc(lhSrc || LETTERHEAD) + '" alt="">' +
      '<div class="ttl"><div><h1>' + TITLE + '</h1><div class="sub">وحدة المقاصف — ' + esc(todayLabel()) + '</div></div>' +
        '<div class="chips"><span class="chip">' + countLabel(count) + '</span><span class="chip">' + AR(cats.length) + ' تصنيفات</span></div></div>' +
      '<div class="cols' + (variant === 'soft' ? '' : ' wrapnames') + '" style="font-size:' + fs + 'px;line-height:1.5">' + cols.map(function (list) {
        return '<div class="col">' + list.map(function (c) {
          return '<div class="blk"><div class="bh" style="font-size:' + (fs + 1.5) + 'px"><span class="ic">' + svg(iconFor(c.name)) + '</span><span class="t">' + esc(c.name) + (c.cont ? ' <em>(تابع)</em>' : '') + '</span>' + (c.cont ? '' : '<span class="c">' + AR(c.count) + '</span>') + '</div>' +
            c.items.map(function (it) {
              var n = toNum(it.price);
              return '<div class="r"><span class="n">' + esc(it.name) + '</span><span class="d"></span>' +
                (n !== null ? '<span class="p">' + AR(n) + '<small>ريال</small></span>' : '<span class="p t">' + esc(it.price) + '</span>') + '</div>';
            }).join('') + '</div>';
        }).join('') + '</div>';
      }).join('') + '</div>' +
      '<div class="ft"><span>الأسعار بالريال السعودي</span><span>جمعية فرقان لتحفيظ القرآن الكريم بالطائف</span></div>';
    return root;
  }

  function waitImages(node) {
    var imgs = Array.prototype.slice.call(node.querySelectorAll('img'));
    return Promise.all(imgs.map(function (im) {
      return im.complete ? Promise.resolve() : new Promise(function (r) { im.onload = im.onerror = function () { r(); }; });
    }));
  }

  var HTML2IMG_URL = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js';
  var PDF_OPTS = {
    margin: 0,
    filename: FILE_NAME + '.pdf',
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: PAGE_W },
    jsPDF: { unit: 'px', format: [PAGE_W, PAGE_H], orientation: 'portrait', hotfixes: ['px_scaling'] },
    pagebreak: { mode: ['css', 'legacy'], avoid: '.blk' }
  };

  /* احتياط أخير: إن بقيت الصورة أطول من صفحة A4 نصغّرها كلها لتتسع في صفحة واحدة */
  function fitOnePage(canvas) {
    var ratio = PAGE_H / PAGE_W;
    if (canvas.height / canvas.width <= ratio * 0.995) return canvas;
    var out = document.createElement('canvas');
    out.height = canvas.height;
    out.width = Math.ceil(canvas.height / (ratio * 0.99));   // هامش بسيط يمنع ظهور صفحة ثانية فارغة بسبب التقريب
    var ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, Math.round((out.width - canvas.width) / 2), 0);
    return out;
  }

  function exportPdf(items, opts) {
    opts = opts || {};
    var cats = group(items);
    if (!cats.length) { alert('لا توجد أصناف لتصديرها'); return Promise.resolve(); }
    // حاوية مخفية بنفس طريقة النظام: لا تظهر على الشاشة ولا تتأثر بعرض الجوال
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;z-index:-1;direction:ltr';
    var host = document.createElement('div');
    host.style.cssText = 'width:' + PAGE_W + 'px;background:#fff';
    wrap.appendChild(host);
    document.body.appendChild(wrap);
    var node;
    var lh = LETTERHEAD;
    var fcss = '';
    return loadScript(HTML2PDF_URL, 'html2pdf').then(fontEmbedCss).then(function (f) { fcss = f; return letterheadSrc(); }).then(function (src) {
      lh = src;
      // تصغير الخط تدريجيًا حتى تتسع القائمة في صفحة واحدة (بحد أدنى مقروء)
      // صفحة واحدة دائمًا: نصغّر الخط في ٣ أعمدة، ثم ننتقل إلى ٤ أعمدة إن لزم
      var fs = 15, ncols = 3;
      var tryFit = function () {
        host.innerHTML = '';
        node = buildPdfNode(cats, fs, lh, ncols, opts.variant, fcss);
        host.appendChild(node);
        return waitImages(node).then(function () {
          if (node.scrollHeight <= PAGE_H - 4) return;
          if (ncols === 3 && fs > 10) { fs -= 0.5; return tryFit(); }
          if (ncols === 3) { ncols = 4; fs = 12; return tryFit(); }
          if (fs > 8) { fs -= 0.5; return tryFit(); }
        });
      };
      return tryFit();
    }).then(function () {
      if (document.fonts && document.fonts.ready) return document.fonts.ready;
    }).then(function () {
      // الطريقة الأدق للنص العربي: html-to-image، ثم html2canvas احتياطيًا
      return loadScript(HTML2IMG_URL, 'htmlToImage').then(function () {
        return htmlToImage.toCanvas(node, { pixelRatio: 2, backgroundColor: '#ffffff', width: PAGE_W, height: node.scrollHeight, fontEmbedCSS: fcss || undefined });
      }).then(function (canvas) {
        return html2pdf().set(PDF_OPTS).from(fitOnePage(canvas), 'canvas').save();
      }).catch(function () {
        return html2pdf().set(PDF_OPTS).from(node).toContainer().get('container').then(function (c) {
          if (c.parentElement) c.parentElement.style.direction = 'ltr';
          c.style.position = 'absolute'; c.style.top = '0'; c.style.left = '0'; c.style.right = 'auto';
          c.style.margin = '0'; c.style.width = PAGE_W + 'px'; c.style.direction = 'rtl';
        }).toCanvas().toPdf().save();
      });
    }).catch(function () {
      alert('تعذّر إنشاء ملف PDF، تحقّقي من الاتصال بالإنترنت ثم أعيدي المحاولة.');
    }).then(function () { wrap.remove(); });
  }

  /* =====================================================================
     الواجهة الكاملة (نفس شكل رابط المنيو تمامًا): بطاقة العنوان + البحث + التصنيفات + القائمة
     PriceMenu.app(host, opts) ← يرجع { setItems(items), setStatus(label, time, ok), setError(msg, retry), items() }
     opts: { live, onEdit, onDelete, extraButtons:[{label, onClick}], allTop, emptyText }
     ===================================================================== */
  var APP_CSS = [
    '.pma{font-family:Tajawal,system-ui,sans-serif;color:#211b1d;direction:rtl;text-align:right}',
    '.pma *{box-sizing:border-box}',
    '.pma h1,.pma h2,.pma h3{font-family:Tajawal,system-ui,sans-serif}',
    '.pma-top{position:relative;overflow:hidden;border-radius:22px;color:#fff;padding:24px 22px 20px;background:linear-gradient(135deg,#9b2236,#6b111f);box-shadow:0 12px 30px rgba(107,17,31,.25)}',
    '.pma-top::after{content:"";position:absolute;width:240px;height:240px;border-radius:50%;left:-80px;top:-100px;background:rgba(255,255,255,.07)}',
    '.pma-top>*{position:relative;z-index:1}',
    '.pma-top small{opacity:.85;font-weight:700;font-size:13px}',
    '.pma-top h1{margin:4px 0 14px;font-size:34px;font-weight:900;line-height:1.2;color:#fff}',
    '.pma-stats{display:flex;gap:8px;flex-wrap:wrap}',
    '.pma-stats>div{background:rgba(255,255,255,.14);border-radius:12px;padding:6px 12px;font-size:13px;min-width:64px;line-height:1.6}',
    '.pma-stats b{display:block;font-size:19px;font-weight:800;line-height:1.3}',
    '.pma-stats .pma-live b{display:flex;align-items:center;gap:6px;font-size:14px;padding-top:3px}',
    '.pma-dot{width:8px;height:8px;border-radius:50%;background:#5ee08f;box-shadow:0 0 0 3px rgba(94,224,143,.25)}',
    '.pma-dot.off{background:#ffd166;box-shadow:0 0 0 3px rgba(255,209,102,.25)}',
    '.pma-dl{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}',
    '.pma .pma-dl button{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;font:700 14px Tajawal,system-ui,sans-serif;border-radius:12px;padding:7px 14px;cursor:pointer;transition:.15s;width:auto;margin:0}',
    '.pma .pma-dl button:hover{background:#fff;color:#8f1d2c}',
    '.pma .pma-dl button:hover svg{stroke:#8f1d2c}',
    '.pma .pma-dl button svg{width:17px;height:17px;stroke:#fff;fill:none}',
    '.pma .pma-dl button:disabled{opacity:.6;cursor:wait}',
    '.pma-bar{position:sticky;z-index:15;padding:14px 0 6px}',
    '.pma-search{position:relative}',
    '.pma .pma-search input{width:100%;border:0;background:#fff;border-radius:14px;padding:12px 44px 12px 40px;font:400 16px Tajawal,system-ui,sans-serif;color:#211b1d;box-shadow:0 1px 3px rgba(0,0,0,.05);margin:0;height:auto}',
    '.pma .pma-search input:focus{outline:none;box-shadow:0 0 0 3px rgba(143,29,44,.15);border:0}',
    '.pma-search>svg{position:absolute;right:15px;top:50%;transform:translateY(-50%);width:18px;height:18px;stroke:#9a9092;fill:none;pointer-events:none}',
    '.pma .pma-clear{position:absolute;left:6px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#9a9092;width:30px;height:30px;border-radius:50%;cursor:pointer;display:none;font-size:20px;line-height:1;padding:0;margin:0}',
    '.pma-tabs{display:flex;gap:6px;overflow-x:auto;padding:10px 0 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}',
    '.pma-tabs::-webkit-scrollbar{display:none}',
    '.pma .pma-tab{flex:none;border:0;background:#fff;color:#8C1A2C;border-radius:12px;padding:7px 15px;cursor:pointer;font:700 14.5px Tajawal,system-ui,sans-serif;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.04);transition:.15s;width:auto;margin:0}',
    '.pma .pma-tab:hover{color:#8f1d2c}',
    '.pma .pma-tab.active{background:#8C1A2C;color:#fff}',
    '.pma-list{padding:8px 0 10px;font-size:16px;line-height:1.7}',
    '.pma-state{text-align:center;padding:44px 16px;color:#9a9092;background:#fff;border-radius:20px}',
    '.pma-state h3{color:#211b1d;margin:0 0 4px;font-size:19px}',
    '.pma .pma-state button{border:0;background:#8f1d2c;color:#fff;font:700 15px Tajawal,system-ui,sans-serif;border-radius:12px;padding:9px 24px;cursor:pointer;margin-top:12px;width:auto}',
    '.pma-skel-card{background:#fff;border-radius:20px;padding:18px}',
    '.pma-skel{height:14px;border-radius:7px;margin:14px 0;background:linear-gradient(90deg,#efe9e9 25%,#f7f3f3 50%,#efe9e9 75%);background-size:200% 100%;animation:pmaSk 1.2s infinite}',
    '@keyframes pmaSk{to{background-position:-200% 0}}',
    '@media (max-width:640px){.pma-top{padding:22px 18px 18px}.pma-top h1{font-size:30px}}',
    '@media (prefers-reduced-motion:reduce){.pma *{animation:none!important;transition:none!important}}'
  ].join('\n');

  var DL_ICONS = {
    pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v6M9 15l3 3 3-3"/>',
    xlsx: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'
  };
  function dlIcon(k) { return '<svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (DL_ICONS[k] || DL_ICONS.link) + '</svg>'; }

  function app(host, opts) {
    opts = opts || {};
    ensureCss();
    if (!document.getElementById('pma-style')) {
      var st = document.createElement('style'); st.id = 'pma-style'; st.textContent = APP_CSS; document.head.appendChild(st);
    }
    var uid = 'pma' + (app._n = (app._n || 0) + 1) + '-';
    var extras = opts.extraButtons || [];
    host.innerHTML =
      '<div class="pma">' +
        '<header class="pma-top"><small>وحدة المقاصف</small><h1>' + TITLE + '</h1>' +
          '<div class="pma-stats"><div><b data-k="items">—</b>صنفًا</div><div><b data-k="cats">—</b>تصنيفات</div>' +
          (opts.live ? '<div class="pma-live"><b><span class="pma-dot" data-k="dot"></span><span data-k="live">جارٍ التحميل</span></b><span data-k="time">&nbsp;</span></div>' : '') +
          '</div>' +
          '<div class="pma-dl"><button type="button" data-a="pdf">' + dlIcon('pdf') + '<span>تحميل PDF</span></button>' +
          '<button type="button" data-a="xlsx">' + dlIcon('xlsx') + '<span>تحميل Excel</span></button>' +
          extras.map(function (b, i) { return '<button type="button" data-x="' + i + '">' + dlIcon(b.icon || 'link') + '<span>' + esc(b.label) + '</span></button>'; }).join('') +
          '</div></header>' +
        '<div class="pma-bar"><div class="pma-search">' +
          '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
          '<input type="text" enterkeyhint="search" placeholder="ابحثي عن صنف..." autocomplete="off" aria-label="البحث عن صنف">' +
          '<button type="button" class="pma-clear" aria-label="مسح البحث">×</button></div>' +
          '<nav class="pma-tabs" aria-label="التصنيفات"></nav></div>' +
        '<div class="pma-list"><div class="pma-skel-card"><div class="pma-skel" style="width:30%"></div><div class="pma-skel"></div><div class="pma-skel"></div><div class="pma-skel" style="width:80%"></div></div></div>' +
      '</div>';
    var root = host.firstChild;
    var $ = function (sel) { return root.querySelector(sel); };
    var bar = $('.pma-bar'), input = $('.pma-search input'), clear = $('.pma-clear'), tabs = $('.pma-tabs'), list = $('.pma-list');
    var RAW = [], CATS = [], sig = null, tabsSig = null;

    /* الشريط الثابت يلتصق أسفل الشريط العلوي للنظام (إن وُجد) وبلون خلفية الصفحة */
    function topOffset() { var tb = document.querySelector('.topbar'); return tb && getComputedStyle(tb).position === 'sticky' ? tb.offsetHeight : 0; }
    function pageBg() {
      var c = getComputedStyle(document.body).backgroundColor;
      var m = c && c.match(/\d+(\.\d+)?/g);
      return m && m.length >= 3 && (m.length < 4 || +m[3] > 0) ? 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',.94)' : 'rgba(244,242,242,.94)';
    }
    function layoutBar() {
      var t = topOffset();
      bar.style.top = t + 'px';
      var stuck = root.offsetParent && bar.getBoundingClientRect().top <= t + 1 && root.getBoundingClientRect().top < t;
      bar.style.background = stuck ? pageBg() : 'transparent';
      bar.style.backdropFilter = bar.style.webkitBackdropFilter = stuck ? 'blur(10px)' : 'none';
    }
    layoutBar();

    function scrollToY(y) { window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); }
    function headerSpace() { return topOffset() + bar.offsetHeight + 10; }

    function renderTabs() {
      var s = CATS.map(function (c) { return c.name; }).join('|');
      if (s === tabsSig) return; tabsSig = s;
      tabs.innerHTML = '<button type="button" class="pma-tab active" data-t="all">الكل</button>' +
        CATS.map(function (c, i) { return '<button type="button" class="pma-tab" data-t="' + uid + i + '">' + esc(c.name) + '</button>'; }).join('');
    }
    function renderList() {
      clear.style.display = input.value ? 'block' : 'none';
      render(list, RAW, {
        query: input.value, idPrefix: uid, onEdit: opts.onEdit, onDelete: opts.onDelete,
        emptyText: RAW.length ? 'لم نجد صنفًا يطابق «' + input.value + '».' : (opts.emptyText || 'لم تُضف أصناف إلى قائمة الأسعار بعد.')
      });
    }
    function setActive(t) {
      var a = null;
      Array.prototype.forEach.call(tabs.children, function (b) { var on = b.getAttribute('data-t') === t; b.classList.toggle('active', on); if (on) a = b; });
      if (a) {
        var tr = tabs.getBoundingClientRect(), ar = a.getBoundingClientRect();
        tabs.scrollTo({ left: tabs.scrollLeft + (ar.left + ar.width / 2) - (tr.left + tr.width / 2), behavior: 'smooth' });
      }
    }
    function setItems(items) {
      var s = JSON.stringify(items || []);
      if (s === sig) return; sig = s;
      RAW = items || []; CATS = group(RAW);
      $('[data-k="items"]').textContent = AR(CATS.reduce(function (n, c) { return n + c.items.length; }, 0));
      $('[data-k="cats"]').textContent = AR(CATS.length);
      layoutBar(); renderTabs(); renderList();
    }
    function setStatus(label, time, ok) {
      if (!opts.live) return;
      $('[data-k="live"]').textContent = label;
      $('[data-k="time"]').textContent = time || ' ';
      $('[data-k="dot"]').classList.toggle('off', !ok);
    }
    function setError(msg, retry) {
      list.innerHTML = '<div class="pma-state"><h3>تعذّر تحميل القائمة</h3>' + esc(msg || 'تحقّقي من الاتصال بالإنترنت ثم أعيدي المحاولة.') +
        (retry ? '<br><button type="button" class="pma-retry">إعادة المحاولة</button>' : '') + '</div>';
      if (retry) list.querySelector('.pma-retry').onclick = function () { list.innerHTML = '<div class="pma-state">جارٍ التحميل...</div>'; retry(); };
    }

    /* التحميل */
    root.querySelector('.pma-dl').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var x = b.getAttribute('data-x');
      if (x != null) { if (extras[+x] && extras[+x].onClick) extras[+x].onClick(); return; }
      if (!RAW.length) return;
      var lbl = b.querySelector('span'), old = lbl.textContent;
      b.disabled = true; lbl.textContent = 'جارٍ التجهيز...';
      Promise.resolve(b.getAttribute('data-a') === 'pdf' ? exportPdf(RAW) : exportExcel(RAW))
        .then(function () { b.disabled = false; lbl.textContent = old; }, function () { b.disabled = false; lbl.textContent = old; });
    });

    /* التصنيفات والبحث */
    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('.pma-tab'); if (!b) return;
      if (input.value) { input.value = ''; renderList(); }
      var t = b.getAttribute('data-t');
      if (t === 'all') {
        var y = typeof opts.allTop === 'number' ? opts.allTop : root.getBoundingClientRect().top + window.scrollY - topOffset() - 10;
        scrollToY(y);
      } else {
        var sec = document.getElementById(t);
        if (sec) scrollToY(sec.getBoundingClientRect().top + window.scrollY - headerSpace());
      }
      setActive(t);
      lock = Date.now();
    });
    input.addEventListener('input', function () { renderList(); setActive('all'); });
    clear.addEventListener('click', function () { input.value = ''; renderList(); input.focus(); });

    /* تمييز التصنيف الظاهر أثناء التمرير */
    var lock = 0, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (!root.offsetParent) return;
        layoutBar();
        if (input.value || Date.now() - lock < 700) return;
        var line = headerSpace() + 20, cur = 'all';
        Array.prototype.forEach.call(list.querySelectorAll('.pm-cat[id]'), function (s) { if (s.getBoundingClientRect().top <= line) cur = s.id; });
        var act = tabs.querySelector('.pma-tab.active');
        if (!act || act.getAttribute('data-t') !== cur) setActive(cur);
      });
    }, { passive: true });

    return { setItems: setItems, setStatus: setStatus, setError: setError, items: function () { return RAW; }, el: root };
  }

  window.PriceMenu = { render: render, app: app, exportExcel: exportExcel, exportPdf: exportPdf, group: group, _buildPdfNode: buildPdfNode };
})();
