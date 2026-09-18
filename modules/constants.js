// modules/constants.js

// ========== API & CONFIG ==========
export const API_BASE = "https://tapi.bale.ai";
export const DRAW_COOLDOWN_MS = 5000;
export const DO_VERSION_PREFIX = "v4:";
export const BACKUP_RETENTION_DAYS = 30;
export const HISTORY_LIMIT = 10;
export const REFERRAL_REWARD_REFERRER = 1;
export const REFERRAL_REWARD_NEW_USER = 1;
export const REFERRAL_BASE_LINK = "https://ble.ir/";
export const CURRENT_PHASE = 1;

// ========== CATEGORIES ==========
export const CATEGORIES = [
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

// ========== PACKS ==========
export const PACKS = [
  { id:"p10",  credits:10,  bonus:0,  rials:200000,  title:"بستهٔ ۱۰ اعتبار",  label:"۱۰ اعتبار",  desc:"۱۰ اعتبار — ۱۰ استخارهٔ تخصصی", text:"🥉 ۱۰ اعتبار — ۲۰,۰۰۰ تومان" },
  { id:"p30",  credits:30,  bonus:5,  rials:500000,  title:"بستهٔ ۳۵ اعتبار",  label:"۳۵ اعتبار",  desc:"۳۰ اعتبار + ۵ هدیه",          text:"🥈 ۳۵ اعتبار — ۵۰,۰۰۰ تومان" },
  { id:"p100", credits:100, bonus:20, rials:1500000, title:"بستهٔ ۱۲۰ اعتبار", label:"۱۲۰ اعتبار", desc:"۱۰۰ اعتبار + ۲۰ هدیه",        text:"🥇 ۱۲۰ اعتبار — ۱۵۰,۰۰۰ تومان" },
];

// ========== ALIAS ==========
export const ALIAS = { trade:"transaction", business2:"business" };