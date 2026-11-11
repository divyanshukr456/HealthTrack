/* Analytics: six Chart.js charts built from the user's real records. */
(function () {
  "use strict";
  const { esc, num } = HT;
  const $ = (s) => document.querySelector(s);
  const charts = {};
  let days = 7, lastData = null, token = 0;

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const avg = (a) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : null);
  const present = (arr) => arr.filter((v) => v !== null && v !== undefined);

  const CHARTS = [
    { id: "steps", title: "Steps", link: "daily.html" },
    { id: "weight", title: "Weight progress", link: "daily.html" },
    { id: "water", title: "Water intake", link: "daily.html" },
    { id: "sleep", title: "Sleep duration", link: "sleep.html" },
    { id: "workouts", title: "Workout history", link: "workouts.html" },
    { id: "calories", title: "Calories consumed vs burned", link: "food.html" },
  ];

  const frame = () => {
    $("#chartGrid").innerHTML = CHARTS.map((c) => `
      <section class="card chart-card" aria-labelledby="t_${c.id}">
        <div class="card-head" style="margin-bottom:8px"><div><h2 id="t_${c.id}">${c.title}</h2><p class="stat-line" id="s_${c.id}">Loading…</p></div></div>
        <div class="chart-box"><canvas id="c_${c.id}" role="img" aria-label="${c.title} chart"></canvas><div class="chart-empty" id="e_${c.id}"><span class="spinner"></span></div></div>
      </section>`).join("");
  };

  const baseOptions = (extra = {}) => {
    const grid = css("--line"), muted = css("--muted");
    return {
      responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8, boxPadding: 4 } },
      scales: {
        x: { grid: { display: false }, ticks: { color: muted, maxRotation: 0, autoSkip: true, maxTicksLimit: days <= 7 ? 7 : days <= 30 ? 8 : 9 } },
        y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 6 } },
      },
      ...extra,
    };
  };

  // Draws one chart, or an empty-state message when there is nothing to plot.
  const draw = (id, config, statText, hasData, emptyText) => {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    $("#s_" + id).textContent = statText;
    const empty = $("#e_" + id);
    if (!hasData) {
      const link = CHARTS.find((c) => c.id === id).link;
      empty.hidden = false;
      empty.innerHTML = `<div><strong style="color:var(--ink)">No data in this period</strong><br>${esc(emptyText)}<br><a href="${link}">Add an entry</a></div>`;
      return;
    }
    empty.hidden = true;
    charts[id] = new Chart($("#c_" + id), config);
  };

  const render = (d) => {
    Chart.defaults.font.family = css("--font") || "sans-serif";
    Chart.defaults.color = css("--muted");
    const range = HT.dayRange(days), labels = range.map(HT.fmtShort);
    const col = { steps: css("--c-steps"), water: css("--c-water"), weight: css("--c-weight"), sleep: css("--c-sleep"), eaten: css("--c-eaten"), burned: css("--c-burned") };

    // index everything by day
    const dailyBy = Object.fromEntries(d.daily.map((r) => [r.date, r]));
    const sleepBy = {}; d.sleep.forEach((s) => { sleepBy[s.date] = (sleepBy[s.date] || 0) + s.durationMinutes; });
    const eatenBy = {}; d.food.forEach((f) => { eatenBy[f.date] = (eatenBy[f.date] || 0) + f.calories; });
    const burnWorkBy = {}; d.workouts.forEach((w) => { if (w.caloriesBurned != null) burnWorkBy[w.date] = (burnWorkBy[w.date] || 0) + w.caloriesBurned; });
    const val = (day, k) => (dailyBy[day] && dailyBy[day][k] != null ? dailyBy[day][k] : null);

    // steps
    const steps = range.map((x) => val(x, "steps"));
    const sp = present(steps);
    draw("steps", { type: "bar", data: { labels, datasets: [{ label: "Steps", data: steps, backgroundColor: col.steps, borderRadius: 6, maxBarThickness: 36 }] }, options: baseOptions() },
      sp.length ? `Average ${num(Math.round(avg(sp)))} a day · best ${num(Math.max(...sp))} · ${num(sp.reduce((a, b) => a + b, 0))} in total` : "Nothing logged", sp.length, "Log your steps in Daily health.");

    // weight
    const weight = range.map((x) => val(x, "weight"));
    const wp = present(weight);
    const wText = wp.length > 1 ? `${num(wp[0])} → ${num(wp[wp.length - 1])} kg (${wp[wp.length - 1] - wp[0] > 0 ? "+" : ""}${num(Math.round((wp[wp.length - 1] - wp[0]) * 10) / 10)} kg)` : wp.length ? `${num(wp[0])} kg · one weigh-in` : "Nothing logged";
    draw("weight", { type: "line", data: { labels, datasets: [{ label: "Weight (kg)", data: weight, borderColor: col.weight, backgroundColor: col.weight, tension: 0.3, spanGaps: true, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5 }] }, options: baseOptions({ scales: { x: baseOptions().scales.x, y: { ...baseOptions().scales.y, beginAtZero: false, grace: "10%" } } }) },
      wText, wp.length, "Log your weight in Daily health.");

    // water
    const water = range.map((x) => val(x, "waterIntake"));
    const wa = present(water);
    draw("water", { type: "bar", data: { labels, datasets: [{ label: "Water (ml)", data: water, backgroundColor: col.water, borderRadius: 6, maxBarThickness: 36 }] }, options: baseOptions() },
      wa.length ? `Average ${num(Math.round(avg(wa)))} ml a day · best ${num(Math.max(...wa))} ml` : "Nothing logged", wa.length, "Log your water in Daily health.");

    // sleep (hours)
    const sleepH = range.map((x) => (sleepBy[x] ? Math.round((sleepBy[x] / 60) * 100) / 100 : null));
    const sl = present(sleepH);
    draw("sleep", { type: "line", data: { labels, datasets: [{ label: "Sleep (hours)", data: sleepH, borderColor: col.sleep, backgroundColor: col.sleep + "33", fill: true, tension: 0.3, spanGaps: true, pointRadius: 4, pointHoverRadius: 6, borderWidth: 2.5 }] }, options: baseOptions({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${HT.dur(c.parsed.y * 60)}` } } } }) },
      sl.length ? `Average ${HT.dur(avg(sl) * 60)} a night across ${sl.length} night${sl.length === 1 ? "" : "s"}` : "Nothing logged", sl.length, "Log your sleep in Sleep.");

    // workouts: minutes per day, stacked by category
    const cats = ["cardio", "strength", "flexibility", "sports", "other"];
    const catCol = { cardio: col.burned, strength: col.weight, flexibility: col.steps, sports: col.eaten, other: css("--muted") };
    const minsBy = {}; d.workouts.forEach((w) => { (minsBy[w.date] = minsBy[w.date] || {})[w.category] = (minsBy[w.date][w.category] || 0) + w.duration; });
    const used = cats.filter((c) => d.workouts.some((w) => w.category === c));
    const totalMin = HT.sum(d.workouts, (w) => w.duration);
    draw("workouts", { type: "bar", data: { labels, datasets: used.map((c) => ({ label: HT.cap(c), data: range.map((x) => (minsBy[x] && minsBy[x][c]) || null), backgroundColor: catCol[c], borderRadius: 4, maxBarThickness: 36 })) },
      options: baseOptions({ plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${HT.dur(c.parsed.y)}` } } }, scales: { x: { ...baseOptions().scales.x, stacked: true }, y: { ...baseOptions().scales.y, stacked: true } } }) },
      d.workouts.length ? `${d.workouts.length} workout${d.workouts.length === 1 ? "" : "s"} · ${HT.dur(totalMin)} of activity` : "Nothing logged", d.workouts.length, "Log a session in Workouts.");

    // calories consumed vs burned (burned = daily record value, else the day's workouts)
    const eaten = range.map((x) => (eatenBy[x] != null ? eatenBy[x] : null));
    const burned = range.map((x) => (val(x, "caloriesBurned") != null ? val(x, "caloriesBurned") : burnWorkBy[x] != null ? burnWorkBy[x] : null));
    const ea = present(eaten), bu = present(burned);
    draw("calories", { type: "bar", data: { labels, datasets: [
      { label: "Consumed", data: eaten, backgroundColor: col.eaten, borderRadius: 5, maxBarThickness: 22 },
      { label: "Burned", data: burned, backgroundColor: col.burned, borderRadius: 5, maxBarThickness: 22 }] },
      options: baseOptions({ plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } } }) },
      ea.length || bu.length ? `Daily average: ${ea.length ? num(Math.round(avg(ea))) : "—"} consumed · ${bu.length ? num(Math.round(avg(bu))) : "—"} burned (kcal)` : "Nothing logged", ea.length || bu.length, "Log meals in Food and activity in Daily health or Workouts.");
  };

  const load = async () => {
    const my = ++token;
    const q = { from: HT.addDays(HT.today(), -(days - 1)), to: HT.today(), order: "asc" };
    $("#loadError").hidden = true;
    try {
      const [daily, sleep, workouts, food] = await Promise.all([
        HT.fetchAll("/api/daily-records", q), HT.fetchAll("/api/sleep", q), HT.fetchAll("/api/workouts", q), HT.fetchAll("/api/food", q),
      ]);
      if (my !== token) return; // a newer range was picked meanwhile
      lastData = { daily, sleep, workouts, food };
      render(lastData);
    } catch (err) {
      if (err.silent) return;
      $("#loadError").hidden = false;
      $("#loadError").innerHTML = `Couldn't load your analytics: ${esc(err.message)} <button class="btn sm" id="retry">Try again</button>`;
      $("#retry").addEventListener("click", () => { frame(); load(); });
    }
  };

  HT.initPage().then(() => {
    frame();
    $("#range").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-days]");
      if (!b || Number(b.dataset.days) === days) return;
      days = Number(b.dataset.days);
      $("#range").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      frame(); load();
    });
    window.addEventListener("ht-theme", () => { if (lastData) render(lastData); });
    load();
  });
})();
