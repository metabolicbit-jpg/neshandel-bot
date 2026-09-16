// ========== 1. IMPORT ==========
import { DurableObject } from "cloudflare:workers";
import { CONTENT } from "./content/index.js";

// ========== 2. CONSTANTS ==========
const API_BASE = "https://tapi.bale.ai";
const DRAW_COOLDOWN_MS = 5000;
const DO_VERSION_PREFIX = "v4:";
const BACKUP_RETENTION_DAYS = 30;
const HISTORY_LIMIT = 10;
const REFERRAL_REWARD_REFERRER = 1;
const REFERRAL_REWARD_NEW_USER = 1;
const REFERRAL_BASE_LINK = "https://ble.ir/";

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

// ========== DUA_BANK (Schema v6.2) ==========
const DUA_BANK = {
  "marriage.main": {
    text: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا",
    translation: "پروردگارا، از همسران و فرزندانمان مایه‌ی روشنی چشم به ما عطا کن و ما را پیشوای پرهیزگاران قرار ده.",
    source: "فرقان ۷۴",
  },
  "trade.main": {
    text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا",
    translation: "خدایا، از تو دانش سودمند، روزی پاک و کردار پذیرفته می‌خواهم.",
    source: "حدیث",
  },
  "work.main": {
    text: "رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ",
    translation: "پروردگارا، من به هر خیری که بر من فرو فرستی نیازمندم.",
    source: "قصص ۲۴",
  },
  "home.main": {
    text: "رَبِّ أَنزِلْنِي مُنزَلًا مُّبَارَكًا وَأَنتَ خَيْرُ الْمُنزِلِينَ",
    translation: "پروردگارا، مرا در جایگاهی پربرکت فرود آور که تو بهترین جای‌دهندگانی.",
    source: "مؤمنون ۲۹",
  },
  "car.main": {
    text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    translation: "به نام خدایی که با نامش هیچ چیز در زمین و آسمان آسیب نمی‌رساند؛ و او شنوا و داناست.",
    source: "حدیث",
  },
  "investment.main": {
    text: "اللَّهُمَّ بَارِكْ لَنَا فِي أَمْوَالِنَا وَأَوْلَادِنَا وَاجْعَلْنَا مِنَ الشَّاكِرِينَ",
    translation: "خدایا، در اموال و فرزندانمان برکت ده و ما را از سپاسگزاران قرار ده.",
    source: "حدیث",
  },
  "loan.main": {
    text: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّن سِوَاكَ",
    translation: "خدایا، مرا با حلال خود از حرام بی‌نیاز کن و با فضلت از غیر خودت بی‌نیاز ساز.",
    source: "حدیث",
  },
  "study.main": {
    text: "رَبِّ زِدْنِي عِلْمًا",
    translation: "پروردگارا، بر دانش من بیفزا.",
    source: "طه ۱۱۴",
  },
  "health.main": {
    text: "وَإِذَا مَرِضْتُ فَهُوَ يَشْفِينِ",
    translation: "و هنگامی که بیمار شدم، او مرا شفا می‌دهد.",
    source: "شعراء ۸۰",
  },
};

function getDua(duaRef) {
  if (!duaRef) return null;
  return DUA_BANK[duaRef] || null;
}

const DISCLAIMER = "⚖️ سلب مسئولیت و نکته مهم فقهی: فراموش نکنید که در احکام اسلامی، استخاره جایگزین عقل، تحقیق و مشورت نیست و «وحی منزل» محسوب نمی‌شود. این متن صرفاً یک تفسیر و راهنمای معنوی بر اساس آیات قرآن است. لذا برای تصمیمات حساس زندگی‌تان، حتماً در کنار این استخاره، با متخصصان و مشاوران کارآزمودهٔ آن حوزه مشورت فرمایید. 🤝";

const WELCOME = "🌿 به «نشانِ دل» خوش آمدی.\n\n⚖️ استخاره برای طلب خیر است و جایگزین مشورت نیست.\n\nبرای شروع، «🔮 استخاره» را بزن.";
const WELCOME_REFERRAL = "🎁 <b>به «نشانِ دل» خوش آمدی!</b>\n\nبا لینک دعوت دوستت اومدی — <b>۳ اعتبار هدیه</b> گرفتی (۲ + ۱ جایزه).\n\n⚖️ استخاره برای طلب خیر است و جایگزین مشورت نیست.\n\nبرای شروع، «🔮 استخاره» را بزن.";
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
    this._ensureSchema();
  }

  _ensureSchema() {
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
          referral_count INTEGER NOT NULL DEFAULT 0,
          referred_by TEXT,
          last_updated TEXT NOT NULL
        );
      `);
    } catch (e) { console.error("ensureSchema credits error:", e); }

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
    } catch (e) { console.error("ensureSchema history error:", e); }

    try {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS referrals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          referrer_id TEXT NOT NULL,
          referred_id TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
      `);
    } catch (e) { console.error("ensureSchema referrals error:", e); }

    const tryAlter = (sql) => { try { this.ctx.storage.sql.exec(sql); } catch (e) {} };
    tryAlter(`ALTER TABLE credits ADD COLUMN total_estekhare INTEGER NOT NULL DEFAULT 0`);
    tryAlter(`ALTER TABLE credits ADD COLUMN total_opens INTEGER NOT NULL DEFAULT 0`);
    tryAlter(`ALTER TABLE credits ADD COLUMN last_topic TEXT`);
    tryAlter(`ALTER TABLE credits ADD COLUMN last_page INTEGER`);
    tryAlter(`ALTER TABLE credits ADD COLUMN last_draw_time INTEGER`);
    tryAlter(`ALTER TABLE credits ADD COLUMN unlocked TEXT DEFAULT '[]'`);
    tryAlter(`ALTER TABLE credits ADD COLUMN name TEXT DEFAULT ''`);
    tryAlter(`ALTER TABLE credits ADD COLUMN joined INTEGER DEFAULT 0`);
    tryAlter(`ALTER TABLE credits ADD COLUMN referral_count INTEGER NOT NULL DEFAULT 0`);
    tryAlter(`ALTER TABLE credits ADD COLUMN referred_by TEXT`);
  }

  _selectOne(sql, ...params) {
    try {
      const rows = this.ctx.storage.sql.exec(sql, ...params).toArray();
      return rows.length > 0 ? rows[0] : null;
    } catch (e) {
      console.error("_selectOne error:", e);
      return null;
    }
  }

  _exec(sql, ...params) {
    try {
      return this.ctx.storage.sql.exec(sql, ...params);
    } catch (e) {
      console.error("_exec error:", e);
      throw e;
    }
  }

  async getStats(userId) {
    this._ensureSchema();
    const r = this._selectOne(`SELECT * FROM credits WHERE user_id = ?`, userId);
    if (r) return r;
    return { user_id: userId, amount: 0, total_estekhare: 0, total_opens: 0, last_topic: null, last_page: null, last_draw_time: 0, unlocked: "[]", name: "", joined: 0, referral_count: 0, referred_by: null };
  }

  async ensureUser(userId, name) {
    this._ensureSchema();
    const now = new Date().toISOString();
    const trimmedName = (name || "").trim();
    const existing = this._selectOne(`SELECT user_id FROM credits WHERE user_id = ?`, userId);
    if (existing) {
      if (trimmedName) {
        this._exec(`UPDATE credits SET name = ?, last_updated = ? WHERE user_id = ?`, trimmedName, now, userId);
      } else {
        this._exec(`UPDATE credits SET last_updated = ? WHERE user_id = ?`, now, userId);
      }
    } else {
      this._exec(
        `INSERT INTO credits (user_id, amount, name, joined, last_updated) VALUES (?, 0, ?, ?, ?)`,
        userId, trimmedName, Date.now(), now
      );
    }
  }

  async addCredits(userId, amount) {
    this._ensureSchema();
    const now = new Date().toISOString();
    this._exec(
      `INSERT INTO credits (user_id, amount, last_updated) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET amount = amount + excluded.amount, last_updated = excluded.last_updated`,
      userId, amount, now
    );
  }

  async deductCredit(userId) {
    this._ensureSchema();
    const r = this._exec(
      `UPDATE credits SET amount = amount - 1, total_opens = total_opens + 1, last_updated = ?
       WHERE user_id = ? AND amount > 0`,
      new Date().toISOString(), userId
    );
    return r.rowsWritten > 0;
  }

  async canDraw(userId) {
    this._ensureSchema();
    try {
      const r = this._selectOne(`SELECT last_draw_time FROM credits WHERE user_id = ?`, userId);
      if (!r || !r.last_draw_time) return true;
      return (Date.now() - r.last_draw_time) >= DRAW_COOLDOWN_MS;
    } catch (e) { console.error("canDraw error:", e); return true; }
  }

  async recordEstekhare(userId, topic, page, surah, ayah, level) {
    this._ensureSchema();
    const now = new Date().toISOString();
    const ts = Date.now();
    this._exec(
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
    try {
      this._exec(
        `INSERT INTO estekhare_history (user_id, topic, page, surah, ayah, level, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        userId, topic, page, surah || "", ayah || 0, level || "", ts
      );
    } catch (e) { console.error("addHistory error:", e); }
  }

  async getHistory(userId, limit) {
    this._ensureSchema();
    const lim = limit || HISTORY_LIMIT;
    try {
      return this.ctx.storage.sql.exec(
        `SELECT id, topic, page, surah, ayah, level, created_at 
         FROM estekhare_history WHERE user_id = ? 
         ORDER BY created_at DESC LIMIT ?`,
        userId, lim
      ).toArray();
    } catch (e) { return []; }
  }

  async clearHistory(userId) {
    this._ensureSchema();
    this._exec(`DELETE FROM estekhare_history WHERE user_id = ?`, userId);
  }

  async getHistoryItem(userId, id) {
    this._ensureSchema();
    return this._selectOne(`SELECT * FROM estekhare_history WHERE user_id = ? AND id = ?`, userId, id);
  }

  async isUnlocked(userId, page, topic) {
    this._ensureSchema();
    const r = this._selectOne(`SELECT unlocked FROM credits WHERE user_id = ?`, userId);
    if (!r || !r.unlocked) return false;
    try { return JSON.parse(r.unlocked).includes(page + ":" + topic); } catch { return false; }
  }

  async markUnlocked(userId, page, topic) {
    this._ensureSchema();
    const r = this._selectOne(`SELECT unlocked FROM credits WHERE user_id = ?`, userId);
    let arr = [];
    if (r && r.unlocked) { try { arr = JSON.parse(r.unlocked); } catch {} }
    const key = page + ":" + topic;
    if (!arr.includes(key)) arr.push(key);
    this._exec(
      `UPDATE credits SET unlocked = ?, last_updated = ? WHERE user_id = ?`,
      JSON.stringify(arr), new Date().toISOString(), userId
    );
  }

  async hasBeenReferred(userId) {
    this._ensureSchema();
    const r = this._selectOne(`SELECT referred_id FROM referrals WHERE referred_id = ?`, userId);
    return !!r;
  }

  async addReferral(referrerId, referredId) {
    this._ensureSchema();
    this._exec(
      `INSERT INTO referrals (referrer_id, referred_id, created_at) VALUES (?, ?, ?)`,
      referrerId, referredId, Date.now()
    );
    this._exec(`UPDATE credits SET referred_by = ? WHERE user_id = ?`, referrerId, referredId);
  }

  async incrementReferralCount(userId) {
    this._ensureSchema();
    this._exec(`UPDATE credits SET referral_count = referral_count + 1 WHERE user_id = ?`, userId);
  }

  async getReferredUsers(userId) {
    this._ensureSchema();
    try {
      return this.ctx.storage.sql.exec(
        `SELECT referred_id, created_at FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC LIMIT 20`,
        userId
      ).toArray();
    } catch (e) { return []; }
  }

  async resetData() {
    this._ensureSchema();
    try { this._exec(`DELETE FROM credits`); } catch (e) {}
    try { this._exec(`DELETE FROM estekhare_history`); } catch (e) {}
    try { this._exec(`DELETE FROM referrals`); } catch (e) {}
    return true;
  }

  async exportData() {
    this._ensureSchema();
    const credits = this.ctx.storage.sql.exec(`SELECT * FROM credits`).toArray();
    const history = this.ctx.storage.sql.exec(`SELECT * FROM estekhare_history`).toArray();
    const referrals = this.ctx.storage.sql.exec(`SELECT * FROM referrals`).toArray();
    return { credits, history, referrals };
  }

  async restoreData(data) {
    this._ensureSchema();
    if (Array.isArray(data)) {
      for (const row of data) {
        try {
          this._exec(
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
        } catch (e) {}
      }
    } else if (data && data.credits) {
      for (const row of data.credits) {
        try {
          this._exec(
            `INSERT INTO credits (user_id, amount, total_estekhare, total_opens, last_topic, last_page, last_draw_time, unlocked, name, joined, referral_count, referred_by, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               amount = excluded.amount, total_estekhare = excluded.total_estekhare,
               total_opens = excluded.total_opens, last_topic = excluded.last_topic,
               last_page = excluded.last_page, last_draw_time = excluded.last_draw_time,
               unlocked = excluded.unlocked, name = excluded.name,
               joined = excluded.joined, referral_count = excluded.referral_count,
               referred_by = excluded.referred_by, last_updated = excluded.last_updated`,
            row.user_id, row.amount || 0, row.total_estekhare || 0, row.total_opens || 0,
            row.last_topic || null, row.last_page || null, row.last_draw_time || 0,
            row.unlocked || "[]", row.name || "", row.joined || 0,
            row.referral_count || 0, row.referred_by || null, new Date().toISOString()
          );
        } catch (e) {}
      }
      for (const row of data.history || []) {
        try {
          this._exec(
            `INSERT INTO estekhare_history (user_id, topic, page, surah, ayah, level, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            row.user_id, row.topic, row.page, row.surah || "", row.ayah || 0, row.level || "", row.created_at || Date.now()
          );
        } catch (e) {}
      }
      for (const row of data.referrals || []) {
        try {
          this._exec(
            `INSERT INTO referrals (referrer_id, referred_id, created_at) VALUES (?, ?, ?)`,
            row.referrer_id, row.referred_id, row.created_at || Date.now()
          );
        } catch (e) {}
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

async function getBotUsername(env) {
  try {
    const cached = await env.USERS_KV.get("bot_username");
    if (cached) return cached;
  } catch (e) {}
  try {
    const res = await baleCall(env, "getMe", {});
    if (res.ok && res.result && res.result.username) {
      const username = res.result.username;
      try { await env.USERS_KV.put("bot_username", username, { expirationTtl: 86400 * 7 }); } catch (e) {}
      return username;
    }
  } catch (e) { console.error("getBotUsername error:", e); }
  return null;
}

function buildReferralLink(username, chatId) {
  if (!username) return null;
  return REFERRAL_BASE_LINK + username + "?start=ref_" + chatId;
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

function renderCorePoints(cp) {
  if (!Array.isArray(cp) || cp.length === 0) return "";
  return cp.map(c => "• " + c).join("\n");
}

function topicBlockV5(r, t) {
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
  console.log("[Backup] Found " + userIds.length + " users");

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
        return { uid, data: null };
      }
    }));
    for (const r of results) {
      if (r.data) allData[r.uid] = r.data;
    }
  }

  const backup = { timestamp: startedAt, date: new Date(startedAt).toISOString(), userCount: Object.keys(allData).length, users: allData };
  const dateKey = new Date(startedAt).toISOString().split("T")[0];
  const kvKey = "backup:" + dateKey;
  const ttl = (BACKUP_RETENTION_DAYS + 5) * 24 * 60 * 60;
  await env.USERS_KV.put(kvKey, JSON.stringify(backup), { expirationTtl: ttl });

  const duration = Date.now() - startedAt;
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

const accountKb = { inline_keyboard: [
  [{ text: "📜 تاریخچه‌ی استخاره‌ها", callback_data: "history" }],
  [{ text: "🎁 دعوت دوستان", callback_data: "referral" }],
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

function referralKb(link) {
  const rows = [];
  if (link) {
    rows.push([{ text: "📋 کپی لینک دعوت", copy_text: { text: link } }]);
  }
  rows.push([{ text: "👥 لیست دعوت‌شده‌ها", callback_data: "ref_list" }]);
  rows.push([{ text: "↩️ بازگشت به حساب من", callback_data: "account" }]);
  return { inline_keyboard: rows };
}

// ========== 7. MESSAGE BUILDERS ==========
function freeMsg(r, t) {
  const f = r.free || {};
  const opening = f.opening || f.salutation || "";

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

  return [
    (r.badge || "") + " نتیجه استخاره: " + (f.result_short || r.verdict || ""),
    "",
    opening,
    "",
    "📖 " + (f.arabic || ""),
    "",
    "🌐 " + (f.translation || ""),
    "",
    (f.message || ""),
    "",
    "📍 سوره " + r.surah + " | آیه " + toFa(r.ayah) + " (صفحه " + toFa(r.page) + ")",
    "",
    (f.cta || ""),
  ].join("\n");
}

function premiumMsg(r, t) {
  const B = topicBlockV5(r, t);
  const L = topicInfo(t).label;
  const dua = getDua(B.dua_ref);

  const parts = [
    "💎 استخاره تخصصی | " + L,
    "📊 نتیجه: " + (B.verdict || "") + " " + (B.badge || ""),
    "",
  ];

  if (B.topic_hook && String(B.topic_hook).trim()) {
    parts.push("✨ " + B.topic_hook);
    parts.push("");
  }

  parts.push("━━━━━━━━━━━━━━━━━━━━━");
  parts.push("");

  const coreStr = renderCorePoints(B.core_points);
  if (coreStr) {
    parts.push("💎 پیام محوری و منطوق آیه:");
    parts.push(coreStr);
    parts.push("");
  }

  if (B.tip) {
    parts.push("💡 نکته و رمز آیه:");
    parts.push(B.tip);
    parts.push("");
  }

  if (B.warning) {
    parts.push("⚠️ زنگ خطر / هشدار:");
    parts.push(B.warning);
    parts.push("");
  }

  if (B.actions && B.actions.length) {
    parts.push("🛠 راهکار عملیاتی:");
    parts.push(renderAction(B.actions));
    parts.push("");
  }

  if (B.summary) {
    parts.push("🌟 جمع‌بندی نهایی استخاره صفحه " + toFa(r.page) + ":");
    parts.push(B.summary);
    parts.push("");
  }

  if (dua) {
    parts.push("━━━━━━━━━━━━━━━━━━━━━");
    parts.push("");
    parts.push("📿 دعای مرتبط با " + L + ":");
    parts.push("");
    parts.push("«" + dua.text + "»");
    parts.push("");
    parts.push("🌐 ترجمه: " + dua.translation);
    parts.push("");
    if (dua.source) {
      parts.push("📚 منبع: " + dua.source);
      parts.push("");
    }
    parts.push("💡 برای دعاهای بیشتر، بخش «📿 ادعیه و اذکار» را ببین.");
    parts.push("");
  }

  parts.push("━━━━━━━━━━━━━━━━━━━━━");
  parts.push("");
  parts.push(DISCLAIMER);

  return parts.join("\n");
}

// ========== 8. HANDLERS ==========
async function onMessage(env, m, allowedUsers) {
  const chat = m.chat.id;
  const text = (m.text || "").trim();
  if (!isUserAllowed(env, chat)) return sendMessage(env, chat, "🔒 این بات در حال تست خصوصی است.", mainKb);
  const stub = getStub(env, chat);
  const isAdmin = isUserAdmin(env, chat);

  if (text.startsWith("/start")) {
    try {
      await env.USERS_KV.put("debug:last-start:" + chat, JSON.stringify({
        text, textLength: text.length, chatId: chat, timestamp: Date.now(),
      }), { expirationTtl: 86400 * 7 });
    } catch (e) {}
  }

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

  if (text === "/resetme") {
    try {
      await stub.resetData();
      try { await env.USERS_KV.delete("user:" + chat); } catch (e) {}
      return sendMessage(env, chat,
        "🔄 <b>حساب شما ریست شد.</b>\n\n" +
        "حالا اگه با لینک دعوت دوستت `/start ref_XXX` بزنی، referral اعمال می‌شه.\n\n" +
        "برای تست: اول از دوستت لینک دعوت بگیر، بعد بزن `/start ref_<chatId>`.",
        mainKb);
    } catch (e) {
      console.error("/resetme error:", e);
      return sendMessage(env, chat, "⚠️ خطا در ریست.", mainKb);
    }
  }

  const resetMatch = text.match(/^\/resetuser\s+(\d+)$/);
  if (resetMatch) {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    const targetUid = resetMatch[1];
    try {
      const targetStub = getStub(env, targetUid);
      await targetStub.resetData();
      try { await env.USERS_KV.delete("user:" + targetUid); } catch (e) {}
      return sendMessage(env, chat,
        "🔄 کاربر <code>" + targetUid + "</code> ریست شد.\n\nحالا می‌تونه با لینک دعوت وارد بشه.",
        mainKb);
    } catch (e) {
      return sendMessage(env, chat, "⚠️ خطا: " + e.message, mainKb);
    }
  }

  const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/);
  if (startMatch) {
    try {
      const payload = (startMatch[1] || "").trim();
      let referrerId = null;
      if (payload) {
        const refMatch = payload.match(/^ref[_\-\s]?(\d+)$/) || payload.match(/^(\d+)$/);
        if (refMatch) {
          const rId = parseInt(refMatch[1], 10);
          if (!isNaN(rId) && String(rId) !== String(chat)) {
            referrerId = rId;
          }
        }
      }

      const cleanName = ((m.chat.first_name || "") + " " + (m.chat.last_name || "")).trim();
      const stats = await stub.getStats(chat);
      const isNew = !stats.joined;

      let bonus = 0;
      let referralApplied = false;

      if (isNew && referrerId) {
        try {
          const alreadyReferred = await stub.hasBeenReferred(chat);
          if (!alreadyReferred) {
            const refStub = getStub(env, referrerId);
            const refStats = await refStub.getStats(referrerId);
            if (refStats && refStats.joined) {
              await stub.addReferral(referrerId, chat);
              await refStub.incrementReferralCount(referrerId);
              await refStub.addCredits(referrerId, REFERRAL_REWARD_REFERRER);
              bonus = REFERRAL_REWARD_NEW_USER;
              referralApplied = true;

              const refName = cleanName || "یه کاربر جدید";
              try {
                await sendMessage(env, referrerId,
                  "🎉 <b>یه دوست جدید با لینک دعوت تو اومد!</b>\n\n" +
                  "👤 نام: " + refName + "\n" +
                  "🆔 <code>" + chat + "</code>\n" +
                  "💎 +" + toFa(REFERRAL_REWARD_REFERRER) + " اعتبار هدیه گرفتی.", mainKb);
              } catch (e) { console.error("notify referrer error:", e); }
            }
          }
        } catch (e) { console.error("referral processing error:", e); }
      }

      await stub.ensureUser(chat, cleanName);
      if (isNew) {
        await stub.addCredits(chat, 2 + bonus);
      }

      try { await env.USERS_KV.put("user:" + chat, JSON.stringify({ name: cleanName, joined: Date.now() })); } catch (e) {}

      return sendMessage(env, chat, referralApplied ? WELCOME_REFERRAL : WELCOME, mainKb);
    } catch (e) {
      console.error("/start error:", e);
      return sendMessage(env, chat, START_ERROR_MSG, mainKb);
    }
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
    } catch (e) { return sendMessage(env, chat, "⚠️ خطا در دریافت لیست اعضا.", mainKb); }
  }

  if (text === "/backup") {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    await sendMessage(env, chat, "🔄 در حال اجرای بکاپ...", mainKb);
    try {
      const res = await performBackup(env);
      return sendMessage(env, chat,
        "✅ بکاپ انجام شد.\n\n📁 کلید: <code>" + res.key + "</code>\n👥 تعداد: " + toFa(res.userCount) + "\n⏱ " + toFa(res.duration) + "ms", mainKb);
    } catch (e) { return sendMessage(env, chat, "⚠️ خطا در بکاپ: " + e.message, mainKb); }
  }

  if (text === "/backups") {
    if (!isAdmin) return sendMessage(env, chat, ADMIN_ONLY_MSG, mainKb);
    try {
      const list = await listBackups(env);
      if (!list.length) return sendMessage(env, chat, "📭 هنوز بکاپی ثبت نشده.", mainKb);
      let lines = ["📦 بکاپ‌ها: " + toFa(list.length), ""];
      list.slice(0, 15).forEach((b, i) => { lines.push(toFa(i + 1) + ". <code>" + b.key + "</code>"); });
      return sendMessage(env, chat, lines.join("\n"), mainKb);
    } catch (e) { return sendMessage(env, chat, "⚠️ خطا در لیست بکاپ‌ها.", mainKb); }
  }

  if (text === "/referral" || text === "/invite") {
    const username = await getBotUsername(env);
    const stats = await stub.getStats(chat);
    const link = buildReferralLink(username, chat);
    const refCount = stats.referral_count || 0;

    if (!link) {
      return sendMessage(env, chat, "🎁 <b>دعوت دوستان</b>\n\n⚠️ در حال حاضر لینک دعوت در دسترس نیست.", accountKb);
    }

    const msg = [
      "🎁 <b>دعوت دوستان</b>", "",
      "با هر دعوت موفق، <b>" + toFa(REFERRAL_REWARD_REFERRER) + " اعتبار</b> هدیه بگیر!",
      "دوستت هم <b>" + toFa(REFERRAL_REWARD_NEW_USER) + " اعتبار اضافه</b> می‌گیره.", "",
      "📊 <b>آمار تو:</b>",
      "👥 تعداد دعوت‌های موفق: <b>" + toFa(refCount) + "</b>",
      "💎 اعتبار کسب‌شده: <b>" + toFa(refCount * REFERRAL_REWARD_REFERRER) + "</b>", "",
      "🔗 <b>لینک اختصاصی تو:</b>",
      "<code>" + link + "</code>", "",
      "📤 روی دکمه‌ی زیر بزن تا کپی بشه.",
    ].join("\n");

    return sendMessage(env, chat, msg, referralKb(link));
  }

  if (text === "🔮 استخاره" || text === "/estekhare")
    return sendMessage(env, chat, "📂 دستهٔ موردنظرت رو انتخاب کن:", catKb());

  if (text === "👤 حساب من" || text === "/account") {
    try {
      const s = await stub.getStats(chat);
      return sendMessage(env, chat,
        "👤 <b>حساب من</b>\n\n💎 اعتبار: " + toFa(s.amount) +
        "\n🔮 استخاره‌ها: " + toFa(s.total_estekhare) +
        "\n🔓 باز شده: " + toFa(s.total_opens) +
        "\n🎁 دعوت‌ها: " + toFa(s.referral_count || 0), accountKb);
    } catch (e) { return sendMessage(env, chat, "⚠️ خطا در خواندن حساب.", mainKb); }
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
        "\n🔓 باز شده: " + toFa(s.total_opens) +
        "\n🎁 دعوت‌ها: " + toFa(s.referral_count || 0), accountKb);
    }

    if (data === "history") {
      const hist = await stub.getHistory(chat, HISTORY_LIMIT);
      if (!hist.length) {
        return sendMessage(env, chat,
          "📜 <b>تاریخچه‌ی استخاره‌ها</b>\n\nهنوز استخاره‌ای ثبت نشده.",
          { inline_keyboard: [[{ text: "🔮 استخاره", callback_data: "new" }], [{ text: "↩️ بازگشت", callback_data: "account" }]] });
      }
      return sendMessage(env, chat,
        "📜 <b>تاریخچه‌ی استخاره‌ها</b>\n\nآخرین " + toFa(hist.length) + " استخاره‌ی تو:",
        historyKb(hist));
    }

    if (data === "hist_clear") {
      await stub.clearHistory(chat);
      return sendMessage(env, chat, "✅ تاریخچه پاک شد.", accountKb);
    }

    if (data === "referral") {
      const username = await getBotUsername(env);
      const stats = await stub.getStats(chat);
      const link = buildReferralLink(username, chat);
      const refCount = stats.referral_count || 0;

      if (!link) {
        return sendMessage(env, chat, "🎁 <b>دعوت دوستان</b>\n\n⚠️ لینک دعوت در دسترس نیست.", accountKb);
      }

      const msg = [
        "🎁 <b>دعوت دوستان</b>", "",
        "با هر دعوت موفق، <b>" + toFa(REFERRAL_REWARD_REFERRER) + " اعتبار</b> هدیه بگیر!",
        "دوستت هم <b>" + toFa(REFERRAL_REWARD_NEW_USER) + " اعتبار اضافه</b> می‌گیره.", "",
        "📊 <b>آمار تو:</b>",
        "👥 تعداد دعوت‌های موفق: <b>" + toFa(refCount) + "</b>",
        "💎 اعتبار کسب‌شده: <b>" + toFa(refCount * REFERRAL_REWARD_REFERRER) + "</b>", "",
        "🔗 <b>لینک اختصاصی تو:</b>",
        "<code>" + link + "</code>", "",
        "📤 روی دکمه‌ی زیر بزن تا کپی بشه.",
      ].join("\n");

      return sendMessage(env, chat, msg, referralKb(link));
    }

    if (data === "ref_list") {
      const list = await stub.getReferredUsers(chat);
      if (!list.length) {
        return sendMessage(env, chat, "👥 هنوز کسی رو دعوت نکردی.", referralKb(null));
      }
      const lines = ["👥 <b>افرادی که دعوت کردی:</b>", ""];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        let name = "";
        try {
          const raw = await env.USERS_KV.get("user:" + item.referred_id);
          if (raw) { const u = JSON.parse(raw); name = u.name || ""; }
        } catch (e) {}
        const date = new Date(item.created_at).toLocaleDateString("fa-IR");
        lines.push(toFa(i + 1) + ". " + (name || "بدون نام") + "\n🆔 <code>" + item.referred_id + "</code>\n📅 " + date);
      }
      return sendMessage(env, chat, lines.join("\n\n"), referralKb(null));
    }

    if (data.startsWith("hist_open:")) {
      const id = parseInt(data.slice(10), 10);
      if (isNaN(id)) return sendMessage(env, chat, "⚠️ خطای داده.", mainKb);
      const item = await stub.getHistoryItem(chat, id);
      if (!item) return sendMessage(env, chat, "⚠️ این مورد پیدا نشد.", mainKb);
      const record = CONTENT.find(r => r.page === item.page);
      if (!record) return sendMessage(env, chat, "⚠️ محتوای این صفحه موجود نیست.", mainKb);
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
        const botUsername = await getBotUsername(env);

        return new Response(JSON.stringify({
          version: 28, schema: "v6.2", doPrefix: DO_VERSION_PREFIX,
          botUsername: botUsername || "(unknown)",
          backupMode: "kv", historyLimit: HISTORY_LIMIT,
          referral: { referrerReward: REFERRAL_REWARD_REFERRER, newUserReward: REFERRAL_REWARD_NEW_USER },
          hasToken: !!env.BOT_TOKEN, hasKV: !!env.USERS_KV, hasDO: !!env.CREDIT_MANAGER,
          hasAdminSecret: !!env.ADMIN_SECRET,
          duaBankCount: Object.keys(DUA_BANK).length,
          records: CONTENT.length, expectedRecords: 302,
          missingCount: missingPages.length, missingPages, duplicatedPages,
          wallet: (env.WALLET_TOKEN || "").startsWith("WALLET-TEST") ? "test" : "real",
          rateLimitMs: DRAW_COOLDOWN_MS, adminsCount: adminUsers.length,
          backupRetentionDays: BACKUP_RETENTION_DAYS,
          privateMode: allowedUsers.length > 0 ? allowedUsers.length + " users allowed" : "public (all users)",
        }, null, 2), { headers: { "Content-Type": "application/json" } });
      }

      if (url.pathname === "/debug-start") {
        if (!checkAdminSecret(env, url)) return new Response("Unauthorized", { status: 401 });
        const uid = url.searchParams.get("uid");
        if (!uid) return new Response("Missing uid", { status: 400 });
        try {
          const raw = await env.USERS_KV.get("debug:last-start:" + uid);
          return new Response(raw || "No /start logged", { headers: { "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }, null, 2), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      }

      if (url.pathname === "/debug-do") {
        if (!checkAdminSecret(env, url)) return new Response("Unauthorized", { status: 401 });
        const uid = url.searchParams.get("uid");
        if (!uid) return new Response("Missing uid", { status: 400 });
        try {
          const stub = getStub(env, uid);
          const stats = await stub.getStats(uid);
          const referred = await stub.getReferredUsers(uid);
          return new Response(JSON.stringify({ success: true, stats, referred }, null, 2), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(JSON.stringify({ success: false, error: e.message }, null, 2), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      }

      if (url.pathname === "/backups") {
        if (!checkAdminSecret(env, url)) return new Response("Unauthorized", { status: 401 });
        const list = await listBackups(env);
        return new Response(JSON.stringify({ count: list.length, items: list }, null, 2), { headers: { "Content-Type": "application/json" } });
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
          } catch (e) { console.error("Restore error:", e); }
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