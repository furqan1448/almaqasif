// js/auth.js
// منطق تسجيل الدخول والتحقق من الجلسة، وربط المستخدمة بدورها من Firestore

import { auth, db } from "./firebase/config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { ROLE_LANDING_PAGE, roleLabel } from "./firebase/roles.js";

// المسار الجذري لموقع النظام (يُحسب تلقائيًا من مكان ملف auth.js نفسه،
// بحيث يعمل الخروج بشكل صحيح سواء كان الموقع على GitHub Pages داخل
// مجلد فرعي مثل /furqan-reports/ أو على دومين مباشر)
const APP_ROOT_URL = new URL("../", import.meta.url);
function loginPageUrl() {
  return new URL("login.html", APP_ROOT_URL).href;
}

// تسجيل الدخول بالبريد وكلمة المرور
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, "users", cred.user.uid));
  if (!userDoc.exists()) {
    throw new Error("لا يوجد حساب مرتبط بهذا المستخدم في النظام. تواصلي مع إدارة النظام.");
  }
  return { uid: cred.user.uid, ...userDoc.data() };
}

// تسجيل الخروج
export async function logout() {
  sessionStorage.removeItem("furqan_active_report_id");
  await signOut(auth);
  window.location.href = loginPageUrl();
}

// حماية الصفحات: يُستدعى في كل صفحة داخلية للتأكد من وجود جلسة صالحة
export function requireAuth(onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = loginPageUrl();
      return;
    }
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      await signOut(auth);
      window.location.href = loginPageUrl();
      return;
    }
    const profile = { uid: user.uid, ...userDoc.data() };
    onReady(profile);
  });
}

// توجيه المستخدمة بعد الدخول حسب دورها
export function redirectByRole(profile) {
  const target = ROLE_LANDING_PAGE[profile.role] || "dashboard.html";
  window.location.href = target;
}

export { roleLabel };
