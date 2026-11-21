/* اختبار سريع للمحرك: node test-engine.js */
const E = require("./js/engine.js");
const s = E.newSession();
let fails = 0;

function step(input, expectRe, label) {
  const out = E.reply(input, s);
  const all = out.replies.map((r) => r.text).join("\n") + "\n" + (out.system || []).join("\n");
  const ok = !expectRe || expectRe.test(all);
  if (!ok) {
    fails++;
    console.log("❌ FAIL:", label || input);
    console.log("   input:", JSON.stringify(input));
    console.log("   got:", JSON.stringify(all.slice(0, 300)));
    console.log("   expected:", expectRe);
  } else {
    console.log("✅", label || input);
  }
  return out;
}

console.log("— تحية وقائمة —");
step("السلام عليكم", /أهلاً بيك/, "greeting");

console.log("— أسئلة منتجات —");
step("عندكم تيشيرتات قطن؟", /تيشيرت قطن بيزك/, "product card");
step("خامته ايه؟", /قطن مصري 100%/, "material");
step("بكام الهودي؟", /٨٥٠/, "hoodie price");
step("الاسعار", /قميص كتان/, "catalog list");

console.log("— مسار طلب كامل (من غير تسمية المنتج — يكمل بآخر منتج) —");
step("تمام عايز أطلب واحد", /أي مقاس/, "order: uses last product, ask size");
step("L", /أي لون/, "order: ask color");
step("أسود", /كم قطعة/, "order: ask qty");
step("٢", /اسمك/, "order: arabic digits qty -> name");
step("محمد أحمد", /الموبايل/, "order: ask phone");
step("01011223344", /محافظة/, "order: ask governorate");
step("القاهرة", /العنوان/, "order: ask address");
step("15 شارع التحرير الدقي الدور التالت", /تدفع إزاي/, "order: ask payment");
step("كاش عند الاستلام", /الإجمالي/, "order: summary");
const conf = step("تأكيد", /رقم الطلب: #1043/, "order: confirmed");
const oid = (conf.replies.map((r) => r.text).join(" ").match(/#(\d+)/) || [])[1];

console.log("— تتبع طلب —");
step("فين طلبي؟", /ابعتلي رقم طلبك/, "status: ask number");
step("طلبي رقم 1037", /خرج مع المندوب/, "status: shipped mock");
step("ممكن أعرف طلب قديم وصل فين؟ رقمه 1042", /قيد التجهيز/, "status: bare order number, no intent words");
step("فين طلبي رقم " + oid, /اتسجل بنجاح/, "status: my new order");

console.log("— شحن واسترجاع —");
step("الشحن للاسكندرية بكام؟", /٥٥/, "shipping alex fee");
step("سياسة الاسترجاع ايه؟", /14 يوم/, "returns policy");
step("عايز ارجع طلب", /رقم الطلب/, "return: ask order no");
step("1021", /طلب استرجاع/, "return: registered");

console.log("— تصعيد لموظف —");
step("عندكم خصومات للشركات؟", /موظف|أحولك/, "unknown B2B question -> offer human (fallback 1)");
const esc = step("عايز أكلم موظف", /التحويل إلى موظف/, "explicit human -> escalate");
step("متى هيرد عليا؟", /سجلت رسالتك/, "post-escalation logging");
if (!esc.system || !esc.system.length) { fails++; console.log("❌ FAIL: escalation system chip missing"); }

console.log("— fallback مرتين يحول تلقائياً —");
const s2 = E.newSession();
E.reply("سؤال غريب جداً عن الفضاء", s2);
const esc2 = E.reply("سؤال أغرب عن الكواكب", s2);
if (!esc2.system || !esc2.system.length) { fails++; console.log("❌ FAIL: auto-escalate after 2 fallbacks"); } else console.log("✅ auto-escalate after 2 fallbacks");

console.log(fails ? `\n${fails} فشل` : "\nكل الاختبارات نجحت ✅");
process.exit(fails ? 1 : 0);
