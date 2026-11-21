# قطن ستور — ديمو المساعد الذكي لخدمة العملاء على واتساب

🌐 نسخة حية للتجربة من المتصفح: https://files.instinct.com/unfpsajj1i80

ديمو تفاعلي شغال 100% من غير إنترنت ولا مفاتيح API: شات بشكل واتساب (عربي، RTL)
لبراند ملابس مصري وهمي، والمساعد بيرد بالمصري، بياخد طلبات كاملة، بيتابع حالة
الطلب، بيجاوب على الشحن والاسترجاع، وبيحوّل لموظف بشري لما يلزم.

## التشغيل (٣٠ ثانية)

1. افتح `index.html` بأي متصفح (دبل كليك) — مفيش أي تنصيب.
2. جرّب تكتب: «السلام عليكم» وبعدين «عايز أطلب» أو دوس على الأزرار الجاهزة.
3. للعرض التلقائي على العميل (المحادثة بتشتغل لوحدها): افتح `index.html?demo=1`
4. زرار ↺ فوق بيرجّع الديمو من الأول.

### سيناريو العرض المقترح (نفس اللي في الفيديو)

1. «السلام عليكم» → ترحيب + قائمة
2. «عندكم تيشيرتات قطن؟» → كارت منتج بالسعر والمقاسات والخامة + المصدر
3. «خامته ايه وبكام؟» → رد على نفس المنتج من غير ما تعيد اسمه
4. «عايز أطلب واحد» → يمشيك خطوة خطوة: مقاس → لون → كمية → اسم → موبايل → محافظة → عنوان → دفع → ملخص → تأكيد → رقم طلب
5. «ممكن أعرف طلب قديم وصل فين؟ رقمه 1037» → حالة الطلب فوراً (جرّب 1042 و1021 برضه)
6. «سياسة الاسترجاع ايه؟» → السياسة بالتفصيل
7. «عندكم خصم للشركات؟ عندي 200 موظف» → سؤال مش في المصادر → تحويل لموظف بشري

## المميزات (نفس وعود عروض البيع)

- ردود من بيانات المتجر المعتمدة بس — مفيش إجابات مخترعة
- مصدر كل إجابة ظاهر تحتها («المصدر: صفحة الشحن والتوصيل»)
- فهم العربي المصري (بكام، خامته، فين طلبي، أرقام عربية ٢٤٥)
- تسجيل طلب كامل جوه الشات مع ملخص وتأكيد ورقم طلب
- تتبع الطلب برقم الطلب أو رقم الموبايل
- تحويل تلقائي لموظف: لو العميل طلب صراحة، أو متضايق، أو سؤالين متتاليين مش مفهومين
- بعد التحويل: رسائل العميل بتتسجل للفريق

## توصيل موديل ذكاء اصطناعي (OpenRouter)

الديمو شغال بمحرك محلي (`js/engine.js`). لتوصيل موديل حقيقي:

1. انسخ `config.example.js` إلى `config.js`
2. حط مفتاحك من https://openrouter.ai/keys في `OPENROUTER_API_KEY`
3. حدد الموديل في `OPENROUTER_MODEL` (الافتراضي `google/gemini-2.0-flash-001`)

الكود في `js/llm-adapter.js` بيبعت تاريخ المحادثة + بيانات المتجر (`js/catalog.js`)
للموديل وبيطلب رد JSON منظم. لو الاتصال فشل لأي سبب بيرجع تلقائياً للمحرك
المحلي فالديمو ما يقعش. بيانات المتجر كلها في `js/catalog.js` — غيّر المنتجات
والأسعار والشحن والاسترجاع من ملف واحد.

> لما يبقى production: نداء الموديل لازم يطلع من سيرفر عندك مش من المتصفح،
> عشان المفتاح ما يتكشفش في كود الصفحة.

## توصيل واتساب بيزنس حقيقي (الخطوة الجاية)

1. **حساب Meta Business + تطبيق على Meta for Developers** وتفعيل WhatsApp Business Platform (Cloud API)
2. **رقم موبايل مخصص** مش مسجل على واتساب عادي، وتوثيق اسم النشاط التجاري (العلامة الخضراء اختيارية)
3. **سيرفر webhook** بـ HTTPS عام يستقبل الرسايل (verify token + إشعارات الرسايل) — ممكن نفس `engine.js` يشتغل Node ويرد عن طريق Graph API
4. **قوالب رسايل (Templates)** بموافقة ميتا لأي رسالة خارج نافذة الـ 24 ساعة (تأكيد الطلب، تحديث الشحن)
5. **التسعير**: محادثات الخدمة اللي بيبدأها العميل مجانية؛ رسايل القوالب التسويقية/الخدمية بتتحاسب لكل رسالة حسب فئتها وبلد العميل
6. بديل أسرع: مزوّد جاهز (360dialog، Twilio، WATI، respond.io) بيديك API وواجهة موظفين جاهزة مقابل اشتراك
7. **صندوق وارد للموظفين** للمحادثات المحولة (handoff): أبسط نسخة لوحة ويب صغيرة تقرأ من نفس قاعدة البيانات، أو مزوّد فيه inbox جاهز
8. مراجعة بشرية قبل الإرسال (من وعود العرض التقديمي): وضع «مسودات» يرسل رد المساعد للموظف يوافق عليه بدل الإرسال المباشر

## بنية المشروع

```
index.html          الواجهة
css/style.css       ستايل واتساب RTL
js/catalog.js       بيانات المتجر (منتجات، شحن، استرجاع، طلبات وهمية) — عدّل هنا
js/engine.js        محرك المحادثة المحلي (فهم نية + مسارات)
js/llm-adapter.js   توصيلة OpenRouter الاختيارية
js/app.js           ربط الواجهة بالمحرك + الديمو التلقائي
config.example.js   مثال إعداد المفتاح
test-engine.js      اختبارات المحرك: node test-engine.js
capture.js          لقطات وفريمات فيديو (محتاج npm i puppeteer-core)
shots/              لقطات من الديمو
demo-conversation.mp4  فيديو ٢٣ ثانية لمحادثة كاملة
```

---

# Qoton Store — WhatsApp AI Customer-Service Assistant (Demo)

An interactive demo of an Arabic (Egyptian dialect) AI customer-service assistant for Egyptian e-commerce brands, styled as a WhatsApp chat. Runs 100% locally in the browser: no internet, no API keys required.

Live browser demo: https://files.instinct.com/unfpsajj1i80

The assistant greets customers, answers from approved store data only (with the source cited under each reply), takes complete orders step by step inside the chat, tracks order status, explains shipping and returns policy, and escalates to a human agent when needed.

## Run it (30 seconds)

1. Open `index.html` in any browser (double-click) — zero installation.
2. Type "السلام عليكم" then "عايز أطلب", or click the preset buttons.
3. Auto-play mode for client presentations: open `index.html?demo=1`
4. The ↺ button restarts the demo.

## Features

- Answers grounded in the store's approved data only — no invented answers
- Source citation shown under every reply
- Understands Egyptian Arabic (colloquial phrasing, Arabic-Indic digits ٢٤٥)
- Full in-chat order capture with summary, confirmation, and order number
- Order tracking by order number or phone number
- Automatic human handoff on explicit request, frustration, or two consecutive unknown questions
- After handoff, customer messages are logged for the team

## Connect a real LLM (OpenRouter)

The demo runs on a local engine (`js/engine.js`). To plug in a real model:

1. Copy `config.example.js` to `config.js`
2. Add your key from https://openrouter.ai/keys as `OPENROUTER_API_KEY`
3. Pick a model in `OPENROUTER_MODEL` (default `google/gemini-2.0-flash-001`)

`js/llm-adapter.js` sends the conversation history plus store data (`js/catalog.js`) to the model and requests a structured JSON reply. If the call fails for any reason it falls back to the local engine, so the demo never breaks. All store content (products, prices, shipping, returns) lives in `js/catalog.js` — edit one file to rebrand.

> For production, model calls must come from your own server, not the browser, so the API key is never exposed in page source.

## Next step: real WhatsApp Business

Meta Business account + WhatsApp Business Platform (Cloud API), a dedicated number, an HTTPS webhook server (the same `engine.js` can run on Node and reply via Graph API), Meta-approved message templates, and a staff inbox for escalated conversations. Ready-made providers (360dialog, Twilio, WATI, respond.io) shorten the path. Details in the Arabic section above.

## Project structure

```
index.html          UI
css/style.css       WhatsApp-style RTL styling
js/catalog.js       Store data (products, shipping, returns, mock orders) — edit here
js/engine.js        Local conversation engine (intent + flows)
js/llm-adapter.js   Optional OpenRouter adapter
js/app.js           UI wiring + auto-demo
config.example.js   Key config template
test-engine.js      Engine tests: node test-engine.js
capture.js          Screenshot/video capture (needs npm i puppeteer-core)
shots/              Demo screenshots
demo-conversation.mp4  23-second full-conversation video
```
