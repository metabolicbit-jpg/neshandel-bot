let TOKEN = "";
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
const answerCallback = (id) => baleCall("answerCallbackQuery", { callback_query_id: id });

const DEMO = {
  page: 245, surah: "یوسف", ayah: 79,
  arabic: "قَالَ مَعَاذَ ٱللَّهِ أَن نَّأْخُذَ إِلَّا مَن وَجَدْنَا مَتَـٰعَنَا عِندَهُۥٓ إِنَّآ إِذًا لَّظَـٰلِمُونَ",
  translation: "گفت: پناه به خدا، که جز آن کس را که کالای خود را نزد وی یافته‌ایم بازداشت کنیم، زیرا در آن صورت قطعاً ستمکار خواهیم بود.",
  verdict: "خوب است، اما مشروط به پایبندی به اصول اخلاقی و عدالت.",
  headline: "⚖️ با اصولت بمان؛ تحت فشار، بی‌گناه را قربانی نکن.",
  guidance: [
    "آیا راه‌حلت کسی را که نقشی ندارد در معرض آسیب می‌گذارد؟",
    "اگر بله، پناه به خدا ببر و راه دیگری پیدا کن.",
    "اگر راه‌حل منصفانه است، با توکل ادامه بده."
  ],
  teaser: "اگر برای حل مشکل، داری کسی را که بی‌گناه است تحت فشار می‌گذاری، این آیه می‌گوید: پناه بر خدا."
};

const TOPICS = [
  ["marriage","❤️ ازدواج"],["transaction","💰 معامله"],
  ["work","💼 کار"],["home","🏠 خانه"],
  ["car","🚗 خودرو"],["travel","✈️ سفر"],
  ["study","📚 تحصیل"],["other","❓ تصمیم دیگر"]
];

const mainKb = { keyboard: [[{text:"🔮 استخاره"}],[{text:"👤 حساب من"},{text:"🛍 فروشگاه"}]], resize_keyboard:true, is_persistent:true };
const topicKb = { inline_keyboard: [
  [{text:"❤️ ازدواج",callback_data:"topic:marriage"},{text:"💰 معامله",callback_data:"topic:transaction"}],
  [{text:"💼 کار",callback_data:"topic:work"},{text:"🏠 خانه",callback_data:"topic:home"}],
  [{text:"🚗 خودرو",callback_data:"topic:car"},{text:"✈️ سفر",callback_data:"topic:travel"}],
  [{text:"📚 تحصیل",callback_data:"topic:study"},{text:"❓ تصمیم دیگر",callback_data:"topic:other"}]
]};
const ritualKb = (t)=>({ inline_keyboard: [
  [{text:"🤲 خواندم، استخاره کن",callback_data:"draw:"+t}],
  [{text:"⏭ بدون آداب",callback_data:"draw:"+t}],
  [{text:"↩️ انصراف",callback_data:"home"}]
]});
const resultKb = (t)=>({ inline_keyboard: [
  [{text:"💎 باز کردن با ۱ اعتبار",callback_data:"unlock:"+t}],
  [{text:"🔮 استخاره جدید",callback_data:"new"}],
  [{text:"🏠 منوی اصلی",callback_data:"home"}]
]});

const WELCOME = "🌿 به «نشانِ دل» خوش آمدی.\n\n⚖️ استخاره برای طلب خیر است و جایگزین مشورت نیست.\n\nبرای شروع، «🔮 استخاره» را بزن.";
const RITUAL = "🤲 <b>آداب کوتاه:</b>\n۱. نیتت را روشن کن.\n۲. وضو و رو به قبله.\n۳. سه صلوات.\n\n<b>دعای استخاره:</b>\n«اللّهُمَّ إِنِّی تَفَأَّلْتُ بِکِتابِکَ، وَ تَوَکَّلْتُ عَلَیْکَ، فَأَرِنی مِنْ کِتابِکَ ما هُوَ مَکْتومٌ مِنْ سِرِّکَ المَکْنونِ في غَیْبِکَ»";

function resultText(t){
  const fa = (TOPICS.find(x=>x[0]===t)||[,t])[1];
  return [
    "🟢 <b>نتیجه:</b> "+DEMO.verdict,
    "<b>"+DEMO.headline+"</b>","",
    "📖 سوره "+DEMO.surah+" — آیهٔ "+DEMO.ayah+" (صفحهٔ "+DEMO.page+")",
    DEMO.arabic,"",
    "📜 "+DEMO.translation,"",
    ...DEMO.guidance.map(g=>"✨ "+g),"",
    "🔒 <b>برداشت تخصصی «"+fa+"»:</b>",
    DEMO.teaser
  ].join("\n");
}

async function onMessage(m){
  const chat=m.chat.id, text=(m.text||"").trim();
  if(text==="/start") return sendMessage(chat,WELCOME,mainKb);
  if(text==="🔮 استخاره") return sendMessage(chat,"موضوع استخاره‌ات را انتخاب کن:",topicKb);
  if(text==="👤 حساب من") return sendMessage(chat,"👤 <b>حساب من</b>\n\n💎 اعتبار: ۲ (هدیه)\n🔮 استخاره‌ها: ۰\n🔓 باز شده: ۰",mainKb);
  if(text==="🛍 فروشگاه") return sendMessage(chat,"🛍 <b>فروشگاه</b>\n\nپرداخت واقعی به‌زودی فعال می‌شود.",mainKb);
  return sendMessage(chat,"برای شروع، «🔮 استخاره» را بزن.",mainKb);
}

async function onCallback(cq){
  const chat=cq.message.chat.id, data=cq.data||"";
  await answerCallback(cq.id);
  if(data==="home") return sendMessage(chat,"🏠 منوی اصلی",mainKb);
  if(data==="new") return sendMessage(chat,"موضوع استخاره‌ات را انتخاب کن:",topicKb);
  if(data.startsWith("topic:")) return sendMessage(chat,RITUAL,ritualKb(data.slice(6)));
  if(data.startsWith("draw:")){
    await sendMessage(chat,"🔮 در حال انجام استخاره...");
    return sendMessage(chat,resultText(data.slice(5)),resultKb(data.slice(5)));
  }
  if(data.startsWith("unlock:")) return sendMessage(chat,"💎 این قابلیت به‌زودی فعال می‌شود.",mainKb);
}

export default {
  async fetch(request, env){
    TOKEN = env.BOT_TOKEN || "";
    if(request.method==="POST"){
      try{
        const u = await request.json();
        if(u.message) await onMessage(u.message);
        else if(u.callback_query) await onCallback(u.callback_query);
      }catch(e){ console.error(e); }
    }
    return new Response("ok");
  }
};