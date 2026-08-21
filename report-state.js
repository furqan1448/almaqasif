// js/report-state.js
// إدارة "التقرير الحالي" (مسودة) التي تُبنى منها كل الأقسام الـ15
// كل مستخدمة تعمل على مسودة واحدة نشطة في كل مرة، محفوظة في Firestore
// ويُحفظ معرّف المسودة في sessionStorage أثناء التنقل بين الصفحات.

import { db } from "./firebase/config.js";
import {
  collection, doc, getDoc, setDoc, updateDoc, query, where,
  getDocs, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const REPORTS_COLLECTION = "reports";
const SESSION_KEY = "furqan_active_report_id";

// تُرجع معرّف مسودة نشطة للمستخدمة الحالية، أو تُنشئ واحدة جديدة إن لم توجد
export async function getOrCreateDraftReport(profile) {
  const cached = sessionStorage.getItem(SESSION_KEY);
  if (cached) {
    const existing = await getDoc(doc(db, REPORTS_COLLECTION, cached));
    // تأكيد إضافي: التقرير المخزّن مؤقتًا يخص نفس المستخدمة الحالية فعلاً
    // (يمنع مشكلة ظهور مسودة موظفة أخرى عند تبديل الحسابات بنفس الجهاز)
    if (existing.exists() && existing.data().status === "draft" && existing.data().ownerUid === profile.uid) {
      return cached;
    }
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ملاحظة: تعمّدنا عدم استخدام orderBy هنا لتجنّب الحاجة لإنشاء
  // فهرس مركّب (composite index) يدويًا في Firebase. بدلاً من ذلك
  // نجلب كل مسودات هذه المستخدمة (عادة عدد قليل جدًا) ونرتّبها في الكود.
  const q = query(
    collection(db, REPORTS_COLLECTION),
    where("ownerUid", "==", profile.uid),
    where("status", "==", "draft")
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const docs = snap.docs
      .map(d => ({ id: d.id, updatedAt: d.data().updatedAt?.toMillis?.() || 0 }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const id = docs[0].id;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  }

  const newDocRef = doc(collection(db, REPORTS_COLLECTION));
  await setDoc(newDocRef, {
    ownerUid: profile.uid,
    ownerName: profile.name || "",
    status: "draft",
    reportNumber: null,
    sharedWith: [],
    basicData: {},
    goals: {},
    indicators: [],
    programs: [],
    measurementTools: [],
    resultsAnalysis: {},
    strengths: [],
    difficulties: [],
    improvementOpportunities: [],
    initiatives: [],
    impactStories: [],
    recommendations: [],
    nextPeriodPlan: [],
    evidence: [],
    reviewApproval: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  sessionStorage.setItem(SESSION_KEY, newDocRef.id);
  return newDocRef.id;
}

export async function loadReport(reportId) {
  const snap = await getDoc(doc(db, REPORTS_COLLECTION, reportId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// دمج (merge) بيانات قسم واحد داخل مستند التقرير
export async function saveSection(reportId, sectionKey, data) {
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    [sectionKey]: data,
    updatedAt: serverTimestamp()
  });
}

// استبدال مصفوفة كاملة (تستخدم للأقسام القابلة للتكرار كالمؤشرات والبرامج)
export async function saveArraySection(reportId, sectionKey, arrayData) {
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    [sectionKey]: arrayData,
    updatedAt: serverTimestamp()
  });
}

export function clearActiveReport() {
  sessionStorage.removeItem(SESSION_KEY);
}

// إرسال (مشاركة) التقرير مع مستخدمة أخرى عبر بريدها الإلكتروني.
// لا يُرسل بريدًا فعليًا؛ فقط يُضيف البريد إلى قائمة sharedWith داخل مستند
// التقرير، بحيث تجده صاحبة هذا البريد عند دخولها للنظام.
export async function shareReportWithEmail(reportId, email) {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) throw new Error("أدخلي بريدًا إلكترونيًا صحيحًا");
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    sharedWith: arrayUnion(clean),
    updatedAt: serverTimestamp()
  });
  return clean;
}

// جلب كل التقارير التي أُرسلت لبريد إلكتروني معيّن (بريد المستخدمة الحالية)
export async function listReportsSharedWithMe(email) {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) return [];
  const q = query(
    collection(db, REPORTS_COLLECTION),
    where("sharedWith", "array-contains", clean)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
}
