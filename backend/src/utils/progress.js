const { DAY_MS, todayUTC } = require("./dates");

const UNITS = {
  weight_loss: "kg",
  weight_gain: "kg",
  daily_steps: "steps",
  daily_water: "ml",
  weekly_workouts: "workouts",
};

const round1 = (n) => Math.round(n * 10) / 10;

// Works for goals that go down (weight_loss) and up (everything else).
const isTargetReached = (g) =>
  g.targetValue >= g.startValue ? g.currentValue >= g.targetValue : g.currentValue <= g.targetValue;

const goalProgress = (g, today = todayUTC()) => {
  const span = g.targetValue - g.startValue;
  let percent = span === 0 ? (isTargetReached(g) ? 100 : 0) : ((g.currentValue - g.startValue) / span) * 100;
  percent = Math.min(100, Math.max(0, round1(percent)));

  const direction = span >= 0 ? 1 : -1;
  const remaining = Math.max(0, round1((g.targetValue - g.currentValue) * direction));

  const active = g.status === "active";
  const daysLeft = Math.ceil((new Date(g.deadline).getTime() - today.getTime()) / DAY_MS);

  return {
    percent,
    unit: UNITS[g.goalType],
    remaining,
    daysRemaining: active ? daysLeft : null,
    isOverdue: active && daysLeft < 0,
  };
};

module.exports = { goalProgress, isTargetReached };
