/* ============================================================
   طلبات المقاصف — نموذج الطلب (يُستخدم في صفحتي المديرات والمسؤولات)
   الأصناف منقولة من «نموذج طلبات المقاصف» الورقي: لكل صنف وحدة (علبة/كرتون أو كيس/كرتون) وعدد،
   مع إمكانية إضافة أصناف أخرى. عند الإرسال يُحفظ الطلب في شيت «طلبات المقاصف» ويصل إشعار بالبريد
   (انظر submitCanteenOrder_ في Code.gs).

   الاستخدام من الصفحة:
     <div id="ordersView" class="hidden"></div>      ← حاوية فارغة
     <script src="orders.js"></script>               ← بعد config.js
     showView('ordersView')  و  initOrdersView_(دور المستخدمة) عند فتح الشاشة
   يعتمد على: currentCenter، showView، callApi، setBtnBusy، fillSelect، fillYearSelect، AR_TERMS،
   toHijriStr، dayNameFor، todayStr، toArabicDigits (من config.js والصفحة).
   ============================================================ */
(function () {
  'use strict';

  /* ---- الأصناف بنفس ترتيب النموذج الورقي (من اليمين إلى اليسار) ---- */
  var COL_BOX = [ // علبة / كرتون
    'مياه العين', 'عصير أورجينال صغير', 'عصير نكتار أورجينال كبير', 'حليب مراعي', 'حليب نادك', 'حلاوة قلب',
    'مصاص ديما', 'فروتي ديما', 'ملعقة سينو', 'بهلول', 'كرواسون سفن دايز', 'كيك يمامة', 'كيك نحول', 'كيك مفن',
    'كيك سراي', 'نسكافة', 'شاي', 'قهوة سوداء', 'حليب', 'قهوة عربي'
  ];
  var COL_BAG = [ // كيس / كرتون
    'فخذ دجاج', 'فانتزي', 'ليز', 'تسالي صغير', 'البطل دبي', 'مرامي صغير', 'البطل فشار صغير', 'فرفشة عيدان',
    'لولز', 'زورو', 'زيكو', 'راجا', 'عيدان ستيكس علب', 'ستيكس أكياس', 'دوريتوس', 'بطاطس عمان',
    'عيدان الذرة المليونير', 'زمزم طماطم', 'عصير دي دي صغير'
  ];
  var COL_BOX2 = [ // علبة / كرتون
    'فليك', 'لواكر', 'توكس أصبعين', 'توكس اصبع', 'سنيكرس كبير', 'سنيكرس صغير', 'جالكسي سادة كبير',
    'جالكسي فلوتات', 'جالكسي كرسبي صغير', 'جالكسي كراميل صغير', 'مارس صغير', 'كيندر بوينو', 'باونتي كبير',
    'كيت كات شنكي', 'كارميلا اصلي صغير', 'بسكويت أوه بوي', 'واو بافيل', 'ساندوتش اولكر صغير',
    'بريك صغير اصبعين', 'ويفر تايم كريب'
  ];
  var COL_BOX3 = [ // علبة / كرتون
    'ويف هيروستار بندق', 'سبلاش بيكادلي', 'ويفر زكلوو', 'امادا شكولوف', 'شوكولاته بالو ٣ اصابيع', 'فول سوداني',
    'تريكسي', 'ويفر مثلثات', 'وافل غندور', 'بسكوت بريك', 'كيت كات صغير', 'سندوتش ميرو بالمارشملو',
    'بسكويت فايف مش', 'سويش كوكيز', 'شوكولاتة غونتس'
  ];
  var UNITS_BOX = ['علبة', 'كرتون'];
  var UNITS_BAG = ['كيس', 'كرتون'];
  var UNITS_OTHER = ['علبة', 'كرتون', 'كيس', 'حبة'];
  var ROLE_MASOULA = 'مسؤولة المقصف';

  var ITEMS = [];
  var GROUPS = []; // كل مجموعة = جدول مستقل مثل أعمدة النموذج الورقي
  function addCol(names, units) {
    var g = { units: units, items: [], el: null };
    names.forEach(function (n) {
      var it = { n: n, nn: norm(n), units: units, unit: '', qty: 0, el: null, g: g };
      ITEMS.push(it); g.items.push(it);
    });
    GROUPS.push(g);
  }

  var ST = { built: false, role: '', others: [], onlySel: false, q: '', sendBusy: false };
  var $ = function (id) { return document.getElementById(id); };

  /* ---- أدوات صغيرة ---- */
  function norm(s) {
    return String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function ls(key, val) {
    try { if (val === undefined) return localStorage.getItem(key) || ''; localStorage.setItem(key, val); } catch (e) {}
    return '';
  }
  function ar(n) { return (typeof toArabicDigits === 'function') ? toArabicDigits(n) : String(n); }

  function qtyHtml() {
    return '<div class="ord-qty">' +
      '<button type="button" class="ord-m" aria-label="إنقاص العدد">−</button>' +
      '<input type="number" inputmode="numeric" min="0" max="9999" step="1" placeholder="0" aria-label="العدد">' +
      '<button type="button" class="ord-p" aria-label="زيادة العدد">+</button>' +
      '</div>';
  }

  /* يربط أزرار − / + وحقل العدد بالكائن obj.qty، ويستدعي onChange بعد كل تغيير */
  function wireQty(qtyEl, obj, onChange) {
    var inp = qtyEl.querySelector('input');
    function setQty(v) {
      v = Math.max(0, Math.min(9999, v | 0));
      obj.qty = v;
      inp.value = v ? String(v) : '';
      onChange();
    }
    qtyEl.querySelector('.ord-m').addEventListener('click', function () { setQty(obj.qty - 1); });
    qtyEl.querySelector('.ord-p').addEventListener('click', function () { setQty(obj.qty + 1); });
    inp.addEventListener('input', function () {
      var v = parseInt(inp.value, 10);
      if (isNaN(v) || v < 0) v = 0;
      if (v > 9999) { v = 9999; inp.value = '9999'; }
      obj.qty = v;
      onChange();
    });
  }

  /* ---- بناء الشاشة ---- */
  function build(root) {
    addCol(COL_BOX, UNITS_BOX); addCol(COL_BAG, UNITS_BAG); addCol(COL_BOX2, UNITS_BOX); addCol(COL_BOX3, UNITS_BOX);

    root.innerHTML =
      '<a class="back-link" onclick="showView(\'homeView\')">⟵ رجوع</a>' +
      '<div class="ord-tabs" role="tablist">' +
        '<button type="button" role="tab" id="ordTabNew" aria-selected="true">طلب جديد</button>' +
        '<button type="button" role="tab" id="ordTabHist" aria-selected="false">الطلبات السابقة <span class="ord-tab-n" id="ordHistN"></span></button>' +
      '</div>' +
      '<div id="ordHistPane" class="hidden">' +
        '<div class="card ord-card">' +
          '<h3 class="ord-title">الطلبات السابقة</h3>' +
          '<p class="ord-sub">الطلبات التي أُرسلت من مركزكم، الأحدث أولًا. اضغطي على الطلب لعرض أصنافه.</p>' +
          '<div id="ordHistList"><div class="ord-empty">جارٍ التحميل...</div></div>' +
        '</div>' +
      '</div>' +
      '<div id="ordNewPane">' +
      '<div class="success-msg" id="ordSuccess"></div>' +
      '<div class="card ord-card">' +
        '<h3 class="ord-title">طلبات المقاصف</h3>' +
        '<p class="ord-sub">لكل صنف تحتاجينه: اضغطي على خانة الوحدة (علبة أو كيس أو كرتون) ثم اكتبي العدد. وإن لم تجدي الصنف في الجدول فأضيفيه من «أصناف أخرى».</p>' +
        '<div class="ord-meta"><span>المركز: <b id="ordCenter"></b></span><span>تاريخ الطلب: <b id="ordDate"></b></span></div>' +
        '<div class="ord-grid3">' +
          '<div><label for="ordPeriod">الفترة <span class="ord-req">*</span></label><select id="ordPeriod" required autocomplete="off"></select></div>' +
          '<div><label for="ordTerm">الفصل الدراسي <span class="ord-req">*</span></label><select id="ordTerm" required></select></div>' +
          '<div><label for="ordYear">العام <span class="ord-req">*</span></label><select id="ordYear" required></select></div>' +
        '</div>' +
        '<div class="ord-grid2">' +
          '<div><label for="ordMasoula">مسؤولة المقصف</label><input type="text" id="ordMasoula" maxlength="80" placeholder="الاسم" autocomplete="off"></div>' +
          '<div><label for="ordManager">مديرة المركز</label><input type="text" id="ordManager" maxlength="80" placeholder="الاسم" autocomplete="off"></div>' +
        '</div>' +
      '</div>' +
      '<div class="card ord-card">' +
        '<h3 class="ord-title">الأصناف</h3>' +
        '<div class="ord-search">' +
          '<input type="text" id="ordSearch" placeholder="🔍 ابحثي عن صنف..." autocomplete="off">' +
          '<button type="button" class="ord-chip" id="ordOnlySel" aria-pressed="false">المحدّدة فقط</button>' +
        '</div>' +
        '<div class="ord-list" id="ordList"></div>' +
        '<div class="ord-empty hidden" id="ordEmpty">لا توجد أصناف مطابقة.</div>' +
      '</div>' +
      '<div class="card ord-card">' +
        '<h3 class="ord-title">أصناف أخرى</h3>' +
        '<p class="ord-sub">لأي صنف غير موجود في القائمة أعلاه.</p>' +
        '<div id="ordOthers"></div>' +
        '<button type="button" class="btn outline ord-add" id="ordAddOther">＋ إضافة صنف آخر</button>' +
      '</div>' +
      '<div class="card ord-card">' +
        '<label for="ordNotes" style="margin-top:0;">ملاحظات (اختياري)</label>' +
        '<textarea id="ordNotes" rows="3" maxlength="500" placeholder="أي ملاحظة على الطلب"></textarea>' +
      '</div>' +
      '<div class="error-msg" id="ordError"></div>' +
      '<div class="ord-bar">' +
        '<span class="ord-count" id="ordCount"></span>' +
        '<button type="button" class="btn ord-send" id="ordSend">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>' +
          '<span>إرسال الطلب</span>' +
        '</button>' +
      '</div>' +
      '</div>';

    // قوائم الاختيار
    fillSelect('ordPeriod', ['صباحي', 'مسائي'], 'اختاري');
    $('ordPeriod').value = ''; // تبدأ دائماً بـ«اختاري» ولا تُعبّأ تلقائياً
    fillSelect('ordTerm', AR_TERMS, 'اختاري الفصل');
    fillYearSelect('ordYear');

    // الأصناف: جدول لكل مجموعة (الصنف | اختيار: علبة أو كيس / كرتون | العدد) مثل النموذج الورقي
    var idx = 0;
    $('ordList').innerHTML = GROUPS.map(function (g) {
      return '<div class="ord-tbl-wrap"><table class="ord-tbl">' +
        '<colgroup><col><col class="ord-c-u"><col class="ord-c-u"><col class="ord-c-q"></colgroup>' +
        '<thead><tr><th rowspan="2" scope="col">الصنف</th><th colspan="2" scope="colgroup">اختيار</th><th rowspan="2" scope="col">العدد</th></tr>' +
        '<tr>' + g.units.map(function (u) { return '<th scope="col">' + u + '</th>'; }).join('') + '</tr></thead><tbody>' +
        g.items.map(function (it) {
          var i = idx++;
          return '<tr data-i="' + i + '"><td class="ord-name">' + esc(it.n) + '</td>' +
            it.units.map(function (u) {
              return '<td class="ord-u"><button type="button" data-u="' + u + '" aria-pressed="false" aria-label="' + esc(it.n) + ' — ' + u + '"></button></td>';
            }).join('') +
            '<td class="ord-q"><input type="number" class="ord-n" inputmode="numeric" min="0" max="9999" step="1" placeholder="—" aria-label="العدد: ' + esc(it.n) + '"></td></tr>';
        }).join('') + '</tbody></table></div>';
    }).join('');
    GROUPS.forEach(function (g, gi) { g.el = $('ordList').children[gi]; });
    Array.prototype.forEach.call($('ordList').querySelectorAll('tbody tr'), function (row) {
      var it = ITEMS[+row.getAttribute('data-i')];
      it.el = row;
      var inp = row.querySelector('.ord-n');
      inp.addEventListener('input', function () {
        var v = parseInt(inp.value, 10);
        if (isNaN(v) || v < 0) v = 0;
        if (v > 9999) { v = 9999; inp.value = '9999'; }
        it.qty = v;
        paintRow(it); updateBar();
      });
      Array.prototype.forEach.call(row.querySelectorAll('.ord-u button'), function (b) {
        b.addEventListener('click', function () {
          var u = b.getAttribute('data-u');
          it.unit = (it.unit === u) ? '' : u;
          paintRow(it); updateBar();
          if (it.unit && !it.qty) inp.focus();
        });
      });
    });

    // البحث والتصفية
    $('ordSearch').addEventListener('input', function (e) { ST.q = norm(e.target.value); applyFilter(); });
    $('ordOnlySel').addEventListener('click', function () {
      ST.onlySel = !ST.onlySel;
      this.setAttribute('aria-pressed', ST.onlySel ? 'true' : 'false');
      applyFilter();
    });

    $('ordAddOther').addEventListener('click', function () { addOther(true); });
    $('ordTabNew').addEventListener('click', function () { showPane(false); });
    $('ordTabHist').addEventListener('click', function () { showPane(true); });
    ['ordPeriod', 'ordTerm', 'ordYear'].forEach(function (id) {
      $(id).addEventListener('change', function () { $(id).classList.toggle('ord-bad', !$(id).value); });
    });
    $('ordSend').addEventListener('click', send);
    ST.built = true;
    updateBar();
  }

  function paintRow(it) {
    var row = it.el;
    row.classList.toggle('on', it.qty > 0);
    row.classList.toggle('need-unit', it.qty > 0 && !it.unit);
    row.classList.toggle('need-qty', !!it.unit && !(it.qty > 0));
    Array.prototype.forEach.call(row.querySelectorAll('.ord-u button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-u') === it.unit ? 'true' : 'false');
    });
  }

  function applyFilter() {
    var shown = 0;
    ITEMS.forEach(function (it) {
      var ok = (!ST.q || it.nn.indexOf(ST.q) !== -1) && (!ST.onlySel || it.qty > 0);
      it.el.classList.toggle('hidden', !ok);
      if (ok) shown++;
    });
    GROUPS.forEach(function (g) {
      g.el.classList.toggle('hidden', !g.items.some(function (it) { return !it.el.classList.contains('hidden'); }));
    });
    $('ordEmpty').classList.toggle('hidden', shown > 0);
  }

  /* ---- أصناف أخرى ---- */
  function addOther(focus) {
    var o = { name: '', unit: '', qty: 0 };
    ST.others.push(o);
    var div = document.createElement('div');
    div.className = 'ord-other-row';
    div.innerHTML =
      '<input type="text" class="ord-o-name" maxlength="80" placeholder="اسم الصنف" aria-label="اسم الصنف" autocomplete="off">' +
      '<select class="ord-o-unit" aria-label="الوحدة"><option value="">الوحدة</option>' +
        UNITS_OTHER.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('') + '</select>' +
      qtyHtml() +
      '<button type="button" class="ord-o-del" aria-label="حذف هذا الصنف">×</button>';
    $('ordOthers').appendChild(div);
    var nameInp = div.querySelector('.ord-o-name');
    nameInp.addEventListener('input', function () { o.name = nameInp.value; div.classList.remove('bad'); updateBar(); });
    div.querySelector('.ord-o-unit').addEventListener('change', function (e) { o.unit = e.target.value; div.classList.remove('bad'); });
    wireQty(div.querySelector('.ord-qty'), o, function () { div.classList.remove('bad'); updateBar(); });
    div.querySelector('.ord-o-del').addEventListener('click', function () {
      ST.others.splice(ST.others.indexOf(o), 1);
      div.remove();
      updateBar();
    });
    o.el = div;
    if (focus) nameInp.focus();
    return o;
  }

  /* ---- الشريط السفلي ---- */
  function selectedCount() {
    var n = 0;
    ITEMS.forEach(function (it) { if (it.qty > 0) n++; });
    ST.others.forEach(function (o) { if (o.qty > 0 && o.name.trim()) n++; });
    return n;
  }
  function updateBar() {
    var n = selectedCount();
    $('ordCount').innerHTML = n ? 'الأصناف المحدّدة: <b>' + ar(n) + '</b>' : 'لم تحدّدي أي صنف بعد';
    $('ordError').style.display = 'none';
  }

  function showError(msg, el) {
    var box = $('ordError');
    box.textContent = msg;
    box.style.display = 'block';
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---- الإرسال ---- */
  function send() {
    if (ST.sendBusy) return;
    if (typeof isReadOnlyCenter !== 'undefined' && isReadOnlyCenter) { showError('هذا الحساب للعرض فقط ولا يمكنه إرسال الطلبات.'); return; }
    var period = $('ordPeriod').value, term = $('ordTerm').value, year = $('ordYear').value;
    var masoulaName = $('ordMasoula').value.replace(/\s+/g, ' ').trim();
    var managerName = $('ordManager').value.replace(/\s+/g, ' ').trim();
    $('ordPeriod').classList.toggle('ord-bad', !period);
    $('ordTerm').classList.toggle('ord-bad', !term);
    $('ordYear').classList.toggle('ord-bad', !year);
    if (!period) { showError('اختيار الفترة إلزامي: اختاري (صباحي) أو (مسائي).', $('ordPeriod')); $('ordPeriod').focus(); return; }
    if (!term) { showError('اختاري الفصل الدراسي.', $('ordTerm')); return; }
    if (!year) { showError('اختاري العام.', $('ordYear')); return; }
    if (ST.role === ROLE_MASOULA && !masoulaName) { showError('اكتبي اسم مسؤولة المقصف.', $('ordMasoula')); return; }
    if (ST.role !== ROLE_MASOULA && !managerName) { showError('اكتبي اسم مديرة المركز.', $('ordManager')); return; }

    var items = [];
    for (var i = 0; i < ITEMS.length; i++) {
      var it = ITEMS[i];
      if (!(it.qty > 0)) {
        if (it.unit) { it.el.classList.remove('hidden'); it.g.el.classList.remove('hidden'); showError('اكتبي العدد للصنف: ' + it.n + ' (أو ألغي اختيار الوحدة).', it.el); return; }
        continue;
      }
      if (!it.unit) { it.el.classList.remove('hidden'); it.g.el.classList.remove('hidden'); showError('حدّدي الوحدة (' + it.units.join(' أو ') + ') للصنف: ' + it.n, it.el); return; }
      items.push({ name: it.n, unit: it.unit, qty: it.qty, other: false });
    }
    for (var k = 0; k < ST.others.length; k++) {
      var o = ST.others[k];
      var name = o.name.replace(/\s+/g, ' ').trim();
      if (!name && !o.unit && !(o.qty > 0)) continue; // سطر فارغ نتجاهله
      if (!name || !o.unit || !(o.qty > 0)) {
        o.el.classList.add('bad');
        showError('أكملي بيانات «الصنف الآخر»: الاسم والوحدة والعدد.', o.el);
        return;
      }
      items.push({ name: name, unit: o.unit, qty: o.qty, other: true });
    }
    if (!items.length) { showError('لم تحدّدي أي صنف بعد. اختاري الوحدة واكتبي العدد لصنف واحد على الأقل.'); return; }

    if (!confirm('سيتم إرسال الطلب (' + ar(items.length) + ' ' + (items.length === 1 ? 'صنف' : 'أصناف') + ') إلى وحدة المقاصف. هل تريدين المتابعة؟')) return;

    var btn = $('ordSend');
    ST.sendBusy = true;
    setBtnBusy(btn, true, 'جارِ الإرسال...');
    callApi('submitCanteenOrder', {
      center: currentCenter, role: ST.role, period: period, term: term, year: year,
      masoulaName: masoulaName, managerName: managerName, notes: $('ordNotes').value.trim(), items: items
    }).then(function (r) {
      ST.sendBusy = false;
      setBtnBusy(btn, false);
      if (!r || !r.ok) { showError((r && r.error) || 'تعذّر إرسال الطلب، حاولي مرة أخرى.'); return; }
      ls('maqasif_ord_manager', managerName);
      if (ST.role !== ROLE_MASOULA) ls('maqasif_ord_masoula', masoulaName);
      reset();
      loadHistory();
      var ok = $('ordSuccess');
      ok.textContent = r.emailSent === false
        ? 'تم حفظ الطلب ✅ لكن تعذّر إرسال إشعار البريد، يُرجى إبلاغ وحدة المقاصف.'
        : 'تم إرسال الطلب ✅ وصل الإشعار إلى وحدة المقاصف.';
      ok.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(function () { ok.style.display = 'none'; }, 12000);
    }).catch(function () {
      ST.sendBusy = false;
      setBtnBusy(btn, false);
      showError('تعذّر الاتصال بالخادم، تأكدي من الإنترنت ثم حاولي مرة أخرى. (إن لم يصلكِ تأكيد فلا تكرّري الإرسال أكثر من مرة قبل التأكد.)');
    });
  }

  function reset() {
    ITEMS.forEach(function (it) {
      it.unit = ''; it.qty = 0;
      it.el.querySelector('.ord-n').value = '';
      paintRow(it);
    });
    ST.others = [];
    $('ordOthers').innerHTML = '';
    $('ordNotes').value = '';
    $('ordPeriod').value = '';
    $('ordSearch').value = '';
    ST.q = ''; ST.onlySel = false;
    $('ordOnlySel').setAttribute('aria-pressed', 'false');
    applyFilter();
    updateBar();
  }

  /* ---- الطلبات السابقة ---- */
  var HIST = [];
  function showPane(hist) {
    $('ordHistPane').classList.toggle('hidden', !hist);
    $('ordNewPane').classList.toggle('hidden', hist);
    $('ordTabNew').setAttribute('aria-selected', hist ? 'false' : 'true');
    $('ordTabHist').setAttribute('aria-selected', hist ? 'true' : 'false');
  }
  function hijri(d) { return (d && typeof toHijriStr === 'function') ? toHijriStr(d) : (d || ''); }
  function orderText(o) {
    var L = ['طلبات بضاعة المقصف لمركز / ' + (o['اسم المركز'] || ''), 'الفترة: ' + (o['الفترة'] || ''),
      'الفصل الدراسي: ' + (o['الفصل الدراسي'] || '') + ' — ' + (o['العام'] || ''),
      'تاريخ الطلب: ' + (o['اليوم'] || '') + ' ' + hijri(o['التاريخ'])];
    if (o['مسؤولة المقصف']) L.push('مسؤولة المقصف: ' + o['مسؤولة المقصف']);
    if (o['مديرة المركز']) L.push('مديرة المركز: ' + o['مديرة المركز']);
    L.push('', 'الأصناف (' + o.items.length + '):');
    o.items.forEach(function (it, i) { L.push((i + 1) + ') ' + it.name + (it.qty !== '' ? ' — ' + it.qty + ' ' + it.unit : '') + (it.other ? ' (صنف إضافي)' : '')); });
    if (o['ملاحظات']) L.push('', 'ملاحظات: ' + o['ملاحظات']);
    return L.join('\n');
  }
  function histItemsTable(o) {
    return '<div class="ord-tbl-wrap"><table class="ord-tbl ord-tbl-hist">' +
      '<colgroup><col style="width:28px"><col><col style="width:56px"><col style="width:48px"><col style="width:46px"></colgroup>' +
      '<thead><tr><th>م</th><th>الصنف</th><th>علبة / كيس</th><th>كرتون</th><th>العدد</th></tr></thead><tbody>' +
      o.items.map(function (it, i) {
        var carton = it.unit === 'كرتون';
        return '<tr><td class="c">' + ar(i + 1) + '</td><td class="ord-name">' + esc(it.name) + (it.other ? ' <small>(صنف إضافي)</small>' : '') + '</td>' +
          '<td class="c">' + (!carton && it.unit ? '<span class="ord-tick">✔</span><div class="u">' + esc(it.unit) + '</div>' : '') + '</td>' +
          '<td class="c">' + (carton ? '<span class="ord-tick">✔</span>' : '') + '</td>' +
          '<td class="c q">' + esc(it.qty === '' ? '' : ar(it.qty)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function renderHistory() {
    var box = $('ordHistList');
    $('ordHistN').textContent = HIST.length ? '(' + ar(HIST.length) + ')' : '';
    if (!HIST.length) { box.innerHTML = '<div class="ord-empty">لم يُرسَل أي طلب من مركزكم بعد.</div>'; return; }
    box.innerHTML = HIST.map(function (o, i) {
      var done = o['الحالة'] === 'تم التنفيذ';
      var who = [o['مسؤولة المقصف'] ? 'مسؤولة المقصف: ' + esc(o['مسؤولة المقصف']) : '', o['مديرة المركز'] ? 'مديرة المركز: ' + esc(o['مديرة المركز']) : ''].filter(Boolean).join(' · ');
      return '<details class="ord-hist">' +
        '<summary><div class="ord-hist-top"><b>' + esc(o['اليوم'] || '') + ' ' + esc(hijri(o['التاريخ'])) + '</b>' +
          '<span class="ord-pill ' + (done ? 'done' : 'wait') + '">' + (done ? 'تم التنفيذ' : 'بانتظار التنفيذ') + '</span></div>' +
          '<div class="ord-hist-meta">' + esc(o['الفترة'] || '') + ' · الفصل ' + esc(o['الفصل الدراسي'] || '') + ' ' + esc(o['العام'] || '') +
          ' · ' + ar(o.items.length) + ' ' + (o.items.length === 1 ? 'صنف' : 'أصناف') + '</div></summary>' +
        (who ? '<div class="ord-hist-meta" style="margin:6px 0 8px;">' + who + '</div>' : '') +
        histItemsTable(o) +
        (o['ملاحظات'] ? '<div class="ord-hist-notes"><b>ملاحظات: </b>' + esc(o['ملاحظات']) + '</div>' : '') +
        '<button type="button" class="btn outline ord-copy" data-i="' + i + '">نسخ نص الطلب</button>' +
      '</details>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.ord-copy'), function (b) {
      b.addEventListener('click', function () { copyText(orderText(HIST[+b.getAttribute('data-i')]), b); });
    });
  }
  function copyText(text, btn) {
    var done = function () { var t = btn.textContent; btn.textContent = 'تم النسخ ✔'; setTimeout(function () { btn.textContent = t; }, 1800); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { alert('تعذّر النسخ'); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  function loadHistory() {
    var center = (typeof currentCenter !== 'undefined') ? currentCenter : '';
    if (!center) return;
    try { _apiCache_.forEach(function (v, k) { if (String(k).indexOf('getCanteenOrders') !== -1) _apiCache_.delete(k); }); } catch (e) {}
    if (!HIST.length) $('ordHistList').innerHTML = '<div class="ord-empty">جارٍ التحميل...</div>';
    callApi('getCanteenOrders', { center: center }).then(function (r) {
      if (!r || !r.ok) { $('ordHistList').innerHTML = '<div class="ord-empty">تعذّر تحميل الطلبات السابقة.</div>'; return; }
      HIST = r.orders || [];
      renderHistory();
    }).catch(function () { $('ordHistList').innerHTML = '<div class="ord-empty">تعذّر الاتصال، حاولي مرة أخرى.</div>'; });
  }

  /* ---- فتح الشاشة ---- */
  window.initOrdersView_ = function (role) {
    var root = $('ordersView');
    if (!root) return;
    ST.role = role || '';
    if (!ST.built) build(root);

    $('ordCenter').textContent = (typeof currentCenter !== 'undefined' && currentCenter) ? currentCenter : '';
    var today = todayStr();
    $('ordDate').textContent = dayNameFor(today) + ' ' + toHijriStr(today);

    var isMasoula = ST.role === ROLE_MASOULA;
    var sessionName = (typeof currentName === 'string') ? currentName : '';
    if (!$('ordMasoula').value) $('ordMasoula').value = (isMasoula && sessionName) ? sessionName : ls('maqasif_ord_masoula');
    if (!$('ordManager').value) $('ordManager').value = ls('maqasif_ord_manager');
    $('ordError').style.display = 'none';
    showPane(false);
    loadHistory();
    window.scrollTo({ top: 0 });
  };
})();
