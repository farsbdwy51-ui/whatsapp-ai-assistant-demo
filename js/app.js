/* ============================================================
   واجهة الشات (ستايل واتساب، RTL) + ربط المحرك
   ============================================================ */
(function () {
  const C = window.CATALOG;
  const E = window.ENGINE;
  const params = new URLSearchParams(location.search);
  const FAST = params.has("fast");
  const INSTANT = params.has("instant");
  const AUTO = params.has("demo");

  let session = loadSession() || E.newSession();
  let history = loadHistory() || [];
  let renderedCount = 0;
  let busy = false;

  const chatEl = document.getElementById("chat");
  const inputEl = document.getElementById("input");
  const sendBtn = document.getElementById("send");
  const chipsEl = document.getElementById("chips");
  const modeEl = document.getElementById("mode");

  modeEl.textContent = window.LLM && window.LLM.enabled() ? "متصل بموديل ذكاء اصطناعي (OpenRouter)" : "وضع الديمو — محرك محلي بدون إنترنت";

  function saveSession() {
    try { localStorage.setItem("qoton_session", JSON.stringify(session)); } catch (e) {}
  }
  function loadSession() {
    try { return JSON.parse(localStorage.getItem("qoton_session")); } catch (e) { return null; }
  }
  function saveHistory() {
    try { localStorage.setItem("qoton_history", JSON.stringify(history.slice(-120))); } catch (e) {}
  }
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem("qoton_history")); } catch (e) { return null; }
  }

  function nowTime() {
    const d = new Date();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "م" : "ص";
    h = h % 12 || 12;
    return h + ":" + m + " " + ampm;
  }

  function scrollBottom() {
    requestAnimationFrame(() => { chatEl.scrollTop = chatEl.scrollHeight; });
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderDayChip() {
    chatEl.appendChild(el("div", "day-chip", "اليوم"));
  }

  function renderSystemChip(text) {
    const d = el("div", "system-chip", text);
    chatEl.appendChild(d);
    scrollBottom();
  }

  function renderMsg(m) {
    const row = el("div", "msg-row " + (m.role === "user" ? "out" : "in"));
    const bubble = el("div", "bubble");
    const body = el("div", "text", m.text);
    bubble.appendChild(body);
    if (m.source) bubble.appendChild(el("div", "src", m.source));
    const meta = el("span", "meta", m.time || nowTime());
    if (m.role === "user") {
      const ticks = el("span", "ticks", "✓✓");
      meta.appendChild(ticks);
    }
    bubble.appendChild(meta);
    row.appendChild(bubble);
    chatEl.appendChild(row);
    scrollBottom();
  }

  function renderChips(list) {
    chipsEl.innerHTML = "";
    if (!list || !list.length) { chipsEl.style.display = "none"; return; }
    list.forEach((c) => {
      const b = el("button", "chip", c);
      b.addEventListener("click", () => sendUser(c));
      chipsEl.appendChild(b);
    });
    chipsEl.style.display = "flex";
  }

  let typingEl = null;
  function showTyping() {
    typingEl = el("div", "msg-row in");
    const b = el("div", "bubble typing");
    b.innerHTML = "<span class='dot'></span><span class='dot'></span><span class='dot'></span>";
    typingEl.appendChild(b);
    chatEl.appendChild(typingEl);
    scrollBottom();
  }
  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  function delay(ms) {
    if (INSTANT) return Promise.resolve();
    return new Promise((r) => setTimeout(r, FAST ? Math.min(ms, 500) : ms));
  }

  async function botRespond(userText) {
    let result = null;
    if (window.LLM && window.LLM.enabled()) {
      try {
        const r = await window.LLM.reply(userText, history);
        result = { replies: r.replies, quickReplies: null, system: r.escalate ? ["تم التحويل إلى موظف خدمة عملاء 👨‍💼"] : [] };
        if (r.escalate) session.escalated = true;
      } catch (e) {
        result = null; // fallback صامت للمحرك المحلي
      }
    }
    if (!result) result = E.reply(userText, session);
    (result.system || []).forEach(renderSystemChip);
    for (const r of result.replies) {
      showTyping();
      await delay(650 + Math.min(r.text.length * 14, 1500));
      hideTyping();
      const m = { role: "assistant", text: r.text, source: r.source, time: nowTime() };
      history.push(m);
      renderMsg(m);
    }
    renderChips(result.quickReplies);
    saveSession();
    saveHistory();
  }

  async function sendUser(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    window.__busy = true;
    inputEl.value = "";
    const m = { role: "user", text, time: nowTime() };
    history.push(m);
    renderMsg(m);
    saveHistory();
    await delay(400);
    await botRespond(text);
    busy = false;
    window.__busy = false;
    inputEl.focus();
  }

  sendBtn.addEventListener("click", () => sendUser(inputEl.value));
  inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendUser(inputEl.value); });

  document.getElementById("reset").addEventListener("click", () => {
    localStorage.removeItem("qoton_session");
    localStorage.removeItem("qoton_history");
    location.href = location.pathname;
  });

  /* ---------- أول رسالة ---------- */
  function initialRender() {
    renderDayChip();
    renderSystemChip("الرسايل دي تجربة تفاعلية للمساعد الذكي — مش حساب واتساب حقيقي");
    if (!history.length) {
      const m = {
        role: "assistant",
        text: `أهلاً بيك في ${C.STORE.name} 👋\nأنا المساعد الذكي للمتجر. اسألني عن المنتجات والأسعار والمقاسات والشحن والاسترجاع، أو اطلب على طول من هنا 🛍️`,
        time: nowTime(),
      };
      history.push(m);
      history.forEach((h) => renderMsg(h));
      renderChips(E.reply("القائمة", session).quickReplies);
    } else {
      history.forEach((h) => renderMsg(h));
      renderChips(null);
    }
    saveHistory();
  }

  /* ---------- ديمو تلقائي للعرض على العملاء ---------- */
  const SCRIPT = [
    "السلام عليكم",
    "عندكم تيشيرتات قطن؟",
    "خامته ايه وبكام؟",
    "تمام عايز أطلب واحد",
    "L",
    "أسود",
    "2",
    "محمد أحمد",
    "01011223344",
    "القاهرة",
    "15 شارع التحرير، الدقي، الدور التالت",
    "كاش عند الاستلام",
    "✅ تأكيد الطلب",
    "ممكن أعرف طلب قديم وصل فين؟ رقمه 1037",
    "سياسة الاسترجاع ايه؟",
    "طيب فيه خصم للشركات؟ عندي 200 موظف",
  ];

  async function autoplay() {
    await delay(900);
    for (const line of SCRIPT) {
      await sendUser(line);
      await delay(700);
    }
    window.__demoDone = true;
  }

  initialRender();
  if (AUTO) autoplay();
})();
