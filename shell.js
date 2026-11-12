/* القائمة الجانبية: تُبنى تلقائياً من أيقونات الصفحة الرئيسية نفسها (لا تغيّر أي منطق قائم) */
(function () {
  var MQ = window.matchMedia('(min-width:900px)'), sig = '', active = 'home', timer = null;
  var HOME_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/></svg>';
  function $(id) { return document.getElementById(id); }
  function hid(el, stop) {
    for (; el && el !== stop; el = el.parentElement) if (el.classList.contains('hidden') || el.style.display === 'none') return true;
    return false;
  }
  function homeEl() { return $('adminHomeView') || $('homeView'); }
  function goHome() {
    if (typeof showView === 'function' && $('homeView')) showView('homeView');
    else if (typeof showAdminTab === 'function') showAdminTab();
  }
  function mark() {
    var h = homeEl(), isHome = h && !h.classList.contains('hidden');
    [].forEach.call(document.querySelectorAll('#shellSide .sh-i'), function (n) {
      n.classList.toggle('on', isHome ? n.dataset.k === 'home' : n.dataset.k === active);
    });
  }
  function build() {
    timer = null;
    var dash = $('dashScreen'), on = !!dash && !dash.classList.contains('hidden') && MQ.matches;
    document.body.classList.toggle('shell-on', on);
    if (!on) return;
    var grid = dash.querySelector('.icon-grid'); if (!grid) return;
    var items = [].slice.call(grid.querySelectorAll('.icon-btn')).filter(function (b) { return !hid(b, grid.parentElement); }).map(function (b) {
      var bd = b.querySelector('.badge'), ic = b.querySelector('.ic'), lb = b.querySelector('.label');
      return { b: b, k: lb ? lb.textContent.trim() : '', svg: ic ? ic.innerHTML : '', n: bd && !bd.classList.contains('hidden') ? bd.textContent.trim() : '' };
    });
    var brandTxt = (dash.querySelector('.topbar .brand') || {}).textContent || '', logo = $('brandLogo');
    var s = brandTxt + '|' + (logo && !logo.classList.contains('hidden') ? logo.src : '') + '|' + items.map(function (i) { return i.k + ':' + i.n; }).join(',');
    if (s === sig && $('shellSide')) { mark(); return; }
    sig = s;
    var side = $('shellSide');
    if (!side) { side = document.createElement('aside'); side.id = 'shellSide'; document.body.appendChild(side); }
    side.innerHTML = '';
    var br = document.createElement('div'); br.className = 'sh-brand';
    if (logo && !logo.classList.contains('hidden') && logo.src) { var im = document.createElement('img'); im.src = logo.src; im.alt = ''; br.appendChild(im); }
    var bt = document.createElement('span'); bt.textContent = brandTxt.trim(); br.appendChild(bt); side.appendChild(br);
    var nav = document.createElement('nav'); side.appendChild(nav);
    function add(k, svg, label, n, fn) {
      var d = document.createElement('div'); d.className = 'sh-i'; d.dataset.k = k;
      d.innerHTML = svg + '<span></span>'; d.lastChild.textContent = label;
      if (n) { var b = document.createElement('em'); b.className = 'sh-b'; b.style.fontStyle = 'normal'; b.textContent = n; d.appendChild(b); }
      d.onclick = function () { active = k; fn(); mark(); window.scrollTo(0, 0); };
      nav.appendChild(d);
    }
    add('home', HOME_SVG, 'الرئيسية', '', goHome);
    items.forEach(function (i) { add(i.k, i.svg, i.k, i.n, function () { i.b.click(); }); });
    var ft = document.createElement('div'); ft.className = 'sh-foot';
    var ob = document.createElement('button'); ob.className = 'sh-out'; ob.textContent = 'تسجيل الخروج';
    ob.onclick = function () { var l = dash.querySelector('.topbar .logout'); if (l) l.click(); };
    ft.appendChild(ob); side.appendChild(ft);
    mark();
  }
  function later() { if (!timer) timer = setTimeout(build, 200); }
  document.addEventListener('DOMContentLoaded', function () {
    var dash = $('dashScreen'); if (!dash) return;
    new MutationObserver(later).observe(dash, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'], characterData: true });
    dash.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.icon-grid .icon-btn');
      if (b) { var l = b.querySelector('.label'); if (l) active = l.textContent.trim(); later(); }
    });
    if (MQ.addEventListener) MQ.addEventListener('change', later);
    later();
  });
})();
