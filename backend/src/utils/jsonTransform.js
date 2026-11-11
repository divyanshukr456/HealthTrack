const { toDateOnly } = require("./dates");

// toJSON transform: hides __v, lets a model add computed fields, prints date-only fields as YYYY-MM-DD.
const jsonTransform = ({ dateFields = [], extra } = {}) => (_doc, ret) => {
  delete ret.__v;
  if (extra) extra(ret);
  dateFields.forEach((f) => {
    if (ret[f] instanceof Date) ret[f] = toDateOnly(ret[f]);
  });
  return ret;
};

module.exports = jsonTransform;
