/* ===== الحفظ التلقائي لنماذج نظام المقاصف (مثل Google Sheets) =====
   كل ما تكتبه المستخدمة في أي نموذج يُحفظ في جهازها أثناء الكتابة. إذا انقطع الإنترنت أو خرجت من الصفحة
   أو أُغلق المتصفح ثم فتحت النموذج نفسه من جديد، يرجع ما كتبته كما هو مع شريط أخضر يوضّح ذلك.
   تُحذف المسودة تلقائياً بعد الحفظ أو الإرسال الناجح.
   - يعمل في marakez.html و masoulat.html و edara.html (يُضاف بعد config.js).
   - لا يحفظ: كلمات المرور، الملفات المرفوعة، التواقيع المرسومة، خانات البحث والتصفية.
   - لا يعمل أثناء «تعديل» سجل محفوظ (عند ظهور زر «إلغاء التعديل»)، حتى لا يختلط التعديل بمسودة جديدة. */
(function () {
  'use strict';

  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/i, '');
  var IS_ADMIN = !!document.querySelector('.admin-tab-panel');

  /* الشاشات التي لا تحتوي نماذج إدخال (عرض فقط أو لها حفظ خاص بها) */
  var SKIP = {
    homeView: 1, faqView: 1, announcementsView: 1, noticesView: 1, meetingMinutesView: 1, visitReportsView: 1,
    cardsFollowupView: 1, tasksView: 1,
    // الإدارة
    visitReportTab: 1, meetingMinutesTab: 1, attendanceTab: 1, gradesTab: 1, termTab: 1, statsTab: 1,
    regStatsTab: 1, pledgesTab: 1, tasksStatusTab: 1, noticesTab: 1, canteenSurveyTab: 1, salesTab: 1,
    returnsTab: 1, ordersAdminTab: 1, difficultiesTab: 1
  };

  /* أجزاء خاصة لا تُلتقط بالحقول العادية (صفوف تُضاف ديناميكياً) */
  var EXT = {
    ordersView: function () { return window.ordersAutosave_ || null; },
    invoicesView: function () {
      if (typeof readInvoiceReturns_ !== 'function' || typeof addInvoiceReturnRow_ !== 'function') return null;
      return {
        collect: function () { return readInvoiceReturns_(); },
        meaningful: function (d) { return !!(d && d.length); },
        apply: function (d) {
          if (!d || !d.length) return;
          document.getElementById('invoiceHasReturn').checked = true;
          document.getElementById('invoiceReturnWrap').classList.remove('hidden');
          document.getElementById('invoiceReturnList').innerHTML = '';
          d.forEach(function (it) { addInvoiceReturnRow_(it); });
          if (typeof updateReturnPreview_ === 'function') updateReturnPreview_();
        },
        reset: function () { if (typeof resetInvoiceReturn_ === 'function') resetInvoiceReturn_(); }
      };
    }
  };

  function user() {
    if (IS_ADMIN) return 'admin';
    var a = '', b = '';
    try { a = (typeof currentName !== 'undefined' && currentName) ? currentName : ''; } catch (e) {}
    try { b = (typeof currentCenter !== 'undefined' && currentCenter) ? currentCenter : ''; } catch (e) {}
    return a + '|' + b;
  }
  function key(id) { return 'mqad_' + PAGE + '_' + user() + '_' + id; }
  function read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function del(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function containers() {
    var list = IS_ADMIN
      ? document.querySelectorAll('.admin-tab-panel')
      : (function () {
        var home = document.getElementById('homeView');
        return home && home.parentNode ? home.parentNode.querySelectorAll(':scope > div[id$="View"]') : [];
      })();
    return Array.prototype.filter.call(list, function (c) { return c.id && !SKIP[c.id]; });
  }
  function isShown(c) { return c && !c.classList.contains('hidden') && c.offsetParent !== null; }

  /* هل الحقل يُحفظ في المسودة؟ */
  function fieldOk(el) {
    if (!el || !el.id || el.disabled || el.closest('[data-noad]')) return false;
    var t = (el.type || '').toLowerCase();
    if (/^(password|file|hidden|button|submit|reset|image|search)$/.test(t)) return false;
    if (/search|filter/i.test(el.id) || /filter|search/i.test(el.className || '')) return false;
    var h = (el.getAttribute('onchange') || '') + (el.getAttribute('oninput') || '');
    if (/load|render|filter|search/i.test(h)) return false;   // قوائم تصفية العرض، وليست جزءاً من النموذج
    return true;
  }
  function valOf(el) { return (el.type === 'checkbox' || el.type === 'radio') ? !!el.checked : el.value; }

  /* وضع «التعديل»: زر إلغاء التعديل ظاهر داخل الشاشة */
  function editing(c) {
    var b = c.querySelectorAll('[id*="CancelEdit"],[id*="cancelEdit"]');
    for (var i = 0; i < b.length; i++) if (!b[i].classList.contains('hidden') && b[i].offsetParent !== null) return true;
    return false;
  }

  var S = {};   // حالة كل شاشة: { touched: {id:1}, dirty: bool, timer }
  var paused = false;
  function st(id) { return S[id] || (S[id] = { touched: {}, dirty: false, timer: 0 }); }

  function saveNow(c) {
    if (!c || paused || !isShown(c) || editing(c)) return;
    var s = st(c.id), f = {}, any = false;
    Object.keys(s.touched).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !c.contains(el) || !fieldOk(el)) return;
      var v = valOf(el);
      f[id] = v;
      if (v === true || (typeof v === 'string' && v.trim() && el.type !== 'date' && el.tagName !== 'SELECT')) any = true;
    });
    var ext = EXT[c.id] && EXT[c.id](), x = null;
    if (ext) { try { x = ext.collect(); } catch (e) { x = null; } if (ext.meaningful(x)) any = true; }
    if (!any) { del(key(c.id)); return; }
    var t = new Date();
    write(key(c.id), {
      f: f, x: x,
      at: t.toLocaleDateString('ar-SA-u-nu-arab', { day: 'numeric', month: 'numeric' }) + ' ' +
        t.toLocaleTimeString('ar-SA-u-nu-arab', { hour: 'numeric', minute: '2-digit' })
    });
  }

  function banner(c, show, at) {
    var b = c.querySelector(':scope > .ad-banner');
    if (!show) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.className = 'ad-banner';
      b.style.cssText = 'background:#eef8f1;border:1.5px solid #9fd3b2;color:#1f6b40;border-radius:12px;padding:10px 14px;margin:10px 0 12px;font-size:0.95rem;font-weight:700;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap';
      var back = c.querySelector(':scope > .back-link');
      c.insertBefore(b, back ? back.nextSibling : c.firstChild);
    }
    b.innerHTML = '<span>✔ استُعيد ما كتبتِه سابقاً ولم يُحفظ' + (at ? ' (' + at + ')' : '') + '</span>' +
      '<button type="button" class="btn outline" style="width:auto;margin:0;padding:6px 14px;font-size:0.85rem">تجاهل المسودة</button>';
    b.querySelector('button').onclick = function () {
      if (!confirm('حذف ما كتبتِه في المسودة والبدء من جديد؟')) return;
      discard(c);
    };
  }

  function fire(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setField(el, v) {
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!v;
    else el.value = v;
    fire(el);
    return el.type === 'checkbox' || el.type === 'radio' || el.value === v;
  }

  function restore(c) {
    var s = st(c.id);
    if (s.dirty || editing(c)) return;
    var d = read(key(c.id));
    if (!d) return;
    paused = true;
    var failed = {};
    try {
      Object.keys(d.f || {}).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || !c.contains(el) || !fieldOk(el)) return;
        if (!setField(el, d.f[id])) failed[id] = d.f[id];   // خيار لم يُحمَّل بعد في القائمة
        s.touched[id] = 1;
      });
      var ext = EXT[c.id] && EXT[c.id]();
      if (ext && d.x) ext.apply(d.x);
    } catch (e) { console.warn('autosave restore', e); }
    paused = false;
    s.dirty = true;
    banner(c, true, d.at);
    // القوائم التي تُعبّأ خياراتها من الخادم: نعيد المحاولة بعد تحميلها
    [900, 2500].forEach(function (ms) {
      setTimeout(function () {
        Object.keys(failed).forEach(function (id) {
          var el = document.getElementById(id);
          if (el && el.value !== failed[id]) { paused = true; if (setField(el, failed[id])) delete failed[id]; paused = false; }
        });
      }, ms);
    });
  }

  function discard(c) {
    var s = st(c.id);
    clearTimeout(s.timer);
    paused = true;
    Object.keys(s.touched).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.type !== 'date') el.value = '';
      fire(el);
    });
    var ext = EXT[c.id] && EXT[c.id]();
    if (ext && ext.reset) { try { ext.reset(); } catch (e) {} }
    paused = false;
    clearView(c);
  }

  function clearView(c) {
    var s = st(c.id);
    clearTimeout(s.timer);
    s.touched = {}; s.dirty = false;
    del(key(c.id));
    banner(c, false);
  }

  function wire(c) {
    var s = st(c.id);
    var later = function () { clearTimeout(s.timer); s.timer = setTimeout(function () { saveNow(c); }, 500); };
    var onEdit = function (e) {
      if (paused) return;
      var el = e.target;
      if (fieldOk(el) && c.contains(el)) s.touched[el.id] = 1;
      if (el.matches && el.matches('input,select,textarea') && !fieldOk(el) && !el.closest('.ord-tbl, #ordOthers, #invoiceReturnList')) return;
      s.dirty = true;
      later();
    };
    c.addEventListener('input', onEdit, true);
    c.addEventListener('change', onEdit, true);
    c.addEventListener('click', function (e) {   // اختيار وحدة/إضافة صف/حذف صف
      if (paused || !e.target.closest('button, .ret-remove')) return;
      if (e.target.closest('.ad-banner')) return;
      later();
    }, true);
  }

  /* مسودات تقرير الزيارة ومحضر الاجتماع في الإدارة: لهما حفظ مسودة خاص بهما، نجعله تلقائياً */
  function wireAdminDrafts() {
    [['visitReportTab', 'saveVrDraft', function () { try { return typeof vrEditingId_ !== 'undefined' && !!vrEditingId_; } catch (e) { return false; } }],
     ['meetingMinutesTab', 'saveMmDraft', function () { return false; }]].forEach(function (cfg) {
      var c = document.getElementById(cfg[0]); if (!c) return;
      var timer = 0;
      var go = function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (!isShown(c) || cfg[2]() || typeof window[cfg[1]] !== 'function') return;
          window[cfg[1]](true);   // true = حفظ صامت بدون رسالة
        }, 600);
      };
      c.addEventListener('input', go, true);
      c.addEventListener('change', go, true);
      c.addEventListener('click', function (e) { if (e.target.closest('button, a')) go(); }, true);
    });
  }

  function init() {
    containers().forEach(wire);
    if (IS_ADMIN) wireAdminDrafts();

    // عند فتح أي شاشة: نعيد مسودتها إن وُجدت
    var navName = IS_ADMIN ? 'showAdminTab' : 'showView';
    var nav = window[navName];
    if (typeof nav === 'function') {
      window[navName] = function (id) {
        // حفظ الشاشة التي نغادرها قبل إخفائها
        containers().forEach(function (c) { if (isShown(c) && st(c.id).dirty) { clearTimeout(st(c.id).timer); saveNow(c); } });
        var r = nav.apply(this, arguments);
        setTimeout(function () {
          var c = id && document.getElementById(id);
          if (c && !SKIP[id] && isShown(c)) restore(c);
        }, 60);
        return r;
      };
    }

    // بعد الحفظ أو الإرسال الناجح: نحذف مسودة الشاشة المفتوحة
    var api = window.callApi;
    if (typeof api === 'function') {
      window.callApi = function (action) {
        var p = api.apply(this, arguments);
        var a = String(action || '');
        if (a.indexOf('get') !== 0 && !/delete|remove|login|logout|check|verify/i.test(a)) {
          var open = containers().filter(isShown);
          Promise.resolve(p).then(function (r) {
            if (r && r.ok !== false && !r.error) open.forEach(clearView);
          }, function () {});
        }
        return p;
      };
    }

    // حفظ أخير قبل إغلاق الصفحة أو الانتقال لتطبيق آخر
    var flush = function () { containers().forEach(function (c) { if (st(c.id).dirty) saveNow(c); }); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
