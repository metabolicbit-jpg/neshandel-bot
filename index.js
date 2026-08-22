// ── neshandel-bot — نسخه ۲: سیستم اعتبار واقعی با KV
let TOKEN = "";
const BASE = "https://tapi.bale.ai";

const CONTENT = [
{ page:245, surah:"یوسف", ayah:79,
  arabic:"قَالَ مَعَاذَ ٱللَّهِ أَن نَّأْخُذَ إِلَّا مَن وَجَدْنَا مَتَـٰعَنَا عِندَهُۥٓ إِنَّآ إِذًا لَّظَـٰلِمُونَ",
  translation:"گفت: پناه به خدا، که جز آن کس را که کالای خود را نزد وی یافته‌ایم بازداشت کنیم، زیرا در آن صورت قطعاً ستمکار خواهیم بود.",
  badge:"🟢", verdict:"خوب است، اما مشروط به پایبندی به اصول اخلاقی و عدالت.",
  headline:"⚖️ با اصولت بمان؛ تحت فشار، بی‌گناه را قربانی نکن.",
  guidance:["آیا راه‌حلت کسی را که نقشی ندارد در معرض آسیب می‌گذارد؟","اگر بله، پناه به خدا ببر و راه دیگری پیدا کن.","اگر راه‌حل منصفانه است، با توکل ادامه بده."],
  marriage:"اگر برای رسیدن به یک ازدواج داری کسی را تحت فشار می‌گذاری یا حقی را نادیده می‌گیری، این مسیر درست نیست. اما اگر هر دو طرف با رضایت و انصاف پیش می‌روید، با توکل ادامه بده.",
  transaction:"اگر در معامله داری حقی را ضایع می‌کنی یا به کسی که بی‌گناه است فشار می‌آوری، پناه بر خدا از چنین کاری. اما اگر معامله منصفانه و شفاف است، با توکل پیش برو.",
  key:"با اصولت بمان؛ تحت فشار، بی‌گناه را قربانی نکن.",
  action:"یک بار دیگر منصفانه بودن راه‌حلت را بسنج؛ اگر منصفانه است با توکل ادامه بده.",
  caution:"تحت فشار و اضطرار هم، اصل «عدم ظلم به بی‌گناه» را زیر پا نگذار." },
{ page:295, surah:"کهف", ayah:16,
  arabic:"وَإِذِ ٱعْتَزَلْتُمُوهُمْ وَمَا يَعْبُدُونَ إِلَّا ٱللَّهَ فَأْوُۥٓا۟ إِلَى ٱلْكَهْفِ يَنشُرْ لَكُمْ رَبُّكُم مِّن رَّحْمَتِهِۦ وَيُهَيِّئْ لَكُم مِّنْ أَمْرِكُم مِّرْفَقًا",
  translation:"و چون از آنها و از آنچه که جز خدا می‌پرستند کناره گرفتید، پس به غار پناه جویید، تا پروردگارتان از رحمت خود بر شما بگستراند و برای شما در کارتان گشایشی فراهم سازد.",
  badge:"🟢", verdict:"خوب است؛ با صبر و برنامه، گشایش می‌آید.",
  headline:"🌅 از محیط ناسالم فاصله بگیر؛ گشایش در راه است.",
  guidance:["اگر محیط یا اطرافیان تو را به سمت ناسالم می‌کشند، فاصله بگیر.","پناه بردن به آرامش و برنامه، گشایش می‌آورد.","عجله نکن؛ گشایش خدا با برنامهٔ تو همراه می‌شود."],
  marriage:"اگر خانواده یا محیط تو را به ازدواجی ناسالم فشار می‌دهند، فاصله بگیر و به معیارهای خودت پایبند بمان؛ گشایش در ازدواج سالم خواهد بود.",
  transaction:"اگر محیط معامله ناسالم یا پر از فشار و فریب است، از آن فاصله بگیر؛ معاملهٔ سالم‌تر با آرامش پیدا می‌شود.",
  key:"از محیط ناسالم فاصله بگیر؛ گشایش در راه است.",
  action:"یک قدم کوچک برای فاصله گرفتن از فشار و نزدیک شدن به آرامش بردار.",
  caution:"فاصله گرفتن به معنای فرار نیست؛ به معنای انتخاب محیط سالم‌تر است." },
{ page:325, surah:"انبیاء", ayah:36,
  arabic:"وَإِذَا رَءَاكَ ٱلَّذِينَ كَفَرُوٓا۟ إِن يَتَّخِذُونَكَ إِلَّا هُزُوًا أَهَـٰذَا ٱلَّذِى يَذْكُرُ ءَالِهَتَكُمْ وَهُم بِذِكْرِ ٱلرَّحْمَـٰنِ هُمْ كَـٰفِرُونَ",
  translation:"و کسانی که کافر شدند، چون تو را ببینند فقط به مسخره‌ات می‌گیرند [و می‌گویند:] «آیا این همان کس است که خدایانتان را [به بدی‌] یاد می‌کند؟» در حالی که آنان خود، یاد [خدای‌] رحمان را منکرند.",
  badge:"🔴", verdict:"احتیاط جدی؛ اگر تمسخر و تحقیر الگوی تکرارشونده است، فاصله بگیر.",
  headline:"🛑 تمسخر و تحقیر مداوم را عادی ندان.",
  guidance:["بین اختلاف نظر و تمسخر تفاوت بگذار.","اگر تحقیر و تمسخر تکرار می‌شود، این یک هشدار جدی است.","در برابر رفتار ناسالم، خودت را وارد درگیری نکن؛ فاصله بگیر."],
  marriage:"اگر طرف مقابل یا خانواده‌اش به‌جای گفت‌وگو، تو یا باورهایت را مسخره می‌کنند و این الگو تکرار شده، ادامه نده؛ فاصله بگیر.",
  transaction:"اگر طرف معامله به‌جای پاسخ منطقی، تو را مسخره می‌کند یا از بررسی فرار می‌کند، معامله را متوقف کن.",
  key:"تمسخر و تحقیر مداوم را عادی ندان.",
  action:"یک بار شفاف صحبت کن؛ اگر تمسخر ادامه داشت، فاصله بگیر.",
  caution:"هر مخالفتی تمسخر نیست؛ معیار، تکرار و عمدی بودن تحقیر است." },
{ page:459, surah:"زمر", ayah:6,
  arabic:"خَلَقَكُم مِّن نَّفْسٍ وَٰحِدَةٍ ثُمَّ جَعَلَ مِنْهَا زَوْجَهَا وَأَنزَلَ لَكُم مِّنَ ٱلْأَنْعَـٰمِ ثَمَـٰنِيَةَ أَزْوَٰجٍ ۚ يَخْلُقُكُمْ فِى بُطُونِ أُمَّهَـٰتِكُمْ خَلْقًا مِّنۢ بَعْدِ خَلْقٍ فِى ظُلُمَـٰتٍ ثَلَـٰثٍ ۚ ذَٰلِكُمُ ٱللَّهُ رَبُّكُمْ لَهُ ٱلْمُلْكُ ۖ لَآ إِلَـٰهَ إِلَّا هُوَ ۖ فَأَنَّىٰ تُصْرَفُونَ",
  translation:"شما را از نفسی واحد آفرید، سپس جفتش را از آن قرار داد، و برای شما از دامها هشت قسم پدید آورد. شما را در شکمهای مادرانتان آفرینشی پس از آفرینشی [دیگر] در تاریکیهای سه گانه خلق کرد. این است خدا، پروردگار شما، فرمانروایی از آنِ اوست. خدایی جز او نیست، پس چگونه برگردانیده می‌شوید؟",
  badge:"🟢", verdict:"خوب است؛ اما عجله نکن و مراحل را کامل کن.",
  headline:"🌱 مرحله‌به‌مرحله پیش برو؛ عجله نکن.",
  guidance:["هر چیزی مرحله‌به‌مرحله شکل می‌گیرد؛ تصمیم بزرگ هم همین‌طور.","عجله برای نتیجه، مراحل را خراب می‌کند.","پایه‌ها را محکم کن، بعد تصمیم نهایی بگیر."],
  marriage:"اگر شناخت هنوز کامل نیست، عجله نکن؛ با گفت‌وگو و شناخت مرحله‌به‌مرحله پیش برو، بعد تصمیم بگیر.",
  transaction:"اگر یک مرحلهٔ مهم (کارشناسی، سند، قرارداد) مانده، عجله نکن؛ اول کاملش کن، بعد نهایی کن.",
  key:"مرحله‌به‌مرحله پیش برو؛ عجله نکن.",
  action:"مراحل باقی‌مانده را لیست کن و یکی‌یکی کامل کن.",
  caution:"مرحله‌به‌مرحله بودن به معنای تعلل بی‌پایان نیست؛ یعنی تکمیل مراحل مهم." },
{ page:565, surah:"قلم", ayah:16,
  arabic:"سَنَسِمُهُۥ عَلَى ٱلْخُرْطُومِ",
  translation:"زودا که بر بینی‌اش داغ نهیم [و رسوایش کنیم].",
  badge:"🔴", verdict:"هشدار جدی؛ اگر پایهٔ مسیر فریب و تکبر است، ادامه نده.",
  headline:"⚠️ پایهٔ فریب و تکبر، عاقبتش رسوایی است.",
  guidance:["پایهٔ هر تصمیم را بسنج: صداقت یا فریب؟","اگر پایه بر فریب، پنهان‌کاری یا تکبر است، ادامه نده.","اگر پایه سالم است، این آیه تو را تهدید نمی‌کند."],
  marriage:"اگر پایهٔ این ازدواج فریب، پنهان‌کاری یا خودنمایی است، ادامه نده؛ عاقبتش رسوایی و پشیمانی است.",
  transaction:"اگر پایهٔ معامله بر پنهان‌کاری عیب یا فریب است، متوقف شو؛ این مسیر عاقبت خوبی ندارد.",
  key:"پایهٔ فریب و تکبر، عاقبتش رسوایی است.",
  action:"پایهٔ واقعی این تصمیم را صادقانه بررسی کن.",
  caution:"اگر پایه سالم است، این آیه هشدار نیست؛ فقط پایهٔ ناسالم را نشانه می‌گیرد." }
];

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

const WELCOME = "🌿 به «نشانِ دل» خوش آمدی.\n\n⚖️ استخاره برای طلب خیر است و جایگزین مشورت نیست.\n\nبرای شروع، «🔮 استخاره» را بزن.";
const RITUAL = "🤲 <b>آداب کوتاه:</b>\n۱. نیتت را روشن کن.\n۲. وضو و رو به قبله.\n۳. سه صلوات.\n\n<b>دعای استخاره:</b>\n«اللّهُمَّ إِنِّی تَفَأَّلْتُ بِکِتابِکَ، وَ تَوَکَّلْتُ عَلَیْکَ، فَأَرِنی مِنْ کِتابِکَ ما هُوَ مَکْتومٌ مِنْ سِرِّکَ المَکْنونِ في غَیْبِکَ»";

const topicText = (r,t) => t==="marriage" ? r.marriage : t==="transaction" ? r.transaction : r.key;
const topicFa  = (t) => (TOPICS.find(x=>x[0]===t)||[,t])[1];
const toFa = n => String(n).replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);

function freeMsg(r,t){
  const tt = topicText(r,t);
  return [
    r.badge+" <b>نتیجه:</b> "+r.verdict,
    "<b>"+r.headline+"</b>","",
    "📖 سوره "+r.surah+" — آیهٔ "+r.ayah+" (صفحهٔ "+r.page+")",
    r.arabic,"",
    "📜 "+r.translation,"",
    ...r.guidance.map(g=>"✨ "+g),"",
    "🔒 <b>برداشت تخصصی «"+topicFa(t)+"»:</b>",
    tt.slice(0,70)+"…"
  ].join("\n");
}
function unlockMsg(r,t){
  return [
    "🔓 <b>برداشت تخصصی «"+topicFa(t)+"»</b>","",
    topicText(r,t),"",
    "🎯 <b>اقدام:</b> "+r.action,
    "🛡 <b>احتیاط:</b> "+r.caution,"",
    "💎 <i>"+r.key+"</i>"
  ].join("\n");
}

// ── مدیریت کاربر با KV
async function getUser(env, chatId){
  const u = await env.KV.get("u:"+chatId, "json");
  return u || { credits:2, draws:0, unlocks:0, last:0, topic:"marriage", unlocked:[] };
}
const saveUser = (env, chatId, u) => env.KV.put("u:"+chatId, JSON.stringify(u));

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
    u.last = Math.floor(Math.random()*CONTENT.length);
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
        const out={ hasToken: !!env.BOT_TOKEN, hasKV: !!env.KV };
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