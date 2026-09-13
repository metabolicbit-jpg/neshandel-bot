// ========== 1. IMPORT ==========
import { DurableObject } from "cloudflare:workers";
import { CONTENT } from "./content/index.js";

// ========== 2. CONSTANTS ==========
const API_BASE = "https://tapi.bale.ai";

// 6 دسته و 22 موضوع
const CATEGORIES = {
  family:    { title: "👪 خانواده",   topics: ["marriage","proposal","childbirth","divorce","breakup","reconcile"] },
  business:  { title: "💼 کسب‌وکار",  topics: ["work","trade","partnership","investment","resign","business","legal","loan"] },
  assets:    { title: "🏠 دارایی",    topics: ["home","car","guarantee"] },
  travel:    { title: "✈️ سفر",       topics: ["travel","migration","moving"] },
  education: { title: "🎓 تحصیل",     topics: ["study"] },
  health:    { title: "🩺 سلامت",     topics: ["health"] },
};

const TOPIC_NAMES = {
  marriage:"ازدواج", proposal:"خواستگاری", childbirth:"فرزندآوری",
  divorce:"طلاق", breakup:"فسخ", reconcile:"آشتی",
  work:"کار", trade:"معامله", partnership:"شراکت",
  investment:"سرمایه‌گذاری", resign:"استعفا", business:"کسب شخصی",
  legal:"حقوقی", loan:"وام",
  home:"خانه", car:"خودرو", guarantee:"ضمانت",
  travel:"سفر", migration:"مهاجرت", moving:"جابجایی",
  study:"تحصیل", health:"سلامت",
};

// فاز ۱ (پنهان): طلاق، فسخ، خواستگاری، فرزندآوری، آشتی، شراکت، استعفا، کسب شخصی، حقوقی، وام، ضمانت، جابجایی
const PHASE_2_TOPICS = ["divorce","breakup","proposal","childbirth","reconcile","partnership","resign","business","legal","loan","guarantee","moving"];

const SHOP_PACKAGES = {
  pack10:  { credits: 10,  price: 200000,   title: "🥉 ۱۰ اعتبار" },
  pack35:  { credits: 35,  price: 500000,   title: "🥈 ۳۵ اعتبار (۳۰ + ۵ هدیه)" },
  pack120: { credits: 120, price: 1500000,  title: "🥇 ۱۲۰ اعتبار (۱۰۰ + ۲۰ هدیه)" },
};

// ========== 3. DURABLE OBJECT ==========
export class CreditManager extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS credits (
        user_id TEXT PRIMARY KEY,
        amount INTEGER NOT NULL DEFAULT 0,
        total_estekhare INTEGER NOT NULL DEFAULT 0,
        total_opens INTEGER NOT NULL DEFAULT 0,
        last_updated TEXT NOT NULL
      );
    `);
  }

  async getCredits(userId) {
    const r = this.ctx.storage.sql.exec(
      `SELECT amount FROM credits WHERE user_id = ?`, userId
    ).one();
    return r ? r.amount : 0;
  }

  async getStats(userId) {
    const r = this.ctx.storage.sql.exec(
      `SELECT amount, total_estekhare, total_opens FROM credits WHERE user_id = ?`, userId
    ).one();
    return r || { amount: 0, total_estekhare: 0, total_opens: 0 };
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

  async recordEstekhare(userId) {
    const now = new Date().toISOString();
    this.ctx.storage.sql.exec(
      `INSERT INTO credits (user_id, amount, total_estekhare, last_updated) VALUES (?, 0, 1, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         total_estekhare = total_estekhare + 1,
         last_updated = excluded.last_updated`,
      userId, now
    );
  }
}

// ========== 4. HELPERS ==========
async function callBaleAPI(env, method, body) {
  const url = `${API_BASE}/bot${env.BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function getStub(env, userId) {
  const id = env.CREDIT_MANAGER.idFromName(String(userId));
  return env.CREDIT_MANAGER.get(id);
}

function isUserAllowed(env, chatId) {
  const list = (env.ALLOWED_USERS || "").trim();
  if (!list) return true;
  return list.split(",").map(s => s.trim()).includes(String(chatId));
}

function isTopicAllowed(env, topic) {
  const phase = parseInt(env.CURRENT_PHASE || "1");
  if (phase >= 2) return true;
  return !PHASE_2_TOPICS.includes(topic);
}

function pickRandom(env) {
  if (!CONTENT.length) return null;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  // فیلتر بر اساس فاز
  const phase = parseInt(env.CURRENT_PHASE || "1");
  return CONTENT[arr[0] % CONTENT.length];
}

function badgeEmoji(level) {
  if (!level) return "";
  if (level.includes("بسیار خوب")) return "✅🌟";
  if (level.includes("خوب")) return "✅";
  if (level.includes("میانه")) return "⚖️";
  if (level.includes("بسیار بد")) return "🔴🔴🔴";
  if (level.includes("بد")) return "🔴";
  return "";
}

// ========== 5. MESSAGE BUILDERS ==========
function mainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: "🔮 استخاره" }],
      [{ text: "👤 حساب من" }, { text: "🛍 فروشگاه" }],
      [{ text: "🕌 آداب و دعا" }, { text: "⚖️ سلب مسئولیت" }],
    ],
    resize_keyboard: true,
  };
}

function categoriesKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "👪 خانواده", callback_data: "cat_family" }, { text: "💼 کسب‌وکار", callback_data: "cat_business" }],
      [{ text: "🏠 دارایی", callback_data: "cat_assets" }, { text: "✈️ سفر", callback_data: "cat_travel" }],
      [{ text: "🎓 تحصیل", callback_data: "cat_education" }, { text: "🩺 سلامت", callback_data: "cat_health" }],
      [{ text: "🏠 منوی اصلی", callback_data: "main_menu" }],
    ],
  };
}

function topicsKeyboard(env, catKey) {
  const cat = CATEGORIES[catKey];
  if (!cat) return categoriesKeyboard();
  const rows = [];
  let row = [];
  for (const t of cat.topics) {
    if (!isTopicAllowed(env, t)) continue;
    row.push({ text: TOPIC_NAMES[t] || t, callback_data: `topic_${catKey}_${t}` });
    if (row.length === 2) { rows.push(row); row = []; }
  }
  if (row.length) rows.push(row);
  rows.push([{ text: "🔙 بازگشت", callback_data: "back_categories" }]);
  return { inline_keyboard: rows };
}

function adabKeyboard(env, catKey, topic) {
  return {
    inline_keyboard: [
      [{ text: "📖 خواندم، استخاره کن", callback_data: `do_${catKey}_${topic}` }],
      [{ text: "🔙 بازگشت", callback_data: `cat_${catKey}` }],
    ],
  };
}

function freeResultKeyboard(catKey, topic, page) {
  return {
    inline_keyboard: [
      [{ text: "💎 استخاره تخصصی", callback_data: `premium_${catKey}_${topic}_${page}` }],
      [{ text: "🔮 استخاره جدید", callback_data: "new_estekhare" }],
    ],
  };
}

function premiumResultKeyboard(topic) {
  return {
    inline_keyboard: [
      [{ text: "🔮 استخاره جدید", callback_data: "new_estekhare" }],
      [{ text: "🏠 منوی اصلی", callback_data: "main_menu" }],
    ],
  };
}

function shopKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🥉 ۱۰ اعتبار — ۲۰۰,۰۰۰ تومان", callback_data: "buy_pack10" }],
      [{ text: "🥈 ۳۵ اعتبار — ۵۰۰,۰۰۰ تومان", callback_data: "buy_pack35" }],
      [{ text: "🥇 ۱۲۰ اعتبار — ۱,۵۰۰,۰۰۰ تومان", callback_data: "buy_pack120" }],
      [{ text: "🏠 منوی اصلی", callback_data: "main_menu" }],
    ],
  };
}

function freeMsg(record, topic) {
  const t = record.topics?.[topic] || {};
  return `
📊 نتیجه: ${record.level} ${record.badge || badgeEmoji(record.level)}

📝 ${record.free_summary || "—"}

📖 ${record.arabic || "—"}

🌐 ${record.translation || "—"}

📍 سوره ${record.surah || "—"} | آیه ${record.ayah || "—"}

${record.cta_free || "💡 برای دانلود تحلیل تخصصی، روی دکمه‌ی زیر بزن."}
  `.trim();
}

function premiumMsg(record, topic) {
  const t = record.topics?.[topic] || {};
  return `
💎 پیام محوری:
${record.core_message || "—"}

💡 نکته و رمز آیه:
${t.tip || "—"}

⚠️ زنگ خطر / هشدار:
${t.warning || "—"}

🛠 راهکار عملیاتی:
${t.action || "—"}

🌟 جمع‌بندی نهایی:
${record.final_summary || "—"}

${record.cta_dua || ""}

⚖️ سلب مسئولیت: استخاره جایگزین عقل، تحقیق و مشورت نیست و «وحی منزل» محسوب نمی‌شود.
  `.trim();
}

// ========== 6. MAIN WORKER ==========
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // /test
    if (request.method === "GET" && url.pathname === "/test") {
      return new Response(JSON.stringify({
        status: "ok",
        version: "v18",
        schema: "v5",
        contentCount: CONTENT.length,
        doConfigured: !!env.CREDIT_MANAGER,
        kvConfigured: !!env.USERS_KV,
        tokenConfigured: !!env.BOT_TOKEN,
        phase: env.CURRENT_PHASE || "1",
        publicMode: !(env.ALLOWED_USERS || "").trim(),
      }, null, 2), { headers: { "Content-Type": "application/json" } });
    }

    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let update;
    try { update = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

    const message = update.message || update.callback_query?.message;
    const callbackQuery = update.callback_query;
    const chatId = message?.chat?.id;
    const userId = chatId ? String(chatId) : null;

    if (!userId) return new Response("OK", { status: 200 });
    if (!isUserAllowed(env, chatId)) {
      await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: "⛔ دسترسی ندارید." });
      return new Response("OK", { status: 200 });
    }

    const stub = getStub(env, userId);

    // ==================== CALLBACK ====================
    if (callbackQuery) {
      const data = callbackQuery.data || "";
      await callBaleAPI(env, "answerCallbackQuery", { callback_query_id: callbackQuery.id });

      // --- منو ---
      if (data === "main_menu") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "🏠 منوی اصلی",
          reply_markup: mainMenuKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      if (data === "new_estekhare") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "📂 دسته‌ی موردنظرت رو انتخاب کن:",
          reply_markup: categoriesKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      if (data === "back_categories") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "📂 دسته‌ی موردنظرت رو انتخاب کن:",
          reply_markup: categoriesKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      // --- دسته ---
      if (data.startsWith("cat_")) {
        const catKey = data.replace("cat_", "");
        const cat = CATEGORIES[catKey];
        if (!cat) {
          await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: "⚠️ دسته یافت نشد." });
          return new Response("OK", { status: 200 });
        }
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: `📂 دسته‌ی «${cat.title}» — موضوعت رو انتخاب کن:`,
          reply_markup: topicsKeyboard(env, catKey),
        });
        return new Response("OK", { status: 200 });
      }

      // --- نمایش آداب ---
      if (data.startsWith("topic_")) {
        const parts = data.split("_");
        const catKey = parts[1];
        const topic = parts[2];
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "🤲 آداب کوتاه:\n\n۱. نیتت را روشن کن.\n۲. وضو و رو به قبله.\n۳. سه صلوات + دعای استخاره.\n\nاللّهُمَّ إِنِّی تَفَأَّلْتُ بِکِتابِکَ، وَ تَوَکَّلْتُ عَلَیْکَ، فَأَرِنی مِنْ کِتابِکَ ما هُوَ مَکْتومٌ مِنْ سِرِّکَ المَکْنونِ في غَیْبِکَ.",
          reply_markup: adabKeyboard(env, catKey, topic),
        });
        return new Response("OK", { status: 200 });
      }

      // --- اجرای استخاره ---
      if (data.startsWith("do_")) {
        const parts = data.split("_");
        const catKey = parts[1];
        const topic = parts[2];

        const record = pickRandom(env);
        if (!record) {
          await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: "⚠️ محتوایی موجود نیست." });
          return new Response("OK", { status: 200 });
        }

        await stub.recordEstekhare(userId);

        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: freeMsg(record, topic),
          reply_markup: freeResultKeyboard(catKey, topic, record.page),
        });
        return new Response("OK", { status: 200 });
      }

      // --- استخاره تخصصی ---
      if (data.startsWith("premium_")) {
        const parts = data.split("_");
        const catKey = parts[1];
        const topic = parts[2];
        const page = parseInt(parts[3]);

        const record = CONTENT.find(r => r.page === page);
        if (!record) {
          await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: "⚠️ محتوا یافت نشد." });
          return new Response("OK", { status: 200 });
        }

        const ok = await stub.deductCredit(userId);
        if (!ok) {
          const credits = await stub.getCredits(userId);
          await callBaleAPI(env, "sendMessage", {
            chat_id: chatId,
            text: `⚠️ اعتبار کافی نیست. اعتبار فعلی: ${credits}\n\nبرای خرید اعتبار، از فروشگاه استفاده کن.`,
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛍 فروشگاه", callback_data: "open_shop" }],
                [{ text: "🏠 منوی اصلی", callback_data: "main_menu" }],
              ],
            },
          });
          return new Response("OK", { status: 200 });
        }

        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: premiumMsg(record, topic),
          reply_markup: premiumResultKeyboard(topic),
        });
        return new Response("OK", { status: 200 });
      }

      // --- فروشگاه ---
      if (data === "open_shop") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "🛍 فروشگاه اعتبار\n\nبا خرید اعتبار، می‌تونی تحلیل‌های تخصصی رو باز کنی:",
          reply_markup: shopKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      // --- خرید بسته ---
      if (data.startsWith("buy_")) {
        const packKey = data.replace("buy_", "");
        const pack = SHOP_PACKAGES[packKey];
        if (!pack) {
          await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: "⚠️ بسته یافت نشد." });
          return new Response("OK", { status: 200 });
        }
        try {
          await callBaleAPI(env, "sendInvoice", {
            chat_id: chatId,
            title: pack.title,
            description: `${pack.credits} اعتبار برای استخاره تخصصی`,
            payload: packKey,
            provider_token: env.WALLET_TOKEN || "",
            currency: "IRR",
            prices: [{ label: pack.title, amount: pack.price }],
          });
        } catch (e) {
          await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: "⚠️ خطا در ایجاد صورتحساب." });
        }
        return new Response("OK", { status: 200 });
      }

      return new Response("OK", { status: 200 });
    }

    // ==================== MESSAGES ====================
    if (message?.text) {
      const text = message.text;

      if (text === "/start") {
        // هدیه‌ی کاربر جدید
        const credits = await stub.getCredits(userId);
        if (credits === 0) await stub.addCredits(userId, 2);
        const newCredits = await stub.getCredits(userId);

        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: `🌿 سلام! به بات نشانِ دل خوش آمدید.\n\n💎 اعتبار شما: ${newCredits}\n\nبرای شروع، روی «🔮 استخاره» بزن.`,
          reply_markup: mainMenuKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      if (text === "🔮 استخاره" || text === "/estekhare") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "📂 دسته‌ی موردنظرت رو انتخاب کن:",
          reply_markup: categoriesKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      if (text === "👤 حساب من" || text === "/account") {
        const stats = await stub.getStats(userId);
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: `👤 حساب من\n\n💎 اعتبار: ${stats.amount}\n🔮 تعداد استخاره‌ها: ${stats.total_estekhare}\n💎 بازکردن تخصصی: ${stats.total_opens}`,
          reply_markup: mainMenuKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      if (text === "🛍 فروشگاه" || text === "/shop") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "🛍 فروشگاه اعتبار:",
          reply_markup: shopKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      if (text === "🕌 آداب و دعا" || text === "/adab") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "🕌 آداب استخاره:\n\n۱. نیت روشن\n۲. وضو و رو به قبله\n۳. سه صلوات + دعای استخاره\n\n📿 دعای استخاره:\n«اللّهُمَّ إِنِّی تَفَأَّلْتُ بِکِتابِکَ...»",
          reply_markup: mainMenuKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      if (text === "⚖️ سلب مسئولیت" || text === "/disclaimer") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "⚖️ سلب مسئولیت:\n\nدر احکام اسلامی، استخاره جایگزین عقل، تحقیق و مشورت نیست و «وحی منزل» محسوب نمی‌شود. این بات صرفاً یک راهنمای معنوی بر اساس آیات قرآن است. برای تصمیمات حساس، حتماً با متخصصان و مشاوران مشورت کنید.",
          reply_markup: mainMenuKeyboard(),
        });
        return new Response("OK", { status: 200 });
      }

      if (text === "/credits") {
        const credits = await stub.getCredits(userId);
        await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: `💎 اعتبار شما: ${credits}` });
        return new Response("OK", { status: 200 });
      }
    }

    // ==================== PRE-CHECKOUT ====================
    if (update.pre_checkout_query) {
      await callBaleAPI(env, "answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
      return new Response("OK", { status: 200 });
    }

    // ==================== SUCCESSFUL PAYMENT ====================
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const chargeId = payment.telegram_payment_charge_id;
      const txKey = `tx:${chargeId}`;

      const dup = await env.USERS_KV.get(txKey);
      if (dup) return new Response("OK", { status: 200 });

      const pack = SHOP_PACKAGES[payment.invoice_payload];
      if (pack) {
        await stub.addCredits(userId, pack.credits);
        await env.USERS_KV.put(txKey, "done", { expirationTtl: 86400 * 30 });
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: `✅ پرداخت موفق! ${pack.credits} اعتبار اضافه شد.`,
          reply_markup: mainMenuKeyboard(),
        });
      }

      return new Response("OK", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  },
};