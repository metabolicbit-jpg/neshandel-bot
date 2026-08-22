// ── neshandel-bot — نسخه ۴: قرعه‌کشی کاملاً تصادفی + رندر Schema-aware
import { CONTENT } from "./content.js";

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

// ── تغییر ۲: بلوک موضوعی Schema-aware + fallback برای رکوردهای قدیمی
function topicBlock(r,t){
  const T=(r.topics||{})[t];
  if(T) return T;
  if(t==="marriage"&&r.marriage) return {verdict:r.verdict,guidance:r.marriage,action:r.action};
  if(t==="transaction"&&r.transaction) return {verdict:r.verdict,guidance:r.transaction,action:r.action};
  return {verdict:r.verdict,guidance:r.key,action:r.action};
}

function freeMsg(r,t){
  const B=topicBlock(r,t);
  return [
    r.badge+" <b>نتیجه:</b> "+r.verdict,
    "<b>"+r.headline+"</b>","",
    "📖 سوره "+r.surah+" — آیهٔ "+toFa(r.ayah)+" (صفحهٔ "+toFa(r.page)+")",
    r.arabic,"",
    "📜 "+r.translation,"",
    ...r.guidance.map(g=>"✨ "+g),"",
    "🔒 <b>برداشت تخصصی «"+topicFa(t)+"»:</b>",
    (B.guidance||"").slice(0,70)+"…"
  ].join("\n");
}
function unlockMsg(r,t){
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

// ── مدیریت کاربر با KV
async function getUser(env, chatId){
  const u = await env.KV.get("u:"+chatId, "json");
  return u || { credits:2, draws:0, unlocks:0, last:-1, topic:"marriage", unlocked:[] };
}
const saveUser = (env, chatId, u) => env.KV.put("u:"+chatId, JSON.stringify(u));

// ── تغییر ۱: قرعه‌کشی کاملاً تصادفی و یکنواخت (بدون هیچ الگوریتم جهت‌دهنده)
function pickIndex(){
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] % CONTENT.length;
}

// ── handler ها
async function onMessage(m, env){
  const chat=m.chat.id, text=(m.text||"").trim();
  if(text==="/start"){
    const u = await getUser(env, chat); await saveUser(env, chat, u);
    return sendMessage(chat, WELCOME, mainKb);
  }
  if(text==="🔮 استخاره") return sendMessage(chat,"موضوع استخاره‌ات را انتخاب کن:",topicKb);
  if(text==="👤 حساب من"){
    const u = await getUser(env, chat);
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
  const u = await getUser(env, chat);

  if(data==="home"){ await saveUser(env,chat,u); return sendMessage(chat,"🏠 منوی اصلی",mainKb); }
  if(data==="new"){ await saveUser(env,chat,u); return sendMessage(chat,"موضوع استخاره‌ات را انتخاب کن:",topicKb); }

  if(data.startsWith("topic:")){
    u.topic = data.slice(6); await saveUser(env,chat,u);
    return sendMessage(chat, RITUAL, ritualKb(u.topic));
  }

  if(data.startsWith("draw:")){
    const t = data.slice(5);
    u.topic = t;
    u.last = pickIndex();
    u.draws += 1;
    await saveUser(env,chat,u);
    await sendMessage(chat,"🔮 در حال انجام استخاره...");
    return sendMessage(chat, freeMsg(CONTENT[u.last], t), resultKb(t));
  }

  if(data.startsWith("unlock:")){
    const t = data.slice(7);
    const key = u.last+":"+t;
    if(u.unlocked.includes(key)){
      return sendMessage(chat, unlockMsg(CONTENT[u.last], t), mainKb);
    }
    if(u.credits>0){
      u.credits -= 1; u.unlocks += 1; u.unlocked.push(key);
      await saveUser(env,chat,u);
      return sendMessage(chat, unlockMsg(CONTENT[u.last], t), mainKb);
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