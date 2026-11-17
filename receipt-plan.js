/* ===== الخطة المقترحة لاستلام المبالغ والبضائع (قابلة للتعبئة والتحرير) =====
   تظهر داخل تبويب «مواعيد التسليم» في edara.html. كل نص قابل للتحرير، والمركز والفترة قوائم منسدلة،
   ولكل مركز تاريخ استلام يُختار من التقويم (يظهر هجري + ميلادي). تُحفظ في الخادم وتُصدَّر PDF بنفس تصميم الملف الأصلي. */
(function () {
  'use strict';
  var S = null, centers = [], dirty = false, saving = Promise.resolve();
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var PERIODS = ['الفترة الصباحية', 'الفترة المسائية', 'الفترة الصباحية والمسائية'];
  var LS = 'rcvPlanDraft_v1';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var ad = function (n) { return typeof toArabicDigits === 'function' ? toArabicDigits(n) : String(n); };
  var loose = function (s) { return typeof dlvLoose_ === 'function' ? dlvLoose_(s) : String(s).trim(); };
  var cnt = function (n) { return n === 1 ? 'مركز واحد' : n === 2 ? 'مركزان' : ad(n) + (n <= 10 ? ' مراكز' : ' مركزًا'); };
  var pd = function (iso) { var p = String(iso || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; };
  var greg = function (iso) { var d = pd(iso); return d ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d) + ' م' : ''; };

  /* ---------- البيانات الأصلية (من ملف الخطة) ---------- */
  function R(list, p) { return list.map(function (c) { return { c: c, p: p || PERIODS[1], d: '' }; }); }
  function seed() {
    var am = function (a) { return a.map(function (x) { var arr = Array.isArray(x); return { c: arr ? x[0] : x, both: arr && !!x[1] }; }); };
    var t1 = ['أروى بنت أبي العاص', 'الربيع بنت معوذ', 'أم خالد القرشية', 'أم ذر الغفارية', 'أم سلمة', 'أم عمار', 'أم عمارة', 'صفية بنت حيي', 'فاطمة بنت أسد', 'مليكة بنت ملحان', 'هالة بنت خويلد', 'هند بنت عتبة', 'أسماء بنت أبي بكر', 'أسماء بنت عميس', 'الشفاء بنت عبد الله', 'أم الخير', 'أم حرام بنت ملحان', 'أم هاني', 'خولة بنت حكيم', 'رفيدة الأنصارية', 'فاطمة بنت عبد الملك', 'جمانة بنت أبي طالب', 'سفانة بنت حاتم الطائي', 'سودة بنت زمعة'];
    var B = PERIODS[2], M = PERIODS[0], E = PERIODS[1];
    var o = {
      kicker: 'وحدة المقاصف', title: 'الخطة المقترحة لاستلام المبالغ والتعامل مع البضائع المتبقية', sub: 'في حال استمرار الدراسة عن بُعد',
      goalT: 'الهدف من الخطة', goal: 'تحديد الإجراءات اللازمة لتنظيم استلام المبالغ وحصر البضائع المتبقية والتعامل معها في حال استمرار الدراسة عن بُعد.',
      procT: 'الإجراءات المتخذة',
      proc: [
        { l: 'المراكز', b: ['عدم فتح أي بضائع جديدة.', 'حصر البضائع المغلقة وجردها حسب الصنف والعدد.', 'تصريف البضائع المفتوحة بشكل يومي.'] },
        { l: 'الوحدة', b: ['إيقاف توريد البضائع للمراكز.', 'الاقتصار على توفير المياه عند الحاجة والضرورة.'] },
        { l: 'استلام البضائع', b: ['استلام البضائع المتبقية من المراكز من قبل رئيسة الوحدة والمندوب، وفق الجداول الواردة أدناه.'] },
        { l: 'استلام المبالغ', b: ['إعداد جدول لمواعيد استلام المبالغ خلال أسبوع، يشمل الفترتين الصباحية والمسائية.', 'تتولى الوحدة استلام المبالغ من المديرة عند تعذّر حضورها لتسليمها إلى مكتب إشراف الداخل.'] }
      ],
      goodsT: 'جدول مواعيد استلام البضائع المتبقية',
      goods: [
        { t: 'مراكز بضاعتها على وشك النفاذ', n: 'تُستلم من قبل رئيسة الوحدة', rows: R(t1) },
        { t: 'مراكز تُستلم من قبل رئيسة الوحدة', n: '', rows: [['أروى بنت عبد المطلب', E], ['أم حكيم', B], ['عائشة بنت الصديق', B], ['عاتكة بنت عبد المطلب', B], ['ميمونة بنت الحارث', B], ['الخنساء بنت عمرو', B], ['زينب بنت جحش', B], ['صفية بنت عبد المطلب', E]].map(function (x) { return { c: x[0], p: x[1], d: '' }; }) },
        { t: 'مراكز تُستلم من قبل المندوب', n: '', rows: [['خولة بنت ثعلبة', B], ['آسية بنت مزاحم', B], ['أم كلثوم بنت أبي بكر', E], ['زينب بنت رسول الله', B], ['خديجة بنت خويلد', B], ['خولة بنت الأزور', B], ['لبابة بنت الحارث', B], ['فاطمة بنت رسول الله', B], ['مريم بنت عمران', B], ['حفصة بنت عمر', M]].map(function (x) { return { c: x[0], p: x[1], d: '' }; }) }
      ],
      amT: 'جدول مواعيد استلام المبالغ',
      days: [
        { day: 'الأحد', date: '', am: am(['خولة بنت ثعلبة', 'آسية بنت مزاحم', 'أم حكيم']), pm: am(['أروى بنت أبي العاص', 'الربيع بنت معوذ', 'أم خالد القرشية', 'أم ذر الغفارية', 'أم سلمة', 'أم عمار', 'أم عمارة', 'صفية بنت حيي', 'فاطمة بنت أسد']) },
        { day: 'الاثنين', date: '', am: am([['زينب بنت رسول الله', 1], 'عائشة بنت الصديق', 'عاتكة بنت عبد المطلب']), pm: am(['مليكة بنت ملحان', 'هالة بنت خويلد', 'هند بنت عتبة', 'أسماء بنت أبي بكر', 'أسماء بنت عميس', 'الشفاء بنت عبد الله', 'أم الخير', 'أم حرام بنت ملحان', 'أم هاني']) },
        { day: 'الثلاثاء', date: '', am: am(['ميمونة بنت الحارث', ['الخنساء بنت عمرو', 1], ['خديجة بنت خويلد', 1]]), pm: am(['خولة بنت حكيم', 'رفيدة الأنصارية', 'فاطمة بنت عبد الملك', 'أروى بنت عبد المطلب', 'أم كلثوم بنت أبي بكر', 'جمانة بنت أبي طالب', 'خولة بنت ثعلبة', 'سفانة بنت حاتم الطائي']) },
        { day: 'الأربعاء', date: '', am: am([['خولة بنت الأزور', 1], 'زينب بنت جحش', ['لبابة بنت الحارث', 1]]), pm: am(['سودة بنت زمعة', 'آسية بنت مزاحم', 'أم حكيم', 'عائشة بنت الصديق', 'عاتكة بنت عبد المطلب', 'ميمونة بنت الحارث', 'زينب بنت جحش', 'صفية بنت عبد المطلب']) },
        { day: 'الخميس', date: '', am: am([['فاطمة بنت رسول الله', 1], ['مريم بنت عمران', 1], 'حفصة بنت عمر']), pm: [] }
      ],
      noT: 'علمًا بأن المراكز الآتية لا يوجد بها مقصف:',
      no: [{ t: 'مراكز المساجد', c: ['أم شريك', 'أم عطية الأنصارية', 'أم معبد', 'عمرة بنت رواحة'] }, { t: 'مراكز أخرى', c: ['لبنى الأنصارية', 'أم كلثوم بنت عقبة', 'هند بنت العوام', 'زينب بنت أبي سلمة', 'زينب بنت علي'] }],
      impT: 'الأثر المتوقع من تطبيق الخطة',
      imp: ['انتظام تسليم المبالغ واستلامها وفق المواعيد المحددة.', 'حصر البضائع المتبقية وتحديد كمياتها وأصنافها.', 'الحد من تراكم البضائع.', 'وضوح الأدوار والمسؤوليات بين الوحدة والمراكز.']
    };
    o.amts = conv(o.days); delete o.days; return o;
  }
  /* إصلاح نسخ محفوظة سابقًا فيها أسماء مراكز المبالغ مقطوعة (حرف واحد): نعيد الأسماء الصحيحة ونبقي التواريخ */
  function fixAmts(P) {
    if (P && P.amts && P.amts.some(function (g) { return g.rows.some(function (r) { return r.c && r.c.length === 1; }); })) {
      var fresh = seed().amts;
      fresh.forEach(function (g, gi) { var o = P.amts[gi]; if (o) { g.rows.forEach(function (r, ri) { if (o.rows[ri] && o.rows[ri].d) r.d = o.rows[ri].d; }); if (o.t) g.t = o.t; } });
      P.amts = fresh;
    }
    return P;
  }
  /* تحويل الجدول القديم (حسب اليوم) إلى جداول: مركز + فترة + تاريخ */
  function conv(days) {
    return days.map(function (d) {
      var rows = [];
      d.am.forEach(function (x) { rows.push({ c: x.c, p: x.both ? PERIODS[2] : PERIODS[0], d: d.date || '' }); });
      d.pm.forEach(function (x) { rows.push({ c: x.c, p: PERIODS[1], d: d.date || '' }); });
      return { t: d.day, n: '', rows: rows };
    });
  }

  /* ---------- قوائم المراكز (بدون لاحقة الفترة) ---------- */
  function buildCenters() {
    var out = [], seen = {};
    var add = function (n) { n = String(n || '').trim(); var k = loose(n); if (n && !seen[k]) { seen[k] = n; out.push(n); } };
    (typeof centersListCache !== 'undefined' ? centersListCache : []).forEach(function (c) { add(String(c).replace(/\s*[-–]\s*(الفترة.*)$/, '')); });
    var tmp = seed(); /* أسماء الملف الأصلي كاحتياط إن لم تتطابق أسماء النظام */
    tmp.goods.forEach(function (g) { g.rows.forEach(function (r) { add(r.c); }); });
    tmp.amts.forEach(function (g) { g.rows.forEach(function (r) { add(r.c); }); });
    tmp.no.forEach(function (g) { g.c.forEach(add); });
    centers = out; centers._k = seen;
  }
  function canon(n) { return (centers._k && centers._k[loose(n)]) || n; }
  function canonAll() {
    S.goods.forEach(function (g) { g.rows.forEach(function (r) { r.c = canon(r.c); }); });
    S.amts.forEach(function (g) { g.rows.forEach(function (r) { r.c = canon(r.c); }); });
    S.no.forEach(function (g) { g.c = g.c.map(canon); });
  }

  /* ---------- مولّد العرض: edit=true للمحرر، false للتصدير (يرجع كتلاً قابلة للترقيم) ---------- */
  function build(E) {
    var ed = function (p, v, cls) { return E ? '<span class="ed ' + (cls || '') + '" contenteditable="true" data-p="' + p + '">' + esc(v) + '</span>' : esc(v); };
    var opt = function (list, v) { var l = list.indexOf(v) === -1 && v ? list.concat([v]) : list; return '<option value="">— اختاري —</option>' + l.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join(''); };
    var sel = function (p, v, list) { return E ? '<select class="sl" data-p="' + p + '">' + opt(list, v) + '</select>' : esc(v); };
    var btn = function (act, p, label, seedObj, cls) { return E ? '<button type="button" class="rb ' + (cls || '') + '" data-act="' + act + '" data-p="' + p + '"' + (seedObj !== undefined ? ' data-seed="' + esc(JSON.stringify(seedObj)) + '"' : '') + '>' + label + '</button>' : ''; };
    var date = function (p, v) {
      if (E) { var d = pd(v); return '<input type="date" class="dt" data-p="' + p + '" value="' + esc(v) + '"><div class="hj">' + (d ? DAYS[d.getDay()] + ' ' + toHijriStr(v) : '') + '</div>'; }
      var d2 = pd(v); return d2 ? '<span style="white-space:nowrap">' + DAYS[d2.getDay()] + ' ' + toHijriStr(v) + ' <span class="hj">(' + greg(v) + ')</span></span>' : '<span class="em">—</span>';
    };
    var bullets = function (arr, p) { return '<ul class="bl">' + arr.map(function (t, i) { return '<li>' + ed(p + '.' + i, t) + btn('del', p + '.' + i, '✕', undefined, 'x') + '</li>'; }).join('') + '</ul>' + btn('add', p, '+ نقطة', '', 'ad'); };
    var B = [];
    /* العنوان والهدف والإجراءات */
    B.push({ html: '<div class="ttl"><div class="kick">' + ed('kicker', S.kicker) + '</div><h1>' + ed('title', S.title) + '</h1><div class="sub">' + ed('sub', S.sub) + '</div></div>' });
    B.push({ html: '<div class="goal"><h3>' + ed('goalT', S.goalT) + '</h3><p>' + ed('goal', S.goal) + '</p></div>' });
    B.push({ open: '<div class="bx"><div class="band"><span>' + ed('procT', S.procT) + '</span></div><table class="pr"><tbody>', close: '</tbody></table>' + (E ? btn('add', 'proc', '+ إضافة إجراء', { l: 'إجراء جديد', b: [''] }, 'ad') : '') + '</div>',
      rows: S.proc.map(function (r, i) { return '<tr><td class="lb"><span class="num">' + ad(i + 1) + '</span>' + ed('proc.' + i + '.l', r.l) + (E ? btn('del', 'proc.' + i, '🗑', undefined, 'x') : '') + '</td><td>' + bullets(r.b, 'proc.' + i + '.b') + '</td></tr>'; }) });
    /* جداول البضائع */
    B.push({ brk: 1, html: '<h2 class="h2">' + ed('goodsT', S.goodsT) + '</h2>' });
    var tables = function (key) { S[key].forEach(function (g, gi) {
      var gp = key + '.' + gi;
      B.push({ open: '<div class="bx"><div class="band"><span>' + ed(gp + '.t', g.t) + '</span><span class="nt">' + ed(gp + '.n', g.n) + '</span>' + (E ? '<span class="bk">تاريخ لكل الصفوف <input type="date" class="dt" data-act="bulk" data-p="' + gp + '"></span>' + btn('del', gp, '🗑 حذف الجدول', undefined, 'x w') : '') + '<span class="cnt">' + cnt(g.rows.length) + '</span></div><table><thead><tr><th style="width:7%">م</th><th>المركز</th><th style="width:29%">الفترة</th><th style="width:28%">تاريخ الاستلام</th>' + (E ? '<th style="width:5%"></th>' : '') + '</tr></thead><tbody>',
        close: '</tbody></table>' + (E ? btn('add', gp + '.rows', '+ إضافة مركز', { c: '', p: PERIODS[1], d: '' }, 'ad') : '') + '</div>',
        rows: g.rows.map(function (r, i) { var p = gp + '.rows.' + i; return '<tr><td>' + ad(i + 1) + '</td><td class="nm">' + sel(p + '.c', r.c, centers) + '</td><td class="pd">' + sel(p + '.p', r.p, PERIODS) + '</td><td>' + date(p + '.d', r.d) + '</td>' + (E ? '<td>' + btn('del', p, '✕', undefined, 'x') + '</td>' : '') + '</tr>'; }) });
    });
    if (E) B.push({ html: btn('add', key, '+ إضافة جدول جديد', { t: 'جدول جديد', n: '', rows: [] }, 'ad big') }); };
    tables('goods');
    /* جداول المبالغ: جدول لكل يوم، نفس فكرة البضائع (مركز + فترة + تاريخ) */
    B.push({ brk: 1, html: '<h2 class="h2">' + ed('amT', S.amT) + '</h2>' });
    tables('amts');
    /* المراكز التي لا مقصف بها */
    B.push({ html: '<div class="goal nc"><h3>' + ed('noT', S.noT) + '</h3>' + S.no.map(function (g, gi) {
      var gp = 'no.' + gi;
      return '<h4>' + ed(gp + '.t', g.t) + btn('del', gp, '🗑', undefined, 'x') + '</h4><ul class="bl two">' + g.c.map(function (c, i) { return '<li>' + sel(gp + '.c.' + i, c, centers) + btn('del', gp + '.c.' + i, '✕', undefined, 'x') + '</li>'; }).join('') + '</ul>' + btn('add', gp + '.c', '+ مركز', '', 'ad');
    }).join('') + btn('add', 'no', '+ إضافة مجموعة', { t: 'مجموعة جديدة', c: [] }, 'ad') + '</div>' });
    /* الأثر المتوقع */
    B.push({ brk: 1, html: '<div class="bx"><div class="band"><span>' + ed('impT', S.impT) + '</span></div><div class="ib">' + bullets(S.imp, 'imp') + '</div></div>' });
    return B;
  }

  /* ---------- التنسيق (مشترك بين المحرر والـ PDF) ---------- */
  /* الألوان والأحجام مأخوذة من ملف الـPDF الأصلي: العنابي #8f1d2c، الخلفية الوردية #f8eef0، الصف الزوجي #fbf8f6، رأس الجدول #f0e6e7، الحدود #e2cfd2، النص #211b1d */
  var ARROW = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' fill='none' stroke='%238f1d2c' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/></svg>\")";
  var CSS = '.rpx{direction:rtl;font-family:"Tajawal",sans-serif;color:#211b1d;font-size:15px;line-height:1.7;font-weight:400}' +
    '.rpx .ttl{border-right:9px solid #8f1d2c;padding:4px 22px 4px 0;margin:0 0 24px}.rpx .kick{color:#8f1d2c;font-weight:700;font-size:13.5px}.rpx h1{margin:4px 0 10px;font-size:27px;line-height:1.55;font-weight:800;color:#211b1d}.rpx .sub{color:#8f1d2c;font-weight:700;font-size:15.5px}' +
    '.rpx .goal{background:#f8eef0;border-radius:14px;border-right:5px solid #8f1d2c;padding:14px 22px 16px;margin-bottom:24px}.rpx .goal h3{margin:0 0 4px;color:#8f1d2c;font-size:15.5px;font-weight:700}.rpx .goal h4{margin:12px 0 2px;color:#211b1d;font-size:15px;font-weight:700}.rpx .goal p{margin:0;font-size:15px;line-height:2}' +
    '.rpx .h2{margin:0 0 20px;padding-bottom:10px;border-bottom:2px solid #e8dcdd;color:#8f1d2c;font-size:22px;font-weight:800;line-height:1.5}' +
    '.rpx .bx{border:1px solid #e2cfd2;border-radius:6px;overflow:hidden;margin-bottom:22px;background:#fff}.rpx .band{background:#8f1d2c;color:#fff;padding:0 22px;min-height:48px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-weight:700;font-size:17px}.rpx .band .nt{font-weight:400;font-size:13px;opacity:.9}.rpx .band .cnt{margin-right:auto;background:rgba(255,255,255,.22);border-radius:14px;padding:2px 14px;font-size:12px;font-weight:700}' +
    '.rpx table{width:100%;border-collapse:collapse}.rpx th{background:#f0e6e7;color:#5b4a4d;font-size:13px;font-weight:700;padding:8px 12px;text-align:right;height:18px}.rpx td{padding:3px 12px;border-bottom:1px solid #eee2e3;vertical-align:middle;text-align:right;font-size:14px;line-height:1.45;height:21px}.rpx td:first-child{color:#8a7d76;font-size:12px}.rpx tbody tr:nth-child(even) td{background:#fbf8f6}.rpx tbody tr:last-child td{border-bottom:0}.rpx td.nm{color:#211b1d}.rpx td.pd{color:#6b6163}' +
    '.rpx .hj{font-size:11px;color:#8a7d76;line-height:1.3}.rpx .em{color:#8a7d76}' +
    '.rpx table.pr td{padding:10px 20px;border-bottom:1px solid #e2cfd2;background:#fff!important;font-size:15px;color:#211b1d;height:auto}.rpx table.pr td.lb{width:27%;background:#f8eef0!important;color:#8f1d2c;font-weight:700;font-size:16px;white-space:nowrap}.rpx table.pr tbody tr:last-child td{border-bottom:0}.rpx .num{display:inline-flex;width:22px;height:22px;border-radius:50%;background:#8f1d2c;color:#fff;font-size:11px;align-items:center;justify-content:center;margin-left:10px;vertical-align:middle}' +
    '.rpx ul.bl{list-style:none;margin:0;padding:0}.rpx ul.bl li{position:relative;padding:2px 20px 2px 0;line-height:2}.rpx ul.bl li::before{content:"";position:absolute;right:0;top:1em;width:6px;height:6px;background:#8f1d2c;border-radius:2px}.rpx ul.two{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}.rpx .ib{padding:8px 22px}.rpx .ib li{padding:9px 20px 9px 0;border-bottom:1px solid #eee2e3}.rpx .ib li:last-child{border:0}.rpx .ib li::before{top:1.25em}' +
    '.dp{width:794px;height:1123px;background:#fff;position:relative;overflow:hidden}.dp .lh{width:794px;height:139px;display:block}.dp .ct{padding:30px 54px 0}.dp .pn{position:absolute;bottom:30px;left:0;right:0;text-align:center;font-size:12px;color:#8a7d76}' +
    '.rpm{position:fixed;left:-20000px;top:0;width:686px;visibility:hidden}' +
    /* عناصر المحرر فقط: الصفحة تظهر كورقة A4 بنفس مقاسات الـPDF، وأدوات التحرير تظهر خفيفة عند المرور/الضغط فقط */
    '.rp-stage{background:#e6e1de;padding:16px 10px;border-radius:12px;overflow:hidden}.rp-doc{width:794px;margin:0 auto;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.22);padding:0 0 40px;min-height:600px}.rp-doc .lh{width:794px;display:block}.rp-doc .ct{padding:30px 54px 0}' +
    '.rpx .ed{outline:0;border-radius:5px;padding:0 3px;margin:0 -3px;cursor:text}.rpx .ed:hover{background:rgba(224,195,106,.28)}.rpx .ed:focus{background:#fffbe6;color:#211b1d;box-shadow:0 0 0 2px #e0c36a}' +
    '.rpx .sl,.rpx .dt{font-family:"Tajawal",sans-serif;font-size:14px;line-height:1.4;padding:2px 8px;height:26px;border:1px solid transparent;border-radius:6px;background-color:transparent;color:inherit;width:100%;margin:0;box-sizing:border-box;cursor:pointer}' +
    '.rpx .sl{-webkit-appearance:none;appearance:none;background-repeat:no-repeat;background-position:left 8px center;padding-left:26px;text-overflow:ellipsis}.rpx .sl:hover,.rpx .sl:focus{background-image:'+ARROW+'}' +
    '.rpx .sl:hover,.rpx .dt:hover,.rpx .sl:focus,.rpx .dt:focus{border-color:#e2cfd2;background-color:#fff;outline:0}.rpx .sl:focus,.rpx .dt:focus{border-color:#8f1d2c}.rpx .dt{direction:ltr;text-align:right}' +
    '.rpx .pd .sl{color:#6b6163}.rpx .em{opacity:.6}' +
    '.rpx .band .dt{width:auto;background:#fff;border-color:#fff;color:#211b1d}.rpx .bk{font-weight:400;font-size:12px;display:flex;align-items:center;gap:6px}' +
    '.rpx .rb{font-family:inherit;font-size:12px;cursor:pointer;border:1px dashed #c9a9ae;background:#fff;color:#8f1d2c;border-radius:14px;padding:1px 10px;margin:4px 0 0;line-height:1.7}.rpx .rb.ad{opacity:.7}.rpx .rb.ad:hover{opacity:1;border-color:#8f1d2c}' +
    '.rpx .rb.x{border:0;background:transparent;color:#b3261e;padding:0 6px;margin:0;opacity:0;transition:opacity .15s}.rpx tr:hover .rb.x,.rpx li:hover .rb.x,.rpx h4:hover .rb.x,.rpx .lb:hover .rb.x{opacity:1}.rpx .rb.x.w{color:#fff;border:1px solid rgba(255,255,255,.5);padding:1px 8px;opacity:.85}' +
    '.rpx .rb.big{display:block;margin:0 0 22px;padding:7px 16px}.rpx .bx>.rb.ad{margin:8px 22px}.rpx .goal .rb.ad{margin-top:6px}' +
    '@media (hover:none){.rpx .rb.x{opacity:.8}}' +
    '.rpx td .sl{display:block}.rpx .dt[value=""]{color:#b8a9ab}';

  /* ---------- المحرر ---------- */
  var BAR_BTN = 'width:auto;padding:9px 18px;margin:0;';
  function ensureCss() { if (!document.getElementById('rcvCss')) { var s = document.createElement('style'); s.id = 'rcvCss'; s.textContent = CSS; document.head.appendChild(s); } }
  function lhUrl() { var u = (typeof FURQAN_LETTERHEAD_URL !== 'undefined') ? FURQAN_LETTERHEAD_URL : ''; try { if (u) u = new URL(u, location.href).href; } catch (e) {} return u; }
  function render() {
    var host = document.getElementById('rcvDoc'); if (!host) return;
    var y = window.scrollY, h = '';
    build(true).forEach(function (b) { h += b.html != null ? b.html : b.open + b.rows.join('') + b.close; });
    var u = lhUrl();
    host.innerHTML = (u ? '<img class="lh" src="' + u + '" alt="">' : '') + '<div class="ct">' + h + '</div>';
    window.scrollTo(0, y); fit();
  }
  /* تصغير الورقة تلقائيًا في الشاشات الضيقة (الجوال) مع بقاء نفس الشكل */
  function fit() { var st = document.getElementById('rcvStage'), d = document.getElementById('rcvDoc'); if (!st || !d || !st.clientWidth) return; d.style.zoom = Math.min(1, (st.clientWidth - 20) / 794); }
  window.addEventListener('resize', fit);
  function mark(d) { dirty = d !== false; var b = document.getElementById('rcvSaveBtn'); if (b) b.textContent = dirty ? 'حفظ الخطة (توجد تعديلات غير محفوظة)' : 'حفظ الخطة'; if (dirty) { S._ts = Date.now(); try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} } }
  function setP(p, v) { var a = p.split('.'), o = S; for (var i = 0; i < a.length - 1; i++) o = o[a[i]]; o[a[a.length - 1]] = v; }
  function getP(p) { var a = p.split('.'), o = S; for (var i = 0; i < a.length; i++) o = o[a[i]]; return o; }
  function wire() {
    var host = document.getElementById('rcvDoc');
    host.addEventListener('input', function (e) { var t = e.target; if (t.classList.contains('ed')) { setP(t.getAttribute('data-p'), t.textContent); mark(); } });
    host.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('ed')) { e.preventDefault(); e.target.blur(); } });
    host.addEventListener('paste', function (e) { if (e.target.classList && e.target.classList.contains('ed')) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text').replace(/\s+/g, ' ')); } });
    host.addEventListener('change', function (e) {
      var t = e.target, p = t.getAttribute('data-p');
      if (t.getAttribute('data-act') === 'bulk') { if (!t.value) return; getP(p).rows.forEach(function (r) { r.d = t.value; }); mark(); render(); return; }
      if (!p) return;
      setP(p, t.type === 'checkbox' ? t.checked : t.value); mark();
      if (t.type === 'date') render();   /* لتحديث اسم اليوم والتاريخ الهجري */
    });
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || b.type === 'date') return;
      var act = b.getAttribute('data-act'), p = b.getAttribute('data-p'), a = p.split('.');
      if (act === 'add') { var seedV = b.hasAttribute('data-seed') ? JSON.parse(b.getAttribute('data-seed')) : ''; getP(p).push(seedV); }
      else if (act === 'del') {
        if (a.length === 2 && (a[0] === 'goods' || a[0] === 'amts' || a[0] === 'proc' || a[0] === 'no') && !confirm('حذف هذا العنصر بكل محتواه؟')) return;
        getP(a.slice(0, -1).join('.')).splice(+a[a.length - 1], 1);
      } else return;
      mark(); render();
    });
  }
  function ui() {
    var tab = document.getElementById('deliveryTab'); if (!tab || document.getElementById('rcvView')) return;
    ensureCss();
    var main = tab.querySelector(':scope > .card'); main.id = 'dlvMainView';
    var sw = document.createElement('div'); sw.className = 'export-row'; sw.style.cssText = 'margin:0 0 12px;gap:8px;flex-wrap:wrap;';
    sw.innerHTML = '<button class="btn" id="rcvSwA" style="' + BAR_BTN + '" onclick="rcvSwitch_(\'a\')">📅 جدول مواعيد التسليم</button><button class="btn outline" id="rcvSwB" style="' + BAR_BTN + '" onclick="rcvSwitch_(\'b\')">📋 الخطة المقترحة لاستلام المبالغ والبضائع</button>';
    tab.insertBefore(sw, main);
    var v = document.createElement('div'); v.id = 'rcvView'; v.className = 'card hidden'; v.setAttribute('data-noad', '');
    v.innerHTML = '<h3 style="margin-top:0;color:var(--maroon);">الخطة المقترحة لاستلام المبالغ والبضائع</h3>' +
      '<p style="color:#8a7d76;font-size:0.85rem;margin-top:0;">كل النصوص قابلة للتعديل بالضغط عليها (حتى العنوان). المركز والفترة من قوائم منسدلة، ولكل مركز تاريخ استلام من التقويم. يمكنك إضافة أو حذف أي صف أو جدول، ثم اضغطي «حفظ الخطة».</p>' +
      '<div class="export-row" style="margin:8px 0 12px;gap:8px;flex-wrap:wrap;"><button class="btn" id="rcvSaveBtn" style="' + BAR_BTN + '" onclick="rcvSave_()">حفظ الخطة</button><button class="btn outline" style="' + BAR_BTN + '" onclick="rcvPdf_(this)">⬇️ PDF</button><button class="btn outline" style="' + BAR_BTN + '" onclick="rcvReset_()">↺ إعادة النموذج الأصلي</button></div>' +
      '<div class="success-msg" id="rcvOk">تم حفظ الخطة ✅</div><div id="rcvDraftNote" class="hidden" style="border:1px solid #e0c36a;background:#fff8e1;border-radius:10px;padding:8px 12px;font-size:.85rem;margin-bottom:10px;"></div>' +
      '<div class="rpx rp-stage" id="rcvStage"><div class="rp-doc" id="rcvDoc">جاري التحميل...</div></div>';
    tab.appendChild(v); wire();
  }
  window.rcvSwitch_ = function (w) {
    ui();
    document.getElementById('dlvMainView').classList.toggle('hidden', w === 'b');
    document.getElementById('rcvView').classList.toggle('hidden', w !== 'b');
    document.getElementById('rcvSwA').className = 'btn' + (w === 'b' ? ' outline' : ''); document.getElementById('rcvSwB').className = 'btn' + (w === 'b' ? '' : ' outline');
    if (w === 'b') load();
  };
  window.rcvInit_ = ui;   /* يُستدعى عند فتح تبويب مواعيد التسليم */

  function load() {
    var go = function () {
      buildCenters();
      var pw = ''; callApi('getReceiptPlan', { _t: Date.now() }).then(function (r) {
        var srv = r && r.plan && r.plan.title ? r.plan : null, loc = null;
        try { loc = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
        S = srv || seed();
        if (S.days && !S.amts) { S.amts = conv(S.days); delete S.days; }
        S = fixAmts(S);
        if (loc && loc.days && !loc.amts) { loc.amts = conv(loc.days); delete loc.days; }
        if (loc) loc = fixAmts(loc);
        if (loc && loc.title && (!srv || (loc._ts || 0) > (srv._ts || 0))) { S = loc; var n = document.getElementById('rcvDraftNote'); n.classList.remove('hidden'); n.textContent = 'تم استرجاع مسودة غير محفوظة من هذا الجهاز — اضغطي «حفظ الخطة» لاعتمادها.'; dirty = true; }
        canonAll(); render(); mark(dirty);
      });
    };
    if (typeof centersListCache !== 'undefined' && centersListCache.length) go(); else callApi('getCenters').then(function (r) { centersListCache = r.centers || []; go(); }).catch(go);
  }
  window.rcvSave_ = function () {
    var pw = aevPw_(true); if (!pw) return;
    var btn = document.getElementById('rcvSaveBtn'); setBtnBusy(btn, true);
    S._ts = Date.now();
    saving = saving.then(function () { return callApi('setReceiptPlan', { adminPw: pw, plan: S }); }).catch(function () { return { ok: false, error: 'تعذّر الاتصال بالخادم' }; }).then(function (r) {
      setBtnBusy(btn, false);
      if (!r || !r.ok) { aevAuthFailed_(r); alert('تعذّر الحفظ: ' + ((r && r.error) || 'تأكدي من نشر أحدث Code.gs')); return; }
      try { localStorage.removeItem(LS); } catch (e) {}
      mark(false); document.getElementById('rcvDraftNote').classList.add('hidden');
      var ok = document.getElementById('rcvOk'); ok.style.display = 'block'; setTimeout(function () { ok.style.display = 'none'; }, 2500);
    });
  };
  window.rcvReset_ = function () { if (!confirm('إعادة النموذج الأصلي ستمسح تعديلاتك الحالية (حتى تضغطي حفظ). متأكدة؟')) return; S = seed(); canonAll(); render(); mark(); };

  /* ---------- PDF: ترقيم تلقائي للصفحات بنفس شكل الملف الأصلي ---------- */
  function paginate() {
    var CAP = 1123 - 139 - 30 - 56, GAP = 22;
    var m = document.createElement('div'); m.className = 'rpx rpm'; document.body.appendChild(m);
    var pages = [[]], used = 0, np = function () { pages.push([]); used = 0; }, cur = function () { return pages[pages.length - 1]; };
    try {
      build(false).forEach(function (b) {
        if (b.brk && used > 0) np();
        if (b.html != null || !b.rows.length) {
          var html = b.html != null ? b.html : b.open + b.close; m.innerHTML = html;
          var h = m.firstElementChild.offsetHeight + GAP; if (used + h > CAP && used > 0) np(); cur().push(html); used += h; return;
        }
        m.innerHTML = b.open + b.rows.join('') + b.close;
        var hs = Array.prototype.map.call(m.querySelectorAll('tbody tr'), function (tr) { return tr.offsetHeight; });
        var h0 = m.firstElementChild.offsetHeight - hs.reduce(function (a, c) { return a + c; }, 0) + 2, i = 0;
        var tot = h0 + GAP + hs.reduce(function (x, y) { return x + y; }, 0);
        if (used > 0 && tot > CAP - used && tot <= CAP) np();   /* الجدول الذي يتّسع في صفحة كاملة لا يُقسَّم */
        while (i < b.rows.length) {
          var room = CAP - used - h0 - GAP, n = 0, acc = 0;
          while (i + n < b.rows.length && acc + hs[i + n] <= room) { acc += hs[i + n]; n++; }
          if (n === 0) { if (used > 0) { np(); continue; } n = 1; acc = hs[i]; }
          if (n < b.rows.length - i && n < Math.min(3, b.rows.length - i) && used > 0) { np(); continue; }
          cur().push(b.open + b.rows.slice(i, i + n).join('') + b.close); used += h0 + acc + GAP; i += n;
          if (i < b.rows.length) np();
        }
      });
    } finally { m.remove(); }
    return pages;
  }
  window.rcvPdf_ = async function (btn) {
    ensureCss(); window.PDF_LIBS_ENABLED = true;
    if (typeof html2pdf === 'undefined') { try { await ensurePdfLibs_(); } catch (x) {} }
    if (typeof html2pdf === 'undefined') { alert('تعذّر تحميل أداة إنشاء PDF، تأكدي من اتصالك بالإنترنت وحاولي مرة أخرى'); return; }
    if (btn) setBtnBusy(btn, true, 'جارٍ التجهيز...');
    var host = document.createElement('div');
    try {
      var lh = lhUrl(), pages = paginate(), html = '';
      pages.forEach(function (pg, pi) { html += '<div class="rpx dp">' + (lh ? '<img class="lh" crossorigin="anonymous" src="' + lh + '" alt="">' : '<div style="height:139px"></div>') + '<div class="ct">' + pg.join('') + '</div><div class="pn">صفحة ' + ad(pi + 1) + ' من ' + ad(pages.length) + '</div></div>'; });
      host.style.cssText = 'position:fixed;left:-20000px;top:0;width:794px;pointer-events:none;'; host.innerHTML = html; document.body.appendChild(host);
      await Promise.all(Array.from(host.querySelectorAll('img')).map(function (im) { return im.complete ? Promise.resolve() : new Promise(function (res) { im.onload = im.onerror = res; }); }));
      var io = { pixelRatio: 2, backgroundColor: '#ffffff', width: 794, height: 1123, style: { margin: '0' }, imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' };
      if (typeof vrFontEmbedCss_ === 'function') { var fc = await vrFontEmbedCss_(); if (fc) io.fontEmbedCSS = fc; }
      var els = Array.prototype.slice.call(host.querySelectorAll('.dp')), cv = [];
      for (var i = 0; i < els.length; i++) cv.push(typeof htmlToImage !== 'undefined' ? await htmlToImage.toCanvas(els[i], io) : await html2pdf().set({ html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: 794 } }).from(els[i]).toCanvas().get('canvas'));
      var pdf = await html2pdf().set({ margin: 0, image: { type: 'jpeg', quality: 0.97 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(cv[0], 'canvas').toPdf().get('pdf');
      while (pdf.getNumberOfPages() > 1) pdf.deletePage(pdf.getNumberOfPages());
      for (var k = 1; k < cv.length; k++) { pdf.addPage('a4', 'portrait'); pdf.addImage(cv[k].toDataURL('image/jpeg', 0.97), 'JPEG', 0, 0, 210, 297); }
      vrDownloadBlob_(pdf.output('blob'), 'الخطة-المقترحة-لاستلام-المبالغ-والبضائع.pdf');
    } catch (err) { console.error(err); alert('تعذّر إنشاء ملف PDF، حاولي مرة أخرى'); }
    finally { host.remove(); if (btn) setBtnBusy(btn, false); }
  };
})();
