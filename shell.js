/* القائمة الجانبية + صفحة «ما يحتاج انتباهكِ الآن»: تُبنى تلقائياً من أيقونات كل صفحة ولا تغيّر أي منطق قائم */
(function () {
  var MQ = window.matchMedia('(min-width:900px)'), sig = '', active = 'home', timer = null, lastLoad = 0, q = '';
  var PREF = ['المبيعات والمالية', 'الإشعارات', 'بطاقات التحفيز', 'المتابعة والمراسلات', 'حسابي'];
  function centerGroup(k) {
    if (/^إشعار/.test(k)) return 'الإشعارات';
    if (/بطاقات التحفيز/.test(k)) return 'بطاقات التحفيز';
    if (/الأسعار|البيع|الفواتير|المرتجعة|طلبات/.test(k)) return 'المبيعات والمالية';
    if (/بياناتي|الأسئلة/.test(k)) return 'حسابي';
    return 'المتابعة والمراسلات';
  }
  var HOME_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/></svg>';
  function $(id) { return document.getElementById(id); }
  function norm(s) { return String(s || '').replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim(); }
  function hid(el, stop) { for (; el && el !== stop; el = el.parentElement) if (el.classList.contains('hidden') || el.style.display === 'none') return true; return false; }
  function homeEl() { return $('adminHomeView') || $('homeView'); }
  function isHome() { var h = homeEl(); return !!h && !h.classList.contains('hidden'); }
  function goHome() {
    if (typeof showView === 'function' && $('homeView')) showView('homeView');
    else if (typeof showAdminTab === 'function') showAdminTab();
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function mark() {
    [].forEach.call(document.querySelectorAll('#shellSide .sh-i'), function (n) { n.classList.toggle('on', isHome() ? n.dataset.k === 'home' : n.dataset.k === active); });
  }
  function filter() {
    var nq = norm(q), g = null, any = false;
    [].forEach.call(document.querySelectorAll('#shellSide nav > *'), function (n) {
      if (n.classList.contains('sh-g')) { if (g) g.style.display = any || !nq ? '' : 'none'; g = n; any = false; return; }
      var show = !nq || (n.dataset.k !== 'home' && norm(n.dataset.k).indexOf(nq) > -1);
      n.style.display = show ? '' : 'none'; if (show) any = true;
    });
    if (g) g.style.display = any || !nq ? '' : 'none';
  }
  function frame(dash) {
    var side = $('shellSide'); if (side) return side;
    side = el('aside'); side.id = 'shellSide';
    var br = el('div', 'sh-brand'), logo = $('brandLogo');
    if (logo && logo.src) { var im = el('img'); im.src = logo.src; im.alt = ''; br.appendChild(im); }
    br.appendChild(el('span', '', ((dash.querySelector('.topbar .brand') || {}).textContent || '').trim())); side.appendChild(br);
    var sb = el('div', 'sh-q'), inp = el('input'); inp.type = 'search'; inp.placeholder = 'ابحثي عن قسم...'; inp.autocomplete = 'off';
    inp.oninput = function () { q = inp.value; filter(); }; sb.appendChild(inp); side.appendChild(sb);
    side.appendChild(el('nav'));
    var ft = el('div', 'sh-foot'), ob = el('button', 'sh-out', 'تسجيل الخروج');
    ob.onclick = function () { var l = dash.querySelector('.topbar .logout'); if (l) l.click(); };
    ft.appendChild(ob); side.appendChild(ft); document.body.appendChild(side); return side;
  }
  function homeBox() {
    var b = $('shellHome'); if (b) return b;
    var host = $('adminHomeView') ? document.querySelector('#adminHomeView .wrap') : $('homeView');
    if (!host) return null;
    b = el('div'); b.id = 'shellHome'; b.appendChild(el('h3', '', 'ما يحتاج انتباهكِ الآن'));
    b.appendChild(el('div', 'sh-m')); b.appendChild(el('div', 'sh-at')); b.appendChild(el('div', 'sh-em'));
    var ref = $('announceBanner') || host.querySelector('h2');
    if (ref && ref.parentNode === host) host.insertBefore(b, ref.nextSibling); else host.insertBefore(b, host.firstChild);
    return b;
  }
  function renderHome(items) {
    var b = homeBox(); if (!b) return;
    var m = b.querySelector('.sh-m'); m.innerHTML = '';
    items.filter(function (i) { return i.n; }).forEach(function (i) {
      var c = el('div', 'sh-mc'), s = el('small', '', i.k), n = el('b', '', i.n); c.appendChild(s); c.appendChild(n);
      c.onclick = function () { active = i.k; i.b.click(); mark(); }; m.appendChild(c);
    });
    updEmpty();
  }
  function updEmpty() {
    var b = $('shellHome'); if (!b) return;
    var has = b.querySelector('.sh-mc') || b.querySelector('.sh-ac') || ($('toSignBanner') && $('toSignBanner').children.length);
    var em = b.querySelector('.sh-em'); em.innerHTML = '';
    if (!has) em.appendChild(el('div', 'sh-empty', 'لا يوجد ما يحتاج انتباهكِ الآن. اختاري قسماً من القائمة.'));
  }
  function loadAttention() {
    if (!$('adminHomeView') || typeof callApi !== 'function' || Date.now() - lastLoad < 30000) return;
    lastLoad = Date.now();
    callApi('getAdminAttention', { _t: Date.now() }).then(function (r) {
      var b = $('shellHome'); if (!b || !r || !r.ok) return;
      var at = b.querySelector('.sh-at'); at.innerHTML = '';
      (r.items || []).forEach(function (it) {
        var c = el('div', 'sh-ac'); c.appendChild(el('div', 't', it.title + (it.center ? ' — ' + it.center : '')));
        var sn = it.seen || [];
        if (!sn.length) c.appendChild(el('div', 's sh-no', '👁 لم يتم الاطلاع على التنبيه بعد'));
        else sn.forEach(function (x) {
          var p = String(x.at || '').split(' '), d = p[0] && typeof toHijriStr === 'function' ? toHijriStr(p[0]) + (p[1] ? ' ' + p[1] : '') : '';
          c.appendChild(el('div', 's sh-ok', '👁 تم الاطلاع: ' + x.who + (d ? ' · ' + d : '')));
        });
        at.appendChild(c);
      });
      updEmpty();
    }).catch(function () {});
  }
  function build() {
    timer = null;
    var dash = $('dashScreen'), on = !!dash && !dash.classList.contains('hidden') && MQ.matches;
    document.body.classList.toggle('shell-on', on);
    if (!on) return;
    var home = homeEl(); if (!home) return;
    var items = [].slice.call(dash.querySelectorAll('.icon-btn')).filter(function (b) { return !hid(b, home.parentElement) && !b.closest('#shellHome'); }).map(function (b) {
      var bd = b.querySelector('.badge'), ic = b.querySelector('.ic'), lb = b.querySelector('.label'), k = lb ? lb.textContent.trim() : '';
      var sec = b.closest('.ah-sec'), gh = sec && sec.querySelector('h3');
      return { b: b, k: k, svg: ic ? ic.innerHTML : '', n: bd && !bd.classList.contains('hidden') ? bd.textContent.trim() : '', g: gh ? gh.textContent.trim() : centerGroup(k) };
    });
    var s = items.map(function (i) { return i.k + ':' + i.n + ':' + i.g; }).join(',');
    var side = frame(dash);
    if (s !== sig) {
      sig = s;
      var nav = side.querySelector('nav'); nav.innerHTML = '';
      var add = function (k, svg, n, fn) {
        var d = el('div', 'sh-i'); d.dataset.k = k;
        var c = el('span', 'sh-c'); c.innerHTML = svg; d.appendChild(c); d.appendChild(el('span', '', k === 'home' ? 'الرئيسية' : k));
        if (n) d.appendChild(el('em', 'sh-b', n));
        d.onclick = function () { active = k; fn(); mark(); window.scrollTo(0, 0); }; nav.appendChild(d);
      };
      add('home', HOME_SVG, '', goHome);
      var order = [], by = {};
      items.forEach(function (i) { if (!by[i.g]) { by[i.g] = []; order.push(i.g); } by[i.g].push(i); });
      if (!$('adminHomeView')) order.sort(function (a, b) { return PREF.indexOf(a) - PREF.indexOf(b); });
      order.forEach(function (g) { nav.appendChild(el('div', 'sh-g', g)); by[g].forEach(function (i) { add(i.k, i.svg, i.n, function () { i.b.click(); }); }); });
      filter(); renderHome(items);
    }
    mark(); if (isHome()) loadAttention();
  }
  function later() { if (!timer) timer = setTimeout(build, 200); }
  document.addEventListener('DOMContentLoaded', function () {
    var dash = $('dashScreen'); if (!dash) return;
    new MutationObserver(later).observe(dash, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'], characterData: true });
    dash.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.icon-btn');
      if (b && !b.closest('#shellHome')) { var l = b.querySelector('.label'); if (l) active = l.textContent.trim(); later(); }
    });
    if (MQ.addEventListener) MQ.addEventListener('change', later);
    later();
  });
})();
