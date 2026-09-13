// ========== 1. IMPORT ==========
import { DurableObject } from "cloudflare:workers";
import { CONTENT } from "./content/index.js";

// ========== 2. CONSTANTS ==========
const API_BASE = "https://tapi.bale.ai";

// ========== 3. DURABLE OBJECT CLASS ==========
export class CreditManager extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS credits (
        user_id TEXT PRIMARY KEY,
        amount INTEGER NOT NULL DEFAULT 0,
        last_updated TEXT NOT NULL
      );
    `);
  }

  async getCredits(userId) {
    const result = this.ctx.storage.sql.exec(
      `SELECT amount FROM credits WHERE user_id = ?`, userId
    ).one();
    return result ? result.amount : 0;
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
    const result = this.ctx.storage.sql.exec(
      `UPDATE credits SET amount = amount - 1, last_updated = ?
       WHERE user_id = ? AND amount > 0`,
      new Date().toISOString(), userId
    );
    return result.rowsWritten > 0;
  }
}

// ========== 4. HELPER FUNCTIONS ==========

async function callBaleAPI(env, method, body) {
  const url = `${API_BASE}/bot${env.BOT_TOKEN}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

function getCreditManagerStub(env, userId) {
  const id = env.CREDIT_MANAGER.idFromName(String(userId));
  return env.CREDIT_MANAGER.get(id);
}

function isUserAllowed(env, chatId) {
  const list = (env.ALLOWED_USERS || "").trim();
  if (!list) return true;
  return list.split(",").map(s => s.trim()).includes(String(chatId));
}

function pickRandomContent() {
  if (!CONTENT.length) return null;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return CONTENT[array[0] % CONTENT.length];
}

function freeMsg(record, topic) {
  return `
📊 نتیجه: ${record.level} ${record.badge}
📝 ${record.free_summary}
📖 ${record.arabic}
🌐 ${record.translation}
📍 سوره ${record.surah} | آیه ${record.ayah}
${record.cta_free || ""}
  `.trim();
}

function premiumMsg(record, topic) {
  const t = record.topics?.[topic] || {};
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
        version: "v17-with-DO",
        schema: "v5",
        contentCount: CONTENT.length,
        doConfigured: !!env.CREDIT_MANAGER,
        kvConfigured: !!env.USERS_KV,
        tokenConfigured: !!env.BOT_TOKEN,
        publicMode: !(env.ALLOWED_USERS || "").trim(),
      }, null, 2), { headers: { "Content-Type": "application/json" } });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const message = update.message || update.callback_query?.message;
    const callbackQuery = update.callback_query;
    const chatId = message?.chat?.id;
    const userId = chatId ? String(chatId) : null;

    if (!userId) return new Response("OK", { status: 200 });

    if (!isUserAllowed(env, chatId)) {
      await callBaleAPI(env, "sendMessage", {
        chat_id: chatId,
        text: "⛔ شما به این بات دسترسی ندارید.",
      });
      return new Response("OK", { status: 200 });
    }

    const creditStub = getCreditManagerStub(env, userId);

    // ========== Callback Queries ==========
    if (callbackQuery) {
      const data = callbackQuery.data;

      await callBaleAPI(env, "answerCallbackQuery", { callback_query_id: callbackQuery.id });

      if (data === "new_estekhare") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "موضوع خود را انتخاب کنید:",
          reply_markup: {
            inline_keyboard: [
              [{ text: "👪 خانواده", callback_data: "topic_marriage" }],
              [{ text: "💼 کسب‌وکار", callback_data: "topic_work" }],
            ],
          },
        });
      }

      if (data.startsWith("topic_")) {
        const topic = data.replace("topic_", "");
        const record = pickRandomContent();
        if (!record) {
          await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: "⚠️ محتوایی موجود نیست." });
          return new Response("OK", { status: 200 });
        }
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: freeMsg(record, topic),
          reply_markup: {
            inline_keyboard: [
              [{ text: "💎 استخاره تخصصی", callback_data: `premium_${topic}_${record.page}` }],
            ],
          },
        });
      }

      if (data.startsWith("premium_")) {
        const parts = data.split("_");
        const topic = parts[1];
        const page = parseInt(parts[2]);

        const record = CONTENT.find((r) => r.page === page);
        if (!record) {
          await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: "⚠️ محتوا یافت نشد." });
          return new Response("OK", { status: 200 });
        }

        const success = await creditStub.deductCredit(userId);
        if (!success) {
          const current = await creditStub.getCredits(userId);
          await callBaleAPI(env, "sendMessage", {
            chat_id: chatId,
            text: `⚠️ اعتبار کافی نیست. اعتبار فعلی: ${current}`,
          });
          return new Response("OK", { status: 200 });
        }

        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: premiumMsg(record, topic),
        });
      }

      return new Response("OK", { status: 200 });
    }

    // ========== Messages ==========
    if (message?.text) {
      const text = message.text;

      if (text === "/start") {
        const currentCredits = await creditStub.getCredits(userId);
        if (currentCredits === 0) await creditStub.addCredits(userId, 2);
        const newCredits = await creditStub.getCredits(userId);

        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: `🌿 سلام! به بات نشانِ دل خوش آمدید.\n\nاعتبار شما: ${newCredits}`,
          reply_markup: {
            keyboard: [
              [{ text: "🔮 استخاره" }],
              [{ text: "👤 حساب من" }, { text: "🛍 فروشگاه" }],
            ],
            resize_keyboard: true,
          },
        });
      }

      if (text === "🔮 استخاره") {
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: "موضوع خود را انتخاب کنید:",
          reply_markup: {
            inline_keyboard: [
              [{ text: "👪 خانواده", callback_data: "topic_marriage" }],
              [{ text: "💼 کسب‌وکار", callback_data: "topic_work" }],
            ],
          },
        });
      }

      if (text === "/credits") {
        const credits = await creditStub.getCredits(userId);
        await callBaleAPI(env, "sendMessage", { chat_id: chatId, text: `💎 اعتبار شما: ${credits}` });
      }
    }

    // ========== Pre-checkout ==========
    if (update.pre_checkout_query) {
      await callBaleAPI(env, "answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      });
      return new Response("OK", { status: 200 });
    }

    // ========== Successful Payment ==========
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const chargeId = payment.telegram_payment_charge_id;
      const txKey = `tx:${chargeId}`;

      const alreadyProcessed = await env.USERS_KV.get(txKey);
      if (alreadyProcessed) return new Response("OK", { status: 200 });

      const packages = { "10": 10, "35": 35, "120": 120 };
      const amount = packages[payment.invoice_payload] || 0;

      if (amount > 0) {
        await creditStub.addCredits(userId, amount);
        await env.USERS_KV.put(txKey, "done", { expirationTtl: 86400 * 30 });
        await callBaleAPI(env, "sendMessage", {
          chat_id: chatId,
          text: `✅ پرداخت موفق! ${amount} اعتبار اضافه شد.`,
        });
      }

      return new Response("OK", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  },
};