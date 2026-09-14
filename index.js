// ========== 1. IMPORT ==========
import { DurableObject } from "cloudflare:workers";
import { CONTENT } from "./content/index.js";

// ========== 2. CONSTANTS ==========
const API_BASE = "https://tapi.bale.ai";
const DRAW_COOLDOWN_MS = 5000;
const DO_VERSION_PREFIX = "v2:";
const BACKUP_RETENTION_DAYS = 30;
const HISTORY_LIMIT = 10;

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
const RATE_LIMIT_MSG = "⏳ لطفاً چند لحظه صبر کن و بعد دوباره استخاره بگیر.";
const ADMIN_ONLY_MSG = "⛔ این فرمان فقط برای مدیر بات قابل دسترسی است.";
const START_ERROR_MSG = "⚠️ خطا در ثبت‌نام. لطفاً دوباره /start بزن.";

const toFa = n => String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
const ALIAS = { trade:"transaction", business2:"business" };

// ========== 3. DURABLE OBJECT ==========
export class CreditManager extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    try {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS credits (
          user_id TEXT PRIMARY KEY,
          amount INTEGER NOT NULL DEFAULT 0,
          total_estekhare INTEGER NOT NULL DEFAULT 0,
          total_opens INTEGER NOT NULL DEFAULT 0,
          last_topic TEXT,
          last_page INTEGER,
          last_draw_time INTEGER,
          unlocked TEXT DEFAULT '[]',
          name TEXT DEFAULT '',
          joined INTEGER DEFAULT 0,
          last_updated TEXT NOT NULL
        );
      `);
    } catch (e) { console.error("DO create table error:", e); }

    // 🆕 جدول تاریخچه
    try {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS estekhare_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          page INTEGER NOT NULL,
          surah TEXT,
          ayah INTEGER,
          level TEXT,
          created_at INTEGER NOT NULL
        );
      `);
    } catch (e) { console.error("DO create history table error:", e); }

    const tryAlter = (sql) => { try { this.ctx.storage.sql.exec(sql); } catch (e) {} };
    tryAlter(`ALTER TABLE credits ADD COLUMN total_estekhare INTEGER NOT NULL DEFAULT 0`);
    tryAlter(`ALTER TABLE credits ADD COLUMN total_opens INTEGER NOT NULL DEFAULT 0`);
    tryAlter(`ALTER TABLE credits ADD COLUMN last_topic TEXT`);
    tryAlter(`ALTER TABLE credits ADD COLUMN last_page INTEGER`);
    tryAlter(`ALTER TABLE credits ADD COLUMN last_draw_time INTEGER`);
    tryAlter(`ALTER TABLE credits ADD COLUMN unlocked TEXT DEFAULT '[]'`);
    tryAlter(`ALTER TABLE credits ADD COLUMN name TEXT DEFAULT ''`);
    tryAlter(`ALTER TABLE credits ADD COLUMN joined INTEGER DEFAULT 0`);
  }

  async getStats(userId) {
    const r = this.ctx.storage.sql.exec(`SELECT * FROM credits WHERE user_id = ?`, userId).one();
    if (r) return r;
    return { user_id: userId, amount: 0, total_estekhare: 0, total_opens: 0, last_topic: null, last_page: null, last_draw_time: 0, unlocked: "[]", name: "", joined: 0 };
  }

  async ensureUser(userId, name) {
    const now = new Date().toISOString();
    const trimmedName = (name || "").trim();
    const existing = this.ctx.storage.sql.exec(`SELECT user_id FROM credits WHERE user_id = ?`, userId).one();
    if (existing) {
      if (trimmedName) {
        this.ctx.storage.sql.exec(`UPDATE credits SET name = ?, last_updated = ? WHERE user_id = ?`, trimmedName, now, userId);
      } else {
        this.ctx.storage.sql.exec(`UPDATE credits SET last_updated = ? WHERE user_id = ?`, now, userId);
      }
    } else {
      this.ctx.storage.sql.exec(
        `INSERT INTO credits (user_id, amount, name, joined, last_updated) VALUES (?, 0, ?, ?, ?)`,
        userId, trimmedName, Date.now(), now
      );
    }
  }

  async getCredits(userId) {
    const r = this.ctx.storage.sql.exec(`SELECT amount FROM credits WHERE user_id = ?`, userId).one();
    return r ? r.amount : 0;
  }

  async addCredits(userId, amount) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO credits (user_id, amount, last_updated) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET amount = amount + excluded.amount, last_updated = excluded.last_updated`,
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

  async canDraw(userId) {
    try {
      const r = this.ctx.storage.sql.exec(`SELECT last_draw_time FROM credits WHERE user_id = ?`, userId).one();
      if (!r || !r.last_draw_time) return true;
      return (Date.now() - r.last_draw_time) >= DRAW_COOLDOWN_MS;
    } catch (e) { console.error("canDraw error:", e); return true; }
  }

  async recordEstekhare(userId, topic, page, surah, ayah, level) {
    const now = new Date().toISOString();
    const ts = Date.now();
    this.ctx.storage.sql.exec(
      `INSERT INTO credits (user_id, amount, total_estekhare, last_topic, last_page, last_draw_time, last_updated) 
       VALUES (?, 0, 1, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         total_estekhare = total_estekhare + 1,
         last_topic = excluded.last_topic,
         last_page = excluded.last_page,
         last_draw_time = excluded.last_draw_time,
         last_updated = excluded.last_updated`,
      userId, topic, page, ts, now
    );
    // 🆕 ذخیره در تاریخچه
    try {
      this.ctx.storage.sql.exec(
        `INSERT INTO estekhare_history (user_id, topic, page, surah, ayah, level, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        userId, topic, page, surah || "", ayah || 0, level || "", ts
      );
    } catch (e) { console.error("addHistory error:", e); }
  }

  // 🆕 خوندن تاریخچه
  async getHistory(userId, limit) {
    const lim = limit || HISTORY_LIMIT;
    const rows = this.ctx.storage.sql.exec(
      `SELECT id, topic, page, surah, ayah, level, created_at 
       FROM estekhare_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      userId, lim
    ).toArray();
    return rows;
  }

  // 🆕 پاک کردن تاریخچه
  async clearHistory(userId) {
    this.ctx.storage.sql.exec(
      `DELETE FROM estekhare_history WHERE user_id = ?`, userId
    );
  }

  // 🆕 پیدا کردن یه رکورد خاص از تاریخچه
  async getHistoryItem(userId, id) {
    const r = this.ctx.storage.sql.exec(
      `SELECT * FROM estekhare_history WHERE user_id = ? AND id = ?`,
      userId, id
    ).one();
    return r || null;
  }

  async isUnlocked(userId, page, topic) {
    const r = this.ctx.storage.sql.exec(`SELECT unlocked FROM credits WHERE user_id = ?`, userId).one();
    if (!r || !r.unlocked) return false;
    try { return JSON.parse(r.unlocked).includes(page + ":" + topic); } catch { return false; }
  }

  async markUnlocked(userId, page, topic) {
    const r = this.ctx.storage.sql.exec(`SELECT unlocked FROM credits WHERE user_id = ?`, userId).one();
    let arr = [];
    if (r && r.unlocked) { try { arr = JSON.parse(r.unlocked); } catch {} }
    const key = page + ":" + topic;
    if (!arr.includes(key)) arr.push(key);
    this.ctx.storage.sql.exec(
      `UPDATE credits SET unlocked = ?, last_updated = ? WHERE user_id = ?`,
      JSON.stringify(arr), new Date().toISOString(), userId
    );
  }

  async exportData() {
    const credits = this.ctx.storage.sql.exec(`SELECT * FROM credits`).toArray();
    const history = this.ctx.storage.sql.exec(`SELECT * FROM estekhare_history`).toArray();
    return { credits, history };
  }

  async restoreData(data) {
    // پشتیبانی از هر دو فرمت قدیم و جدید
    if (Array.isArray(data)) {
      // فرمت قدیم: فقط credits
      for (const row of data) {
        this.ctx.storage.sql.exec(
          `INSERT INTO credits (user_id, amount, total_estekhare, total_opens, last_topic, last_page, last_draw_time, unlocked, name, joined, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             amount = excluded.amount, total_estekhare = excluded.total_estekhare,
             total_opens = excluded.total_opens, last_topic = excluded.last_topic,
             last_page = excluded.last_page, last_draw_time = excluded.last_draw_time,
             unlocked = excluded.unlocked, name = excluded.name,
             joined = excluded.joined, last_updated = excluded.last_updated`,
          row.user_id, row.amount || 0, row.total_estekhare || 0, row.total_opens || 0,
          row.last_topic || null, row.last_page || null, row.last_draw_time || 0,
          row.unlocked || "[]", row.name || "", row.joined || 0, new Date().toISOString()
        );
      }
    } else if (data && data.credits) {
      // فرمت جدید: credits + history
      for (const row of data.credits) {
        this.ctx.storage.sql.exec(
          `INSERT INTO credits (user_id, amount, total_estekhare, total_opens, last_topic, last_page, last_draw_time, unlocked, name, joined, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
             amount = excluded.amount, total_estekhare = excluded.total_estekhare,
             total_opens = excluded.total_opens, last_topic = excluded.last_topic,
             last_page = excluded.last_page, last_draw_time = excluded.last_draw_time,
             unlocked = excluded.unlocked, name = excluded.name,
             joined = excluded.joined, last_updated = excluded.last_updated`,
          row.user_id, row.amount || 0, row.total_estekhare || 0, row.total_opens || 0,
          row.last_topic || null, row.last_page || null, row.last_draw_time || 0,
          row.unlocked || "[]", row.name || "", row.joined || 0, new Date().toISOString()
        );
      }
      for (const row of data.history || []) {
        try {
          this.ctx.storage.sql.exec(
            `INSERT INTO estekhare_history (user_id, topic, page, surah, ayah, level, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            row.user_id, row.topic, row.page, row.surah || "", row.ayah || 0, row.level || "", row.created_at || Date.now()
          );
        } catch (e) { /* ignore duplicate */ }
      }
    }
  }
}

// ========== 4. HELPERS ==========
async function baleCall(env, method, payload) {
  const url = API_BASE + "/bot" + env.BOT_TOKEN + "/" + method;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) console.error("BaleAPI " + method + " error:", JSON.stringify(data));
  return data;
}

const sendMessage = (env, chat_id, text, reply_markup) =>
  baleCall(env, "sendMessage", { chat_id, text, parse_mode: "HTML", reply_markup });
const answerCallback = (env, id) => baleCall(env, "answerCallbackQuery", { callback_query_id: id });
const sendInvoice = (env, chat_id, pack) =>
  baleCall(env, "sendInvoice", {
    chat_id, title: pack.title, description: pack.desc, payload: pack.id,
    provider_token: env.WALLET_TOKEN || "WALLET-TEST-1111111111111111",
    prices: [{ label: pack.label, amount: pack.rials }],
  });
const answerPreCheckout = (env, id, ok, error_message) =>
  baleCall(env, "answerPreCheckoutQuery", { pre_checkout_query_id: id, ok, ...(error_message ? { error_message } : {}) });

function getStub(env, userId) {
  const id = env.CREDIT_MANAGER.idFromName(DO_VERSION_PREFIX + String(userId));
  return env.CREDIT_MANAGER.get(id);
}

function isUserAllowed(env, chatId) {
  const list = (env.ALLOWED_USERS || "").trim();
  if (!list) return true;
  return list.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).includes(chatId);
}

function isUserAdmin(env, chatId) {
  const list = (env.ADMIN_USERS || "").trim();
  if (!list) return false;
  return list.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)).includes(chatId);
}

function checkAdminSecret(env, url) {
  const provided = url.searchParams.get("auth") || "";
  const secret = (env.ADMIN_SECRET || "").trim();
  return secret && provided === secret;
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

// ========== 5. ADMIN HELPERS ==========
async function broadcast(env, text) {
  let cursor; let sent = 0, failed = 0;
  for (;;) {
    const page = await env.USERS_KV.list({ prefix: "user:", cursor });
    for (const k of page.keys) {
      const id = parseInt(k.name.slice(5), 10);
      if (isNaN(id)) continue;
      const r = await baleCall(env, "sendMessage", { chat_id: id, text, parse_mode: "HTML" });
      if (r && r.ok) sent++; else failed++;
    }
    if (page.list_complete) break;
    cursor = page.cursor;
  }
  return { sent, failed };
}

async function sendToMany(env, ids, text) {
  let sent = 0, failed = 0;
  for (const id of ids) {
    const r = await baleCall(env, "sendMessage", { chat_id: id, text, parse_mode: "HTML" });
    if (r && r.ok) sent++; else failed++;
  }
  return { sent, failed };
}

async function listMembers(env) {
  const members = [];
  let cursor;
  for (;;) {
    const page = await env.USERS_KV.list({ prefix: "user:", cursor });
    for (const k of page.keys) {
      const id = parseInt(k.name.slice(5), 10);
      if (isNaN(id)) continue;
      let u = {};
      try { const raw = await env.USERS_KV.get(k.name); if (raw) u = JSON.parse(raw); } catch {}
      members.push({ id, name: u.name || "", joined: u.joined || 0 });
    }
    if (page.list_complete) break;
    cursor = page.cursor;
  }
  return members;
}

// ========== 5.b BACKUP HELPERS ==========
async function listAllUserIds(env) {
  const ids = [];
  let cursor;
  for (;;) {
    const page = await env.USERS_KV.list({ prefix: "user:", cursor });
    for (const k of page.keys) {
      const id = parseInt(k.name.slice(5), 10);
      if (!isNaN(id)) ids.push(id);
    }
    if (page.list_complete) break;
    cursor = page.cursor;
  }
  return ids;
}

async function performBackup(env) {
  const startedAt = Date.now();
  const userIds = await listAllUserIds(env);
  console.log("[Backup] Found " + userIds.length + " users in KV");

  const allData = {};
  const chunkSize = 20;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const results = await Promise.all(chunk.map(async (uid) => {
      try {
        const stub = getStub(env, uid);
        const data = await stub.exportData();
        return { uid, data };
      } catch (e) {
        console.error("[Backup] Export error for " + uid + ":", e);
        return { uid, data: null };
      }
    }));
    for (const r of results) {
      if (r.data) allData[r.uid] = r.data;
    }
  }

  const backup = {
    timestamp: startedAt,
    date: new Date(startedAt).toISOString(),
    userCount: Object.keys(allData).length,
    users: allData,
  };

  const dateKey = new Date(startedAt).toISOString().split("T")[0];
  const kvKey = "backup:" + dateKey;

  const ttl = (BACKUP_RETENTION_DAYS + 5) * 24 * 60 * 60;
  await env.USERS_KV.put(kvKey, JSON.stringify(backup), { expirationTtl: ttl });

  const duration = Date.now() - startedAt;
  console.log("[Backup] Done: " + kvKey + ", users: " + backup.userCount + ", took " + duration + "ms");
  return { success: true, key: kvKey, userCount: backup.userCount, duration };
}

async function listBackups(env) {
  const backups = [];
  let cursor;
  for (;;) {
    const page = await env.USERS_KV.list({ prefix: "backup:", cursor });
    for (const k of page.keys) {
      backups.push({ key: k.name, expiration: k.expiration });
    }
    if (page.list_complete) break;
    cursor = page.cursor;
  }
  backups.sort((a, b) => b.key.localeCompare(a.key));
  return backups;
}

// ========== 6. KEYBOARDS ==========
const mainKb = { keyboard: [[{ text: "🔮 استخاره" }], [{ text: "👤 حساب من" }, { text: "🛍 فروشگاه" }]], resize_keyboard: true, is_persistent: true };
const storeKb = { inline_keyboard: PACKS.map(p => [{ text: p.text, callback_data: "buy:" + p.id }]) };
const ritualKb = (t) => ({ inline_keyboard: [[{ text: "🤲 خواندم، استخاره کن", callback_data: "draw:" + t }], [{ text: "↩️ انصراف", callback_data: "home" }]] });
const resultKb = (t) => ({ inline_keyboard: [[{ text: "💎 استخاره تخصصی " + topicShort(t), callback_data: "unlock:" + t }], [{ text: "🔮 استخاره جدید", callback_data: "new" }]] });
const unlockedKb = (t) => ({ inline_keyboard: [[{ text: "📖 مشاهدهٔ استخاره تخصصی", callback_data: "view:" + t }], [{ text: "🔮 استخاره جدید", callback_data: "new" }]] });
const noCreditKb = { inline_keyboard: [[{ text: "🛍 مشاهدهٔ بسته‌ها", callback_data: "store" }], [{ text: "🔮 استخاره جدید", callback_data: "new" }]] };

// 🆕 کیبورد حساب من با دکمه‌ی تاریخچه
const accountKb = { inline_keyboard: [
  [{ text: "📜 تاریخچه‌ی استخاره‌ها", callback_data: "history" }],
  [{ text: "🛍 فروشگاه", callback_data: "store" }],
]};

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
  const rows = []; let pair = null;
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

// 🆕 کیبورد تاریخچه
function historyKb(history) {
  const rows = [];
  history.forEach((h) => {
    const date = new Date(h.created_at);
    const dateStr = date.toLocaleDateString("fa-IR");
    const txt = "📄 ص" + toFa(h.page) + " | " + topicShort(h.topic) + " | " + dateStr;
    rows.push([{ text: txt, callback_data: "hist_open:" + h.id }]);
  });
  rows.push([{ text: "🗑 پاک کردن تاریخچه", callback_data: "hist_clear" }]);
  rows.push([{ text: "↩️ بازگشت به حساب من", callback_data: "account" }]);
  return { inline_keyboard: rows };
}

// ========== 7. MESSAGE BUILDERS ==========
function freeMsg(r, t) {
  if (r.free_summary) {
    return [
      (r.intro || "سلام رفیق عزیزم! 🌿"), "",
      "📊 جواب استخاره: " + r.level + " " + r.badge, "",
      "📝 پاسخ کلی به نیت شما:", r.free_summary, "",
      "📖 آیه اول سرصفحه (صفحه " + toFa(r.page) + " – سوره " + r.surah + "، آیه " + toFa(r.ayah) + "):",
      r.arabic, "", "🌐 ترجمه روان:", "«" + r.translation + "»", "",
      "📍 سوره " + r.surah + " | آیه " + toFa(r.ayah), "",
      (r.cta_free || r.cta || ""),
    ].join("\n");
  }
  const B = topicBlockV5(r, t);
  return [
    r.badge + " <b>نتیجه:</b> " + r.verdict,
    "<b>" + (r.headline || "") + "</b>", "",
    "📖 سوره " + r.surah + " — آیهٔ " + toFa(r.ayah) + " (صفحهٔ " + toFa(r.page) + ")",
    r.arabic, "", "📜 " + r.translation, "",
    (r.opener || ""), (r.plain || ""), "", (r.cta_free || ""),
  ].join("\n");
}

function premiumMsg(r, t) {
  const B = topicBlockV5(r, t);
  const L = topicInfo(t).label;
  return [
    "💎 استخاره تخصصی | " + L,
    "نتیجه: " + B.verdict + " " + B.badge, "",
    "💎 پیام محوری و منطوق آیه:", r.core_message || "", "",
    "💡 نکته و رمز آیه:", B.tip || "", "",
    "⚠️ زنگ خطر / هشدار:", B.warning || "", "",
    "🛠 راهکار عملیاتی:", renderAction(B.action), "",
    "🌟 جمع‌بندی نهایی استخاره صفحه " + toFa(r.page) + ":", (r.final_summary || ""), "",
    (r.cta_dua || ""), "", DISCLAIMER,
  ].join("\n");
}

// ========== 8. HANDLERS ==========
async function onMessage(env, m, allowedUsers) {
  const chat = m.chat.id;
  const text = (m.text || "").trim();
  if (!isUserAllowed(env, chat)) return sendMessage(env, chat, "🔒 این بات در حال تست خصوصی است.", mainKb);
  const stub = getStub(env, chat);
  const isAdmin = isUserAdmin(env, chat);

  const awaitingRaw = await env.USERS_KV.get("await:" + chat);
  if (awaitingRaw && isAdmin) {
    let awaiting;
    try { awaiting = JSON.parse(awaitingRaw); } catch { awaiting = { mode: "broadcast" }; }
    await env.USERS_KV.delete("await:" + chat);
    if (awaiting.mode === "send") {
      const res = await sendToMany(env, awaiting.ids, text);
      return sendMessage(env, chat, "📨 ارسال شد.\n✅ موفق: " + toFa(res.sent) + "\n⚠️ ناموفق: " + toFa(res.failed), mainKb);
    } else {
      const res = await broadcast(env, text);
      return sendMessage(env, chat, "📣 پخش شد.\n✅ موفق: " + toFa(res.sent) + "\n⚠️ ناموفق: " + toFa(res.failed), mainKb);
    }
  }

  if (text === "/start") {
    try {
      const cleanName = ((m.chat.first_name || "") + " " + (m.chat.last_name || "")).trim();
      const stats = await stub.getStats(chat);
      const isNew = !stats.joined;
      await stub.ensureUser(chat, cleanName);
      if (isNew) await stub.addCredits(chat, 2);
      try { await env.USERS_KV.put("user:" + chat, JSON.stringify({ name: cleanName, joined: Date.now() })); } catch (e) {}
      return sendMessage(env, chat, WELCOME, mainKb);
    } catch (e) { console.error("/start error:", e); return sendMessage(env, chat, START_ERROR_MSG, mainKb); }
  }

  if (text === "/cancel") {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    await env.USERS_KV.delete("await:" + chat);
    return sendMessage(env, chat, "↩️ لغو شد.", mainKb);
  }

  if (text === "/notify") {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    await env.USERS_KV.put("await:" + chat, JSON.stringify({ mode: "broadcast" }), { expirationTtl: 300 });
    return sendMessage(env, chat, "📣 متن پیام رو بفرست تا برای همه ارسال بشه.\n\nلغو: /cancel", mainKb);
  }

  const mSend = text.match(/^\/send\s+([0-9,\s]+)$/);
  if (mSend) {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    const ids = mSend[1].split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    if (!ids.length) return sendMessage(env, chat, "⚠️ لیست ID خالیه.", mainKb);
    await env.USERS_KV.put("await:" + chat, JSON.stringify({ mode: "send", ids }), { expirationTtl: 300 });
    return sendMessage(env, chat, "📨 متن رو بفرست تا به " + toFa(ids.length) + " نفر ارسال بشه.\n\nلغو: /cancel", mainKb);
  }

  if (text === "/members") {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    try {
      const members = await listMembers(env);
      let lines = ["👥 اعضای بات: " + toFa(members.length), ""];
      members.slice(0, 50).forEach((mm, i) => {
        const joined = mm.joined ? new Date(mm.joined).toLocaleDateString("fa-IR") : "—";
        lines.push(toFa(i + 1) + ". " + (mm.name || "بدون نام") + "\n🆔 " + mm.id + "\n📅 " + joined);
      });
      if (members.length > 50) lines.push("… و " + toFa(members.length - 50) + " عضو دیگر");
      return sendMessage(env, chat, lines.join("\n\n"), mainKb);
    } catch (e) { console.error("/members error:", e); return sendMessage(env, chat, "⚠️ خطا در دریافت لیست اعضا.", mainKb); }
  }

  if (text === "/backup") {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    await sendMessage(env, chat, "🔄 در حال اجرای بکاپ...", mainKb);
    try {
      const res = await performBackup(env);
      return sendMessage(env, chat,
        "✅ بکاپ انجام شد.\n\n📁 کلید: <code>" + res.key + "</code>\n👥 تعداد: " + toFa(res.userCount) + "\n⏱ " + toFa(res.duration) + "ms", mainKb);
    } catch (e) {
      console.error("backup error:", e);
      return sendMessage(env, chat, "⚠️ خطا در بکاپ: " + e.message, mainKb);
    }
  }

  if (text === "/backups") {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    try {
      const list = await listBackups(env);
      if (!list.length) return sendMessage(env, chat, "📭 هنوز بکاپی ثبت نشده.", mainKb);
      let lines = ["📦 بکاپ‌ها: " + toFa(list.length), ""];
      list.slice(0, 15).forEach((b, i) => {
        lines.push(toFa(i + 1) + ". <code>" + b.key + "</code>");
      });
      return sendMessage(env, chat, lines.join("\n"), mainKb);
    } catch (e) {
      console.error("/backups error:", e);
      return sendMessage(env, chat, "⚠️ خطا در لیست بکاپ‌ها.", mainKb);
    }
  }

  if (text === "🔮 استخاره" || text === "/estekhare")
    return sendMessage(env, chat, "📂 دستهٔ موردنظرت رو انتخاب کن:", catKb());

  if (text === "👤 حساب من" || text === "/account") {
    try {
      const s = await stub.getStats(chat);
      return sendMessage(env, chat,
        "👤 <b>حساب من</b>\n\n💎 اعتبار: " + toFa(s.amount) +
        "\n🔮 استخاره‌ها: " + toFa(s.total_estekhare) +
        "\n🔓 باز شده: " + toFa(s.total_opens), accountKb);
    } catch (e) { console.error("account error:", e); return sendMessage(env, chat, "⚠️ خطا در خواندن حساب.", mainKb); }
  }

  if (text === "🛍 فروشگاه" || text === "/shop")
    return sendMessage(env, chat, STORE_MSG, storeKb);

  return sendMessage(env, chat, "برای شروع، «🔮 استخاره» را بزن.", mainKb);
}

async function onCallback(env, cq, allowedUsers) {
  const chat = cq.message.chat.id;
  const data = cq.data || "";
  await answerCallback(env, cq.id);
  if (!isUserAllowed(env, chat)) return sendMessage(env, chat, "🔒 این بات در حال تست خصوصی است.", mainKb);
  const stub = getStub(env, chat);

  try {
    if (data === "home") return sendMessage(env, chat, "🏠 منوی اصلی", mainKb);
    if (data === "new" || data === "cats") return sendMessage(env, chat, "📂 دستهٔ موردنظرت رو انتخاب کن:", catKb());
    if (data === "store") return sendMessage(env, chat, STORE_MSG, storeKb);

    if (data === "account") {
      const s = await stub.getStats(chat);
      return sendMessage(env, chat,
        "👤 <b>حساب من</b>\n\n💎 اعتبار: " + toFa(s.amount) +
        "\n🔮 استخاره‌ها: " + toFa(s.total_estekhare) +
        "\n🔓 باز شده: " + toFa(s.total_opens), accountKb);
    }

    // 🆕 نمایش تاریخچه
    if (data === "history") {
      const hist = await stub.getHistory(chat, HISTORY_LIMIT);
      if (!hist.length) {
        return sendMessage(env, chat,
          "📜 <b>تاریخچه‌ی استخاره‌ها</b>\n\nهنوز استخاره‌ای ثبت نشده.\nاولین استخاره‌ات رو بگیر! 🌿",
          { inline_keyboard: [[{ text: "🔮 استخاره", callback_data: "new" }], [{ text: "↩️ بازگشت", callback_data: "account" }]] });
      }
      return sendMessage(env, chat,
        "📜 <b>تاریخچه‌ی استخاره‌ها</b>\n\nآخرین " + toFa(hist.length) + " استخاره‌ی تو.\nروی هرکدوم بزن تا دوباره ببینی‌اش:",
        historyKb(hist));
    }

    // 🆕 پاک کردن تاریخچه
    if (data === "hist_clear") {
      await stub.clearHistory(chat);
      return sendMessage(env, chat, "✅ تاریخچه‌ی استخاره‌ها پاک شد.", accountKb);
    }

    // 🆕 بازکردن یه مورد از تاریخچه
    if (data.startsWith("hist_open:")) {
      const id = parseInt(data.slice(10), 10);
      if (isNaN(id)) return sendMessage(env, chat, "⚠️ خطای داده.", mainKb);
      const item = await stub.getHistoryItem(chat, id);
      if (!item) return sendMessage(env, chat, "⚠️ این مورد پیدا نشد.", mainKb);

      const record = CONTENT.find(r => r.page === item.page);
      if (!record) return sendMessage(env, chat, "⚠️ محتوای این صفحه موجود نیست.", mainKb);

      // نمایش پیام رایگان + دکمه‌ی باز کردن تحلیل
      const alreadyUnlocked = await stub.isUnlocked(chat, item.page, item.topic);
      const kb = alreadyUnlocked
        ? { inline_keyboard: [[{ text: "📖 مشاهدهٔ تحلیل تخصصی", callback_data: "view:" + item.topic }], [{ text: "↩️ بازگشت", callback_data: "history" }]] }
        : { inline_keyboard: [[{ text: "💎 استخاره تخصصی " + topicShort(item.topic), callback_data: "unlock:" + item.topic }], [{ text: "↩️ بازگشت", callback_data: "history" }]] };
      return sendMessage(env, chat, freeMsg(record, item.topic), kb);
    }

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
      const canDraw = await stub.canDraw(chat);
      if (!canDraw) return sendMessage(env, chat, RATE_LIMIT_MSG, ritualKb(t));
      const idx = pickIndex();
      const record = CONTENT[idx];
      // 🆕 ذخیره با تمام اطلاعات لازم
      await stub.recordEstekhare(chat, t, record.page, record.surah, record.ayah, record.level);
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
  try { const done = await env.USERS_KV.get("tx:" + txId); if (done) return; } catch {}
  const stub = getStub(env, chat);
  await stub.addCredits(chat, pack.credits + pack.bonus);
  try { await env.USERS_KV.put("tx:" + txId, JSON.stringify({ pack: pack.id, chat, at: Date.now() })); } catch {}
  return sendMessage(env, chat, "🎉 پرداخت موفق!\n\n💎 " + toFa(pack.credits + pack.bonus) + " اعتبار به حساب تو اضافه شد.", mainKb);
}

// ========== 9. MAIN WORKER ==========
export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      const url = new URL(request.url);

      if (url.pathname === "/test") {
        const allowedStr = env.ALLOWED_USERS || "";
        const allowedUsers = allowedStr
          ? allowedStr.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
          : [];
        const adminStr = env.ADMIN_USERS || "";
        const adminUsers = adminStr
          ? adminStr.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
          : [];
        const existingPages = new Set(CONTENT.map(r => r.page));
        const missingPages = [];
        for (let i = 1; i <= 603; i += 2) { if (!existingPages.has(i)) missingPages.push(i); }
        const pageCounts = {};
        CONTENT.forEach(r => { pageCounts[r.page] = (pageCounts[r.page] || 0) + 1; });
        const duplicatedPages = Object.entries(pageCounts).filter(e => e[1] > 1).map(e => e[0] + " (×" + e[1] + ")");

        return new Response(JSON.stringify({
          version: 23, schema: 5, doPrefix: DO_VERSION_PREFIX,
          backupMode: "kv", historyLimit: HISTORY_LIMIT,
          hasToken: !!env.BOT_TOKEN, hasKV: !!env.USERS_KV, hasDO: !!env.CREDIT_MANAGER,
          hasAdminSecret: !!env.ADMIN_SECRET,
          records: CONTENT.length, expectedRecords: 302,
          missingCount: missingPages.length, missingPages, duplicatedPages,
          wallet: (env.WALLET_TOKEN || "").startsWith("WALLET-TEST") ? "test" : "real",
          rateLimitMs: DRAW_COOLDOWN_MS, adminsCount: adminUsers.length,
          backupRetentionDays: BACKUP_RETENTION_DAYS,
          privateMode: allowedUsers.length > 0 ? allowedUsers.length + " users allowed" : "public (all users)",
        }, null, 2), { headers: { "Content-Type": "application/json" } });
      }

      if (url.pathname === "/backups") {
        if (!checkAdminSecret(env, url)) return new Response("Unauthorized", { status: 401 });
        const list = await listBackups(env);
        return new Response(JSON.stringify({ count: list.length, items: list }, null, 2), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.pathname === "/backup") {
        if (!checkAdminSecret(env, url)) return new Response("Unauthorized", { status: 401 });
        const backupKey = url.searchParams.get("key");
        if (!backupKey) return new Response("Missing key", { status: 400 });
        const raw = await env.USERS_KV.get(backupKey);
        if (!raw) return new Response("Not found", { status: 404 });
        return new Response(raw, { headers: { "Content-Type": "application/json" } });
      }

      if (url.pathname === "/backup-now") {
        if (!checkAdminSecret(env, url)) return new Response("Unauthorized", { status: 401 });
        const res = await performBackup(env);
        return new Response(JSON.stringify(res, null, 2), { headers: { "Content-Type": "application/json" } });
      }

      return new Response("ok");
    }

    if (request.method === "POST") {
      const url = new URL(request.url);

      if (url.pathname === "/restore") {
        if (!checkAdminSecret(env, url)) return new Response("Unauthorized", { status: 401 });
        const backupKey = url.searchParams.get("key");
        if (!backupKey) return new Response("Missing key", { status: 400 });
        const raw = await env.USERS_KV.get(backupKey);
        if (!raw) return new Response("Not found", { status: 404 });
        const backup = JSON.parse(raw);
        let restored = 0;
        for (const uid of Object.keys(backup.users || {})) {
          try {
            const stub = getStub(env, parseInt(uid, 10));
            await stub.restoreData(backup.users[uid]);
            restored++;
          } catch (e) { console.error("Restore error for " + uid + ":", e); }
        }
        return new Response(JSON.stringify({ success: true, restored, total: Object.keys(backup.users || {}).length }), {
          headers: { "Content-Type": "application/json" },
        });
      }

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

  async scheduled(event, env, ctx) {
    console.log("[Cron] Triggered at", new Date().toISOString());
    ctx.waitUntil(performBackup(env));
  },
};