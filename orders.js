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
  function addCol(names, units) { names.forEach(function (n) { ITEMS.push({ n: n, nn: norm(n), units: units, unit: '', qty: 0, el: null }); }); }

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
      '<div class="success-msg" id="ordSuccess"></div>' +
      '<div class="card ord-card">' +
        '<h3 class="ord-title">طلبات المقاصف</h3>' +
        '<p class="ord-sub">لكل صنف تحتاجينه: اختاري الوحدة ثم اكتبي العدد. وإن لم تجدي الصنف في القائمة فأضيفيه من «أصناف أخرى».</p>' +
        '<div class="ord-meta"><span>المركز: <b id="ordCenter"></b></span><span>تاريخ الطلب: <b id="ordDate"></b></span></div>' +
        '<div class="ord-grid3">' +
          '<div><label for="ordPeriod">الفترة</label><select id="ordPeriod"></select></div>' +
          '<div><label for="ordTerm">الفصل الدراسي</label><select id="ordTerm"></select></div>' +
          '<div><label for="ordYear">العام</label><select id="ordYear"></select></div>' +
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
      '</div>';

    // قوائم الاختيار
    fillSelect('ordPeriod', ['صباحي', 'مسائي'], 'اختاري الفترة');
    fillSelect('ordTerm', AR_TERMS, 'اختاري الفصل');
    fillYearSelect('ordYear');

    // الأصناف
    var list = $('ordList');
    list.innerHTML = ITEMS.map(function (it, i) {
      return '<div class="ord-item" data-i="' + i + '">' +
        '<div class="ord-name">' + esc(it.n) + '</div>' +
        '<div class="ord-units" role="group" aria-label="الوحدة">' +
          it.units.map(function (u) { return '<button type="button" data-u="' + u + '" aria-pressed="false">' + u + '</button>'; }).join('') +
        '</div>' + qtyHtml() + '</div>';
    }).join('');
    Array.prototype.forEach.call(list.children, function (row) {
      var it = ITEMS[+row.getAttribute('data-i')];
      it.el = row;
      wireQty(row.querySelector('.ord-qty'), it, function () { paintRow(it); updateBar(); });
      Array.prototype.forEach.call(row.querySelectorAll('.ord-units button'), function (b) {
        b.addEventListener('click', function () {
          var u = b.getAttribute('data-u');
          it.unit = (it.unit === u) ? '' : u;
          paintRow(it); updateBar();
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
    $('ordSend').addEventListener('click', send);
    ST.built = true;
    updateBar();
  }

  function paintRow(it) {
    var row = it.el;
    row.classList.toggle('on', it.qty > 0);
    row.classList.toggle('need-unit', it.qty > 0 && !it.unit);
    Array.prototype.forEach.call(row.querySelectorAll('.ord-units button'), function (b) {
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
    if (!period) { showError('اختاري الفترة (صباحي أو مسائي).', $('ordPeriod')); return; }
    if (!term) { showError('اختاري الفصل الدراسي.', $('ordTerm')); return; }
    if (!year) { showError('اختاري العام.', $('ordYear')); return; }
    if (ST.role === ROLE_MASOULA && !masoulaName) { showError('اكتبي اسم مسؤولة المقصف.', $('ordMasoula')); return; }
    if (ST.role !== ROLE_MASOULA && !managerName) { showError('اكتبي اسم مديرة المركز.', $('ordManager')); return; }

    var items = [];
    for (var i = 0; i < ITEMS.length; i++) {
      var it = ITEMS[i];
      if (!(it.qty > 0)) continue;
      if (!it.unit) { it.el.classList.remove('hidden'); showError('حدّدي الوحدة (' + it.units.join(' أو ') + ') للصنف: ' + it.n, it.el); return; }
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
      ls('maqasif_ord_period', period);
      ls('maqasif_ord_manager', managerName);
      if (ST.role !== ROLE_MASOULA) ls('maqasif_ord_masoula', masoulaName);
      reset();
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
      it.el.querySelector('.ord-qty input').value = '';
      paintRow(it);
    });
    ST.others = [];
    $('ordOthers').innerHTML = '';
    $('ordNotes').value = '';
    $('ordSearch').value = '';
    ST.q = ''; ST.onlySel = false;
    $('ordOnlySel').setAttribute('aria-pressed', 'false');
    applyFilter();
    updateBar();
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
    if (!$('ordPeriod').value) {
      var p = ls('maqasif_ord_period');
      if (p === 'صباحي' || p === 'مسائي') $('ordPeriod').value = p;
    }
    $('ordError').style.display = 'none';
    window.scrollTo({ top: 0 });
  };
})();
