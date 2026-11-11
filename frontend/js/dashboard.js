/* Dashboard: every number here comes from the API (MongoDB). Nothing is hard-coded except fallback targets. */
(function () {
  "use strict";
  const { esc, num } = HT;
  const DEFAULTS = { steps: 10000, water: 2500, sleep: 480 };
  const $ = (s) => document.querySelector(s);

  const tileSkeleton = () => `<div class="card tile"><div class="tile-top"><span class="tile-ico"></span><span class="skel" style="width:90px"></span></div><div class="skel big"></div><div class="skel" style="width:70%"></div></div>`;

  const tile = ({ href, color, icon, label, value, unit, sub }) => `
    <a class="card tile" href="${href}" style="--tc:var(${color})">
      <div class="tile-top"><span class="tile-ico">${HT.icon(icon)}</span><span>${esc(label)}</span></div>
      <div class="tile-val">${value}${unit ? `<small>${esc(unit)}</small>` : ""}</div>
      <div class="tile-sub">${sub || ""}</div>
    </a>`;

  const rings = (items) => {
    const cx = 100, stroke = 13, gap = 6;
    const parts = items.map((it, i) => {
      const r = 90 - i * (stroke + gap), len = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, it.pct));
      return `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/>
        <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(${it.color})" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${(len * pct).toFixed(1)} ${len.toFixed(1)}" transform="rotate(-90 ${cx} ${cx})" ${pct === 0 ? 'stroke-opacity="0"' : ""}/>`;
    }).join("");
    return `<svg viewBox="0 0 200 200" role="img" aria-label="${items.map((i) => `${i.label} ${Math.round(i.pct * 100)} percent`).join(", ")}">${parts}</svg>`;
  };

  const greeting = (name) => {
    const h = new Date().getHours();
    return `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name.split(/\s+/)[0]}`;
  };

  async function load(user) {
    const today = HT.today(), from = HT.addDays(today, -30);
    const get = (path, query) => HT.api(path, { query }).then((r) => r.data, (e) => { if (e.status === 404) return null; throw e; });
    const [daily, sleep, food, workouts, goals, profile] = await Promise.all([
      get("/api/daily-records", { from, to: today, limit: 31, order: "desc" }),
      get("/api/sleep", { from: today, to: today, limit: 100 }),
      get("/api/food", { from: today, to: today, limit: 100 }),
      get("/api/workouts", { from: today, to: today, limit: 100 }),
      get("/api/goals", { status: "active", limit: 100, order: "asc" }),
      get("/api/health-profile"),
    ]);

    const recs = daily.items;
    const todayRec = recs.find((r) => r.date === today) || {};
    const weights = recs.filter((r) => r.weight != null); // newest first
    const sleepMins = HT.sum(sleep.items, (s) => s.durationMinutes);
    const eaten = HT.sum(food.items, (f) => f.calories);
    const workoutBurn = HT.sum(workouts.items, (w) => w.caloriesBurned);
    const burned = todayRec.caloriesBurned != null ? todayRec.caloriesBurned : workoutBurn;
    const goalItems = goals.items;
    const target = (type, fallback) => { const g = goalItems.find((x) => x.goalType === type); return g ? g.targetValue : fallback; };
    const T = { steps: target("daily_steps", DEFAULTS.steps), water: target("daily_water", DEFAULTS.water), sleep: DEFAULTS.sleep };
    const steps = todayRec.steps || 0, water = todayRec.waterIntake || 0;
    const stepsPct = steps / T.steps;

    // hero
    $("#greeting").textContent = greeting(user.name);
    $("#heroLine").textContent =
      steps === 0 && water === 0 && sleepMins === 0
        ? "Nothing logged yet today. Add your first entry to start filling your rings."
        : stepsPct >= 1 ? "You've hit your step target today. Nice work."
        : `You're ${Math.round(stepsPct * 100)}% of the way to today's step target.`;
    $("#rings").innerHTML = rings([
      { pct: stepsPct, color: "--c-steps", label: "Steps" },
      { pct: water / T.water, color: "--c-water", label: "Water" },
      { pct: sleepMins / T.sleep, color: "--c-sleep", label: "Sleep" },
    ]);
    $("#ringLegend").innerHTML = [
      ["--c-steps", "Steps", `${num(steps)} / ${num(T.steps)}`],
      ["--c-water", "Water", `${num(water)} / ${num(T.water)} ml`],
      ["--c-sleep", "Sleep", `${HT.dur(sleepMins)} / ${HT.dur(T.sleep)}`],
    ].map(([c, l, v]) => `<li><i style="background:var(${c})"></i><strong>${v}</strong><small>${l}</small></li>`).join("");

    // tiles
    const wNow = weights[0], wPrev = weights[1];
    let weightSub = "No weigh-ins yet. Log one in Daily health.", weightVal = "—";
    if (wNow) {
      weightVal = num(wNow.weight);
      const diff = wPrev ? wNow.weight - wPrev.weight : null;
      weightSub = `Logged ${wNow.date === today ? "today" : HT.fmtShort(wNow.date)}${diff ? ` · ${diff > 0 ? "+" : ""}${num(diff)} kg since ${HT.fmtShort(wPrev.date)}` : ""}`;
    } else if (profile && profile.healthProfile) {
      weightVal = num(profile.healthProfile.weight);
      weightSub = "From your health profile";
    }
    const macros = [["P", "protein"], ["C", "carbs"], ["F", "fat"]].map(([l, k]) => `${l} ${num(HT.sum(food.items, (f) => f[k]))}g`).join(" · ");
    const lastSleep = sleep.items[0];
    const tiles = [
      { href: "daily.html", color: "--c-steps", icon: "steps", label: "Today's steps", value: num(steps), sub: `${Math.round(stepsPct * 100)}% of ${num(T.steps)}` },
      { href: "daily.html", color: "--c-water", icon: "water", label: "Water intake", value: num(water), unit: "ml", sub: `${Math.round((water / T.water) * 100)}% of ${num(T.water)} ml` },
      { href: "daily.html", color: "--c-weight", icon: "weight", label: "Current weight", value: weightVal, unit: wNow || weightVal !== "—" ? "kg" : "", sub: esc(weightSub) },
      { href: "sleep.html", color: "--c-sleep", icon: "sleep", label: "Sleep duration", value: sleepMins ? HT.dur(sleepMins) : "—", sub: lastSleep ? `Woke at ${HT.fmtClock(lastSleep.wakeTime)}` : "No sleep logged for last night" },
      { href: "food.html", color: "--c-eaten", icon: "food", label: "Calories consumed", value: num(eaten), unit: "kcal", sub: food.items.length ? `${food.items.length} item${food.items.length === 1 ? "" : "s"} · ${macros}` : "No meals logged today" },
      { href: todayRec.caloriesBurned != null ? "daily.html" : "workouts.html", color: "--c-burned", icon: "flame", label: "Calories burned", value: num(burned), unit: "kcal", sub: todayRec.caloriesBurned != null ? "From today's daily record" : workouts.items.length ? `From ${workouts.items.length} workout${workouts.items.length === 1 ? "" : "s"}` : "No activity logged today" },
    ];
    $("#tiles").innerHTML = tiles.map(tile).join("");

    // active goals
    $("#goalCount").textContent = goalItems.length ? `${goalItems.length} active` : "";
    $("#goalsBody").innerHTML = goalItems.length
      ? `<ul class="goal-list">${goalItems.map((g) => {
          const p = g.progress || {}, meta = HT.GOALS[g.goalType];
          const left = p.isOverdue ? "past deadline" : p.daysRemaining != null ? `${p.daysRemaining} day${p.daysRemaining === 1 ? "" : "s"} left` : "";
          return `<li class="goal-row"><div class="line"><strong>${esc(meta.label)}</strong><span>${num(p.percent)}%</span></div>
            <div class="bar ${p.isOverdue ? "warn" : ""}"><i style="width:${Math.min(100, p.percent || 0)}%"></i></div>
            <small>${num(g.currentValue)} of ${num(g.targetValue)} ${esc(p.unit || meta.unit)}${left ? ` · ${left}` : ""}</small></li>`;
        }).join("")}</ul>`
      : `<div class="empty"><strong>No active goals</strong>Set a goal to see your progress here.<div style="margin-top:14px"><a class="btn sm primary" href="goals.html">Create a goal</a></div></div>`;
  }

  HT.initPage().then(({ user }) => {
    $("#tiles").innerHTML = Array.from({ length: 6 }, tileSkeleton).join("");
    $("#goalsBody").innerHTML = `<div class="skel-row">${'<div class="skel"></div>'.repeat(3)}</div>`;
    const run = async () => {
      $("#loadError").hidden = true;
      try { await load(user); }
      catch (err) {
        if (err.silent) return;
        $("#tiles").innerHTML = "";
        $("#goalsBody").innerHTML = "";
        $("#loadError").hidden = false;
        $("#loadError").innerHTML = `Couldn't load your dashboard: ${esc(err.message)} <button class="btn sm" id="retry">Try again</button>`;
        $("#retry").addEventListener("click", () => { $("#tiles").innerHTML = Array.from({ length: 6 }, tileSkeleton).join(""); run(); });
      }
    };
    run();
  });
})();
