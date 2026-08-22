// Cloudflare Pages Function - بات استخاره
const TOKEN = process.env.BOT_TOKEN;
const BASE = "https://tapi.bale.ai";

async function baleCall(method, payload) {
  const res = await fetch(`${BASE}/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

const sendMessage = (chat_id, text, reply_markup) =>
  baleCall("sendMessage", { chat_id, text, parse_mode: "HTML", reply_markup });

const answerCallback = (callback_query_id) =>
  baleCall("answerCallbackQuery", { callback_query_id });

const DEMO_RECORD = {
  page: 295,
  surah: "یوسف",
  ayah: 79,
  arabic: "قَالَ مَعَاذَ ٱللَّهِ أَن نَّأْخُذَ إِلَّا مَن وَجَدْنَا مَتَـٰعَنَا عِندَهُۥٓ إِنَّآ إِذًا لَّظَـٰلِمُونَ",
  translation: "گفت: «پناه به خدا، که جز آن کس را که کالای خود را نزد وی یافته‌ایم بازداشت کنیم، زیرا در آن صورت قطعاً ستمکار خواهیم بود.»",
  free: {
    badge: "🟢",
    verdict: "خوب است، اما مشروط به پایبندی به اصول اخلاقی و عدالت.",
    headline: "⚖️ با اصولت بمان؛ تحت فشار، بی‌گناه را قربانی نکن.",
    quick_guidance: [
      "آیا راه‌حل پیشنهادی‌ات کسی را که نقشی در مسئله ندارد، در معرض آسیب قرار می‌دهد؟",
      "اگر جواب «بله» است، پناه به خدا ببر و راه دیگری پیدا کن.",
      "اگر راه‌حل تو منصفانه است، با توکل ادامه بده."
    ]
  },
  locked: {
    topic: "marriage",
    teaser: "اگر برای حل مشکل، داری کسی را که بی‌گناه است تحت فشار می‌گذاری، این آیه می‌گوید: پناه بر خدا."
  }
};

const TOPICS = [
  { id: "marriage", fa: "❤️ ازدواج" },
  { id: "transaction", fa: "💰 معامله" },
  { id: "work", fa: "💼 کار" },
  { id: "home", fa: "🏠 خانه" },
  { id: "car", fa: "🚗 خودرو" },
  { id: "travel", fa: "✈️ سفر" },
  { id: "study", fa: "📚 تحصیل" },
  { id: "other_decision", fa: "❓ تصمیم دیگر" }
];

const TOPIC_FA = Object.fromEntries(TOPICS.map(t => [t.id, t.fa]));

const mainKeyboard = {
  keyboard: [[{ text: "🔮 استخاره" }], [{ text: "👤 حساب من" }, { text: "🛍 فروشگاه" }]],
  resize_keyboard: true,
  is_persistent: true
};

const topicKeyboard = {
  inline_keyboard: TOPICS.map((t, i) => i % 2 === 0 ? [
    { text: TOPICS[i].fa, callback_data: `topic:${TOPICS[i].id}` },
    TOPICS[i + 1] ? { text: TOPICS[i + 1].fa, callback_data: `topic:${TOPICS[i + 1].id}` } : null
  ].filter(Boolean) : null).filter(Boolean)
};

const ritualKeyboard = {
  inline_keyboard: [
    [{ text: "🤲 خواندم، استخاره کن", callback_data: "draw" }],
    [{ text: "⏭ بدون آداب", callback_data: "draw" }],
    [{ text: "↩️ انصراف", callback_data: "cancel" }]
  ]
};

const resultKeyboard = {
  inline_keyboard: [
    [{ text: "💎 باز کردن با ۱ اعتبار", callback_data: "unlock" }],
    [{ text: "🔮 استخاره جدید", callback_data: "new" }],
    [{ text: "🏠 منوی اصلی", callback_data: "home" }]
  ]
};

const WELCOME = "🌿 به «نشانِ دل» خوش آمدی.\n\n⚖️ استخاره برای طلب خیر است و جایگزین مشورت نیست.\n\nبرای شروع، «🔮 استخاره» را بزن.";

const RITUAL = "🤲 <b>آداب کوتاه:</b>\n۱. نیتت را روشن کن.\n۲. وضو و رو به قبله.\n۳. سه صلوات.\n\n<b>دعای استخاره:</b>\n«اللّهُمَّ إِنِّی تَفَأَّلْتُ بِکِتابِکَ، وَ تَوَکَّلْتُ عَلَیْکَ، فَأَرِنی مِنْ کِتابِکَ ما هُوَ مَکْتومٌ مِنْ سِرِّکَ المَکْنونِ في غَیْبِکَ»";

function composeResult(rec, topicFa) {
  return [
    `${rec.free.badge} <b>نتیجه:</b> ${rec.free.verdict}`,
    `<b>${rec.free.headline}</b>`,
    "",
    `📖 سورهٔ ${rec.surah} — آیهٔ ${rec.ayah} (صفحهٔ ${rec.page})`,
    rec.arabic,
    "",
    `📜 ${rec.translation}`,
    "",
    ...rec.free.quick_guidance.map(x => `✨ ${x}`),
    "",
    `🔒 <b>برداشت تخصصی «${topicFa}»:</b>`,
    rec.locked.teaser
  ].join("\n");
}

const userStates = new Map();

async function handleMessage(msg) {
  const chat = msg.chat.id;
  const text = msg.text?.trim();
  
  if (text === "/start") {
    userStates.set(chat, { stage: "idle" });
    await sendMessage(chat, WELCOME, mainKeyboard);
    return;
  }
  
  if (text === "🔮 استخاره") {
    userStates.set(chat, { stage: "topic" });
    await sendMessage(chat, "موضوع استخاره‌ات را انتخاب کن:", topicKeyboard);
    return;
  }
  
  if (text === "👤 حساب من") {
    await sendMessage(chat, "👤 <b>حساب من</b>\n\n💎 اعتبار: ۲ (هدیه)\n🔮 استخاره‌ها: ۰\n🔓 باز شده: ۰", mainKeyboard);
    return;
  }
  
  if (text === "🛍 فروشگاه") {
    await sendMessage(chat, "🛍 <b>فروشگاه</b>\n\nپرداخت واقعی به‌زودی فعال می‌شود.", mainKeyboard);
    return;
  }
  
  await sendMessage(chat, "برای شروع، «🔮 استخاره» را بزن.", mainKeyboard);
}

async function handleCallback(cq) {
  const chat = cq.message.chat.id;
  const data = cq.data;
  const state = userStates.get(chat) || { stage: "idle" };
  
  await answerCallback(cq.id);
  
  if (data === "cancel" || data === "home") {
    userStates.set(chat, { stage: "idle" });
    await sendMessage(chat, "🏠 منوی اصلی", mainKeyboard);
    return;
  }
  
  if (data.startsWith("topic:")) {
    const topic = data.slice(6);
    userStates.set(chat, { stage: "ritual", topic });
    await sendMessage(chat, RITUAL, ritualKeyboard);
    return;
  }
  
  if (data === "draw" && state.topic) {
    await sendMessage(chat, "🔮 در حال انجام استخاره...");
    await new Promise(r => setTimeout(r, 1500));
    const topicFa = TOPIC_FA[state.topic];
    await sendMessage(chat, composeResult(DEMO_RECORD, topicFa), resultKeyboard);
    return;
  }
  
  if (data === "unlock") {
    await sendMessage(chat, "💎 این قابلیت به‌زودی فعال می‌شود.", mainKeyboard);
    return;
  }
  
  if (data === "new") {
    userStates.set(chat, { stage: "topic" });
    await sendMessage(chat, "موضوع استخاره‌ات را انتخاب کن:", topicKeyboard);
    return;
  }
}

export async function onRequestPost(context) {
  const update = await context.request.json();
  
  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (err) {
    console.error(err);
  }
  
  return new Response("ok");
}