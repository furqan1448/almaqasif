/**
 * نظام وحدة المقاصف - جمعية فرقان لتحفيظ القرآن الكريم
 * الكود الخلفي (Google Apps Script)
 *
 * طريقة التركيب:
 * 1) افتحي Google Sheet جديد فاضي (أو استخدمي شيتك الحالي).
 * 2) من القائمة: Extensions > Apps Script
 * 3) احذفي أي كود موجود، والصقي هذا الكود كامل.
 * 4) عدّلي القيمة ADMIN_NOTIFY_EMAIL أدناه ببريدك الإلكتروني.
 * 5) شغلي دالة setup() مرة وحدة من القائمة أعلى المحرر (لإنشاء الشيتات والأعمدة الناقصة تلقائياً).
 * 6) Deploy > Manage deployments > ✏️ تعديل > New version > Deploy
 *    (أو New deployment لو أول مرة، وبعدها حطي الرابط بملف config.js)
 */

const FOLDER_NAME = 'مرفقات نظام المقاصف';

// ⚠️ حطي بريدك الإلكتروني هنا عشان تستلمي إشعار كل ما مركز يرسل إشعار استلام أو تسليم
const ADMIN_NOTIFY_EMAIL = 'fainal.almqasif@gmail.com';

// بريد استلام «طلبات المقاصف» (النموذج اللي ترسله المديرة/المسؤولة من أيقونة «طلبات المقاصف»)
const ORDERS_NOTIFY_EMAIL = 'almuqasif1212@gmail.com';
const ORDERS_SHEET_NAME_ = 'طلبات المقاصف';
const ORDERS_HEADERS_ = ['معرف', 'اسم المركز', 'الفترة', 'الفصل الدراسي', 'العام', 'مسؤولة المقصف', 'مديرة المركز',
  'عدد الأصناف', 'تفاصيل الطلب', 'ملاحظات', 'سجّل بواسطة', 'اليوم', 'التاريخ', 'الوقت', 'الحالة'];

// الأعمدة اللي المفروض دايماً تُحفظ وتُقرأ كنص خام (وليست تاريخ/وقت تلقائي من قوقل شيتس)
// عشان نتفادى مشكلة "الأصفار الزايدة" (مثل 1899-12-30 أو 00:00:00.000Z) اللي تصير
// لما قوقل شيتس يحوّل نص التاريخ/الوقت تلقائياً إلى كائن Date داخلي.
const TEXT_COLUMNS_ = ['اليوم', 'التاريخ', 'الوقت', 'تاريخ الإرسال', 'يوم الإرسال', 'وقت الإرسال',
  'يوم اطلاع الإدارة', 'تاريخ اطلاع الإدارة', 'وقت اطلاع الإدارة', 'تاريخ توقيع الإدارة',
  'رقم الفاتورة', 'العام', 'وقت التسجيل الفعلي', 'التاريخ الهجري', 'مفتاح التاريخ', 'يوم الاجتماع', 'تاريخ الاجتماع الهجري', 'رقم الاجتماع'];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheets = {
    'المسؤولات': ['الاسم', 'البريد الإلكتروني', 'كلمة المرور', 'اسم المركز'],
    'الحضور': ['الاسم', 'اليوم', 'التاريخ', 'الوقت'],
    'التعهد': ['الاسم', 'نص التعهد', 'اليوم', 'التاريخ', 'الوقت', 'الحالة'],
    'المهام': ['الاسم', 'البريد الإلكتروني', 'نص المهام', 'اليوم', 'التاريخ', 'الوقت', 'الحالة'],
    'المراكز': ['اسم المركز', 'كلمة المرور', 'وضع العرض فقط', 'الاسم المعروض', 'تفعيل التقييم'],
    'المبيعات': ['معرف', 'اسم المركز', 'اليوم', 'التاريخ', 'الوقت', 'المبلغ', 'ملاحظات', 'الفصل الدراسي', 'وقت التسجيل الفعلي'],
    'المرتجعات': ['معرف', 'اسم المركز', 'اليوم', 'التاريخ', 'وصف الصنف', 'الكمية', 'القيمة', 'ملاحظات', 'الفصل الدراسي'],
    'الفواتير': ['معرف', 'اسم المركز', 'رقم الفاتورة', 'مصدر الفاتورة', 'اليوم', 'التاريخ', 'المبلغ الإجمالي', 'الربح', 'ملاحظات', 'الفصل الدراسي', 'نوع القيد', 'نوع الرجيع', 'رجيع رأس المال', 'رجيع الربح', 'رجيع للإثبات', 'كمية الرجيع', 'المرتجعات', 'تفاصيل الرجيع'],
    'الإشعارات': ['معرف', 'النوع', 'اسم المركز', 'يوم الإرسال', 'تاريخ الإرسال', 'وقت الإرسال',
      'اسم المسلّمة', 'المبلغ', 'الشهر', 'الفصل الدراسي', 'العام', 'بيان مخصص',
      'رابط توقيع المركز', 'رابط صورة الإشعار', 'الحالة',
      'رابط توقيع الإدارة', 'رابط صورة الإشعار الموقع',
      'يوم اطلاع الإدارة', 'تاريخ اطلاع الإدارة', 'وقت اطلاع الإدارة',
      'اسم المستلمة', 'بيانات توقيع المركز', 'فصل الأرشفة', 'سجّل بواسطة'],
    'المرفقات': ['معرف', 'العنوان', 'النوع', 'الرابط', 'اسم الملف', 'من', 'المالك', 'اليوم', 'التاريخ', 'الوقت'],
    'مرفقات الإشراف': ['معرف', 'العنوان', 'النوع', 'الرابط', 'اسم الملف', 'من', 'اليوم', 'التاريخ', 'الوقت'],
    'الإعلانات الهامة': ['معرف', 'النص', 'استهداف', 'من', 'اليوم', 'التاريخ', 'الوقت'],
    // محاضر الاجتماعات: كل الحقول التي تُطبع بالمحضر + استهداف (زي الإعلانات الهامة) يحدد مين يشوفه بالمراكز/المسؤولات
    'محاضر الاجتماعات': ['معرف', 'رقم الاجتماع', 'يوم الاجتماع', 'تاريخ الاجتماع الهجري', 'طريقة الانعقاد',
      'نقاط الاجتماع', 'المشاركات', 'الروابط',
      'اسم الرئيسة', 'توقيع الرئيسة', 'حجم توقيع الرئيسة',
      'اسم المساعدة', 'توقيع المساعدة', 'حجم توقيع المساعدة',
      'استهداف', 'من', 'اليوم', 'التاريخ', 'الوقت'],
    'قائمة الأسعار': ['معرف', 'التصنيف', 'اسم الصنف', 'السعر', 'ترتيب'],
    'الإعدادات': ['المفتاح', 'القيمة'],
    'دخول الإشراف': ['البريد الإلكتروني', 'كلمة المرور', 'الاسم'],
    'الصعوبات والمقترحات': ['معرف', 'اسم المركز', 'من', 'النوع', 'النص', 'اليوم', 'التاريخ', 'الوقت'],
    'قائمة الدخل': ['معرف', 'البند', 'البيان', 'المبلغ', 'المبلغ كتابة', 'اليوم', 'التاريخ', 'الفصل الدراسي', 'رابط المرفق', 'اسم المرفق'],
    // بطاقات التحفيز: سجلّين منفصلين بنفس الشيت (نوع السجل: تسليم / استلام)، كل سطر بطاقة موقّعة
    // (رسم أو صورة) من الشخص المستلم وقتها. بدون أرشفة تلقائية عشان الحقوق تفضل واضحة
    'بطاقات التحفيز': ['معرف', 'اسم المركز', 'الدور', 'نوع السجل', 'نوع البطاقة', 'القيمة', 'الكمية',
      'اسم المستلمة', 'التوقيع', 'اليوم', 'التاريخ', 'الوقت', 'ملاحظات', 'سجّل بواسطة'],
    // متابعة بطاقات التحفيز: توزيع الكمية الواحدة (من سطر "تسليم") على أكثر من مستفيدة -
    // كل سطر هنا = جزء من الكمية الأصلية باسم مستفيدة معيّنة وحالتها، ومجموعها ما يتجاوز
    // الكمية المسجّلة بسطر التسليم الأصلي (يُتحقق منه بـ addIncentiveFollowupSplit_)
    'متابعة بطاقات التحفيز': ['معرف', 'معرف السطر الأصلي', 'اسم المركز', 'اسم المستفيدة', 'العدد',
      'الحالة', 'اليوم', 'التاريخ'],
    // درجات المسؤولات: تقييم نهاية الفصل من 13 (يدوي من لوحة الإدارة) - صف لكل (فصل + مسؤولة)
    'درجات المسؤولات': GRADES_HEADERS_,
    // اعتماد اكتمال التسجيل: صح يدوي من الإدارة لكل مركز (للفصل الحالي - يتفرّغ عند الأرشفة)
    'اعتماد التسجيل': REG_VERIFY_HEADERS_,
    // إحصائية الزيارات: كل سطر زيارة وحدة (المركز + الفترة + التاريخ الهجري)
    'إحصائية الزيارات': VISIT_STATS_HEADERS_,
    // طلبات المقاصف: كل سطر طلب واحد (بنوده مكتوبة نصاً بعمود «تفاصيل الطلب»)
    'طلبات المقاصف': ORDERS_HEADERS_,
    // تقارير الزيارة المحفوظة: تكتبها الإدارة وتوقّعها مديرة المركز من صفحة المراكز
    'تقارير الزيارة': VISIT_REPORT_HEADERS_,
    // تقييم مسؤولة المقصف: ترسله مديرة المركز موقّعاً، وتعتمده الإدارة بدرجاتها وتوقيعها (لا تراه المسؤولة)
    'تقييم مسؤولات المقاصف': EVAL_HEADERS_
  };

  Object.keys(sheets).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.appendRow(sheets[name]);
      sh.getRange(1, 1, 1, sheets[name].length).setFontWeight('bold');
      sh.setRightToLeft(true);
    } else {
      // إذا كان الشيت موجود من قبل بأعمدة أقل (تحديث نظام قديم)، نضيف الأعمدة الناقصة بآخر الصف.
      // نتجاهل المسافات الزائدة بالمقارنة (نفس سبب مشكلة "اليوم ما ينكتب") حتى ما ينضاف
      // عمود مكرر لو كان الموجود مسبقاً فيه مسافة خفية بالاسم.
      const existingHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
      sheets[name].forEach(function (col) {
        if (existingHeaders.indexOf(col) === -1) {
          sh.getRange(1, sh.getLastColumn() + 1).setValue(col).setFontWeight('bold');
          existingHeaders.push(col); // نحدّث القائمة بالذاكرة عشان ما نضيف نفس العمود مرتين بهذي التشغيلة
        }
      });
    }

    // نجبر أعمدة التاريخ/الوقت على تنسيق "نص عادي" حتى لا يحوّلها قوقل شيتس
    // تلقائياً إلى كائن Date (وهذا هو مصدر "الأصفار الزايدة")
    const headersNow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    headersNow.forEach(function (h, idx) {
      if (TEXT_COLUMNS_.indexOf(h) !== -1) {
        sh.getRange(2, idx + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
      }
    });
  });

  // شيت مثال - عدليه بأسماء المراكز الحقيقية وكلمات المرور
  const centersSheet = ss.getSheetByName('المراكز');
  if (centersSheet.getLastRow() === 1) {
    centersSheet.appendRow(['مركز تحفيظ 1', '1234']);
    centersSheet.appendRow(['مركز تحفيظ 2', '5678']);
  }

  // تعبئة قائمة الأسعار بالأصناف الأولية (مرة وحدة بس - لو الشيت لسا فاضي)
  const priceSheet = ss.getSheetByName('قائمة الأسعار');
  if (priceSheet.getLastRow() === 1) {
    seedPriceList_(priceSheet);
  }

  notify_('تم إنشاء/تحديث جميع الشيتات بنجاح. تأكدي من تعبئة عمود "اسم المركز" بشيت "المسؤولات" لكل مسؤولة، وتحطي بريدك في ADMIN_NOTIFY_EMAIL أعلى الكود.\n\nملاحظة: لو كان عندك شيت قديم وفيه بيانات، شغّلي أيضاً دالة fixOldDateColumns من قائمة الدوال فوق المحرر مرة وحدة عشان تصلح صيغة الأعمدة القديمة، ودالة fillMissingDayNames لو لاحظتِ إن عمود "اليوم" فاضي بصفوف قديمة بالمبيعات/المرتجعات/الفواتير.');
}

/* تعبئة أولية لقائمة الأسعار من قائمة المقصف الورقية - تتنفذ تلقائياً من setup() مرة وحدة بس
   (لو الشيت فاضي). بعدها التعديل/الإضافة/الحذف من لوحة الإدارة (أو المسؤولة المخوّلة) مباشرة. */
function seedPriceList_(sh) {
  const items = [
    ['البطاطسات', 'فخذ الدجاج', '1'], ['البطاطسات', 'فانتزي', '1'], ['البطاطسات', 'حروف صغيرة', '1'],
    ['البطاطسات', 'ليز', '1'], ['البطاطسات', 'تسالي صغير', '1'], ['البطاطسات', 'البطل دبي', '1'],
    ['البطاطسات', 'مرامي صغير', '1'], ['البطاطسات', 'البطل فشار صغير', '1'], ['البطاطسات', 'فرفشة عيدان', '1'],
    ['البطاطسات', 'لولز', '1'], ['البطاطسات', 'زورو', '1'], ['البطاطسات', 'زيكو', '1'],
    ['البطاطسات', 'راجا', '1'], ['البطاطسات', 'زمزم طماطم', 'حبتين بريال'], ['البطاطسات', 'عيدان ستيكس علب', '3'],
    ['البطاطسات', 'ستيكس اكياس', '1'], ['البطاطسات', 'عيدان الذرة مليونير', '1'], ['البطاطسات', 'دوريتوس', '2'],
    ['البطاطسات', 'بطاطس عمان', '1.5'],

    ['الحلويات', 'حلاوة قلب', 'حبتين بريال'], ['الحلويات', 'مصاص ديما', 'حبتين بريال'],
    ['الحلويات', 'فروتي ديما', '1'], ['الحلويات', 'ملعقة سينو', '1'], ['الحلويات', 'بهلول', '1'],

    ['الماء والعصيرات', 'مياه العين', '1'], ['الماء والعصيرات', 'مياه فو', '1'],
    ['الماء والعصيرات', 'عصير أورجينال صغير', '1'], ['الماء والعصيرات', 'عصير نكتار أورجينال كبير', '1.5'],
    ['الماء والعصيرات', 'حليب مراعي', '1.5'], ['الماء والعصيرات', 'حليب نادك', '1.5'],
    ['الماء والعصيرات', 'كأس شاي', '1'], ['الماء والعصيرات', 'كأس حليب', '2'],
    ['الماء والعصيرات', 'نسكافيه', '3'], ['الماء والعصيرات', 'أربعة أكواب فارغة', '1'],
    ['الماء والعصيرات', 'قهوة سوداء', '5'],

    ['الكيك والكروسون', 'فطاير', '1.5'], ['الكيك والكروسون', 'كرواسون سفن دايز', '2'],
    ['الكيك والكروسون', 'كيك يمامة', '1'], ['الكيك والكروسون', 'كيك نحول', '1'],
    ['الكيك والكروسون', 'كيك مفن', '1'], ['الكيك والكروسون', 'كيك سراي', '1'],

    ['البساكيت', 'لواكر', '2'], ['البساكيت', 'سندوتش ميرو بالمارشملو', '1'],
    ['البساكيت', 'ساندوتش اولكر صغير', '1'], ['البساكيت', 'بريك صغير اصبعين', '1'],
    ['البساكيت', 'ويفر تايم كريب', '1'], ['البساكيت', 'ويف هيرو ستار بندق', '1'],
    ['البساكيت', 'سبلاش بيكادلي', '1'], ['البساكيت', 'امادا شكولوف', '1'],
    ['البساكيت', 'فول سوداني', '1'], ['البساكيت', 'وافل غندور', '1'],
    ['البساكيت', 'بسكوت بريك', '1'], ['البساكيت', 'بسكوت اوه بوي', '1'],
    ['البساكيت', 'واو بافل', '1'], ['البساكيت', 'بسكوت فايف مش', '1'],
    ['البساكيت', 'سويش كوكيز', '1'], ['البساكيت', 'ويفر مثلثات', '1'],

    ['الشوكولاتات', 'فليك', '2'], ['الشوكولاتات', 'تويكس أصبعين', '3'], ['الشوكولاتات', 'توكس أصبع', '2'],
    ['الشوكولاتات', 'سنيكرس كبير', '3'], ['الشوكولاتات', 'سنيكرس صغير', '2'],
    ['الشوكولاتات', 'جالكسي سادة كبير', '3'], ['الشوكولاتات', 'جالكسي فلوتات', '2'],
    ['الشوكولاتات', 'جالكسي كرسبي صغير', '2'], ['الشوكولاتات', 'جالكسي كراميل صغير', '2'],
    ['الشوكولاتات', 'مارس صغير', '2'], ['الشوكولاتات', 'كيندربوينو', '3'],
    ['الشوكولاتات', 'باونتي كبير', '3'], ['الشوكولاتات', 'كيكت كات شنكي', '3'],
    ['الشوكولاتات', 'كيت كات صغير', '1.5'], ['الشوكولاتات', 'كاراميلا صغير', '2'],
    ['الشوكولاتات', 'شوكولاتة بالو 3 أصابع', '1'], ['الشوكولاتات', 'تريكسي', '1'],
    ['الشوكولاتات', 'شوكولاتة غونتس', '1']
  ];
  const rows = items.map(function (it, idx) {
    return [Utilities.getUuid(), it[0], it[1], it[2], idx + 1];
  });
  sh.getRange(2, 1, rows.length, 5).setValues(rows);
}

/* تشغّل مرة وحدة (اختياري) لو عندك شيتات قديمة فيها بيانات تاريخ/وقت محفوظة
   كـ Date تلقائي من قوقل شيتس، عشان تحوّلها لنص واضح بدون أصفار زايدة. */
function fixOldDateColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ['المبيعات', 'المرتجعات', 'الفواتير', 'الحضور', 'التعهد', 'المهام', 'الإشعارات'].forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 2) return;
    const lastCol = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
    const range = sh.getRange(2, 1, sh.getLastRow() - 1, lastCol);
    const values = range.getValues();
    headers.forEach(function (h, idx) {
      if (TEXT_COLUMNS_.indexOf(h) === -1) return;
      const isTimeCol = (h === 'الوقت' || h === 'وقت الإرسال' || h === 'وقت اطلاع الإدارة');
      for (let i = 0; i < values.length; i++) {
        const v = values[i][idx];
        if (v instanceof Date) {
          values[i][idx] = isTimeCol
            ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'HH:mm')
            : Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
      }
    });
    sh.getRange(1, 1, 1, lastCol).setNumberFormat('@'); // احتياط
    range.setNumberFormat('@');
    range.setValues(values);
  });
  invalidateCache_('المبيعات'); invalidateCache_('المرتجعات'); invalidateCache_('الفواتير');
  invalidateCache_('الحضور'); invalidateCache_('التعهد'); invalidateCache_('الإشعارات');
  notify_('تم تحويل أعمدة التاريخ والوقت القديمة إلى نص واضح بدون أصفار زايدة.');
}

/* أسماء أيام الأسبوع بالعربي - الأحد أول الأسبوع */
const AR_DAYS_ = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* بديل آمن لـ SpreadsheetApp.getUi().alert() - يشتغل سواء نفّذتِ الدالة من زر
   "تشغيل" بمحرر Apps Script مباشرة (ما فيه واجهة شيت متاحة وقتها) أو من قائمة
   مخصصة داخل الشيت نفسه. لو ما قدر يفتح نافذة تنبيه، يسجّل الرسالة بسجل التنفيذ
   (Logger) عشان تقدري تشوفينها من "عرض" ← "سجلات التنفيذ" (Execution log). */
function notify_(message) {
  try {
    SpreadsheetApp.getUi().alert(message);
  } catch (e) {
    Logger.log(message);
  }
}

function dayName_(d) {
  return AR_DAYS_[d.getDay()];
}

/* ترجع اليوم/التاريخ/الوقت الحالي كنص واضح بدون أي أصفار زايدة */
function nowParts_() {
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  return {
    day: dayName_(now),
    date: Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
    time: Utilities.formatDate(now, tz, 'HH:mm')
  };
}

/* ترجع اسم اليوم بالعربي لتاريخ نصي بصيغة yyyy-MM-dd (تُستخدم لو المستخدمة
   عدّلت التاريخ يدوياً في الواجهة عشان يبقى اسم اليوم مطابق للتاريخ المختار) */
function dayNameForDateStr_(dateStr) {
  if (!dateStr) return dayName_(new Date());
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dayName_(new Date());
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dayName_(d);
}

function getOrCreateFolder_() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

/* ينظّف اسم مجلد/ملف من الرموز الممنوعة بـ Drive */
function safeName_(s) {
  return String(s || '').replace(/[\\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'بدون اسم';
}

/* يرجّع مجلد فرعي داخل المجلد الرئيسي حسب المسار (مثلاً ['الإشعارات', 'اسم المركز']) وينشئه لو مو موجود.
   نخزّن معرّف كل مجلد بالكاش عشان ما نبحث بـ Drive كل مرة (أسرع بالحفظ). */
function getOrCreateSubFolder_(pathArr) {
  const cache = CacheService.getScriptCache();
  let parent = getOrCreateFolder_();
  let key = 'fld';
  for (let i = 0; i < pathArr.length; i++) {
    const name = safeName_(pathArr[i]);
    key += '/' + name;
    const ck = key.length > 240 ? key.slice(0, 240) : key;
    let folder = null;
    const cachedId = cache.get(ck);
    if (cachedId) {
      try { folder = DriveApp.getFolderById(cachedId); } catch (e) { folder = null; }
    }
    if (!folder) {
      const it = parent.getFoldersByName(name);
      folder = it.hasNext() ? it.next() : parent.createFolder(name);
      cache.put(ck, folder.getId(), 21600);
    }
    parent = folder;
  }
  return parent;
}

/* subPath (اختياري): مسار المجلد الفرعي، مثلاً ['الإشعارات', 'اسم المركز'].
   لو ما انمرّر تنحفظ الصورة بالمجلد الرئيسي مثل قبل. */
function saveImage_(base64Data, fileName, subPath) {
  if (!base64Data) return '';
  const cleaned = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const bytes = Utilities.base64Decode(cleaned);
  const blob = Utilities.newBlob(bytes, 'image/png', safeName_(fileName) + '.png');
  const folder = (subPath && subPath.length) ? getOrCreateSubFolder_(subPath) : getOrCreateFolder_();
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  // file.getUrl() ترجع رابط صفحة عرض بقوقل درايف، وما تشتغل مباشرة داخل <img src>.
  // هذا الرابط هو الصيغة الصحيحة لعرض الصورة مباشرة بالمتصفح (وبتاق <img>)
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

/* اسم ملف واضح للإشعار: النوع - المركز - التاريخ - جزء من المعرف */
function noticeFileName_(prefix, type, center, date, id) {
  return [prefix, type, center, date, String(id || '').slice(0, 6)]
    .filter(function (x) { return String(x || '').trim(); }).join(' - ');
}

/* نفس فكرة saveImage_ بس لأي نوع ملف (PDF، Word، صورة...) مو بس PNG -
   تُستخدم لرفع مرفقات المستخدمات (خانة "إضافة مرفقات"). ترجع رابط عرض/تحميل
   عادي بقوقل درايف (يشتغل بفتح تبويب جديد، عكس رابط saveImage_ المخصص للعرض داخل <img>) */
function saveAttachmentFile_(base64Data, fileName, mimeType) {
  if (!base64Data) return '';
  const cleaned = String(base64Data).replace(/^data:[^;]+;base64,/, '');
  const bytes = Utilities.base64Decode(cleaned);
  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName || 'مرفق');
  const root = getOrCreateFolder_();
  const folders = root.getFoldersByName('المرفقات');
  const folder = folders.hasNext() ? folders.next() : root.createFolder('المرفقات');
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

/* تسجّل مرفق جديد (ملف أو رابط). p.store: اسم الشيت الوجهة - افتراضياً 'المرفقات'
   (المشتركة بين المراكز/المسؤولات/الإدارة)، أو 'مرفقات الإشراف' لمكتب إشراف الداخل.
   p.kind: 'file' أو 'link'. لو 'file' لازم p.fileData (base64) و p.fileName و p.mimeType.
   لو 'link' لازم p.link. p.from: اسم الجهة المضيفة (مركز/مسؤولة/الإدارة) للعرض بس.
   p.owner: مُعرّف الجهة المالكة (اسم المركز عادةً، أو بريد المسؤولة لو ما لها مركز) -
   يُستخدم لإخفاء المرفق عن باقي المراكز/المسؤولات (كل جهة تشوف مرفقاتها هي بس، والإدارة تشوف الكل). */
function recordAttachment_(p) {
  const sh = sheet_(p.store || 'المرفقات');
  const id = Utilities.getUuid();
  const now = nowParts_();
  let link = '';
  let fileName = '';
  if (p.kind === 'file') {
    link = saveAttachmentFile_(p.fileData, p.fileName || (p.title || id), p.mimeType || '');
    fileName = p.fileName || '';
  } else {
    link = p.link || '';
  }
  appendRowByHeaders_(sh, {
    'معرف': id, 'العنوان': p.title || '', 'النوع': p.kind === 'file' ? 'ملف' : 'رابط',
    'الرابط': link, 'اسم الملف': fileName, 'من': p.from || '', 'المالك': p.owner || '',
    'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time
  });
  invalidateCache_(p.store || 'المرفقات');
  return { ok: true, id: id };
}

/* p.owner: لو انمرّر، ترجع بس المرفقات اللي مالكها يطابقه (مركز/مسؤولة معيّنة تشوف مرفقاتها هي بس).
   لو ما انمرّر (حالة الإدارة)، ترجع كل المرفقات بدون فلترة. */
function getAttachments_(p) {
  let rows = sheetToObjects_((p && p.store) || 'المرفقات');
  if (p && p.owner) {
    const owner = String(p.owner).trim();
    rows = rows.filter(function (r) { return String(r['المالك'] || '').trim() === owner; });
  }
  return { ok: true, attachments: rows.reverse() };
}

function deleteAttachment_(p) {
  const sh = sheet_(p.store || 'المرفقات');
  sh.deleteRow(Number(p.row));
  invalidateCache_(p.store || 'المرفقات');
  return { ok: true };
}

/* ------------------- الإعلانات الهامة (إدارة → مراكز/مسؤولات) ------------------- */
/* p.text: نص الإعلان. p.all: true لو يُنشر لكل المراكز والمسؤولات.
   لو p.all غير موجود/false: p.centers مصفوفة أسماء مراكز مستهدفة، p.masoulat مصفوفة أسماء مسؤولات مستهدفات
   (يمديها الاثنين مع بعض بنفس الإعلان). لو الاثنين فاضيين يتحول تلقائياً لـ"الكل". */
function recordAnnouncement_(p) {
  const sh = sheet_('الإعلانات الهامة');
  const id = Utilities.getUuid();
  const now = nowParts_();
  let targets = 'الكل';
  if (!p.all) {
    const list = [];
    (p.centers || []).forEach(function (c) { if (c) list.push('مركز:' + c); });
    (p.masoulat || []).forEach(function (m) { if (m) list.push('مسؤولة:' + m); });
    targets = list.length ? list.join('|') : 'الكل';
  }
  appendRowByHeaders_(sh, {
    'معرف': id, 'النص': p.text || '', 'استهداف': targets, 'من': p.from || 'الإدارة',
    'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time
  });
  invalidateCache_('الإعلانات الهامة');
  return { ok: true, id: id };
}

/* لوحة الإدارة: ترجع كل الإعلانات (بدون فلترة) لعرضها وحذفها. */
function getAllAnnouncements_() {
  const rows = sheetToObjects_('الإعلانات الهامة');
  return { ok: true, announcements: rows.reverse() };
}

/* p.center و/أو p.masoula: ترجع بس الإعلانات اللي تخص هذا المركز/المسؤولة، أو اللي استهدافها "الكل". */
function getAnnouncementsFor_(p) {
  const rows = sheetToObjects_('الإعلانات الهامة');
  const center = p && p.center ? String(p.center).trim() : '';
  const masoula = p && p.masoula ? String(p.masoula).trim() : '';
  const matched = rows.filter(function (r) {
    const target = String(r['استهداف'] || '').trim();
    if (target === 'الكل' || !target) return true;
    const tokens = target.split('|');
    return tokens.some(function (t) {
      if (center && t === 'مركز:' + center) return true;
      if (masoula && t === 'مسؤولة:' + masoula) return true;
      return false;
    });
  });
  return { ok: true, announcements: matched.reverse() };
}

function deleteAnnouncement_(p) {
  const sh = sheet_('الإعلانات الهامة');
  sh.deleteRow(Number(p.row));
  invalidateCache_('الإعلانات الهامة');
  return { ok: true };
}

/* ------------------- محاضر الاجتماعات (إدارة → مراكز/مسؤولات) -------------------
   نفس منطق استهداف الإعلانات الهامة بالضبط (p.all أو p.centers/p.masoulat).
   نقاط الاجتماع والمشاركات والروابط تُحفظ كنص JSON بعمود واحد، وتُفكّ بالواجهة عند العرض/الطباعة. */
function recordMeetingMinutes_(p) {
  const sh = sheet_('محاضر الاجتماعات');
  const id = Utilities.getUuid();
  const now = nowParts_();
  let targets = 'الكل';
  if (!p.all) {
    const list = [];
    (p.centers || []).forEach(function (c) { if (c) list.push('مركز:' + c); });
    (p.masoulat || []).forEach(function (m) { if (m) list.push('مسؤولة:' + m); });
    targets = list.length ? list.join('|') : 'الكل';
  }
  appendRowByHeaders_(sh, {
    'معرف': id,
    'رقم الاجتماع': p.number || '',
    'يوم الاجتماع': p.day || '',
    'تاريخ الاجتماع الهجري': p.hijriDate || '',
    'طريقة الانعقاد': p.method || '',
    'نقاط الاجتماع': JSON.stringify(p.points || []),
    'المشاركات': JSON.stringify(p.participants || []),
    'الروابط': JSON.stringify(p.links || []),
    'اسم الرئيسة': p.headName || '',
    'توقيع الرئيسة': p.headSignature || '',
    'حجم توقيع الرئيسة': p.headSigScale || '',
    'اسم المساعدة': p.assistantName || '',
    'توقيع المساعدة': p.assistantSignature || '',
    'حجم توقيع المساعدة': p.assistantSigScale || '',
    'استهداف': targets, 'من': p.from || 'الإدارة',
    'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time
  });
  invalidateCache_('محاضر الاجتماعات');
  return { ok: true, id: id };
}

/* لوحة الإدارة: كل المحاضر بدون فلترة، لعرضها وحذفها */
function getAllMeetingMinutes_() {
  const rows = sheetToObjects_('محاضر الاجتماعات');
  return { ok: true, minutes: rows.reverse() };
}

/* p.center و/أو p.masoula: ترجع بس المحاضر اللي تخص هذا المركز/المسؤولة، أو اللي استهدافها "الكل" */
function getMeetingMinutesFor_(p) {
  const rows = sheetToObjects_('محاضر الاجتماعات');
  const center = p && p.center ? String(p.center).trim() : '';
  const masoula = p && p.masoula ? String(p.masoula).trim() : '';
  const matched = rows.filter(function (r) {
    const target = String(r['استهداف'] || '').trim();
    if (target === 'الكل' || !target) return true;
    const tokens = target.split('|');
    return tokens.some(function (t) {
      if (center && t === 'مركز:' + center) return true;
      if (masoula && t === 'مسؤولة:' + masoula) return true;
      return false;
    });
  });
  return { ok: true, minutes: matched.reverse() };
}

function deleteMeetingMinutes_(p) {
  const sh = sheet_('محاضر الاجتماعات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('محاضر الاجتماعات');
  return { ok: true };
}

/* ------------------- قائمة الأسعار (قائمة المقصف) ------------------- */
/* الكل (مراكز/مسؤولات/إدارة) يشوفون القائمة. الإضافة/التعديل/الحذف مسموحة للإدارة دايماً،
   ولمسؤولة وحدة واحدة تحددها الإدارة (تُحفظ بشيت "الإعدادات"). */

function getPriceItems_() {
  const rows = sheetToObjects_('قائمة الأسعار');
  rows.sort(function (a, b) { return (Number(a['ترتيب']) || 0) - (Number(b['ترتيب']) || 0); });
  return { ok: true, items: rows };
}

/* تتأكد إن اللي يحاول يعدّل مسموح له: إما 'admin'، أو مسؤولة اسمها يطابق
   المسؤولة المخوّلة المحفوظة بشيت الإعدادات. */
function checkPriceListPermission_(actor) {
  if (actor === 'admin') return true;
  const manager = getSettingValue_('مسؤولة قائمة الأسعار');
  return !!manager && String(actor || '').trim() === manager;
}

function addPriceItem_(p) {
  if (!checkPriceListPermission_(p.actor)) return { ok: false, error: 'ما عندك صلاحية تعديل قائمة الأسعار' };
  const sh = sheet_('قائمة الأسعار');
  const id = Utilities.getUuid();
  const lastRow = sh.getLastRow();
  const order = lastRow; // أول صف بعد الهيدر يصير ترتيبه = عدد الصفوف الحالية
  appendRowByHeaders_(sh, {
    'معرف': id, 'التصنيف': p.category || '', 'اسم الصنف': p.name || '', 'السعر': p.price || '', 'ترتيب': order
  });
  invalidateCache_('قائمة الأسعار');
  return { ok: true, id: id };
}

function updatePriceItem_(p) {
  if (!checkPriceListPermission_(p.actor)) return { ok: false, error: 'ما عندك صلاحية تعديل قائمة الأسعار' };
  const sh = sheet_('قائمة الأسعار');
  const row = Number(p.row);
  if (p.category !== undefined) sh.getRange(row, colIndex_(sh, 'التصنيف')).setValue(p.category);
  if (p.name !== undefined) sh.getRange(row, colIndex_(sh, 'اسم الصنف')).setValue(p.name);
  if (p.price !== undefined) sh.getRange(row, colIndex_(sh, 'السعر')).setValue(p.price);
  invalidateCache_('قائمة الأسعار');
  return { ok: true };
}

function deletePriceItem_(p) {
  if (!checkPriceListPermission_(p.actor)) return { ok: false, error: 'ما عندك صلاحية تعديل قائمة الأسعار' };
  const sh = sheet_('قائمة الأسعار');
  sh.deleteRow(Number(p.row));
  invalidateCache_('قائمة الأسعار');
  return { ok: true };
}

/* -------- شيت "الإعدادات" - مفتاح/قيمة عام، مستخدم حالياً بس لتحديد مسؤولة قائمة الأسعار -------- */
function getSettingValue_(key) {
  const rows = sheetToObjects_('الإعدادات');
  const found = rows.find(function (r) { return String(r['المفتاح'] || '').trim() === key; });
  return found ? String(found['القيمة'] || '').trim() : '';
}

function setSettingValue_(key, value) {
  const sh = sheet_('الإعدادات');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sh.getRange(i + 1, 2).setValue(value);
      invalidateCache_('الإعدادات');
      return;
    }
  }
  sh.appendRow([key, value]);
  invalidateCache_('الإعدادات');
}

function getPriceListManager_() {
  return { ok: true, masoula: getSettingValue_('مسؤولة قائمة الأسعار') };
}

function setPriceListManager_(p) {
  setSettingValue_('مسؤولة قائمة الأسعار', p.masoula || '');
  return { ok: true };
}

/* -------- ملف/رابط قائمة الأسعار (يظهر للجميع، الإدارة فقط تضيفه/تعدّله) -------- */
/* ------------------- إحصائية الزيارات (لوحة الإدارة) -------------------
   الإدارة تسجّل كل زيارة: اسم المركز + الفترة (صباحية/مسائية) + تاريخ الزيارة الهجري،
   والنظام يعدّ عدد الزيارات لكل مركز. «مفتاح التاريخ» (1448-03-15) للترتيب فقط. */
const VISIT_STATS_SHEET_ = 'إحصائية الزيارات';
const VISIT_STATS_HEADERS_ = ['معرف', 'اسم المركز', 'الفترة', 'التاريخ الهجري', 'مفتاح التاريخ', 'اليوم', 'التاريخ', 'الوقت'];

function visitStatsSheet_() {
  let sh = sheet_(VISIT_STATS_SHEET_);
  if (!sh) {
    sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet(VISIT_STATS_SHEET_);
    sh.getRange(1, 1, 1, VISIT_STATS_HEADERS_.length).setValues([VISIT_STATS_HEADERS_]);
    sh.getRange(2, 1, sh.getMaxRows() - 1, VISIT_STATS_HEADERS_.length).setNumberFormat('@');
  }
  return sh;
}

function visitCenterKey_(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

function recordVisitStat_(p) {
  const center = visitCenterKey_(p.center);
  if (!center) return { ok: false, error: 'اسم المركز مطلوب' };
  if (!p.hijriDate) return { ok: false, error: 'تاريخ الزيارة مطلوب' };
  // قفل: يمنع تسجيل الزيارة مرتين لو وصل الطلب مكررًا (ضغطتان متتاليتان أو إعادة إرسال بعد تعليق)
  const lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: 'النظام مشغول، أعيدي المحاولة بعد لحظات' }; }
  try {
    const sh = visitStatsSheet_();
    const period = String(p.period || '');
    const dateKey = String(p.dateKey || '');
    const all = sheetToObjects_(VISIT_STATS_SHEET_);
    // الزيارة نفسها (المركز + الفترة + التاريخ) لا تُسجَّل إلا مرة واحدة: نُرجع السجل الموجود
    const existing = dateKey ? all.find(function (r) {
      return visitCenterKey_(r['اسم المركز']) === center && String(r['الفترة'] || '') === period &&
        String(r['مفتاح التاريخ'] || '') === dateKey;
    }) : null;
    const countOf = function () {
      return sheetToObjects_(VISIT_STATS_SHEET_).filter(function (r) { return visitCenterKey_(r['اسم المركز']) === center; }).length;
    };
    if (existing) return { ok: true, id: existing['معرف'], center: center, count: countOf(), existed: true };
    const id = Utilities.getUuid();
    const now = nowParts_();
    appendRowByHeaders_(sh, {
      'معرف': id, 'اسم المركز': center, 'الفترة': period,
      'التاريخ الهجري': p.hijriDate, 'مفتاح التاريخ': dateKey,
      'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time
    });
    invalidateCache_(VISIT_STATS_SHEET_);
    return { ok: true, id: id, center: center, count: countOf() };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function getVisitStats_() {
  if (!sheet_(VISIT_STATS_SHEET_)) return { ok: true, visits: [] };
  const visits = sheetToObjects_(VISIT_STATS_SHEET_).filter(function (r) {
    return visitCenterKey_(r['اسم المركز']);
  }).map(function (r) {
    return {
      id: r['معرف'], row: r._row, center: visitCenterKey_(r['اسم المركز']),
      period: String(r['الفترة'] || ''), hijriDate: String(r['التاريخ الهجري'] || ''),
      dateKey: String(r['مفتاح التاريخ'] || '')
    };
  });
  return { ok: true, visits: visits };
}

function deleteVisitStat_(p) {
  const sh = sheet_(VISIT_STATS_SHEET_);
  if (!sh) return { ok: false, error: 'الشيت غير موجود' };
  const rows = sheetToObjects_(VISIT_STATS_SHEET_);
  const target = rows.find(function (r) { return String(r['معرف']) === String(p.id); });
  if (!target) return { ok: false, error: 'السجل غير موجود' };
  sh.deleteRow(target._row);
  invalidateCache_(VISIT_STATS_SHEET_);
  return { ok: true };
}

/* تعديل زيارة مسجّلة: اسم المركز + الفترة + التاريخ الهجري (حسب المعرف) */
function updateVisitStat_(p) {
  const center = visitCenterKey_(p.center);
  if (!center) return { ok: false, error: 'اسم المركز مطلوب' };
  if (!p.hijriDate) return { ok: false, error: 'تاريخ الزيارة مطلوب' };
  const sh = sheet_(VISIT_STATS_SHEET_);
  if (!sh) return { ok: false, error: 'الشيت غير موجود' };
  const target = sheetToObjects_(VISIT_STATS_SHEET_).find(function (r) { return String(r['معرف']) === String(p.id); });
  if (!target) return { ok: false, error: 'السجل غير موجود' };
  const vals = {
    'اسم المركز': center, 'الفترة': p.period || '',
    'التاريخ الهجري': p.hijriDate, 'مفتاح التاريخ': p.dateKey || ''
  };
  Object.keys(vals).forEach(function (h) {
    const c = colIndex_(sh, h);
    if (c > 0) sh.getRange(target._row, c).setNumberFormat('@').setValue(vals[h]);
  });
  invalidateCache_(VISIT_STATS_SHEET_);
  const count = sheetToObjects_(VISIT_STATS_SHEET_).filter(function (r) {
    return visitCenterKey_(r['اسم المركز']) === center;
  }).length;
  return { ok: true, id: p.id, center: center, count: count };
}

/* ------------------- حصر المقاصف (لوحة الإدارة) -------------------
   صف لكل مركز+فترة: هل به مقصف أم لا، مع ملاحظة (السبب). تُنشأ الورقة تلقائيًا عند أول حفظ،
   وكل حفظ يستبدل محتوى الورقة كاملًا بالحصر المعروض في لوحة الإدارة. */
const CANTEEN_SURVEY_SHEET_ = 'حصر المقاصف';
const CANTEEN_SURVEY_HEADERS_ = ['اسم المركز', 'الفترة', 'يوجد مقصف', 'الملاحظات', 'آخر تحديث'];

function getCanteenSurvey_() {
  const sh = sheet_(CANTEEN_SURVEY_SHEET_);
  if (!sh || sh.getLastRow() < 2) return { ok: true, items: [] };
  const values = sh.getRange(1, 1, sh.getLastRow(), Math.max(sh.getLastColumn(), CANTEEN_SURVEY_HEADERS_.length)).getDisplayValues();
  const head = values[0].map(function (h) { return String(h).trim(); });
  const cC = head.indexOf('اسم المركز'), cP = head.indexOf('الفترة'), cH = head.indexOf('يوجد مقصف'), cN = head.indexOf('الملاحظات');
  if (cC === -1 || cH === -1) return { ok: true, items: [] };
  const items = [];
  for (let r = 1; r < values.length; r++) {
    const center = String(values[r][cC] || '').replace(/\s+/g, ' ').trim();
    if (!center) continue;
    items.push({
      center: center,
      period: cP === -1 ? '' : String(values[r][cP] || '').trim(),
      has: String(values[r][cH] || '').trim() !== 'لا',
      notes: cN === -1 ? '' : String(values[r][cN] || '')
    });
  }
  return { ok: true, items: items };
}

function saveCanteenSurvey_(p) {
  const items = Array.isArray(p.items) ? p.items : [];
  if (items.length > 1000) return { ok: false, error: 'عدد المراكز كبير جدًا' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    let sh = sheet_(CANTEEN_SURVEY_SHEET_);
    if (!sh) {
      sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CANTEEN_SURVEY_SHEET_);
      sh.setRightToLeft(true);
    }
    const n = CANTEEN_SURVEY_HEADERS_.length;
    sh.clearContents();
    sh.getRange(1, 1, 1, n).setValues([CANTEEN_SURVEY_HEADERS_])
      .setFontWeight('bold').setBackground('#6e1523').setFontColor('#ffffff').setHorizontalAlignment('center');
    const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    const rows = items.map(function (it) {
      return [String(it.center || '').replace(/\s+/g, ' ').trim(), String(it.period || '').trim(),
              it.has ? 'نعم' : 'لا', String(it.notes || '').trim(), stamp];
    }).filter(function (r) { return r[0]; });
    if (rows.length) {
      sh.getRange(2, 1, rows.length, n).setNumberFormat('@').setValues(rows);
    }
    sh.setFrozenRows(1);
    invalidateCache_(CANTEEN_SURVEY_SHEET_);
    return { ok: true, count: rows.length };
  } finally {
    lock.releaseLock();
  }
}

/* ---- بيانات التواصل (الصفحة الرئيسية) ----
   تنحفظ بشيت «الإعدادات» بدل ملفات الموقع، عشان ما تظهر بمستودع GitHub.
   أضيفي بشيت الإعدادات 3 صفوف (عمود المفتاح بالضبط كذا):
     تواصل - جوال رئيسة الوحدة
     تواصل - جوال مساعدة الوحدة
     تواصل - إيميل الوحدة */
function contactPhone_(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 9 && d.charAt(0) === '5') d = '0' + d;   // قوقل شيتس يحذف الصفر اللي بالبداية
  return d;
}

function getContacts_() {
  return {
    ok: true,
    headPhone: contactPhone_(getSettingValue_('تواصل - جوال رئيسة الوحدة')),
    assistantPhone: contactPhone_(getSettingValue_('تواصل - جوال مساعدة الوحدة')),
    unitEmail: getSettingValue_('تواصل - إيميل الوحدة')
  };
}

/* ---- نص رسالة النقص الثابت (إحصائيات التسجيل ← مراسلة المديرة) ----
   يُحفظ في شيت «الإعدادات» حتى يبقى نفسه على كل الأجهزة. فارغ = يُستخدم النص الافتراضي بالموقع. */
const DEFICIENCY_MSG_KEY_ = 'نص رسالة النقص';

function getDeficiencyMsgTemplate_() {
  return { ok: true, template: getSettingValue_(DEFICIENCY_MSG_KEY_) };
}

function setDeficiencyMsgTemplate_(p) {
  const auth = loginAdmin_(p);
  if (!auth.ok) return { ok: false, auth: true, error: auth.error };
  const t = String(p.template || '').trim();
  if (t.length > 4000) return { ok: false, error: 'النص طويل جداً' };
  setSettingValue_(DEFICIENCY_MSG_KEY_, t);
  return { ok: true, template: t };
}

function getPriceListFile_() {
  return {
    ok: true,
    link: getSettingValue_('رابط ملف قائمة الأسعار'),
    label: getSettingValue_('اسم ملف قائمة الأسعار')
  };
}

function setPriceListFile_(p) {
  if (p.actor !== 'admin') return { ok: false, error: 'ما عندك صلاحية تعديل ملف قائمة الأسعار' };
  let link = '';
  if (p.kind === 'file') {
    link = saveAttachmentFile_(p.fileData, p.fileName || 'ملف قائمة الأسعار', p.mimeType || '');
  } else {
    link = p.link || '';
  }
  setSettingValue_('رابط ملف قائمة الأسعار', link);
  setSettingValue_('اسم ملف قائمة الأسعار', p.label || p.fileName || '');
  return { ok: true };
}

// تشغّل مرة وحدة (اختياري): تصلح روابط الصور القديمة المحفوظة بشيت "الإشعارات"
// اللي كانت بالصيغة الغلط (drive.google.com/file/d/.../view) وتحوّلها للصيغة الصحيحة
function fixOldImageUrls() {
  const sh = sheet_('الإشعارات');
  if (!sh || sh.getLastRow() < 2) { notify_('لا يوجد بيانات لتصليحها'); return; }
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const urlCols = ['رابط صورة الإشعار', 'رابط صورة الإشعار الموقع'];
  const range = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn());
  const values = range.getValues();
  let fixed = 0;
  headers.forEach(function (h, idx) {
    if (urlCols.indexOf(h) === -1) return;
    for (let i = 0; i < values.length; i++) {
      const v = values[i][idx];
      const match = /drive\.google\.com\/file\/d\/([^/]+)\//.exec(v);
      if (match) {
        values[i][idx] = 'https://lh3.googleusercontent.com/d/' + match[1];
        fixed++;
      }
    }
  });
  range.setValues(values);
  invalidateCache_('الإشعارات');
  notify_('تم تصليح ' + fixed + ' رابط صورة قديم.');
}

/* تشغّل مرة وحدة (اختياري): تصلح صفوف "المبيعات" اللي انكتبت بترتيب أعمدة غلط
   (كان فيها خلل قديم يخلي المبلغ ينكتب تحت عمود "اليوم" وهكذا بالتسلسل).
   تتعرف على الصفوف المتضررة بنمط واضح: عمود "المبلغ" فيه وقت (مثل 14:05) بدل رقم،
   وعمود "اليوم" فيه رقم بدل اسم يوم، وعمود "التاريخ" فيه اسم يوم بدل تاريخ - وترجع كل قيمة لعمودها الصحيح. */
function fixMisalignedSalesRows_() {
  const sh = sheet_('المبيعات');
  if (!sh || sh.getLastRow() < 2) { notify_('لا يوجد بيانات لتصليحها'); return; }

  const dayCol = colIndex_(sh, 'اليوم');
  const dateCol = colIndex_(sh, 'التاريخ');
  const timeCol = colIndex_(sh, 'الوقت');
  const amountCol = colIndex_(sh, 'المبلغ');
  if ([dayCol, dateCol, timeCol, amountCol].indexOf(-1) !== -1) {
    notify_('تعذر إيجاد كل الأعمدة المطلوبة (اليوم/التاريخ/الوقت/المبلغ) بشيت المبيعات.');
    return;
  }

  const range = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn());
  const values = range.getValues();
  const timePattern = /^\d{1,2}:\d{2}$/;
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  let fixed = 0;

  values.forEach(function (row) {
    const amountVal = row[amountCol - 1];
    const dayVal = row[dayCol - 1];
    const dateVal = row[dateCol - 1];
    const timeVal = row[timeCol - 1];

    const amountLooksLikeTime = timePattern.test(String(amountVal).trim());
    const dayLooksNumeric = dayVal !== '' && dayVal !== null && !isNaN(parseFloat(dayVal));
    const dateLooksLikeDayName = dayNames.indexOf(String(dateVal).trim()) !== -1;

    // نصلح الصف بس لو انطبقت كل علامات الخلل الثلاث سوا - تفادياً لتعديل صفوف سليمة بالغلط
    if (amountLooksLikeTime && dayLooksNumeric && dateLooksLikeDayName) {
      row[dayCol - 1] = dateVal;   // كان فيه اسم اليوم أصلاً
      row[dateCol - 1] = timeVal;  // كان فيه التاريخ أصلاً
      row[timeCol - 1] = amountVal; // كان فيه الوقت أصلاً
      row[amountCol - 1] = dayVal; // كان فيه المبلغ أصلاً
      fixed++;
    }
  });

  range.setValues(values);
  invalidateCache_('المبيعات');
  notify_('تم تصليح ' + fixed + ' صف من صفوف المبيعات المتضررة.');
}


/* تشغّل مرة وحدة (اختياري): تعبّي عمود "اليوم" لأي صف قديم فاضي فيه، بالاعتماد
   على عمود "التاريخ" بنفس الصف. تستخدمينها لو لاحظتِ إن اسم اليوم ما ينكتب
   بالمبيعات/المرتجعات/الفواتير (سواء لصفوف قديمة، أو لأن عمود "اليوم" ما كان
   موجود أصلاً بالشيت وقت ما انسجلت هذي الصفوف). */
function fillMissingDayNames_() {
  const sheetNames = ['المبيعات', 'المرتجعات', 'الفواتير'];
  let totalFixed = 0;
  const missingSheets = [];
  sheetNames.forEach(function (name) {
    const sh = sheet_(name);
    if (!sh) return;
    const dayCol = colIndex_(sh, 'اليوم');
    const dateCol = colIndex_(sh, 'التاريخ');
    if (dayCol === -1 || dateCol === -1) { missingSheets.push(name); return; }
    if (sh.getLastRow() < 2) return;
    const range = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn());
    const values = range.getValues();
    let fixed = 0;
    values.forEach(function (row) {
      const dayVal = String(row[dayCol - 1]).trim();
      const dateVal = row[dateCol - 1];
      if (!dayVal && dateVal) {
        row[dayCol - 1] = dayNameForDateStr_(String(dateVal));
        fixed++;
      }
    });
    if (fixed > 0) range.setValues(values);
    invalidateCache_(name);
    totalFixed += fixed;
  });
  let msg = 'تم تعبئة اسم اليوم لـ ' + totalFixed + ' صف كان فاضي.';
  if (missingSheets.length) {
    msg += '\n\nتنبيه: عمود "اليوم" أو "التاريخ" غير موجود أصلاً بشيت: ' + missingSheets.join('، ') + '. شغّلي دالة setup أولاً لإضافته، ثم أعيدي تشغيل هذي الدالة.';
  }
  notify_(msg);
}

/* تشغّل مرة وحدة (تشخيص): تطلع لك بالضبط أسماء أعمدة شيتات المبيعات/المرتجعات/الفواتير،
   كل اسم عمود بين قوسين [ ] عشان توضّح أي مسافة خفية بأول أو آخر الاسم، وتحدد
   أي عمود هو "اليوم" اللي يتعرف عليه الكود فعلياً. شغليها لو مازال اليوم ما ينكتب
   بعد تشغيل setup و fillMissingDayNames، وابعتيلي محتوى الرسالة اللي تطلع لك. */
function debugDayColumn_() {
  const names = ['المبيعات', 'المرتجعات', 'الفواتير'];
  let msg = '';
  names.forEach(function (name) {
    const sh = sheet_(name);
    if (!sh) { msg += name + ': ⚠️ الشيت غير موجود\n\n'; return; }
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const foundCol = colIndex_(sh, 'اليوم');
    msg += name + ' (يجدها الكود بعمود رقم: ' + (foundCol === -1 ? 'ما لقاها ❌' : foundCol) + '):\n';
    headers.forEach(function (h, i) {
      const isMatch = String(h).trim() === 'اليوم';
      msg += '  عمود ' + (i + 1) + ': [' + h + ']' + (isMatch ? '  ← تطابق مع "اليوم"' : '') + '\n';
    });
    // نموذج: وش راح ينكتب لو سجّلنا صف اليوم بالضبط
    msg += '  مثال: اسم اليوم المحسوب لتاريخ اليوم = ' + dayNameForDateStr_(nowParts_().date) + '\n\n';
  });
  notify_(msg);
}

function sheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/* ------------------- تخزين مؤقت (Cache) لتسريع القراءة -------------------
   ليش كان الموقع يبطأ لما يفتح أكثر من شخص؟
   الكاش حق قوقل ما يقبل أكثر من 100KB للقيمة الوحدة، وشيت الإشعارات (فيه بيانات
   التواقيع) وشيت المبيعات أكبر من كذا، فكان الحفظ بالكاش يفشل بصمت وكل طلب من كل
   مستخدمة يقرأ الشيت كامل من جديد. الحين البيانات الكبيرة تتقسم لأجزاء صغيرة
   وتنحفظ كلها بالكاش، فأغلب الطلبات ترجع من الذاكرة فوراً مهما كان عدد المستخدمات.
   ولضمان عدم رجوع بيانات قديمة: كل شيت له «رقم نسخة» يتغيّر مع أي حفظ/تعديل/حذف،
   وأي نسخة بالكاش ما تطابق الرقم الحالي تنرمى تلقائياً. */
const CACHE_SECONDS = 900;          // 15 دقيقة - أي حفظ/تعديل/حذف من الموقع يمسحه فوراً
const CACHE_SECONDS_LONG = 900;     // المراكز والمسؤولات (التعديل اليدوي بالشيت يظهر خلال 10 دقائق مع التسخين التلقائي، أو فوراً بـ clearCache)
const CACHE_CHUNK_CHARS_ = 45000;   // حجم الجزء الواحد (أقل من حد 100KB حتى مع الحروف العربية)
const CACHE_MAX_CHUNKS_ = 200;      // حد أعلى احتياطي (~9 ميقا) - لو أكبر ما نخزّن
const CACHE_GEN_SECONDS_ = 21600;   // عمر رقم النسخة (6 ساعات - الحد الأعلى المسموح)

function getCache_() {
  return CacheService.getScriptCache();
}

function newCacheGen_() {
  return Utilities.getUuid().slice(0, 8);
}

/* يمسح نسخة الشيت من الكاش بتغيير رقم نسختها (أي أجزاء قديمة تصير غير صالحة تلقائياً) */
function invalidateCache_(name) {
  if (typeof REQ_SHEET_MEMO_ !== 'undefined') delete REQ_SHEET_MEMO_[name];
  try {
    const cache = getCache_();
    cache.put('gen_' + name, newCacheGen_(), CACHE_GEN_SECONDS_);
    cache.remove('sheet_' + name);
  } catch (e) {}
}

/* أعمدة ثقيلة (صور توقيع base64 بحجم عشرات الكيلوبايت لكل سطر) ما نقراها ولا نخزّنها بالكاش مع القراءة
   العادية للشيت أبداً. السبب: كل طلب يلمس شيت «الإشعارات» (حتى عدّاد الإشعارات بالصفحة الرئيسية)
   كان يحمّل كل التواقيع معه، ومع زيادة الإشعارات يتجاوز حجمها حد الكاش فيُقرأ الشيت كاملاً بكل طلب.
   تُجلب عند الحاجة فقط بدالة getNoticeCenterSignature_ (خلية واحدة). */
const SKIP_READ_COLS_ = { 'الإشعارات': ['بيانات توقيع المركز'] };

function skipColsFor_(name) {
  const n = String(name || '');
  const base = n.indexOf(ARCHIVE_PREFIX) === 0 ? n.slice(ARCHIVE_PREFIX.length) : n;
  return SKIP_READ_COLS_[base] || null;
}

/* تقرأ الشيت من قوقل شيتس مباشرة وتحوّله لكائنات (بدون كاش) */
function readSheetObjectsRaw_(name) {
  const sh = sheet_(name);
  if (!sh) return [];
  const skip = skipColsFor_(name);
  if (skip) return readSheetObjectsSkipping_(sh, skip);
  const data = sh.getDataRange().getValues();
  if (!data || data.length < 1) return [];
  const headers = data[0].map(function (h) { return String(h).trim(); });
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    for (let idx = 0; idx < headers.length; idx++) {
      let val = data[i][idx];
      if (val instanceof Date) val = formatSheetDate_(val);
      obj[headers[idx]] = val;
    }
    obj._row = i + 1;
    rows.push(obj);
  }
  return rows;
}

/* نفس القراءة أعلاه لكن بدون الأعمدة الثقيلة: نقرأ الأعمدة الباقية على مقاطع متصلة (غالباً مقطعين)،
   فما ننقل بيانات التواقيع من قوقل شيتس أصلاً */
function readSheetObjectsSkipping_(sh, skip) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  const segs = [];
  let start = -1;
  for (let c = 0; c < lastCol; c++) {
    const keep = skip.indexOf(headers[c]) === -1;
    if (keep && start === -1) start = c;
    if (!keep && start !== -1) { segs.push([start, c - 1]); start = -1; }
  }
  if (start !== -1) segs.push([start, lastCol - 1]);
  const blocks = segs.map(function (seg) {
    return sh.getRange(1, seg[0] + 1, lastRow, seg[1] - seg[0] + 1).getValues();
  });
  const rows = [];
  for (let i = 1; i < lastRow; i++) {
    const obj = {};
    for (let b = 0; b < segs.length; b++) {
      const seg = segs[b];
      for (let c = seg[0]; c <= seg[1]; c++) {
        let val = blocks[b][i][c - seg[0]];
        if (val instanceof Date) val = formatSheetDate_(val);
        obj[headers[c]] = val;
      }
    }
    obj._row = i + 1;
    rows.push(obj);
  }
  return rows;
}

/* يحفظ صفوف شيت بالكاش مقسّمة لأجزاء - بشرط إن رقم النسخة ما تغيّر أثناء القراءة
   (يعني ما صار حفظ جديد بنفس اللحظة)، عشان ما نحفظ بيانات قديمة فوق الجديدة */
function putSheetCache_(name, rows, gen, duration) {
  try {
    const cache = getCache_();
    if (cache.get('gen_' + name) !== gen) return;
    const str = JSON.stringify(rows);
    const n = Math.max(1, Math.ceil(str.length / CACHE_CHUNK_CHARS_));
    if (n > CACHE_MAX_CHUNKS_) return;
    const items = {};
    for (let i = 0; i < n; i++) {
      items['sheet_' + name + '_' + gen + '_' + i] = str.slice(i * CACHE_CHUNK_CHARS_, (i + 1) * CACHE_CHUNK_CHARS_);
    }
    cache.putAll(items, duration);
    cache.put('sheet_' + name, JSON.stringify({ g: gen, n: n }), duration);
  } catch (e) {
    // لو الكاش رفض لأي سبب نكمل عادي بدون تخزين
  }
}

/* ترجّع رقم النسخة الحالي للشيت (وتنشئ واحد لو ما فيه) */
function currentCacheGen_(name, known) {
  if (known) return known;
  const g = newCacheGen_();
  try { getCache_().put('gen_' + name, g, CACHE_GEN_SECONDS_); } catch (e) {}
  return g;
}

/* شغّليها يدوياً من قائمة الدوال أعلى المحرر (▶️ Run) في أي وقت بعد ما تعدّلي
   أي شيت يدوياً، عشان التغييرات تنعكس بالموقع فوراً بدون ما تنتظري. */
function clearCache() {
  ['المسؤولات', 'المراكز', 'المبيعات', 'المرتجعات', 'الفواتير', 'الحضور', 'التعهد', 'المهام', 'الإشعارات',
   'المرفقات', 'مرفقات الإشراف', 'الإعلانات الهامة', 'محاضر الاجتماعات', 'قائمة الأسعار', 'الإعدادات',
   'دخول الإشراف', 'الصعوبات والمقترحات', 'قائمة الدخل', 'بطاقات التحفيز', 'متابعة بطاقات التحفيز', 'درجات المسؤولات',
   ARCHIVE_PREFIX + 'المبيعات', ARCHIVE_PREFIX + 'المرتجعات', ARCHIVE_PREFIX + 'الفواتير', ARCHIVE_PREFIX + 'الإشعارات', ARCHIVE_PREFIX + 'قائمة الدخل'
  ].forEach(function (n) { invalidateCache_(n); });
  notify_('تم تفريغ الذاكرة المؤقتة. جربي الدخول بالموقع الحين.');
}

/* ------------------- التسخين التلقائي (يخلي الموقع سريع من أول ضغطة) -------------------
   تشتغل كل 10 دقائق تلقائياً: تقرأ الشيتات الأساسية وتحفظها جاهزة بالكاش، فأول مستخدمة
   تفتح الموقع ما تنتظر قراءة الشيت، وأي تعديل يدوي بالشيت ينعكس خلال 10 دقائق بالكثير.
   ⚠️ شغّلي installWarmupTrigger مرة وحدة بس من قائمة الدوال (▶️ Run) ووافقي على الصلاحيات. */
const WARM_SHEETS_ = ['المراكز', 'المسؤولات', 'المبيعات', 'الفواتير', 'الإشعارات', 'المرتجعات',
  'الإعلانات الهامة', 'قائمة الأسعار', 'الإعدادات', 'الحضور', 'التعهد', 'المهام'];

function warmCache() {
  WARM_SHEETS_.forEach(function (name) {
    try {
      const gen = currentCacheGen_(name, getCache_().get('gen_' + name));
      const rows = readSheetObjectsRaw_(name);
      putSheetCache_(name, rows, gen, CACHE_SECONDS);
    } catch (e) {}
  });
}

function installWarmupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'warmCache') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('warmCache').timeBased().everyMinutes(10).create();
  warmCache();
  notify_('تم تفعيل التسخين التلقائي كل 10 دقائق ✅');
}

/* ------------------- الأرشفة الحقيقية (نقل فعلي بدل التوسيم بس) -------------------
   قبل هذا التعديل كانت "الأرشفة" توسيم بس (تكتب اسم الفصل بعمود الفصل الدراسي)
   والبيانات القديمة تضل بنفس الشيت الحيّ للأبد، فيكبر حجمه مع كل فصل جديد ويصير
   كل طلب (حتى لو للفصل الحالي بس) يقرأ تاريخ النظام كامل من أول يوم. الحين
   الأرشفة تنقل الصفوف فعلياً لشيت منفصل اسمه "أرشيف_<اسم الشيت>"، فيبقى الشيت
   الحيّ يحتوي بيانات الفصل الحالي بس وصغير دايماً. */
const ARCHIVE_PREFIX = 'أرشيف_';

function getOrCreateArchiveSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const archiveName = ARCHIVE_PREFIX + name;
  let sh = ss.getSheetByName(archiveName);
  if (!sh) {
    sh = ss.insertSheet(archiveName);
    const live = sheet_(name);
    if (live && live.getLastColumn() > 0) {
      const headers = live.getRange(1, 1, 1, live.getLastColumn()).getValues()[0];
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sh;
}

/* تنقل من الشيت الحيّ كل صف يحقق matchFn(قيمة عمود الأرشفة) لشيت الأرشيف،
   وتعيد كتابة الشيت الحيّ بالصفوف الباقية بس (بعملية واحدة أسرع من حذف صف صف).
   لو انمرّر newLabel تُكتب هالقيمة بعمود الأرشفة بالصفوف المنقولة قبل نقلها
   (تُستخدم وقت إغلاق فصل حالي: الصفوف الفاضية تتحول لموسومة باسم الفصل).
   بدون newLabel تُنقل الصفوف بقيمتها الحالية كما هي (تُستخدم بالترحيل لمرة وحدة
   للصفوف اللي كانت موسومة قبل بس ما انتقلت فعلياً). */
function archiveRowsMatching_(sh, archiveSh, colIdx, matchFn, newLabel) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  const numCols = sh.getLastColumn();
  const data = sh.getRange(2, 1, lastRow - 1, numCols).getValues();
  const toArchive = [];
  const keepRows = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (matchFn(row[colIdx - 1])) {
      if (newLabel !== undefined) row[colIdx - 1] = newLabel;
      toArchive.push(row);
    } else {
      keepRows.push(row);
    }
  }
  if (toArchive.length) {
    // لو انضاف عمود جديد للشيت الحيّ بعد ما انعمل شيت الأرشيف (مثل عمود «وقت التسجيل الفعلي»)،
    // نضيف نفس العمود لآخر الأرشيف قبل النقل، وإلا النقل ينهار بسبب اختلاف عدد الأعمدة
    const archCols = archiveSh.getLastColumn();
    if (archCols < numCols) {
      const liveHeaders = sh.getRange(1, 1, 1, numCols).getValues()[0];
      if (archiveSh.getMaxColumns() < numCols) {
        archiveSh.insertColumnsAfter(archiveSh.getMaxColumns(), numCols - archiveSh.getMaxColumns());
      }
      archiveSh.getRange(1, archCols + 1, 1, numCols - archCols).setValues([liveHeaders.slice(archCols)]);
    }
    archiveSh.getRange(archiveSh.getLastRow() + 1, 1, toArchive.length, numCols).setValues(toArchive);
  }
  sh.getRange(2, 1, lastRow - 1, numCols).clearContent();
  if (keepRows.length) {
    sh.getRange(2, 1, keepRows.length, numCols).setValues(keepRows);
  }
  return toArchive.length;
}

/* ترجّع صفوف شيت معيّن حسب الفصل المطلوب:
   - بدون فصل أو "current": صفوف الشيت الحيّ اللي عمود أرشفتها فاضي (الفصل الحالي)
   - "all": كل الصفوف، من الشيت الحيّ + شيت الأرشيف مع بعض
   - اسم فصل محدد: صفوف شيت الأرشيف اللي عمود أرشفتها يساوي هالاسم بالضبط */
function getRowsForTerm_(name, term, archiveCol, cacheSeconds) {
  const col = archiveCol || 'الفصل الدراسي';
  const archiveName = ARCHIVE_PREFIX + name;
  const t = term ? String(term).trim() : '';
  if (!t || t === 'current') {
    return sheetToObjects_(name, cacheSeconds).filter(function (r) { return String(r[col] || '').trim() === ''; });
  }
  if (t === 'all') {
    return sheetToObjects_(name, cacheSeconds).concat(sheetToObjects_(archiveName, cacheSeconds));
  }
  return sheetToObjects_(archiveName, cacheSeconds).filter(function (r) { return String(r[col] || '').trim() === t; });
}

/* دالة ترحيل تُشغَّل يدوياً مرة وحدة بس (من قائمة الدوال أعلى محرر Apps Script):
   تنقل كل الصفوف اللي كانت موسومة قبل باسم فصل (من نظام الأرشفة القديم) من
   الشيتات الحيّة لشيتات الأرشيف المقابلة، فيرجع حجم الشيتات الحيّة صغير فوراً. */
function migrateOldArchivedRowsToArchiveSheets_() {
  const sheetsToMigrate = [
    { name: 'المبيعات', col: 'الفصل الدراسي' },
    { name: 'المرتجعات', col: 'الفصل الدراسي' },
    { name: 'الفواتير', col: 'الفصل الدراسي' },
    { name: 'الإشعارات', col: 'فصل الأرشفة' },
    { name: 'قائمة الدخل', col: 'الفصل الدراسي' }
  ];
  const counts = {};
  sheetsToMigrate.forEach(function (entry) {
    const sh = sheet_(entry.name);
    if (!sh || sh.getLastRow() < 2) { counts[entry.name] = 0; return; }
    const col = colIndex_(sh, entry.col);
    if (col === -1) { counts[entry.name] = 0; return; }
    const archiveSh = getOrCreateArchiveSheet_(entry.name);
    const n = archiveRowsMatching_(sh, archiveSh, col, function (v) { return String(v).trim() !== ''; });
    counts[entry.name] = n;
    invalidateCache_(entry.name);
    invalidateCache_(ARCHIVE_PREFIX + entry.name);
  });
  notify_('تم ترحيل البيانات القديمة لشيتات الأرشيف بنجاح:\n' + JSON.stringify(counts));
}

/* تنسيق التواريخ عند القراءة: قوقل شيتس يحوّل نصوص التاريخ تلقائياً لكائن Date،
   وإذا رجعناه للواجهة كما هو يظهر بصيغة فيها أصفار زايدة (مثل 00:00:00.000Z).
   هذي الدالة تصيغه نص واضح: تاريخ فقط، أو تاريخ ووقت لو فيه وقت فعلي. */
function formatSheetDate_(d) {
  const tz = Session.getScriptTimeZone();
  // قيمة وقت فقط (بدون تاريخ حقيقي) يخزّنها قوقل شيتس داخلياً بتاريخ 30 ديسمبر 1899
  const isTimeOnly = d.getFullYear() === 1899 && d.getMonth() === 11 && d.getDate() === 30;
  if (isTimeOnly) return Utilities.formatDate(d, tz, 'HH:mm');
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
  return Utilities.formatDate(d, tz, hasTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
}

/* ذاكرة داخل نفس الطلب: لو نفس الشيت انطلب أكثر من مرة بنفس الطلب ما نعيد فك الكاش */
const REQ_SHEET_MEMO_ = {};

function sheetToObjects_(name, cacheSeconds) {
  if (REQ_SHEET_MEMO_[name]) return REQ_SHEET_MEMO_[name].slice();
  const duration = cacheSeconds || CACHE_SECONDS;
  const cache = getCache_();
  let gen = null;

  try {
    const head = cache.getAll(['sheet_' + name, 'gen_' + name]);
    gen = head['gen_' + name] || null;
    const metaStr = head['sheet_' + name];
    if (metaStr && gen) {
      const meta = JSON.parse(metaStr);
      if (meta && meta.g === gen && meta.n > 0) {
        const keys = [];
        for (let i = 0; i < meta.n; i++) keys.push('sheet_' + name + '_' + gen + '_' + i);
        const parts = cache.getAll(keys);
        let complete = true, str = '';
        for (let j = 0; j < keys.length; j++) {
          if (parts[keys[j]] === undefined || parts[keys[j]] === null) { complete = false; break; }
          str += parts[keys[j]];
        }
        if (complete) {
          const rows = JSON.parse(str);
          REQ_SHEET_MEMO_[name] = rows;
          return rows.slice();
        }
      }
    }
  } catch (e) {
    // تجاهل أي خطأ بالكاش وأكملي القراءة العادية من الشيت
  }

  gen = currentCacheGen_(name, gen);
  const rows = readSheetObjectsRaw_(name);
  putSheetCache_(name, rows, gen, duration);
  REQ_SHEET_MEMO_[name] = rows;
  return rows.slice();
}

/* ------------------- الاسم المعروض للمركز (بدون تغيير الاسم الأصلي) -------------------
   الاسم الأصلي بعمود "اسم المركز" بشيت المراكز هو المفتاح اللي تنربط فيه كل البيانات، فما نلمسه.
   لو عبّيتي عمود "الاسم المعروض" لأي مركز (مثلاً: الأصلي "معهد النور" والمعروض "مركز النور")،
   الموقع يعرض الاسم المعروض بكل مكان، والبيانات تبقى مربوطة بالاسم الأصلي.
   الفكرة: عند دخول أي طلب نحوّل الاسم المعروض إلى الأصلي، وعند خروج أي ردّ نحوّل الأصلي إلى المعروض. */
let DISPLAY_MAP_ = null;   // أصلي -> معروض (للردود الخارجة) - يُضبط بكل طلب

function centerAliasMaps_() {
  const maps = { toReal: {}, toDisplay: {}, any: false };
  try {
    const rows = sheetToObjects_('المراكز', CACHE_SECONDS_LONG);
    rows.forEach(function (r) {
      const real = String(r['اسم المركز'] || '').trim();
      const shown = String(r['الاسم المعروض'] || '').trim();
      if (real && shown && shown !== real) {
        maps.toDisplay[real] = shown;
        maps.toReal[shown] = real;
        maps.any = true;
      }
    });
  } catch (e) { /* لو صار خطأ نكمل بدون أسماء معروضة */ }
  return maps;
}

function mapCenterName_(str, dict) {
  // النصوص الطويلة (صور base64 وروابط وغيرها) ما فيها اسم مركز - نتخطاها بدل ما نمسحها حرف حرف بكل طلب
  if (str.length >= 500) return str;
  const t = str.trim();
  if (Object.prototype.hasOwnProperty.call(dict, t)) return dict[t];
  // استهداف الإعلانات: "مركز:الاسم|مسؤولة:الاسم"
  if (str.indexOf('مركز:') !== -1 && str.length < 500) {
    return str.split('|').map(function (tok) {
      const t2 = tok.trim();
      if (t2.indexOf('مركز:') === 0) {
        const nm = t2.slice(5);
        if (Object.prototype.hasOwnProperty.call(dict, nm)) return 'مركز:' + dict[nm];
      }
      return tok;
    }).join('|');
  }
  return str;
}

function mapStringsDeep_(v, dict) {
  if (typeof v === 'string') return mapCenterName_(v, dict);
  if (Array.isArray(v)) return v.map(function (x) { return mapStringsDeep_(x, dict); });
  if (v && Object.prototype.toString.call(v) === '[object Object]') {
    const o = {};
    Object.keys(v).forEach(function (k) { o[k] = mapStringsDeep_(v[k], dict); });
    return o;
  }
  return v;
}

function centerDisplay_(name) {
  const n = String(name || '').trim();
  return (DISPLAY_MAP_ && Object.prototype.hasOwnProperty.call(DISPLAY_MAP_, n)) ? DISPLAY_MAP_[n] : name;
}

function json_(obj) {
  if (DISPLAY_MAP_ && Object.keys(DISPLAY_MAP_).length) obj = mapStringsDeep_(obj, DISPLAY_MAP_);
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return handleRequest_(e.parameter);
}

function doPost(e) {
  let params = {};
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    params = e.parameter;
  }
  return handleRequest_(params);
}

function handleRequest_(p) {
  const T0_ = Date.now();
  try {
    const aliasMaps = centerAliasMaps_();
    DISPLAY_MAP_ = aliasMaps.any ? aliasMaps.toDisplay : null;
    if (aliasMaps.any) p = mapStringsDeep_(p, aliasMaps.toReal);   // الاسم المعروض -> الأصلي قبل المعالجة
    if (p && p.action === 'batch') return json_(runBatch_(p, T0_));
    return json_(dispatch_(p, T0_));
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

/* ------------------- تجميع طلبات القراءة في طلب واحد -------------------
   كل طلب منفصل يشغّل تنفيذاً جديداً للسكربت كاملاً على خوادم قوقل (وهذا يأخذ معظم الوقت)،
   وكانت الصفحة بعد الدخول ترسل نحو 10 طلبات قراءة معاً، فيتزاحم التنفيذ خصوصاً عند دخول
   أكثر من مستخدمة. الآن يجمع المتصفح طلبات القراءة المتزامنة ويرسلها هنا دفعة واحدة،
   فتُنفَّذ كلها داخل تنفيذ واحد وتشترك في القراءات المخزّنة. يُقبل هنا طلبات القراءة فقط. */
const BATCH_MAX_ = 25;

function runBatch_(p, T0_) {
  const calls = Array.isArray(p.calls) ? p.calls.slice(0, BATCH_MAX_) : [];
  const results = calls.map(function (c) {
    const sub = (c && typeof c === 'object') ? c : {};
    const a = String(sub.action || '');
    if (a.indexOf('get') !== 0 && a !== 'ping') return { ok: false, error: 'غير مسموح ضمن الدفعة' };
    try {
      return dispatch_(sub, T0_);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  return { ok: true, batch: true, results: results, serverMs: Date.now() - T0_ };
}

function dispatch_(p, T0_) {
  const action = p.action;
  switch (action) {
    case 'createAdminNotice': return (createAdminNotice_(p));
    case 'centerSignNotice': return (centerSignNotice_(p));
    case 'getCenters': return (getCenters_());
    case 'loginCenter': return (loginCenter_(p));
    case 'loginMasoula': return (loginMasoula_(p));
    case 'getMasoulat': return (getMasoulat_());
    case 'getMasoulaGrades': return (getMasoulaGrades_(p));
    case 'saveMasoulaGrades': return (saveMasoulaGrades_(p));

    case 'recordSale': return (recordSale_(p));
    case 'getSales': return (getSales_(p));
    case 'updateSale': return (updateSale_(p));
    case 'deleteSale': return (deleteSale_(p));

    case 'recordReturn': return (recordReturn_(p));
    case 'getReturns': return (getReturns_(p));
    case 'updateReturn': return (updateReturn_(p));
    case 'deleteReturn': return (deleteReturn_(p));

    case 'recordInvoice': return (recordInvoice_(p));
    case 'getInvoices': return (getInvoices_(p));
    case 'updateInvoice': return (updateInvoice_(p));
    case 'deleteInvoice': return (deleteInvoice_(p));

    case 'getAttendance': return (getAttendance_(p));
    case 'recordAttendance': return (recordAttendance_(p));
    case 'recordAttendanceBulk': return (recordAttendanceBulk_(p));
    case 'getAttendanceForDate': return (getAttendanceForDate_(p));

    case 'getPledge': return (getPledge_(p));
    case 'signPledge': return (signPledge_(p));
    case 'getPledgeStatusAll': return (getPledgeStatusAll_());

    case 'getTasksAck': return (getTasksAck_(p));
    case 'acknowledgeTasks': return (acknowledgeTasks_(p));
    case 'getTasksStatusAll': return (getTasksStatusAll_());

    case 'getMasoulaDashboard': return (getMasoulaDashboard_(p));

    case 'submitNotice': return (submitNotice_(p));
    case 'getCenterNotices': return (getCenterNotices_(p));
    case 'getCenterPendingCount': return (getCenterPendingCount_(p));
    case 'getPendingNotices': return (getPendingNotices_());
    case 'getPendingNoticesCount': return (getPendingNoticesCount_());
    case 'getAllNotices': return (getAllNotices_(p));
    case 'adminSignNotice': return (adminSignNotice_(p));
    case 'updateSignedNotice': return (updateSignedNotice_(p));
    case 'getNoticeAdminSignature': return (getNoticeAdminSignature_(p));
    case 'getNoticeCenterSignature': return (getNoticeCenterSignature_(p));
    case 'submitCanteenOrder': return (submitCanteenOrder_(p));
    case 'getCanteenOrders': return (getCanteenOrders_(p));
    case 'setCanteenOrderStatus': return (setCanteenOrderStatus_(p));
    case 'updateNotice': return (updateNotice_(p));
    case 'deleteNotice': return (deleteNotice_(p));
    case 'exportNoticesToSheet': return (exportNoticesToSheet_(p));

    case 'getStats': return (getStats_());
    case 'getRegistrationStats': return (getRegistrationStats_(p));
    case 'setRegistrationVerified': return (setRegistrationVerified_(p));

    case 'archiveCurrentTerm': return (archiveCurrentTerm_(p));
    case 'getTermsList': return (getTermsList_());

    case 'saveVisitReport': return (saveVisitReport_(p));
    case 'amendVisitReport': return (amendVisitReport_(p));
    case 'getVisitReportsAdmin': return (getVisitReportsAdmin_(p));
    case 'getVisitReportsForCenter': return (getVisitReportsForCenter_(p));
    case 'getVisitReportPendingCount': return (getVisitReportPendingCount_(p));
    case 'signVisitReport': return (signVisitReport_(p));
    case 'deleteVisitReport': return (deleteVisitReport_(p));

    case 'getMasoulaEvalCtx': return (getMasoulaEvalCtx_(p));
    case 'getMasoulaEvalsForCenter': return (getMasoulaEvalsForCenter_(p));
    case 'submitMasoulaEval': return (submitMasoulaEval_(p));
    case 'getMasoulaEvalSigs': return (getMasoulaEvalSigs_(p));
    case 'deleteMasoulaEval': return (deleteMasoulaEval_(p));
    case 'getMasoulaEvalsAdmin': return (getMasoulaEvalsAdmin_(p));
    case 'getMasoulaEvalPendingCount': return (getMasoulaEvalPendingCount_(p));
    case 'adminSignMasoulaEval': return (adminSignMasoulaEval_(p));

    case 'recordIncomeItem': return (recordIncomeItem_(p));
    case 'getIncomeItems': return (getIncomeItems_(p));
    case 'updateIncomeItem': return (updateIncomeItem_(p));
    case 'deleteIncomeItem': return (deleteIncomeItem_(p));

    case 'recordAttachment': return (recordAttachment_(p));
    case 'getAttachments': return (getAttachments_(p));
    case 'deleteAttachment': return (deleteAttachment_(p));

    case 'recordAnnouncement': return (recordAnnouncement_(p));
    case 'getAllAnnouncements': return (getAllAnnouncements_());
    case 'getAnnouncementsFor': return (getAnnouncementsFor_(p));
    case 'deleteAnnouncement': return (deleteAnnouncement_(p));
    case 'recordMeetingMinutes': return (recordMeetingMinutes_(p));
    case 'getAllMeetingMinutes': return (getAllMeetingMinutes_());
    case 'getMeetingMinutesFor': return (getMeetingMinutesFor_(p));
    case 'deleteMeetingMinutes': return (deleteMeetingMinutes_(p));

    case 'getPriceItems': return (getPriceItems_());
    case 'addPriceItem': return (addPriceItem_(p));
    case 'updatePriceItem': return (updatePriceItem_(p));
    case 'deletePriceItem': return (deletePriceItem_(p));
    case 'getPriceListManager': return (getPriceListManager_());
    case 'setPriceListManager': return (setPriceListManager_(p));

    case 'ping': return ({ ok: true, serverMs: Date.now() - T0_, version: '2026-10-22-batch', batch: true, invoiceReturns: typeof cleanInvoiceReturn_ === 'function', canteenOrders: typeof submitCanteenOrder_ === 'function', lightNotices: typeof getNoticeCenterSignature_ === 'function' });
    case 'getPurchaseCenters': return (getPurchaseCenters_());
    case 'setPurchaseCenters': return (setPurchaseCenters_(p));
    case 'getExpenseCenters': return (getExpenseCenters_());
    case 'setExpenseCenters': return (setExpenseCenters_(p));
    case 'getPriceListFile': return (getPriceListFile_());
    case 'getDeficiencyMsgTemplate': return (getDeficiencyMsgTemplate_());
    case 'setDeficiencyMsgTemplate': return (setDeficiencyMsgTemplate_(p));
    case 'getContacts': return (getContacts_());
    case 'recordVisitStat': return (recordVisitStat_(p));
    case 'getVisitStats': return (getVisitStats_());
    case 'deleteVisitStat': return (deleteVisitStat_(p));
    case 'updateVisitStat': return (updateVisitStat_(p));
    case 'getCanteenSurvey': return (getCanteenSurvey_());
    case 'saveCanteenSurvey': return (saveCanteenSurvey_(p));
    case 'setPriceListFile': return (setPriceListFile_(p));

    case 'loginSupervision': return (loginSupervision_(p));
    case 'loginAdmin': return (loginAdmin_(p));
    case 'getDirectors': return (getDirectors_(p));

    case 'recordDifficulty': return (recordDifficulty_(p));
    case 'getDifficulties': return (getDifficulties_(p));
    case 'deleteDifficulty': return (deleteDifficulty_(p));

    case 'recordIncentiveEntry': return (recordIncentiveEntry_(p));
    case 'getIncentiveEntries': return (getIncentiveEntries_(p));
    case 'addIncentiveFollowupSplit': return (addIncentiveFollowupSplit_(p));
    case 'getIncentiveFollowupSplits': return (getIncentiveFollowupSplits_(p));
    case 'deleteIncentiveFollowupSplit': return (deleteIncentiveFollowupSplit_(p));
    case 'acknowledgeIncentiveEntries': return (acknowledgeIncentiveEntries_(p));

    case 'debugInfo': return (debugInfo_());

    default: return { ok: false, error: 'إجراء غير معروف' };
  }
}

/* تصدير إشعارات الاستلام/التسليم إلى Google Sheet واحد ثابت (للإدارة والإشراف).
   أول مرة ينشئ الملف ويحفظ معرّفه، وبعدها كل تصدير يحدّث نفس الملف (نفس الرابط) بآخر الإشعارات والمبالغ.
   p.rows: مصفوفة صفوف [المركز, النوع, المبلغ, اليوم, التاريخ, الحالة].
   الإجماليات تنكتب كمعادلات (SUMIF / SUM). */
const NOTICES_SHEET_PROP_ = 'NOTICES_EXPORT_SHEET_ID';

function exportNoticesToSheet_(p) {
  const rows = Array.isArray(p.rows) ? p.rows : [];
  if (!rows.length) return { ok: false, error: 'لا توجد إشعارات للتصدير' };
  if (rows.length > 5000) return { ok: false, error: 'عدد الإشعارات كبير جداً للتصدير' };

  const headers = ['المركز', 'النوع', 'المبلغ', 'اليوم', 'التاريخ', 'الحالة'];
  const data = rows.map(function (r) {
    return [centerDisplay_(String(r[0] || '').trim()), String(r[1] || ''), Number(r[2]) || 0,
            String(r[3] || ''), String(r[4] || ''), String(r[5] || '')];
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const props = PropertiesService.getScriptProperties();
    let ss = null;
    const savedId = props.getProperty(NOTICES_SHEET_PROP_);
    if (savedId) {
      try { ss = SpreadsheetApp.openById(savedId); if (DriveApp.getFileById(savedId).isTrashed()) ss = null; } catch (e) { ss = null; }
    }
    let isNew = false;
    if (!ss) {
      ss = SpreadsheetApp.create('إشعارات الاستلام والتسليم');
      props.setProperty(NOTICES_SHEET_PROP_, ss.getId());
      isNew = true;
    }

    let sh = ss.getSheetByName('الإشعارات');
    if (!sh) { sh = ss.getSheets()[0]; sh.setName('الإشعارات'); }
    sh.clear();
    sh.setRightToLeft(true);

    const n = data.length;
    const last = n + 1;
    sh.getRange(2, 5, n, 1).setNumberFormat('@');           // التاريخ نص عشان ما يتحول لتاريخ ميلادي
    sh.getRange(1, 1, 1, 6).setValues([headers])
      .setFontWeight('bold').setBackground('#6e1523').setFontColor('#ffffff').setHorizontalAlignment('center');
    sh.getRange(2, 1, n, 6).setValues(data);
    sh.getRange(2, 3, n, 1).setNumberFormat('#,##0.00');

    // صفوف الإجماليات
    let r = last + 2;
    const types = ['استلام', 'تسليم'].filter(function (t) { return data.some(function (d) { return d[1] === t; }); });
    if (types.length > 1) {
      types.forEach(function (t) {
        sh.getRange(r, 1).setValue('إجمالي ' + t);
        sh.getRange(r, 3).setFormula('=SUMIF($B$2:$B$' + last + ',"' + t + '",$C$2:$C$' + last + ')');
        r++;
      });
    }
    sh.getRange(r, 1).setValue('إجمالي المبالغ');
    sh.getRange(r, 3).setFormula('=SUM($C$2:$C$' + last + ')');
    const totalsFrom = last + 2;
    sh.getRange(totalsFrom, 1, r - totalsFrom + 1, 6).setFontWeight('bold').setBackground('#f6efe2');
    sh.getRange(totalsFrom, 3, r - totalsFrom + 1, 1).setNumberFormat('#,##0.00');

    sh.getRange(r + 2, 1).setValue('آخر تحديث: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'))
      .setFontColor('#777777');

    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, 6);
    SpreadsheetApp.flush();

    if (isNew) {
      // ننقل الملف لمجلد النظام وننشئ رابط عرض (نفس أسلوب مرفقات النظام الأخرى)
      const file = DriveApp.getFileById(ss.getId());
      file.moveTo(getOrCreateSubFolder_(['تقارير الإشعارات']));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    return { ok: true, url: ss.getUrl(), created: isNew };
  } finally {
    lock.releaseLock();
  }
}

/* ------------------- المراكز والمسؤولات: تسجيل الدخول ------------------- */

function getCenters_() {
  const rows = sheetToObjects_('المراكز', CACHE_SECONDS_LONG);
  // readOnly: المراكز التي فيها مسؤولة مقصف («وضع العرض فقط» = نعم) - لا تُحسب لها مكافأة متعاونة المقصف
  return { ok: true, centers: rows.map(function (r) { return r['اسم المركز']; }),
           readOnly: rows.filter(function (r) { return String(r['وضع العرض فقط'] || '').trim() === 'نعم'; }).map(function (r) { return r['اسم المركز']; }) };
}

function loginCenter_(p) {
  const rows = sheetToObjects_('المراكز', CACHE_SECONDS_LONG);
  const found = rows.find(function (r) {
    return String(r['اسم المركز']).trim() === String(p.center).trim() &&
      String(r['كلمة المرور']).trim() === String(p.password).trim();
  });
  if (!found) return { ok: false, error: 'اسم المركز أو كلمة المرور غير صحيحة' };
  const readOnly = String(found['وضع العرض فقط'] || '').trim() === 'نعم';
  return { ok: true, center: found['اسم المركز'], readOnly: readOnly };
}

function loginMasoula_(p) {
  const rows = sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG);
  const username = String(p.username || '').trim();
  const password = String(p.password || '').trim();

  const nameMatch = rows.find(function (r) {
    return String(r['الاسم']).trim() === username ||
      String(r['البريد الإلكتروني']).trim().toLowerCase() === username.toLowerCase();
  });

  if (!nameMatch) {
    return { ok: false, error: 'ما لقينا اسم "' + username + '" بشيت المسؤولات. تأكدي إنه مكتوب بالضبط نفس الشيت (بدون مسافات زايدة).' };
  }
  if (String(nameMatch['كلمة المرور']).trim() !== password) {
    return { ok: false, error: 'الاسم صحيح، بس كلمة المرور مو مطابقة لللي بالشيت لهذا الاسم.' };
  }

  return { ok: true, name: nameMatch['الاسم'], email: nameMatch['البريد الإلكتروني'] || '', center: nameMatch['اسم المركز'] || '' };
}

function getMasoulat_() {
  const rows = sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG);
  return { ok: true, masoulat: rows.map(function (r) { return r['الاسم']; }).filter(Boolean) };
}

/* ------------------- درجات المسؤولات (تقييم نهاية الفصل من 13) -------------------
   التقييم يدوي بالكامل من لوحة الإدارة (edara.html ← «درجات المسؤولات»): كل بند يكون
   «مكتمل» أو «ناقص»، والدرجة = 13 ناقص درجات البنود الناقصة. تُحفظ بشيت «درجات المسؤولات»
   بصف واحد لكل (فصل + مسؤولة)، ولو انحفظ نفس الفصل مرة ثانية تتحدّث الصفوف نفسها (ما تتكرر). */
const GRADES_SHEET_ = 'درجات المسؤولات';
const GRADES_ITEMS_ = [
  { key: 'تسجيل المبيعات', max: 4 },
  { key: 'الفواتير', max: 3 },
  { key: 'إشعار الاستلام', max: 2 },
  { key: 'توقيع التعهد', max: 2 },
  { key: 'تأكيد الاطلاع على المهام', max: 2 }
];
const GRADES_TOTAL_ = 13;
const GRADES_HEADERS_ = ['معرف', 'الفصل', 'اسم المسؤولة', 'اسم المركز']
  .concat(GRADES_ITEMS_.map(function (i) { return i.key; }))
  .concat(['الدرجة', 'الناقص', 'اليوم', 'التاريخ']);

/* تنشئ الشيت تلقائياً لو ما كان موجود (فما يلزم تشغيل setup() عشان تشتغل الميزة) */
function getGradesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(GRADES_SHEET_);
  if (!sh) {
    sh = ss.insertSheet(GRADES_SHEET_);
    sh.appendRow(GRADES_HEADERS_);
    sh.getRange(1, 1, 1, GRADES_HEADERS_.length).setFontWeight('bold');
    sh.setRightToLeft(true);
    ['اليوم', 'التاريخ'].forEach(function (h) {
      const idx = GRADES_HEADERS_.indexOf(h) + 1;
      sh.getRange(2, idx, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    });
  }
  return sh;
}

/* تحسب الدرجة والناقص من حالات البنود (أي قيمة غير «ناقص» تُعتبر «مكتمل») */
function computeGrade_(items) {
  const state = {};
  const missing = [];
  let score = GRADES_TOTAL_;
  GRADES_ITEMS_.forEach(function (it) {
    const isMissing = String((items || {})[it.key] || '').trim() === 'ناقص';
    state[it.key] = isMissing ? 'ناقص' : 'مكتمل';
    if (isMissing) { score -= it.max; missing.push(it.key); }
  });
  return { state: state, missing: missing, score: score };
}

/* p.term: اسم الفصل، مثال «الفصل الدراسي الأول ١٤٤٨هـ».
   ترجع كل المسؤولات (من شيت المسؤولات) ومعها درجاتهم المحفوظة لهذا الفصل،
   والمسؤولة اللي ما انحفظ لها شي تطلع «مكتمل» بكل البنود (saved: false). */
function getMasoulaGrades_(p) {
  const term = String(p.term || '').trim();
  const masoulat = sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG).filter(function (r) {
    return String(r['الاسم'] || '').trim();
  });

  const savedByName = {};
  if (term) {
    sheetToObjects_(GRADES_SHEET_).forEach(function (r) {
      if (String(r['الفصل'] || '').trim() === term) savedByName[String(r['اسم المسؤولة'] || '').trim()] = r;
    });
  }

  const list = masoulat.map(function (m) {
    const name = String(m['الاسم']).trim();
    const saved = savedByName[name];
    const items = {};
    GRADES_ITEMS_.forEach(function (it) { items[it.key] = saved ? saved[it.key] : 'مكتمل'; });
    const g = computeGrade_(items);
    return {
      name: name,
      center: String(m['اسم المركز'] || '').trim(),
      saved: !!saved,
      items: g.state,
      score: g.score,
      missing: g.missing
    };
  });

  return { ok: true, term: term, total: GRADES_TOTAL_, items: GRADES_ITEMS_, list: list };
}

/* p.term + p.grades: [{ name, center, items: { «تسجيل المبيعات»: 'مكتمل'|'ناقص', ... } }]
   تحدّث الصف الموجود لنفس (الفصل + المسؤولة) أو تضيف صف جديد، والدرجة تنحسب هنا بالسيرفر. */
function saveMasoulaGrades_(p) {
  const term = String(p.term || '').trim();
  if (!term) return { ok: false, error: 'اسم الفصل الدراسي مطلوب' };
  const grades = p.grades || [];
  if (!grades.length) return { ok: false, error: 'لا يوجد درجات للحفظ' };

  const sh = getGradesSheet_();

  // نتأكد أن كل الأعمدة المطلوبة موجودة (لو انضاف الشيت يدوياً أو نقص منه عمود)
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  GRADES_HEADERS_.forEach(function (h) {
    if (headers.indexOf(h) === -1) {
      sh.getRange(1, sh.getLastColumn() + 1).setValue(h).setFontWeight('bold');
      headers.push(h);
    }
  });
  const termCol = headers.indexOf('الفصل');
  const nameCol = headers.indexOf('اسم المسؤولة');
  const idCol = headers.indexOf('معرف');

  const lastRow = sh.getLastRow();
  const values = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
  const rowIndexByKey = {};
  values.forEach(function (row, i) {
    rowIndexByKey[String(row[termCol]).trim() + '||' + String(row[nameCol]).trim()] = i;
  });

  const now = nowParts_();
  const newRows = [];
  let updated = 0;

  grades.forEach(function (g) {
    const name = String(g.name || '').trim();
    if (!name) return;
    const calc = computeGrade_(g.items);
    const fields = {
      'الفصل': term,
      'اسم المسؤولة': name,
      'اسم المركز': String(g.center || '').trim(),
      'الدرجة': calc.score,
      'الناقص': calc.missing.length ? calc.missing.join('، ') : 'مكتمل',
      'اليوم': now.day,
      'التاريخ': now.date
    };
    GRADES_ITEMS_.forEach(function (it) { fields[it.key] = calc.state[it.key]; });

    const key = term + '||' + name;
    if (rowIndexByKey.hasOwnProperty(key)) {
      const row = values[rowIndexByKey[key]];
      headers.forEach(function (h, c) { if (fields.hasOwnProperty(h)) row[c] = fields[h]; });
      updated++;
    } else {
      const row = headers.map(function (h) { return fields.hasOwnProperty(h) ? fields[h] : ''; });
      row[idCol] = Utilities.getUuid();
      newRows.push(row);
    }
  });

  if (updated && values.length) sh.getRange(2, 1, values.length, headers.length).setValues(values);
  if (newRows.length) sh.getRange(sh.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);

  invalidateCache_(GRADES_SHEET_);
  return { ok: true, added: newRows.length, updated: updated };
}

/* تسجيل دخول مكتب إشراف الداخل (eshraf.html) بالبريد الإلكتروني وكلمة المرور -
   البيانات تُدارى يدوياً بشيت "دخول الإشراف" (تضيفين صف جديد لكل بريد مسموح له بالدخول). */
function loginSupervision_(p) {
  const rows = sheetToObjects_('دخول الإشراف', CACHE_SECONDS_LONG);
  const email = String(p.email || '').trim().toLowerCase();
  const password = String(p.password || '').trim();

  const found = rows.find(function (r) {
    return String(r['البريد الإلكتروني']).trim().toLowerCase() === email;
  });

  if (!found) {
    return { ok: false, error: 'ما لقينا هذا البريد الإلكتروني بشيت "دخول الإشراف". تأكدي إنه مضاف ومكتوب بالضبط.' };
  }
  if (String(found['كلمة المرور']).trim() !== password) {
    return { ok: false, error: 'البريد الإلكتروني صحيح، بس كلمة المرور مو مطابقة.' };
  }
  return { ok: true, email: found['البريد الإلكتروني'], name: found['الاسم'] || '' };
}

/* تسجيل دخول لوحة إدارة وحدة المقاصف (edara.html) - كلمة المرور مخزّنة بـ
   "Script Properties" (إعدادات المشروع بمحرر Apps Script)، مو بالكود نفسه،
   عشان ما تظهر بملفات edara.html أو Code.gs المرفوعة على GitHub.
   طريقة الإضافة/التعديل: من محرر Apps Script ← أيقونة الترس (⚙️ Project Settings)
   يسار الشاشة ← "Script Properties" ← Add script property ←
   Property: ADMIN_PASSWORD, Value: كلمة المرور اللي تبينها ← Save. */
function loginAdmin_(p) {
  const password = String(p.password || '').trim();
  const stored = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!stored) {
    return { ok: false, error: 'ما تم ضبط كلمة مرور الإدارة بعد. من محرر Apps Script: ⚙️ Project Settings ← Script Properties ← أضيفي Property باسم ADMIN_PASSWORD وقيمتها كلمة المرور.' };
  }
  if (password !== String(stored).trim()) {
    return { ok: false, error: 'كلمة المرور غير صحيحة' };
  }
  return { ok: true };
}

/* ------------------- أرقام مديرات المراكز (لإرسال تقرير الزيارة عبر واتساب) -------------------
   الأرقام محفوظة في ورقة «أرقام المديرات» داخل هذا الشيت، وليست في ملفات الموقع على GitHub،
   ولا تُعرض إلا لمن أدخلت كلمة مرور الإدارة.
   أعمدة الورقة: اسم المركز | الفترة | اسم المديرة | الجوال
   (إذا تُركت خلية «اسم المركز» فارغة فهي تابعة للمركز الذي في الصف السابق) */
const DIRECTORS_SHEET_ = 'أرقام المديرات';

function normalizeSaPhone_(v) {
  let d = String(v === undefined || v === null ? '' : v)
    .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
    .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); })
    .replace(/\.0+$/, '')
    .replace(/\D/g, '');
  if (d.indexOf('00966') === 0) d = d.slice(5);
  else if (d.indexOf('966') === 0) d = d.slice(3);
  if (d.indexOf('0') === 0) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? '966' + d : '';
}

function getDirectors_(p) {
  const auth = loginAdmin_(p);
  if (!auth.ok) return { ok: false, auth: true, error: auth.error };
  let sh = sheet_(DIRECTORS_SHEET_);
  if (!sh) {
    sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet(DIRECTORS_SHEET_);
    sh.getRange(1, 1, 1, 4).setValues([['اسم المركز', 'الفترة', 'اسم المديرة', 'الجوال']]).setFontWeight('bold');
    sh.setRightToLeft(true);
    return { ok: true, directors: [] };
  }
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: true, directors: [] };
  const head = values[0].map(function (h) { return String(h).trim(); });
  const col = function (names) {
    for (let i = 0; i < names.length; i++) { const k = head.indexOf(names[i]); if (k !== -1) return k; }
    return -1;
  };
  const cC = col(['اسم المركز', 'المركز']), cP = col(['الفترة']), cN = col(['اسم المديرة', 'المديرة']), cT = col(['الجوال', 'رقم الجوال']);
  if (cC === -1 || cT === -1) return { ok: false, error: 'ورقة «' + DIRECTORS_SHEET_ + '» ينقصها عمود «اسم المركز» أو «الجوال».' };
  const out = [];
  let lastCenter = '';
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const center = String(row[cC] || '').trim();
    if (center) lastCenter = center;
    const phone = normalizeSaPhone_(row[cT]);
    if (!lastCenter || !phone) continue;
    const period = cP === -1 ? '' : String(row[cP] || '').trim();
    out.push({
      center: lastCenter,
      period: period,
      evening: /عصر|مساء|مسائ/.test(period),
      name: cN === -1 ? '' : String(row[cN] || '').trim(),
      phone: phone
    });
  }
  return { ok: true, directors: out };
}

/* ------------------- المبيعات اليومية ------------------- */

function recordSale_(p) {
  const sh = sheet_('المبيعات');
  const id = Utilities.getUuid();
  const now = nowParts_();
  const date = p.date || now.date;
  const time = p.time || now.time;
  const day = dayNameForDateStr_(date);
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center, 'اليوم': day, 'التاريخ': date, 'الوقت': time, 'المبلغ': Number(p.amount),
    'ملاحظات': p.notes || '',
    'وقت التسجيل الفعلي': entryStamp_()   // وقت التسجيل الحقيقي من السيرفر (يعتمد عليه التحليل الذكي لقياس «التسجيل أول بأول»)
  });
  invalidateCache_('المبيعات');
  return { ok: true, id: id };
}

/* p.term: 'current' (افتراضي لو ما انمرّر شي) = بس الصفوف اللي عمود الأرشفة فيها فاضي
   (يعني ما انترحّلت لفصل منتهي بعد). أي قيمة ثانية = اسم فصل محدد بالضبط.
   'all' = كل الصفوف بدون فلترة (تُستخدم لعرض كل التاريخ).
   colName: اسم عمود الأرشفة - افتراضياً "الفصل الدراسي"، وبشيت "الإشعارات" نستخدم
   عمود منفصل اسمه "فصل الأرشفة" لأن "الفصل الدراسي" فيه مستخدم أصلاً لغرض ثاني
   (تسجيل فصل رسوم حفل تحفيظ الصغار وقت إرسال الإشعار). */
function filterByTerm_(rows, term, colName) {
  const col = colName || 'الفصل الدراسي';
  if (term === 'all') return rows;
  if (term && term !== 'current') {
    return rows.filter(function (r) { return String(r[col] || '').trim() === term; });
  }
  return rows.filter(function (r) { return String(r[col] || '').trim() === ''; });
}

/* ترجع قائمة بأسماء الفصول الدراسية المنتهية (اللي سبق ترحيلها) الموجودة فعلياً
   بأي من الشيتات الأربعة، بدون تكرار - تُستخدم لتعبئة قائمة اختيار الفصل بالواجهة. */
function getTermsList_() {
  const seen = {};
  const terms = [];
  function collect(name, colName) {
    // بعد الأرشفة الحقيقية، الفصول المنتهية تُقرأ من شيت الأرشيف (الشيت الحيّ
    // يحتوي الفصل الحالي بس، وما فيه أصلاً قيم فصل غير فاضية لنجمعها)
    sheetToObjects_(ARCHIVE_PREFIX + name).forEach(function (r) {
      const t = String(r[colName] || '').trim();
      if (t && !seen[t]) { seen[t] = true; terms.push(t); }
    });
  }
  collect('المبيعات', 'الفصل الدراسي');
  collect('المرتجعات', 'الفصل الدراسي');
  collect('الفواتير', 'الفصل الدراسي');
  collect('الإشعارات', 'فصل الأرشفة');
  collect('قائمة الدخل', 'الفصل الدراسي');
  return { ok: true, terms: terms };
}

function getSales_(p) {
  let rows = getRowsForTerm_('المبيعات', p.term, 'الفصل الدراسي');
  if (p.center) rows = rows.filter(function (r) { return String(r['اسم المركز']).trim() === String(p.center).trim(); });
  const total = rows.reduce(function (sum, r) { return sum + (Number(r['المبلغ']) || 0); }, 0);
  return { ok: true, sales: rows, total: total };
}

/* كاش بسيط لصف العناوين مدة تنفيذ الطلب الواحد بس (متغيّر عام يُعاد إنشاؤه
   مع كل استدعاء جديد لـ Apps Script). الهدف: دوال مثل updateInvoice_ اللي تنادي
   colIndex_ عدة مرات بنفس الشيت كانت تعيد قراءة صف العناوين من قوقل شيتس بكل
   استدعاء (طلب شبكة منفصل لكل مرة) - الحين تُقرأ مرة وحدة وتُعاد استخدامها. */
var _headerRowCache_ = {};

function getHeaderRow_(sh) {
  const key = sh.getSheetId();
  if (_headerRowCache_[key]) return _headerRowCache_[key];
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  _headerRowCache_[key] = headers;
  return headers;
}

/* ترجع رقم عمود بالاسم (1-indexed) بالبحث عن اسم العمود بصف العناوين.
   تتجاهل أي مسافات زائدة بأول/آخر اسم العمود بالشيت عشان ما يفشل التطابق
   لو انضاف العمود يدوياً وفيه مسافة خفية (وهذا سبب شائع لمشكلة "اليوم ما ينكتب"). */
function colIndex_(sh, headerName) {
  const headers = getHeaderRow_(sh);
  const target = String(headerName).trim();
  for (let i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === target) return i + 1;
  }
  return -1;
}

/* تضيف صف جديد حسب اسم العمود الفعلي بالشيت (مو حسب ترتيب ثابت بالكود).
   هذا يحمينا لو صار ترتيب الأعمدة الفعلي بالشيت مختلف عن الترتيب المتوقع
   (مثلاً لو انضاف عمود جديد بآخر الشيت بدل ما ينحط بمكانه الصحيح) - وهذا بالضبط
   كان سبب مشكلة "المبلغ يتكتب تحت عمود اليوم" اللي صارت قبل هذا الإصلاح.
   تتجاهل أيضاً أي مسافات زائدة بأسماء الأعمدة (نفس سبب مشكلة colIndex_ أعلاه).
   valuesObj: كائن {اسم العمود: القيمة} - أي عمود موجود بالشيت وما انذكر بالكائن يُترك فاضي. */
function appendRowByHeaders_(sh, valuesObj) {
  const headers = getHeaderRow_(sh);
  const keysTrimmed = {};
  Object.keys(valuesObj).forEach(function (k) { keysTrimmed[k.trim()] = valuesObj[k]; });
  const row = headers.map(function (h) {
    const key = String(h).trim();
    return keysTrimmed.hasOwnProperty(key) ? keysTrimmed[key] : '';
  });
  sh.appendRow(row);
}

function updateSale_(p) {
  const sh = sheet_('المبيعات');
  const row = Number(p.row);
  sh.getRange(row, colIndex_(sh, 'المبلغ')).setValue(Number(p.amount));
  if (p.date) {
    sh.getRange(row, colIndex_(sh, 'التاريخ')).setValue(p.date);
    const dayCol = colIndex_(sh, 'اليوم');
    if (dayCol !== -1) sh.getRange(row, dayCol).setValue(dayNameForDateStr_(p.date));
  }
  if (p.notes !== undefined) {
    const notesCol = colIndex_(sh, 'ملاحظات');
    if (notesCol !== -1) sh.getRange(row, notesCol).setValue(p.notes);
  }
  invalidateCache_('المبيعات');
  return { ok: true };
}

function deleteSale_(p) {
  const sh = sheet_('المبيعات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('المبيعات');
  return { ok: true };
}

/* ------------------- البضائع المرتجعة ------------------- */

function recordReturn_(p) {
  const sh = sheet_('المرتجعات');
  const id = Utilities.getUuid();
  const date = p.date || nowParts_().date;
  const day = dayNameForDateStr_(date);
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center, 'اليوم': day, 'التاريخ': date,
    'وصف الصنف': p.description || '', 'الكمية': Number(p.quantity) || 0, 'القيمة': Number(p.value) || 0,
    'ملاحظات': p.notes || ''
  });
  invalidateCache_('المرتجعات');
  return { ok: true, id: id };
}

function getReturns_(p) {
  let rows = getRowsForTerm_('المرتجعات', p.term, 'الفصل الدراسي');
  if (p.center) rows = rows.filter(function (r) { return String(r['اسم المركز']).trim() === String(p.center).trim(); });
  const total = rows.reduce(function (sum, r) { return sum + (Number(r['القيمة']) || 0); }, 0);
  return { ok: true, returns: rows, total: total };
}

function updateReturn_(p) {
  const sh = sheet_('المرتجعات');
  const row = Number(p.row);
  if (p.description !== undefined) sh.getRange(row, colIndex_(sh, 'وصف الصنف')).setValue(p.description);
  if (p.quantity !== undefined) sh.getRange(row, colIndex_(sh, 'الكمية')).setValue(Number(p.quantity));
  if (p.value !== undefined) sh.getRange(row, colIndex_(sh, 'القيمة')).setValue(Number(p.value));
  if (p.notes !== undefined) {
    const notesCol = colIndex_(sh, 'ملاحظات');
    if (notesCol !== -1) sh.getRange(row, notesCol).setValue(p.notes);
  }
  invalidateCache_('المرتجعات');
  return { ok: true };
}

function deleteReturn_(p) {
  const sh = sheet_('المرتجعات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('المرتجعات');
  return { ok: true };
}

/* ------------------- بطاقات التحفيز -------------------
   سجل "تسليم": المركز/المسؤولة يسلّمون بطاقة لشخص (معلمة أو غيرها) يوقّع هو بنفسه على الإقرار.
   سجل "استلام": المركز/المسؤولة نفسها تستلم من الإدارة وتوقّع بنفسها (الدور يوضّح مين وقّعت:
   مديرة المركز أو مسؤولة المقصف). كل سطر بطاقة موقّعة (رسم أو صورة)، بدون أرشفة تلقائية.
   متابعة الاستبدال: الكمية المسجّلة بسطر "تسليم" واحد ممكن تتوزّع على أكثر من مستفيدة (مثلاً
   ٧ بطاقات وُزّعت على ٣ طالبات بأعداد مختلفة) - لذا نخزّنها بشيت منفصل "متابعة بطاقات التحفيز"
   كأسطر متعددة لكل سطر تسليم أصلي، ونتحقق دايماً إن مجموع الأعداد الموزّعة ما يتجاوز الكمية
   الأصلية (addIncentiveFollowupSplit_). */
const INCENTIVE_CATEGORIES_ = ['مكافأة', 'هدية'];
const INCENTIVE_PRICES_ = [3, 2];
const INCENTIVE_KINDS_ = ['تسليم', 'استلام'];

function recordIncentiveEntry_(p) {
  const sh = sheet_('بطاقات التحفيز');
  const id = Utilities.getUuid();
  const now = nowParts_();
  const category = p.category;
  const price = Number(p.price) || 0;
  const qty = Number(p.qty) || 0;
  if (!p.center) return { ok: false, error: 'اسم المركز مطلوب' };
  if (INCENTIVE_KINDS_.indexOf(p.kind) === -1) return { ok: false, error: 'نوع السجل غير صحيح' };
  if (INCENTIVE_CATEGORIES_.indexOf(category) === -1) return { ok: false, error: 'نوع البطاقة غير صحيح' };
  if (INCENTIVE_PRICES_.indexOf(price) === -1) return { ok: false, error: 'قيمة البطاقة غير صحيحة' };
  if (!qty || qty < 1) return { ok: false, error: 'الكمية مطلوبة' };
  if (!p.recipientName) return { ok: false, error: 'اسم المستلمة مطلوب' };
  // التسجيل من لوحة الإدارة (نيابةً عن المديرة/المسؤولة اللي ما سجّلت) ما يشترط توقيع - وأي سجل غير موقّع
  // يتعلّم صراحةً بعمود "سجّل بواسطة" = الإدارة عشان ما يختلط بالسجلات الموقّعة من أصحابها
  const byAdmin = p.byAdmin === true || p.byAdmin === 'true';
  if (!p.signature && !byAdmin) return { ok: false, error: 'لازم التوقيع' };
  // البطاقة اللي اتحسمت (سواء بالاستبدال أو بالإرجاع) ترجع متاحة من جديد لمنسوبة ثانية -
  // فالمتاح للتسليم = المستلَم - (المسلَّم كله - المحسوم منه عن طريق المتابعة)
  // تسجيل الإدارة نيابةً عن المديرة/المسؤولة يتجاوز فحص الكمية المتاحة (لأن الاستلام ممكن ما يكون مسجّل أصلاً)
  if (p.kind === 'تسليم' && !byAdmin) {
    const allRows = sheetToObjects_('بطاقات التحفيز');
    const centerRows = allRows.filter(function (r) {
      return String(r['اسم المركز']).trim() === String(p.center).trim() && r['نوع البطاقة'] === category && Number(r['القيمة']) === price;
    });
    const received = centerRows.filter(function (r) { return r['نوع السجل'] === 'استلام'; }).reduce(function (s, r) { return s + (Number(r['الكمية']) || 0); }, 0);
    const deliveredRows = centerRows.filter(function (r) { return r['نوع السجل'] === 'تسليم'; });
    const deliveredTotal = deliveredRows.reduce(function (s, r) { return s + (Number(r['الكمية']) || 0); }, 0);
    const deliveredIds = deliveredRows.map(function (r) { return r['معرف']; });
    const resolved = sheetToObjects_('متابعة بطاقات التحفيز')
      .filter(function (s) { return deliveredIds.indexOf(s['معرف السطر الأصلي']) !== -1; })
      .reduce(function (s, r) { return s + (Number(r['العدد']) || 0); }, 0);
    const outstanding = deliveredTotal - resolved;
    const available = received - outstanding;
    if (qty > available) {
      return { ok: false, error: 'لا يمكن تسليم كمية أكبر من الكمية المتاحة من فئة ' + category + ' بقيمة (' + cardPriceLabelForServer_(price) + '). الكمية المتاحة حالياً للتسليم: ' + Math.max(0, available) + '.' };
    }
  }
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center, 'الدور': p.role || '', 'نوع السجل': p.kind,
    'نوع البطاقة': category, 'القيمة': price, 'الكمية': qty, 'اسم المستلمة': p.recipientName,
    'التوقيع': p.signature || '', 'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time,
    'ملاحظات': p.notes || '', 'سجّل بواسطة': byAdmin ? 'الإدارة' : ''
  });
  invalidateCache_('بطاقات التحفيز');
  return { ok: true, id: id };
}

function cardPriceLabelForServer_(p) { return Number(p) === 3 ? '3 ريال' : 'ريالين'; }

function getIncentiveEntries_(p) {
  let rows = sheetToObjects_('بطاقات التحفيز');
  if (p && p.center) rows = rows.filter(function (r) { return String(r['اسم المركز']).trim() === String(p.center).trim(); });
  if (p && p.kind) rows = rows.filter(function (r) { return r['نوع السجل'] === p.kind; });
  if (p && p.id) rows = rows.filter(function (r) { return r['معرف'] === p.id; });
  rows.sort(function (a, b) { return String(b['التاريخ'] || '').localeCompare(String(a['التاريخ'] || '')); });
  // وضع خفيف: نشيل صور التواقيع الكبيرة من القائمة (تنجلب عند الطلب بـ id) عشان الرد يصغر ويسرع
  if (p && (p.light === true || p.light === 'true') && !p.id) {
    rows = rows.map(function (r) {
      const c = {};
      Object.keys(r).forEach(function (k) { c[k] = r[k]; });
      if (c['التوقيع']) c['التوقيع'] = 'HAS';
      return c;
    });
  }
  return { ok: true, list: rows };
}

/* تضيف جزء من الكمية الأصلية (سطر تسليم واحد) باسم مستفيدة معيّنة وحالتها - مع التحقق إن
   المجموع (اللي سبق توزيعه + الجديد) ما يتجاوز الكمية الأصلية بالسطر */
function addIncentiveFollowupSplit_(p) {
  const parent = sheetToObjects_('بطاقات التحفيز').find(function (r) { return r['معرف'] === p.parentId; });
  if (!parent) return { ok: false, error: 'السطر الأصلي غير موجود' };
  const qty = Number(p.qty) || 0;
  if (!qty || qty < 1) return { ok: false, error: 'العدد مطلوب' };
  if (!p.status) return { ok: false, error: 'الحالة مطلوبة' };
  const existing = sheetToObjects_('متابعة بطاقات التحفيز').filter(function (r) { return r['معرف السطر الأصلي'] === p.parentId; });
  const allocated = existing.reduce(function (s, r) { return s + (Number(r['العدد']) || 0); }, 0);
  const total = Number(parent['الكمية']) || 0;
  if (allocated + qty > total) {
    return { ok: false, error: 'المجموع الموزّع (' + (allocated + qty) + ') أكبر من الكمية الأصلية (' + total + ') - المتبقي غير الموزّع: ' + (total - allocated) };
  }
  const sh = sheet_('متابعة بطاقات التحفيز');
  const id = Utilities.getUuid();
  const now = nowParts_();
  appendRowByHeaders_(sh, {
    'معرف': id, 'معرف السطر الأصلي': p.parentId, 'اسم المركز': parent['اسم المركز'],
    'اسم المستفيدة': p.beneficiaryName, 'العدد': qty, 'الحالة': p.status || 'تم استبدال القيمة',
    'اليوم': now.day, 'التاريخ': now.date
  });
  invalidateCache_('متابعة بطاقات التحفيز');
  return { ok: true, id: id };
}

/* إقرار المديرة/المسؤولة على سجلات سجّلتها الإدارة نيابةً عنها: تُكتب لها صورة التوقيع على السجلات
   المعلّقة فقط (سجّل بواسطة = الإدارة وبدون توقيع) وبنفس المركز، وما يتغيّر أي شيء ثاني بالسجل */
function acknowledgeIncentiveEntries_(p) {
  const ids = Array.isArray(p.ids) ? p.ids : (p.ids ? [p.ids] : []);
  if (!ids.length) return { ok: false, error: 'لا توجد سجلات للإقرار' };
  if (!p.center) return { ok: false, error: 'اسم المركز مطلوب' };
  if (!p.signature) return { ok: false, error: 'لازم التوقيع' };
  const sh = sheet_('بطاقات التحفيز');
  const sigCol = colIndex_(sh, 'التوقيع');
  if (sigCol === -1) return { ok: false, error: 'عمود التوقيع غير موجود' };
  const rows = sheetToObjects_('بطاقات التحفيز');
  let done = 0;
  ids.forEach(function (id) {
    const r = rows.find(function (x) { return x['معرف'] === id; });
    if (!r) return;
    if (String(r['اسم المركز']).trim() !== String(p.center).trim()) return;
    if (r['سجّل بواسطة'] !== 'الإدارة' || r['التوقيع']) return;
    sh.getRange(r._row, sigCol).setValue(p.signature);
    done++;
  });
  invalidateCache_('بطاقات التحفيز');
  if (!done) return { ok: false, error: 'لا توجد سجلات معلّقة للإقرار (ربما تم الإقرار عليها من قبل)' };
  return { ok: true, count: done };
}

function getIncentiveFollowupSplits_(p) {
  let rows = sheetToObjects_('متابعة بطاقات التحفيز');
  if (p && p.parentId) rows = rows.filter(function (r) { return r['معرف السطر الأصلي'] === p.parentId; });
  if (p && p.center) rows = rows.filter(function (r) { return String(r['اسم المركز']).trim() === String(p.center).trim(); });
  return { ok: true, list: rows };
}

function deleteIncentiveFollowupSplit_(p) {
  const rows = sheetToObjects_('متابعة بطاقات التحفيز');
  const target = rows.find(function (r) { return r['معرف'] === p.id; });
  if (!target) return { ok: false, error: 'السطر غير موجود' };
  const sh = sheet_('متابعة بطاقات التحفيز');
  sh.deleteRow(target._row);
  invalidateCache_('متابعة بطاقات التحفيز');
  return { ok: true };
}

/* ------------------- بيان الفواتير ------------------- */

/* نوع القيد: فاتورة (الافتراضي - والصفوف القديمة بدون قيمة تُعتبر فاتورة) / مشتريات / مصروفات */
const ENTRY_TYPE_COL_ = 'نوع القيد';

function cleanEntryType_(v) {
  v = String(v === undefined || v === null ? '' : v).trim();
  return (v === 'مشتريات' || v === 'مصروفات') ? v : 'فاتورة';
}

function entryTypeOf_(r) {
  return cleanEntryType_(r && r[ENTRY_TYPE_COL_]);
}

/* لو الشيت قديم وما فيه عمود «نوع القيد» (ما شغّلتي setup بعد التحديث) نضيفه تلقائياً */
function ensureInvoiceTypeCol_(sh) {
  if (colIndex_(sh, ENTRY_TYPE_COL_) !== -1) return;
  sh.getRange(1, sh.getLastColumn() + 1).setValue(ENTRY_TYPE_COL_).setFontWeight('bold');
  delete _headerRowCache_[sh.getSheetId()];
}

/* رجيع داخل الفاتورة: نوع الرجيع + مقدار الخصم من رأس المال ومن الربح (يُخصم من الاثنين) */
const RET_TYPE_COL_ = 'نوع الرجيع', RET_CAP_COL_ = 'رجيع رأس المال', RET_PROFIT_COL_ = 'رجيع الربح';
const RET_QTY_COL_ = 'كمية الرجيع', RET_TEXT_COL_ = 'المرتجعات';
const RET_JSON_COL_ = 'تفاصيل الرجيع';   // قائمة الأصناف المرتجعة (JSON) - يمكن أكثر من رجيع بالفاتورة   // المرتجعات = نص التوثيق الجاهز (وصف الصنف + الكمية + القيمة)
const RET_PROOF_COL_ = 'رجيع للإثبات';   // قيمة رأس مال رجيع مسجّل للإثبات فقط (ما انكتب بالفاتورة، فما ينخصم)

function ensureInvoiceReturnCols_(sh) {
  [RET_TYPE_COL_, RET_CAP_COL_, RET_PROFIT_COL_, RET_PROOF_COL_, RET_QTY_COL_, RET_TEXT_COL_, RET_JSON_COL_].forEach(function (name) {
    if (colIndex_(sh, name) !== -1) return;
    sh.getRange(1, sh.getLastColumn() + 1).setValue(name).setFontWeight('bold');
    delete _headerRowCache_[sh.getSheetId()];
  });
}

function invoiceReturnOf_(r) {
  return { cap: Number(r && r[RET_CAP_COL_]) || 0, profit: Number(r && r[RET_PROFIT_COL_]) || 0 };
}

/* المطلوب تسليمه = رأس المال + أرباح الفواتير + أرباح المشتريات − المصروفات − المرتجعات (الرجيع المخصوم) */
function invoiceTotals_(rows) {
  const s = { invoiceCapital: 0, invoiceProfit: 0, purchasesProfit: 0, purchasesCost: 0, expenses: 0, returns: 0, deliverable: 0 };
  rows.forEach(function (r) {
    const type = entryTypeOf_(r);
    const amount = Number(r['المبلغ الإجمالي']) || 0;
    const profit = Number(r['الربح']) || 0;
    if (type === 'فاتورة') { const rt = invoiceReturnOf_(r); s.invoiceCapital += amount; s.invoiceProfit += profit; s.returns += rt.cap + rt.profit; }
    else if (type === 'مشتريات') { s.purchasesCost += amount; s.purchasesProfit += profit; }
    else { s.expenses += amount; }
  });
  s.deliverable = s.invoiceCapital + s.invoiceProfit + s.purchasesProfit - s.expenses - s.returns;
  Object.keys(s).forEach(function (k) { s[k] = Math.round(s[k] * 100) / 100; });
  return s;
}


/* مراكز مسموح لها بنوعي القيد «مشتريات» و«مصروفات» - تحددها الإدارة، والباقي «فاتورة» فقط */
function getEntryCentersList_(key) {
  const raw = getSettingValue_(key);
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.map(function (x) { return String(x).trim(); }) : []; }
  catch (e) { return []; }
}

function getPurchaseCentersList_() { return getEntryCentersList_('مراكز المشتريات'); }
function getExpenseCentersList_() { return getEntryCentersList_('مراكز المصروفات'); }

function centerCanPurchase_(center) {
  const c = String(center || '').trim();
  return !!c && getPurchaseCentersList_().indexOf(c) !== -1;
}

function centerCanExpense_(center) {
  const c = String(center || '').trim();
  return !!c && getExpenseCentersList_().indexOf(c) !== -1;
}

/* هل المركز مسموح له بهذا النوع؟ (فاتورة دائماً مسموحة) */
function centerCanEntryType_(center, type) {
  if (type === 'مشتريات') return centerCanPurchase_(center);
  if (type === 'مصروفات') return centerCanExpense_(center);
  return true;
}

function getPurchaseCenters_() {
  return { ok: true, centers: getPurchaseCentersList_() };
}

function setPurchaseCenters_(p) {
  if (p.actor !== 'admin') return { ok: false, error: 'لا تملكين صلاحية تعديل مراكز المشتريات' };
  const list = (p.centers || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
  setSettingValue_('مراكز المشتريات', JSON.stringify(list));
  return { ok: true };
}

function getExpenseCenters_() {
  return { ok: true, centers: getExpenseCentersList_() };
}

function setExpenseCenters_(p) {
  if (p.actor !== 'admin') return { ok: false, error: 'لا تملكين صلاحية تعديل مراكز المصروفات' };
  const list = (p.centers || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
  setSettingValue_('مراكز المصروفات', JSON.stringify(list));
  return { ok: true };
}

/* يتحقق من الرجيع: للفواتير فقط، ولا يزيد عن رأس المال/الربح */
function returnItemText_(it) {
  const val = it.proof > 0 ? it.proof : it.cap + it.profit;
  return it.desc + (it.qty ? ' — الكمية: ' + it.qty : '') + ' — القيمة: ' + val.toFixed(2) + ' ريال' +
    (it.proof > 0 ? ' (إثبات فقط، غير مخصومة)' : ' (مخصومة: رأس المال ' + it.cap.toFixed(2) + ' / الربح ' + it.profit.toFixed(2) + ')');
}

/* يتحقق من الرجيع (يمكن أكثر من صنف): للفواتير فقط، ومجموع الخصم لا يزيد عن رأس المال/الربح */
function cleanInvoiceReturn_(p, type, amount, profit) {
  const none = { type: '', cap: 0, profit: 0, proof: 0, qty: '', text: '', json: '', count: 0 };
  if (type !== 'فاتورة') return none;
  let raw = Array.isArray(p.returns) ? p.returns : null;
  if (!raw) {   // توافق مع الصيغة القديمة (رجيع واحد)
    raw = [{ desc: p.returnType, qty: p.returnQty, cap: p.returnCapital, profit: p.returnProfit, proof: p.returnProof }];
  }
  const round2 = function (x) { return Math.round((Number(x) || 0) * 100) / 100; };
  const items = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i] || {};
    const it = {
      desc: String(r.desc || '').trim(), qty: String(r.qty === undefined || r.qty === null ? '' : r.qty).trim(),
      cap: round2(r.cap), profit: round2(r.profit), proof: round2(r.proof)
    };
    if (it.cap < 0 || it.profit < 0 || it.proof < 0) return { error: 'لا يجوز أن يكون مبلغ الرجيع سالبًا' };
    if (!it.desc && it.cap <= 0 && it.profit <= 0 && it.proof <= 0) continue;   // صف فارغ
    if (!it.desc) return { error: 'اكتبي وصف الصنف المرتجع' };
    if (it.cap <= 0 && it.profit <= 0 && it.proof <= 0) return { error: 'اكتبي قيمة الرجيع للصنف: ' + it.desc };
    if (it.proof > 0) { it.cap = 0; it.profit = 0; }
    items.push(it);
  }
  if (!items.length) return none;
  let cap = 0, prf = 0, proof = 0;
  items.forEach(function (it) { cap += it.cap; prf += it.profit; proof += it.proof; });
  cap = round2(cap); prf = round2(prf); proof = round2(proof);
  if (cap > amount + 0.005) return { error: 'مجموع خصم الرجيع من رأس المال أكبر من رأس المال' };
  if (prf > profit + 0.005) return { error: 'مجموع خصم الرجيع من الربح أكبر من الربح' };
  const qtys = items.map(function (it) { return it.qty; }).filter(Boolean);
  return {
    type: items.map(function (it) { return it.desc; }).join(' ، '),
    cap: cap, profit: prf, proof: proof,
    qty: qtys.join(' ، '),
    text: items.map(returnItemText_).join(' ؛ '),
    json: JSON.stringify(items), count: items.length
  };
}

function recordInvoice_(p) {
  const sh = sheet_('الفواتير');
  ensureInvoiceTypeCol_(sh);
  const id = Utilities.getUuid();
  const date = p.date || nowParts_().date;
  const day = dayNameForDateStr_(date);
  let type = cleanEntryType_(p.entryType);
  if (!centerCanEntryType_(p.center, type)) return { ok: false, error: 'نوع «' + type + '» غير مفعّل لهذا المركز' };
  ensureInvoiceReturnCols_(sh);
  const amt = Number(p.totalAmount) || 0, prf = type === 'مصروفات' ? 0 : (Number(p.profit) || 0);
  const ret = cleanInvoiceReturn_(p, type, amt, prf);
  if (ret.error) return { ok: false, error: ret.error };
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center, 'رقم الفاتورة': p.invoiceNumber || '', 'مصدر الفاتورة': p.invoiceSource || '', 'اليوم': day, 'التاريخ': date,
    'المبلغ الإجمالي': amt, 'الربح': prf, 'ملاحظات': p.notes || '',
    'نوع القيد': type,
    'نوع الرجيع': ret.type, 'رجيع رأس المال': ret.cap, 'رجيع الربح': ret.profit, 'رجيع للإثبات': ret.proof, 'كمية الرجيع': ret.qty, 'المرتجعات': ret.text, 'تفاصيل الرجيع': ret.json
  });
  invalidateCache_('الفواتير');
  return { ok: true, id: id, returnSaved: ret.count > 0 };
}

function getInvoices_(p) {
  let rows = getRowsForTerm_('الفواتير', p.term, 'الفصل الدراسي');
  if (p.center) rows = rows.filter(function (r) { return String(r['اسم المركز']).trim() === String(p.center).trim(); });
  const sum = invoiceTotals_(rows);
  // totalAmount/totalProfit محفوظين للتوافق مع الواجهات القديمة (مجموعهم = المطلوب تسليمه)
  return { ok: true, invoices: rows, summary: sum, purchasesEnabled: p.center ? centerCanPurchase_(p.center) : undefined, expensesEnabled: p.center ? centerCanExpense_(p.center) : undefined,
           totalAmount: sum.invoiceCapital - sum.expenses - sum.returns, totalProfit: sum.invoiceProfit + sum.purchasesProfit };
}

function updateInvoice_(p) {
  const sh = sheet_('الفواتير');
  const row = Number(p.row);
  let returnSaved = false;
  if (p.invoiceNumber !== undefined) sh.getRange(row, colIndex_(sh, 'رقم الفاتورة')).setValue(p.invoiceNumber);
  if (p.invoiceSource !== undefined) {
    const sourceCol = colIndex_(sh, 'مصدر الفاتورة');
    if (sourceCol !== -1) sh.getRange(row, sourceCol).setValue(p.invoiceSource);
  }
  if (p.date !== undefined && p.date) {
    sh.getRange(row, colIndex_(sh, 'التاريخ')).setValue(p.date);
    const dayCol = colIndex_(sh, 'اليوم');
    if (dayCol !== -1) sh.getRange(row, dayCol).setValue(dayNameForDateStr_(p.date));
  }
  if (p.totalAmount !== undefined) sh.getRange(row, colIndex_(sh, 'المبلغ الإجمالي')).setValue(Number(p.totalAmount));
  if (p.profit !== undefined) sh.getRange(row, colIndex_(sh, 'الربح')).setValue(Number(p.profit));
  if (p.returnType !== undefined || p.returnCapital !== undefined || p.returnProfit !== undefined || p.returnProof !== undefined || p.returnQty !== undefined || p.returns !== undefined) {
    ensureInvoiceReturnCols_(sh);
    const typeNow = p.entryType !== undefined ? cleanEntryType_(p.entryType) : cleanEntryType_(sh.getRange(row, colIndex_(sh, ENTRY_TYPE_COL_)).getValue());
    const amtNow = p.totalAmount !== undefined ? Number(p.totalAmount) : Number(sh.getRange(row, colIndex_(sh, 'المبلغ الإجمالي')).getValue()) || 0;
    const prfNow = typeNow === 'مصروفات' ? 0 : (p.profit !== undefined ? Number(p.profit) : Number(sh.getRange(row, colIndex_(sh, 'الربح')).getValue()) || 0);
    const ret = cleanInvoiceReturn_(p, typeNow, amtNow, prfNow);
    if (ret.error) return { ok: false, error: ret.error };
    sh.getRange(row, colIndex_(sh, RET_TYPE_COL_)).setValue(ret.type);
    sh.getRange(row, colIndex_(sh, RET_CAP_COL_)).setValue(ret.cap);
    sh.getRange(row, colIndex_(sh, RET_PROFIT_COL_)).setValue(ret.profit);
    sh.getRange(row, colIndex_(sh, RET_PROOF_COL_)).setValue(ret.proof);
    sh.getRange(row, colIndex_(sh, RET_QTY_COL_)).setValue(ret.qty);
    sh.getRange(row, colIndex_(sh, RET_TEXT_COL_)).setValue(ret.text);
    sh.getRange(row, colIndex_(sh, RET_JSON_COL_)).setValue(ret.json);
    returnSaved = ret.count > 0;
  }
  if (p.notes !== undefined) {
    const notesCol = colIndex_(sh, 'ملاحظات');
    if (notesCol !== -1) sh.getRange(row, notesCol).setValue(p.notes);
  }
  if (p.entryType !== undefined) {
    ensureInvoiceTypeCol_(sh);
    const t = cleanEntryType_(p.entryType);
    if (t !== 'فاتورة') {
      const curType = cleanEntryType_(sh.getRange(row, colIndex_(sh, ENTRY_TYPE_COL_)).getValue());
      const rowCenter = sh.getRange(row, colIndex_(sh, 'اسم المركز')).getValue();
      if (curType !== t && !centerCanEntryType_(rowCenter, t)) return { ok: false, error: 'نوع «' + t + '» غير مفعّل لهذا المركز' };
    }
    sh.getRange(row, colIndex_(sh, ENTRY_TYPE_COL_)).setValue(t);
    if (t === 'مصروفات') sh.getRange(row, colIndex_(sh, 'الربح')).setValue(0);
  }
  invalidateCache_('الفواتير');
  return { ok: true, returnSaved: returnSaved };
}

function deleteInvoice_(p) {
  const sh = sheet_('الفواتير');
  sh.deleteRow(Number(p.row));
  invalidateCache_('الفواتير');
  return { ok: true };
}

/* ------------------- حضور الاجتماعات (تسجّله الإدارة) ------------------- */

// تسجيل حضور اسم واحد (أبقيناها للتوافق مع الاستخدامات القديمة)
function recordAttendance_(p) {
  const sh = sheet_('الحضور');
  const now = nowParts_();
  const date = p.date || now.date;
  const time = p.time || now.time;
  const day = dayNameForDateStr_(date);
  appendRowByHeaders_(sh, { 'الاسم': p.name, 'اليوم': day, 'التاريخ': date, 'الوقت': time });
  invalidateCache_('الحضور');
  return { ok: true };
}

// تسجيل حضور عدة مسؤولات دفعة وحدة ليوم معيّن (تُستخدم من لوحة الإدارة)
function recordAttendanceBulk_(p) {
  const sh = sheet_('الحضور');
  const now = nowParts_();
  const date = p.date || now.date;
  const time = now.time;
  const day = dayNameForDateStr_(date);
  let names = p.names;
  if (typeof names === 'string') {
    try { names = JSON.parse(names); } catch (e) { names = [names]; }
  }
  names = names || [];

  // تفادي تكرار تسجيل نفس الاسم بنفس التاريخ
  const existingNames = sheetToObjects_('الحضور').filter(function (r) {
    return r['التاريخ'] === date;
  }).map(function (r) { return r['الاسم']; });

  let added = 0;
  names.forEach(function (name) {
    if (existingNames.indexOf(name) === -1) {
      appendRowByHeaders_(sh, { 'الاسم': name, 'اليوم': day, 'التاريخ': date, 'الوقت': time });
      added++;
    }
  });
  invalidateCache_('الحضور');
  return { ok: true, added: added };
}

function getAttendanceForDate_(p) {
  const date = p.date;
  const rows = sheetToObjects_('الحضور').filter(function (r) { return r['التاريخ'] === date; });
  return { ok: true, names: rows.map(function (r) { return r['الاسم']; }) };
}

function getAttendance_(p) {
  const rows = sheetToObjects_('الحضور').filter(function (r) {
    return String(r['الاسم']).trim() === String(p.name).trim();
  });
  return { ok: true, records: rows };
}

/* ------------------- التعهد السنوي ------------------- */

function signPledge_(p) {
  const sh = sheet_('التعهد');
  const now = nowParts_();
  appendRowByHeaders_(sh, {
    'الاسم': p.name, 'نص التعهد': p.pledgeText, 'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time, 'الحالة': 'تم التعهد'
  });
  invalidateCache_('التعهد');
  return { ok: true };
}

function getPledge_(p) {
  const rows = sheetToObjects_('التعهد').filter(function (r) {
    return String(r['الاسم']).trim() === String(p.name).trim();
  });
  const latest = rows.length ? rows[rows.length - 1] : null;
  return { ok: true, pledge: latest };
}

/* تُستخدم بلوحة الإدارة: ترجع لكل مسؤولة مسجّلة بشيت "المسؤولات" حالة تعهدها
   (وقّعت أو لا، وتاريخ آخر توقيع لو وقّعت) - عشان الإدارة تشوف مين وقّعت ومين لسا. */
function getPledgeStatusAll_() {
  const masoulat = sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG);
  const pledgeRows = sheetToObjects_('التعهد');
  const latestByName = {};
  pledgeRows.forEach(function (r) {
    latestByName[String(r['الاسم']).trim()] = r;
  });
  const list = masoulat.map(function (m) {
    const name = String(m['الاسم'] || '').trim();
    const p = latestByName[name];
    return {
      name: name,
      center: m['اسم المركز'] || '',
      signed: !!p,
      day: p ? (p['اليوم'] || '') : '',
      date: p ? (p['التاريخ'] || '') : '',
      time: p ? (p['الوقت'] || '') : ''
    };
  }).filter(function (r) { return r.name; });
  return { ok: true, list: list };
}

/* ------------------- مهام مسؤولة المقصف ------------------- */

/* الاطلاع على المهام يُحفظ ويُتحقق منه بالبريد الإلكتروني (وليس الاسم فقط)،
   عشان لو صار فيه مسؤولتين بنفس الاسم بالضبط، ما يصير خلط بينهن ("فلانة اطلعت"
   وهي أصلاً ما دخلت). الصفوف القديمة اللي ما فيها بريد إلكتروني (قبل هذا التعديل)
   لسا تنطابق بالاسم كحل احتياطي. */
function acknowledgeTasks_(p) {
  const sh = sheet_('المهام');
  const now = nowParts_();
  appendRowByHeaders_(sh, {
    'الاسم': p.name, 'البريد الإلكتروني': p.email || '', 'نص المهام': p.tasksText, 'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time, 'الحالة': 'تم الاطلاع'
  });
  invalidateCache_('المهام');
  return { ok: true };
}

function getTasksAck_(p) {
  const email = String(p.email || '').trim().toLowerCase();
  const name = String(p.name || '').trim();
  const rows = sheetToObjects_('المهام').filter(function (r) {
    const rEmail = String(r['البريد الإلكتروني'] || '').trim().toLowerCase();
    if (email && rEmail) return rEmail === email;
    return String(r['الاسم']).trim() === name;
  });
  const latest = rows.length ? rows[rows.length - 1] : null;
  return { ok: true, ack: latest };
}

/* تُستخدم بلوحة الإدارة: ترجع لكل مسؤولة مسجّلة بشيت "المسؤولات" حالة اطلاعها
   على المهام (اطلعت أو لا، وتاريخ آخر اطلاع لو اطلعت) - المطابقة بالبريد الإلكتروني
   أولاً (أدق)، وبالاسم كحل احتياطي للصفوف القديمة اللي ما فيها بريد. */
function getTasksStatusAll_() {
  const masoulat = sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG);
  const taskRows = sheetToObjects_('المهام');
  const latestByEmail = {};
  const latestByName = {};
  taskRows.forEach(function (r) {
    const email = String(r['البريد الإلكتروني'] || '').trim().toLowerCase();
    const name = String(r['الاسم'] || '').trim();
    if (email) latestByEmail[email] = r;
    if (name) latestByName[name] = r;
  });
  const list = masoulat.map(function (m) {
    const name = String(m['الاسم'] || '').trim();
    const email = String(m['البريد الإلكتروني'] || '').trim().toLowerCase();
    const r = (email && latestByEmail[email]) || latestByName[name];
    return {
      name: name,
      center: m['اسم المركز'] || '',
      acknowledged: !!r,
      day: r ? (r['اليوم'] || '') : '',
      date: r ? (r['التاريخ'] || '') : '',
      time: r ? (r['الوقت'] || '') : ''
    };
  }).filter(function (r) { return r.name; });
  return { ok: true, list: list };
}

/* تجمع كل بيانات لوحة مسؤولة المقصف (الحضور + التعهد + اطلاع المهام + عدد الإشعارات المعلّقة)
   بطلب واحد بدل 4 طلبات منفصلة كانت تُرسل عند فتح اللوحة - كل طلب لـ Apps Script فيه تأخير
   بدء تشغيل، فتجميعها بطلب واحد يسرّع فتح لوحة المسؤولة بشكل ملحوظ. */
function getMasoulaDashboard_(p) {
  const name = String(p.name || '').trim();
  const email = String(p.email || '').trim().toLowerCase();

  const attendance = sheetToObjects_('الحضور').filter(function (r) {
    return String(r['الاسم']).trim() === name;
  });
  const pledgeRows = sheetToObjects_('التعهد').filter(function (r) {
    return String(r['الاسم']).trim() === name;
  });
  const tasksRows = sheetToObjects_('المهام').filter(function (r) {
    const rEmail = String(r['البريد الإلكتروني'] || '').trim().toLowerCase();
    if (email && rEmail) return rEmail === email;
    return String(r['الاسم']).trim() === name;
  });
  let pendingCount = 0;
  if (p.center) {
    const notices = sheetToObjects_('الإشعارات').filter(function (r) {
      return String(r['اسم المركز']).trim() === String(p.center).trim() && r['الحالة'] !== 'تم الاطلاع' && r['الحالة'] !== NOTICE_AWAIT_CENTER_;
    });
    pendingCount = notices.length;
  }
  return {
    ok: true,
    attendance: attendance,
    pledge: pledgeRows.length ? pledgeRows[pledgeRows.length - 1] : null,
    tasksAck: tasksRows.length ? tasksRows[tasksRows.length - 1] : null,
    pendingCount: pendingCount,
    toSign: p.center ? centerToSign_(p.center) : []
  };
}

/* ------------------- إشعارات الاستلام والتسليم ------------------- */

function submitNotice_(p) {
  const sh = sheet_('الإشعارات');
  const id = Utilities.getUuid();
  const now = nowParts_();

  // نحفظ صورة الإشعار الكاملة بس (فيها التوقيع أصلاً) - توفير وقت بعدم رفع صورتين لكل إشعار
  const noticeImageUrl = saveImage_(p.noticeImage,
    noticeFileName_('إشعار', p.type, p.center, now.date, id),
    ['الإشعارات', p.center]);

  appendRowByHeaders_(sh, {
    'معرف': id, 'النوع': p.type, 'اسم المركز': p.center,
    'يوم الإرسال': now.day, 'تاريخ الإرسال': now.date, 'وقت الإرسال': now.time,
    'اسم المسلّمة': p.senderName || '', 'المبلغ': p.amount,
    'الشهر': p.month || '', 'الفصل الدراسي': p.term || '', 'العام': p.year || '',
    'بيان مخصص': p.reason || '',
    'رابط صورة الإشعار': noticeImageUrl, 'الحالة': 'بانتظار الاطلاع',
    'بيانات توقيع المركز': p.signature || ''
  });
  invalidateCache_('الإشعارات');

  notifyAdminNewNotice_(p.type, p.center, p.amount, now, noticeImageUrl, p.senderName);

  return { ok: true, id: id };
}

function notifyAdminNewNotice_(type, center, amount, now, noticeImageUrl, senderName) {
  center = centerDisplay_(center);
  if (!ADMIN_NOTIFY_EMAIL || ADMIN_NOTIFY_EMAIL.indexOf('@example.com') !== -1) return;
  try {
    MailApp.sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: 'إشعار ' + type + ' جديد من ' + center + ' - وحدة المقاصف',
      body: 'السلام عليكم،\n\n' +
        'وصل إشعار ' + type + ' جديد من مركز "' + center + '".\n' +
        (senderName ? ('اسم المسلّمة: ' + senderName + '\n') : '') +
        'المبلغ: ' + amount + ' ريال\n' +
        'اليوم: ' + now.day + '\n' +
        'التاريخ: ' + now.date + '\n' +
        'الوقت: ' + now.time + '\n\n' +
        'الرجاء الدخول للوحة إدارة وحدة المقاصف للاطلاع عليه وتوقيعه.\n' +
        (noticeImageUrl ? ('رابط صورة الإشعار: ' + noticeImageUrl + '\n') : '') +
        '\n— نظام وحدة المقاصف، جمعية فرقان لتحفيظ القرآن الكريم'
    });
  } catch (e) {
    // تجاهل خطأ الإرسال حتى لا يفشل حفظ الإشعار بسببه
  }
}

/* ------------------- إشعارات تنشئها الإدارة نيابةً عن المركز (عند التأخير) -------------------
   نفس فكرة بطاقات التحفيز: الإدارة تُنشئ الإشعار فيظهر للمركز بحالة «بانتظار توقيع المركز»،
   ثم توقّع عليه المديرة/المسؤولة فيتحوّل إلى «بانتظار الاطلاع» ويكمل مساره المعتاد عند الإدارة. */
const NOTICE_AWAIT_CENTER_ = 'بانتظار توقيع المركز';

function ensureNoticeCol_(sh, header) {
  if (colIndex_(sh, header) > 0) return;
  const c = Math.max(sh.getLastColumn(), 1) + 1;
  sh.getRange(1, c).setValue(header);
  delete _headerRowCache_[sh.getSheetId()];
  invalidateCache_(sh.getName());
}

function centerToSign_(center) {
  const c = String(center || '').trim();
  if (!c) return [];
  return sheetToObjects_('الإشعارات').filter(function (r) {
    return r['الحالة'] === NOTICE_AWAIT_CENTER_ && String(r['اسم المركز']).trim() === c;
  }).map(function (r) {
    return { id: r['معرف'], type: r['النوع'], reason: r['بيان مخصص'] || '', amount: r['المبلغ'] };
  });
}

function createAdminNotice_(p) {
  const center = String(p.center || '').trim();
  const type = String(p.type || '').trim();
  const amount = Number(p.amount);
  if (!center) return { ok: false, error: 'اختاري المركز' };
  if (type !== 'استلام' && type !== 'تسليم') return { ok: false, error: 'نوع الإشعار غير صحيح' };
  if (!p.senderName || !String(p.senderName).trim()) return { ok: false, error: 'اسم المسلّمة مطلوب' };
  if (!(amount > 0)) return { ok: false, error: 'المبلغ مطلوب' };
  if (!p.month || !p.term || !p.year) return { ok: false, error: 'الشهر والفصل الدراسي والعام مطلوبة' };
  const sh = sheet_('الإشعارات');
  ensureNoticeCol_(sh, 'سجّل بواسطة');
  const id = Utilities.getUuid();
  const now = nowParts_();
  appendRowByHeaders_(sh, {
    'معرف': id, 'النوع': type, 'اسم المركز': center,
    'يوم الإرسال': now.day, 'تاريخ الإرسال': now.date, 'وقت الإرسال': now.time,
    'اسم المسلّمة': String(p.senderName).trim(), 'المبلغ': amount,
    'الشهر': p.month, 'الفصل الدراسي': p.term, 'العام': p.year,
    'بيان مخصص': p.reason || '',
    'الحالة': NOTICE_AWAIT_CENTER_, 'سجّل بواسطة': 'الإدارة'
  });
  invalidateCache_('الإشعارات');
  return { ok: true, id: id };
}

function centerSignNotice_(p) {
  if (!p.id || !p.center) return { ok: false, error: 'بيانات ناقصة' };
  if (!p.signature) return { ok: false, error: 'لازم التوقيع' };
  if (!p.noticeImage) return { ok: false, error: 'صورة الإشعار مطلوبة' };
  const sh = sheet_('الإشعارات');
  const target = sheetToObjects_('الإشعارات').find(function (r) { return r['معرف'] === p.id; });
  if (!target) return { ok: false, error: 'الإشعار غير موجود' };
  if (String(target['اسم المركز']).trim() !== String(p.center).trim()) return { ok: false, error: 'هذا الإشعار لا يخص مركزك' };
  if (target['الحالة'] !== NOTICE_AWAIT_CENTER_) return { ok: false, error: 'تم التوقيع على هذا الإشعار سابقًا' };
  const now = nowParts_();
  const imageUrl = saveImage_(p.noticeImage, noticeFileName_('إشعار', target['النوع'], target['اسم المركز'], now.date, p.id), ['الإشعارات', target['اسم المركز']]);
  const row = target._row;
  setNoticeCell_(sh, row, 'رابط صورة الإشعار', imageUrl);
  setNoticeCell_(sh, row, 'بيانات توقيع المركز', p.signature);
  setNoticeCell_(sh, row, 'يوم الإرسال', now.day);
  setNoticeCell_(sh, row, 'تاريخ الإرسال', now.date);
  setNoticeCell_(sh, row, 'وقت الإرسال', now.time);
  setNoticeCell_(sh, row, 'الحالة', 'بانتظار الاطلاع');
  invalidateCache_('الإشعارات');
  notifyAdminNewNotice_(target['النوع'], target['اسم المركز'], target['المبلغ'], now, imageUrl, target['اسم المسلّمة']);
  return { ok: true };
}

/* ------------------- الصعوبات والمقترحات ------------------- */

function recordDifficulty_(p) {
  const sh = sheet_('الصعوبات والمقترحات');
  const id = Utilities.getUuid();
  const now = nowParts_();
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': p.center || '', 'من': p.from || '', 'النوع': p.type || 'صعوبة',
    'النص': p.text || '', 'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time
  });
  invalidateCache_('الصعوبات والمقترحات');
  notifyAdminNewDifficulty_(p.type, p.center, p.from, p.text, now);
  return { ok: true, id: id };
}

function notifyAdminNewDifficulty_(type, center, from, text, now) {
  center = centerDisplay_(center);
  from = centerDisplay_(from);
  if (!ADMIN_NOTIFY_EMAIL || ADMIN_NOTIFY_EMAIL.indexOf('@example.com') !== -1) return;
  try {
    MailApp.sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: (type || 'صعوبة') + ' جديدة من ' + (center || '') + ' - وحدة المقاصف',
      body: 'السلام عليكم،\n\n' +
        'وصلت ' + (type || 'صعوبة') + ' جديدة من مركز "' + (center || '') + '".\n' +
        (from ? ('من: ' + from + '\n') : '') +
        '\nالنص:\n' + (text || '') + '\n\n' +
        'اليوم: ' + now.day + '\n' +
        'التاريخ: ' + now.date + '\n' +
        'الوقت: ' + now.time + '\n\n' +
        'الرجاء الدخول للوحة إدارة وحدة المقاصف للاطلاع.\n\n' +
        '— نظام وحدة المقاصف، جمعية فرقان لتحفيظ القرآن الكريم'
    });
  } catch (e) {
    // تجاهل خطأ الإرسال حتى لا يفشل الحفظ بسببه
  }
}

/* p.center: لو انمرّرت، ترجع صعوبات/مقترحات هذا المركز بس (يشوفها المركز نفسه).
   وإلا لو انمرّر p.from، ترجع اللي أرسلتها هذي الجهة بس (مسؤولة غير مربوطة بمركز).
   لو ما انمرّر ولا واحد منهم، ترجع الكل (لصفحة الإدارة). */
function getDifficulties_(p) {
  const rows = sheetToObjects_('الصعوبات والمقترحات');
  let filtered = rows;
  if (p && p.center) {
    filtered = rows.filter(function (r) { return String(r['اسم المركز']).trim() === String(p.center).trim(); });
  } else if (p && p.from) {
    filtered = rows.filter(function (r) { return String(r['من']).trim() === String(p.from).trim(); });
  }
  return { ok: true, items: filtered.reverse() };
}

function deleteDifficulty_(p) {
  const sh = sheet_('الصعوبات والمقترحات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('الصعوبات والمقترحات');
  return { ok: true };
}

function getCenterNotices_(p) {
  let rows = getRowsForTerm_('الإشعارات', p.term, 'فصل الأرشفة');
  rows = rows.filter(function (r) { return String(r['اسم المركز']).trim() === String(p.center).trim(); });
  return { ok: true, notices: rows.reverse() };
}

/* تعديل خفيف على إشعار موجود: المبلغ و/أو اسم المسلّمة فقط
   (ما تُعدَّل الصورة/التوقيع/الحالة عشان تبقى السجلات الموقّعة موثوقة) */
function updateNotice_(p) {
  const sh = sheet_('الإشعارات');
  const row = Number(p.row);
  if (p.amount !== undefined && p.amount !== '') sh.getRange(row, colIndex_(sh, 'المبلغ')).setValue(Number(p.amount));
  if (p.senderName !== undefined) sh.getRange(row, colIndex_(sh, 'اسم المسلّمة')).setValue(p.senderName);
  invalidateCache_('الإشعارات');
  return { ok: true };
}

function deleteNotice_(p) {
  const sh = sheet_('الإشعارات');
  sh.deleteRow(Number(p.row));
  invalidateCache_('الإشعارات');
  return { ok: true };
}

function getPendingNotices_() {
  const rows = sheetToObjects_('الإشعارات').filter(function (r) {
    return r['الحالة'] === 'بانتظار الاطلاع';
  });
  return { ok: true, notices: rows.reverse() };
}

/* نسخة خفيفة من getPendingNotices_ - ترجع رقم العدد بس (بدون كل بيانات الإشعارات)
   تُستخدم لتحديث نقطة العداد على الشاشة الرئيسية بدون تحميل كل سجل الإشعارات كامل. */
function getPendingNoticesCount_() {
  const rows = sheetToObjects_('الإشعارات');
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]['الحالة'] === 'بانتظار الاطلاع') count++;
  }
  return { ok: true, count: count };
}

/* نفس فكرة getPendingNoticesCount_ بس لمركز معيّن - تُستخدم لعداد الشاشة الرئيسية
   بمراكز/مسؤولات بدل ما نجيب كل تاريخ إشعارات المركز كامل بس عشان نعدّ منها. */
function getCenterPendingCount_(p) {
  const rows = sheetToObjects_('الإشعارات');
  const center = String(p.center || '').trim();
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i]['اسم المركز']).trim() === center && rows[i]['الحالة'] !== 'تم الاطلاع' && rows[i]['الحالة'] !== NOTICE_AWAIT_CENTER_) count++;
  }
  return { ok: true, count: count, toSign: centerToSign_(center) };
}

// ترجع جميع إشعارات الاستلام والتسليم (بانتظار الاطلاع + تم الاطلاع) - تُستخدم بلوحة الإدارة
// افتراضياً فصل حالي بس (زي بقية شاشات الفصل الدراسي)؛ p.term = "all" أو اسم فصل سابق يوسّع النطاق
function getAllNotices_(p) {
  const rows = getRowsForTerm_('الإشعارات', p && p.term, 'فصل الأرشفة').slice().reverse();
  const pending = rows.filter(function (r) { return r['الحالة'] === 'بانتظار الاطلاع'; });
  const awaiting = rows.filter(function (r) { return r['الحالة'] === NOTICE_AWAIT_CENTER_; });
  const done = rows.filter(function (r) { return r['الحالة'] !== 'بانتظار الاطلاع' && r['الحالة'] !== NOTICE_AWAIT_CENTER_; });
  return { ok: true, pending: pending, awaiting: awaiting, done: done };
}

function adminSignNotice_(p) {
  const sh = sheet_('الإشعارات');
  const rows = sheetToObjects_('الإشعارات');
  const target = rows.find(function (r) { return r['معرف'] === p.id; });
  if (!target) return { ok: false, error: 'الإشعار غير موجود' };

  const now = nowParts_();

  // نحفظ الصورة النهائية الموقعة بس (فيها توقيع المركز + توقيع الإدارة سوا) - توفير وقت
  const signedImageUrl = saveImage_(p.signedNoticeImage,
    noticeFileName_('إشعار موقع', target['النوع'], target['اسم المركز'], target['تاريخ الإرسال'], p.id),
    ['الإشعارات', target['اسم المركز']]);

  const row = target._row;
  sh.getRange(row, colIndex_(sh, 'رابط توقيع الإدارة')).setValue('');            // لم يعد يُحفظ لوحده
  sh.getRange(row, colIndex_(sh, 'رابط صورة الإشعار الموقع')).setValue(signedImageUrl);
  sh.getRange(row, colIndex_(sh, 'يوم اطلاع الإدارة')).setValue(now.day);
  sh.getRange(row, colIndex_(sh, 'تاريخ اطلاع الإدارة')).setValue(now.date);
  sh.getRange(row, colIndex_(sh, 'وقت اطلاع الإدارة')).setValue(now.time);
  sh.getRange(row, colIndex_(sh, 'اسم المستلمة')).setValue(p.receiverName || '');
  sh.getRange(row, colIndex_(sh, 'الحالة')).setValue('تم الاطلاع');
  invalidateCache_('الإشعارات');

  return { ok: true };
}

/* -------- تعديل إشعار بعد توقيعه (الإدارة) --------
   يحدّث بيانات الإشعار بالشيت، ويحفظ صورة الإشعار الموقعة الجديدة (اللي تولّدها الصفحة من البيانات المعدّلة
   + توقيع المركز + توقيع الإدارة) ويستبدل رابطها. لو أرسلت الصفحة p.adminSignature نحفظه بـ Drive
   ونحط رابطه بعمود "رابط توقيع الإدارة" عشان التعديلات الجاية ما تحتاج تعيدين التوقيع. */
function setNoticeCell_(sh, row, header, value) {
  const c = colIndex_(sh, header);
  if (c > 0) sh.getRange(row, c).setValue(value);
}

function updateSignedNotice_(p) {
  const sh = sheet_('الإشعارات');
  const rows = sheetToObjects_('الإشعارات');
  const target = rows.find(function (r) { return r['معرف'] === p.id; });
  if (!target) return { ok: false, error: 'الإشعار غير موجود' };
  const amount = Number(p.amount);
  if (!(amount > 0)) return { ok: false, error: 'المبلغ غير صحيح' };

  // المركز الجديد لازم يكون موجود بشيت المراكز (نتحقق قبل ما نحفظ أي صورة)
  let newCenter = '';
  if (p.center) {
    newCenter = String(p.center).trim();
    const known = sheetToObjects_('المراكز', CACHE_SECONDS_LONG).map(function (r) { return String(r['اسم المركز']).trim(); });
    if (known.indexOf(newCenter) === -1) return { ok: false, error: 'المركز غير موجود بقائمة المراكز: ' + newCenter };
  }

  const row = target._row;
  const stamp = new Date().getTime();
  const effCenter = newCenter || target['اسم المركز'];
  const effType = p.type || target['النوع'];
  const effDate = p.date ? String(p.date).trim() : target['تاريخ الإرسال'];
  const signedImageUrl = p.signedNoticeImage
    ? saveImage_(p.signedNoticeImage,
        noticeFileName_('إشعار موقع', effType, effCenter, effDate, p.id) + ' (' + stamp + ')',
        ['الإشعارات', effCenter])
    : '';
  const adminSigUrl = p.adminSignature
    ? saveImage_(p.adminSignature, 'توقيع إدارة - ' + String(p.id).slice(0, 6) + ' (' + stamp + ')',
        ['الإشعارات', 'توقيعات الإدارة'])
    : '';

  if (p.type) setNoticeCell_(sh, row, 'النوع', p.type);
  if (newCenter) setNoticeCell_(sh, row, 'اسم المركز', newCenter);
  if (p.date) {
    setNoticeCell_(sh, row, 'تاريخ الإرسال', String(p.date).trim());
    setNoticeCell_(sh, row, 'يوم الإرسال', p.day || dayNameForDateStr_(p.date));
  } else if (p.day) {
    setNoticeCell_(sh, row, 'يوم الإرسال', p.day);
  }
  setNoticeCell_(sh, row, 'المبلغ', amount);
  if (p.senderName !== undefined) setNoticeCell_(sh, row, 'اسم المسلّمة', p.senderName);
  if (p.receiverName !== undefined) setNoticeCell_(sh, row, 'اسم المستلمة', p.receiverName);
  if (p.month !== undefined) setNoticeCell_(sh, row, 'الشهر', p.month);
  if (p.term !== undefined) setNoticeCell_(sh, row, 'الفصل الدراسي', p.term);
  if (p.year !== undefined) setNoticeCell_(sh, row, 'العام', p.year);
  if (p.reason !== undefined) setNoticeCell_(sh, row, 'بيان مخصص', p.reason);
  if (signedImageUrl) setNoticeCell_(sh, row, 'رابط صورة الإشعار الموقع', signedImageUrl);
  if (adminSigUrl) setNoticeCell_(sh, row, 'رابط توقيع الإدارة', adminSigUrl);
  invalidateCache_('الإشعارات');
  return { ok: true, signedImageUrl: signedImageUrl, adminSigUrl: adminSigUrl };
}

/* ترجع توقيع الإدارة المحفوظ سابقًا (كصورة base64) عشان الصفحة تعيد رسم الإشعار بدون ما تطلب توقيع جديد.
   القراءة من Drive بالسيرفر تتجنب مشكلة منع المتصفح لقراءة صور من موقع ثاني. */
/* توقيع المركز (صورة base64) لإشعار واحد - يُجلب عند الحاجة فقط (توقيع الإدارة/تعديل إشعار موقّع)
   لأن عمود «بيانات توقيع المركز» ما يدخل بالقراءة العادية للشيت (انظر SKIP_READ_COLS_) */
function getNoticeCenterSignature_(p) {
  const id = String(p && p.id || '').trim();
  if (!id) return { ok: false, error: 'معرف الإشعار مطلوب' };
  const names = ['الإشعارات', ARCHIVE_PREFIX + 'الإشعارات'];
  for (let i = 0; i < names.length; i++) {
    const rows = sheetToObjects_(names[i]);
    const target = rows.find(function (r) { return r['معرف'] === id; });
    if (!target) continue;
    const sh = sheet_(names[i]);
    const col = colIndex_(sh, 'بيانات توقيع المركز');
    if (col === -1) return { ok: true, dataUrl: '' };
    let row = target._row;
    // تأكيد إن رقم الصف ما تغيّر (مثلاً بعد حذف صف يدوياً بالشيت) قبل ما نقرأ الخلية
    const idCol = colIndex_(sh, 'معرف');
    if (idCol !== -1 && String(sh.getRange(row, idCol).getValue()).trim() !== id) {
      const ids = sh.getRange(1, idCol, sh.getLastRow(), 1).getValues();
      row = -1;
      for (let k = 1; k < ids.length; k++) { if (String(ids[k][0]).trim() === id) { row = k + 1; break; } }
      if (row === -1) return { ok: false, error: 'الإشعار غير موجود' };
    }
    return { ok: true, dataUrl: String(sh.getRange(row, col).getValue() || '') };
  }
  return { ok: false, error: 'الإشعار غير موجود' };
}

function getNoticeAdminSignature_(p) {
  const rows = sheetToObjects_('الإشعارات');
  const target = rows.find(function (r) { return r['معرف'] === p.id; });
  if (!target) return { ok: false, error: 'الإشعار غير موجود' };
  const link = String(target['رابط توقيع الإدارة'] || '');
  const m = link.match(/[-\w]{25,}/);
  if (!m) return { ok: true, dataUrl: '' };
  try {
    const blob = DriveApp.getFileById(m[0]).getBlob();
    return { ok: true, dataUrl: 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
  } catch (e) {
    return { ok: true, dataUrl: '' };
  }
}

/* تشغيل مرة وحدة يدوياً من المحرر: ترتّب صور الإشعارات القديمة (اللي انحفظت سابقاً مبعثرة بالمجلد الرئيسي)
   داخل مجلد "الإشعارات" > اسم المركز، وتعيد تسميتها باسم واضح. آمنة لو انشغلت أكثر من مرة
   (تتخطّى الملفات المرتّبة). لو وقفت بسبب الوقت، شغّليها مرة ثانية وتكمل. */
function organizeExistingNoticeFiles_() {
  const start = Date.now();
  const rows = sheetToObjects_('الإشعارات');
  const cols = [
    { header: 'رابط صورة الإشعار', prefix: 'إشعار', sig: false },
    { header: 'رابط صورة الإشعار الموقع', prefix: 'إشعار موقع', sig: false },
    { header: 'رابط توقيع الإدارة', prefix: 'توقيع إدارة', sig: true }
  ];
  let moved = 0, skipped = 0, failed = 0, stoppedEarly = false;
  for (let i = 0; i < rows.length && !stoppedEarly; i++) {
    const r = rows[i];
    for (let c = 0; c < cols.length; c++) {
      if (Date.now() - start > 270000) { stoppedEarly = true; break; }
      const link = String(r[cols[c].header] || '');
      const m = link.match(/[-\w]{25,}/);
      if (!m) continue;
      try {
        const target = cols[c].sig
          ? getOrCreateSubFolder_(['الإشعارات', 'توقيعات الإدارة'])
          : getOrCreateSubFolder_(['الإشعارات', r['اسم المركز']]);
        const file = DriveApp.getFileById(m[0]);
        const parents = file.getParents();
        if (parents.hasNext() && parents.next().getId() === target.getId()) { skipped++; continue; }
        file.moveTo(target);
        file.setName(cols[c].sig
          ? 'توقيع إدارة - ' + String(r['معرف'] || '').slice(0, 6)
          : noticeFileName_(cols[c].prefix, r['النوع'], r['اسم المركز'], r['تاريخ الإرسال'], r['معرف']) + '.png');
        moved++;
      } catch (e) {
        failed++;
        Logger.log('تعذر ترتيب ملف: ' + link + ' - ' + e);
      }
    }
  }
  Logger.log('تم نقل: ' + moved + ' | كانت مرتّبة: ' + skipped + ' | فشل: ' + failed +
    (stoppedEarly ? ' | توقفت بسبب الوقت، شغّليها مرة ثانية' : ' | اكتمل الترتيب ✅'));
}

/* ------------------- الإحصائيات (إيرادات المقاصف) ------------------- */

// دالة تشخيص: ترجع اسم/رابط ملف الإكسل اللي متصل فيه هذا الكود فعلياً، مع عدد صفوف كل شيت،
// تساعد لو صار لخبطة إن الموقع متصل بملف إكسل غير اللي المستخدمة تشوف فيه بياناتها
function debugInfo_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ['المسؤولات', 'الحضور', 'التعهد', 'المهام', 'المراكز', 'المبيعات', 'المرتجعات', 'الفواتير', 'الإشعارات'];
  const sheetsInfo = sheetNames.map(function (name) {
    const sh = ss.getSheetByName(name);
    return { name: name, exists: !!sh, rows: sh ? Math.max(sh.getLastRow() - 1, 0) : 0 };
  });
  return {
    ok: true,
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    sheets: sheetsInfo
  };
}

/* ------------------- بدء فصل دراسي جديد (ترحيل/تسمية البيانات) ------------------- */

/* تحط اسم الفصل الدراسي (p.termLabel، مثال: "الفصل الدراسي الأول ١٤٤٨هـ") على كل
   صف "حالي" (يعني عمود "الفصل الدراسي" فاضي فيه) بشيتات المبيعات/المرتجعات/الفواتير/الإشعارات.
   بهذا الشكل: أي صف قديم انحط له اسم فصل قبل كذا يضل كما هو (ما يتكتب فوقه)،
   وبس الصفوف "الحالية" (بدون تسمية) هي اللي تاخذ اسم الفصل المنتهي. بعدها أي بيانات
   جديدة تنسجل بدون فصل (يعني تعتبر فصل "حالي") لين يجي وقت الترحيل التالي. */
function archiveCurrentTerm_(p) {
  const termLabel = String(p.termLabel || '').trim();
  if (!termLabel) return { ok: false, error: 'اسم الفصل الدراسي مطلوب' };

  // لكل شيت اسم عمود الأرشفة الخاص فيه - "الإشعارات" لها عمود منفصل "فصل الأرشفة"
  // لأن عمود "الفصل الدراسي" فيها محجوز لغرض ثاني (فصل رسوم حفل تحفيظ الصغار)
  const sheetsToArchive = [
    { name: 'المبيعات', col: 'الفصل الدراسي' },
    { name: 'المرتجعات', col: 'الفصل الدراسي' },
    { name: 'الفواتير', col: 'الفصل الدراسي' },
    { name: 'الإشعارات', col: 'فصل الأرشفة' },
    { name: 'قائمة الدخل', col: 'الفصل الدراسي' }
  ];
  const counts = {};

  sheetsToArchive.forEach(function (entry) {
    const sh = sheet_(entry.name);
    if (!sh || sh.getLastRow() < 2) { counts[entry.name] = 0; return; }
    const col = colIndex_(sh, entry.col);
    if (col === -1) { counts[entry.name] = 0; return; }

    // ننقل الصفوف "الحالية" (عمود الأرشفة فاضي) فعلياً لشيت الأرشيف بعد ما نكتب
    // عليها اسم الفصل - فيرجع الشيت الحيّ صغيراً (بيانات الفصل الجديد بس) بدل
    // ما يتراكم فيه كل الفصول للأبد.
    const archiveSh = getOrCreateArchiveSheet_(entry.name);
    const n = archiveRowsMatching_(sh, archiveSh, col, function (v) { return String(v).trim() === ''; }, termLabel);
    counts[entry.name] = n;
    invalidateCache_(entry.name);
    invalidateCache_(ARCHIVE_PREFIX + entry.name);
  });

  // اعتماد اكتمال التسجيل خاص بالفصل الحالي - يتفرّغ مع بداية الفصل الجديد
  clearRegistrationVerified_();

  return { ok: true, counts: counts };
}


/* ------------------- قائمة الدخل (الإيرادات والمصروفات - يدوي بالكامل) ------------------- */

/* ------------------- تقارير الزيارة (حفظ + توقيع مديرة المركز) -------------------
   الإدارة تكتب التقرير وتختار المركز ← يُحفظ «بانتظار توقيع المديرة» ← المديرة توقّع من صفحة المراكز.
   التعديل من الإدارة فقط، وأي تعديل يلغي توقيع المديرة ويعيد التقرير لحالة الانتظار. */
const VISIT_REPORT_SHEET_ = 'تقارير الزيارة';
const VISIT_REPORT_HEADERS_ = ['معرف', 'اسم المركز', 'بيانات التقرير', 'توقيع الرئيسة', 'الحالة',
  'يوم الإرسال', 'تاريخ الإرسال', 'وقت الإرسال',
  'توقيع المديرة', 'اسم الموقّعة', 'يوم التوقيع', 'تاريخ التوقيع', 'وقت التوقيع'];
const VR_PENDING_ = 'بانتظار توقيع المديرة';
const VR_SIGNED_ = 'تم التوقيع';

function visitReportSheet_() {
  let sh = sheet_(VISIT_REPORT_SHEET_);
  if (!sh) {
    sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet(VISIT_REPORT_SHEET_);
    sh.getRange(1, 1, 1, VISIT_REPORT_HEADERS_.length).setValues([VISIT_REPORT_HEADERS_]).setFontWeight('bold');
    sh.setRightToLeft(true);
    sh.getRange(2, 1, sh.getMaxRows() - 1, VISIT_REPORT_HEADERS_.length).setNumberFormat('@');
  }
  return sh;
}

function visitReportRows_() {
  if (!sheet_(VISIT_REPORT_SHEET_)) return [];
  return sheetToObjects_(VISIT_REPORT_SHEET_);
}

function visitReportOut_(r) {
  let data = {};
  try { data = JSON.parse(r['بيانات التقرير'] || '{}'); } catch (e) { data = {}; }
  return {
    id: r['معرف'], center: r['اسم المركز'], centerDisplay: centerDisplay_(r['اسم المركز']), data: data,
    headSignature: r['توقيع الرئيسة'] || '', status: r['الحالة'] || VR_PENDING_,
    sentDay: r['يوم الإرسال'] || '', sentDate: r['تاريخ الإرسال'] || '', sentTime: r['وقت الإرسال'] || '',
    directorSignature: r['توقيع المديرة'] || '', signerName: r['اسم الموقّعة'] || '',
    signedDay: r['يوم التوقيع'] || '', signedDate: r['تاريخ التوقيع'] || '', signedTime: r['وقت التوقيع'] || ''
  };
}

function findVisitReport_(id) {
  const target = String(id || '').trim();
  if (!target) return null;
  return visitReportRows_().find(function (r) { return String(r['معرف']).trim() === target; }) || null;
}

/* إنشاء (بدون p.id) أو تعديل (مع p.id). التعديل يلغي توقيع المديرة. */
function saveVisitReport_(p) {
  const center = String(p.center || '').trim();
  if (!center) return { ok: false, error: 'اختاري المركز الذي يظهر له التقرير' };
  const data = typeof p.data === 'string' ? p.data : JSON.stringify(p.data || {});
  const headSig = String(p.headSignature || '');
  if (data.length > 45000 || headSig.length > 45000) return { ok: false, error: 'حجم التقرير أو صورة التوقيع كبير جداً' };
  const sh = visitReportSheet_();
  const now = nowParts_();
  if (p.id) {
    const row = findVisitReport_(p.id);
    if (!row) return { ok: false, error: 'التقرير غير موجود (ربما حُذف)' };
    const set = function (col, v) { sh.getRange(row._row, colIndex_(sh, col)).setValue(v); };
    set('اسم المركز', center);
    set('بيانات التقرير', data);
    set('توقيع الرئيسة', headSig);
    set('الحالة', VR_PENDING_);
    set('توقيع المديرة', ''); set('اسم الموقّعة', '');
    set('يوم التوقيع', ''); set('تاريخ التوقيع', ''); set('وقت التوقيع', '');
    invalidateCache_(VISIT_REPORT_SHEET_);
    return { ok: true, id: p.id, updated: true };
  }
  const id = Utilities.getUuid();
  appendRowByHeaders_(sh, {
    'معرف': id, 'اسم المركز': center, 'بيانات التقرير': data, 'توقيع الرئيسة': headSig, 'الحالة': VR_PENDING_,
    'يوم الإرسال': now.day, 'تاريخ الإرسال': now.date, 'وقت الإرسال': now.time
  });
  invalidateCache_(VISIT_REPORT_SHEET_);
  return { ok: true, id: id };
}

/* تعديل محدود لتقرير زيارة (حتى بعد توقيع المديرة): اليوم + التاريخ الهجري (يوم/شهر/سنة) + نوع الزيارة فقط.
   لا يمسّ أي شيء آخر ولا يلغي التوقيع ولا يغيّر الحالة. ويُحدَّث سجل الإحصائية المرتبط (إن وُجد) في الطلب نفسه. */
const VR_AMEND_DAYS_ = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
function vrArDigits_(v) {
  return String(v === undefined || v === null ? '' : v).replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
}
function amendVisitReport_(p) {
  const row = findVisitReport_(p.id);
  if (!row) return { ok: false, error: 'التقرير غير موجود (ربما حُذف)' };
  const f = p.fields || {};
  let data = {};
  try { data = JSON.parse(row['بيانات التقرير'] || '{}'); } catch (e) { data = {}; }
  const day = String(f.day || '').trim();
  if (VR_AMEND_DAYS_.indexOf(day) === -1) return { ok: false, error: 'اليوم غير صحيح' };
  const hd = parseInt(vrArDigits_(f.hijriDay), 10);
  if (!(hd >= 1 && hd <= 30)) return { ok: false, error: 'يوم التاريخ الهجري يجب أن يكون بين ١ و٣٠' };
  const hm = parseInt(vrArDigits_(f.hijriMonth), 10);
  if (!(hm >= 1 && hm <= 12)) return { ok: false, error: 'شهر التاريخ الهجري يجب أن يكون بين ١ و١٢' };
  const yr = vrArDigits_(f.year).replace(/\D/g, '');
  if (yr && yr.length !== 4) return { ok: false, error: 'السنة الهجرية غير صحيحة' };
  const vt = String(f.visitType || '').trim().slice(0, 60);
  if (!vt) return { ok: false, error: 'نوع الزيارة مطلوب' };
  data.day = day;
  data.hijriDay = String(hd);
  data.hijriMonth = String(hm).replace(/[0-9]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; });
  if (yr) data.year = yr;
  data.visitType = vt;
  const sh = visitReportSheet_();
  sh.getRange(row._row, colIndex_(sh, 'بيانات التقرير')).setValue(JSON.stringify(data));
  invalidateCache_(VISIT_REPORT_SHEET_);
  let statUpdated = false;
  const s = p.stat;
  if (s && data.statId && s.hijriDate) {
    const r = updateVisitStat_({ id: data.statId, center: s.center || data.center, period: s.period || '', hijriDate: s.hijriDate, dateKey: s.dateKey || '' });
    statUpdated = !!(r && r.ok);
  }
  return { ok: true, data: data, statUpdated: statUpdated };
}

function getVisitReportsAdmin_(p) {
  return { ok: true, reports: visitReportRows_().slice().reverse().map(visitReportOut_) };
}

function getVisitReportsForCenter_(p) {
  const center = String((p && p.center) || '').trim();
  if (!center) return { ok: false, error: 'اسم المركز مطلوب' };
  const list = visitReportRows_().filter(function (r) { return String(r['اسم المركز']).trim() === center; })
    .slice().reverse().map(visitReportOut_);
  return { ok: true, reports: list };
}

function getVisitReportPendingCount_(p) {
  const center = String((p && p.center) || '').trim();
  const count = visitReportRows_().filter(function (r) {
    return String(r['اسم المركز']).trim() === center && (r['الحالة'] || VR_PENDING_) === VR_PENDING_;
  }).length;
  return { ok: true, count: count };
}

/* توقيع المديرة: مرة واحدة فقط، ومن نفس المركز الموجّه له التقرير */
function signVisitReport_(p) {
  const row = findVisitReport_(p.id);
  if (!row) return { ok: false, error: 'التقرير غير موجود' };
  if (String(row['اسم المركز']).trim() !== String(p.center || '').trim()) return { ok: false, error: 'هذا التقرير غير موجّه لهذا المركز' };
  if (row['الحالة'] === VR_SIGNED_) return { ok: false, error: 'تم توقيع هذا التقرير مسبقاً' };
  const sig = String(p.signature || '');
  if (!sig) return { ok: false, error: 'التوقيع مطلوب' };
  if (sig.length > 45000) return { ok: false, error: 'صورة التوقيع كبيرة جداً' };
  const sh = visitReportSheet_();
  const now = nowParts_();
  const set = function (col, v) { sh.getRange(row._row, colIndex_(sh, col)).setValue(v); };
  set('توقيع المديرة', sig);
  set('اسم الموقّعة', String(p.signerName || '').trim());
  set('يوم التوقيع', now.day); set('تاريخ التوقيع', now.date); set('وقت التوقيع', now.time);
  set('الحالة', VR_SIGNED_);
  invalidateCache_(VISIT_REPORT_SHEET_);
  return { ok: true };
}

function deleteVisitReport_(p) {
  const row = findVisitReport_(p.id);
  if (!row) return { ok: false, error: 'التقرير غير موجود' };
  visitReportSheet_().deleteRow(row._row);
  invalidateCache_(VISIT_REPORT_SHEET_);
  return { ok: true };
}

const COMPANY_PAYMENT_CATEGORY_ = 'تسديد شركة أعمال الإخلاص';
const HELPER_REWARD_CATEGORY_ = 'مكافأة المتعاونة';

function recordIncomeItem_(p) {
  const sh = sheet_('قائمة الدخل');
  const id = Utilities.getUuid();
  const now = nowParts_();
  let attachmentUrl = '';
  let attachmentName = '';
  if (p.fileData) {
    attachmentUrl = saveAttachmentFile_(p.fileData, p.fileName || ('مرفق-' + id), p.mimeType || '');
    attachmentName = p.fileName || '';
  } else if (p.linkUrl) {
    // رابط السند (بدل رفع ملف) - يُحفظ بنفس عمود المرفق
    attachmentUrl = String(p.linkUrl).trim();
    attachmentName = 'رابط السند';
  }
  appendRowByHeaders_(sh, {
    'معرف': id, 'البند': p.category || '', 'البيان': p.description || '', 'المبلغ': Number(p.amount) || 0,
    'المبلغ كتابة': p.amountWords || '',
    'اليوم': now.day, 'التاريخ': now.date,
    'رابط المرفق': attachmentUrl, 'اسم المرفق': attachmentName
  });
  invalidateCache_('قائمة الدخل');
  return { ok: true, id: id };
}

/* تعديل بند موجود. لو انمرّر ملف مرفق جديد (p.fileData) يستبدل القديم (لو موجود)؛
   لو ما انمرّر، يبقى المرفق القديم كما هو (ما يُحذف بمجرد التعديل على المبلغ مثلاً). */
function updateIncomeItem_(p) {
  const sh = sheet_('قائمة الدخل');
  const row = Number(p.row);
  if (p.category !== undefined) sh.getRange(row, colIndex_(sh, 'البند')).setValue(p.category);
  if (p.description !== undefined) sh.getRange(row, colIndex_(sh, 'البيان')).setValue(p.description);
  if (p.amount !== undefined) sh.getRange(row, colIndex_(sh, 'المبلغ')).setValue(Number(p.amount));
  if (p.amountWords !== undefined) sh.getRange(row, colIndex_(sh, 'المبلغ كتابة')).setValue(p.amountWords);
  if (p.fileData) {
    const id = Utilities.getUuid();
    const url = saveAttachmentFile_(p.fileData, p.fileName || ('مرفق-' + id), p.mimeType || '');
    sh.getRange(row, colIndex_(sh, 'رابط المرفق')).setValue(url);
    sh.getRange(row, colIndex_(sh, 'اسم المرفق')).setValue(p.fileName || '');
  } else if (p.linkUrl) {
    sh.getRange(row, colIndex_(sh, 'رابط المرفق')).setValue(String(p.linkUrl).trim());
    sh.getRange(row, colIndex_(sh, 'اسم المرفق')).setValue('رابط السند');
  }
  invalidateCache_('قائمة الدخل');
  return { ok: true };
}

function getIncomeItems_(p) {
  let rows = getRowsForTerm_('قائمة الدخل', p && p.term, 'الفصل الدراسي');
  rows = rows.slice().reverse();
  let totalIncome = 0, totalExpenses = 0, totalCompanyPaid = 0, totalOtherProfit = 0, totalHelperReward = 0;
  rows.forEach(function (r) {
    const amt = Number(r['المبلغ']) || 0;
    const cat = String(r['البند'] || '').trim();
    if (cat === 'إيراد') totalIncome += amt;
    else if (cat === 'ربح') totalOtherProfit += amt;
    else if (cat === 'مصروفات') totalExpenses += amt;
    else if (cat === HELPER_REWARD_CATEGORY_) totalHelperReward += amt;
    else if (cat === COMPANY_PAYMENT_CATEGORY_) totalCompanyPaid += amt;
  });

  // الإشعارات (استلام / تسليم المكافأة / رسوم حفل تحفيظ الصغار) بمبالغها - لنفس الفصل المختار
  const NOTICE_KIND_LABELS_ = { receive: 'استلام', reward: 'تسليم المكافأة', fee: 'رسوم حفل تحفيظ الصغار' };
  const receipts = getRowsForTerm_('الإشعارات', p && p.term, 'فصل الأرشفة')
    .filter(function (r) { return NOTICE_KIND_LABELS_[noticeKind_(r)]; })
    .slice().reverse()
    .map(function (r) {
      const kind = noticeKind_(r);
      return {
        kind: kind, kindLabel: NOTICE_KIND_LABELS_[kind],
        center: centerDisplay_(r['اسم المركز']), senderName: r['اسم المسلّمة'] || '',
        amount: Number(r['المبلغ']) || 0, day: r['يوم الإرسال'] || '', date: r['تاريخ الإرسال'] || '',
        month: r['الشهر'] || '', status: r['الحالة'] || '',
        image: r['رابط صورة الإشعار الموقع'] || r['رابط صورة الإشعار'] || ''
      };
    });
  function sumKind_(k) { return receipts.filter(function (r) { return r.kind === k; }).reduce(function (s, r) { return s + r.amount; }, 0); }
  const totalReceipts = sumKind_('receive');
  const totalRewardNotices = sumKind_('reward');   // مكافأة المتعاونة = إشعارات تسليم المكافأة
  const totalFeeNotices = sumKind_('fee');         // رسوم حفل تحفيظ الصغار (إشعار تسليم)
  totalHelperReward += totalRewardNotices;

  // إجمالي الإيرادات (المبالغ المستلمة) = مبالغ إشعارات الاستلام + بنود «إيراد» اليدوية
  // الربح = الإيرادات + أرباح أخرى − المصروفات − مكافأة المتعاونة − رسوم حفل تحفيظ الصغار − تسديدات شركة أعمال الإخلاص
  const manualIncome = totalIncome;
  totalIncome = manualIncome + totalReceipts;
  return {
    ok: true, items: rows, totalIncome: totalIncome, manualIncome: manualIncome,
    totalOtherProfit: totalOtherProfit, totalExpenses: totalExpenses, totalHelperReward: totalHelperReward,
    totalCompanyPaid: totalCompanyPaid, totalFeeNotices: totalFeeNotices,
    netProfit: totalIncome + totalOtherProfit - totalExpenses - totalHelperReward - totalFeeNotices - totalCompanyPaid,
    receipts: receipts, totalReceipts: totalReceipts
  };
}

function deleteIncomeItem_(p) {
  const sh = sheet_('قائمة الدخل');
  sh.deleteRow(Number(p.row));
  invalidateCache_('قائمة الدخل');
  return { ok: true };
}

function getStats_() {
  const sales = sheetToObjects_('المبيعات');
  const byCenter = {};
  sales.forEach(function (r) {
    const c = String(r['اسم المركز'] || '').trim();
    if (!c) return;
    byCenter[c] = (byCenter[c] || 0) + (Number(r['المبلغ']) || 0);
  });
  let centersArr = Object.keys(byCenter).map(function (c) { return { center: c, total: byCenter[c] }; });
  centersArr.sort(function (a, b) { return b.total - a.total; });
  const grandTotal = centersArr.reduce(function (s, c) { return s + c.total; }, 0);
  return { ok: true, totalRevenue: grandTotal, centers: centersArr };
}


/* ------------------- أدوات تواريخ مشتركة ------------------- */

const ENTRY_STAMP_COL_ = 'وقت التسجيل الفعلي';

function entryStamp_() {
  const n = nowParts_();
  return n.date + ' ' + n.time;
}

function pad2_(n) { return (n < 10 ? '0' : '') + n; }

/* ترجع yyyy-MM-dd من أي نص يبدأ بتاريخ بهالصيغة (أو فاضي) */
function dateOnly_(v) {
  const m = String(v === undefined || v === null ? '' : v).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[1] + '-' + m[2] + '-' + m[3]) : '';
}

function ymdToUtc_(s) {
  const a = s.split('-');
  return Date.UTC(Number(a[0]), Number(a[1]) - 1, Number(a[2]));
}

function utcToYmd_(ms) {
  const d = new Date(ms);
  return d.getUTCFullYear() + '-' + pad2_(d.getUTCMonth() + 1) + '-' + pad2_(d.getUTCDate());
}

function daysBetween_(a, b) {
  return Math.round((ymdToUtc_(b) - ymdToUtc_(a)) / 86400000);
}

/* «HH:mm» -> عدد الدقائق من منتصف الليل (أو null) */
function timeToMin_(v) {
  const m = String(v === undefined || v === null ? '' : v).match(/(\d{1,2}):(\d{2})/);
  return m ? (Number(m[1]) * 60 + Number(m[2])) : null;
}

function minToTime_(min) {
  if (min === null || min === undefined) return '';
  return pad2_(Math.floor(min / 60)) + ':' + pad2_(min % 60);
}

function allRowsIncludingArchive_(name) {
  return sheetToObjects_(name).concat(sheetToObjects_(ARCHIVE_PREFIX + name));
}

/* ------------------- إحصائيات التسجيل (لوحة الإدارة) -------------------
   لكل مركز خلال الفترة المختارة:
   - عدد الإشعارات مفصّلة: استلام / تسليم المكافأة / تسليم رسوم حفل تحفيظ الصغار (+ بانتظار الاطلاع)
   - عدد بيان الفواتير (+ مجموع رأس المال والربح)
   - أيام وعدد مرات تسجيل المبيعات (+ المجموع)
   - النواقص: مبالغ بدون فواتير، فواتير بدون مبالغ، لا يوجد أي تسجيل
   الفترة: period = 'term' (الفصل الحالي - الافتراضي) أو 'all' (كل الفصول) أو from/to (تواريخ). */
/* ---- اعتماد اكتمال التسجيل (صح يدوي من الإدارة) ---- */
const REG_VERIFY_SHEET_ = 'اعتماد التسجيل';
const REG_VERIFY_HEADERS_ = ['اسم المركز', 'اليوم', 'التاريخ', 'الوقت'];

function regVerifySheet_() {
  let sh = sheet_(REG_VERIFY_SHEET_);
  if (!sh) {
    sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet(REG_VERIFY_SHEET_);
    sh.getRange(1, 1, 1, REG_VERIFY_HEADERS_.length).setValues([REG_VERIFY_HEADERS_]);
    sh.getRange(2, 1, sh.getMaxRows() - 1, REG_VERIFY_HEADERS_.length).setNumberFormat('@');
  }
  return sh;
}

function getRegistrationVerifiedMap_() {
  const map = {};
  if (!sheet_(REG_VERIFY_SHEET_)) return map;
  sheetToObjects_(REG_VERIFY_SHEET_).forEach(function (r) {
    const c = String(r['اسم المركز'] || '').trim();
    if (c) map[c] = true;
  });
  return map;
}

/* p.center + p.verified (true = إضافة صح، false = إزالته) */
function setRegistrationVerified_(p) {
  const center = String(p.center || '').trim();
  if (!center) return { ok: false, error: 'اسم المركز مطلوب' };
  const on = !(p.verified === false || p.verified === 'false');
  const sh = regVerifySheet_();
  const rows = sheetToObjects_(REG_VERIFY_SHEET_);
  const existing = rows.filter(function (r) { return String(r['اسم المركز'] || '').trim() === center; })
    .map(function (r) { return r._row; }).sort(function (a, b) { return b - a; });
  if (on) {
    if (!existing.length) {
      const now = nowParts_();
      appendRowByHeaders_(sh, { 'اسم المركز': center, 'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time });
    }
  } else {
    existing.forEach(function (rowNum) { sh.deleteRow(rowNum); });
  }
  invalidateCache_(REG_VERIFY_SHEET_);
  return { ok: true, center: center, verified: on };
}

function clearRegistrationVerified_() {
  const sh = sheet_(REG_VERIFY_SHEET_);
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  invalidateCache_(REG_VERIFY_SHEET_);
}

function noticeKind_(r) {
  const t = String(r['النوع'] || '').trim();
  if (t === 'استلام') return 'receive';
  if (t === 'تسليم') return String(r['بيان مخصص'] || '').trim() ? 'fee' : 'reward';
  return 'other';
}

function getRegistrationStats_(p) {
  p = p || {};
  const period = String(p.period || 'term');
  const from = dateOnly_(p.from), to = dateOnly_(p.to);
  const useDates = period === 'range' && from && to;

  let sales, invoices, notices;
  if (period === 'all' || useDates) {
    sales = allRowsIncludingArchive_('المبيعات');
    invoices = allRowsIncludingArchive_('الفواتير');
    notices = allRowsIncludingArchive_('الإشعارات');
  } else {
    sales = getRowsForTerm_('المبيعات', 'current', 'الفصل الدراسي');
    invoices = getRowsForTerm_('الفواتير', 'current', 'الفصل الدراسي');
    notices = getRowsForTerm_('الإشعارات', 'current', 'فصل الأرشفة');
  }
  function inRange(v) {
    if (!useDates) return true;
    const d = dateOnly_(v);
    return !!d && d >= from && d <= to;
  }

  // كل المراكز (تشمل مراكز العرض فقط + المراكز المربوطة بمسؤولة)
  const centers = [];
  function addCenter(n) { n = String(n || '').trim(); if (n && centers.indexOf(n) === -1) centers.push(n); }
  sheetToObjects_('المراكز', CACHE_SECONDS_LONG).forEach(function (r) { addCenter(r['اسم المركز']); });
  sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG).forEach(function (r) { addCenter(r['اسم المركز']); });

  const st = {};
  function S(c) {
    c = String(c || '').trim();
    if (!c) return null;
    if (!st[c]) {
      addCenter(c);
      st[c] = { center: c, receive: 0, reward: 0, fee: 0, other: 0, pending: 0,
        invoices: 0, capital: 0, profit: 0, salesEntries: 0, salesDays: {}, salesTotal: 0 };
    }
    return st[c];
  }
  centers.slice().forEach(S);

  notices.forEach(function (r) {
    if (!inRange(r['تاريخ الإرسال'])) return;
    const m = S(r['اسم المركز']); if (!m) return;
    m[noticeKind_(r)]++;
    if (String(r['الحالة'] || '').trim() === 'بانتظار الاطلاع') m.pending++;
  });
  invoices.forEach(function (r) {
    if (!inRange(r['التاريخ'])) return;
    const m = S(r['اسم المركز']); if (!m) return;
    const et = entryTypeOf_(r);
    if (et === 'فاتورة') {
      m.invoices++;                                     // «عدد الفواتير» يعدّ الفواتير فقط (مو المشتريات/المصروفات)
      m.capital += (Number(r['المبلغ الإجمالي']) || 0) - invoiceReturnOf_(r).cap;   // عمود «المبلغ الإجمالي» بالشيت = رأس المال (بعد خصم الرجيع)
    }
    if (et !== 'مصروفات') m.profit += (Number(r['الربح']) || 0) - (et === 'فاتورة' ? invoiceReturnOf_(r).profit : 0);  // الربح = أرباح الفواتير + أرباح المشتريات
  });
  sales.forEach(function (r) {
    if (!inRange(r['التاريخ'])) return;
    const m = S(r['اسم المركز']); if (!m) return;
    m.salesEntries++;
    const d = dateOnly_(r['التاريخ']);
    if (d) m.salesDays[d] = 1;
    m.salesTotal += Number(r['المبلغ']) || 0;
  });

  const verified = getRegistrationVerifiedMap_();
  const list = centers.map(function (c) {
    const m = st[c];
    const days = Object.keys(m.salesDays).length;
    const issues = [];
    if (m.salesEntries > 0 && m.invoices === 0) issues.push('salesNoInvoices');
    if (m.invoices > 0 && m.salesEntries === 0) issues.push('invoicesNoSales');
    if (m.salesEntries === 0 && m.invoices === 0 && (m.receive + m.reward + m.fee + m.other) === 0) issues.push('nothing');
    return {
      center: c,
      receive: m.receive, reward: m.reward, fee: m.fee, other: m.other,
      noticesTotal: m.receive + m.reward + m.fee + m.other,
      pending: m.pending,
      invoices: m.invoices,
      capital: Math.round(m.capital * 100) / 100,
      profit: Math.round(m.profit * 100) / 100,
      salesEntries: m.salesEntries,
      salesDays: days,
      salesTotal: Math.round(m.salesTotal * 100) / 100,
      issues: issues,
      verified: !!verified[c]
    };
  });

  list.sort(function (a, b) {
    if (b.issues.length !== a.issues.length) return b.issues.length - a.issues.length;
    return a.center < b.center ? -1 : 1;
  });

  const totals = { receive: 0, reward: 0, fee: 0, other: 0, pending: 0, invoices: 0, salesEntries: 0, salesTotal: 0 };
  list.forEach(function (m) {
    Object.keys(totals).forEach(function (k) { totals[k] += m[k]; });
  });
  totals.salesTotal = Math.round(totals.salesTotal * 100) / 100;

  return { ok: true, period: useDates ? 'range' : (period === 'all' ? 'all' : 'term'),
    from: useDates ? from : '', to: useDates ? to : '', centers: list, totals: totals };
}


/* ------------------- طلبات المقاصف -------------------
   النموذج (أيقونة «طلبات المقاصف» بصفحات المديرات والمسؤولات): الأصناف مع الوحدة (علبة/كرتون/كيس) والعدد،
   مع إمكانية إضافة أصناف أخرى. عند الإرسال: يُحفظ الطلب بشيت «طلبات المقاصف» ويوصل إشعار بالبريد
   لعنوان ORDERS_NOTIFY_EMAIL أعلى الملف. فشل البريد (مثلاً تجاوز حد الإرسال اليومي) ما يلغي حفظ الطلب. */
const ORDER_UNITS_ = ['علبة', 'كرتون', 'كيس', 'حبة'];
const ORDER_PERIODS_ = ['صباحي', 'مسائي'];

function htmlEsc_(v) {
  return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* يرجّع شيت الطلبات، وينشئه بأعمدته لو ما كان موجود (حتى لو ما انشغّلت setup بعد) */
function getOrdersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ORDERS_SHEET_NAME_);
  if (!sh) {
    sh = ss.insertSheet(ORDERS_SHEET_NAME_);
    sh.appendRow(ORDERS_HEADERS_);
    sh.getRange(1, 1, 1, ORDERS_HEADERS_.length).setFontWeight('bold');
    sh.setRightToLeft(true);
  }
  if (sh.getLastRow() === 0) sh.appendRow(ORDERS_HEADERS_);
  // أعمدة التاريخ/الوقت نص عادي حتى لا يحوّلها قوقل شيتس لتاريخ داخلي (نفس معالجة setup)
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  headers.forEach(function (h, idx) {
    if (TEXT_COLUMNS_.indexOf(h) !== -1) {
      sh.getRange(2, idx + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    }
  });
  return sh;
}

function submitCanteenOrder_(p) {
  const center = String(p.center || '').trim();
  if (!center) return { ok: false, error: 'اسم المركز مطلوب' };
  const period = String(p.period || '').trim();
  if (ORDER_PERIODS_.indexOf(period) === -1) return { ok: false, error: 'الفترة مطلوبة (صباحي أو مسائي)' };
  const term = String(p.term || '').trim().slice(0, 30);
  const year = String(p.year || '').trim().slice(0, 30);
  if (!term || !year) return { ok: false, error: 'الفصل الدراسي والعام مطلوبان' };

  const raw = Array.isArray(p.items) ? p.items : [];
  if (raw.length > 300) return { ok: false, error: 'عدد الأصناف كبير جداً' };
  const items = [];
  raw.forEach(function (it) {
    if (!it) return;
    const name = String(it.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const unit = String(it.unit || '').trim();
    const qty = Math.floor(Number(it.qty));
    if (!name || ORDER_UNITS_.indexOf(unit) === -1 || !(qty > 0) || qty > 9999) return;
    items.push({ name: name, unit: unit, qty: qty, other: !!it.other });
  });
  if (!items.length) return { ok: false, error: 'لا توجد أصناف صالحة في الطلب (حدّدي الصنف والوحدة والعدد)' };

  const role = String(p.role || '').trim().slice(0, 30);
  const masoulaName = String(p.masoulaName || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const managerName = String(p.managerName || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const notes = String(p.notes || '').trim().slice(0, 500);

  const lines = items.map(function (it) {
    return (it.other ? '(صنف آخر) ' : '') + it.name + ' — ' + it.qty + ' ' + it.unit;
  });
  const details = lines.join('\n');

  // حماية من التكرار: نفس الطلب بنفس التفاصيل خلال دقيقة يُحسب مرة وحدة (ضغطتين/إعادة اتصال)
  let dupKey = '';
  try {
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, [center, period, term, year, details].join('|'));
    dupKey = 'ord_' + digest.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
    if (getCache_().get(dupKey)) return { ok: true, duplicate: true, count: items.length, emailSent: true };
  } catch (e) { dupKey = ''; }

  const now = nowParts_();
  const id = Utilities.getUuid();
  appendRowByHeaders_(getOrdersSheet_(), {
    'معرف': id, 'اسم المركز': center, 'الفترة': period, 'الفصل الدراسي': term, 'العام': year,
    'مسؤولة المقصف': masoulaName, 'مديرة المركز': managerName,
    'عدد الأصناف': items.length, 'تفاصيل الطلب': details, 'ملاحظات': notes, 'سجّل بواسطة': role,
    'اليوم': now.day, 'التاريخ': now.date, 'الوقت': now.time
  });
  if (dupKey) { try { getCache_().put(dupKey, '1', 60); } catch (e) {} }

  const emailSent = notifyCanteenOrder_({
    center: center, period: period, term: term, year: year, masoulaName: masoulaName, managerName: managerName,
    notes: notes, items: items, now: now, role: role
  });
  return { ok: true, id: id, count: items.length, emailSent: emailSent };
}

/* ---- عرض الطلبات في موقع الإدارة ----
   تُقرأ مباشرة من الشيت (بدون كاش) لأنه صغير ولازم يظهر الطلب الجديد فوراً.
   «الحالة» فارغة = جديد. عمود «الحالة» يُضاف تلقائياً للشيتات القديمة عند أول تغيير. */
const ORDER_STATUSES_ = ['جديد', 'تم التنفيذ'];

function parseOrderDetails_(details) {
  return String(details || '').split(/\n+/).map(function (line) {
    line = line.trim();
    if (!line) return null;
    let other = false;
    if (line.indexOf('(صنف آخر)') === 0) { other = true; line = line.replace('(صنف آخر)', '').trim(); }
    const m = line.match(/^(.*?)\s+—\s+(\d+)\s+(\S+)$/);
    if (!m) return { name: line, qty: '', unit: '', other: other };
    return { name: m[1], qty: Number(m[2]), unit: m[3], other: other };
  }).filter(Boolean);
}

function getCanteenOrders_(p) {
  const sh = sheet_(ORDERS_SHEET_NAME_);
  if (!sh || sh.getLastRow() < 2) return { ok: true, orders: [], newCount: 0 };
  const vals = sh.getDataRange().getDisplayValues();
  const h = vals[0].map(function (x) { return String(x).trim(); });
  const center = String(p.center || '').trim();
  const status = String(p.status || '').trim();
  let newCount = 0;
  let orders = [];
  for (let i = 1; i < vals.length; i++) {
    const o = {};
    h.forEach(function (k, j) { if (k) o[k] = vals[i][j]; });
    if (!o['معرف'] && !o['اسم المركز']) continue;
    const st = String(o['الحالة'] || '').trim() || 'جديد';
    o['الحالة'] = st;
    if (st === 'جديد') newCount++;
    if (center && String(o['اسم المركز']).trim() !== center) continue;
    if (status && st !== status) continue;
    o.items = parseOrderDetails_(o['تفاصيل الطلب']);
    orders.push(o);
  }
  orders.reverse(); // الأحدث أولاً
  if (p.countOnly) return { ok: true, newCount: newCount };
  return { ok: true, orders: orders.slice(0, 400), total: orders.length, newCount: newCount };
}

function setCanteenOrderStatus_(p) {
  const id = String(p.id || '').trim();
  const status = String(p.status || '').trim();
  if (!id) return { ok: false, error: 'معرف الطلب مطلوب' };
  if (ORDER_STATUSES_.indexOf(status) === -1) return { ok: false, error: 'حالة غير صحيحة' };
  const sh = sheet_(ORDERS_SHEET_NAME_);
  if (!sh) return { ok: false, error: 'شيت الطلبات غير موجود' };
  let col = colIndex_(sh, 'الحالة');
  if (col === -1) {
    col = sh.getLastColumn() + 1;
    sh.getRange(1, col).setValue('الحالة').setFontWeight('bold');
    _headerRowCache_ = {};
  }
  const idCol = colIndex_(sh, 'معرف');
  const ids = sh.getRange(2, idCol, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) {
      sh.getRange(i + 2, col).setValue(status === 'جديد' ? '' : status);
      return { ok: true };
    }
  }
  return { ok: false, error: 'لم يُعثر على الطلب' };
}

/* بريد الطلب: جدول مرتّب بنفس ترتيب النموذج الورقي (للعرض والتصوير) + «نص الطلب» عادي جاهز للنسخ
   واللصق (واتساب أو غيره). الرسالة كلها نص حقيقي وليست صورة، فيمكن تحديد أي جزء منها ونسخه. */
function canteenOrderText_(o, center) {
  const L = [];
  L.push('طلبات بضاعة المقصف لمركز / ' + center);
  L.push('الفترة: ' + o.period);
  L.push('الفصل الدراسي: ' + o.term + ' — ' + o.year);
  L.push('تاريخ الطلب: ' + o.now.day + ' ' + o.now.date);
  if (o.masoulaName) L.push('مسؤولة المقصف: ' + o.masoulaName);
  if (o.managerName) L.push('مديرة المركز: ' + o.managerName);
  L.push('');
  L.push('الأصناف (' + o.items.length + '):');
  o.items.forEach(function (it, i) {
    L.push((i + 1) + ') ' + it.name + ' — ' + it.qty + ' ' + it.unit + (it.other ? ' (صنف إضافي)' : ''));
  });
  if (o.notes) { L.push(''); L.push('ملاحظات: ' + o.notes); }
  return L.join('\n');
}

/* ملف PDF للطلب (يُرفق بالبريد): يُبنى من HTML بسيط ويحوّله Apps Script إلى PDF بدون أي صلاحيات إضافية.
   تنسيق بسيط بالجداول فقط لأن محوّل قوقل يدعم جزءاً محدوداً من CSS. */
// الكليشة الحمراء (furqan-letterhead.jpg) مضمّنة كنص Base64 لأن محوّل PDF في Apps Script لا يجلب الصور من الروابط
const ORDER_LETTERHEAD_B64_ = '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';

function canteenOrderPdf_(o, center) {
  const e = htmlEsc_;
  const B = 'border:1px solid #9a9a9a;';
  const rows = o.items.map(function (it, i) {
    const carton = it.unit === 'كرتون';
    return '<tr>' +
      '<td style="' + B + 'text-align:center;padding:5px;">' + (i + 1) + '</td>' +
      '<td style="' + B + 'padding:5px 8px;font-weight:bold;">' + e(it.name) + (it.other ? ' <span style="font-weight:normal;color:#666;font-size:10pt;">(صنف إضافي)</span>' : '') + '</td>' +
      '<td style="' + B + 'text-align:center;padding:5px;">' + (carton ? '' : '✔ ' + e(it.unit)) + '</td>' +
      '<td style="' + B + 'text-align:center;padding:5px;">' + (carton ? '✔' : '') + '</td>' +
      '<td style="' + B + 'text-align:center;padding:5px;font-weight:bold;font-size:13pt;">' + it.qty + '</td></tr>';
  }).join('');
  const info = function (k, v) {
    return '<td style="padding:3px 0;color:#555;width:16%;">' + k + '</td><td style="padding:3px 0;font-weight:bold;width:34%;">' + e(v || '—') + '</td>';
  };
  const th = function (t, w) { return '<th style="' + B + 'background:#6e1523;color:#ffffff;padding:6px;' + (w ? 'width:' + w + ';' : '') + '">' + t + '</th>'; };
  const html = '<html dir="rtl"><head><meta charset="UTF-8"></head>' +
    '<body dir="rtl" style="font-family:Arial,Tahoma,sans-serif;font-size:12pt;color:#222;direction:rtl;text-align:right;">' +
    '<img src="data:image/jpeg;base64,' + ORDER_LETTERHEAD_B64_ + '" style="width:100%;display:block;">' +
    '<div style="text-align:center;color:#8C1A2C;font-size:17pt;font-weight:bold;margin:14px 0 4px;">طلبات بضاعة المقصف لمركز / ' + e(center) + '</div>' +
    '<table dir="rtl" style="width:100%;margin:12px 0;font-size:11.5pt;border-collapse:collapse;">' +
      '<tr>' + info('الفترة', o.period) + info('الفصل الدراسي', o.term + ' — ' + o.year) + '</tr>' +
      '<tr>' + info('تاريخ الطلب', o.now.day + ' ' + o.now.date + ' — ' + o.now.time) + info('عدد الأصناف', String(o.items.length)) + '</tr>' +
      '<tr>' + info('مسؤولة المقصف', o.masoulaName) + info('مديرة المركز', o.managerName) + '</tr>' +
    '</table>' +
    '<table dir="rtl" style="width:100%;border-collapse:collapse;font-size:11.5pt;">' +
      '<tr>' + th('م', '6%') + th('الصنف') + th('علبة / كيس', '15%') + th('كرتون', '11%') + th('العدد', '11%') + '</tr>' +
      rows + '</table>' +
    (o.notes ? '<p style="margin-top:12px;"><b style="color:#6e1523;">ملاحظات: </b>' + e(o.notes) + '</p>' : '') +
    '</body></html>';
  const name = ('طلب مقصف - ' + center + ' - ' + o.now.date + '.pdf').replace(/[\\/:*?"<>|]+/g, '-');
  return Utilities.newBlob(html, MimeType.HTML, 'order.html').getAs(MimeType.PDF).setName(name);
}

function notifyCanteenOrder_(o) {
  if (!ORDERS_NOTIFY_EMAIL || ORDERS_NOTIFY_EMAIL.indexOf('@example.com') !== -1) return false;
  try {
    const center = centerDisplay_(o.center);
    const subject = ('طلب مقصف — ' + center + ' — ' + o.period + ' — ' + o.now.date)
      .replace(/[\r\n]+/g, ' ');

    const B = 'border:1px solid #d6d6d6;';
    const th = function (t, w) {
      return '<th style="' + B + 'background:#6e1523;color:#ffffff;padding:8px 6px;font-size:14px;text-align:center;' + (w ? 'width:' + w + ';' : '') + '">' + t + '</th>';
    };
    const rows = o.items.map(function (it, i) {
      const bg = '#ffffff';
      const tick = '<span style="color:#6e1523;font-weight:bold;">✔</span>';
      const isCarton = it.unit === 'كرتون';
      return '<tr style="background:' + bg + ';">' +
        '<td style="' + B + 'padding:7px 6px;text-align:center;color:#6f6467;">' + (i + 1) + '</td>' +
        '<td style="' + B + 'padding:7px 10px;font-weight:bold;">' + htmlEsc_(it.name) +
          (it.other ? ' <span style="color:#8a7d76;font-weight:normal;font-size:12px;">(صنف إضافي)</span>' : '') + '</td>' +
        '<td style="' + B + 'padding:7px 6px;text-align:center;">' + (isCarton ? '' : tick + '<div style="font-size:11px;color:#6f6467;">' + htmlEsc_(it.unit) + '</div>') + '</td>' +
        '<td style="' + B + 'padding:7px 6px;text-align:center;">' + (isCarton ? tick : '') + '</td>' +
        '<td style="' + B + 'padding:7px 6px;text-align:center;font-weight:bold;font-size:16px;color:#6e1523;">' + it.qty + '</td></tr>';
    }).join('');
    const table =
      '<table dir="rtl" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;font-size:14px;">' +
      '<thead><tr>' + th('م', '34px') + th('الصنف') + th('علبة / كيس', '74px') + th('كرتون', '60px') + th('العدد', '60px') + '</tr></thead>' +
      '<tbody>' + rows + '</tbody></table>';

    const info = function (k, v) {
      return v ? '<tr><td style="padding:3px 0;color:#6f6467;width:120px;">' + k + '</td><td style="padding:3px 0;font-weight:bold;">' + htmlEsc_(v) + '</td></tr>' : '';
    };
    const text = canteenOrderText_(o, center);

    const html = '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:640px;margin:auto;color:#2b2325;text-align:right;">' +
      '<img src="https://furqan1448.github.io/almaqasif/furqan-letterhead.jpg" alt="جمعية فرقان لتحفيظ القرآن الكريم" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;">' +
      '<div style="background:#6e1523;color:#ffffff;padding:12px 16px;">' +
        '<div style="font-size:12px;opacity:.85;">جمعية فرقان لتحفيظ القرآن الكريم — وحدة المقاصف</div>' +
        '<div style="font-size:18px;font-weight:bold;margin-top:2px;">طلبات بضاعة المقصف لمركز / ' + htmlEsc_(center) + '</div></div>' +
      '<div style="border:1px solid #e2e2e2;border-top:0;padding:14px 16px;border-radius:0 0 10px 10px;">' +
      '<table style="font-size:14px;border-collapse:collapse;margin-bottom:12px;">' +
        info('الفترة', o.period) + info('الفصل الدراسي', o.term + ' — ' + o.year) +
        info('تاريخ الطلب', o.now.day + ' ' + o.now.date + ' — ' + o.now.time) +
        info('مسؤولة المقصف', o.masoulaName) + info('مديرة المركز', o.managerName) +
      '</table>' +
      table +
      (o.notes ? '<div style="margin-top:12px;background:#ffffff;border:1px solid #e2e2e2;border-radius:8px;padding:10px;white-space:pre-wrap;"><b style="color:#6e1523;">ملاحظات: </b>' + htmlEsc_(o.notes) + '</div>' : '') +
      '<div style="margin-top:14px;font-size:13px;color:#6f6467;">📎 الطلب مرفق أيضًا بملف PDF أسفل الرسالة.</div>' +
      '<div style="margin-top:22px;color:#6e1523;font-weight:bold;font-size:15px;">نص الطلب (للنسخ)</div>' +
      '<div style="font-size:12px;color:#6f6467;margin:2px 0 6px;">اضغطي مطوّلًا على النص التالي ثم «تحديد الكل» و«نسخ»، والصقيه حيث تريدين.</div>' +
      '<div style="background:#ffffff;border:1px dashed #d6d6d6;border-radius:8px;padding:12px;font-size:14px;line-height:1.9;">' +
        htmlEsc_(text).replace(/\n/g, '<br>') + '</div>' +
      '<p style="color:#6f6467;font-size:12px;margin-top:18px;">الطلب محفوظ أيضًا في شيت «' + ORDERS_SHEET_NAME_ + '». — نظام وحدة المقاصف</p>' +
      '</div></div>';

    const mail = { to: ORDERS_NOTIFY_EMAIL, subject: subject, body: text, htmlBody: html, name: 'نظام وحدة المقاصف' };
    // ملف PDF مرفق؛ لو تعذّر إنشاؤه لأي سبب يُرسل البريد بدونه (ما نخسر الإشعار)
    try { mail.attachments = [canteenOrderPdf_(o, center)]; } catch (pdfErr) { Logger.log('تعذّر إنشاء PDF الطلب: ' + pdfErr); }
    MailApp.sendEmail(mail);
    return true;
  } catch (e) {
    Logger.log('تعذّر إرسال بريد طلب المقصف: ' + e);
    return false;
  }
}

/* تقرير سرعة (تشغيل يدوي من قائمة الدوال ▶️ Run): يوضح حجم كل شيت وأثقل عمود فيه، عشان نعرف
   وين البطء بالضبط. يقرأ كل الشيتات مرة وحدة فقط (قد ياخذ دقيقة أو أكثر لو البيانات كبيرة). */
function speedReport() {
  const t0 = Date.now();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = [];
  ss.getSheets().forEach(function (sh) {
    if (Date.now() - t0 > 240000) return; // نتوقف قبل حد الوقت
    const rows = Math.max(sh.getLastRow() - 1, 0);
    const cols = sh.getLastColumn();
    if (!rows || !cols) return;
    try {
      const headers = sh.getRange(1, 1, 1, cols).getValues()[0].map(function (h) { return String(h).trim(); });
      const data = sh.getRange(2, 1, rows, cols).getValues();
      const sizes = headers.map(function () { return 0; });
      for (let r = 0; r < data.length; r++) {
        for (let c = 0; c < cols; c++) { const v = data[r][c]; if (v !== '' && v !== null) sizes[c] += String(v).length; }
      }
      const skip = skipColsFor_(sh.getName()) || [];
      let total = 0, light = 0, heavyIdx = 0;
      sizes.forEach(function (n, c) {
        total += n;
        if (skip.indexOf(headers[c]) === -1) light += n;
        if (n > sizes[heavyIdx]) heavyIdx = c;
      });
      report.push({
        name: sh.getName(), rows: rows, totalKB: Math.round(total / 1024), lightKB: Math.round(light / 1024),
        heaviest: headers[heavyIdx], heaviestKB: Math.round(sizes[heavyIdx] / 1024)
      });
    } catch (e) { report.push({ name: sh.getName(), rows: rows, totalKB: -1, lightKB: -1, heaviest: String(e), heaviestKB: 0 }); }
  });
  report.sort(function (a, b) { return b.totalKB - a.totalKB; });
  const lines = report.map(function (x) {
    return x.name + ': ' + x.rows + ' صف — الحجم ' + x.totalKB + ' ك.ب' +
      (x.lightKB !== x.totalKB ? ' (الجزء الذي يُقرأ فعلياً ' + x.lightKB + ' ك.ب)' : '') +
      ' — أثقل عمود: «' + x.heaviest + '» ' + x.heaviestKB + ' ك.ب';
  });
  Logger.log(lines.join('\n'));
  notify_('تقرير حجم الشيتات (الأكبر أولاً):\n\n' + lines.slice(0, 12).join('\n') +
    '\n\nحد الذاكرة المؤقتة لكل شيت تقريباً ' + Math.round(CACHE_CHUNK_CHARS_ * CACHE_MAX_CHUNKS_ / 1024) + ' ك.ب؛ أي شيت (مما يُقرأ فعلياً) فوق هذا الحد يُقرأ كاملاً من قوقل شيتس بكل طلب.');
}

/* ======================= تقييم مسؤولة المقصف =======================
   نفس فكرة الإشعار: مديرة المركز تعبّئ الاستمارة (البيانات الشخصية + بنود المديرة من ٥٠) وتوقّع وترسلها،
   ثم الإدارة (رئيسة وحدة المقاصف) تضيف درجات بنودها (من ٥٠) وتوقّع وتعتمد.
   - يظهر فقط للمراكز التي فيها مسؤولة مقصف (المركز «وضع العرض فقط» = نعم، أو مربوطة به مسؤولة بشيت «المسؤولات»).
   - مسؤولة المقصف لا تراه أبداً: لا يوجد في صفحة المسؤولات، وكل طلبات المركز تحتاج كلمة مرور المركز،
     وطلبات الإدارة تحتاج كلمة مرور الإدارة.
   - التواقيع محفوظة داخل الشيت ولا تُقرأ مع القائمة (تُجلب عند فتح التقييم فقط) حتى تبقى سريعة. */
const EVAL_SHEET_ = 'تقييم مسؤولات المقاصف';
const EVAL_HEADERS_ = ['معرف', 'اسم المركز', 'اسم المسؤولة', 'الفترة', 'الفصل الدراسي', 'العام', 'بيانات التقييم',
  'درجة المديرة', 'درجة الوحدة', 'المجموع الكلي', 'الحالة',
  'اسم المديرة', 'توقيع المديرة', 'يوم الإرسال', 'تاريخ الإرسال', 'وقت الإرسال',
  'اسم الرئيسة', 'توقيع الرئيسة', 'يوم الاعتماد', 'تاريخ الاعتماد', 'وقت الاعتماد'];
const EVAL_DIR_MAX_ = [2, 7, 6, 10, 5, 5, 5, 5, 5];     // بنود خاصة بمديرة المركز (المجموع ٥٠)
const EVAL_HEAD_MAX_ = [5, 10, 10, 2, 5, 13, 5];        // بنود خاصة برئيسة وحدة المقاصف (المجموع ٥٠)
const EVAL_PENDING_ = 'بانتظار اعتماد الوحدة';
const EVAL_DONE_ = 'تم الاعتماد';
SKIP_READ_COLS_[EVAL_SHEET_] = ['توقيع المديرة', 'توقيع الرئيسة'];

function evalSheet_() {
  let sh = sheet_(EVAL_SHEET_);
  if (!sh) {
    sh = SpreadsheetApp.getActiveSpreadsheet().insertSheet(EVAL_SHEET_);
    sh.getRange(1, 1, 1, EVAL_HEADERS_.length).setValues([EVAL_HEADERS_]).setFontWeight('bold');
    sh.setRightToLeft(true);
    sh.getRange(2, 1, sh.getMaxRows() - 1, EVAL_HEADERS_.length).setNumberFormat('@');
  }
  return sh;
}

function evalRows_() {
  if (!sheet_(EVAL_SHEET_)) return [];
  return sheetToObjects_(EVAL_SHEET_);
}

/* التحقق من كلمة مرور المركز (نفس بيانات الدخول) */
function evalCenterAuth_(p) {
  const center = String(p.center || '').trim();
  const password = String(p.password || '').trim();
  if (!center || !password) return { ok: false, auth: true, error: 'يُرجى إدخال كلمة مرور المركز' };
  const rows = sheetToObjects_('المراكز', CACHE_SECONDS_LONG);
  const found = rows.find(function (r) {
    return String(r['اسم المركز']).trim() === center && String(r['كلمة المرور']).trim() === password;
  });
  if (!found) return { ok: false, auth: true, error: 'كلمة مرور المركز غير صحيحة' };
  return { ok: true, row: found };
}

function evalMasoulatOf_(center) {
  const c = String(center || '').trim();
  return sheetToObjects_('المسؤولات', CACHE_SECONDS_LONG)
    .filter(function (r) { return String(r['اسم المركز'] || '').trim() === c && String(r['الاسم'] || '').trim(); })
    .map(function (r) { return String(r['الاسم']).trim(); });
}

function evalEligible_(centerRow) {
  if (String(centerRow['وضع العرض فقط'] || '').trim() === 'نعم') return true;
  // عمود اختياري بشيت «المراكز» اسمه «تفعيل التقييم»: نعم = تظهر أيقونة التقييم حتى لو المركز ليس بوضع العرض فقط
  if (String(centerRow['تفعيل التقييم'] || '').trim() === 'نعم') return true;
  return evalMasoulatOf_(centerRow['اسم المركز']).length > 0;
}

function evalParseData_(r) {
  try { return JSON.parse(r['بيانات التقييم'] || '{}'); } catch (e) { return {}; }
}

function evalOut_(r) {
  return {
    id: r['معرف'], center: r['اسم المركز'], masoula: r['اسم المسؤولة'] || '',
    period: r['الفترة'] || '', term: r['الفصل الدراسي'] || '', year: r['العام'] || '',
    data: evalParseData_(r),
    dirTotal: r['درجة المديرة'], headTotal: r['درجة الوحدة'], total: r['المجموع الكلي'],
    status: r['الحالة'] || EVAL_PENDING_,
    directorName: r['اسم المديرة'] || '', sentDay: r['يوم الإرسال'] || '', sentDate: r['تاريخ الإرسال'] || '', sentTime: r['وقت الإرسال'] || '',
    headName: r['اسم الرئيسة'] || '', signedDay: r['يوم الاعتماد'] || '', signedDate: r['تاريخ الاعتماد'] || '', signedTime: r['وقت الاعتماد'] || ''
  };
}

function findEval_(id) {
  const t = String(id || '').trim();
  if (!t) return null;
  return evalRows_().find(function (r) { return String(r['معرف']).trim() === t; }) || null;
}

/* يتحقق من الدرجات: كل درجة رقم بين ٠ والدرجة المستحقة. يرجّع {ok, scores, total} */
function evalCheckScores_(arr, maxes, label) {
  if (!Array.isArray(arr) || arr.length !== maxes.length) return { ok: false, error: 'أكملي درجات ' + label };
  const scores = [];
  let total = 0;
  for (let i = 0; i < maxes.length; i++) {
    const raw = String(arr[i] === undefined || arr[i] === null ? '' : arr[i])
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); }).replace('٫', '.').trim();
    if (raw === '') return { ok: false, error: 'أكملي درجات ' + label + ' (البند ' + (i + 1) + ')' };
    const n = Number(raw);
    if (isNaN(n) || n < 0 || n > maxes[i]) return { ok: false, error: 'درجة البند ' + (i + 1) + ' من ' + label + ' يجب أن تكون بين ٠ و' + maxes[i] };
    scores.push(n);
    total += n;
  }
  return { ok: true, scores: scores, total: Math.round(total * 100) / 100 };
}

function evalSetRow_(sh, row, obj) {
  Object.keys(obj).forEach(function (k) {
    const c = colIndex_(sh, k);
    if (c > 0) sh.getRange(row, c).setValue(obj[k]);
  });
}

/* ---- صفحة المراكز ---- */
function getMasoulaEvalCtx_(p) {
  const auth = evalCenterAuth_(p);
  if (!auth.ok) return auth;
  return { ok: true, eligible: evalEligible_(auth.row), masoulat: evalMasoulatOf_(auth.row['اسم المركز']) };
}

function getMasoulaEvalsForCenter_(p) {
  const auth = evalCenterAuth_(p);
  if (!auth.ok) return auth;
  const c = String(p.center).trim();
  return { ok: true, evals: evalRows_().filter(function (r) { return String(r['اسم المركز']).trim() === c; }).reverse().map(evalOut_) };
}

/* إرسال تقييم جديد (بدون p.id) أو تعديل تقييم لم يُعتمد بعد (مع p.id) - من المديرة */
function submitMasoulaEval_(p) {
  const auth = evalCenterAuth_(p);
  if (!auth.ok) return auth;
  if (!evalEligible_(auth.row)) return { ok: false, error: 'التقييم متاح فقط للمراكز التي فيها مسؤولة مقصف' };
  const center = String(p.center).trim();
  let d = p.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = {}; } }
  d = d || {};
  const masoula = String(d.name || '').trim();
  if (!masoula) return { ok: false, error: 'اكتبي اسم مسؤولة المقصف' };
  if (!d.term) return { ok: false, error: 'اختاري الفصل الدراسي' };
  const chk = evalCheckScores_(d.dirScores, EVAL_DIR_MAX_, 'بنود مديرة المركز');
  if (!chk.ok) return chk;
  const directorName = String(p.directorName || '').trim();
  if (!directorName) return { ok: false, error: 'اكتبي اسم مديرة المركز' };
  const sig = String(p.signature || '');
  if (!sig) return { ok: false, error: 'التوقيع مطلوب' };
  if (sig.length > 45000) return { ok: false, error: 'صورة التوقيع كبيرة جداً' };

  const data = {
    period: String(d.period || ''), term: String(d.term || ''), year: String(d.year || ''),
    name: masoula, phone: String(d.phone || ''), juz: String(d.juz || ''), marital: String(d.marital || ''),
    birthplace: String(d.birthplace || ''), experience: String(d.experience || ''),
    quranQual: String(d.quranQual || ''), eduQual: String(d.eduQual || ''), evalDate: String(d.evalDate || ''),
    dirScores: chk.scores, headScores: [],
    positives: String(d.positives || ''), improvements: String(d.improvements || '')
  };
  const json = JSON.stringify(data);
  if (json.length > 45000) return { ok: false, error: 'النص المكتوب طويل جداً' };

  const sh = evalSheet_();
  const now = nowParts_();
  const vals = {
    'اسم المركز': center, 'اسم المسؤولة': masoula, 'الفترة': data.period, 'الفصل الدراسي': data.term, 'العام': data.year,
    'بيانات التقييم': json, 'درجة المديرة': chk.total, 'درجة الوحدة': '', 'المجموع الكلي': '', 'الحالة': EVAL_PENDING_,
    'اسم المديرة': directorName, 'توقيع المديرة': sig,
    'يوم الإرسال': now.day, 'تاريخ الإرسال': now.date, 'وقت الإرسال': now.time
  };
  let id = p.id;
  if (id) {
    const row = findEval_(id);
    if (!row) return { ok: false, error: 'التقييم غير موجود (ربما حُذف)' };
    if (String(row['اسم المركز']).trim() !== center) return { ok: false, error: 'هذا التقييم لا يتبع هذا المركز' };
    if (row['الحالة'] === EVAL_DONE_) return { ok: false, error: 'تم اعتماد هذا التقييم من الوحدة ولا يمكن تعديله' };
    evalSetRow_(sh, row._row, vals);
  } else {
    id = Utilities.getUuid();
    vals['معرف'] = id;
    appendRowByHeaders_(sh, vals);
  }
  invalidateCache_(EVAL_SHEET_);
  notifyAdminNewEval_(center, masoula, data.term, now, !!p.id);
  return { ok: true, id: id };
}

function notifyAdminNewEval_(center, masoula, term, now, isEdit) {
  center = centerDisplay_(center);
  if (!ADMIN_NOTIFY_EMAIL || ADMIN_NOTIFY_EMAIL.indexOf('@example.com') !== -1) return;
  try {
    MailApp.sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: (isEdit ? 'تعديل ' : '') + 'تقييم مسؤولة المقصف من ' + center + ' - وحدة المقاصف',
      body: 'السلام عليكم،\n\n' +
        (isEdit ? 'عدّلت' : 'أرسلت') + ' مديرة مركز "' + center + '" استمارة تقييم مسؤولة المقصف بعد توقيعها.\n' +
        'اسم المسؤولة: ' + masoula + '\n' + 'الفصل الدراسي: ' + term + '\n' +
        'اليوم: ' + now.day + '\nالتاريخ: ' + now.date + '\nالوقت: ' + now.time + '\n\n' +
        'الرجاء الدخول للوحة إدارة وحدة المقاصف ← «تقييم مسؤولات المقاصف» لإضافة درجات الوحدة والتوقيع.\n\n' +
        '— نظام وحدة المقاصف، جمعية فرقان لتحفيظ القرآن الكريم'
    });
  } catch (e) {}
}

/* التواقيع لتقييم واحد (للعرض وملف PDF) - للمركز صاحب التقييم أو للإدارة */
function getMasoulaEvalSigs_(p) {
  const row = findEval_(p.id);
  if (!row) return { ok: false, error: 'التقييم غير موجود' };
  if (p.adminPw) {
    const a = loginAdmin_({ password: p.adminPw });
    if (!a.ok) return { ok: false, auth: true, error: a.error };
  } else {
    const auth = evalCenterAuth_(p);
    if (!auth.ok) return auth;
    if (String(row['اسم المركز']).trim() !== String(p.center).trim()) return { ok: false, error: 'هذا التقييم لا يتبع هذا المركز' };
  }
  const sh = evalSheet_();
  const id = String(row['معرف']).trim();
  let r = row._row;
  const idCol = colIndex_(sh, 'معرف');
  if (String(sh.getRange(r, idCol).getValue()).trim() !== id) {
    const ids = sh.getRange(1, idCol, sh.getLastRow(), 1).getValues();
    r = -1;
    for (let k = 1; k < ids.length; k++) { if (String(ids[k][0]).trim() === id) { r = k + 1; break; } }
    if (r === -1) return { ok: false, error: 'التقييم غير موجود' };
  }
  const read = function (h) { const c = colIndex_(sh, h); return c > 0 ? String(sh.getRange(r, c).getValue() || '') : ''; };
  return { ok: true, directorSig: read('توقيع المديرة'), headSig: read('توقيع الرئيسة') };
}

function deleteMasoulaEval_(p) {
  const row = findEval_(p.id);
  if (!row) return { ok: false, error: 'التقييم غير موجود' };
  if (p.adminPw) {
    const a = loginAdmin_({ password: p.adminPw });
    if (!a.ok) return { ok: false, auth: true, error: a.error };
  } else {
    const auth = evalCenterAuth_(p);
    if (!auth.ok) return auth;
    if (String(row['اسم المركز']).trim() !== String(p.center).trim()) return { ok: false, error: 'هذا التقييم لا يتبع هذا المركز' };
    if (row['الحالة'] === EVAL_DONE_) return { ok: false, error: 'تم اعتماد هذا التقييم ولا يمكن حذفه' };
  }
  evalSheet_().deleteRow(row._row);
  invalidateCache_(EVAL_SHEET_);
  return { ok: true };
}

/* ---- لوحة الإدارة ---- */
function getMasoulaEvalsAdmin_(p) {
  const a = loginAdmin_({ password: p.adminPw });
  if (!a.ok) return { ok: false, auth: true, error: a.error };
  return { ok: true, evals: evalRows_().slice().reverse().map(evalOut_) };
}

function getMasoulaEvalPendingCount_(p) {
  const a = loginAdmin_({ password: p.adminPw });
  if (!a.ok) return { ok: false, auth: true, error: a.error };
  return { ok: true, count: evalRows_().filter(function (r) { return (r['الحالة'] || EVAL_PENDING_) === EVAL_PENDING_; }).length };
}

/* اعتماد الإدارة: درجات بنود الرئيسة + الإيجابيات ونقاط التحسين + الاسم والتوقيع.
   يمكن إعادة الحفظ بعد الاعتماد للتعديل (p.keepSig = إبقاء التوقيع السابق). */
function adminSignMasoulaEval_(p) {
  const a = loginAdmin_({ password: p.adminPw });
  if (!a.ok) return { ok: false, auth: true, error: a.error };
  const row = findEval_(p.id);
  if (!row) return { ok: false, error: 'التقييم غير موجود' };
  const chk = evalCheckScores_(p.headScores, EVAL_HEAD_MAX_, 'بنود رئيسة وحدة المقاصف');
  if (!chk.ok) return chk;
  const headName = String(p.headName || '').trim();
  if (!headName) return { ok: false, error: 'اكتبي اسم رئيسة وحدة المقاصف' };
  const sig = String(p.signature || '');
  if (!sig && !p.keepSig) return { ok: false, error: 'التوقيع مطلوب' };
  if (sig.length > 45000) return { ok: false, error: 'صورة التوقيع كبيرة جداً' };

  const data = evalParseData_(row);
  data.headScores = chk.scores;
  if (p.positives !== undefined) data.positives = String(p.positives || '');
  if (p.improvements !== undefined) data.improvements = String(p.improvements || '');
  const dirTotal = Number(row['درجة المديرة']) || 0;
  const now = nowParts_();
  const sh = evalSheet_();
  const vals = {
    'بيانات التقييم': JSON.stringify(data), 'درجة الوحدة': chk.total,
    'المجموع الكلي': Math.round((dirTotal + chk.total) * 100) / 100, 'الحالة': EVAL_DONE_,
    'اسم الرئيسة': headName, 'يوم الاعتماد': now.day, 'تاريخ الاعتماد': now.date, 'وقت الاعتماد': now.time
  };
  if (sig) vals['توقيع الرئيسة'] = sig;
  evalSetRow_(sh, row._row, vals);
  invalidateCache_(EVAL_SHEET_);
  return { ok: true };
}
