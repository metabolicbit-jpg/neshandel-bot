neshandel-bot/
├── index.js                    ← ورودی اصلی (فقط orchestration)
├── wrangler.toml
├── content/
│   ├── index.js
│   └── pXXX-XXX.js
└── modules/
    ├── constants.js            ← API_BASE، CATEGORIES، PACKS، ...
    ├── duas.js                 ← DUA_BANK + getDua
    ├── messages.js             ← DISCLAIMER، WELCOME، ...
    ├── utils.js                ← toFa، ALIAS، topic*، pickIndex، ...
    ├── api.js                  ← baleCall، sendMessage، ...
    ├── keyboards.js            ← همه‌ی کیبوردها
    ├── builders.js             ← freeMsg، premiumMsg، ...
    ├── admin.js                ← broadcast، backup، ...
    ├── durable.js              ← CreditManager
    └── handlers/
        ├── onMessage.js
        ├── onCallback.js
        ├── onPreCheckout.js
        └── onSuccessfulPayment.js


-------------
neshandel-bot/
├── index.js
├── README.md              ← راهنمای workflow
├── manifesto.md           ← همین سند
├── wisdom-bank.md         ← گنجینه‌ی ادبی
├── used-patterns.json     ← ردیابی الگوها (اختیاری)
└── pXXX-XXX.js            ← فایل‌های صفحه