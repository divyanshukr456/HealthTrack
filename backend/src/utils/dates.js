// Calendar days are stored as UTC midnight. The client sends "YYYY-MM-DD" (its local date).
const DAY_MS = 24 * 60 * 60 * 1000;

const parseDateOnly = (s) => new Date(`${s}T00:00:00.000Z`);
const toDateOnly = (d) => d.toISOString().slice(0, 10);
const isRealDate = (s) => {
  const d = parseDateOnly(s);
  return !Number.isNaN(d.getTime()) && toDateOnly(d) === s;
};
const todayUTC = () => parseDateOnly(toDateOnly(new Date()));

module.exports = { DAY_MS, parseDateOnly, toDateOnly, isRealDate, todayUTC };
