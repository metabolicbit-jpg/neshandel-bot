// ── neshandel-bot — نسخه ۱۴: منوی ساده‌شده + بسته‌های مدال‌دار + Schema v4
import { CONTENT } from "./content/index.js";

let TOKEN = "";
let WALLET_TOKEN = "";
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

// ── بسته‌های فروشگاه (مدال‌دار — مطابق اسکرین‌شات)
const PACKS = [
  { id:"p10",  credits:10,  bonus:0,  rials:200000,  title:"بستهٔ ۱۰ اعتبار",  label:"۱۰ اعتبار",  desc:"۱۰ اعتبار — ۱۰ استخارهٔ تخصصی", text:"🥉 ۱۰ اعتبار — ۲۰,۰۰۰ تومان" },
  { id:"p30",  credits:30,  bonus:5,  rials:500000,  title:"بستهٔ ۳۵ اعتبار",  label:"۳۵ اعتبار",  desc:"۳۰ اعتبار + ۵ هدیه",          text:"🥈 ۳۵ اعتبار — ۵۰,۰۰۰ تومان" },
  { id:"p100", credits:100, bonus:20, rials:1500000, title:"بستهٔ ۱۲۰ اعتبار", label:"۱۲۰ اعتبار", desc:"۱۰۰ اعتبار + ۲۰ هدیه",        text:"🥇 ۱۲۰ اعتبار — ۱۵۰,۰۰۰ تومان" },
];
const storeKb = { inline_keyboard: PACKS.map(p=>[{ text:p.text, callback_data:"buy:"+p.id }]) };

// ── دسته‌بندی موضوعات (۲۲ موضوع) + فازبندی آینده‌نگر
const CURRENT_PHASE = 1;
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

// ── کیبوردها
const mainKb = { keyboard:[[ {text:"🔮 استخاره"} ],[ {text:"👤 حساب من"},{text:"🛍 فروشگاه"} ]], resize_keyboard:true, is_persistent:true };
// آداب: فقط «خواندم» + «انصراف» (بدون آداب حذف شد)
const ritualKb = (t)=>({ inline_keyboard:[
  [{text:"🤲 خواندم، استخاره کن",callback_data:"draw:"+t}],
  [{text:"↩️ انصراف",callback_data:"home"}]
]});
// نتیجه: دکمهٔ پریمیوم شخصی + استخاره جدید (منوی اصلی حذف شد)
const resultKb = (t)=>({ inline_keyboard:[
  [{text:premiumBtn(t),callback_data:"unlock:"+t}],
  [{text:"🔮 استخاره جدید",callback_data:"new"}]
]});
// پس از باز کردن: بازبینی رایگان + استخاره جدید
const unlockedKb = (t)=>({ inline_keyboard:[
  [{text:"📖 مشاهدهٔ استخاره تخصصی",callback_data:"view:"+t}],
  [{text:"🔮 استخاره جدید",callback_data:"new"}]
]});
// بدون اعتبار: فروشگاه + استخاره جدید
const noCreditKb = { inline_keyboard:[
  [{text:"🛍 مشاهدهٔ بسته‌ها",callback_data:"store"}],
  [{text:"🔮 استخاره جدید",callback_data:"new"}]
]};

// منوی مرحلهٔ ۱: فقط دسته‌ها (تصمیم دیگر حذف شد)
function catKb(){
  const rows=[];
  for(let i=0;i<CATEGORIES.length;i+=2){
    rows.push(CATEGORIES.slice(i,i+2).map(c=>({text:c.label,callback_data:"cat:"+c.id})));
  }
  return {inline_keyboard:rows};
}
// منوی مرحلهٔ ۲: موضوعات دسته + بازگشت (قانون: برچسب بلند = ردیف مستقل)
function topicKb(catId){
  const cat = CATEGORIES.find(c=>c.id===catId);
  if(!cat) return catKb();
  const visible = cat.topics.filter(t=>!t.hidden && (t.phase||1)<=CURRENT_PHASE);
  const rows=[]; let pair=null;
  for(const t of visible){
    const btn={text:t.label,callback_data:"topic:"+t.id};
    if(t.label.length>12){ if(pair){rows.push([pair]);pair=null;} rows.push([btn]); }
    else if(pair){ rows.push([pair,btn]); pair=null; }
    else pair=btn;
  }
  if(pair) rows.push([pair]);
  rows.push([{text:"↩️ بازگشت",callback_data:"cats"}]);
  return {inline_keyboard:rows};
}
// دکمهٔ پریمیوم شخصی‌سازی‌شده (با محافظ طول)
function premiumBtn(t){
  const txt="💎 استخاره تخصصی "+topicShort(t);
  return txt.length>30 ? "💎 استخاره تخصصی" : txt;
}

// ── پیام‌ها
const WELCOME = "🌿 به «نشانِ دل» خوش آمدی.\n\n⚖️ استخاره برای طلب خیر است و جایگزین مشورت نیست.\n\nبرای شروع، «🔮 استخاره» را بزن.";
const RITUAL = "🤲 <b>آداب کوتاه:</b>\n۱. نیتت را روشن کن.\n۲. وضو و رو به قبله.\n۳. سه صلوات.\n\n<b>دعای استخاره:</b>\n«اللّهُمَّ إِنِّی تَفَأَّلْتُ بِکِتابِکَ، وَ تَوَکَّلْتُ عَلَیْکَ، فَأَرِنی مِنْ کِتابِکَ ما هُوَ مَکْتومٌ مِنْ سِرِّکَ المَکْنونِ في غَیْبِکَ»";
const PRIVATE_MSG = "🔒 این بات در حال تست خصوصی است.\n\nفعلاً فقط کاربران منتخب می‌توانند از آن استفاده کنند.\n\nبه‌زودی برای همه فعال می‌شود. 🌿";
const ADMIN_ONLY_MSG = "⛔ این فرمان فقط برای مدیر بات قابل دسترسی است.";
const STORE_MSG = "🛍 <b>فروشگاه اعتبار «نشانِ دل»</b>\n\nهر اعتبار = یک استخارهٔ تخصصی با تحلیل کامل موضوع تو\n\nیه بسته انتخاب کن تا صورتحساب کیف‌پولی برات بیاد:";
const NO_CREDIT_MSG = "🌿 دوست عزیز، اعتبارت تموم شده.\n\nبرای دیدن استخارهٔ تخصصی همین موضوع، یکی از بسته‌ها رو انتخاب کن؛ کمتر از یک دقیقه شارژ می‌شه. 🌙";
const DISCLAIMER = "⚖️ سلب مسئولیت و نکته مهم فقهی: فراموش نکنید که در احکام اسلامی، استخاره جایگزین عقل، تحقیق و مشورت نیست و «وحی منزل» محسوب نمی‌شود. این متن صرفاً یک تفسیر و راهنمای معنوی بر اساس آیات قرآن است. لذا برای تصمیمات حساس زندگی‌تان، حتماً در کنار این استخاره، با متخصصان و مشاوران کارآزمودهٔ آن حوزه مشورت فرمایید. 🤝";

const toFa = n => String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);

// ── جست‌وجوی موضوع
function topicInfo(id){
  for(const c of CATEGORIES) for(const t of c.topics) if(t.id===id) return t;
  return { id, label:"❓ تصمیم دیگر", short:"تصمیم تو" };
}
function topicShort(id){ return topicInfo(id).short || "تصمیم تو"; }
function topicKey(id){ const t=topicInfo(id); return t.key || t.id; }

// ── بلوک موضوع (Schema v4 + fallback)
const ALIAS = { trade:"transaction", business2:"business" };
function topicBlockV4(r,t){
  const k = topicKey(t);
  const T = (r.topics||{})[k] || (r.topics||{})[ALIAS[t]];
  if(T) return T;
  return { verdict:r.level, badge:r.badge,
    tip:r.core_message||"",
    warning:"این موضوع به‌صورت اختصاصی برای این صفحه تفسیر نشده؛ با احتیاط و مشورت پیش برو.",
    action:"به پیام محوری آیه توجه کن و با بررسی و مشورت دقیق تصمیم بگیر." };
}

// ── رندر رایگان (Schema v4 + fallback قدیمی)
function freeMsg(r,t){
  if(r.free_summary){
    return [
      "سلام دوست عزیز 🌿 خوش اومدی؛ من اینجام تا پیام خدا رو توی این تصمیم مهم برات رمزگشایی کنم.",
      "📊 جواب استخاره: "+r.level+" "+r.badge,
      "📝 پاسخ کلی به نیت شما:",
      r.free_summary,"",
      "📖 آیه سرصفحه (صفحهٔ "+toFa(r.page)+" قرآن کریم):",
      "«"+r.arabic+"»",
      "ترجمه روان: "+r.translation,
      "(سورهٔ "+r.surah+"، آیهٔ "+toFa(r.ayah)+")"
    ].join("\n");
  }
  const B=(r.topics||{})[t]||{verdict:r.verdict,guidance:r.key,action:r.action};
  return [
    r.badge+" <b>نتیجه:</b> "+r.verdict,
    "<b>"+r.headline+"</b>","",
    "📖 سوره "+r.surah+" — آیهٔ "+toFa(r.ayah)+" (صفحهٔ "+toFa(r.page)+")",
    r.arabic,"",
    "📜 "+r.translation,"",
    (r.opener||"بذار این آیه رو بذاریم کنارِ تصمیمت:"),
    (r.plain||""),"",
    "✨ سه چراغ از دلِ آیه:",
    ...(r.guidance||[]).map(g=>"• "+g),"",
    "🔒 اگه می‌خوای بدونی این آیه دربارهٔ «"+topicInfo(t).label+"» دقیقاً چی می‌گه:",
    r.premium ? "💎 تحلیل کامل + چک‌لیست مخصوص موضوع تو + کی بروم/کی بایستم…" : (B.guidance||"").slice(0,70)+"…"
  ].join("\n");
}

// ── رندر پریمیوم (Schema v4 + fallback قدیمی)
function premiumMsg(r,t){
  if(r.core_message){
    const B=topicBlockV4(r,t);
    return [
      "💎 <b>استخاره تخصصی «"+topicInfo(t).label+"»</b>","",
      "🎯 <b>پیام محوری و رمز آیه:</b>",
      r.core_message,"",
      topicInfo(t).label+" ["+B.verdict+" "+B.badge+"]",
      "💡 نکته و رمز آیه: "+B.tip,
      "⚠️ زنگ خطر / هشدار: "+B.warning,
      "🛠 راهکار عملیاتی: "+B.action,"",
      DISCLAIMER
    ].join("\n");
  }
  const T=(r.topics||{})[t]||{};
  if(r.premium){
    const P=r.premium;
    return [
      "🔓 <b>برداشت تخصصی «"+topicInfo(t).label+"»</b>","",
      "🧭 <b>جمع‌بندی:</b> "+P.final_verdict,"",
      "🔍 <b>تحلیل تصمیم:</b>",P.decision_analysis,"",
      "🟢 <b>نقطهٔ قوت:</b> "+P.strengths,
      "⚠️ <b>نقطهٔ خطر:</b> "+P.risks,"",
      "✅ <b>کی جلو بروم؟</b>",...P.go_conditions.map(c=>"• "+c),"",
      "🛑 <b>کی متوقف شوم؟</b>",...P.stop_conditions.map(c=>"• "+c),"",
      "📋 <b>چک‌لیست:</b>",...(T.checklist||[]).map(c=>"☐ "+c),"",
      "💡 "+(T.topic_note||""),
      "📖 <b>مثال واقعی:</b> "+P.real_example,
      "⚠️ <b>اشتباه رایج:</b> "+P.common_mistake,"",
      DISCLAIMER
    ].join("\n");
  }
  const B=(r.topics||{})[t]||{verdict:r.verdict,guidance:r.key,action:r.action};
  return [
    "🔓 <b>برداشت تخصصی «"+topicInfo(t).label+"»</b>","",
    "⚖️ "+(B.verdict||r.verdict),"",B.guidance,"",
    "🎯 <b>اقدام:</b> "+(B.action||r.action),
    "🛡 <b>احتیاط:</b> "+r.caution,"",
    "💎 <i>"+r.key+"</i>","",DISCLAIMER
  ].join("\n");
}

// ── KV
async function getUser(env, chatId){
  try {
    const raw = await env.KV.get("u:"+chatId);
    if (raw) return { u: JSON.parse(raw), exists: true };
  } catch(e){ console.error("getUser:", e); }
  return { u: { credits:2, draws:0, unlocks:0, last:-1, topic:"marriage", unlocked:[], name:"", joined:0 }, exists: false };
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
function isAllowed(chatId, allowedUsers){
  if(allowedUsers.length===0) return true;
  return allowedUsers.includes(chatId);
}
function isAdmin(chatId, allowedUsers){
  return allowedUsers.includes(chatId);
}

// ── پخش و ارسال
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
async function sendToMany(env, ids, text){
  let sent=0, failed=0;
  for(const id of ids){
    const r = await baleCall("sendMessage",{chat_id:id, text});
    if(r && r.ok) sent++; else failed++;
  }
  return {sent, failed};
}
async function listMembers(env){
  const members=[];
  let cursor;
  for(;;){
    const page = await env.KV.list({prefix:"u:", cursor});
    for(const k of page.keys){
      const id = parseInt(k.name.slice(2),10);
      if(isNaN(id)) continue;
      let u={};
      try{ const raw=await env.KV.get(k.name); if(raw) u=JSON.parse(raw); }catch(e){}
      members.push({ id, name:u.name||"", credits:u.credits||0, draws:u.draws||0, unlocks:u.unlocks||0, joined:u.joined||0 });
    }
    if(page.list_complete) break;
    cursor = page.cursor;
  }
  return members;
}

// ── handler پیام
async function onMessage(m, env, allowedUsers){
  const chat=m.chat.id, text=(m.text||"").trim();

  if(!isAllowed(chat, allowedUsers)) return sendMessage(chat, PRIVATE_MSG, mainKb);

  if(text==="/start"){
    const cleanName = ((m.chat.first_name||"")+" "+(m.chat.last_name||"")).trim();
    const {u, exists} = await getUser(env, chat);
    let save = !exists;
    if(!u.joined) { u.joined = Date.now(); save = true; }
    if(cleanName && u.name !== cleanName) { u.name = cleanName; save = true; }
    if(save) await saveUser(env, chat, u);
    return sendMessage(chat, WELCOME, mainKb);
  }

  // ── فرامین ادمین
  if(text==="/cancel"){
    if(!isAdmin(chat, allowedUsers)) return sendMessage(chat, ADMIN_ONLY_MSG, mainKb);
    await env.KV.delete("await:"+chat);
    return sendMessage(chat,"↩️ لغو شد.");
  }
  if(text==="/notify"){
    if(!isAdmin(chat, allowedUsers)) return sendMessage(chat, ADMIN_ONLY_MSG, mainKb);
    await env.KV.put("await:"+chat, JSON.stringify({mode:"broadcast"}), {expirationTtl:300});
    return sendMessage(chat,"📣 متن نوتیفیکیشن را بفرست تا برای همهٔ اعضا ارسال شود.\nلغو: /cancel");
  }
  const mSend = text.match(/^\/send\s+([0-9,]+)\s*$/);
  if(mSend){
    if(!isAdmin(chat, allowedUsers)) return sendMessage(chat, ADMIN_ONLY_MSG, mainKb);
    const ids = mSend[1].split(",").map(s=>parseInt(s,10)).filter(n=>!isNaN(n));
    await env.KV.put("await:"+chat, JSON.stringify({mode:"send", ids}), {expirationTtl:300});
    return sendMessage(chat,"📨 متن را بفرست تا به "+toFa(ids.length)+" نفر ارسال شود.\nلغو: /cancel");
  }
  if(text==="/members"){
    if(!isAdmin(chat, allowedUsers)) return sendMessage(chat, ADMIN_ONLY_MSG, mainKb);
    const members = await listMembers(env);
    let lines = ["👥 اعضای بات: "+toFa(members.length),""];
    members.slice(0,50).forEach((mm,i)=>{
      const joined = mm.joined ? new Date(mm.joined).toLocaleDateString("fa-IR") : "—";
      lines.push(toFa(i+1)+". "+(mm.name||"بدون نام")+"\n🆔 "+mm.id+"\n💎 "+toFa(mm.credits)+" | 🔮 "+toFa(mm.draws)+" | 🔓 "+toFa(mm.unlocks)+"\n📅 عضویت: "+joined);
    });
    if(members.length>50) lines.push("… و "+toFa(members.length-50)+" عضو دیگر");
    return sendPlain(chat, lines.join("\n\n"), mainKb);
  }

  // ── حالت انتظار
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
  if(text==="🔮 استخاره") return sendMessage(chat,"📂 دستهٔ موردنظرت رو انتخاب کن:",catKb());
  if(text==="👤 حساب من"){
    const {u} = await getUser(env, chat);
    return sendMessage(chat,
      "👤 <b>حساب من</b>\n\n💎 اعتبار: "+toFa(u.credits)+
      "\n🔮 استخاره‌ها: "+toFa(u.draws)+
      "\n🔓 باز شده: "+toFa(u.unlocks), mainKb);
  }
  if(text==="🛍 فروشگاه") return sendMessage(chat, STORE_MSG, storeKb);
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
async function onCallback(cq, env, allowedUsers){
  const chat=cq.message.chat.id, data=cq.data||"";
  await answerCallback(cq.id);
  if(!isAllowed(chat, allowedUsers)) return sendMessage(chat, PRIVATE_MSG, mainKb);
  const {u, exists} = await getUser(env, chat);

  if(data==="home")  return sendMessage(chat,"🏠 منوی اصلی",mainKb);
  if(data==="new")   return sendMessage(chat,"📂 دستهٔ موردنظرت رو انتخاب کن:",catKb());
  if(data==="cats")  return sendMessage(chat,"📂 دستهٔ موردنظرت رو انتخاب کن:",catKb());
  if(data==="store") return sendMessage(chat, STORE_MSG, storeKb);

  if(data.startsWith("cat:")){
    const cat = CATEGORIES.find(c=>c.id===data.slice(4));
    if(!cat) return sendMessage(chat,"📂 دستهٔ موردنظرت رو انتخاب کن:",catKb());
    return sendMessage(chat,"📂 دستهٔ «"+cat.full+"» — موضوعت رو انتخاب کن:",topicKb(cat.id));
  }

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

  if(data.startsWith("unlock:") || data.startsWith("view:")){
    const t = data.slice(data.indexOf(":")+1);
    const rec = CONTENT[u.last];
    if(!rec) return sendMessage(chat,"⚠️ خطای کوچک؛ لطفاً یک استخارهٔ جدید بگیر.",mainKb);
    const key = u.last+":"+t;
    if(u.unlocked.includes(key)) return sendMessage(chat, premiumMsg(rec, t), unlockedKb(t));
    if(u.credits>0){
      u.credits -= 1; u.unlocks += 1; u.unlocked.push(key);
      await saveUser(env,chat,u);
      return sendMessage(chat, premiumMsg(rec, t), unlockedKb(t));
    }
    return sendMessage(chat, NO_CREDIT_MSG, noCreditKb);
  }
}

export default {
  async fetch(request, env){
    TOKEN = env.BOT_TOKEN || "";
    WALLET_TOKEN = env.WALLET_TOKEN || "WALLET-TEST-1111111111111111";
    const allowedStr = env.ALLOWED_USERS || "";
    const allowedUsers = allowedStr
      ? allowedStr.split(",").map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n))
      : [];

    if(request.method==="GET"){
      const url=new URL(request.url);
      if(url.pathname==="/test"){
        const out={ hasToken:!!env.BOT_TOKEN, hasKV:!!env.KV, records:CONTENT.length,
          wallet: WALLET_TOKEN.startsWith("WALLET-TEST")?"test":"real",
          privateMode: allowedUsers.length>0 ? allowedUsers.length+" users allowed" : "public (all users)" };
        return new Response(JSON.stringify(out,null,2),{headers:{"Content-Type":"application/json"}});
      }
      return new Response("ok");
    }
    if(request.method==="POST"){
      try{
        const u = await request.json();
        if(u.pre_checkout_query) await onPreCheckout(u.pre_checkout_query);
        else if(u.message && u.message.successful_payment) await onSuccessfulPayment(u.message, env);
        else if(u.message) await onMessage(u.message, env, allowedUsers);
        else if(u.callback_query) await onCallback(u.callback_query, env, allowedUsers);
      }catch(e){ console.error(e); }
    }
    return new Response("ok");
  }
};