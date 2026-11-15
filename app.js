// The people's client for task 8.75: fixed sets of 20 items, forms rotated by player number, a 20 s clock,
// answers kept in the browser and sent to the answer store as they are given; stop and resume between items.
(() => {
  "use strict";
  const C = window.SURVEY_CONFIG;
  const app = document.getElementById("app");
  const where = document.getElementById("where");
  const FORMS = ["a", "b", "one"];
  const MARK = { "@": "you", W: "the warden", M: "a mob", a: "the caller", V: "a vein" };
  let DATA = null, st = null, P = null, timer = null;

  // ---------- helpers ----------
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "on") for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn);
      else if (k === "html") e.innerHTML = v;
      else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  };
  const show = (...nodes) => { clearInterval(timer); app.replaceChildren(...nodes.flat().filter((n) => n != null)); window.scrollTo(0, 0); };
  const now = () => new Date().toISOString();
  function rng(seed) {                       // mulberry32
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffled(xs, seed) {
    const r = rng(seed), out = xs.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }

  // ---------- state ----------
  const KEY = () => `s875:${P}`;
  const blank = () => ({ p: P, v: C.VERSION, consent: null, gaming: null, briefed: false, recs: {}, shown: {},
                         surveys: {}, outbox: [] });
  const save = () => localStorage.setItem(KEY(), JSON.stringify(st));
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY())); } catch { return null; } };
  const rkey = (s, id) => `${s}:${id}`;   // s 0 is practice

  // A session's items: set s's places, each with its form; shown in an order drawn from the player and the session.
  function session(s) {
    const set = DATA.sets[s - 1];
    const places = set.map((id, j) => ({ id, j, form: FORMS[(j + P) % 3] }));
    return shuffled(places, 875000 + P * 100 + s);
  }
  const practice = () => [{ id: "p1", j: 0, form: "a" }, { id: "p2", j: 1, form: "one" }];
  const itemOf = (id) => typeof id === "string" ? DATA.practice.find((x) => x.id === id) : DATA.items[id];

  // ---------- the answer store ----------
  function send(rec) {
    st.outbox.push(rec); save(); flush();
  }
  let flushing = false;
  async function flush() {
    if (!C.STORE_URL || flushing) return;
    flushing = true;
    try {
      while (st.outbox.length) {
        const rec = st.outbox[0];
        const r = await fetch(`${C.STORE_URL}?a=put&d=${encodeURIComponent(JSON.stringify(rec))}`);
        const j = await r.json();
        if (!j.ok) break;
        st.outbox.shift(); save();
      }
    } catch (e) { /* kept in the outbox; tried again later */ }
    flushing = false;
    const s = document.getElementById("sync");
    if (s) s.textContent = st.outbox.length ? `${st.outbox.length} answer(s) kept in this browser, to be sent.` : "All answers saved.";
  }
  async function fromStore() {           // another device: rebuild what was answered on this link
    if (!C.STORE_URL) return null;
    try {
      const r = await fetch(`${C.STORE_URL}?a=get&p=${P}`);
      const j = await r.json();
      return j.ok ? j : null;
    } catch { return null; }
  }

  // An item shown and left unanswered (closed or reloaded on the clock) is a TIMEOUT, marked left.
  function settleLeft() {
    for (const [k, at] of Object.entries(st.shown)) {
      if (st.recs[k]) continue;
      const [s, id] = k.split(":");
      const sid = s === "0" ? id : Number(id);
      const pl = (s === "0" ? practice() : session(Number(s))).find((x) => x.id === sid);
      const it = itemOf(sid);
      record({ s: Number(s), pl, it, answer: "timeout", text: "", ms: null, shownAt: at, left: true, partial: "" });
    }
  }

  function record({ s, pl, it, answer, text, ms, shownAt, left, partial }) {
    const order = s === 0 ? practice() : session(s);
    const rec = { type: "answer", v: C.VERSION, p: P, s, practice: s === 0, item: pl.id, kind: it.kind, form: pl.form,
                  place: pl.j, slot: order.findIndex((x) => x.id === pl.id) + 1, labels: it.forms[pl.form].labels,
                  answer, text, ms, shown_at: shownAt, answered_at: now(), left: !!left, partial: partial || "" };
    st.recs[rkey(s, pl.id)] = rec;
    send(rec);
  }

  // ---------- screens ----------
  function route() {
    if (!st.consent) return consent();
    if (!st.briefed) return briefing();
    for (const pl of practice()) if (!st.recs[rkey(0, pl.id)]) return between(0, pl);
    for (let s = 1; s <= DATA.sets.length; s++) {
      const order = session(s);
      const next = order.find((pl) => !st.recs[rkey(s, pl.id)]);
      if (next) return between(s, next);
      if (!st.surveys[s]) return survey(s);
      if (!st.surveys[s].next) return sessionDone(s);
    }
    return allDone();
  }

  function consent() {
    where.textContent = "";
    const box = h("input", { type: "checkbox", id: "ok" });
    const games = ["None", "Under 2 hours", "2 to 10 hours", "Over 10 hours"];
    const go = h("button", { disabled: true, on: { click: () => {
      const g = app.querySelector("input[name=g]:checked").value;
      st.consent = { at: now() }; st.gaming = g; save();
      send({ type: "player", v: C.VERSION, p: P, consent_at: st.consent.at, gaming: g });
      route();
    } } }, "Continue");
    const check = () => { go.disabled = !(box.checked && app.querySelector("input[name=g]:checked")); };
    box.addEventListener("change", check);
    show(
      h("h1", {}, "A decisions game"),
      h("p", {}, "You'll be shown short situations from a strategy game and asked what you would do, with 20 seconds for each. A session is 20 situations, about 10 minutes. You can play as many sessions as you like, and stop and come back at any time with the same link."),
      h("p", {}, h("b", {}, "Please play on a computer with a keyboard."), " Some answers are typed against the clock, which is too slow on a phone."),
      window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches
        ? h("p", { style: "color:#b3261e" }, h("b", {}, "This looks like a phone or tablet. Please open your link on a computer instead.")) : null,
      h("p", {}, "Your answers are stored without your name or any way to identify you. They will be kept and may be published, still without your name, as part of research on how decisions are made in games. You can stop at any time."),
      h("h2", {}, "How many hours a week do you play video games?"),
      games.map((g) => h("label", {}, h("input", { type: "radio", name: "g", value: g, on: { change: check } }), " ", g)),
      h("label", { style: "margin-top:1rem" }, box, " I agree to take part, and to my answers being kept and published without my name."),
      h("div", { class: "row" }, go));
  }

  function briefing() {
    where.textContent = "The rules";
    show(h("h1", {}, "How the game works"), h("div", { html: window.BRIEFING }),
      h("p", { class: "note" }, "You can read this again at any time from the Rules link at the top. Next come two practice situations that don't count."),
      h("div", { class: "row" }, h("button", { on: { click: () => { st.briefed = true; save(); route(); } } }, "Start the practice")));
  }

  function between(s, pl) {
    const order = s === 0 ? practice() : session(s);
    const k = order.findIndex((x) => x.id === pl.id) + 1;
    where.textContent = s === 0 ? `Practice ${k} of 2` : `Session ${s} · situation ${k} of ${order.length}`;
    const first = k === 1;
    const msg = s === 0 ? (first ? "Practice: this one doesn't count. The clock starts when you press the button." : "One more practice situation.")
      : first ? `Session ${s}: ${order.length} situations. The 20-second clock starts when each one is shown; between them you can take your time, or stop and come back later.`
      : "Your answer is saved. Ready for the next one?";
    show(h("p", {}, msg), h("div", { class: "row" },
      h("button", { on: { click: () => item(s, pl) } }, first && s > 0 ? "Start" : "Show the next situation")),
      s > 0 && !first ? h("p", { class: "note" }, "To stop, just close this page; your link brings you back here.") : null,
      h("p", { class: "note", id: "sync" }, ""));
    flush();
  }

  function mapTable(m) {
    if (!m) return null;
    const used = new Set(Object.values(m.marks).join("").split(""));
    const t = h("table", { class: "map" }, h("tr", {}, h("th"), m.cols.map((c) => h("th", {}, c))),
      m.rows.map((r) => h("tr", {}, h("th", {}, r), m.cols.map((c) => {
        const mk = m.marks[c + r]; return h("td", { class: mk ? "on" : false }, mk || "");
      }))));
    const legend = h("div", { class: "legend" }, [...used].map((k) => `${k} ${MARK[k]}`).join(" · "));
    return h("div", {}, t, legend);
  }

  function item(s, pl) {
    const it = itemOf(pl.id), f = it.forms[pl.form];
    const k = rkey(s, pl.id), shownAt = now();
    st.shown[k] = shownAt; save();
    const t0 = performance.now();
    let done = false;
    const own = h("input", { type: "text", id: "own", autocomplete: "off", placeholder: pl.form === "one" ? "Say what you do, in a sentence" : "One action line, e.g. MOVE N" });
    const finish = (answer, text) => {
      if (done) return; done = true; clearInterval(timer);
      const ms = Math.round(performance.now() - t0);
      record({ s, pl, it, answer, text, ms, shownAt, left: false, partial: answer === "timeout" ? own.value : "" });
      document.removeEventListener("keydown", keys);
      route();
    };
    const submitOwn = () => { const v = own.value.trim(); if (v) finish(pl.form === "one" ? "open" : "own", v); };
    own.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submitOwn(); } });
    const ownBox = h("div", { hidden: pl.form !== "one" }, own, h("div", { class: "row" }, h("button", { on: { click: submitOwn } }, "Answer")));
    let choices = null;
    if (pl.form !== "one") {
      choices = h("div", { class: "row" }, f.labels.map((lab, i) => {
        const n = i + 1, last = n === f.labels.length;
        return h("button", { class: last ? "alt" : false, on: { click: () => last ? (ownBox.hidden = false, own.focus()) : finish("choice", String(n)) } }, `${n} ${lab}`);
      }));
    }
    function keys(e) {
      if (pl.form === "one" || document.activeElement === own) return;
      const n = Number(e.key);
      if (n >= 1 && n < f.labels.length) finish("choice", String(n));
      else if (n === f.labels.length) { ownBox.hidden = false; own.focus(); e.preventDefault(); }
    }
    document.addEventListener("keydown", keys);
    const bar = h("div"), clock = h("div", { class: "clock" }, bar), secs = h("div", { class: "secs" });
    show(clock, secs,
      h("div", { class: "pane" }, h("div", { class: "desc" }, f.desc.map((d) => h("p", {}, d))), mapTable(f.map)),
      h("div", { class: "q" }, f.text), choices, ownBox);
    if (pl.form === "one") own.focus();
    const tick = () => {
      const left = C.CLOCK_S * 1000 - (performance.now() - t0);
      bar.style.width = `${Math.max(0, left) / (C.CLOCK_S * 10)}%`;
      clock.classList.toggle("low", left < 5000);
      secs.textContent = `${Math.max(0, Math.ceil(left / 1000))} s`;
      if (left <= 0) finish("timeout", "");
    };
    tick(); timer = setInterval(tick, 100);
  }

  function survey(s) {
    where.textContent = `Session ${s} done`;
    const q = (name, prompt, opts) => h("div", {}, h("h2", {}, prompt),
      opts.map((o) => h("label", {}, h("input", { type: "radio", name, value: o }), " ", o)));
    const note = h("textarea", { rows: 3 });
    show(h("h1", {}, `Session ${s} done. Thank you!`), h("p", {}, "Three quick questions about it (you can skip them):"),
      q("enjoy", "How much did you enjoy it?", ["1 not at all", "2", "3", "4", "5 a lot"]),
      q("clock", "The 20-second clock was…", ["too short", "about right", "too long"]),
      q("text", "The situations were…", ["clear", "mostly clear", "hard to follow"]),
      h("h2", {}, "Anything else? (optional)"), note,
      h("div", { class: "row" }, h("button", { on: { click: () => {
        const v = (n) => (app.querySelector(`input[name=${n}]:checked`) || {}).value || "";
        st.surveys[s] = { at: now() }; save();
        send({ type: "survey", v: C.VERSION, p: P, s, enjoy: v("enjoy"), clock: v("clock"), text: v("text"), note: note.value.trim() });
        route();
      } } }, "Send")));
  }

  function sessionDone(s) {
    where.textContent = `Session ${s} done`;
    const more = s < DATA.sets.length;
    show(h("h1", {}, "Thanks, that's a session."),
      h("p", {}, more ? "You can play another now, or come back any time with the same link." : "That was the last session. Thank you!"),
      h("div", { class: "row" }, more ? h("button", { on: { click: () => { st.surveys[s].next = true; save(); route(); } } }, `Start session ${s + 1}`) : null,
        h("button", { class: "alt", on: { click: download } }, "Download my answers")),
      h("p", { class: "note", id: "sync" }, ""));
    flush();
  }

  function allDone() {
    where.textContent = "All done";
    show(h("h1", {}, "You've played every session. Thank you!"),
      h("div", { class: "row" }, h("button", { class: "alt", on: { click: download } }, "Download my answers")),
      h("p", { class: "note", id: "sync" }, ""));
    flush();
  }

  function download() {
    const blob = new Blob([JSON.stringify({ p: P, v: C.VERSION, gaming: st.gaming, consent: st.consent,
      answers: Object.values(st.recs), surveys: st.surveys }, null, 1)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `answers_${P}.json` });
    document.body.append(a); a.click(); a.remove();
  }

  // ---------- start ----------
  async function start() {
    const p = new URLSearchParams(location.search).get("p");
    if (!p || !/^\d{1,4}$/.test(p)) { show(h("p", {}, "This page needs your personal link. Please use the link you were sent.")); return; }
    P = Number(p);
    DATA = await (await fetch("items.json")).json();
    st = load();
    if (!st) {
      st = blank();
      const r = await fromStore();
      if (r) {
        if (r.player) { st.consent = { at: r.player.consent_at }; st.gaming = r.player.gaming; st.briefed = true; }
        for (const a of r.answers || []) st.recs[rkey(a.s, a.s === 0 ? a.item : Number(a.item))] = a;
        for (const s of r.surveys || []) st.surveys[s] = { at: "", next: true };
      }
      save();
    }
    settleLeft();
    const bl = document.getElementById("brief-link"), dlg = document.getElementById("brief-dialog");
    document.getElementById("brief-text").innerHTML = window.BRIEFING;
    bl.hidden = false;
    bl.addEventListener("click", (e) => { e.preventDefault(); dlg.showModal(); });
    document.getElementById("brief-close").addEventListener("click", () => dlg.close());
    route();
  }
  start();
})();
