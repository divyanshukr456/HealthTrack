/* Tracker pages (daily, workouts, sleep, food, goals): one engine, one config per page. */
(function () {
  "use strict";
  const { esc, num } = HT;
  const opts = (list) => list.map((v) => ({ value: v, label: HT.cap(v) }));
  const WEIGHT_GOAL = (v) => v.goalType === "weight_loss" || v.goalType === "weight_gain";
  const NOW = () => new Date();

  /* ------------------------------------------------------------------ configs */
  const CONFIGS = {
    daily: {
      endpoint: "/api/daily-records", noun: "daily record", nounPlural: "daily records",
      intro: "One entry per day. Fill in whatever you tracked: steps, water, weight or calories burned.",
      fields: [
        { name: "date", label: "Date", type: "date", required: true, maxToday: true, initial: () => HT.today() },
        { name: "steps", label: "Steps", type: "number", int: true, min: 0, max: 200000, nullable: true, placeholder: "e.g. 8000" },
        { name: "waterIntake", short: "Water", label: "Water (ml)", type: "number", min: 0, max: 20000, nullable: true, placeholder: "e.g. 2000" },
        { name: "weight", label: "Weight (kg)", type: "number", min: 2, max: 700, step: "0.1", nullable: true, placeholder: "e.g. 70.5" },
        { name: "caloriesBurned", short: "Calories burned", label: "Calories burned", type: "number", min: 0, max: 20000, nullable: true, placeholder: "e.g. 2200" },
      ],
      custom: (v) => (["steps", "waterIntake", "weight", "caloriesBurned"].every((k) => v[k] == null) ? { steps: "Enter at least one value for the day" } : {}),
      columns: [
        { label: "Date", html: (r) => `<strong>${HT.fmtDate(r.date)}</strong>` },
        { label: "Steps", num: true, html: (r) => num(r.steps) },
        { label: "Water (ml)", num: true, html: (r) => num(r.waterIntake) },
        { label: "Weight (kg)", num: true, html: (r) => num(r.weight) },
        { label: "Burned (kcal)", num: true, html: (r) => num(r.caloriesBurned) },
      ],
      toInput: (r) => ({ date: r.date, steps: r.steps, waterIntake: r.waterIntake, weight: r.weight, caloriesBurned: r.caloriesBurned }),
      // The API allows one record per day: offer to open the existing one.
      conflict: { field: "date", message: "You already have a record for this day.", action: "Edit that record", find: (v) => ({ from: v.date, to: v.date }) },
    },

    workouts: {
      endpoint: "/api/workouts", noun: "workout", nounPlural: "workouts",
      intro: "Log each session. You can add several workouts on the same day.",
      fields: [
        { name: "exerciseName", short: "Exercise", label: "Exercise", type: "text", required: true, max: 100, placeholder: "e.g. Morning run", wide: true },
        { name: "category", label: "Category", type: "select", required: true, placeholder: "Select…", options: opts(["cardio", "strength", "flexibility", "sports", "other"]) },
        { name: "duration", label: "Duration (min)", type: "number", int: true, required: true, min: 1, max: 1440, placeholder: "e.g. 30" },
        { name: "caloriesBurned", short: "Calories burned", label: "Calories burned", type: "number", min: 0, max: 20000, nullable: true, placeholder: "e.g. 300" },
        { name: "date", label: "Date", type: "date", required: true, maxToday: true, initial: () => HT.today() },
      ],
      filters: [{ name: "category", label: "Category", options: opts(["cardio", "strength", "flexibility", "sports", "other"]) }],
      columns: [
        { label: "Date", html: (r) => HT.fmtDate(r.date) },
        { label: "Exercise", html: (r) => `<strong>${esc(r.exerciseName)}</strong>` },
        { label: "Category", html: (r) => `<span class="badge blue">${esc(HT.cap(r.category))}</span>` },
        { label: "Time", num: true, html: (r) => HT.dur(r.duration) },
        { label: "Burned (kcal)", num: true, html: (r) => num(r.caloriesBurned) },
      ],
      toInput: (r) => ({ exerciseName: r.exerciseName, category: r.category, duration: r.duration, caloriesBurned: r.caloriesBurned, date: r.date }),
      summary: async () => {
        const items = await HT.fetchAll("/api/workouts", { from: HT.addDays(HT.today(), -6), to: HT.today() });
        return [["Workouts, last 7 days", items.length], ["Active time", HT.dur(HT.sum(items, (i) => i.duration))], ["Calories burned", num(HT.sum(items, (i) => i.caloriesBurned))]];
      },
    },

    sleep: {
      endpoint: "/api/sleep", noun: "sleep entry", nounPlural: "sleep entries",
      intro: "Enter when you fell asleep and when you woke up. We work out the duration for you.",
      fields: [
        { name: "sleepTime", short: "Bedtime", label: "Fell asleep", type: "datetime", required: true, initial: () => `${HT.addDays(HT.today(), -1)}T23:00` },
        { name: "wakeTime", short: "Wake time", label: "Woke up", type: "datetime", required: true, initial: () => `${HT.today()}T07:00` },
      ],
      custom: (v) => {
        if (!v.sleepTime || !v.wakeTime) return {};
        const mins = (new Date(v.wakeTime) - new Date(v.sleepTime)) / 60000;
        if (mins <= 0) return { wakeTime: "Wake time must be after you fell asleep" };
        if (mins > 1440) return { wakeTime: "Sleep can't be longer than 24 hours" };
        if (new Date(v.wakeTime) > NOW()) return { wakeTime: "Wake time can't be in the future" };
        return {};
      },
      columns: [
        { label: "Night ending", html: (r) => `<strong>${HT.fmtDate(r.date)}</strong>` },
        { label: "Fell asleep", html: (r) => HT.fmtDateTime(r.sleepTime) },
        { label: "Woke up", html: (r) => HT.fmtDateTime(r.wakeTime) },
        { label: "Duration", num: true, html: (r) => `<strong>${HT.dur(r.durationMinutes)}</strong>` },
      ],
      toInput: (r) => ({ sleepTime: HT.isoToLocalInput(r.sleepTime), wakeTime: HT.isoToLocalInput(r.wakeTime) }),
      toPayload: (v) => ({ sleepTime: HT.localToOffsetISO(v.sleepTime), wakeTime: HT.localToOffsetISO(v.wakeTime) }),
      summary: async () => {
        const items = await HT.fetchAll("/api/sleep", { from: HT.addDays(HT.today(), -6), to: HT.today() });
        const avg = items.length ? HT.sum(items, (i) => i.durationMinutes) / items.length : null;
        return [["Nights logged, last 7 days", items.length], ["Average sleep", avg === null ? "—" : HT.dur(avg)], ["Longest night", items.length ? HT.dur(Math.max(...items.map((i) => i.durationMinutes))) : "—"]];
      },
    },

    food: {
      endpoint: "/api/food", noun: "food entry", nounPlural: "food entries",
      intro: "Log what you eat. Protein, carbs and fat are optional.",
      fields: [
        { name: "foodName", short: "Food", label: "Food", type: "text", required: true, max: 100, placeholder: "e.g. Oats with milk", wide: true },
        { name: "mealType", short: "Meal", label: "Meal", type: "select", required: true, placeholder: "Select…", options: opts(["breakfast", "lunch", "dinner", "snack"]) },
        { name: "date", label: "Date", type: "date", required: true, maxToday: true, initial: () => HT.today() },
        { name: "quantity", label: "Quantity", type: "number", required: true, gt: 0, max: 100000, placeholder: "e.g. 50" },
        { name: "quantityUnit", short: "Unit", label: "Unit", type: "select", required: true, options: ["g", "ml", "piece", "serving", "cup", "tbsp", "tsp", "oz"].map((u) => ({ value: u, label: u })), initial: () => "g" },
        { name: "calories", label: "Calories (kcal)", type: "number", required: true, min: 0, max: 20000, placeholder: "e.g. 190", wide: true },
        { name: "protein", label: "Protein (g)", type: "number", min: 0, max: 5000, nullable: true },
        { name: "carbs", label: "Carbs (g)", type: "number", min: 0, max: 5000, nullable: true },
        { name: "fat", label: "Fat (g)", type: "number", min: 0, max: 5000, nullable: true },
      ],
      filters: [{ name: "mealType", label: "Meal", options: opts(["breakfast", "lunch", "dinner", "snack"]) }],
      columns: [
        { label: "Date", html: (r) => HT.fmtDate(r.date) },
        { label: "Food", html: (r) => `<strong>${esc(r.foodName)}</strong><small>${num(r.quantity)} ${esc(r.quantityUnit)}</small>` },
        { label: "Meal", html: (r) => `<span class="badge blue">${esc(HT.cap(r.mealType))}</span>` },
        { label: "Calories", num: true, html: (r) => num(r.calories) },
        { label: "P / C / F (g)", num: true, html: (r) => [r.protein, r.carbs, r.fat].map(num).join(" / ") },
      ],
      toInput: (r) => ({ ...r }),
      summary: async () => {
        const items = await HT.fetchAll("/api/food", { from: HT.today(), to: HT.today() });
        return [["Calories today", num(HT.sum(items, (i) => i.calories))], ["Protein today", num(HT.sum(items, (i) => i.protein)) + " g"], ["Carbs today", num(HT.sum(items, (i) => i.carbs)) + " g"], ["Fat today", num(HT.sum(items, (i) => i.fat)) + " g"]];
      },
    },

    goals: {
      endpoint: "/api/goals", noun: "goal", nounPlural: "goals", dateFilter: false,
      intro: "Set a target and a deadline. Update your current value as you go and we calculate your progress.",
      fields: [
        { name: "goalType", short: "Goal type", label: "Goal", type: "select", required: true, placeholder: "Select…", wide: true, lockOnEdit: true, options: Object.entries(HT.GOALS).map(([value, g]) => ({ value, label: g.label })) },
        { name: "startValue", short: "Starting weight", label: "Starting weight (kg)", type: "number", required: true, min: 2, max: 700, step: "0.1", showIf: WEIGHT_GOAL, lockOnEdit: true },
        { name: "targetValue", short: "Target", label: "Target", type: "number", required: true, gt: 0, max: 10000000, step: "any" },
        { name: "currentValue", short: "Current value", label: "Current value", type: "number", min: 0, max: 10000000, step: "any", hint: "Leave blank to start from your starting value." },
        { name: "startDate", label: "Start date", type: "date", lockOnEdit: true, initial: () => HT.today() },
        { name: "deadline", label: "Deadline", type: "date", required: true },
        { name: "status", label: "Status", type: "select", editOnly: true, options: opts(["active", "completed", "cancelled"]), wide: true },
      ],
      filters: [
        { name: "status", label: "Status", options: opts(["active", "completed", "cancelled"]) },
        { name: "goalType", label: "Goal", options: Object.entries(HT.GOALS).map(([value, g]) => ({ value, label: g.label })) },
      ],
      custom: (v, mode) => {
        const e = {};
        if (WEIGHT_GOAL(v) && v.startValue != null && v.targetValue != null) {
          if (mode === "create" && v.goalType === "weight_loss" && v.targetValue >= v.startValue) e.targetValue = "Target must be lower than your starting weight";
          if (mode === "create" && v.goalType === "weight_gain" && v.targetValue <= v.startValue) e.targetValue = "Target must be higher than your starting weight";
        }
        const start = v.startDate || HT.today();
        if (mode === "create" && v.deadline && v.deadline < start) e.deadline = "Deadline can't be before the start date";
        return e;
      },
      columns: [
        { label: "Goal", html: (r) => `<strong>${esc(HT.GOALS[r.goalType].label)}</strong><small>Due ${HT.fmtDate(r.deadline)}</small>` },
        { label: "Progress", html: (r) => goalProgressHtml(r) },
        { label: "Status", html: (r) => statusBadge(r) },
      ],
      toInput: (r) => ({ goalType: r.goalType, startValue: r.startValue, targetValue: r.targetValue, currentValue: r.currentValue, startDate: r.startDate, deadline: r.deadline, status: r.status }),
      onChange: (form) => {
        const type = form.elements.goalType.value, unit = HT.GOALS[type] ? HT.GOALS[type].unit : "";
        const t = form.querySelector('[data-field="targetValue"] label'), c = form.querySelector('[data-field="currentValue"] label');
        t.textContent = unit ? `Target (${unit})` : "Target";
        c.innerHTML = unit ? `Current value (${unit}) <span class="opt">optional</span>` : 'Current value <span class="opt">optional</span>';
      },
    },
  };

  function statusBadge(r) {
    const p = r.progress || {};
    if (r.status === "completed") return '<span class="badge green">Completed</span>';
    if (r.status === "cancelled") return '<span class="badge">Cancelled</span>';
    return p.isOverdue ? '<span class="badge red">Overdue</span>' : '<span class="badge blue">Active</span>';
  }
  function goalProgressHtml(r) {
    const p = r.progress || {}, unit = p.unit || "";
    const left = r.status !== "active" ? "" : p.isOverdue ? "past deadline" : p.daysRemaining != null ? `${p.daysRemaining} day${p.daysRemaining === 1 ? "" : "s"} left` : "";
    return `<div style="min-width:190px"><div class="goal-row"><div class="line"><small>${num(r.currentValue)} of ${num(r.targetValue)} ${esc(unit)}</small><span>${num(p.percent)}%</span></div>
      <div class="bar ${p.isOverdue && r.status === "active" ? "warn" : ""}"><i style="width:${Math.min(100, p.percent || 0)}%"></i></div>${left ? `<small>${left}</small>` : ""}</div></div>`;
  }

  /* ------------------------------------------------------------------ engine */
  const page = document.body.dataset.page;
  const cfg = CONFIGS[page];
  if (!cfg) return;
  const $ = (s) => document.querySelector(s);
  const state = { page: 1, limit: 10, filters: {}, items: [], pagination: null, editing: null };
  let formEl, listEl, pagerEl, filtersEl;

  const fieldHtml = (f) => {
    const id = "f_" + f.name;
    const attrs = `id="${id}" name="${f.name}"`;
    let control;
    if (f.type === "select") {
      control = `<select ${attrs}>${f.placeholder ? `<option value="">${esc(f.placeholder)}</option>` : ""}${f.options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select>`;
    } else if (f.type === "number") {
      control = `<input ${attrs} type="number" inputmode="decimal" step="${f.step || (f.int ? 1 : "any")}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""}>`;
    } else if (f.type === "date") {
      control = `<input ${attrs} type="date" ${f.maxToday ? `max="${HT.today()}"` : ""}>`;
    } else if (f.type === "datetime") {
      control = `<input ${attrs} type="datetime-local">`;
    } else {
      control = `<input ${attrs} type="text" maxlength="${f.max || 200}" ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""} autocomplete="off">`;
    }
    const optional = !f.required && !f.editOnly ? ' <span class="opt">optional</span>' : "";
    return `<div class="field ${f.wide ? "wide" : ""}" data-field="${f.name}"><label for="${id}">${esc(f.label)}${optional}</label>${control}${f.hint ? `<small class="hint">${esc(f.hint)}</small>` : ""}<small class="field-error" role="alert"></small></div>`;
  };

  const renderSkeleton = () => {
    document.getElementById("content").innerHTML = `
      <p class="muted">${esc(cfg.intro)}</p>
      <div id="summary" class="summary" ${cfg.summary ? "" : "hidden"}></div>
      <div class="tracker">
        <section class="card form-card" aria-labelledby="formTitle">
          <div class="card-head"><h2 id="formTitle"></h2></div>
          <form id="entryForm" novalidate>
            <div class="grid-2">${cfg.fields.map(fieldHtml).join("")}</div>
            <div class="form-error" role="alert" hidden></div>
            <div class="actions"><button class="btn primary" type="submit" id="saveBtn"></button><button class="btn ghost" type="button" id="cancelEdit" hidden>Cancel</button></div>
          </form>
        </section>
        <section class="card list-card" aria-labelledby="histTitle">
          <div class="card-head"><h2 id="histTitle">History</h2><form id="filters" class="filters" novalidate></form></div>
          <div id="list" class="table-wrap" aria-live="polite"></div>
          <div id="pager" class="pager"></div>
        </section>
      </div>`;
    formEl = $("#entryForm"); listEl = $("#list"); pagerEl = $("#pager"); filtersEl = $("#filters");
    // filters
    const dateF = cfg.dateFilter === false ? "" : `<div class="field"><label for="flt_from">From</label><input id="flt_from" name="from" type="date"></div><div class="field"><label for="flt_to">To</label><input id="flt_to" name="to" type="date"></div>`;
    const selF = (cfg.filters || []).map((f) => `<div class="field"><label for="flt_${f.name}">${esc(f.label)}</label><select id="flt_${f.name}" name="${f.name}"><option value="">All</option>${f.options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select></div>`).join("");
    filtersEl.innerHTML = `${dateF}${selF}<button class="btn sm" type="submit">Apply</button><button class="btn ghost sm" type="reset" id="resetFilters">Clear</button><div class="form-error" role="alert" hidden style="flex-basis:100%"></div>`;
  };

  /* form state */
  const specVisible = (f, raw) => !f.showIf || f.showIf(raw);
  const readRaw = () => Object.fromEntries(cfg.fields.map((f) => [f.name, formEl.elements[f.name].value]));
  const syncVisibility = () => {
    const raw = readRaw();
    cfg.fields.forEach((f) => {
      const wrap = formEl.querySelector(`[data-field="${f.name}"]`);
      const hide = !specVisible(f, raw) || (f.editOnly && !state.editing);
      wrap.hidden = hide;
    });
    if (cfg.onChange) cfg.onChange(formEl);
  };
  const resetForm = () => {
    state.editing = null;
    formEl.reset();
    HT.clearErrors(formEl);
    cfg.fields.forEach((f) => {
      const el = formEl.elements[f.name];
      el.disabled = false;
      el.value = f.initial ? f.initial() : "";
    });
    $("#formTitle").textContent = `Add ${cfg.noun}`;
    $("#saveBtn").textContent = `Save ${cfg.noun}`;
    $("#cancelEdit").hidden = true;
    syncVisibility();
  };
  const startEdit = (item) => {
    state.editing = item._id;
    HT.clearErrors(formEl);
    const vals = cfg.toInput(item);
    cfg.fields.forEach((f) => {
      const el = formEl.elements[f.name];
      el.value = vals[f.name] ?? "";
      el.disabled = !!f.lockOnEdit;
    });
    $("#formTitle").textContent = `Edit ${cfg.noun}`;
    $("#saveBtn").textContent = "Save changes";
    $("#cancelEdit").hidden = false;
    syncVisibility();
    formEl.closest(".card").scrollIntoView({ behavior: "smooth", block: "nearest" });
    const first = cfg.fields.find((f) => !f.lockOnEdit);
    if (first) formEl.elements[first.name].focus({ preventScroll: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    HT.clearErrors(formEl);
    const mode = state.editing ? "edit" : "create";
    const specs = cfg.fields.filter((f) => !(f.editOnly && mode === "create") && !(f.lockOnEdit && mode === "edit"));
    const { errors, values } = HT.check(specs, readRaw(), mode);
    if (!Object.keys(errors).length && cfg.custom) Object.assign(errors, cfg.custom(values, mode));
    if (Object.keys(errors).length) { HT.showErrors(formEl, errors); return; }
    const body = cfg.toPayload ? cfg.toPayload(values) : values; // undefined keys are dropped by JSON.stringify
    const btn = $("#saveBtn");
    HT.busy(btn, true, "Saving…");
    try {
      if (mode === "edit") await HT.api(`${cfg.endpoint}/${state.editing}`, { method: "PATCH", body });
      else await HT.api(cfg.endpoint, { method: "POST", body });
      HT.toast(mode === "edit" ? `${HT.cap(cfg.noun)} updated` : `${HT.cap(cfg.noun)} added`);
      const wasEdit = mode === "edit";
      resetForm();
      if (!wasEdit) state.page = 1;
      await Promise.all([load(), loadSummary()]);
    } catch (err) {
      if (err.status === 409 && cfg.conflict) conflictUi(err, values);
      else HT.formError(formEl, err, `Couldn't save the ${cfg.noun}.`);
    } finally {
      HT.busy(btn, false);
      btn.textContent = state.editing ? "Save changes" : `Save ${cfg.noun}`; // busy() restores the label from before the save
    }
  };

  // Duplicate-day handling for daily records.
  const conflictUi = (err, values) => {
    const c = cfg.conflict;
    HT.showErrors(formEl, { [c.field]: c.message });
    const banner = formEl.querySelector(".form-error");
    banner.hidden = false;
    banner.innerHTML = `${esc(c.message)} <button type="button" class="btn sm" id="openExisting">${esc(c.action)}</button>`;
    $("#openExisting").addEventListener("click", async (ev) => {
      HT.busy(ev.currentTarget, true);
      try {
        const r = await HT.api(cfg.endpoint, { query: c.find(values) });
        if (r.data.items[0]) startEdit(r.data.items[0]); else HT.toast("Couldn't find that record", "error");
      } catch (e2) { HT.formError(formEl, e2); }
    });
  };

  /* list */
  const skeleton = () => `<div class="skel-row">${'<div class="skel"></div>'.repeat(5)}</div>`;
  const query = () => ({ page: state.page, limit: state.limit, ...state.filters });
  const load = async () => {
    listEl.innerHTML = skeleton();
    pagerEl.innerHTML = "";
    try {
      const r = await HT.api(cfg.endpoint, { query: query() });
      state.items = r.data.items; state.pagination = r.data.pagination;
      if (!state.items.length && state.page > 1) { state.page -= 1; return load(); }
      renderList();
    } catch (err) {
      if (err.silent) return;
      listEl.innerHTML = `<div class="empty"><strong>Couldn't load your ${esc(cfg.nounPlural)}</strong>${esc(err.message)}<div style="margin-top:14px"><button class="btn sm" id="retry">Try again</button></div></div>`;
      $("#retry").addEventListener("click", load);
    }
  };
  const renderList = () => {
    const filtered = Object.values(state.filters).some(Boolean);
    if (!state.items.length) {
      listEl.innerHTML = `<div class="empty"><strong>${filtered ? `No ${esc(cfg.nounPlural)} match these filters` : `No ${esc(cfg.nounPlural)} yet`}</strong>${filtered ? "Try a wider date range or clear the filters." : `Add your first ${esc(cfg.noun)} using the form.`}</div>`;
      pagerEl.innerHTML = "";
      return;
    }
    listEl.innerHTML = `<table><thead><tr>${cfg.columns.map((c) => `<th class="${c.num ? "num" : ""}">${esc(c.label)}</th>`).join("")}<th class="num"><span class="sr" style="position:absolute;left:-9999px">Actions</span></th></tr></thead><tbody>${state.items
      .map((r) => `<tr data-id="${r._id}">${cfg.columns.map((c) => `<td class="${c.num ? "num" : ""}">${c.html(r)}</td>`).join("")}<td class="act"><button class="icon-btn sm" data-act="edit" aria-label="Edit ${esc(cfg.noun)}" title="Edit">${HT.icon("edit")}</button> <button class="icon-btn sm danger" data-act="delete" aria-label="Delete ${esc(cfg.noun)}" title="Delete">${HT.icon("trash")}</button></td></tr>`)
      .join("")}</tbody></table>`;
    const p = state.pagination;
    pagerEl.innerHTML = `<span>${p.total} ${p.total === 1 ? esc(cfg.noun) : esc(cfg.nounPlural)} · page ${p.page} of ${p.totalPages}</span><span class="actions"><button class="btn sm" id="prevPage" ${p.page <= 1 ? "disabled" : ""}>Previous</button><button class="btn sm" id="nextPage" ${p.page >= p.totalPages ? "disabled" : ""}>Next</button></span>`;
  };
  const loadSummary = async () => {
    if (!cfg.summary) return;
    const box = $("#summary");
    try {
      const stats = await cfg.summary();
      box.innerHTML = stats.map(([k, v]) => `<div class="stat"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join("");
    } catch (err) { box.hidden = true; }
  };

  const onListClick = async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const item = state.items.find((i) => i._id === btn.closest("tr").dataset.id);
    if (!item) return;
    if (btn.dataset.act === "edit") return startEdit(item);
    const ok = await HT.confirm({ title: `Delete this ${cfg.noun}?`, message: "This can't be undone.", confirmText: "Delete" });
    if (!ok) return;
    btn.disabled = true;
    try {
      await HT.api(`${cfg.endpoint}/${item._id}`, { method: "DELETE" });
      HT.toast(`${HT.cap(cfg.noun)} deleted`);
      if (state.editing === item._id) resetForm();
      await Promise.all([load(), loadSummary()]);
    } catch (err) {
      btn.disabled = false;
      if (!err.silent) HT.toast(err.message, "error");
    }
  };

  const applyFilters = (e) => {
    e.preventDefault();
    HT.clearErrors(filtersEl);
    const f = Object.fromEntries(new FormData(filtersEl));
    if (f.from && f.to && f.from > f.to) { HT.banner(filtersEl, "“From” must be on or before “To”."); return; }
    state.filters = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
    state.page = 1;
    load();
  };

  HT.initPage().then(() => {
    renderSkeleton();
    resetForm();
    formEl.addEventListener("submit", submit);
    formEl.addEventListener("input", syncVisibility);
    formEl.addEventListener("change", syncVisibility);
    $("#cancelEdit").addEventListener("click", resetForm);
    listEl.addEventListener("click", onListClick);
    pagerEl.addEventListener("click", (e) => {
      if (e.target.id === "prevPage") { state.page -= 1; load(); }
      if (e.target.id === "nextPage") { state.page += 1; load(); }
    });
    filtersEl.addEventListener("submit", applyFilters);
    filtersEl.addEventListener("reset", () => setTimeout(() => { HT.clearErrors(filtersEl); state.filters = {}; state.page = 1; load(); }));
    load();
    loadSummary();
  });
})();
