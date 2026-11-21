/* ============================================================
   LLM Adapter — توصيل OpenRouter (اختياري)
   ------------------------------------------------------------
   التفعيل:
     1) انسخ config.example.js إلى config.js
     2) حط مفتاحك في OPENROUTER_API_KEY
   السلوك:
     - لو المفتاح موجود: بنبعت المحادثة + بيانات المتجر للموديل
       ونرجع رده. لو الاتصال فشل لأي سبب بنرجع تلقائياً
       للمحرك القاعدي (engine.js) فالديمو ما يوقفش أبداً.
     - لو مفيش مفتاح: المحرك القاعدي هو اللي شغال 100%.
   الأمان:
     - المفتاح بيفضل محلي على جهازك (ملف config.js).
     - لما المساعد يتصلح production، النداء لازم يطلع من
       سيرفر عندك مش من المتصفح، عشان المفتاح مايتكشفش.
   ============================================================ */
(function (root) {
  function cfg() {
    return (root.APP_CONFIG || {});
  }
  function enabled() {
    const c = cfg();
    return !!(c.OPENROUTER_API_KEY && c.OPENROUTER_API_KEY.trim());
  }

  function systemPrompt() {
    const C = root.CATALOG;
    const products = C.PRODUCTS.map(
      (p) => `- ${p.name}: السعر ${p.price} جنيه، مقاسات ${p.sizes.join("/")}، ألوان ${p.colors.join("، ")}، خامة: ${p.material}، توفر: ${p.stock}`
    ).join("\n");
    const shipping = C.SHIPPING.regions.map((r) => `- ${r.label}: ${r.time} بـ ${r.fee} جنيه`).join("\n");
    return [
      "انت مساعد خدمة عملاء لمتجر ملابس مصري اسمه «" + C.STORE.name + "» على واتساب.",
      "رد دايماً بالعربي المصري البسيط، باختصار، وبأسلوب ودود من غير مبالغة.",
      "جاوب من البيانات المعتمدة تحت بس. ممنوع تخترع أسعار أو سياسات أو مواعيد.",
      "لو السؤال مش متغطي في البيانات، اعتذر واعرض تحويل العميل لموظف، ولو العميل غاضب أو طلب موظف صراحة حوّله فوراً.",
      "لو العميل عايز يطلب، خد منه بالترتيب: المنتج، المقاس، اللون، الكمية، الاسم، الموبايل، المحافظة، العنوان، طريقة الدفع، وبعدين لخصله الطلب للتأكيد.",
      "",
      "المنتجات:",
      products,
      "",
      "الشحن (مجاني فوق " + C.SHIPPING.freeAbove + " جنيه):",
      shipping,
      "- " + C.SHIPPING.defaultRegion.label + ": " + C.SHIPPING.defaultRegion.time + " بـ " + C.SHIPPING.defaultRegion.fee + " جنيه",
      "",
      "الاسترجاع: " + C.RETURNS.summary + " " + C.RETURNS.exceptions + " " + C.RETURNS.process,
      "الدفع: كاش عند الاستلام، فودافون كاش، انستاباي.",
      "مواعيد عمل الفريق البشري: " + C.STORE.hours,
      "",
      "شكل الرد المطلوب: JSON فقط بالشكل ده:",
      '{"replies":["نص الرسالة الأولى","رسالة تانية اختيارية"],"escalate":false}',
      "لو العميل محتاج موظف بشري خلّي escalate=true.",
    ].join("\n");
  }

  // history: [{role:'user'|'assistant', text}]
  async function reply(userText, history) {
    const c = cfg();
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + c.OPENROUTER_API_KEY,
      },
      body: JSON.stringify({
        model: c.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: systemPrompt() },
          ...history.slice(-12).map((m) => ({ role: m.role, content: m.text })),
          { role: "user", content: userText },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });
    if (!res.ok) throw new Error("OpenRouter HTTP " + res.status);
    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const parsed = JSON.parse(content);
    if (!parsed || !Array.isArray(parsed.replies) || !parsed.replies.length) throw new Error("رد غير صالح من الموديل");
    return {
      replies: parsed.replies.map((t) => ({ text: String(t) })),
      escalate: !!parsed.escalate,
    };
  }

  root.LLM = { enabled, reply };
  if (typeof module !== "undefined") module.exports = root.LLM;
})(typeof window !== "undefined" ? window : globalThis);
