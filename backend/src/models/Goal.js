const mongoose = require("mongoose");
const jsonTransform = require("../utils/jsonTransform");
const { goalProgress, isTargetReached } = require("../utils/progress");
const { GOAL_TYPES, GOAL_STATUSES } = require("../utils/constants");

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    goalType: { type: String, enum: GOAL_TYPES, required: true },
    targetValue: { type: Number, required: true },
    startValue: { type: Number, required: true, default: 0 }, // needed to calculate progress %
    currentValue: { type: Number, required: true, default: 0 },
    startDate: { type: Date, required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: GOAL_STATUSES, default: "active" },
  },
  { timestamps: true }
);

// When currentValue changes and the target is reached, an active goal completes itself.
goalSchema.pre("save", function (next) {
  if ((this.isNew || this.isModified("currentValue")) && this.status === "active" && isTargetReached(this)) {
    this.status = "completed";
  }
  next();
});

goalSchema.index({ userId: 1, status: 1, deadline: 1 });
goalSchema.index({ userId: 1, deadline: 1 });

goalSchema.set("toJSON", {
  transform: jsonTransform({
    dateFields: ["startDate", "deadline"],
    extra: (ret) => {
      ret.progress = goalProgress(ret); // percent, unit, remaining, daysRemaining, isOverdue
    },
  }),
});

module.exports = mongoose.model("Goal", goalSchema);
