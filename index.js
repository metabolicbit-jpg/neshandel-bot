// ── neshandel-bot — نسخه ۱۰: پخش (تکی/چندتایی/همگانی) + لیست اعضا
import { CONTENT } from "./content/index.js";

let TOKEN = "";
let WALLET_TOKEN = "";
let ALLOWED_USERS = [];
const BASE = "https://tapi.bale.ai";

// ── API بله
async function baleCall(method, payload){
  const res = await fetch(`${BASE}/bot${TOKEN}/${method}`, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
  return res.json();
}
const sendMessage = (chat_id, text, reply_markup) =>
  baleCall("sendMessage", { chat_id, text, parse_mode:"HTML", reply_markup });
const sendPlain = (chat_id, text, reply_markup) =>
  baleCall("sendMessage", { chat_id, text, reply_markup });
const answerCallback = (id) => baleCall("answerCallbackQuery", { callback_query_id: id });
const sendInvoice = (chat_id, pack) => baleCall("sendInvoice", {
  chat_id, title: pack.title, description: pack.desc, payload: pack.id,
  provider_token: WALLET_TOKEN, prices: [{ label: pack.label, amount: pack.rials }]
});
const answerPreCheckout = (id, ok, error_message) =>
  baleCall("answerPreCheckoutQuery", { pre_checkout_query_id:id, ok, ...(error_message?{error_message}:{}) });

// ── بسته‌ها
const PACKS = [
  { id:"p10",  credits:10,  bonus:0,  rials:200000,  title:"بستهٔ ۱۰ اعتبار",  label:"۱۰ اعتبار",  desc:"۱۰ اعتبار — باز کردن ۱۰ برداشت تخصصی", text:"🥉 ۱۰ اعتبار — ۲۰۰۰۰ تومان" },
  { id:"p30",  credits:30,  bonus:5,  rials:500000,  title:"بستهٔ ۳۵ اعتبار",  label:"۳۵ اعتبار",  desc:"۳۰ اعتبار + ۵ هدیه",               text:"🥈 ۳۵ اعتبار — ۵۰۰۰۰ تومان" },
  { id:"p100", credits:100, bonus:20, rials:1500000, title:"بستهٔ ۱۲۰ اعتبار", label:"۱۲۰ اعتبار", desc:"۱۰۰ اعتبار + ۲۰ هدیه",             text:"🥇 ۱۲۰ اعتبار — ۱۵۰٬۰۰۰ تومان" },
];
const storeKb = { inline_keyboard: PACKS.map(p=>[{ text:p.text, callback_data:"buy:"+p.id }]) };

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
  [ {text:"📚 تحصیل",callback_data:"topic:study"},{text:"❔ تصمیم دیگر",callback_data:"topic:other"} ]
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
const PRIVATE_MSG = "🔒 این بات در حال تست خصوصی است.\n\nفعلاً فقط کاربران منتخب می‌توانند از آن استفاده کنند.\n\nبه‌زودی برای همه فعال می‌شود. 🌿";

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

// ── KV
async function getUser(env, chatId){
  try {
    const raw = await env.KV.get("u:"+chatId);
    if (raw) return { u: JSON.parse(raw), exists: true };
  } catch(e){ console.error("getUser:", e); }
  return { u: { credits:2, draws:0, unlocks:0, last:-1, topic:"marriage", unlocked:[], name:"" }, exists: false };
}
async function saveUser(env, chatId, u){
  try { await env.KV.put("u:"+chatId, JSON.stringify(u)); }
  catch(e){ console.error("saveUser:", e); }
}

function pickIndex(){
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] % CONTENT.length;
}
function isAllowed(chatId){
  if(ALLOWED_USERS.length===0) return true;
  return ALLOWED_USERS.includes(chatId);
}

// ── پخش همگانی
async function broadcast(env, text){
  let cursor, sent=0, failed=0;
  for(;;){
    const page = await env.KV.list({prefix:"u:", cursor});
    for(const k of page.keys){
      const id = parseInt(k.name.slice(2),10);
      if(isNaN(id)) continue;
      const r = await baleCall("sendMessage",{chat_id:id, text});
      if(r && r.ok) sent++; else failed++;
    }
    if(page.list_complete) break;
    cursor = page.cursor;
  }
  return {sent, failed};
}

// ── ارسال به لیست مشخص
async function sendToMany(env, ids, text){
  let sent=0, failed=0;
  for(const id of ids){
    const r = await baleCall("sendMessage",{chat_id:id, text});
    if(r && r.ok) sent++; else failed++;
  }
  return {sent, failed};
}

// ── لیست اعضا
async function listMembers(env){
  const members=[];
  let cursor;
  for(;;){
    const page = await env.KV.list({prefix:"u:", cursor});
    for(const k of page.keys){
      const id = parseInt(k.name.slice(2),10);
      if(isNaN(id)) continue;
      let name="", credits=0;
      try{
        const raw = await env.KV.get(k.name);
        if(raw){ const u=JSON.parse(raw); name=u.name||""; credits=u.credits||0; }
      }catch(e){}
      members.push({id, name, credits});
    }
    if(page.list_complete) break;
    cursor = page.cursor;
  }
  return members;
}

// ── handler پیام
async function onMessage(m, env){
  const chat=m.chat.id, text=(m.text||"").trim();

  if(!isAllowed(chat)) return sendMessage(chat, PRIVATE_MSG, mainKb);

  // ── /start + ذخیره نام
  if(text==="/start"){
    const cleanName = ((m.chat.first_name||"")+" "+(m.chat.last_name||"")).trim();
    const {u, exists} = await getUser(env, chat);
    if(!exists || (cleanName && u.name!==cleanName)){
      u.name = cleanName || u.name || "";
      await saveUser(env, chat, u);
    }
    return sendMessage(chat, WELCOME, mainKb);
  }

  // ── فرمان‌های ادمین
  if(text==="/cancel"){
    await env.KV.delete("await:"+chat);
    return sendMessage(chat,"↩️ لغو شد.");
  }
  if(text==="/notify"){
    await env.KV.put("await:"+chat, JSON.stringify({mode:"broadcast"}), {expirationTtl:300});
    return sendMessage(chat,"📣 متن نوتیفیکیشن را بفرست تا برای همهٔ اعضا ارسال شود.\nلغو: /cancel");
  }
  const mSend = text.match(/^\/send\s+([0-9,]+)\s*$/);
  if(mSend){
    const ids = mSend[1].split(",").map(s=>parseInt(s,10)).filter(n=>!isNaN(n));
    await env.KV.put("await:"+chat, JSON.stringify({mode:"send", ids}), {expirationTtl:300});
    return sendMessage(chat,"📨 متن را بفرست تا به "+toFa(ids.length)+" نفر ارسال شود.\nلغو: /cancel");
  }
  if(text==="/members"){
    const members = await listMembers(env);
    let lines = ["👥 اعضای بات: "+toFa(members.length),""];
    members.slice(0,50).forEach((mm,i)=>{
      lines.push(toFa(i+1)+". "+(mm.name||"بدون نام")+" — "+mm.id+" (💎"+toFa(mm.credits)+")");
    });
    if(members.length>50) lines.push("… و "+toFa(members.length-50)+" عضو دیگر");
    return sendPlain(chat, lines.join("\n"), mainKb);
  }

  // ── حالت انتظار (پخش/ارسال)
  const awaitingRaw = await env.KV.get("await:"+chat);
  if(awaitingRaw){
    let awaiting; try{ awaiting=JSON.parse(awaitingRaw);}catch(e){ awaiting={mode:"broadcast"}; }
    await env.KV.delete("await:"+chat);
    if(awaiting.mode==="send"){
      const res = await sendToMany(env, awaiting.ids, text);
      return sendMessage(chat,"📨 ارسال شد.\n✅ موفق: "+toFa(res.sent)+"\n⚠️ ناموفق: "+toFa(res.failed));
    } else {
      const res = await broadcast(env, text);
      return sendMessage(chat,"📣 پخش شد.\n✅ موفق: "+toFa(res.sent)+"\n⚠️ ناموفق: "+toFa(res.failed));
    }
  }

  // ── منوی عادی
  if(text==="🔮 استخاره") return sendMessage(chat,"موضوع استخاره‌ات را انتخاب کن:",topicKb);
  if(text==="👤 حساب من"){
    const {u} = await getUser(env, chat);
    return sendMessage(chat,
      "👤 <b>حساب من</b>\n\n💎 اعتبار: "+toFa(u.credits)+
      "\n🔮 استخاره‌ها: "+toFa(u.draws)+
      "\n🔓 باز شده: "+toFa(u.unlocks), mainKb);
  }
  if(text==="🛍 فروشگاه") return sendMessage(chat,
    "🛍 <b>فروشگاه اعتبار «نشانِ دل»</b>\n\nهر اعتبار = باز کردن یک برداشت تخصصی و چک‌لیست تصمیم\n\nیه بسته انتخاب کن تا صورتحساب کیف‌پولی برات بیاد:", storeKb);
  return sendMessage(chat,"برای شروع، «🔮 استخاره» را بزن.",mainKb);
}

// ── پرداخت
async function onPreCheckout(pcq){
  const pack = PACKS.find(p=>p.id===pcq.invoice_payload);
  if(!pack) return answerPreCheckout(pcq.id, false, "بستهٔ نامعتبر است.");
  return answerPreCheckout(pcq.id, true);
}
async function onSuccessfulPayment(m, env){
  const chat=m.chat.id, sp=m.successful_payment;
  const pack = PACKS.find(p=>p.id===sp.invoice_payload);
  if(!pack) return;
  const txId = sp.telegram_payment_charge_id;
  try { const done = await env.KV.get("tx:"+txId); if(done) return; } catch(e){}
  const {u} = await getUser(env, chat);
  u.credits += pack.credits + pack.bonus;
  await saveUser(env, chat, u);
  try { await env.KV.put("tx:"+txId, JSON.stringify({pack:pack.id, chat, at:Date.now()})); } catch(e){}
  return sendMessage(chat,
    "🎉 پرداخت موفق!\n\n💎 "+toFa(pack.credits+pack.bonus)+" اعتبار به حساب تو اضافه شد.\nاعتبار فعلی: "+toFa(u.credits), mainKb);
}

// ── callback
async function onCallback(cq, env){
  const chat=cq.message.chat.id, data=cq.data||"";
  await answerCallback(cq.id);
  if(!isAllowed(chat)) return sendMessage(chat, PRIVATE_MSG, mainKb);
  const {u, exists} = await getUser(env, chat);

  if(data==="home")  return sendMessage(chat,"🏠 منوی اصلی",mainKb);
  if(data==="new")   return sendMessage(chat,"موضوع استخاره‌ات را انتخاب کن:",topicKb);

  if(data.startsWith("buy:")){
    const pack = PACKS.find(p=>p.id===data.slice(4));
    if(!pack) return sendMessage(chat,"⚠️ بسته پیدا نشد.",mainKb);
    return sendInvoice(chat, pack);
  }
  if(data.startsWith("topic:")){
    const t = data.slice(6);
    if(exists && u.topic !== t){ u.topic = t; await saveUser(env,chat,u); }
    return sendMessage(chat, RITUAL, ritualKb(t));
  }
  if(data.startsWith("draw:")){
    const t = data.slice(5);
    u.topic = t; u.last = pickIndex(); u.draws += 1;
    await saveUser(env,chat,u);
    await sendMessage(chat,"🔮 در حال انجام استخاره...");
    return sendMessage(chat, freeMsg(CONTENT[u.last], t), resultKb(t));
  }
  if(data.startsWith("unlock:")){
    const t = data.slice(7);
    const rec = CONTENT[u.last];
    if(!rec) return sendMessage(chat,"⚠️ خطای کوچک؛ لطفاً یک استخارهٔ جدید بگیر.",mainKb);
    const key = u.last+":"+t;
    if(u.unlocked.includes(key)) return sendMessage(chat, unlockMsg(rec, t), mainKb);
    if(u.credits>0){
      u.credits -= 1; u.unlocks += 1; u.unlocked.push(key);
      await saveUser(env,chat,u);
      return sendMessage(chat, unlockMsg(rec, t), mainKb);
    }
    return sendMessage(chat,"💎 اعتبار کافی نیست.\n\nاز «🛍 فروشگاه» یه بسته بخر:", storeKb);
  }
}

export default {
  async fetch(request, env){
    TOKEN = env.BOT_TOKEN || "";
    WALLET_TOKEN = env.WALLET_TOKEN || "WALLET-TEST-1111111111111111";
    const allowedStr = env.ALLOWED_USERS || "";
    ALLOWED_USERS = allowedStr ? allowedStr.split(",").map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n)) : [];

    if(request.method==="GET"){
      const url=new URL(request.url);
      if(url.pathname==="/test"){
        const out={ hasToken:!!env.BOT_TOKEN, hasKV:!!env.KV, records:CONTENT.length,
          wallet: WALLET_TOKEN.startsWith("WALLET-TEST")?"test":"real",
          privateMode: ALLOWED_USERS.length>0 ? ALLOWED_USERS.length+" users allowed" : "public" };
        return new Response(JSON.stringify(out,null,2),{headers:{"Content-Type":"application/json"}});
      }
      return new Response("ok");
    }
    if(request.method==="POST"){
      try{
        const u = await request.json();
        if(u.pre_checkout_query) await onPreCheckout(u.pre_checkout_query);
        else if(u.message && u.message.successful_payment) await onSuccessfulPayment(u.message, env);
        else if(u.message) await onMessage(u.message, env);
        else if(u.callback_query) await onCallback(u.callback_query, env);
      }catch(e){ console.error(e); }
    }
    return new Response("ok");
  }
};