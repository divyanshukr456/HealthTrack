const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true, // creates a unique index in MongoDB
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false }, // bcrypt hash, hidden by default
    dob: { type: Date, required: true },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Safety net: password/__v never leave the server, even if select:false is bypassed.
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
