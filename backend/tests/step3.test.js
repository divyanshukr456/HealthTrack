// End-to-end API test for Step 3. Run with the server up: node tests/step3.test.js
const BASE = process.env.BASE_URL || "http://localhost:5055";
let pass = 0, fail = 0;
const failures = [];

const client = () => {
  let cookie = "";
  return async (method, path, body, opts = {}) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(opts.noAuth ? {} : { Cookie: cookie }) },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const sc = res.headers.get("set-cookie");
    if (sc && sc.startsWith("token=")) cookie = sc.split(";")[0];
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, body: json };
  };
};

const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("  PASS", name); }
  else { fail++; failures.push(name); console.log("  FAIL", name, extra !== undefined ? JSON.stringify(extra) : ""); }
};

const day = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

(async () => {
  const stamp = Date.now();
  const A = client(), B = client();
  const mk = async (c, tag) => {
    const email = `${tag}${stamp}@test.com`;
    await c("POST", "/api/auth/register", { name: "Test " + tag, email, password: "Passw0rd!123", dob: "1995-05-05" });
    return c("POST", "/api/auth/login", { email, password: "Passw0rd!123" });
  };
  const la = await mk(A, "a");
  await mk(B, "b");
  check("login works (user A)", la.status === 200, la);

  console.log("\n== Auth required on every endpoint");
  const anon = client();
  const fakeId = "64b7f0c2a1b2c3d4e5f60718";
  for (const r of ["daily-records", "workouts", "sleep", "food", "goals"]) {
    for (const [m, p] of [["GET", ""], ["POST", ""], ["GET", "/" + fakeId], ["PATCH", "/" + fakeId], ["DELETE", "/" + fakeId]]) {
      const res = await anon(m, `/api/${r}${p}`, m === "POST" || m === "PATCH" ? {} : undefined);
      check(`${m} /api/${r}${p ? "/:id" : ""} without login -> 401`, res.status === 401, res.status);
    }
  }

  console.log("\n== DAILY RECORDS");
  let r = await A("POST", "/api/daily-records", { date: day(-1), steps: 8000, waterIntake: 2000, weight: 70.5, caloriesBurned: 400 });
  check("create -> 201", r.status === 201, r);
  const dailyId = r.body?.data?.item?._id;
  check("date returned as YYYY-MM-DD", r.body?.data?.item?.date === day(-1), r.body?.data?.item?.date);
  check("no __v leaked", r.body?.data?.item?.__v === undefined);
  r = await A("POST", "/api/daily-records", { date: day(-1), steps: 1 });
  check("duplicate date -> 409", r.status === 409, r);
  r = await A("POST", "/api/daily-records", { date: day(-2), steps: -5 });
  check("negative steps -> 400", r.status === 400, r);
  r = await A("POST", "/api/daily-records", { date: day(-2) });
  check("no metric -> 400", r.status === 400, r);
  r = await A("POST", "/api/daily-records", { date: "2026-02-31", steps: 5 });
  check("impossible date -> 400", r.status === 400, r);
  r = await A("POST", "/api/daily-records", { date: day(10), steps: 5 });
  check("future date -> 400", r.status === 400, r);
  r = await A("POST", "/api/daily-records", { date: day(-2), steps: 5, userId: fakeId });
  check("unknown field (userId) rejected -> 400", r.status === 400, r);
  r = await A("POST", "/api/daily-records", { date: day(-3), steps: "abc" });
  check("string steps -> 400", r.status === 400, r);
  r = await A("POST", "/api/daily-records", '{"date": ');
  check("malformed JSON -> 400", r.status === 400, r);
  await A("POST", "/api/daily-records", { date: day(-5), steps: 3000 });
  await A("POST", "/api/daily-records", { date: day(-8), steps: 4000 });
  r = await A("GET", "/api/daily-records");
  check("list -> 200 with 3 items", r.status === 200 && r.body.data.items.length === 3, r.body);
  check("list sorted newest first", r.body.data.items[0].date === day(-1));
  r = await A("GET", `/api/daily-records?from=${day(-6)}&to=${day(-4)}`);
  check("date range filter returns 1", r.body?.data?.items?.length === 1, r.body);
  r = await A("GET", "/api/daily-records?limit=2&page=2");
  check("pagination page 2 has 1 item, total 3", r.body?.data?.items?.length === 1 && r.body.data.pagination.total === 3, r.body);
  r = await A("GET", "/api/daily-records?order=asc");
  check("order=asc oldest first", r.body?.data?.items?.[0]?.date === day(-8));
  r = await A("GET", "/api/daily-records?limit=1000");
  check("limit>100 -> 400", r.status === 400, r);
  r = await A("GET", `/api/daily-records?from=${day(0)}&to=${day(-3)}`);
  check("from>to -> 400", r.status === 400, r);
  r = await A("GET", "/api/daily-records?foo=bar");
  check("unknown query param -> 400", r.status === 400, r);
  r = await A("GET", `/api/daily-records/${dailyId}`);
  check("get one -> 200", r.status === 200 && r.body.data.item.steps === 8000, r);
  r = await A("GET", "/api/daily-records/not-an-id");
  check("invalid ObjectId -> 400", r.status === 400, r);
  r = await A("GET", `/api/daily-records/${fakeId}`);
  check("unknown id -> 404", r.status === 404, r);
  r = await A("PATCH", `/api/daily-records/${dailyId}`, { steps: 9500 });
  check("patch steps -> 200", r.status === 200 && r.body.data.item.steps === 9500 && r.body.data.item.weight === 70.5, r);
  r = await A("PATCH", `/api/daily-records/${dailyId}`, {});
  check("empty patch -> 400", r.status === 400, r);
  r = await A("PATCH", `/api/daily-records/${dailyId}`, { date: day(-5) });
  check("patch date onto existing day -> 409", r.status === 409, r);
  r = await A("PATCH", `/api/daily-records/${dailyId}`, { steps: null, waterIntake: null, weight: null, caloriesBurned: null });
  check("patch clearing all metrics -> 400", r.status === 400, r);
  r = await B("GET", `/api/daily-records/${dailyId}`);
  check("user B cannot read A's record -> 404", r.status === 404, r);
  r = await B("PATCH", `/api/daily-records/${dailyId}`, { steps: 1 });
  check("user B cannot patch A's record -> 404", r.status === 404, r);
  r = await B("DELETE", `/api/daily-records/${dailyId}`);
  check("user B cannot delete A's record -> 404", r.status === 404, r);
  r = await B("GET", "/api/daily-records");
  check("user B list is empty", r.body?.data?.items?.length === 0, r.body);
  r = await B("POST", "/api/daily-records", { date: day(-1), steps: 100 });
  check("user B can use the same date as A -> 201", r.status === 201, r);
  r = await A("DELETE", `/api/daily-records/${dailyId}`);
  check("delete -> 200", r.status === 200, r);
  r = await A("GET", `/api/daily-records/${dailyId}`);
  check("deleted -> 404", r.status === 404);

  console.log("\n== WORKOUTS");
  r = await A("POST", "/api/workouts", { exerciseName: "  Running ", category: "cardio", duration: 30, caloriesBurned: 300, date: day(-1) });
  check("create -> 201, name trimmed", r.status === 201 && r.body.data.item.exerciseName === "Running", r);
  const wId = r.body?.data?.item?._id;
  r = await A("POST", "/api/workouts", { exerciseName: "Run again", category: "cardio", duration: 20, date: day(-1) });
  check("second workout same day allowed -> 201", r.status === 201, r);
  r = await A("POST", "/api/workouts", { exerciseName: "Yoga", category: "yoga", duration: 20, date: day(-1) });
  check("bad category -> 400", r.status === 400, r);
  r = await A("POST", "/api/workouts", { exerciseName: "Yoga", category: "flexibility", duration: 0, date: day(-1) });
  check("duration 0 -> 400", r.status === 400, r);
  r = await A("POST", "/api/workouts", { exerciseName: "Yoga", category: "flexibility", duration: 12.5, date: day(-1) });
  check("fractional duration -> 400", r.status === 400, r);
  r = await A("POST", "/api/workouts", { exerciseName: "", category: "flexibility", duration: 10, date: day(-1) });
  check("empty name -> 400", r.status === 400, r);
  r = await A("POST", "/api/workouts", { category: "flexibility", duration: 10, date: day(-1) });
  check("missing name -> 400", r.status === 400, r);
  r = await A("GET", "/api/workouts?category=cardio");
  check("filter by category", r.body?.data?.items?.length === 2, r.body);
  r = await A("GET", "/api/workouts?category=strength");
  check("filter by category (none)", r.body?.data?.items?.length === 0);
  r = await A("PATCH", `/api/workouts/${wId}`, { duration: 45 });
  check("patch -> 200", r.status === 200 && r.body.data.item.duration === 45 && r.body.data.item.exerciseName === "Running", r);
  r = await A("PATCH", `/api/workouts/${wId}`, { category: "nope" });
  check("patch bad category -> 400", r.status === 400, r);
  r = await B("DELETE", `/api/workouts/${wId}`);
  check("B cannot delete A's workout -> 404", r.status === 404);
  r = await A("DELETE", `/api/workouts/${wId}`);
  check("delete -> 200", r.status === 200);
  r = await A("DELETE", `/api/workouts/${wId}`);
  check("delete again -> 404", r.status === 404);
  r = await A("PATCH", "/api/workouts/zzz", { duration: 5 });
  check("patch invalid id -> 400", r.status === 400);

  console.log("\n== SLEEP");
  r = await A("POST", "/api/sleep", { sleepTime: `${day(-2)}T23:30:00+05:30`, wakeTime: `${day(-1)}T06:45:00+05:30` });
  check("create -> 201", r.status === 201, r);
  const s = r.body?.data?.item;
  check("duration calculated = 435 min", s?.durationMinutes === 435, s);
  check("date defaults to wake day", s?.date === day(-1), s?.date);
  const sId = s?._id;
  r = await A("POST", "/api/sleep", { sleepTime: `${day(-4)}T22:00:00Z`, wakeTime: `${day(-3)}T06:00:00Z`, durationMinutes: 9999 });
  check("client-sent durationMinutes rejected -> 400", r.status === 400, r);
  r = await A("POST", "/api/sleep", { sleepTime: `${day(-1)}T10:00:00Z`, wakeTime: `${day(-1)}T08:00:00Z` });
  check("wake before sleep -> 400", r.status === 400, r);
  r = await A("POST", "/api/sleep", { sleepTime: `${day(-5)}T00:00:00Z`, wakeTime: `${day(-3)}T00:00:00Z` });
  check("sleep >24h -> 400", r.status === 400, r);
  r = await A("POST", "/api/sleep", { sleepTime: "yesterday", wakeTime: "today" });
  check("bad datetime -> 400", r.status === 400, r);
  r = await A("POST", "/api/sleep", { sleepTime: `${day(-1)}T22:00:00Z`, wakeTime: `${day(5)}T06:00:00Z` });
  check("future wake -> 400", r.status === 400, r);
  r = await A("PATCH", `/api/sleep/${sId}`, { wakeTime: `${day(-1)}T07:15:00+05:30` });
  check("patch wakeTime recalculates duration (465)", r.status === 200 && r.body.data.item.durationMinutes === 465, r);
  r = await A("PATCH", `/api/sleep/${sId}`, { wakeTime: `${day(-3)}T07:15:00+05:30` });
  check("patch wake before sleep -> 400", r.status === 400, r);
  r = await A("PATCH", `/api/sleep/${sId}`, { durationMinutes: 10 });
  check("patch durationMinutes rejected -> 400", r.status === 400, r);
  r = await A("GET", `/api/sleep?from=${day(-1)}&to=${day(-1)}`);
  check("date filter", r.body?.data?.items?.length === 1, r.body);
  r = await B("GET", `/api/sleep/${sId}`);
  check("B cannot read A's sleep -> 404", r.status === 404);
  r = await A("DELETE", `/api/sleep/${sId}`);
  check("delete -> 200", r.status === 200);

  console.log("\n== FOOD");
  r = await A("POST", "/api/food", { foodName: "Oats", mealType: "breakfast", quantity: 50, quantityUnit: "g", calories: 190, protein: 7, carbs: 33, fat: 3.5, date: day(-1) });
  check("create -> 201", r.status === 201, r);
  const fId = r.body?.data?.item?._id;
  r = await A("POST", "/api/food", { foodName: "Apple", mealType: "snack", quantity: 1, quantityUnit: "piece", calories: 95, date: day(-1) });
  check("macros optional -> 201, null", r.status === 201 && r.body.data.item.protein === null, r);
  r = await A("POST", "/api/food", { foodName: "X", mealType: "brunch", quantity: 1, quantityUnit: "g", calories: 5, date: day(-1) });
  check("bad mealType -> 400", r.status === 400);
  r = await A("POST", "/api/food", { foodName: "X", mealType: "lunch", quantity: 0, quantityUnit: "g", calories: 5, date: day(-1) });
  check("quantity 0 -> 400", r.status === 400);
  r = await A("POST", "/api/food", { foodName: "X", mealType: "lunch", quantity: 1, quantityUnit: "kg", calories: 5, date: day(-1) });
  check("bad unit -> 400", r.status === 400);
  r = await A("POST", "/api/food", { foodName: "X", mealType: "lunch", quantity: 1, quantityUnit: "g", calories: -5, date: day(-1) });
  check("negative calories -> 400", r.status === 400);
  r = await A("GET", "/api/food?mealType=snack");
  check("filter mealType", r.body?.data?.items?.length === 1);
  r = await A("PATCH", `/api/food/${fId}`, { calories: 200, protein: null });
  check("patch -> 200, protein cleared", r.status === 200 && r.body.data.item.calories === 200 && r.body.data.item.protein === null, r);
  r = await B("PATCH", `/api/food/${fId}`, { calories: 1 });
  check("B cannot patch A's food -> 404", r.status === 404);
  r = await A("DELETE", `/api/food/${fId}`);
  check("delete -> 200", r.status === 200);

  console.log("\n== GOALS");
  r = await A("POST", "/api/goals", { goalType: "weight_loss", targetValue: 65, startValue: 75, deadline: day(60) });
  check("create weight_loss -> 201", r.status === 201, r);
  let g = r.body?.data?.item;
  const gId = g?._id;
  check("progress 0% at start", g?.progress?.percent === 0 && g?.progress?.remaining === 10 && g?.progress?.unit === "kg", g?.progress);
  check("status defaults active", g?.status === "active");
  check("currentValue defaults to startValue", g?.currentValue === 75, g?.currentValue);
  r = await A("PATCH", `/api/goals/${gId}`, { currentValue: 70 });
  check("progress 50% at 70kg", r.status === 200 && r.body.data.item.progress.percent === 50, r.body?.data?.item?.progress);
  r = await A("PATCH", `/api/goals/${gId}`, { currentValue: 64 });
  check("reaching target auto-completes", r.body?.data?.item?.status === "completed" && r.body.data.item.progress.percent === 100, r.body?.data?.item);
  r = await A("POST", "/api/goals", { goalType: "weight_loss", targetValue: 80, startValue: 75, deadline: day(60) });
  check("weight_loss target above start -> 400", r.status === 400);
  r = await A("POST", "/api/goals", { goalType: "weight_loss", targetValue: 65, deadline: day(60) });
  check("weight goal without startValue -> 400", r.status === 400);
  r = await A("POST", "/api/goals", { goalType: "daily_steps", targetValue: 10000, deadline: day(30) });
  check("daily_steps goal -> 201", r.status === 201, r);
  const g2 = r.body?.data?.item;
  r = await A("POST", "/api/goals", { goalType: "daily_steps", targetValue: 10000, deadline: day(-30), startDate: day(-10) });
  check("deadline before start -> 400", r.status === 400);
  r = await A("POST", "/api/goals", { goalType: "swim", targetValue: 10, deadline: day(30) });
  check("bad goalType -> 400", r.status === 400);
  r = await A("POST", "/api/goals", { goalType: "daily_steps", targetValue: 0, deadline: day(30) });
  check("target 0 -> 400", r.status === 400);
  r = await A("POST", "/api/goals", { goalType: "daily_steps", targetValue: 10000, deadline: day(30), status: "bogus" });
  check("bad status -> 400", r.status === 400);
  r = await A("PATCH", `/api/goals/${g2._id}`, { goalType: "daily_water" });
  check("cannot change goalType -> 400", r.status === 400, r);
  r = await A("PATCH", `/api/goals/${g2._id}`, { currentValue: 2500 });
  check("steps progress 25%", r.body?.data?.item?.progress?.percent === 25, r.body?.data?.item?.progress);
  r = await A("PATCH", `/api/goals/${g2._id}`, { status: "cancelled" });
  check("cancel goal", r.body?.data?.item?.status === "cancelled" && r.body.data.item.progress.daysRemaining === null, r.body);
  r = await A("GET", "/api/goals?status=completed");
  check("filter status=completed", r.body?.data?.items?.length === 1);
  r = await A("GET", "/api/goals?goalType=daily_steps");
  check("filter goalType", r.body?.data?.items?.length === 1);
  r = await A("GET", `/api/goals?from=${day(50)}&to=${day(70)}`);
  check("deadline range filter", r.body?.data?.items?.length === 1, r.body);
  r = await B("GET", `/api/goals/${gId}`);
  check("B cannot read A's goal -> 404", r.status === 404);
  r = await B("DELETE", `/api/goals/${gId}`);
  check("B cannot delete A's goal -> 404", r.status === 404);
  r = await A("DELETE", `/api/goals/${gId}`);
  check("delete -> 200", r.status === 200);

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  if (fail) { console.log("Failures:\n - " + failures.join("\n - ")); process.exit(1); }
})();
