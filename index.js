// ========== 1. IMPORT ==========
import { DurableObject } from "cloudflare:workers";
import { CONTENT } from "./content/index.js";

// ========== 2. CONSTANTS ==========
const API_BASE = "https://tapi.bale.ai";

const CATEGORIES = [
  { id:"family", label:"👪 خانواده", full:"روابط و خانواده", topics:[
    { id:"marriage",   label:"🤵👰 ازدواج",   short:"ازدواج" },
    { id:"proposal",   label:"💐 خواستگاری", short:"خواستگاری", phase:2 },
    { id:"childbirth", label:"🤰 فرزندآوری", short:"فرزندآوری", phase:2 },
    { id:"divorce",    label:"💔 طلاق",      short:"طلاق", hidden:true },
    { id:"breakup",    label:"❌ فسخ",       short:"فسخ", hidden:true },
    { id:"reconcile",  label:"🕊️ آشتی",     short:"آشتی", phase:2 },
  ]},
  { id:"business", label:"💼 کسب‌وکار", full:"شغل و کسب‌وکار", topics:[
    { id:"work",        label:"💼 کار",       short:"کار" },
    { id:"trade",       label:"💰 معامله",    short:"معامله" },
    { id:"partnership", label:"🤝 شراکت",     short:"شراکت", phase:2 },
    { id:"investment",  label:"📈 سرمایه‌گذاری", short:"سرمایه‌گذاری" },
    { id:"resign",      label:"🚪 استعفا",    short:"استعفا", phase:2 },
    { id:"business2",   label:"🏪 کسب شخصی", short:"کسب شخصی", phase:2, key:"business" },
    { id:"legal",       label:"⚖️ حقوقی",    short:"حقوقی", phase:2 },
    { id:"loan",        label:"💳 وام",       short:"وام", phase:2 },
  ]},
  { id:"asset", label:"🏠 دارایی", full:"دارایی و ملک", topics:[
    { id:"home",      label:"🏠 خانه",  short:"خانه" },
    { id:"car",       label:"🚗 خودرو", short:"خودرو" },
    { id:"guarantee", label:"💸 ضمانت", short:"ضمانت", phase:2 },
  ]},
  { id:"travel", label:"✈️ سفر", full:"سفر و جابجایی", topics:[
    { id:"travel",    label:"✈️ سفر",    short:"سفر" },
    { id:"migration", label:"🌍 مهاجرت", short:"مهاجرت" },
    { id:"moving",    label:"📦 جابجایی", short:"جابجایی", phase:2 },
  ]},
  { id:"study", label:"🎓 تحصیل", full:"تحصیل", topics:[
    { id:"study", label:"🎓 تحصیل", short:"تحصیل" },
  ]},
  { id:"health", label:"🩺 سلامت", full:"سلامت", topics:[
    { id:"health", label:"🩺 سلامتی", short:"سلامتی" },
  ]},
];

const CURRENT_PHASE = 1;

const PACKS = [
  { id:"p10",  credits:10,  bonus:0,  rials:200000,  title:"بستهٔ ۱۰ اعتبار",  label:"۱۰ اعتبار",  desc:"۱۰ اعتبار — ۱۰ استخارهٔ تخصصی", text:"🥉 ۱۰ اعتبار — ۲۰,۰۰۰ تومان" },
  { id:"p30",  credits:30,  bonus:5,  rials:500000,  title:"بستهٔ ۳۵ اعتبار",  label:"۳۵ اعتبار",  desc:"۳۰ اعتبار + ۵ هدیه",          text:"🥈 ۳۵ اعتبار — ۵۰,۰۰۰ تومان" },
  { id:"p100", credits:100, bonus:20, rials:1500000, title:"بستهٔ ۱۲۰ اعتبار", label:"۱۲۰ اعتبار", desc:"۱۰۰ اعتبار + ۲۰ هدیه",        text:"🥇 ۱۲۰ اعتبار — ۱۵۰,۰۰۰ تومان" },
];

const DISCLAIMER = "⚖️ سلب مسئولیت و نکته مهم فقهی: فراموش نکنید که در احکام اسلامی، استخاره جایگزین عقل، تحقیق و مشورت نیست و «وحی منزل» محسوب نمی‌شود. این متن صرفاً یک تفسیر و راهنمای معنوی بر اساس آیات قرآن است. لذا برای تصمیمات حساس زندگی‌تان، حتماً در کنار این استخاره، با متخصصان و مشاوران کارآزمودهٔ آن حوزه مشورت فرمایید. 🤝";

const WELCOME = "🌿 به «نشانِ دل» خوش آمدی.\n\n⚖️ استخاره برای طلب خیر است و جایگزین مشورت نیست.\n\nبرای شروع، «🔮 استخاره» را بزن.";
const RITUAL = "🤲 <b>آداب کوتاه:</b>\n۱. نیتت را روشن کن.\n۲. وضو و رو به قبله.\n۳. سه صلوات.\n\n<b>دعای استخاره:</b>\n«اللّهُمَّ إِنِّی تَفَأَّلْتُ بِکِتابِکَ، وَ تَوَکَّلْتُ عَلَیْکَ، فَأَرِنی مِنْ کِتابِکَ ما هُوَ مَکْتومٌ مِنْ سِرِّکَ المَکْنونِ في غَیْبِکَ»";
const STORE_MSG = "🛍 <b>فروشگاه اعتبار «نشانِ دل»</b>\n\nهر اعتبار = یک استخارهٔ تخصصی با تحلیل کامل موضوع تو\n\nیه بسته انتخاب کن تا صورتحساب کیف‌پولی برات بیاد:";
const NO_CREDIT_MSG = "🌿 دوست عزیز، اعتبارت تموم شده.\n\nبرای دیدن استخارهٔ تخصصی همین موضوع، یکی از بسته‌ها رو انتخاب کن؛ کمتر از یک دقیقه شارژ می‌شه. 🌙";

const toFa = n => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);

const ALIAS = { trade:"transaction", business2:"business" };

// ========== 3. DURABLE OBJECT ==========
export class CreditManager extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);

    // مرحله ۱: ساخت جدول در نصب‌های جدید
    try {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS credits (
          user_id TEXT PRIMARY KEY,
          amount INTEGER NOT NULL DEFAULT 0,
          total_estekhare INTEGER NOT NULL DEFAULT 0,
          total_opens INTEGER NOT NULL DEFAULT 0,
          last_topic TEXT,
          last_page INTEGER,
          unlocked TEXT DEFAULT '[]',
          name TEXT DEFAULT '',
          joined INTEGER DEFAULT 0,
          last_updated TEXT NOT NULL
        );
      `);
    } catch (e) {
      console.error("DO create table error:", e);
    }

    // مرحله ۲: مهاجرت جدول‌های قدیمی — افزودن ستون‌های جدید (idempotent)
    const tryAlter = (sql) => {
      try { this.ctx.storage.sql.exec(sql); } catch (e) { /* ستون وجود دارد */ }
    };
    tryAlter(`ALTER TABLE credits ADD COLUMN total_estekhare INTEGER NOT NULL DEFAULT 0`);
    tryAlter(`ALTER TABLE credits ADD COLUMN total_opens INTEGER NOT NULL DEFAULT 0`);
    tryAlter(`ALTER TABLE credits ADD COLUMN last_topic TEXT`);
    tryAlter(`ALTER TABLE credits ADD COLUMN last_page INTEGER`);
    tryAlter(`ALTER TABLE credits ADD COLUMN unlocked TEXT DEFAULT '[]'`);
    tryAlter(`ALTER TABLE credits ADD COLUMN name TEXT DEFAULT ''`);
    tryAlter(`ALTER TABLE credits ADD COLUMN joined INTEGER DEFAULT 0`);
  }

  async getStats(userId) {
    const r = this.ctx.storage.sql.exec(
      `SELECT * FROM credits WHERE user_id = ?`, userId
    ).one();
    if (r) return r;
    return { user_id: userId, amount: 0, total_estekhare: 0, total_opens: 0, last_topic: null, last_page: null, unlocked: "[]", name: "", joined: 0 };
  }

  async ensureUser(userId, name) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO credits (user_id, amount, name, joined, last_updated) VALUES (?, 0, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         name = CASE WHEN excluded.name != '' THEN excluded.name ELSE credits.name END,
         last_updated = excluded.last_updated`,
      userId, name || "", Date.now(), now
    );
  }

  async getCredits(userId) {
    const r = this.ctx.storage.sql.exec(
      `SELECT amount FROM credits WHERE user_id = ?`, userId
    ).one();
    return r ? r.amount : 0;
  }

  async addCredits(userId, amount) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO credits (user_id, amount, last_updated) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         amount = amount + excluded.amount,
         last_updated = excluded.last_updated`,
      userId, amount, now
    );
  }

  async deductCredit(userId) {
    const r = this.ctx.storage.sql.exec(
      `UPDATE credits SET amount = amount - 1, total_opens = total_opens + 1, last_updated = ?
       WHERE user_id = ? AND amount > 0`,
      new Date().toISOString(), userId
    );
    return r.rowsWritten > 0;
  }

  async recordEstekhare(userId, topic, page) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO credits (user_id, amount, total_estekhare, last_topic, last_page, last_updated) VALUES (?, 0, 1, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         total_estekhare = total_estekhare + 1,
         last_topic = excluded.last_topic,
         last_page = excluded.last_page,
         last_updated = excluded.last_updated`,
      userId, topic, page, now
    );
  }

  async isUnlocked(userId, page, topic) {
    const r = this.ctx.storage.sql.exec(
      `SELECT unlocked FROM credits WHERE user_id = ?`, userId
    ).one();
    if (!r || !r.unlocked) return false;
    try {
      const arr = JSON.parse(r.unlocked);
      return arr.includes(`${page}:${topic}`);
    } catch { return false; }
  }

  async markUnlocked(userId, page, topic) {
    const r = this.ctx.storage.sql.exec(
      `SELECT unlocked FROM credits WHERE user_id = ?`, userId
    ).one();
    let arr = [];
    if (r && r.unlocked) {
      try { arr = JSON.parse(r.unlocked); } catch {}
    }
    const key = `${page}:${topic}`;
    if (!arr.includes(key)) arr.push(key);
    this.ctx.storage.sql.exec(
      `UPDATE credits SET unlocked = ?, last_updated = ? WHERE user_id = ?`,
      JSON.stringify(arr), new Date().toISOString(), userId
    );
  }
}

// ========== 4. HELPERS ==========
async function baleCall(env, method, payload) {
  const url = `${API_BASE}/bot${env.BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) console.error(`BaleAPI ${method} error:`, JSON.stringify(data));
  return data;
}

const sendMessage = (env, chat_id, text, reply_markup) =>
  baleCall(env, "sendMessage", { chat_id, text, parse_mode: "HTML", reply_markup });
const answerCallback = (env, id) =>
  baleCall(env, "answerCallbackQuery", { callback_query_id: id });
const sendInvoice = (env, chat_id, pack) =>
  baleCall(env, "sendInvoice", {
    chat_id, title: pack.title, description: pack.desc, payload: pack.id,
    provider_token: env.WALLET_TOKEN || "WALLET-TEST-1111111111111111",
    prices: [{ label: pack.label, amount: pack.rials }],
  });
const answerPreCheckout = (env, id, ok, error_message) =>
  baleCall(env, "answerPreCheckoutQuery", { pre_checkout_query_id: id, ok, ...(error_message ? { error_message } : {}) });

function getStub(env, userId) {
  const id = env.CREDIT_MANAGER.idFromName(String(userId));
  return env.CREDIT_MANAGER.get(id);
}

function isUserAllowed(env, chatId) {
  const list = (env.ALLOWED_USERS || "").trim();
  if (!list) return true;
  return list.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).includes(chatId);
}

function pickIndex() {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] % CONTENT.length;
}

function topicInfo(id) {
  for (const c of CATEGORIES) for (const t of c.topics) if (t.id === id) return t;
  return { id, label: "❓ تصمیم دیگر", short: "تصمیم تو" };
}
function topicShort(id) { return topicInfo(id).short || "تصمیم تو"; }
function topicKey(id) { const t = topicInfo(id); return t.key || t.id; }

function renderAction(a) {
  if (Array.isArray(a)) return a.map(x => "-   " + x).join("\n");
  return a || "";
}

function topicBlockV5(r, t) {
  const k = topicKey(t);
  const T = (r.topics || {})[k] || (r.topics || {})[ALIAS[t]];
  if (T) return T;
  return { verdict: r.level || r.verdict || "میانه", badge: r.badge || "⚖️",
    tip: r.core_message || "",
    warning: "این موضوع به‌صورت اختصاصی برای این صفحه تفسیر نشده؛ با احتیاط و مشورت پیش برو.",
    action: ["💪 به پیام محوری آیه توجه کن و با بررسی دقیق تصمیم بگیر.", "🤝 با یک فرد خبره یا مشاور کارآزموده مشورت کن.", "🤲 صدقه بده و با توکل بر خدا اقدام کن."] };
}

// ========== 5. KEYBOARDS ==========
const mainKb = { keyboard: [[{ text: "🔮 استخاره" }], [{ text: "👤 حساب من" }, { text: "🛍 فروشگاه" }]], resize_keyboard: true, is_persistent: true };
const storeKb = { inline_keyboard: PACKS.map(p => [{ text: p.text, callback_data: "buy:" + p.id }]) };
const ritualKb = (t) => ({ inline_keyboard: [[{ text: "🤲 خواندم، استخاره کن", callback_data: "draw:" + t }], [{ text: "↩️ انصراف", callback_data: "home" }]] });
const resultKb = (t) => ({ inline_keyboard: [[{ text: "💎 استخاره تخصصی " + topicShort(t), callback_data: "unlock:" + t }], [{ text: "🔮 استخاره جدید", callback_data: "new" }]] });
const unlockedKb = (t) => ({ inline_keyboard: [[{ text: "📖 مشاهدهٔ استخاره تخصصی", callback_data: "view:" + t }], [{ text: "🔮 استخاره جدید", callback_data: "new" }]] });
const noCreditKb = { inline_keyboard: [[{ text: "🛍 مشاهدهٔ بسته‌ها", callback_data: "store" }], [{ text: "🔮 استخاره جدید", callback_data: "new" }]] };

function catKb() {
  const rows = [];
  for (let i = 0; i < CATEGORIES.length; i += 2) {
    rows.push(CATEGORIES.slice(i, i + 2).map(c => ({ text: c.label, callback_data: "cat:" + c.id })));
  }
  return { inline_keyboard: rows };
}
function topicKb(catId) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) return catKb();
  const visible = cat.topics.filter(t => !t.hidden && (t.phase || 1) <= CURRENT_PHASE);
  const rows = [];
  let pair = null;
  for (const t of visible) {
    const btn = { text: t.label, callback_data: "topic:" + t.id };
    if (t.label.length > 12) { if (pair) { rows.push([pair]); pair = null; } rows.push([btn]); }
    else if (pair) { rows.push([pair, btn]); pair = null; }
    else pair = btn;
  }
  if (pair) rows.push([pair]);
  rows.push([{ text: "↩️ بازگشت", callback_data: "cats" }]);
  return { inline_keyboard: rows };
}

// ========== 6. MESSAGE BUILDERS ==========
function freeMsg(r, t) {
  if (r.free_summary) {
    return [
      (r.intro || "سلام رفیق عزیزم! 🌿"), "",
      "📊 جواب استخاره: " + r.level + " " + r.badge, "",
      "📝 پاسخ کلی به نیت شما:",
      r.free_summary, "",
      "📖 آیه اول سرصفحه (صفحه " + toFa(r.page) + " – سوره " + r.surah + "، آیه " + toFa(r.ayah) + "):",
      r.arabic, "",
      "🌐 ترجمه روان:",
      "«" + r.translation + "»", "",
      "📍 سوره " + r.surah + " | آیه " + toFa(r.ayah), "",
      (r.cta_free || r.cta || ""),
    ].join("\n");
  }
  const B = topicBlockV5(r, t);
  return [
    r.badge + " <b>نتیجه:</b> " + r.verdict,
    "<b>" + (r.headline || "") + "</b>", "",
    "📖 سوره " + r.surah + " — آیهٔ " + toFa(r.ayah) + " (صفحهٔ " + toFa(r.page) + ")",
    r.arabic, "",
    "📜 " + r.translation, "",
    (r.opener || ""),
    (r.plain || ""), "",
    (r.cta_free || ""),
  ].join("\n");
}

function premiumMsg(r, t) {
  const B = topicBlockV5(r, t);
  const L = topicInfo(t).label;
  return [
    "💎 استخاره تخصصی | " + L,
    "نتیجه: " + B.verdict + " " + B.badge, "",
    "💎 پیام محوری و منطوق آیه:",
    r.core_message || "", "",
    "💡 نکته و رمز آیه:",
    B.tip || "", "",
    "⚠️ زنگ خطر / هشدار:",
    B.warning || "", "",
    "🛠 راهکار عملیاتی:",
    renderAction(B.action), "",
    "🌟 جمع‌بندی نهایی استخاره صفحه " + toFa(r.page) + ":",
    (r.final_summary || ""), "",
    (r.cta_dua || ""), "",
    DISCLAIMER,
  ].join("\n");
}

// ========== 7. HANDLERS ==========
async function onMessage(env, m, allowedUsers) {
  const chat = m.chat.id;
  const text = (m.text || "").trim();

  if (!isUserAllowed(env, chat)) return sendMessage(env, chat, "🔒 این بات در حال تست خصوصی است.", mainKb);

  const stub = getStub(env, chat);

  if (text === "/start") {
    const cleanName = ((m.chat.first_name || "") + " " + (m.chat.last_name || "")).trim();
    const stats = await stub.getStats(chat);
    const isNew = !stats.joined;
    await stub.ensureUser(chat, cleanName);
    if (isNew) await stub.addCredits(chat, 2);
    return sendMessage(env, chat, WELCOME, mainKb);
  }

  if (text === "🔮 استخاره" || text === "/estekhare")
    return sendMessage(env, chat, "📂 دستهٔ موردنظرت رو انتخاب کن:", catKb());

  if (text === "👤 حساب من") {
    const s = await stub.getStats(chat);
    return sendMessage(env, chat,
      "👤 <b>حساب من</b>\n\n💎 اعتبار: " + toFa(s.amount) +
      "\n🔮 استخاره‌ها: " + toFa(s.total_estekhare) +
      "\n🔓 باز شده: " + toFa(s.total_opens), mainKb);
  }

  if (text === "🛍 فروشگاه" || text === "/shop")
    return sendMessage(env, chat, STORE_MSG, storeKb);

  return sendMessage(env, chat, "برای شروع، «🔮 استخاره» را بزن.", mainKb);
}

async function onCallback(env, cq, allowedUsers) {
  const chat = cq.message.chat.id;
  const data = cq.data || "";
  await answerCallback(env, cq.id);

  if (!isUserAllowed(env, chat))
    return sendMessage(env, chat, "🔒 این بات در حال تست خصوصی است.", mainKb);

  const stub = getStub(env, chat);

  try {
    if (data === "home")  return sendMessage(env, chat, "🏠 منوی اصلی", mainKb);
    if (data === "new" || data === "cats")
      return sendMessage(env, chat, "📂 دستهٔ موردنظرت رو انتخاب کن:", catKb());
    if (data === "store")
      return sendMessage(env, chat, STORE_MSG, storeKb);

    if (data.startsWith("cat:")) {
      const cat = CATEGORIES.find(c => c.id === data.slice(4));
      if (!cat) return sendMessage(env, chat, "📂 دستهٔ موردنظرت رو انتخاب کن:", catKb());
      return sendMessage(env, chat, "📂 دستهٔ «" + cat.full + "» — موضوعت رو انتخاب کن:", topicKb(cat.id));
    }

    if (data.startsWith("buy:")) {
      const pack = PACKS.find(p => p.id === data.slice(4));
      if (!pack) return sendMessage(env, chat, "⚠️ بسته پیدا نشد.", mainKb);
      return sendInvoice(env, chat, pack);
    }

    if (data.startsWith("topic:")) {
      const t = data.slice(6);
      return sendMessage(env, chat, RITUAL, ritualKb(t));
    }

    if (data.startsWith("draw:")) {
      const t = data.slice(5);
      const idx = pickIndex();
      const record = CONTENT[idx];
      await stub.recordEstekhare(chat, t, record.page);
      await sendMessage(env, chat, "🔮 در حال انجام استخاره...");
      return sendMessage(env, chat, freeMsg(record, t), resultKb(t));
    }

    if (data.startsWith("unlock:") || data.startsWith("view:")) {
      const t = data.slice(data.indexOf(":") + 1);
      const stats = await stub.getStats(chat);
      const page = stats.last_page;
      const record = CONTENT.find(r => r.page === page);
      if (!record) return sendMessage(env, chat, "⚠️ خطای کوچک؛ لطفاً یک استخارهٔ جدید بگیر.", mainKb);

      const alreadyUnlocked = await stub.isUnlocked(chat, page, t);
      if (alreadyUnlocked) return sendMessage(env, chat, premiumMsg(record, t), unlockedKb(t));

      const ok = await stub.deductCredit(chat);
      if (!ok) return sendMessage(env, chat, NO_CREDIT_MSG, noCreditKb);

      await stub.markUnlocked(chat, page, t);
      return sendMessage(env, chat, premiumMsg(record, t), unlockedKb(t));
    }
  } catch (e) {
    console.error("onCallback error:", e);
    return sendMessage(env, chat, "⚠️ خطایی رخ داد. لطفاً دوباره تلاش کن.", mainKb);
  }
}

async function onPreCheckout(env, pcq) {
  const pack = PACKS.find(p => p.id === pcq.invoice_payload);
  if (!pack) return answerPreCheckout(env, pcq.id, false, "بستهٔ نامعتبر است.");
  return answerPreCheckout(env, pcq.id, true);
}

async function onSuccessfulPayment(env, m) {
  const chat = m.chat.id;
  const sp = m.successful_payment;
  const pack = PACKS.find(p => p.id === sp.invoice_payload);
  if (!pack) return;
  const txId = sp.telegram_payment_charge_id;
  try {
    const done = await env.USERS_KV.get("tx:" + txId);
    if (done) return;
  } catch {}
  const stub = getStub(env, chat);
  await stub.addCredits(chat, pack.credits + pack.bonus);
  try { await env.USERS_KV.put("tx:" + txId, JSON.stringify({ pack: pack.id, chat, at: Date.now() })); } catch {}
  return sendMessage(env, chat,
    "🎉 پرداخت موفق!\n\n💎 " + toFa(pack.credits + pack.bonus) + " اعتبار به حساب تو اضافه شد.", mainKb);
}

// ========== 8. MAIN WORKER ==========
export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      const url = new URL(request.url);
if (url.pathname === "/test") {
  const allowedStr = env.ALLOWED_USERS || "";
  const allowedUsers = allowedStr
    ? allowedStr.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    : [];
  
  // پیدا کردن صفحات غایب
  const existingPages = new Set(CONTENT.map(r => r.page));
  const missingPages = [];
  for (let i = 1; i <= 603; i += 2) {
    if (!existingPages.has(i)) missingPages.push(i);
  }
  
  // پیدا کردن صفحات تکراری
  const pageCounts = {};
  CONTENT.forEach(r => { pageCounts[r.page] = (pageCounts[r.page] || 0) + 1; });
  const duplicatedPages = Object.entries(pageCounts)
    .filter(([_, c]) => c > 1)
    .map(([p, c]) => `${p} (×${c})`);
  
  return new Response(JSON.stringify({
    version: 17,
    schema: 5,
    hasToken: !!env.BOT_TOKEN,
    hasKV: !!env.USERS_KV,
    hasDO: !!env.CREDIT_MANAGER,
    records: CONTENT.length,
    expectedRecords: 302,
    missingCount: missingPages.length,
    missingPages: missingPages,
    duplicatedPages: duplicatedPages,
    wallet: (env.WALLET_TOKEN || "").startsWith("WALLET-TEST") ? "test" : "real",
    privateMode: allowedUsers.length > 0 ? allowedUsers.length + " users allowed" : "public (all users)",
  }, null, 2), { headers: { "Content-Type": "application/json" } });
}
    if (request.method === "POST") {
      try {
        const u = await request.json();
        const allowedStr = env.ALLOWED_USERS || "";
        const allowedUsers = allowedStr
          ? allowedStr.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
          : [];
        if (u.pre_checkout_query) await onPreCheckout(env, u.pre_checkout_query);
        else if (u.message && u.message.successful_payment) await onSuccessfulPayment(env, u.message);
        else if (u.message) await onMessage(env, u.message, allowedUsers);
        else if (u.callback_query) await onCallback(env, u.callback_query, allowedUsers);
      } catch (e) { console.error("Fetch error:", e); }
    }
    return new Response("ok");
  },
};