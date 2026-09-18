// modules/utils.js
import { CATEGORIES, ALIAS } from "./constants.js";

export const toFa = n => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);

export function topicInfo(id) {
  for (const c of CATEGORIES) for (const t of c.topics) if (t.id === id) return t;
  return { id, label: "❓ تصمیم دیگر", short: "تصمیم تو" };
}

export function topicShort(id) { return topicInfo(id).short || "تصمیم تو"; }

export function topicKey(id) { const t = topicInfo(id); return t.key || t.id; }

export function pickIndex() {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] % 1; // اینجا فقط place-holder؛ در handlers از CONTENT.length استفاده می‌شود
}

export function isUserAllowed(env, chatId) {
  const list = (env.ALLOWED_USERS || "").trim();
  if (!list) return true;
  return list.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).includes(chatId);
}

export function isUserAdmin(env, chatId) {
  const list = (env.ADMIN_USERS || "").trim();
  if (!list) return false;
  return list.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).includes(chatId);
}

export function checkAdminSecret(env, url) {
  const provided = url.searchParams.get("auth") || "";
  const secret = (env.ADMIN_SECRET || "").trim();
  return secret && provided === secret;
}

export function buildReferralLink(username, chatId) {
  if (!username) return null;
  return "https://ble.ir/" + username + "?start=ref_" + chatId;
}

export function renderAction(a) {
  if (Array.isArray(a)) return a.map(x => "-   " + x).join("\n");
  return a || "";
}

export function renderCorePoints(cp) {
  if (!Array.isArray(cp) || cp.length === 0) return "";
  return cp.map(c => "• " + c).join("\n");
}

export function topicBlockV5(r, t) {
  const k = topicKey(t);
  const T = (r.topics || {})[k] || (r.topics || {})[ALIAS[t]];
  if (T) return T;
  return {
    verdict: r.level || r.verdict || "میانه",
    badge: r.badge || "⚖️",
    result_detail: "",
    core_points: [],
    tip: r.core_message || "",
    warning: "این موضوع به‌صورت اختصاصی برای این صفحه تفسیر نشده؛ با احتیاط و مشورت پیش برو.",
    actions: [
      "💪 به پیام محوری آیه توجه کن و با بررسی دقیق تصمیم بگیر.",
      "🤝 با یک فرد خبره یا مشاور کارآزموده مشورت کن.",
      "🤲 صدقه بده و با توکل بر خدا اقدام کن.",
      "📿 دعای موضوع — متن کامل در بخش «📿 ادعیه و اذکار».",
    ],
    summary: r.final_summary || "",
    dua_ref: null,
    topic_hook: null,
  };
}