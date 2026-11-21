/* Screenshots + screen-recording frames for the demo. node capture.js */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const BASE = "file://" + path.resolve(__dirname, "index.html");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=ar-EG", "--hide-scrollbars"],
  });

  /* ========== 1) لقطات ثابتة لمراحل المحادثة ========== */
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });
  await page.goto(BASE + "?instant=1", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "?instant=1", { waitUntil: "networkidle0" });
  await sleep(1200);

  async function type(text) {
    await page.click("#input");
    await page.type("#input", text, { delay: 5 });
    await page.click("#send");
    await page.waitForFunction("window.__busy === false", { timeout: 20000 });
    await sleep(250);
  }
  async function shot(name) {
    await page.screenshot({ path: path.join(__dirname, "shots", name) });
    console.log("shot:", name);
  }

  await shot("01-greeting.png");

  await type("عندكم تيشيرتات قطن؟");
  await shot("02-product.png");

  await type("خامته ايه وبكام؟");
  await type("عايز أطلب واحد");
  await shot("03-order-start.png");

  for (const m of ["L", "أسود", "2", "محمد أحمد", "01011223344", "القاهرة", "15 شارع التحرير، الدقي، الدور التالت", "كاش عند الاستلام"]) await type(m);
  await shot("04-order-summary.png");

  await type("✅ تأكيد الطلب");
  await shot("05-order-confirmed.png");

  await type("فين طلبي؟");
  await type("1037");
  await type("سياسة الاسترجاع ايه؟");
  await shot("06-status-returns.png");

  await type("طيب عندكم خصم للشركات؟ محتاج 200 موظف");
  await shot("07-escalation.png");

  // لقطة طويلة للمحادثة كاملة
  await page.setViewport({ width: 430, height: 4200, deviceScaleFactor: 1.6 });
  await sleep(600);
  await page.evaluate(() => { document.getElementById("chat").scrollTop = 0; });
  await sleep(300);
  await page.screenshot({ path: path.join(__dirname, "shots", "08-full-conversation.png") });
  console.log("shot: 08-full-conversation.png");
  await page.close();

  /* ========== 2) فريمات الفيديو (ديمو تلقائي بسرعة طبيعية) ========== */
  const vpage = await browser.newPage();
  await vpage.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });
  await vpage.goto(BASE, { waitUntil: "networkidle0" });
  await vpage.evaluate(() => localStorage.clear());
  await vpage.goto(BASE + "?demo=1", { waitUntil: "networkidle0" });
  await sleep(1000);

  const framesDir = path.join(__dirname, "frames");
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  let i = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 140000) {
    const done = await vpage.evaluate(() => !!window.__demoDone);
    await vpage.screenshot({ path: path.join(framesDir, "f" + String(i).padStart(4, "0") + ".png") });
    i++;
    if (done) {
      // كم فريم بعد نهاية المحادثة
      for (let k = 0; k < 5; k++) {
        await sleep(700);
        await vpage.screenshot({ path: path.join(framesDir, "f" + String(i).padStart(4, "0") + ".png") });
        i++;
      }
      break;
    }
    await sleep(420);
  }
  console.log("frames captured:", i);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
