// Page behaviour: header state, mobile menu, VIN instrument, tabs, terms (tabs on wide screens, accordion on phones), FutureLink tap.
// Everything is progressive: without JS the content is visible and links work.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Header: sign field at the top, paper once the page scrolls */
const header = document.querySelector<HTMLElement>("[data-header]");
if (header) {
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* Mobile menu (<details>): close after choosing a link, on Escape and on outside click */
const menu = document.querySelector<HTMLDetailsElement>("[data-menu]");
if (menu) {
  menu.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(".menu__panel a");
    if (!link) return;
    const hash = link.getAttribute("href") || "";
    const target = hash.startsWith("#") ? document.getElementById(hash.slice(1)) : null;
    menu.open = false;
    if (!target) return;
    // closing the panel changes layout; scroll after it, otherwise the jump is lost on phones
    e.preventDefault();
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      if (location.hash !== hash) history.pushState(null, "", hash);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.open) {
      menu.open = false;
      menu.querySelector("summary")?.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (menu.open && !menu.contains(e.target as Node)) menu.open = false;
  });
}

function animateIn(el: HTMLElement) {
  if (reduceMotion) return;
  el.classList.remove("is-entering");
  void el.offsetWidth;
  el.classList.add("is-entering");
  el.addEventListener("animationend", () => el.classList.remove("is-entering"), { once: true });
}

/* Generic tablist: arrow keys, Home/End, roving tabindex */
function setupTabs(list: HTMLElement, onSelect: (tab: HTMLButtonElement) => void) {
  const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => onSelect(tab));
    tab.addEventListener("keydown", (e) => {
      let j = -1;
      if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = tabs.length - 1;
      if (j < 0) return;
      e.preventDefault();
      tabs[j]!.focus();
      onSelect(tabs[j]!);
    });
  });
  return tabs;
}

/* Hero tool: За VIN / За авто */
const tool = document.querySelector<HTMLElement>("[data-tool]");
if (tool) {
  const list = tool.querySelector<HTMLElement>('[role="tablist"]')!;
  const select = (tab: HTMLButtonElement) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls")!)!;
      const wasHidden = panel.hidden;
      panel.hidden = !on;
      if (on && wasHidden) animateIn(panel);
    });
  };
  const tabs = setupTabs(list, select);
  tabs.forEach((t) => {
    const panel = document.getElementById(t.getAttribute("aria-controls")!)!;
    panel.hidden = t.getAttribute("aria-selected") !== "true";
    panel.tabIndex = 0;
  });
}

/* VIN instrument (effect 1: ruler fills as you type) */
const vin = document.querySelector<HTMLElement>("[data-vin]");
if (vin) {
  const input = vin.querySelector<HTMLInputElement>("input")!;
  const cells = Array.from(vin.querySelectorAll<HTMLElement>("[data-ruler] li"));
  const groups = Array.from(vin.querySelectorAll<HTMLElement>("[data-group]"));
  const msg = vin.querySelector<HTMLElement>("[data-vin-msg]")!;
  const send = vin.querySelector<HTMLAnchorElement>("[data-vin-send]")!;
  const HINT = msg.textContent ?? "";
  const ranges: [number, number][] = [[0, 3], [3, 9], [9, 17]];

  const setMsg = (text: string, state: "" | "is-error" | "is-ok") => {
    msg.textContent = text;
    msg.classList.remove("is-error", "is-ok");
    if (state) msg.classList.add(state);
    input.setAttribute("aria-invalid", state === "is-error" ? "true" : "false");
  };

  const forbidden = (v: string) => /[IOQ]/.test(v);
  const isVin = (v: string) => /^[A-HJ-NPR-Z0-9]{17}$/.test(v);

  const render = () => {
    const clean = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17);
    if (clean !== input.value) {
      const pos = input.selectionStart ?? clean.length;
      input.value = clean;
      input.setSelectionRange(Math.min(pos, clean.length), Math.min(pos, clean.length));
    }
    const n = clean.length;
    cells.forEach((c, i) => {
      c.classList.toggle("is-filled", i < n);
      c.classList.toggle("is-next", i === n && n < 17 && document.activeElement === input);
    });
    groups.forEach((g, i) => g.classList.toggle("is-complete", n >= ranges[i]![1]));
    if (n === 0) setMsg(HINT, "");
    else if (forbidden(clean)) setMsg("Літер I, O, Q у VIN не буває: перевірте, можливо, це цифри 1 і 0.", "is-error");
    else if (n < 17) setMsg(`Введено ${n} з 17 знаків.`, "");
    else setMsg("VIN повний. Натисніть кнопку: ми скопіюємо його, і ви вставите VIN у чат менеджеру.", "is-ok");
  };

  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("blur", render);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); send.click(); }
  });

  send.addEventListener("click", (e) => {
    const v = input.value;
    if (!v) return; // empty field: simply open the bot
    if (!isVin(v)) {
      e.preventDefault();
      setMsg("VIN має 17 символів, без літер I, O, Q. Перевірте код або залиште поле порожнім, щоб просто відкрити чат.", "is-error");
      input.focus();
      return;
    }
    const done = () => setMsg("VIN скопійовано, вставте його в чат менеджеру.", "is-ok");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(v).then(done, () => setMsg(`Скопіюйте VIN вручну: ${v}`, "is-ok"));
    } else {
      input.select();
      try { document.execCommand("copy"); done(); } catch { setMsg(`Скопіюйте VIN вручну: ${v}`, "is-ok"); }
    }
  });
  render();
}

/* Terms: tabs from 900px, accordion below; "Оплата" open by default */
const terms = document.querySelector<HTMLElement>("[data-terms]");
if (terms) {
  const wide = window.matchMedia("(min-width: 900px)");
  const panels = Array.from(terms.querySelectorAll<HTMLElement>("[data-panel]"));
  const list = terms.querySelector<HTMLElement>('[role="tablist"]')!;
  let active = "oplata";

  // turn each panel title into an accordion button
  const toggles = panels.map((p) => {
    const host = p.querySelector<HTMLElement>("[data-toggle-host]")!;
    const body = p.querySelector<HTMLElement>("[data-body]")!;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = host.textContent;
    btn.setAttribute("aria-controls", body.id);
    host.textContent = "";
    host.append(btn);
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      body.hidden = !open;
      if (open) animateIn(body);
    });
    return { panel: p, body, btn };
  });

  const tabs = setupTabs(list, (tab) => { active = tab.getAttribute("aria-controls")!; apply(true); });

  function apply(animate = false) {
    if (wide.matches) {
      tabs.forEach((t) => {
        const on = t.getAttribute("aria-controls") === active;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      toggles.forEach(({ panel, body }) => {
        const on = panel.id === active;
        const wasHidden = panel.hidden;
        panel.hidden = !on;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", `tab-${panel.id}`);
        body.hidden = false;
        if (on && wasHidden && animate) animateIn(body);
      });
    } else {
      toggles.forEach(({ panel, body, btn }) => {
        panel.hidden = false;
        panel.removeAttribute("role");
        panel.setAttribute("aria-labelledby", `h-${panel.id}`);
        const open = panel.id === active;
        btn.setAttribute("aria-expanded", String(open));
        body.hidden = !open;
      });
    }
  }
  wide.addEventListener("change", () => apply());

  // anchors (#dostavka, #oplata, #povernennia) open their panel
  const openFromHash = (hash: string) => {
    const id = hash.replace("#", "");
    if (!panels.some((p) => p.id === id)) return false;
    active = id;
    apply(true);
    return true;
  };
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (a) openFromHash(a.getAttribute("href")!);
  });
  window.addEventListener("hashchange", () => openFromHash(location.hash));
  if (!openFromHash(location.hash)) apply();
}

/* FutureLink: on touch the note appears on tap and hides after a moment */
document.querySelectorAll<HTMLElement>(".future-link").forEach((el) => {
  let t = 0;
  el.addEventListener("click", () => {
    el.classList.add("is-tapped");
    window.clearTimeout(t);
    t = window.setTimeout(() => el.classList.remove("is-tapped"), 1800);
  });
});

export {};
