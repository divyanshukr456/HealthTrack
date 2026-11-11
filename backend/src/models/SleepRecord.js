const mongoose = require("mongoose");
const jsonTransform = require("../utils/jsonTransform");

const sleepSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sleepTime: { type: Date, required: true },
    wakeTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1, max: 1440 }, // always calculated by the server
    date: { type: Date, required: true }, // the day you woke up
  },
  { timestamps: true }
);

// The client can never set durationMinutes: it is recalculated on every save.
sleepSchema.pre("validate", function (next) {
  if (this.sleepTime && this.wakeTime) {
    this.durationMinutes = Math.round((this.wakeTime.getTime() - this.sleepTime.getTime()) / 60000);
  }
  next();
});

sleepSchema.index({ userId: 1, date: -1 });

sleepSchema.set("toJSON", { transform: jsonTransform({ dateFields: ["date"] }) });

module.exports = mongoose.model("SleepRecord", sleepSchema);
