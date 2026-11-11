/* HealthTrack core: API client, helpers, validation, toasts, app shell. No frameworks. */
(function () {
  "use strict";
  const API = (window.HT_CONFIG && window.HT_CONFIG.API_BASE) || "http://localhost:5000";
  const HT = (window.HT = {});
  const pad = (n) => String(n).padStart(2, "0");
  const never = () => new Promise(() => {}); // used while the browser is navigating away

  /* ---------- dates & formatting (all "date" values are local YYYY-MM-DD) ---------- */
  HT.dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  HT.today = () => HT.dateStr(new Date());
  HT.parseDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  HT.addDays = (s, n) => { const d = HT.parseDate(s); d.setDate(d.getDate() + n); return HT.dateStr(d); };
  HT.dayRange = (days) => Array.from({ length: days }, (_, i) => HT.addDays(HT.today(), i - (days - 1)));
  HT.fmtDate = (s) => HT.parseDate(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  HT.fmtShort = (s) => HT.parseDate(s).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  HT.fmtDateTime = (iso) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  HT.fmtClock = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
  HT.num = (n) => (n === null || n === undefined || Number.isNaN(n) ? "—" : nf.format(n));
  HT.dur = (mins) => {
    if (mins === null || mins === undefined) return "—";
    mins = Math.round(mins);
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? `${h}h ${pad(m)}m` : `${m}m`;
  };
  HT.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  HT.cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "");
  HT.sum = (arr, f) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);
  // datetime-local <-> ISO with the browser's UTC offset (the API requires an explicit offset)
  HT.localToOffsetISO = (v) => {
    const off = -new Date(v).getTimezoneOffset(), a = Math.abs(off);
    return `${v}:00${off >= 0 ? "+" : "-"}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
  };
  HT.isoToLocalInput = (iso) => { const d = new Date(iso); return `${HT.dateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  HT.GOALS = {
    weight_loss: { label: "Lose weight", unit: "kg" },
    weight_gain: { label: "Gain weight", unit: "kg" },
    daily_steps: { label: "Daily steps", unit: "steps" },
    daily_water: { label: "Daily water", unit: "ml" },
    weekly_workouts: { label: "Weekly workouts", unit: "workouts" },
  };

  /* ---------- API client: fetch + cookie auth. Tokens are never read or stored by JS. ---------- */
  HT.api = async (path, { method = "GET", body, query, noRedirect } = {}) => {
    let url = API + path;
    if (query) {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.set(k, v); });
      if (qs.toString()) url += "?" + qs;
    }
    let res;
    try {
      res = await fetch(url, {
        method, credentials: "include",
        headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw Object.assign(new Error("Can't reach the server. Check your connection and that the backend is running."), { status: 0, errors: [] });
    }
    let json = null;
    try { json = await res.json(); } catch (e) { /* non-JSON body */ }
    if (!res.ok) {
      const err = Object.assign(new Error((json && json.message) || `Request failed (${res.status})`), { status: res.status, errors: (json && json.errors) || [] });
      if (res.status === 401 && !noRedirect) { err.silent = true; location.replace("login.html"); }
      throw err;
    }
    return json;
  };
  // Loads every page of a list endpoint (the API caps a page at 100 items).
  HT.fetchAll = async (path, query = {}) => {
    const items = [];
    for (let page = 1; ; page++) {
      const r = await HT.api(path, { query: { ...query, page, limit: 100 } });
      items.push(...r.data.items);
      if (page >= r.data.pagination.totalPages) break;
    }
    return items;
  };
  HT.serverErrors = (err) => {
    const out = {};
    (err.errors || []).forEach((e) => { if (e.field && !out[e.field]) out[e.field] = e.message; });
    return out;
  };

  /* ---------- UI helpers ---------- */
  HT.toast = (msg, type = "success") => {
    let box = document.getElementById("toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast " + type;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), type === "error" ? 6000 : 3500);
  };
  HT.confirm = ({ title, message, confirmText = "Delete", danger = true }) =>
    new Promise((resolve) => {
      const dlg = document.createElement("dialog");
      dlg.className = "dialog";
      dlg.innerHTML = `<h3>${HT.esc(title)}</h3><p>${HT.esc(message)}</p><div class="actions"><button class="btn ghost" data-r="0">Cancel</button><button class="btn ${danger ? "danger" : "primary"}" data-r="1">${HT.esc(confirmText)}</button></div>`;
      document.body.appendChild(dlg);
      dlg.addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (b) dlg.close(b.dataset.r); });
      dlg.addEventListener("close", () => { resolve(dlg.returnValue === "1"); dlg.remove(); });
      dlg.showModal();
    });
  HT.busy = (btn, on, text) => {
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.classList.add("loading"); if (text) btn.textContent = text; }
    else { btn.disabled = false; btn.classList.remove("loading"); if (btn.dataset.label !== undefined) btn.innerHTML = btn.dataset.label; }
  };

  /* ---------- form validation (shared by every form) ---------- */
  HT.clearErrors = (root) => {
    root.querySelectorAll(".has-error").forEach((e) => e.classList.remove("has-error"));
    root.querySelectorAll(".field-error").forEach((e) => (e.textContent = ""));
    HT.banner(root, "");
  };
  HT.banner = (root, msg) => { const b = root.querySelector(".form-error"); if (b) { b.textContent = msg; b.hidden = !msg; } };
  // Shows {fieldName: message}. Unknown keys fall back to the closest parent field; returns messages with no home.
  HT.showErrors = (root, errors) => {
    const leftover = [];
    Object.entries(errors).forEach(([key, msg]) => {
      let k = key, el = null;
      while (k) {
        el = root.querySelector(`[data-field="${k}"]`);
        if (el) break;
        k = k.includes(".") ? k.slice(0, k.lastIndexOf(".")) : "";
      }
      if (!el) return leftover.push(msg);
      el.classList.add("has-error");
      const fe = el.querySelector(".field-error");
      if (fe && !fe.textContent) fe.textContent = msg;
    });
    const first = root.querySelector(".has-error input, .has-error select");
    if (first) first.focus();
    return leftover;
  };
  // Handles an API error for a form: field messages inline, everything else in the banner.
  HT.formError = (root, err, fallback) => {
    if (err.silent) return;
    const fields = HT.serverErrors(err);
    const left = HT.showErrors(root, fields);
    const msg = Object.keys(fields).length ? left[0] || "Please fix the highlighted fields." : err.message || fallback || "Something went wrong.";
    HT.banner(root, msg);
  };
  /* Spec-driven validation. spec: {name,label,type,required,min,max,int,nullable,maxToday,options,showIf}
     Returns {errors, values}. Empty optional values become undefined, or null when editing a nullable field. */
  HT.check = (specs, raw, mode = "create") => {
    const errors = {}, values = {};
    specs.forEach((s) => {
      if (s.showIf && !s.showIf(raw)) return;
      let v = raw[s.name];
      v = typeof v === "string" ? v.trim() : v;
      const label = s.short || s.label;
      if (v === "" || v === undefined || v === null) {
        if (s.required) errors[s.name] = s.type === "select" ? `Choose ${label.toLowerCase()}` : `${label} is required`;
        else values[s.name] = s.nullable && mode === "edit" ? null : undefined;
        return;
      }
      if (s.type === "number") {
        const n = Number(v);
        if (!Number.isFinite(n)) errors[s.name] = "Enter a valid number";
        else if (s.int && !Number.isInteger(n)) errors[s.name] = "Use a whole number";
        else if (s.min !== undefined && n < s.min) errors[s.name] = `Must be at least ${s.min}`;
        else if (s.max !== undefined && n > s.max) errors[s.name] = `Must be ${s.max} or less`;
        else if (s.gt !== undefined && n <= s.gt) errors[s.name] = `Must be greater than ${s.gt}`;
        else values[s.name] = n;
      } else if (s.type === "date") {
        const ok = /^\d{4}-\d{2}-\d{2}$/.test(v) && HT.dateStr(HT.parseDate(v)) === v;
        if (!ok) errors[s.name] = "Enter a valid date";
        else if (s.maxToday && v > HT.today()) errors[s.name] = "Date can't be in the future";
        else values[s.name] = v;
      } else if (s.type === "datetime") {
        if (Number.isNaN(new Date(v).getTime())) errors[s.name] = "Enter a valid date and time";
        else values[s.name] = v;
      } else if (s.type === "select") {
        if (!s.options.some((o) => o.value === v)) errors[s.name] = `Choose ${label.toLowerCase()}`;
        else values[s.name] = v;
      } else {
        if (s.max !== undefined && v.length > s.max) errors[s.name] = `Use ${s.max} characters or fewer`;
        else values[s.name] = v;
      }
    });
    return { errors, values };
  };

  /* ---------- theme + shell ---------- */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    daily: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>',
    workouts: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
    sleep: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M17 3c-2 2-3 4.5-3 7 0 1.7 1 3 3 3v8"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    analytics: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    steps: '<path d="M4 16c0-3 2-5 4-5s3 1.5 3 4-1 4-3 4-4-1-4-3zM13 9c0-3 1-5 3-5s4 2 4 5-2 4-4 4-3-1-3-4z"/>',
    water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    weight: '<path d="M6 7h12l2 13H4L6 7z"/><circle cx="12" cy="5" r="2"/><path d="M12 12l2-2"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-4 3 0-3-1-6-3-9-1 4-4 6-4 12 0 4 3 8 7 8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
  };
  HT.icon = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  HT.logo = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#0E7C86"/><circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.4"/><path d="M6 17h6l2-5 3 9 2-4h7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  HT.setTheme = (t) => {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("ht-theme", t); } catch (e) {}
    window.dispatchEvent(new CustomEvent("ht-theme", { detail: t }));
  };
  HT.themeButton = (cls = "icon-btn") => {
    const b = document.createElement("button");
    b.type = "button"; b.className = cls;
    const paint = () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      b.innerHTML = HT.icon(dark ? "sun" : "moon");
      b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    };
    b.addEventListener("click", () => { HT.setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); paint(); });
    paint();
    return b;
  };

  const NAV = [
    ["dashboard", "Dashboard"], ["daily", "Daily health"], ["workouts", "Workouts"], ["sleep", "Sleep"],
    ["food", "Food & nutrition"], ["goals", "Goals"], ["analytics", "Analytics"],
  ];
  const buildShell = (page, user) => {
    const content = document.getElementById("content");
    const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const link = ([id, label]) => `<a href="${id}.html" ${id === page ? 'aria-current="page"' : ""}>${HT.icon(id)}<span>${label}</span></a>`;
    const shell = document.createElement("div");
    shell.className = "shell";
    shell.innerHTML = `
      <aside class="sidebar" id="sidebar" aria-label="Main navigation">
        <a class="brand" href="dashboard.html">${HT.logo}<span>HealthTrack</span></a>
        <nav class="nav">${NAV.map(link).join("")}<div class="nav-group">Account</div>${link(["profile", "Health profile"])}</nav>
        <div class="sidebar-foot">
          <div class="user-chip"><span class="avatar">${HT.esc(initials)}</span><div><strong>${HT.esc(user.name)}</strong><small>${HT.esc(user.email)}</small></div></div>
          <button class="btn ghost sm" id="logoutBtn" type="button">${HT.icon("logout")} Log out</button>
        </div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div class="main-col">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menuBtn" type="button" aria-label="Open menu">${HT.icon("menu")}</button>
          <div class="titles"><h1>${HT.esc(document.body.dataset.title || "")}</h1><p class="sub">${new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p></div>
          <span id="themeSlot"></span>
        </header>
      </div>`;
    shell.querySelector(".main-col").appendChild(content);
    document.body.appendChild(shell);
    shell.querySelector("#themeSlot").appendChild(HT.themeButton());
    const sb = shell.querySelector("#sidebar"), scrim = shell.querySelector("#scrim");
    const toggle = (open) => { sb.classList.toggle("open", open); scrim.classList.toggle("show", open); };
    shell.querySelector("#menuBtn").addEventListener("click", () => toggle(true));
    scrim.addEventListener("click", () => toggle(false));
    shell.querySelector("#logoutBtn").addEventListener("click", async (e) => {
      HT.busy(e.currentTarget, true);
      try { await HT.api("/api/auth/logout", { method: "POST", noRedirect: true }); } catch (err) { /* cookie may already be gone */ }
      location.replace("login.html");
    });
  };

  const fatal = (err) => {
    document.body.classList.remove("booting");
    document.body.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center"><div class="stack" style="max-width:380px;align-items:center"><h1>We couldn't load HealthTrack</h1><p class="muted">${HT.esc(err.message)}</p><button class="btn primary" onclick="location.reload()">Try again</button></div></div>`;
  };

  // Protected pages call this first: it checks the session and the onboarding status, then builds the shell.
  HT.initPage = async () => {
    const page = document.body.dataset.page;
    let me;
    try { me = await HT.api("/api/auth/me", { noRedirect: true }); }
    catch (e) {
      if (e.status === 401) location.replace("login.html"); else fatal(e);
      return never();
    }
    const { user, onboarding } = me.data;
    if (page === "onboarding" && onboarding.completed) { location.replace("dashboard.html"); return never(); }
    if (page !== "onboarding" && !onboarding.completed) { location.replace("onboarding.html"); return never(); }
    HT.user = user;
    if (page !== "onboarding") buildShell(page, user);
    document.body.classList.remove("booting");
    return { user, onboarding };
  };
  // Login/register pages: already signed in -> go where the user belongs.
  HT.redirectIfAuthed = async () => {
    try {
      const me = await HT.api("/api/auth/me", { noRedirect: true });
      location.replace(me.data.onboarding.completed ? "dashboard.html" : "onboarding.html");
      return never();
    } catch (e) { /* not signed in (or API down): show the form */ }
    document.body.classList.remove("booting");
  };
})();
