// E2E checks of the demo homepage (Playwright from ~/.veon/tools, no project dependency).
// Usage: node tests/e2e/home.e2e.mjs [url]   (default http://localhost:4321/)
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

const require = createRequire(join(homedir(), ".veon", "tools", "package.json"));
const { chromium } = require("playwright");
const envPath = join(homedir(), ".veon", "env.json");
const env = existsSync(envPath) ? JSON.parse(readFileSync(envPath, "utf8")) : {};
const URL = process.argv[2] || "http://localhost:4321/";

const H1 = "Автозапчастини за VIN у Києві та по Україні";
const SECTIONS = ["pidbir", "marky", "katalog", "umovy", "pro-nas", "kontakty"];
const ALLOWED = [/^tel:/, /^mailto:/, /^https:\/\/t\.me\/autokladuabot$/, /^https:\/\/www\.facebook\.com\/autoklad\.ua\/$/, /^https:\/\/www\.instagram\.com\/autoklad\.ua\/$/, /^https:\/\/www\.google\.com\/maps\/search\//];

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) failed++; };

const browser = await chromium.launch(env.chrome_path ? { executablePath: env.chrome_path } : {});
try {
  // 1. Structure and links
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(URL, { waitUntil: "networkidle" });
    ok((await page.locator("h1").count()) === 1, "one H1");
    ok((await page.locator("h1").innerText()).trim() === H1, "H1 text is exact");
    ok(await page.evaluate(() => document.documentElement.lang === "uk"), 'html lang="uk"');
    ok((await page.locator('meta[name="robots"][content*="noindex"]').count()) === 1, "noindex present");
    const ids = await page.$$eval("main > section[id]", (els) => els.map((e) => e.id));
    ok(JSON.stringify(ids) === JSON.stringify(SECTIONS), `section order ${ids.join(", ")}`);
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    const bad = hrefs.filter((h) => !(h.startsWith("#") && h.length > 1) && !ALLOWED.some((r) => r.test(h)));
    ok(bad.length === 0, `only anchors and allowed external links${bad.length ? ": " + bad.join(" ") : ""}`);
    ok(!hrefs.some((h) => /autoklad\.ua(?!\/?$)|\/\/(www\.)?autoklad\.ua/.test(h) && !h.startsWith("mailto:")), "no links to autoklad.ua");
    const anchors = hrefs.filter((h) => h.startsWith("#"));
    const missing = [];
    for (const a of anchors) if ((await page.locator(a).count()) === 0) missing.push(a);
    ok(missing.length === 0, `all anchors resolve${missing.length ? ": " + missing.join(" ") : ""}`);
    ok((await page.locator('.future-link[aria-disabled="true"]').count()) >= 40, "FutureLinks are aria-disabled");
    ok((await page.locator("[data-rec]").count()) >= 6, "data-rec marks present");
    ok((await page.locator("form").count()) === 0, "no forms (no fake submit)");

    // VIN instrument
    const input = page.locator("#vin-input");
    await input.fill("wvwzzz1kz6w0");
    ok((await page.locator("[data-ruler] li.is-filled").count()) === 12, "ruler fills with typed characters");
    ok((await page.locator('[data-group="0"].is-complete').count()) === 1, "first bracket completes after 3");
    await input.fill("WVWZZZ1KZ6W00000O");
    ok((await input.getAttribute("aria-invalid")) === "true", "letter O flagged as invalid");
    await page.locator("[data-vin-send]").click();
    ok(page.context().pages().length === 1, "invalid VIN does not open Telegram");
    await input.fill("WVWZZZ1KZ6W000001");
    ok((await page.locator("[data-ruler] li.is-filled").count()) === 17, "full VIN fills 17 positions");
    ok((await page.locator("[data-vin-msg].is-ok").count()) === 1, "full VIN accepted");

    // hero tabs
    await page.locator("#tab-auto").click();
    ok(await page.locator("#panel-auto").isVisible(), "tab «За авто» shows its panel");
    ok(!(await page.locator("#panel-vin").isVisible()), "VIN panel hidden while «За авто» active");
    await page.locator("#tab-vin").click();

    // terms tabs (desktop)
    ok(await page.locator("#oplata").isVisible(), "terms: «Оплата» open by default");
    await page.locator('a[href="#povernennia"]').first().click();
    await page.waitForTimeout(400);
    ok(await page.locator("#povernennia").isVisible(), "menu «Гарантія» opens the warranty panel");
    ok(errors.length === 0, `no script errors${errors.length ? ": " + errors.join("; ") : ""}`);
    await page.close();
  }

  // 2. Widths: no horizontal scroll, key elements inside the viewport
  for (const w of [320, 375, 390, 768, 1024, 1280, 1440]) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 768 ? 700 : 900 } });
    await page.goto(URL, { waitUntil: "networkidle" });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 0, `${w}px: no horizontal scroll (${over})`);
    const outside = await page.evaluate(() => {
      const vw = window.innerWidth;
      return [...document.querySelectorAll("a, button, input, select, h1, h2, .future-link")]
        .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden")
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > vw + 1); })
        .filter((el) => !el.closest("details:not([open])") && !el.closest(".skip-link") && !el.classList.contains("skip-link"))
        .map((el) => (el.textContent || el.id || el.tagName).trim().slice(0, 30));
    });
    ok(outside.length === 0, `${w}px: interactive elements inside the screen${outside.length ? ": " + outside.join(" | ") : ""}`);
    if (w <= 390) {
      const send = await page.locator("[data-vin-send]").boundingBox();
      const bar = await page.locator(".mobile-bar").boundingBox();
      ok(send && bar && send.y + send.height <= bar.y, `${w}x700: main VIN button visible above the bottom bar on the first screen`);
      await page.locator(".menu > summary").click();
      ok(await page.locator(".menu__panel").isVisible(), `${w}px: burger opens the menu`);
      await page.locator('.menu__list a[href="#kontakty"]').click();
      ok(!(await page.locator(".menu").evaluate((d) => d.open)), `${w}px: menu closes after choosing a link`);
      await page.waitForTimeout(1200);
      const kTop = await page.locator("#kontakty").evaluate((el) => el.getBoundingClientRect().top);
      ok(kTop >= -5 && kTop < 200, `${w}px: menu link scrolls to «Контакти» (top ${Math.round(kTop)})`);
      await page.evaluate(() => window.scrollTo(0, 0));
      // accordion
      ok(await page.locator("#body-oplata").isVisible(), `${w}px: accordion «Оплата» open by default`);
      ok(!(await page.locator("#body-dostavka").isVisible()), `${w}px: other accordion items closed`);
    }
    await page.close();
  }

  // 3. Reduced motion: nothing animates, content in place
  {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    const anim = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getComputedTiming().duration ?? 0) > 50).length);
    ok(anim === 0, `reduced motion: no running animations (${anim})`);
    const fig = await page.locator("#oplata .terms__figure").evaluate((e) => getComputedStyle(e).opacity);
    ok(fig === "1", "reduced motion: terms figure visible without scroll reveal");
    await ctx.close();
  }

  // 4. Scripting off: content visible
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    ok(await page.locator("#body-dostavka").isVisible() && await page.locator("#body-povernennia").isVisible(), "no JS: all terms visible");
    ok(await page.locator("#panel-auto").isVisible(), "no JS: «За авто» panel visible");
    ok(await page.locator("#oplata .terms__figure").evaluate((e) => getComputedStyle(e).opacity === "1"), "no JS: figures visible");
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `RESULT: FAIL (${failed})` : "RESULT: PASS");
process.exit(failed ? 1 : 0);
