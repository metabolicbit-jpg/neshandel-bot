// ========== 1. IMPORT ==========
import { DurableObject } from "cloudflare:workers";

// ========== 2. CONSTANTS ==========
const BOT_TOKEN = "YOUR_BOT_TOKEN"; // در پروداکشن از Secrets استفاده کنید
const API_BASE = "https://tapi.bale.ai";
const ALLOWED_USERS = []; // در صورت خالی بودن، بات عمومی می‌شود
const CONTENT = []; // آرایه‌ی محتوای استخاره (از فایل‌های pXXX-XXX.js ایمپورت می‌شود)

// ========== 3. DURABLE OBJECT CLASS (مدیریت اعتبار) ==========
export class CreditManager extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // ساخت جدول SQLite در اولین اجرا (به‌صورت خودکار مدیریت می‌شود)
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS credits (
        user_id TEXT PRIMARY KEY,
        amount INTEGER NOT NULL DEFAULT 0,
        last_updated TEXT NOT NULL
      );
    `);
  }

  /**
   * دریافت اعتبار فعلی یک کاربر
   * @param {string} userId - شناسه‌ی یکتای کاربر (مثلاً chatId)
   * @returns {Promise<number>} - مقدار اعتبار (در صورت نبودن کاربر، ۰ برگردانده می‌شود)
   */
  async getCredits(userId) {
    const result = this.ctx.storage.sql.exec(
      `SELECT amount FROM credits WHERE user_id = ?`,
      userId
    ).one();
    return result ? result.amount : 0;
  }

  /**
   * افزودن اعتبار به کاربر (اتمیک)
   * @param {string} userId
   * @param {number} amount - مقدار اعتبار برای افزودن (می‌تواند منفی باشد)
   */
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

  /**
   * کم کردن اعتبار (اتمیک و امن در برابر همزمانی)
   * @param {string} userId
   * @returns {Promise<boolean>} - true اگر اعتبار کافی بود و کم شد، false در غیر این صورت
   */
  async deductCredit(userId) {
    const result = this.ctx.storage.sql.exec(
      `UPDATE credits SET amount = amount - 1, last_updated = ?
       WHERE user_id = ? AND amount > 0`,
      new Date().toISOString(), userId
    );
    // rowsWritten نشان می‌دهد که آیا رکوردی به‌روزرسانی شده است یا خیر
    return result.rowsWritten > 0;
  }

  /**
   * بررسی و کم کردن اعتبار در یک عملیات اتمیک (برای مواقعی که می‌خواهید
   * قبل از انجام کار، از کافی بودن اعتبار مطمئن شوید)
   */
  async checkAndDeduct(userId) {
    const current = await this.getCredits(userId);
    if (current < 1) return false;
    return await this.deductCredit(userId);
  }
}

// ========== 4. HELPER FUNCTIONS ==========

/**
 * ارسال درخواست به API بله
 */
async function callBaleAPI(method, body) {
  const url = `${API_BASE}/bot${BOT_TOKEN}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

/**
 * دریافت یک Durable Object Stub برای یک کاربر خاص
 * هر کاربر همیشه به همان Durable Object اختصاصی خودش متصل می‌شود.
 */
function getCreditManagerStub(env, userId) {
  const id = env.CREDIT_MANAGER.idFromName(String(userId));
  return env.CREDIT_MANAGER.get(id);
}

/**
 * بررسی اینکه آیا کاربر مجاز است (بر اساس لیست سفید)
 */
function isUserAllowed(userId) {
  if (ALLOWED_USERS.length === 0) return true; // عمومی
  return ALLOWED_USERS.includes(userId);
}

/**
 * انتخاب تصادفی امن یک رکورد محتوا
 */
function pickRandomContent() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const index = array[0] % CONTENT.length;
  return CONTENT[index];
}

/**
 * ساخت پیام رایگان بر اساس رکورد محتوا
 */
function freeMsg(record, topic) {
  const t = record.topics[topic] || {};
  return `
📊 نتیجه: ${record.level} ${record.badge}
📝 ${record.free_summary}
📖 ${record.arabic}
🌐 ${record.translation}
📍 سوره ${record.surah} | آیه ${record.ayah}
${record.cta_free || ""}
  `.trim();
}

/**
 * ساخت پیام پریمیوم بر اساس رکورد محتوا و موضوع
 */
function premiumMsg(record, topic) {
  const t = record.topics[topic] || {};
  return `
💎 ${record.core_message}
💡 نکته: ${t.tip || "—"}
⚠️ هشدار: ${t.warning || "—"}
🛠 راهکار: ${t.action || "—"}
🌟 ${record.final_summary}
${record.cta_dua || ""}
⚖️ سلب مسئولیت: استخاره جایگزین عقل، تحقیق و مشورت نیست.
  `.trim();
}

// ========== 5. MAIN WORKER ==========
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Endpoint سلامت
    if (request.method === "GET" && url.pathname === "/test") {
      return new Response(JSON.stringify({
        status: "ok",
        version: "v16-with-DO",
        schema: "v5",
        contentCount: CONTENT.length,
        doConfigured: !!env.CREDIT_MANAGER,
        kvConfigured: !!env.USERS_KV,
        publicMode: ALLOWED_USERS.length === 0,
      }), { headers: { "Content-Type": "application/json" } });
    }

    // فقط درخواست‌های POST (webhook بله) را پردازش کن
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // پردازش پیام یا callback
    const message = update.message || update.callback_query?.message;
    const callbackQuery = update.callback_query;
    const chatId = message?.chat?.id;
    const userId = chatId ? String(chatId) : null;

    // اگر کاربر ناشناس بود، خارج شو
    if (!userId) {
      return new Response("OK", { status: 200 });
    }

    // بررسی لیست سفید
    if (!isUserAllowed(chatId)) {
      await callBaleAPI("sendMessage", {
        chat_id: chatId,
        text: "⛔ شما به این بات دسترسی ندارید.",
      });
      return new Response("OK", { status: 200 });
    }

    // دریافت Stub مدیریت اعتبار برای این کاربر
    const creditStub = getCreditManagerStub(env, userId);

    // ========== پردازش callback queries ==========
    if (callbackQuery) {
      const data = callbackQuery.data;
      const callbackId = callbackQuery.id;

      // پاسخ به callback (برای جلوگیری از انتظار)
      await callBaleAPI("answerCallbackQuery", { callback_query_id: callbackId });

      // callback: شروع استخاره جدید
      if (data === "new_estekhare") {
        await callBaleAPI("sendMessage", {
          chat_id: chatId,
          text: "موضوع خود را انتخاب کنید:",
          reply_markup: {
            inline_keyboard: [
              [{ text: "👪 خانواده", callback_data: "cat_family" }],
              [{ text: "💼 کسب‌وکار", callback_data: "cat_business" }],
            ],
          },
        });
      }

      // callback: انتخاب موضوع (مثال)
      if (data.startsWith("topic_")) {
        const topic = data.replace("topic_", "");

        // انتخاب رکورد تصادفی
        const record = pickRandomContent();

        // ارسال پیام رایگان
        await callBaleAPI("sendMessage", {
          chat_id: chatId,
          text: freeMsg(record, topic),
          reply_markup: {
            inline_keyboard: [
              [{ text: `💎 استخاره تخصصی`, callback_data: `premium_${topic}_${record.page}` }],
            ],
          },
        });
      }

      // callback: استخاره تخصصی
      if (data.startsWith("premium_")) {
        const parts = data.split("_");
        const topic = parts[1];
        const page = parseInt(parts[2]);

        // پیدا کردن رکورد مربوطه
        const record = CONTENT.find((r) => r.page === page);
        if (!record) {
          await callBaleAPI("sendMessage", {
            chat_id: chatId,
            text: "⚠️ محتوای مورد نظر یافت نشد.",
          });
          return new Response("OK", { status: 200 });
        }

        // 🔥 بخش حیاتی: کم کردن اعتبار به‌صورت اتمیک از طریق Durable Object
        const success = await creditStub.deductCredit(userId);

        if (!success) {
          // اعتبار کافی نیست
          const current = await creditStub.getCredits(userId);
          await callBaleAPI("sendMessage", {
            chat_id: chatId,
            text: `⚠️ اعتبار شما کافی نیست. اعتبار فعلی: ${current}\n\nبرای خرید اعتبار، از منوی فروشگاه استفاده کنید.`,
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛍 فروشگاه اعتبار", callback_data: "shop" }],
              ],
            },
          });
          return new Response("OK", { status: 200 });
        }

        // اعتبار کم شد → ارسال محتوای پریمیوم
        await callBaleAPI("sendMessage", {
          chat_id: chatId,
          text: premiumMsg(record, topic),
        });
      }

      return new Response("OK", { status: 200 });
    }

    // ========== پردازش پیام‌های متنی ==========
    if (message && message.text) {
      const text = message.text;

      // دستور /start
      if (text === "/start") {
        // بررسی هدیه ۲ اعتبار برای کاربر جدید
        const currentCredits = await creditStub.getCredits(userId);
        if (currentCredits === 0) {
          await creditStub.addCredits(userId, 2); // هدیه ۲ اعتبار
        }

        await callBaleAPI("sendMessage", {
          chat_id: chatId,
          text: `🌿 سلام! به بات نشانِ دل خوش آمدید.\n\nاعتبار شما: ${await creditStub.getCredits(userId)}`,
          reply_markup: {
            keyboard: [
              [{ text: "🔮 استخاره" }],
              [{ text: "👤 حساب من" }, { text: "🛍 فروشگاه" }],
            ],
            resize_keyboard: true,
          },
        });
      }

      // دستور /credits
      if (text === "/credits") {
        const credits = await creditStub.getCredits(userId);
        await callBaleAPI("sendMessage", {
          chat_id: chatId,
          text: `💎 اعتبار شما: ${credits}`,
        });
      }

      // مدیریت پرداخت موفق (SuccessfulPayment)
      // این بخش باید در webhook پردازش شود؛ در اینجا فقط نمونه است
    }

    // پردازش pre_checkout_query (برای تأیید پرداخت)
    if (update.pre_checkout_query) {
      await callBaleAPI("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
      return new Response("OK", { status: 200 });
    }

    // پردازش successful_payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const chargeId = payment.telegram_payment_charge_id;

      // 🔥 جلوگیری از پردازش تکراری
      const txKey = `tx:${chargeId}`;
      const alreadyProcessed = await env.USERS_KV.get(txKey);
      if (alreadyProcessed) {
        return new Response("OK", { status: 200 });
      }

      // افزودن اعتبار بر اساس بسته‌ی خریداری شده
      const packages = {
        "10": 10,
        "35": 35,
        "120": 120,
      };
      const amount = packages[payment.invoice_payload] || 0;

      if (amount > 0) {
        await creditStub.addCredits(userId, amount);

        // علامت‌گذاری تراکنش به‌عنوان پردازش‌شده
        await env.USERS_KV.put(txKey, "done", { expirationTtl: 86400 * 30 });

        await callBaleAPI("sendMessage", {
          chat_id: chatId,
          text: `✅ پرداخت موفق! ${amount} اعتبار به حساب شما اضافه شد.`,
        });
      }

      return new Response("OK", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  },
};