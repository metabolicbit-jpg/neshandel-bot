// ── neshandel-bot — نسخه ۷: حداقلِ ممکنِ write روی KV + لحن v4
import { CONTENT } from "./content/index.js";

let TOKEN = "";
const BASE = "https://tapi.bale.ai";

// ── API بله
async function baleCall(method, payload){
  const res = await fetch(`${BASE}/bot${TOKEN}/${method}`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
  return res.json();
}
const sendMessage = (chat_id, text, reply_markup) =>
  baleCall("sendMessage", { chat_id, text, parse_mode:"HTML", reply_markup });
const answerCallback = (id) => baleCall("answerCallbackQuery", { callback_query_id: id });

// ── کیبوردها
const TOPICS = [
  ["marriage","❤️ ازدواج"],["transaction","💰 معامله"],
  ["work","💼 کار"],["home","🏠 خانه"],
  ["car","🚗 خودرو"],["travel","✈️ سفر"],
  ["study","📚 تحصیل"],["other","❓ تصمیم دیگر"]
];
const mainKb = { keyboard:[[ {text:"🔮 استخاره"} ],[ {text:"👤 حساب من"},{text:"🛍 فروشگاه"} ]], resize_keyboard:true, is_persistent:true };
const topicKb = { inline_keyboard:[
  [ {text:"❤️ ازدواج",callback_data:"topic:marriage"},{text:"💰 معامله",callback_data:"topic:transaction"} ],
  [ {text:"💼 کار",callback_data:"topic:work"},{text:"🏠 خانه",callback_data:"topic:home"} ],
  [ {text:"🚗 خودرو",callback_data:"topic:car"},{text:"✈️ سفر",callback_data:"topic:travel"} ],
  [ {text:"📚 تحصیل",callback_data:"topic:study"},{text:"❓ تصمیم دیگر",callback_data:"topic:other"} ]
]};
const ritualKb = (t)=>({ inline_keyboard:[
  [{text:"🤲 خواندم، استخاره کن",callback_data:"draw:"+t}],
  [{text:"⏭ بدون آداب",callback_data:"draw:"+t}],
  [{text:"↩️ انصراف",callback_data:"home"}]
]});
const resultKb = (t)=>({ inline_keyboard:[
  [{text:"💎 باز کردن با ۱ اعتبار",callback_data:"unlock:"+t}],
  [{text:"🔮 استخاره جدید",callback_data:"new"}],
  [{text:"🏠 منوی اصلی",callback_data:"home"}]
]});

// ── پیام‌ها
const WELCOME = "🌿 به «نشانِ دل» خوش آمدی.\n\n⚖️ استخاره برای طلب خیر است و جایگزین مشورت نیست.\n\nبرای شروع، «🔮 استخاره» را بزن.";
const RITUAL = "🤲 <b>آداب کوتاه:</b>\n۱. نیتت را روشن کن.\n۲. وضو و رو به قبله.\n۳. سه صلوات.\n\n<b>دعای استخاره:</b>\n«اللّهُمَّ إِنِّی تَفَأَّلْتُ بِکِتابِکَ، وَ تَوَکَّلْتُ عَلَیْکَ، فَأَرِنی مِنْ کِتابِکَ ما هُوَ مَکْتومٌ مِنْ سِرِّکَ المَکْنونِ في غَیْبِکَ»";

const topicFa  = (t) => (TOPICS.find(x=>x[0]===t)||[,t])[1];
const toFa = n => String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);

function topicBlock(r,t){
  const T=(r.topics||{})[t];
  if(T) return T;
  if(t==="marriage"&&r.marriage) return {verdict:r.verdict,guidance:r.marriage,action:r.action};
  if(t==="transaction"&&r.transaction) return {verdict:r.verdict,guidance:r.transaction,action:r.action};
  return {verdict:r.verdict,guidance:r.key,action:r.action};
}

function freeMsg(r,t){
  const B=topicBlock(r,t);
  const teaser = r.premium
    ? "💎 تحلیل کامل + چک‌لیست مخصوص موضوع تو + کی بروم/کی بایستم…"
    : (B.guidance||"").slice(0,70)+"…";
  return [
    r.badge+" <b>نتیجه:</b> "+r.verdict,
    "<b>"+r.headline+"</b>","",
    "📖 سوره "+r.surah+" — آیهٔ "+toFa(r.ayah)+" (صفحهٔ "+toFa(r.page)+")",
    r.arabic,"",
    "📜 "+r.translation,"",
    (r.opener||"بذار این آیه رو بذاریم کنارِ تصمیمت:"),
    (r.plain||""),"",
    "✨ سه چراغ از دلِ آیه:",
    ...r.guidance.map(g=>"• "+g),"",
    "🔒 اگه می‌خوای بدونی این آیه دربارهٔ «"+topicFa(t)+"» دقیقاً چی می‌گه:",
    teaser
  ].join("\n");
}

function unlockMsg(r,t){
  const T=(r.topics||{})[t]||{};
  if(r.premium){
    const P=r.premium;
    return [
      "🔓 <b>برداشت تخصصی «"+topicFa(t)+"»</b>","",
      "🧭 <b>جمع‌بندی:</b> "+P.final_verdict,"",
      "🔍 <b>تحلیل تصمیم:</b>",P.decision_analysis,"",
      "🟢 <b>نقطهٔ قوت:</b> "+P.strengths,
      "⚠️ <b>نقطهٔ خطر:</b> "+P.risks,"",
      "✅ <b>کی جلو بروم؟</b>",
      ...P.go_conditions.map(c=>"• "+c),"",
      "🛑 <b>کی متوقف شوم؟</b>",
      ...P.stop_conditions.map(c=>"• "+c),"",
      "📋 <b>چک‌لیست «"+topicFa(t)+"»:</b>",
      ...(T.checklist||[]).map(c=>"☐ "+c),"",
      "💡 "+(T.topic_note||""),
      "📖 <b>مثال واقعی:</b> "+P.real_example,
      "⚠️ <b>اشتباه رایج:</b> "+P.common_mistake
    ].join("\n");
  }
  const B=topicBlock(r,t);
  return [
    "🔓 <b>برداشت تخصصی «"+topicFa(t)+"»</b>","",
    "⚖️ "+(B.verdict||r.verdict),"",
    B.guidance,"",
    "🎯 <b>اقدام:</b> "+(B.action||r.action),
    "🛡 <b>احتیاط:</b> "+r.caution,"",
    "💎 <i>"+r.key+"</i>"
  ].join("\n");
}

// ── KV: خواندن همیشه؛ نوشتن فقط وقتی واقعاً لازم است
async function getUser(env, chatId){
  try {
    const raw = await env.KV.get("u:"+chatId);
    if (raw) return { u: JSON.parse(raw), exists: true };
  } catch(e){ console.error("getUser:", e); }
  return { u: { credits:2, draws:0, unlocks:0, last:-1, topic:"marriage", unlocked:[] }, exists: false };
}
async function saveUser(env, chatId, u){
  try { await env.KV.put("u:"+chatId, JSON.stringify(u)); }
  catch(e){ console.error("saveUser:", e); }
}

// ── قرعه‌کشی کاملاً تصادفی و یکنواخت
function pickIndex(){
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] % CONTENT.length;
}

// ── handler ها (مسیرهای خواندنی = صفر write)
async function onMessage(m, env){
  const chat=m.chat.id, text=(m.text||"").trim();
  if(text==="/start"){
    return sendMessage(chat, WELCOME, mainKb);            // ← صفر write
  }
  if(text==="🔮 استخاره") return sendMessage(chat,"موضوع استخاره‌ات را انتخاب کن:",topicKb);
  if(text==="👤 حساب من"){
    const {u} = await getUser(env, chat);
    return sendMessage(chat,
      "👤 <b>حساب من</b>\n\n💎 اعتبار: "+toFa(u.credits)+
      "\n🔮 استخاره‌ها: "+toFa(u.draws)+
      "\n🔓 باز شده: "+toFa(u.unlocks), mainKb);
  }
  if(text==="🛍 فروشگاه") return sendMessage(chat,"🛍 <b>فروشگاه</b>\n\nپرداخت واقعی به‌زودی فعال می‌شود.",mainKb);
  return sendMessage(chat,"برای شروع، «🔮 استخاره» را بزن.",mainKb);
}

async function onCallback(cq, env){
  const chat=cq.message.chat.id, data=cq.data||"";
  await answerCallback(cq.id);
  const {u, exists} = await getUser(env, chat);

  if(data==="home")  return sendMessage(chat,"🏠 منوی اصلی",mainKb);          // ← صفر write
  if(data==="new")   return sendMessage(chat,"موضوع استخاره‌ات را انتخاب کن:",topicKb); // ← صفر write

  if(data.startsWith("topic:")){
    const t = data.slice(6);
    if(exists && u.topic !== t){ u.topic = t; await saveUser(env,chat,u); }   // ← write فقط اگر عوض شد
    return sendMessage(chat, RITUAL, ritualKb(t));
  }

  if(data.startsWith("draw:")){
    const t = data.slice(5);
    u.topic = t;
    u.last = pickIndex();
    u.draws += 1;
    await saveUser(env,chat,u);   // ← write ضروری (ثبت قرعه)
    await sendMessage(chat,"🔮 در حال انجام استخاره...");
    return sendMessage(chat, freeMsg(CONTENT[u.last], t), resultKb(t));
  }

  if(data.startsWith("unlock:")){
    const t = data.slice(7);
    const rec = CONTENT[u.last];
    if(!rec) return sendMessage(chat,"⚠️ خطای کوچک؛ لطفاً یک استخارهٔ جدید بگیر.",mainKb);
    const key = u.last+":"+t;
    if(u.unlocked.includes(key)){
      return sendMessage(chat, unlockMsg(rec, t), mainKb);   // ← صفر write
    }
    if(u.credits>0){
      u.credits -= 1; u.unlocks += 1; u.unlocked.push(key);
      await saveUser(env,chat,u);   // ← write ضروری (کسر اعتبار)
      return sendMessage(chat, unlockMsg(rec, t), mainKb);
    }
    return sendMessage(chat,"💎 اعتبار کافی نیست.\n\nبه‌زودی می‌توانی از فروشگاه اعتبار بخری.",mainKb);
  }
}

export default {
  async fetch(request, env){
    TOKEN = env.BOT_TOKEN || "";
    if(request.method==="GET"){
      const url=new URL(request.url);
      if(url.pathname==="/test"){
        const out={ hasToken: !!env.BOT_TOKEN, hasKV: !!env.KV, records: CONTENT.length };
        return new Response(JSON.stringify(out,null,2),{headers:{"Content-Type":"application/json"}});
      }
      return new Response("ok");
    }
    if(request.method==="POST"){
      try{
        const u = await request.json();
        if(u.message) await onMessage(u.message, env);
        else if(u.callback_query) await onCallback(u.callback_query, env);
      }catch(e){ console.error(e); }
    }
    return new Response("ok");
  }
};