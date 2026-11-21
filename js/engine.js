/* ============================================================
   محرك المحادثة — قاعدة-أساسية (Rule-based) تعمل من غير إنترنت
   لو OpenRouter متوصل في config.js، الـ adapter بيشتغل الأول
   ولو فشل بنرجع للمحرك ده تلقائياً.
   المبدأ (من عروض فارس للعملاء): الرد من مصادر معتمدة بس،
   مصدر كل إجابة واضح، وأي سؤال مش مؤكد يتحول لموظف.
   ============================================================ */
(function (root) {
  const C = root.CATALOG || require("./catalog.js");

  /* ---------- أدوات نصية عربية ---------- */
  const AR_DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  function normalize(s) {
    return (s || "")
      .replace(/[٠-٩]/g, (d) => AR_DIGITS[d])
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّْ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  function hasAny(norm, words) {
    return words.some((w) => {
      const nw = normalize(w);
      if (nw.length <= 3) {
        // كلمة قصيرة: طابقها كتوكن بعد شيل أدوات التعريف/الجر (عشان «كم» متطابقش «عندكم» و«شحن» تطابق «الشحن»)
        return norm.split(" ").some((t) => {
          const bare = t.replace(/^(وال|فال|بال|كال|لل|ال|ب|ل|و|ف)/, "");
          return bare === nw;
        });
      }
      return norm.includes(nw);
    });
  }
  function extractPhone(text) {
    const m = (text || "").replace(/[٠-٩]/g, (d) => AR_DIGITS[d]).match(/01\d{9}/);
    return m ? m[0] : null;
  }
  function extractOrderNo(text) {
    const m = (text || "").replace(/[٠-٩]/g, (d) => AR_DIGITS[d]).match(/\b(10\d{2,3}|#?\d{4})\b/);
    return m ? m[1].replace("#", "") : null;
  }
  function extractQty(text) {
    const m = (text || "").replace(/[٠-٩]/g, (d) => AR_DIGITS[d]).match(/\b([1-9])\b/);
    return m ? parseInt(m[1], 10) : null;
  }
  function money(n) {
    return n.toLocaleString("ar-EG") + " جنيه";
  }

  /* ---------- قوائم نية ---------- */
  const INTENT = {
    greeting: ["السلام", "اهلا", "هاي", "صباح الخير", "مساء الخير", "ازيك", "عامل ايه", "hello", "hi"],
    menu: ["القائمه", "المنيو", "menu", "البدايه"],
    orderStart: ["عايز اطلب", "عاوز اطلب", "اطلب", "اشتري", "عايز اشتري", "اوردر", "order", "اطلب دلوقتي", "اطلبه", "هطلب", "هشتري"],
    orderStatus: ["فين طلبي", "طلبي فين", "تتبع", "تابع طلب", "حاله الطلب", "رقم الطلب", "طلبي", "الاوردر", "الطلب وصل", "يوصل امتي", "هيوصل امتي", "track", "status"],
    shipping: ["شحن", "توصيل", "دليفري", "بتوصلوا", "بتوصلو", "هيوصل في", "مواعيد التوصيل", "shipping", "delivery", "مصاريف الشحن", "تكلفه الشحن", "الشحن بكام"],
    returns: ["استرجاع", "ارجاع", "ارجع", "استبدال", "ابدل", "بدل", "مرتجع", "return", "refund", "فلوسي ترجع"],
    payment: ["الدفع", "ادفع", "فيزا", "كاش", "فودافون كاش", "انستاباي", "فوري", "payment"],
    price: ["بكام", "بكم", "السعر", "سعر", "ثمن", "تمن", "price", "كم"],
    priceList: ["اسعار", "اسعاركم", "قائمه الاسعار", "الاسعار", "price list"],
    sizes: ["مقاس", "مقاسات", "size"],
    material: ["خامه", "خامت", "قماش", "نسيج", "قطن", "خامات", "material"],
    colors: ["لون", "الوان", "color"],
    availability: ["متوفر", "موجود", "في المخزون", "stock", "لسه موجود", "خلص"],
    human: ["موظف", "بني ادم", "بني قدم", "انسان", "حد حقيقي", "اكلم حد", "اكلمك", "حد يكلمني", "خدمه العملاء", "شكوي", "اشتكي", "كومبلاين", "agent", "human"],
    frustration: ["زفت", "وسخ", "كذب", "كدابين", "نصب", "نصابين", "حراميه", "قرف", "اسوأ", "وحش جدا", "بضاعه بايظه", "خساره", "مش هتعامل معاكم"],
    thanks: ["شكرا", "تسلم", "متشكر", "تمام", "thanks", "thx"],
    bye: ["مع السلامه", "باي", "سلام", "اشوفك", "تصبح علي خير"],
    cancel: ["الغي", "الغاء", "كنسل", "cancel", "انسى الموضوع", "مش عايز اكمل"],
    confirm: ["تاكيد", "اكد", "تمام اكد", "اوكي", "موافق", "yes", "ok", "تمام ✅", "صح"],
    deny: ["لا", "لأ", "مش عايز", "no", "غلط"],
  };

  const SRC = {
    catalog: "المصدر: صفحة المنتجات والأسعار",
    shipping: "المصدر: صفحة الشحن والتوصيل",
    returns: "المصدر: سياسة الاستبدال والاسترجاع",
    payment: "المصدر: صفحة طرق الدفع",
    hours: "المصدر: صفحة تواصل معنا",
  };

  /* ---------- جلسة ---------- */
  function newSession() {
    return {
      stage: null,            // null | 'order:*' | 'awaitOrderNo' | 'awaitReturnOrderNo'
      order: {},              // {product, size, color, qty, name, phone, governorate, address, payment}
      escalated: false,
      fallbacks: 0,
      lastProduct: null,      // آخر منتج اتكلمنا عنه — لأسئلة زي «خامته ايه؟»
      placedOrders: {},       // orderId -> order
      orderCounter: 1043,
    };
  }

  function mainMenuReplies() {
    return ["🛍️ عايز أطلب", "📦 فين طلبي؟", "🚚 الشحن والتوصيل", "↩️ الاستبدال والاسترجاع", "👨‍💼 أكلم موظف"];
  }

  function catalogList() {
    return C.PRODUCTS.map((p) => `• ${p.name} — ${money(p.price)}`).join("\n");
  }

  function findProduct(norm) {
    return C.PRODUCTS.find((p) => hasAny(norm, p.keywords)) || null;
  }

  function findRegion(govText) {
    const norm = normalize(govText);
    for (const r of C.SHIPPING.regions) {
      if (r.keys.some((k) => norm.includes(normalize(k)))) return r;
    }
    return null;
  }

  function productCard(p) {
    return (
      `${p.name} 👕\n` +
      `💰 السعر: ${money(p.price)}\n` +
      `📏 المقاسات: ${p.sizes.join(" / ")}\n` +
      `🎨 الألوان: ${p.colors.join("، ")}\n` +
      `🧵 الخامة: ${p.material}\n` +
      `📦 التوفر: ${p.stock}`
    );
  }

  /* ---------- الرد الأساسي ---------- */
  // يرجع { replies: [{text, source?}], quickReplies?: [], system?: [], escalate?: bool }
  function reply(rawInput, state) {
    const input = (rawInput || "").trim();
    const norm = normalize(input);
    const out = { replies: [], quickReplies: null, system: [] };

    if (!input) return out;

    /* --- لو المحادثة متحولة لموظف: سجل الرسالة وطمن العميل --- */
    if (state.escalated) {
      out.replies.push({
        text: "سجلت رسالتك ووصلت لفريق خدمة العملاء 👨‍💼 هيردوا عليك هنا في أقرب وقت.\nمواعيد العمل: " + C.STORE.hours,
        source: SRC.hours,
      });
      return out;
    }

    /* --- إلغاء مسار الطلب في أي وقت --- */
    if (state.stage && hasAny(norm, INTENT.cancel)) {
      state.stage = null;
      state.order = {};
      out.replies.push({ text: "تمام، لغيت الطلب الحالي 👌 تحب أساعدك في حاجة تانية؟" });
      out.quickReplies = mainMenuReplies();
      return out;
    }

    /* --- مسار تسجيل الطلب (state machine) --- */
    if (state.stage) return orderFlow(input, norm, state, out);

    /* --- نية التحول لموظف أو غضب واضح --- */
    if (hasAny(norm, INTENT.human) || hasAny(norm, INTENT.frustration)) {
      return escalate(state, out);
    }

    /* --- تحية --- */
    if (hasAny(norm, INTENT.greeting) || hasAny(norm, INTENT.menu)) {
      state.fallbacks = 0;
      out.replies.push({
        text:
          `أهلاً بيك في ${C.STORE.name} ${"👋"}\n` +
          "أنا مساعدك الذكي — أقدر أرد على أسئلتك عن المنتجات والأسعار والمقاسات والشحن والاسترجاع، وأخد طلبك كمان 🛍️\n" +
          "اختار من القائمة أو اكتب سؤالك على طول:",
      });
      out.quickReplies = mainMenuReplies();
      return out;
    }

    /* --- بدء طلب شراء --- */
    if (hasAny(norm, INTENT.orderStart)) {
      let p = findProduct(norm);
      if (!p && state.lastProduct) p = C.PRODUCTS.find((x) => x.id === state.lastProduct) || null;
      startOrder(state, p);
      if (p) {
        // المنتج اتحدد في نفس الرسالة — اسأل على المقاس على طول
        state.lastProduct = p.id;
        out.replies.push({ text: `اختيار حلو 👌 ${p.name} بـ ${money(p.price)}.\nمحتاج أي مقاس؟`, source: SRC.catalog });
        out.quickReplies = p.sizes;
        return out;
      }
      return orderFlow(input, norm, state, out);
    }

    /* --- تتبع طلب (بنية صريحة أو وجود رقم طلب في الرسالة) --- */
    if (hasAny(norm, INTENT.orderStatus) || extractOrderNo(input)) {
      const no = extractOrderNo(input);
      const phone = extractPhone(input);
      if (no) return orderStatusByNo(no, state, out);
      if (phone) return orderStatusByPhone(phone, state, out);
      state.stage = "awaitOrderNo";
      out.replies.push({ text: "ابعتلي رقم طلبك أو رقم الموبايل اللي اتطلب بيه وهقولك حالته فوراً 📦" });
      out.quickReplies = ["رقم طلبي 1042", "🔙 القائمة الرئيسية"];
      return out;
    }

    /* --- الشحن والتوصيل --- */
    if (hasAny(norm, INTENT.shipping)) {
      state.fallbacks = 0;
      const region = findRegion(input);
      let text;
      if (region) {
        text = `التوصيل لـ ${region.label} 🚚\n⏱️ المدة: ${region.time}\n💵 مصاريف الشحن: ${money(region.fee)}\n\nولو طلبك فوق ${money(C.SHIPPING.freeAbove)} الشحن مجاني 🎁`;
      } else {
        text =
          "مصاريف ومواعيد الشحن 🚚\n" +
          C.SHIPPING.regions.map((r) => `• ${r.label}: ${r.time} — ${money(r.fee)}`).join("\n") +
          `\n• ${C.SHIPPING.defaultRegion.label}: ${C.SHIPPING.defaultRegion.time} — ${money(C.SHIPPING.defaultRegion.fee)}` +
          `\n\n🎁 شحن مجاني للطلبات فوق ${money(C.SHIPPING.freeAbove)}.\n${C.SHIPPING.companies}`;
      }
      out.replies.push({ text, source: SRC.shipping });
      out.quickReplies = ["🛍️ عايز أطلب", "↩️ الاستبدال والاسترجاع", "👨‍💼 أكلم موظف"];
      return out;
    }

    /* --- الاستبدال والاسترجاع --- */
    if (hasAny(norm, INTENT.returns)) {
      state.fallbacks = 0;
      out.replies.push({
        text: `سياسة الاستبدال والاسترجاع ↩️\n✅ ${C.RETURNS.summary}\n🚫 ${C.RETURNS.exceptions}\n🔁 ${C.RETURNS.exchange}\n\nلو عايز تطلب استرجاع لطلب وصلك، ابعتلي رقم الطلب وهظبطهولك.`,
        source: SRC.returns,
      });
      out.quickReplies = ["عايز أرجع طلب", "🛍️ عايز أطلب", "👨‍💼 أكلم موظف"];
      if (hasAny(norm, ["عايز ارجع", "ارجع طلب", "طلب استرجاع", "ارجاع طلب"])) {
        state.stage = "awaitReturnOrderNo";
        out.replies.push({ text: "ابعتلي رقم الطلب اللي عايز ترجعه ↩️" });
        out.quickReplies = ["رقم طلبي 1021", "🔙 القائمة الرئيسية"];
      }
      return out;
    }

    /* --- طرق الدفع --- */
    if (hasAny(norm, INTENT.payment)) {
      state.fallbacks = 0;
      out.replies.push({
        text: "طرق الدفع المتاحة 💳\n• كاش عند الاستلام\n• فودافون كاش\n• انستاباي\n\nالدفع عند الاستلام متاح لكل المحافظات.",
        source: SRC.payment,
      });
      out.quickReplies = ["🛍️ عايز أطلب", "📦 فين طلبي؟", "👨‍💼 أكلم موظف"];
      return out;
    }

    /* --- قائمة الأسعار عموماً --- */
    if (hasAny(norm, INTENT.priceList)) {
      state.fallbacks = 0;
      out.replies.push({
        text: `دي منتجاتنا وأسعارها الحالية 👇\n${catalogList()}\n\nاسألني عن أي منتج بالتفصيل (مقاسات، ألوان، خامة) 👌`,
        source: SRC.catalog,
      });
      out.quickReplies = ["🛍️ عايز أطلب", "التيشيرت بكام؟", "👨‍💼 أكلم موظف"];
      return out;
    }

    /* --- سؤال عن منتج معين (أو آخر منتج اتكلمنا عنه) --- */
    let p = findProduct(norm);
    if (!p && state.lastProduct && (hasAny(norm, INTENT.price) || hasAny(norm, INTENT.material) || hasAny(norm, INTENT.sizes) || hasAny(norm, INTENT.colors) || hasAny(norm, INTENT.availability))) {
      p = C.PRODUCTS.find((x) => x.id === state.lastProduct) || null;
    }
    if (p) {
      state.fallbacks = 0;
      state.lastProduct = p.id;
      if (hasAny(norm, INTENT.price) && hasAny(norm, INTENT.material)) {
        out.replies.push({ text: productCard(p), source: SRC.catalog });
      } else if (hasAny(norm, INTENT.price) && !hasAny(norm, INTENT.sizes)) {
        out.replies.push({ text: `${p.name} بـ ${money(p.price)} 💰 والتوفر الحالي: ${p.stock}.`, source: SRC.catalog });
      } else if (hasAny(norm, INTENT.material)) {
        out.replies.push({ text: `خامة ${p.name}: ${p.material} 🧵`, source: SRC.catalog });
      } else if (hasAny(norm, INTENT.sizes)) {
        out.replies.push({ text: `مقاسات ${p.name} المتوفرة: ${p.sizes.join(" / ")} 📏\nولو محتار بين مقاسين، أنصحك تاخد الأكبر في القطن لأنه بينكمش شوية مع الغسيل.`, source: SRC.catalog });
      } else if (hasAny(norm, INTENT.colors)) {
        out.replies.push({ text: `ألوان ${p.name}: ${p.colors.join("، ")} 🎨`, source: SRC.catalog });
      } else {
        out.replies.push({ text: productCard(p), source: SRC.catalog });
      }
      out.quickReplies = ["🛍️ عايز أطلبه", "🚚 الشحن بكام؟", "↩️ الاسترجاع", "👨‍💼 أكلم موظف"];
      return out;
    }

    /* --- أسعار/منتجات عموماً --- */
    if (hasAny(norm, INTENT.price) || hasAny(norm, ["منتجات", "بيعرضوا ايه", "عندكم ايه", "كتالوج", "catalog"])) {
      state.fallbacks = 0;
      out.replies.push({
        text: `دي منتجاتنا وأسعارها الحالية 👇\n${catalogList()}\n\nاسألني عن أي منتج بالتفصيل (مقاسات، ألوان، خامة) 👌`,
        source: SRC.catalog,
      });
      out.quickReplies = ["🛍️ عايز أطلب", "التيشيرت بكام؟", "👨‍💼 أكلم موظف"];
      return out;
    }

    /* --- شكر / وداع --- */
    if (hasAny(norm, INTENT.thanks)) {
      out.replies.push({ text: "العفو 🌟 أي وقت تحتاجنا احنا هنا. نورت " + C.STORE.name + "!" });
      return out;
    }
    if (hasAny(norm, INTENT.bye)) {
      out.replies.push({ text: "مع السلامة 👋 في خدمتك أي وقت." });
      return out;
    }

    /* --- Fallback: ممنوع نخترع إجابة — نعتذر ونعرض التحويل --- */
    state.fallbacks = (state.fallbacks || 0) + 1;
    if (state.fallbacks >= 2) {
      return escalate(state, out, "سؤالك محتاج مراجعة بشرية عشان أتأكدلك المعلومة صح 100%.");
    }
    out.replies.push({
      text: "معلش، مش متأكد إني فاهم سؤالك صح 🤔 أقدر أساعدك في المنتجات والأسعار والمقاسات والشحن والاسترجاع وتتبع الطلبات — أو أحولك لموظف خدمة عملاء؟",
    });
    out.quickReplies = ["👨‍💼 أكلم موظف", "🔙 القائمة الرئيسية"];
    return out;
  }

  /* ---------- التحويل لموظف ---------- */
  function escalate(state, out, prefix) {
    state.escalated = true;
    state.stage = null;
    if (prefix) out.replies.push({ text: prefix });
    out.system.push("تم التحويل إلى موظف خدمة عملاء 👨‍💼");
    out.replies.push({
      text:
        "حولتك لفريق خدمة العملاء — موظف حقيقي هيكمل معاك من هنا 👨‍💼\n" +
        "كل تفاصيل المحادثة وصلتهم، ومش هتحتاج تعيد شرح حاجة.\n" +
        "⏰ مواعيد العمل: " + C.STORE.hours,
      source: SRC.hours,
    });
    return out;
  }

  /* ---------- حالة الطلب ---------- */
  function orderStatusByNo(no, state, out) {
    const local = state.placedOrders[no];
    if (local) {
      out.replies.push({
        text: `طلبك رقم #${no} 📦\nالحالة: اتسجل بنجاح ✅ وهيخرج مع شركة الشحن خلال ${"٢–٣"} أيام عمل.\nهيوصلك على: ${local.address}، ${local.governorate}.`,
        source: SRC.shipping,
      });
    } else if (C.MOCK_ORDERS[no]) {
      out.replies.push({ text: `طلبك رقم #${no} 📦\n${C.MOCK_ORDERS[no].text}`, source: SRC.shipping });
    } else {
      out.replies.push({ text: `مش لاقي طلب بالرقم #${no} 🤔 اتأكد من الرقم أو ابعتلي رقم الموبايل اللي اتطلب بيه.` });
      out.quickReplies = ["👨‍💼 أكلم موظف", "🔙 القائمة الرئيسية"];
      return out;
    }
    out.quickReplies = ["↩️ الاستبدال والاسترجاع", "🛍️ عايز أطلب", "👨‍💼 أكلم موظف"];
    return out;
  }

  function orderStatusByPhone(phone, state, out) {
    const found = Object.values(C.MOCK_ORDERS).filter((o) => o.phone === phone);
    const mine = Object.values(state.placedOrders).filter((o) => o.phone === phone);
    if (!found.length && !mine.length) {
      out.replies.push({ text: "مش لاقي طلبات مسجلة على الرقم ده 🤔 لو اتطلب برقم تاني ابعتهولي، أو أحولك لموظف؟" });
      out.quickReplies = ["👨‍💼 أكلم موظف", "🔙 القائمة الرئيسية"];
      return out;
    }
    const lines = [];
    mine.forEach((o) => lines.push(`• #${o.id} — ${o.product} — اتسجل ✅ بيتجهز للشحن`));
    found.forEach((o) => lines.push(`• #${o.id} — ${o.text}`));
    out.replies.push({ text: `لقيت الطلبات دي على رقمك 📦\n${lines.join("\n")}`, source: SRC.shipping });
    out.quickReplies = ["↩️ الاستبدال والاسترجاع", "👨‍💼 أكلم موظف"];
    return out;
  }

  /* ---------- مسار تسجيل الطلب ---------- */
  function startOrder(state, product) {
    state.order = { qty: 1 };
    if (product) {
      state.order.product = product.name;
      state.order.productId = product.id;
      state.stage = "order:size";
    } else {
      state.stage = "order:product";
    }
  }

  function orderFlow(input, norm, state, out) {
    const o = state.order;
    switch (state.stage) {
      case "awaitOrderNo": {
        state.stage = null;
        const no = extractOrderNo(input);
        const phone = extractPhone(input);
        if (no) return orderStatusByNo(no, state, out);
        if (phone) return orderStatusByPhone(phone, state, out);
        out.replies.push({ text: "ده مش شكل رقم طلب أو موبايل 🤔 ابعت رقم الطلب (زي 1042) أو رقم موبايل مصري 11 رقم." });
        return out;
      }

      case "awaitReturnOrderNo": {
        state.stage = null;
        const no = extractOrderNo(input);
        if (!no) {
          out.replies.push({ text: "محتاج رقم الطلب عشان أظبط الاسترجاع — ابعتهولي (زي 1021)." });
          return out;
        }
        out.replies.push({
          text: `تمام، سجلت طلب استرجاع للطلب #${no} ↩️\n${C.RETURNS.process}`,
          source: SRC.returns,
        });
        out.quickReplies = ["👨‍💼 أكلم موظف", "🔙 القائمة الرئيسية"];
        return out;
      }

      case "order:product": {
        const p = findProduct(norm);
        if (!p) {
          out.replies.push({ text: `اختار المنتج اللي يعجبك من القائمة 👇\n${catalogList()}`, source: SRC.catalog });
          out.quickReplies = C.PRODUCTS.map((x) => x.name);
          return out;
        }
        o.product = p.name;
        o.productId = p.id;
        state.stage = "order:size";
        out.replies.push({ text: `اختيار حلو 👌 ${p.name} بـ ${money(p.price)}.\nمحتاج أي مقاس؟`, source: SRC.catalog });
        out.quickReplies = p.sizes;
        return out;
      }

      case "order:size": {
        const p = C.PRODUCTS.find((x) => x.id === o.productId);
        const size = p.sizes.find((s) => norm === normalize(s) || norm.includes(normalize(s))) || input.toUpperCase();
        if (!p.sizes.some((s) => normalize(s) === normalize(size))) {
          out.replies.push({ text: `المقاسات المتاحة لـ ${p.name}: ${p.sizes.join(" / ")} — اختار منهم 📏`, source: SRC.catalog });
          out.quickReplies = p.sizes;
          return out;
        }
        o.size = size.toUpperCase();
        state.stage = "order:color";
        out.replies.push({ text: `تمام، مقاس ${o.size} ✅ تحب أي لون؟` });
        out.quickReplies = p.colors;
        return out;
      }

      case "order:color": {
        const p = C.PRODUCTS.find((x) => x.id === o.productId);
        const color = p.colors.find((c) => norm.includes(normalize(c)));
        if (!color) {
          out.replies.push({ text: `الألوان المتاحة: ${p.colors.join("، ")} — اختار لون منهم 🎨` });
          out.quickReplies = p.colors;
          return out;
        }
        o.color = color;
        state.stage = "order:qty";
        out.replies.push({ text: "كم قطعة تحب؟ 🔢 (اكتب رقم، أو سيبها قطعة واحدة)" });
        out.quickReplies = ["1", "2", "3"];
        return out;
      }

      case "order:qty": {
        const q = extractQty(input);
        if (q) o.qty = q;
        state.stage = "order:name";
        out.replies.push({ text: `تمام، ${o.qty > 1 ? o.qty + " قطع" : "قطعة واحدة"} ✅\nاسمك الكريم؟` });
        return out;
      }

      case "order:name": {
        if (input.length < 2) {
          out.replies.push({ text: "محتاج اسمك عشان نسجل الطلب 🙏" });
          return out;
        }
        o.name = input;
        state.stage = "order:phone";
        out.replies.push({ text: `أهلاً بيك يا ${o.name.split(" ")[0]} 🌟 ابعتلي رقم الموبايل اللي نوصلك عليه (يبدأ بـ 01):` });
        return out;
      }

      case "order:phone": {
        const phone = extractPhone(input);
        if (!phone) {
          out.replies.push({ text: "الرقم ده مش مظبوط 🤔 محتاج موبايل مصري 11 رقم يبدأ بـ 01 (مثال: 01012345678)." });
          return out;
        }
        o.phone = phone;
        state.stage = "order:governorate";
        out.replies.push({ text: "التوصيل لأي محافظة؟ 📍" });
        out.quickReplies = ["القاهرة", "الجيزة", "الإسكندرية", "المنصورة", "أسيوط"];
        return out;
      }

      case "order:governorate": {
        o.governorate = input;
        o.region = findRegion(input) || C.SHIPPING.defaultRegion;
        state.stage = "order:address";
        out.replies.push({
          text: `التوصيل لـ ${o.region.label}: ${o.region.time} ومصاريف الشحن ${money(o.region.fee)} 🚚\nاكتب العنوان بالتفصيل (الشارع، رقم العمارة، الدور، علامة مميزة):`,
          source: SRC.shipping,
        });
        return out;
      }

      case "order:address": {
        if (input.length < 8) {
          out.replies.push({ text: "العنوان محتاج تفاصيل أكتر 🙏 الشارع ورقم العمارة على الأقل." });
          return out;
        }
        o.address = input;
        state.stage = "order:payment";
        out.replies.push({ text: "تحب تدفع إزاي؟ 💳", source: SRC.payment });
        out.quickReplies = C.PAYMENTS.map((x) => x.label);
        return out;
      }

      case "order:payment": {
        const pay = C.PAYMENTS.find((x) => norm.includes(normalize(x.label)) || (x.id === "cod" && hasAny(norm, ["كاش", "استلام", "cod"])));
        if (!pay) {
          out.replies.push({ text: "اختار طريقة الدفع 👇" });
          out.quickReplies = C.PAYMENTS.map((x) => x.label);
          return out;
        }
        o.payment = pay.label;
        state.stage = "order:confirm";
        const p = C.PRODUCTS.find((x) => x.id === o.productId);
        const items = p.price * o.qty;
        const shipping = items >= C.SHIPPING.freeAbove ? 0 : o.region.fee;
        o.total = items + shipping;
        out.replies.push({
          text:
            "راجع طلبك قبل التأكيد 🧾\n" +
            `• المنتج: ${o.product} — مقاس ${o.size} — لون ${o.color} ×${o.qty}\n` +
            `• سعر المنتجات: ${money(items)}\n` +
            `• الشحن: ${shipping === 0 ? "مجاني 🎁" : money(shipping)}\n` +
            `• الإجمالي: ${money(o.total)}\n` +
            `• الاسم: ${o.name}\n• الموبايل: ${o.phone}\n• العنوان: ${o.address}، ${o.governorate}\n` +
            `• الدفع: ${o.payment}`,
          source: SRC.catalog,
        });
        out.quickReplies = ["✅ تأكيد الطلب", "❌ إلغاء"];
        return out;
      }

      case "order:confirm": {
        if (hasAny(norm, INTENT.deny) || hasAny(norm, INTENT.cancel)) {
          state.stage = null;
          state.order = {};
          out.replies.push({ text: "اتلغى الطلب، مفيش مشكلة 👌 تحب أساعدك في حاجة تانية؟" });
          out.quickReplies = mainMenuReplies();
          return out;
        }
        if (!hasAny(norm, INTENT.confirm)) {
          out.replies.push({ text: "أكد الطلب أو اختار إلغاء 👇" });
          out.quickReplies = ["✅ تأكيد الطلب", "❌ إلغاء"];
          return out;
        }
        const id = String(state.orderCounter++);
        o.id = id;
        state.placedOrders[id] = { ...o };
        state.stage = null;
        out.replies.push({
          text:
            `تم تسجيل طلبك بنجاح ✅ رقم الطلب: #${id}\n` +
            "هيوصلك تأكيد برسالة على موبايلك، والمندوب هيتصل بيك قبل التوصيل 🚚\n" +
            "تقدر ترجعلي أي وقت وتسأل «فين طلبي؟» وأنا أرد عليك فوراً.",
          source: SRC.shipping,
        });
        out.quickReplies = ["📦 فين طلبي؟", "↩️ سياسة الاسترجاع", "🔙 القائمة الرئيسية"];
        state.order = {};
        return out;
      }

      default:
        state.stage = null;
        out.replies.push({ text: "نرجع من الأول 👌" });
        out.quickReplies = mainMenuReplies();
        return out;
    }
  }

  const Engine = { newSession, reply, normalize, INTENT, SRC };
  root.ENGINE = Engine;
  if (typeof module !== "undefined") module.exports = Engine;
})(typeof window !== "undefined" ? window : globalThis);
